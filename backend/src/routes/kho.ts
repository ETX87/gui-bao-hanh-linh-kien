import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";

// Man hinh Kho: "Diem tiep nhan kho" - tiep nhan o muc THUNG hang (khong mo kiem tung linh kien).
// Port dung khoXacNhanTiepNhan()/submitSuCo() cua prototype.

const kho = new Hono<{ Bindings: Env }>();
kho.use("*", verifySessionMiddleware, loadUser);

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireKho(c: { get(k: "user"): { la_kho: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_kho || u.la_qtri;
}

// GET /api/kho/phieu-gui?trang_thai=da_gui|da_tiep_nhan - hang doi cho tiep nhan / 8 phieu gan nhat
// da nhan (dung cho man hinh, xem renderKhoTiepNhan trong prototype).
kho.get("/phieu-gui", async (c) => {
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const trangThai = c.req.query("trang_thai") === "da_tiep_nhan" ? "da_tiep_nhan" : "da_gui";
  const limit = trangThai === "da_tiep_nhan" ? 8 : 200;
  const { results } = await c.env.DB.prepare(`SELECT * FROM phieu_gui_bh WHERE trang_thai = ? ORDER BY updated_at DESC LIMIT ?`).bind(trangThai, limit).all();
  return c.json({ phieu_gui: results });
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
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", user.email, "Kho xac nhan da nhan" + (body.ly_do_cham ? " | Ly do cham: " + body.ly_do_cham : ""));
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
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", user.email, "Kho bao su co tiep nhan: " + body.ly_do.trim() + (body.ly_do_cham ? " | Ly do cham: " + body.ly_do_cham : ""));
  return c.json({ ok: true });
});

export default kho;
