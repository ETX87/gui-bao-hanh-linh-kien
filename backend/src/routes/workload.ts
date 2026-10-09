import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";

// GET /api/workload - dem "viec can lam" cho tung nhom vai tro trong 1 request duy nhat.
//
// Ly do (Phat hien 2 vong ra soat UX 08/09/2026): truoc day frontend/src/hooks/useWorkload goi ~12
// endpoint list KHONG kem ?limit roi dem bang r.xxx.length - nhung parsePage() mac dinh limit=20 nen
// MOI so bi chan o 20. Trang chu / huy hieu Sidebar / BottomNav undercount bat ky hang doi nao >20;
// Trang chu noi "20", man hinh noi "31", man Giam sat (dem dung bang GROUP BY) noi "28". Endpoint nay
// dem bang SELECT COUNT(*) dung y het bo loc cua tung man hinh, tra ve dung 1 lan - vua dung so, vua
// giam tai (1 request thay vi 12), vua de hien trang thai loading.
//
// Moi COUNT chi tinh khi user co vai tro tuong ung (la_qtri di qua het). Cac so khong tinh giu = 0.

const workload = new Hono<{ Bindings: Env }>();
workload.use("*", verifySessionMiddleware, loadUser);

const EMPTY = {
  ktv_phieu_nhap: 0,
  ktv_odoo_cho_gui: 0,
  ktv_cho_bo_sung: 0,
  ktv_nhan_hang: 0,
  kho_cho_tiep_nhan: 0,
  kho_cho_dong_goi: 0,
  admin_cho_tiep_nhan_noi_bo: 0,
  admin_cho_xac_nhan_sl: 0,
  admin_cho_phan_loai: 0,
  admin_cho_xac_nhan_hoan_tat: 0,
  admin_san_sang_gom: 0,
  nv_cho_chan_doan: 0,
  ketoan_cho_duyet: 0,
};
type Counts = typeof EMPTY;

workload.get("/", async (c) => {
  const user = c.get("user");
  const counts: Counts = { ...EMPTY };
  const db = c.env.DB;
  const one = (sql: string, ...binds: unknown[]) => db.prepare(sql).bind(...binds).first<{ cnt: number }>();

  const isRealKtv = user.la_ktv_dvbh || user.la_ve_tinh;
  const jobs: Promise<void>[] = [];

  // ---- KTV (hoac qtri) ----
  if (isRealKtv || user.la_qtri) {
    // "Phieu gui hang cua toi" con nhap - khop GET /api/phieu-gui (loc theo nguoi_tao voi KTV that,
    // theo nguoi_tao_ho voi qtri/GS/AdminBH khong phai KTV that).
    const col = isRealKtv ? "nguoi_tao" : "nguoi_tao_ho";
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE ${col} = ? AND trang_thai = 'nhap'`, user.email).then((r) => {
        counts.ktv_phieu_nhap = r?.cnt ?? 0;
      }),
      // Don bao hanh Odoo cua chinh KTV dang cho gui sua (chua dua vao thung) - khop GET /api/odoo-don/cho-gui.
      one(
        `SELECT COUNT(*) as cnt FROM don_bh_odoo o JOIN ktv_lien_he_bh k ON k.ma_ktv = o.ma_ktv
         WHERE k.email_dang_nhap = ? AND o.con_hieu_luc = 1 AND o.trang_thai IN ('new','repairing') AND o.khong_gui_boi IS NULL
           AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id)`,
        user.email,
      ).then((r) => {
        counts.ktv_odoo_cho_gui = r?.cnt ?? 0;
      }),
      // Don vi dang cho_bo_sung_tt thuoc phieu gui cua chinh minh - khop GET /phieu-gui/don-vi/tra-cuu
      // (loc g.nguoi_tao) + .filter(u.trang_thai === 'cho_bo_sung_tt') trong hook cu.
      one(
        `SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u
         JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE g.nguoi_tao = ? AND u.trang_thai = 'cho_bo_sung_tt'`,
        user.email,
      ).then((r) => {
        counts.ktv_cho_bo_sung = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh WHERE ktv_nhan = ? AND trang_thai = 'da_gui'`, user.email).then((r) => {
        counts.ktv_nhan_hang = r?.cnt ?? 0;
      }),
    );
  }

  // ---- Kho (hoac qtri) ----
  if (user.la_kho || user.la_qtri) {
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE trang_thai = 'da_gui'`).then((r) => {
        counts.kho_cho_tiep_nhan = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh WHERE trang_thai = 'da_duyet_ke_toan'`).then((r) => {
        counts.kho_cho_dong_goi = r?.cnt ?? 0;
      }),
    );
  }

  // ---- Admin bao hanh (hoac qtri) ----
  if (user.la_admin_bh || user.la_qtri) {
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0`).then((r) => {
        counts.admin_cho_tiep_nhan_noi_bo = r?.cnt ?? 0;
      }),
      // don cha cho xac nhan SL - khop GET /admin/don-cha
      one(
        `SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE p.trang_thai_cha = 'cho_xac_nhan_so_luong' AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`,
      ).then((r) => {
        counts.admin_cho_xac_nhan_sl = r?.cnt ?? 0;
      }),
      // don vi can xu ly - khop GET /admin/don-vi (bang thong nhat)
      one(
        `SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai')
           AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`,
      ).then((r) => {
        counts.admin_cho_phan_loai = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'cho_admin_xac_nhan'`).then((r) => {
        counts.admin_cho_xac_nhan_hoan_tat = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'san_sang_gom_phieu_tra' AND phieu_tra_id IS NULL`).then((r) => {
        counts.admin_san_sang_gom = r?.cnt ?? 0;
      }),
    );
  }

  // ---- NV sua chua (hoac qtri) ----
  if (user.la_nv_sua_chua || user.la_qtri) {
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'cho_chan_doan' AND nguoi_sua_chua = ?`, user.email).then((r) => {
        counts.nv_cho_chan_doan = r?.cnt ?? 0;
      }),
    );
  }

  // ---- Ke toan (hoac qtri) ----
  if (user.la_ke_toan || user.la_qtri) {
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh WHERE trang_thai = 'cho_ke_toan_duyet'`).then((r) => {
        counts.ketoan_cho_duyet = r?.cnt ?? 0;
      }),
    );
  }

  await Promise.all(jobs.map((j) => j.catch(() => undefined)));
  return c.json({ counts });
});

export default workload;
