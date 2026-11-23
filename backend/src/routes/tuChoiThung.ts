import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { parsePage } from "../lib/pagination";
import { mienScope, mienAllowed } from "../lib/mien";
import { kwClause, tenOf } from "../lib/search";
import { congNgay, ghiTraoDoi, huyThung, huyThungDangGui, moLaiThung, HAN_KTV_NGAY } from "../lib/tuChoiThung";

// 13/11/2026 - nguyen van: "thêm chức năng từ chối cho admin bh khi tiếp nhận thùng hàng từ kho, yc nhập lý do từ chối
// (đẩy thông báo lại cho kho - kho sẽ phải xác nhận đồng ý hoặc không đồng ý - nhập lý do +> nếu không đồng ý đẩy lại
// admin bh, nếu đồng ý =-> bắn nhắc nhở về KTV => tiếp tục luồng KTV đồng ý hay không đồng ý và trao đổi qua lại...)
// => nếu KTV trong 7 ngày không phản hồi thì tự động xác nhận là không ý kiến và thùng hàng sẽ bị hủy. (cho phép lùi
// lại nếu admin ấn từ chối nhầm)". Chot: Kho / KTV khong dong y -> thung ve luong binh thuong (Kho ban giao / Admin nhan);
// huy thung -> don ben trong huy, don Odoo ve "Chua gui".

const tuChoi = new Hono<{ Bindings: Env }>();
tuChoi.use("*", verifySessionMiddleware, loadUser);

const isAdmin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const isKho = (u: AppUser) => u.la_kho || u.la_qtri;
const isBo = (u: AppUser) => u.la_admin_bh || u.la_kho || u.la_qtri || u.la_giam_sat || u.la_view;

interface ThungRow {
  id: string;
  nguoi_tao: string;
  nguoi_tao_ho: string | null;
  trang_thai: string;
  admin_tiep_nhan: number;
  tu_choi_tt: string | null;
  tu_choi_lan: number;
  mien: string | null;
}

async function loadThung(db: D1Database, id: string) {
  return db.prepare("SELECT id, nguoi_tao, nguoi_tao_ho, trang_thai, admin_tiep_nhan, tu_choi_tt, tu_choi_lan, mien FROM phieu_gui_bh WHERE id = ?").bind(id).first<ThungRow>();
}
async function lyDoOf(c: { req: { json<T>(): Promise<T> } }) {
  const b = await c.req.json<{ ly_do?: string; dong_y?: boolean }>().catch(() => ({}) as { ly_do?: string; dong_y?: boolean });
  return { lyDo: (b.ly_do ?? "").trim().slice(0, 2000), dongY: b.dong_y === true };
}

// GET /api/tu-choi-thung?tt=cho_kho|cho_ktv|dang|da_huy&q=
tuChoi.get("/", async (c) => {
  const user = c.get("user");
  const tt = c.req.query("tt") ?? "dang";
  const { limit, offset } = parsePage(c);
  let where = tt === "cho_kho" ? "g.tu_choi_tt = 'cho_kho'" : tt === "cho_ktv" ? "g.tu_choi_tt = 'cho_ktv'" : tt === "da_huy" ? "g.tu_choi_tt = 'da_huy'" : "g.tu_choi_tt IN ('cho_kho','cho_ktv')";
  const binds: unknown[] = [];
  if (isBo(user)) {
    const ms = mienScope(user, "g");
    where += ms.sql;
    binds.push(...ms.binds);
  } else if (user.la_ktv_dvbh || user.la_ve_tinh) {
    where += " AND (g.nguoi_tao = ? OR g.nguoi_tao_ho = ?)";
    binds.push(user.email, user.email);
  } else return c.json({ error: "FORBIDDEN" }, 403);
  const kw = kwClause(c.req.query("q"), ["g.id", "g.nguoi_tao", tenOf("g.nguoi_tao"), "g.tu_choi_ly_do"], []);
  where += kw.sql;
  binds.push(...kw.binds);
  const [{ results }, total] = await Promise.all([
    c.env.DB.prepare(
      `SELECT g.*, (SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = g.id) AS so_don
       FROM phieu_gui_bh g WHERE ${where} ORDER BY g.tu_choi_luc DESC LIMIT ? OFFSET ?`,
    )
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt FROM phieu_gui_bh g WHERE ${where}`).bind(...binds).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: total?.cnt ?? 0 });
});

// POST /api/tu-choi-thung/:id/tu-choi {ly_do} - Admin BH tu choi tiep nhan thung (Kho da nhan, Admin chua nhan).
tuChoi.post("/:id/tu-choi", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const { lyDo } = await lyDoOf(c);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "da_tiep_nhan" || g.admin_tiep_nhan || g.tu_choi_tt) return c.json({ error: "WRONG_STATE" }, 400);
  const daTach = await c.env.DB.prepare("SELECT 1 AS x FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha <> 'cho_xac_nhan_so_luong' LIMIT 1").bind(id).first();
  if (daTach) return c.json({ error: "WRONG_STATE" }, 400);
  const now = nowVN();
  const r = await c.env.DB.prepare(
    `UPDATE phieu_gui_bh SET tu_choi_tt = 'cho_kho', tu_choi_ly_do = ?, tu_choi_boi = ?, tu_choi_luc = ?, tu_choi_han = NULL, tu_choi_lan = tu_choi_lan + 1,
       kho_y_kien = NULL, kho_y_kien_boi = NULL, kho_y_kien_luc = NULL, updated_at = ?
     WHERE id = ? AND tu_choi_tt IS NULL AND admin_tiep_nhan = 0 AND trang_thai = 'da_tiep_nhan'`,
  )
    .bind(lyDo, user.email, now, now, id)
    .run();
  if (!r.meta?.changes) return c.json({ error: "WRONG_STATE" }, 400);
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, `⛔ Admin BH từ chối tiếp nhận thùng (lần ${g.tu_choi_lan + 1}): ${lyDo} — chờ Kho phản hồi`);
  await ghiTraoDoi(c.env.DB, id, user.email, `⛔ Admin BH từ chối tiếp nhận thùng: ${lyDo}`);
  return c.json({ ok: true });
});

// POST /api/tu-choi-thung/:id/rut-lai - Admin lui lai (tu choi nham) khi thung chua bi huy.
tuChoi.post("/:id/rut-lai", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  const r = await c.env.DB.prepare("UPDATE phieu_gui_bh SET tu_choi_tt = NULL, tu_choi_han = NULL, updated_at = ? WHERE id = ? AND tu_choi_tt IN ('cho_kho','cho_ktv')")
    .bind(nowVN(), id)
    .run();
  if (!r.meta?.changes) return c.json({ error: "WRONG_STATE" }, 400);
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, "↩ Admin BH rút lại từ chối — thùng về chờ Admin tiếp nhận");
  await ghiTraoDoi(c.env.DB, id, user.email, "↩ Admin BH rút lại từ chối (từ chối nhầm) — thùng tiếp tục chờ tiếp nhận.");
  return c.json({ ok: true });
});

// 23/11/2026: POST /api/tu-choi-thung/:id/huy {ly_do} - Admin BH / Kho huy thung dang gui ve Kho (thuc te khong ve, VD thung AppSheet cu).
tuChoi.post("/:id/huy", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user) && !isKho(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const { lyDo } = await lyDoOf(c);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "da_gui" || g.tu_choi_tt) return c.json({ error: "WRONG_STATE" }, 400);
  if (!(await huyThungDangGui(c.env.DB, id, user.email, lyDo))) return c.json({ error: "WRONG_STATE" }, 400);
  return c.json({ ok: true });
});

// 23/11/2026: POST /api/tu-choi-thung/:id/mo-lai {ly_do} - mo lai thung da huy (huy nham), ve trang thai truoc khi huy.
tuChoi.post("/:id/mo-lai", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user) && !isKho(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const { lyDo } = await lyDoOf(c);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  const r = await moLaiThung(c.env.DB, id, user.email, lyDo);
  if (!r.ok) return c.json({ error: r.error }, r.error === "NOT_FOUND" ? 404 : 400);
  return c.json(r);
});

// POST /api/tu-choi-thung/:id/kho {dong_y, ly_do} - Kho phan hoi (ly do bat buoc).
tuChoi.post("/:id/kho", async (c) => {
  const user = c.get("user");
  if (!isKho(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const { lyDo, dongY } = await lyDoOf(c);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  const now = nowVN();
  const r = dongY
    ? await c.env.DB.prepare(
        "UPDATE phieu_gui_bh SET tu_choi_tt = 'cho_ktv', tu_choi_han = ?, kho_y_kien = ?, kho_y_kien_boi = ?, kho_y_kien_luc = ?, updated_at = ? WHERE id = ? AND tu_choi_tt = 'cho_kho'",
      )
        .bind(congNgay(now, HAN_KTV_NGAY), lyDo, user.email, now, now, id)
        .run()
    : await c.env.DB.prepare(
        "UPDATE phieu_gui_bh SET tu_choi_tt = NULL, phan_hoi_vai_tro = 'kho', phan_hoi_ly_do = ?, phan_hoi_boi = ?, phan_hoi_luc = ?, updated_at = ? WHERE id = ? AND tu_choi_tt = 'cho_kho'",
      )
        .bind(lyDo, user.email, now, now, id)
        .run();
  if (!r.meta?.changes) return c.json({ error: "WRONG_STATE" }, 400);
  const msg = dongY
    ? `✔ Kho đồng ý từ chối: ${lyDo} — chờ KTV phản hồi (hạn ${HAN_KTV_NGAY} ngày, quá hạn thùng tự huỷ)`
    : `✖ Kho không đồng ý từ chối: ${lyDo} — thùng về chờ Admin tiếp nhận`;
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, msg);
  await ghiTraoDoi(c.env.DB, id, user.email, msg);
  return c.json({ ok: true });
});

// POST /api/tu-choi-thung/:id/ktv {dong_y, ly_do} - KTV so huu thung (hoac nguoi tao ho) phan hoi.
tuChoi.post("/:id/ktv", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const { lyDo, dongY } = await lyDoOf(c);
  const g = await loadThung(c.env.DB, id);
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!(g.nguoi_tao === user.email || g.nguoi_tao_ho === user.email || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.tu_choi_tt !== "cho_ktv") return c.json({ error: "WRONG_STATE" }, 400);
  if (dongY) {
    const ok = await huyThung(c.env.DB, id, user.email, `KTV đồng ý${lyDo ? `: ${lyDo}` : ""}`);
    if (!ok) return c.json({ error: "WRONG_STATE" }, 400);
    return c.json({ ok: true, huy: true });
  }
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const now = nowVN();
  const r = await c.env.DB.prepare(
    "UPDATE phieu_gui_bh SET tu_choi_tt = NULL, tu_choi_han = NULL, phan_hoi_vai_tro = 'ktv', phan_hoi_ly_do = ?, phan_hoi_boi = ?, phan_hoi_luc = ?, updated_at = ? WHERE id = ? AND tu_choi_tt = 'cho_ktv'",
  )
    .bind(lyDo, user.email, now, now, id)
    .run();
  if (!r.meta?.changes) return c.json({ error: "WRONG_STATE" }, 400);
  const msg = `✖ KTV không đồng ý từ chối: ${lyDo} — thùng về luồng bình thường (Kho bàn giao / Admin tiếp nhận)`;
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, msg);
  await ghiTraoDoi(c.env.DB, id, user.email, msg);
  return c.json({ ok: true });
});

export default tuChoi;
