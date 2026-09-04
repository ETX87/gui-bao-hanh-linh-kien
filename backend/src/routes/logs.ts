import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { addLog, type LogEntityType } from "../lib/logs";

// "Bam vao so gio qua han tren badge SLA de ghi ly do cham ngay" - port dung
// openQuickLyDoChamModal()/submitQuickLyDoCham() cua prototype: ghi 1 dong log DOC LAP (KHONG doi
// trang thai doi tuong), khac han gateSla() (luon di kem 1 hanh dong nghiep vu dang thuc hien).
// CHI cho vai tro nhan vien xu ly (Kho/Admin BH/NV/Ke toan/qtri) - KHONG cho KTV/View (doc-only,
// "ly do cham" la giai trinh cua nguoi xu ly, khong phai nguoi cho).

const logs = new Hono<{ Bindings: Env }>();
logs.use("*", verifySessionMiddleware, loadUser);

const ENTITY_TABLES: Record<LogEntityType, { table: string; idCol: string; statusCol: string }> = {
  phieu_gui: { table: "phieu_gui_bh", idCol: "id", statusCol: "trang_thai" },
  phieu_sc: { table: "phieu_sua_chua_bh", idCol: "id", statusCol: "trang_thai_cha" },
  phieu_sc_ct: { table: "phieu_sua_chua_bh_ct", idCol: "id", statusCol: "trang_thai" },
  phieu_tra: { table: "phieu_tra_bh", idCol: "id", statusCol: "trang_thai" },
};

logs.post("/:entityType/:entityId/ly-do-cham", async (c) => {
  const user = c.get("user");
  if (!(user.la_kho || user.la_admin_bh || user.la_nv_sua_chua || user.la_ke_toan || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);

  const entityType = c.req.param("entityType") as LogEntityType;
  const meta = ENTITY_TABLES[entityType];
  if (!meta) return c.json({ error: "INVALID_ENTITY_TYPE" }, 400);
  const entityId = c.req.param("entityId");

  const body = await c.req.json<{ ly_do_cham?: string }>().catch(() => ({}) as { ly_do_cham?: string });
  if (!body.ly_do_cham?.trim()) return c.json({ error: "MISSING_LY_DO_CHAM" }, 400);

  const row = await c.env.DB.prepare(`SELECT ${meta.statusCol} as status FROM ${meta.table} WHERE ${meta.idCol} = ?`).bind(entityId).first<{ status: string | null }>();
  if (!row) return c.json({ error: "NOT_FOUND" }, 404);

  await addLog(c.env.DB, entityType, entityId, row.status, row.status, user.email, "⏱ Ghi nhận lý do chậm (ghi nhận độc lập, không kèm hành động): " + body.ly_do_cham.trim());
  return c.json({ ok: true });
});

export default logs;
