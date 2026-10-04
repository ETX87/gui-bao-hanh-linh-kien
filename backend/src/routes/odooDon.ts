import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { computeEmailGs } from "../lib/gs";
import { runOdooSync } from "../lib/odooSync";

// Don bao hanh tao tren Odoo, keo ve qua dvbh (cron 15 phut - lib/odooSync.ts). KTV thay "don cua
// minh dang cho gui sua" (Odoo new/repairing, chua dua vao thung nao) qua ma KTV phu trach tren case.

const odooDon = new Hono<{ Bindings: Env }>();
odooDon.use("*", verifySessionMiddleware, loadUser);

// Xac dinh KTV dang xem danh sach: KTV that = chinh minh; GS/Admin BH/qtri "tao ho" truyen ktv_email
// (GS chi trong Khu vuc minh phu trach - cung luat voi POST /api/phieu-gui). Tra ve email hoac ma loi.
export async function resolveKtvTarget(db: D1Database, user: AppUser, ktvEmailReq: string | undefined | null): Promise<{ email: string } | { error: string; status: 403 | 404 }> {
  const req = ktvEmailReq?.trim();
  if (req && req !== user.email) {
    if (!(user.la_giam_sat || user.la_admin_bh || user.la_qtri)) return { error: "FORBIDDEN", status: 403 };
    const k = await db.prepare("SELECT 1 FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(req).first();
    if (!k) return { error: "KTV_NOT_FOUND", status: 404 };
    if (user.la_giam_sat && !user.la_admin_bh && !user.la_qtri) {
      if ((await computeEmailGs(db, req)) !== user.email) return { error: "OUT_OF_KHU_VUC", status: 403 };
    }
    return { email: req };
  }
  if (!(user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri)) return { error: "FORBIDDEN", status: 403 };
  return { email: user.email };
}

// GET /api/odoo-don/cho-gui?ktv_email= - don Odoo "cho gui sua" cua KTV (chua gan vao don cha nao).
odooDon.get("/cho-gui", async (c) => {
  const user = c.get("user");
  const t = await resolveKtvTarget(c.env.DB, user, c.req.query("ktv_email"));
  if ("error" in t) return c.json({ error: t.error }, t.status);
  const ktv = await c.env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(t.email).first<{ ma_ktv: string }>();
  if (!ktv) return c.json({ don: [], ktv_email: t.email, chua_khai_bao_ktv: true });
  const { results } = await c.env.DB.prepare(
    `SELECT o.odoo_id, o.ma_don, o.case_id, o.ma_linh_kien, o.ten_linh_kien, o.so_luong, o.trang_thai, o.tinh_trang_loi, o.ghi_chu, o.ngay_tao
     FROM don_bh_odoo o
     WHERE o.ma_ktv = ? AND o.con_hieu_luc = 1 AND o.trang_thai IN ('new','repairing')
       AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id)
     ORDER BY o.ngay_tao DESC LIMIT 300`,
  )
    .bind(ktv.ma_ktv)
    .all();
  return c.json({ don: results, ktv_email: t.email });
});

// GET /api/odoo-don/sync-status - lan dong bo gan nhat + so don da keo ve (Admin BH/qtri).
odooDon.get("/sync-status", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const [last, cursor, counts] = await Promise.all([
    c.env.DB.prepare("SELECT value FROM sync_state WHERE key = 'odoo_last_run'").first<{ value: string }>(),
    c.env.DB.prepare("SELECT value FROM sync_state WHERE key = 'odoo_cursor'").first<{ value: string }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS tong,
         SUM(CASE WHEN con_hieu_luc = 1 AND trang_thai IN ('new','repairing') THEN 1 ELSE 0 END) AS cho_gui,
         SUM(CASE WHEN ma_ktv IS NULL THEN 1 ELSE 0 END) AS chua_ktv
       FROM don_bh_odoo`,
    ).first<{ tong: number; cho_gui: number | null; chua_ktv: number | null }>(),
  ]);
  return c.json({
    last_run: last ? JSON.parse(last.value) : null,
    cursor: cursor ? JSON.parse(cursor.value) : null,
    tong: counts?.tong ?? 0,
    cho_gui: counts?.cho_gui ?? 0,
    chua_ktv: counts?.chua_ktv ?? 0,
  });
});

// POST /api/odoo-don/sync-now - dong bo ngay (khong cho 15 phut).
odooDon.post("/sync-now", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await runOdooSync(c.env));
});

export default odooDon;
