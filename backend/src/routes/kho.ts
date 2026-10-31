import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";
import { parsePage } from "../lib/pagination";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tkThungOf } from "../lib/search";
import { mienScope } from "../lib/mien";

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
    const base = tq === "cho_ban_giao" ? "trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0" : tq === "da_tiep_nhan" ? "trang_thai = 'da_tiep_nhan'" : "trang_thai = 'da_gui'";
    return c.json({ loc: await distinctOpts(c.env.DB, LOC, `FROM phieu_gui_bh WHERE ${base}${ms0.sql}`, ms0.binds) });
  }
  const slaMoc = c.req.query("trang_thai") === "cho_ban_giao" ? "phieu_gui_bh.thoi_gian_nhan_kho" : "phieu_gui_bh.updated_at";
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "phieu_gui_bh.created_at"), slaFilter(c, slaMoc));
  const ms = { sql: ms0.sql + kw.sql + f.sql, binds: [...ms0.binds, ...kw.binds, ...f.binds] };
  // 09/10/2026 ("Vai tro kho thieu nhac giai doan cho ban giao cho Admin sua chua"): thung Kho da tiep
  // nhan nhung Admin BH CHUA xac nhan tiep nhan noi bo - phan trang that, cu nhat len dau.
  if (c.req.query("trang_thai") === "cho_ban_giao") {
    const { limit, offset } = parsePage(c);
    const w = "FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0" + ms.sql;
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
    c.env.DB.prepare(`SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id) AS so_don FROM phieu_gui_bh WHERE trang_thai = 'da_gui'${ms.sql} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...ms.binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE trang_thai = 'da_gui'${ms.sql}`).bind(...ms.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
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
  if (isOverdue(g.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

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
  if (isOverdue(g.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

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

export default kho;
