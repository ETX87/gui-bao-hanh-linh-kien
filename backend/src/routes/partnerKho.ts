import { Hono } from "hono";
import type { Env } from "../types";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";

// Nguyen tac "Kho chi thao tac qua app kho van" (chot 2026-09-07): nhan vien Kho khong
// con dang nhap/thao tac truc tiep trong app nay nua - moi hanh dong thuoc vai tro Kho
// (nhan hang, dong goi, gui hang) duoc thuc hien TRONG khovan, khovan goi API sang day
// de phan anh dung trang thai. Cac route o day MIRROR chinh xac logic cua kho.ts
// (/tiep-nhan) va phieuTra.ts (/dong-goi, /gui) - chi khac auth (X-Khovan-Key thay vi
// session) va actor la 1 nhan Nhan (actor_label tu khovan) thay vi c.get("user").
const partnerKho = new Hono<{ Bindings: Env }>();

partnerKho.use("*", async (c, next) => {
  const key = c.req.header("X-Khovan-Key");
  if (!key || !c.env.KHOVAN_PARTNER_API_KEY || key !== c.env.KHOVAN_PARTNER_API_KEY) {
    return c.json({ error: "INVALID_KEY" }, 401);
  }
  await next();
});

// Mirror kho.ts POST /phieu-gui/:id/tiep-nhan ("da_gui" -> "da_tiep_nhan").
partnerKho.post("/phieu-gui/:id/tiep-nhan", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ actor_label?: string; ly_do_cham?: string }>().catch(() => ({}) as { actor_label?: string; ly_do_cham?: string });
  const actor = body.actor_label?.trim() || "Kho (qua khovan)";

  const g = await c.env.DB.prepare("SELECT trang_thai, updated_at FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);
  if (isOverdue(g.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_tiep_nhan', nguoi_nhan_kho = ?, thoi_gian_nhan_kho = ?, updated_at = ? WHERE id = ?")
    .bind(actor, now, now, id)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", actor, "Kho xác nhận đã nhận (qua Kho vận)" + (body.ly_do_cham ? " | Lý do chậm: " + body.ly_do_cham : ""));
  return c.json({ ok: true });
});

// Mirror phieuTra.ts POST /:id/dong-goi (chi luu anh bien ban, khong doi trang thai).
partnerKho.post("/phieu-tra/:id/dong-goi", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ anh?: string[] }>().catch(() => ({}) as { anh?: string[] });

  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);

  const statements = (body.anh || []).map((url) => c.env.DB.prepare("INSERT INTO phieu_tra_bh_anh (phieu_tra_id, anh_url) VALUES (?, ?)").bind(id, url));
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

// Mirror phieuTra.ts POST /:id/gui ("da_duyet_ke_toan" -> "da_gui").
partnerKho.post("/phieu-tra/:id/gui", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ ma_van_don?: string; actor_label?: string }>().catch(() => ({}) as { ma_van_don?: string; actor_label?: string });
  const actor = body.actor_label?.trim() || "Kho (qua khovan)";

  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);

  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'da_gui', ma_van_don = COALESCE(?, ma_van_don), updated_at = ? WHERE id = ?")
    .bind(body.ma_van_don ?? null, nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_tra", id, "da_duyet_ke_toan", "da_gui", actor, "Kho gửi hàng (qua Kho vận)");
  return c.json({ ok: true });
});

// Mirror phieuTra.ts POST /:id/ket-thuc-khong-gui ("da_duyet_ke_toan" -> "ket_thuc_khong_gui",
// them 2026-09-08 - hanh dong Kho chuan hoa "Xac nhan ket thuc (khong gui hang)", dung chung
// voi Luong B ben PXK-, xem Artifact "Ma tran luong Kho van").
partnerKho.post("/phieu-tra/:id/ket-thuc-khong-gui", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ ghi_chu?: string; actor_label?: string }>().catch(() => ({}) as { ghi_chu?: string; actor_label?: string });
  const actor = body.actor_label?.trim() || "Kho (qua khovan)";

  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);

  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ket_thuc_khong_gui', updated_at = ? WHERE id = ?")
    .bind(nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_tra", id, "da_duyet_ke_toan", "ket_thuc_khong_gui", actor, "Kho xác nhận kết thúc, không gửi hàng (qua Kho vận)" + (body.ghi_chu?.trim() ? " | " + body.ghi_chu.trim() : ""));
  return c.json({ ok: true });
});

// Mirror phieuTra.ts POST /:id/kho-xac-nhan-ket-thuc ("da_gui" -> "ktv_da_nhan", du phong khi
// KTV/doi tac im lang - them 2026-09-08, truoc day chi co ban session, khovan chua goi toi).
partnerKho.post("/phieu-tra/:id/kho-xac-nhan-ket-thuc", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ actor_label?: string }>().catch(() => ({}) as { actor_label?: string });
  const actor = body.actor_label?.trim() || "Kho (qua khovan)";

  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);

  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ktv_da_nhan', updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "da_gui", "ktv_da_nhan", actor, "Kho xác nhận thay, dự phòng (qua Kho vận)");
  return c.json({ ok: true });
});

export default partnerKho;
