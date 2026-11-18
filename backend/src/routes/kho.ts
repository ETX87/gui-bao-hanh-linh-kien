import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { quaHanBuoc } from "../lib/buoc";
import { parsePage } from "../lib/pagination";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF, tonFilter } from "../lib/filters";
import { slaCutoffVn } from "../lib/sla";
import { kwClause, tenOf, tkThungOf } from "../lib/search";
import { mienScope, mienAllowed } from "../lib/mien";
import { sendPushToUser } from "../lib/webPush";

// Man hinh Kho: "Diem tiep nhan kho" - tiep nhan o muc THUNG hang (khong mo kiem tung linh kien).
// Port dung khoXacNhanTiepNhan()/submitSuCo() cua prototype.

const kho = new Hono<{ Bindings: Env }>();
kho.use("*", verifySessionMiddleware, loadUser);

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireKho(c: { get(k: "user"): { la_kho: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_kho || u.la_qtri;
}

// GET /api/kho/phieu-gui?trang_thai=da_gui|da_tiep_nhan - hang doi cho tiep nhan (phan trang that,
// co the dai) / 8 phieu gan nhat da nhan (co chu dich khong phan trang - chi la "gan day", khong
// phai lich su day du) - xem renderKhoTiepNhan trong prototype.
kho.get("/phieu-gui", async (c) => {
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  // 11/10/2026: chi thung cua mien minh + "chua khai bao" (Kho gan 1 mien).
  const ms0 = mienScope(c.get("user"), "phieu_gui_bh");
  // 20/10/2026: tim kiem tu khoa (ma thung, van don, KTV, ma don / case / linh kien ben trong).
  const kw = kwClause(c.req.query("q"), ["phieu_gui_bh.id", "phieu_gui_bh.ma_van_don", "phieu_gui_bh.ma_xe_hoac_tai_xe", "phieu_gui_bh.don_vi_van_chuyen", "phieu_gui_bh.nguoi_tao", tenOf("phieu_gui_bh.nguoi_tao"),
    "(SELECT group_concat(p.id || ' ' || COALESCE(p.case_id,'') || ' ' || COALESCE(p.ma_lk,''), ' ') FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id)"], [tkThungOf("phieu_gui_bh.id")]);
  // 21/10/2026: loc KTV gui / nguoi tao ho / hinh thuc gui / mien.
  const LOC = { ktv: "phieu_gui_bh.nguoi_tao", tao_ho: "phieu_gui_bh.nguoi_tao_ho", hinh_thuc_gui: "phieu_gui_bh.hinh_thuc_gui", mien: "phieu_gui_bh.mien" };
  if (c.req.query("loc_only")) {
    const tq = c.req.query("trang_thai");
    const base = tq === "cho_ban_giao" ? "trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0 AND tu_choi_tt IS NULL" : tq === "da_tiep_nhan" ? "trang_thai = 'da_tiep_nhan'" : "trang_thai = 'da_gui'";
    return c.json({ loc: await distinctOpts(c.env.DB, LOC, `FROM phieu_gui_bh WHERE ${base}${ms0.sql}`, ms0.binds) });
  }
  const slaMoc = c.req.query("trang_thai") === "cho_ban_giao" ? "phieu_gui_bh.thoi_gian_nhan_kho" : "phieu_gui_bh.updated_at";
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "phieu_gui_bh.created_at"), slaFilter(c, slaMoc), tonFilter(c, slaMoc));
  const ms = { sql: ms0.sql + kw.sql + f.sql, binds: [...ms0.binds, ...kw.binds, ...f.binds] };
  // 09/10/2026 ("Vai tro kho thieu nhac giai doan cho ban giao cho Admin sua chua"): thung Kho da tiep
  // nhan nhung Admin BH CHUA xac nhan tiep nhan noi bo - phan trang that, cu nhat len dau.
  if (c.req.query("trang_thai") === "cho_ban_giao") {
    const { limit, offset } = parsePage(c);
    const w = "FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0 AND tu_choi_tt IS NULL" + ms.sql;
    const [{ results }, totalRow] = await Promise.all([
      c.env.DB.prepare(`SELECT * ${w} ORDER BY thoi_gian_nhan_kho ASC LIMIT ? OFFSET ?`).bind(...ms.binds, limit, offset).all(),
      c.env.DB.prepare(`SELECT COUNT(*) as cnt ${w}`).bind(...ms.binds).first<{ cnt: number }>(),
    ]);
    return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
  }
  const trangThai = c.req.query("trang_thai") === "da_tiep_nhan" ? "da_tiep_nhan" : "da_gui";
  if (trangThai === "da_tiep_nhan") {
    const { results } = await c.env.DB.prepare(`SELECT * FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan'${ms.sql} ORDER BY updated_at DESC LIMIT 8`).bind(...ms.binds).all();
    return c.json({ phieu_gui: results, total: results.length });
  }
  const { limit, offset } = parsePage(c);
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id) AS so_don FROM phieu_gui_bh WHERE trang_thai = 'da_gui'${ms.sql} ORDER BY updated_at ASC LIMIT ? OFFSET ?`).bind(...ms.binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE trang_thai = 'da_gui'${ms.sql}`).bind(...ms.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
});

// 18/11/2026 ("danh sách các thùng hàng, thêm cảnh báo thời gian tồn cho các vai trò xác định được thùng đang
// tồn bao lâu rồi mà kho chưa xử lý"): thanh tong hop thoi gian ton cua 1 hang doi thung.
// tt=da_gui (dang ve Kho, tinh tu luc KTV gui = updated_at) | cho_admin (Kho da nhan, Admin chua nhan noi bo, tu thoi_gian_nhan_kho).
// Gio SLA bo Chu nhat (slaCutoffVn). Kho / Admin BH / qtri, theo mien.
kho.get("/thung-ton", async (c) => {
  const user = c.get("user");
  if (!(requireKho(c) || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const tt = c.req.query("tt") === "cho_admin" ? "cho_admin" : "da_gui";
  const moc = tt === "da_gui" ? "updated_at" : "thoi_gian_nhan_kho";
  const where = (tt === "da_gui" ? "trang_thai = 'da_gui'" : "trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0 AND tu_choi_tt IS NULL") + mienScope(user, "phieu_gui_bh").sql;
  const mb = mienScope(user, "phieu_gui_bh").binds;
  const [c24, c48, c72] = [slaCutoffVn(24), slaCutoffVn(48), slaCutoffVn(72)];
  const [r, cu] = await Promise.all([
    c.env.DB.prepare(
      `SELECT COUNT(*) AS tong, SUM(CASE WHEN ${moc} >= ? THEN 1 ELSE 0 END) AS lt1,
         SUM(CASE WHEN ${moc} < ? AND ${moc} >= ? THEN 1 ELSE 0 END) AS d1_2,
         SUM(CASE WHEN ${moc} < ? AND ${moc} >= ? THEN 1 ELSE 0 END) AS d2_3,
         SUM(CASE WHEN ${moc} < ? THEN 1 ELSE 0 END) AS gt3
       FROM phieu_gui_bh WHERE ${where}`,
    ).bind(c24, c24, c48, c48, c72, c72, ...mb).first<Record<string, number | null>>(),
    c.env.DB.prepare(`SELECT id, nguoi_tao, ${moc} AS moc FROM phieu_gui_bh WHERE ${where} ORDER BY ${moc} ASC LIMIT 1`).bind(...mb).first(),
  ]);
  return c.json({
    tt,
    tong: r?.tong ?? 0,
    muc: { lt1: r?.lt1 ?? 0, d1_2: r?.d1_2 ?? 0, d2_3: r?.d2_3 ?? 0, gt3: r?.gt3 ?? 0 },
    lau_nhat: cu ?? null,
  });
});

interface ConfirmBody {
  ly_do_cham?: string;
}

// POST /api/kho/phieu-gui/:id/tiep-nhan - "da_gui" -> "da_tiep_nhan". Cong SLA 24h tinh tu
// updated_at (thoi diem "da_gui").
kho.post("/phieu-gui/:id/tiep-nhan", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT trang_thai, updated_at FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<ConfirmBody>().catch(() => ({}) as ConfirmBody);
  if ((await quaHanBuoc(c.env.DB, "thung_dang_gui", g.updated_at)) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_tiep_nhan', nguoi_nhan_kho = ?, thoi_gian_nhan_kho = ?, updated_at = ? WHERE id = ?")
    .bind(user.email, now, now, id)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", user.email, "Kho xác nhận đã nhận" + (body.ly_do_cham ? " | Lý do chậm: " + body.ly_do_cham : ""));
  return c.json({ ok: true });
});

interface SuCoBody {
  ly_do?: string;
  ghi_chu?: string;
  ly_do_cham?: string;
}

// POST /api/kho/phieu-gui/:id/bao-su-co - "da_gui" -> "da_tiep_nhan" GIONG HET buoc tiep nhan binh
// thuong, CONG THEM ghi nhan su co - port dung "Phan hoi vong 1 muc #5" (bao loi CHI la canh bao,
// KHONG chan tiep tuc xu ly - phieu van phai chuyen trang thai binh thuong, khong duoc "bien mat"
// khoi hang doi Admin BH) + "Phan hoi vong 3 muc 3" (gop vao chung 1 luong hoi thoai ghi_chu_log).
kho.post("/phieu-gui/:id/bao-su-co", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT trang_thai, updated_at FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<SuCoBody>().catch(() => ({}) as SuCoBody);
  if (!body.ly_do?.trim()) return c.json({ error: "MISSING_LY_DO" }, 400);
  if ((await quaHanBuoc(c.env.DB, "thung_dang_gui", g.updated_at)) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  await c.env.DB.prepare(
    `UPDATE phieu_gui_bh SET trang_thai = 'da_tiep_nhan', nguoi_nhan_kho = ?, thoi_gian_nhan_kho = ?,
       su_co_tiep_nhan = 1, su_co_ly_do = ?, su_co_ghi_chu = ?, updated_at = ? WHERE id = ?`,
  )
    .bind(user.email, now, body.ly_do.trim(), body.ghi_chu?.trim() || "", now, id)
    .run();
  await c.env.DB.prepare("INSERT INTO phieu_gui_bh_ghi_chu (phieu_gui_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)")
    .bind(id, user.email, now, `⚠ [Báo sự cố tiếp nhận] ${body.ly_do.trim()}${body.ghi_chu?.trim() ? ": " + body.ghi_chu.trim() : ""}`)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", user.email, "Kho báo sự cố tiếp nhận: " + body.ly_do.trim() + (body.ly_do_cham ? " | Lý do chậm: " + body.ly_do_cham : ""));
  return c.json({ ok: true });
});

// 18/11/2026 ("o giai doan thung hang, KTV gui hang, kho co quyen tu choi vi co the thung do chua gui ve
// thuc te, hien trong danh sach cho lam roi thong tin cua kho. Neu kho tu choi se day canh bao nghiem trong
// ve cho KTV"): thung 'da_gui' -> quay ve 'nhap' cua KTV (KTV gui lai khi da gui hang that). Ly do bat buoc.
// Canh bao: push ngay toi KTV + nguoi tao ho, the do tren Trang chu KTV, so viec ktv_kho_tu_choi, dong trao doi.
// Admin BH cung lam duoc (dang lam ho Kho o tab "Dang gui ve Kho").
kho.post("/phieu-gui/:id/tu-choi", async (c) => {
  const user = c.get("user");
  if (!(requireKho(c) || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT trang_thai, mien, nguoi_tao, nguoi_tao_ho, kho_tc_lan FROM phieu_gui_bh WHERE id = ?")
    .bind(id).first<{ trang_thai: string; mien: string | null; nguoi_tao: string; nguoi_tao_ho: string | null; kho_tc_lan: number }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const lyDo = (body.ly_do || "").trim().slice(0, 1000);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);

  const now = nowVN();
  const lan = (g.kho_tc_lan || 0) + 1;
  const r = await c.env.DB.prepare(
    `UPDATE phieu_gui_bh SET trang_thai = 'nhap', kho_tc_ly_do = ?, kho_tc_boi = ?, kho_tc_luc = ?, kho_tc_lan = ?, updated_at = ?
       WHERE id = ? AND trang_thai = 'da_gui'`,
  ).bind(lyDo, user.email, now, lan, now, id).run();
  if (!r.meta.changes) return c.json({ error: "WRONG_STATE" }, 400);
  const ai = user.la_kho ? "Kho" : "Admin BH";
  await c.env.DB.prepare("INSERT INTO phieu_gui_bh_ghi_chu (phieu_gui_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)")
    .bind(id, user.email, now, `⛔ [${ai} từ chối thùng — CHƯA NHẬN ĐƯỢC HÀNG] ${lyDo}. Thùng đã trả về nháp: chỉ bấm "Xác nhận đã gửi xe" lại khi hàng đã thật sự gửi.`)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "nhap", user.email, `${ai} từ chối thùng (lần ${lan}) — chưa nhận được hàng thực tế: ${lyDo}`);

  const nguoiNhan = [...new Set([g.nguoi_tao, g.nguoi_tao_ho].filter((e): e is string => !!e && e !== user.email))];
  const push = Promise.all(nguoiNhan.map((e) => sendPushToUser(c.env, e, {
    title: `⛔ ${ai} từ chối thùng ${id}`,
    body: `Kho chưa nhận được hàng: ${lyDo}. Thùng đã trả về nháp — chỉ gửi lại khi hàng đã thật sự gửi.`,
    url: `/${id}`,
  }))).catch(() => undefined);
  try { c.executionCtx.waitUntil(push); } catch { await push; }
  return c.json({ ok: true, lan });
});

export default kho;
