import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { computeEmailGs } from "../lib/gs";
import { runOdooSync } from "../lib/odooSync";
import { buildOdooImportRows } from "../lib/odooImportExport";
import { nowVN } from "../lib/vnTime";
import { kwClause } from "../lib/search";
import { parsePage } from "../lib/pagination";

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
// Tra kem `khong_gui`: don KTV da xac nhan "khong gui" (tao nham tren Odoo, 09/10/2026) de mo lai neu
// tat nham.
odooDon.get("/cho-gui", async (c) => {
  const user = c.get("user");
  const t = await resolveKtvTarget(c.env.DB, user, c.req.query("ktv_email"));
  if ("error" in t) return c.json({ error: t.error }, t.status);
  const ktv = await c.env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(t.email).first<{ ma_ktv: string }>();
  if (!ktv) return c.json({ don: [], khong_gui: [], so_da_gui: 0, ktv_email: t.email, chua_khai_bao_ktv: true });
  const daGui = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.odoo_id IS NOT NULL AND g.nguoi_tao = ?`,
  )
    .bind(t.email)
    .first<{ n: number }>();
  const { results } = await c.env.DB.prepare(
    `SELECT o.odoo_id, o.ma_don, o.case_id, o.ma_linh_kien, o.ten_linh_kien, o.so_luong, o.trang_thai, o.tinh_trang_loi, o.ghi_chu, o.ngay_tao,
            o.khong_gui_boi, o.khong_gui_luc, o.khong_gui_ly_do,
            (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = o.case_id) AS khach_hang
     FROM don_bh_odoo o
     WHERE o.ma_ktv = ? AND o.con_hieu_luc = 1 AND o.trang_thai IN ('new','repairing')
       AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id)
     ORDER BY o.ngay_tao DESC LIMIT 500`,
  )
    .bind(ktv.ma_ktv)
    .all<{ khong_gui_boi: string | null }>();
  return c.json({
    don: results.filter((r) => !r.khong_gui_boi),
    khong_gui: results.filter((r) => !!r.khong_gui_boi),
    so_da_gui: daGui?.n ?? 0,
    ktv_email: t.email,
  });
});

// GET /api/odoo-don/da-gui?ktv_email=&limit=&offset= - don Odoo da dua vao thung cua KTV (tab "Đã gửi",
// 09/10/2026). Phan trang server vi danh sach nay tang theo lich su. Tien do lay tu trang thai phieu gui
// + lan bao gan nhat ve dvbh (odoo_status_sync, cron 15 phut).
odooDon.get("/da-gui", async (c) => {
  const user = c.get("user");
  const t = await resolveKtvTarget(c.env.DB, user, c.req.query("ktv_email"));
  if ("error" in t) return c.json({ error: t.error }, t.status);
  const { limit, offset } = parsePage(c);
  const kw = kwClause(c.req.query("q"), ["o.ma_don", "o.case_id", "o.ma_linh_kien", "o.ten_linh_kien", "p.id", "p.phieu_gui_id"], ["p.tim_kiem"]);
  const [rows, cnt] = await Promise.all([
    c.env.DB.prepare(
      `SELECT o.odoo_id, o.ma_don, o.case_id, o.ma_linh_kien, o.ten_linh_kien, o.so_luong, o.trang_thai, o.ngay_tao,
              p.id AS don_cha_id, p.phieu_gui_id, p.created_at AS gan_luc, g.trang_thai AS gui_tt,
              s.last_status, s.last_detail
       FROM phieu_sua_chua_bh p
       JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       JOIN don_bh_odoo o ON o.odoo_id = p.odoo_id
       LEFT JOIN odoo_status_sync s ON s.odoo_id = p.odoo_id
       WHERE p.odoo_id IS NOT NULL AND g.nguoi_tao = ?${kw.sql}
       ORDER BY p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`,
    )
      .bind(t.email, ...kw.binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id JOIN don_bh_odoo o ON o.odoo_id = p.odoo_id WHERE p.odoo_id IS NOT NULL AND g.nguoi_tao = ?${kw.sql}`)
      .bind(t.email, ...kw.binds)
      .first<{ n: number }>(),
  ]);
  return c.json({ don: rows.results, total: cnt?.n ?? 0 });
});

// Don Odoo phai thuoc dung KTV dang thao tac (chinh minh / KTV duoc tao ho qua ktv_email) va chua vao
// thung nao.
async function loadOwnedOdoo(db: D1Database, user: AppUser, odooId: number, ktvEmailReq: string | undefined) {
  const t = await resolveKtvTarget(db, user, ktvEmailReq);
  if ("error" in t) return { error: t.error, status: t.status } as const;
  const row = await db
    .prepare(
      `SELECT o.odoo_id, o.ma_ktv, o.khong_gui_boi, (SELECT p.id FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id) AS da_gan
       FROM don_bh_odoo o WHERE o.odoo_id = ?`,
    )
    .bind(odooId)
    .first<{ odoo_id: number; ma_ktv: string | null; khong_gui_boi: string | null; da_gan: string | null }>();
  if (!row) return { error: "NOT_FOUND", status: 404 } as const;
  const ktv = await db.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(t.email).first<{ ma_ktv: string }>();
  if (!ktv || row.ma_ktv !== ktv.ma_ktv) return { error: "CASE_KTV_MISMATCH", status: 403 } as const;
  if (row.da_gan) return { error: "DA_GAN_THUNG", status: 400 } as const;
  return { row } as const;
}

// POST /api/odoo-don/:id/khong-gui {ly_do?, ktv_email?} - xac nhan don Odoo khong can gui bao hanh.
odooDon.post("/:id/khong-gui", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ ly_do?: string; ktv_email?: string }>().catch(() => ({}) as { ly_do?: string; ktv_email?: string });
  const r = await loadOwnedOdoo(c.env.DB, user, Number(c.req.param("id")), body.ktv_email);
  if ("error" in r) return c.json({ error: r.error }, r.status);
  if (r.row.khong_gui_boi) return c.json({ ok: true });
  const lyDo = (body.ly_do || "").trim().slice(0, 300) || "Tạo nhầm trên Odoo, không cần gửi bảo hành";
  await c.env.DB.prepare("UPDATE don_bh_odoo SET khong_gui_boi = ?, khong_gui_luc = ?, khong_gui_ly_do = ? WHERE odoo_id = ?")
    .bind(user.email, nowVN(), lyDo, r.row.odoo_id)
    .run();
  return c.json({ ok: true });
});

// POST /api/odoo-don/:id/mo-lai {ktv_email?} - mo lai don da xac nhan "khong gui" (tat nham).
odooDon.post("/:id/mo-lai", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ ktv_email?: string }>().catch(() => ({}) as { ktv_email?: string });
  const r = await loadOwnedOdoo(c.env.DB, user, Number(c.req.param("id")), body.ktv_email);
  if ("error" in r) return c.json({ error: r.error }, r.status);
  await c.env.DB.prepare("UPDATE don_bh_odoo SET khong_gui_boi = NULL, khong_gui_luc = NULL, khong_gui_ly_do = NULL WHERE odoo_id = ?").bind(r.row.odoo_id).run();
  return c.json({ ok: true });
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
         SUM(CASE WHEN con_hieu_luc = 1 AND trang_thai IN ('new','repairing') AND khong_gui_boi IS NULL THEN 1 ELSE 0 END) AS cho_gui,
         SUM(CASE WHEN khong_gui_boi IS NOT NULL THEN 1 ELSE 0 END) AS khong_gui,
         SUM(CASE WHEN ma_ktv IS NULL THEN 1 ELSE 0 END) AS chua_ktv
       FROM don_bh_odoo`,
    ).first<{ tong: number; cho_gui: number | null; chua_ktv: number | null; khong_gui: number | null }>(),
  ]);
  return c.json({
    last_run: last ? JSON.parse(last.value) : null,
    cursor: cursor ? JSON.parse(cursor.value) : null,
    tong: counts?.tong ?? 0,
    cho_gui: counts?.cho_gui ?? 0,
    chua_ktv: counts?.chua_ktv ?? 0,
    khong_gui: counts?.khong_gui ?? 0,
  });
});

// POST /api/odoo-don/sync-now - dong bo ngay (khong cho 15 phut).
odooDon.post("/sync-now", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await runOdooSync(c.env));
});

// GET /api/odoo-don/xuat-import?tu=YYYY-MM-DD&den=YYYY-MM-DD&chi_can_cap_nhat=1 - du lieu file ket qua
// gui sua de import NGUOC Odoo (ID, Trang thai, Ngay hoan thanh, Ghi chu) - Admin BH/qtri (09/10/2026).
// Loc ngay theo thoi diem trang thai gui sua doi gan nhat; chi_can_cap_nhat=1 (mac dinh) bo don ma
// Odoo da dung trang thai + ghi chu.
odooDon.get("/xuat-import", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const ngay = (v: string | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return c.json(
    await buildOdooImportRows(c.env.DB, {
      tu: ngay(c.req.query("tu")),
      den: ngay(c.req.query("den")),
      chiCanCapNhat: c.req.query("chi_can_cap_nhat") !== "0",
      chiXong: c.req.query("chi_xong") === "1",
    }),
  );
});

export default odooDon;
