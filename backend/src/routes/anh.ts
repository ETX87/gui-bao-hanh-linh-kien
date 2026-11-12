import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { chuyenAnhCuSangDrive } from "../lib/anhDrive";

// Chuyen anh cu (data URL trong D1) sang Google Drive (12/11/2026, v1.113) - xem lib/anhDrive.ts. Cron 15 phut tu chay;
// day la the theo doi + nut "Chuyen ngay" o Cai dat he thong (chi Admin he thong).
const anh = new Hono<{ Bindings: Env }>();
anh.use("*", verifySessionMiddleware, loadUser);

anh.get("/drive-status", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const r = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM phieu_sua_chua_bh_anh WHERE anh_url LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct_anh WHERE anh_url LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_tra_bh_anh WHERE anh_url LIKE 'data:%') AS con_lai,
       (SELECT COUNT(*) FROM phieu_sua_chua_bh_anh WHERE anh_url NOT LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct_anh WHERE anh_url NOT LIKE 'data:%') + (SELECT COUNT(*) FROM phieu_tra_bh_anh WHERE anh_url NOT LIKE 'data:%') AS tren_drive,
       (SELECT value FROM sync_state WHERE key = 'anh_drive_last') AS last`,
  ).first<{ con_lai: number; tren_drive: number; last: string | null }>();
  return c.json({ con_lai: r?.con_lai ?? 0, tren_drive: r?.tren_drive ?? 0, last: r?.last ? JSON.parse(r.last) : null });
});

anh.post("/chuyen-drive", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await chuyenAnhCuSangDrive(c.env, 15, 25000));
});

export default anh;
