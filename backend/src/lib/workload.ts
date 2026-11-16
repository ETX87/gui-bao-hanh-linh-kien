import { DX_XAC_NHAN_SQL, DOI_TAC_ID_SQL } from "./doiTac";
import type { AppUser } from "../types";
import { mienScope } from "./mien";
import { XAC_CHO_GOM, XAC_DX_CHO_GOM } from "./xac";

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

export const EMPTY_COUNTS = {
  ktv_phieu_nhap: 0,
  ktv_thung_tu_choi: 0,
  kho_thung_tu_choi: 0,
  ktv_odoo_cho_gui: 0,
  ktv_cho_bo_sung: 0,
  ktv_nhan_hang: 0,
  kho_cho_tiep_nhan: 0,
  kho_cho_dong_goi: 0,
  kho_cho_in: 0,
  kho_da_in: 0,
  kho_lk_cho_in: 0,
  kho_lk_da_in: 0,
  kho_cho_ban_giao: 0,
  kho_khieu_nai: 0,
  admin_cho_tiep_nhan_noi_bo: 0,
  admin_cho_xac_nhan_sl: 0,
  admin_cho_phan_loai: 0,
  admin_cho_xac_nhan_hoan_tat: 0,
  admin_san_sang_gom: 0,
  admin_de_xuat_cho_cap: 0,
  admin_xn_tieu_hao: 0,
  admin_thieu_hang_da_ve: 0,
  admin_phieu_tra_tu_choi: 0,
  nv_cho_chan_doan: 0,
  ketoan_cho_duyet: 0,
  ketoan_de_xuat_lk: 0,
  admin_xac_cho_gom: 0,
  admin_thung_xac_nhap: 0,
  admin_thung_xac_tra_lai: 0,
  ketoan_thung_xac: 0,
};
export type Counts = typeof EMPTY_COUNTS;

export async function demWorkload(db: D1Database, user: AppUser): Promise<Counts> {
  const counts: Counts = { ...EMPTY_COUNTS };
  const one = (sql: string, ...binds: unknown[]) => db.prepare(sql).bind(...binds).first<{ cnt: number }>();

  const isRealKtv = user.la_ktv_dvbh || user.la_ve_tinh;
  // 11/10/2026: hang doi Kho / Admin BH / Ke toan chi dem don mien minh + chua khai bao.
  const mg = mienScope(user, "g");
  const mp = mienScope(user, "p");
  const mt = mienScope(user, "t");
  const jobs: Promise<void>[] = [];

  // ---- KTV (hoac qtri) ----
  // "Phieu gui hang cua toi" con nhap - khop GET /api/phieu-gui (loc theo nguoi_tao voi KTV that,
  // theo nguoi_tao_ho voi qtri/GS/AdminBH khong phai KTV that - muc menu "Tao ho don cho KTV").
  if (isRealKtv || user.la_qtri || user.la_giam_sat || user.la_admin_bh) {
    const col = isRealKtv ? "nguoi_tao" : "nguoi_tao_ho";
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE ${col} = ? AND trang_thai = 'nhap'`, user.email).then((r) => {
        counts.ktv_phieu_nhap = r?.cnt ?? 0;
      }),
      // 13/11/2026: thung bi Admin BH tu choi, Kho da dong y -> cho KTV phan hoi (7 ngay).
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE (nguoi_tao = ? OR nguoi_tao_ho = ?) AND tu_choi_tt = 'cho_ktv'`, user.email, user.email).then((r) => {
        counts.ktv_thung_tu_choi = r?.cnt ?? 0;
      }),
    );
  }

  if (isRealKtv || user.la_qtri) {
    jobs.push(
      // Don bao hanh Odoo cua chinh KTV dang cho gui sua (chua dua vao thung) - khop GET /api/odoo-don/cho-gui.
      one(
        `SELECT COUNT(*) as cnt FROM don_bh_odoo o
         WHERE (o.ma_ktv IN (SELECT ma_ktv FROM ktv_lien_he_bh WHERE LOWER(email_dang_nhap) = LOWER(?1)) OR o.ma_ktv_tk IN (SELECT ma_ktv FROM ktv_lien_he_bh WHERE LOWER(email_dang_nhap) = LOWER(?1)))
           AND o.con_hieu_luc = 1 AND o.trang_thai IN ('new','repairing') AND o.khong_gui_boi IS NULL
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
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh g WHERE g.trang_thai = 'da_gui'${mg.sql}`, ...mg.binds).then((r) => {
        counts.kho_cho_tiep_nhan = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'da_duyet_ke_toan'${mt.sql}`, ...mt.binds).then((r) => {
        counts.kho_cho_dong_goi = r?.cnt ?? 0;
      }),
      // 04/11/2026: tach theo trang thai in phieu cua Kho.
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'da_duyet_ke_toan' AND t.kho_da_in = 0${mt.sql}`, ...mt.binds).then((r) => {
        counts.kho_cho_in = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'da_duyet_ke_toan' AND t.kho_da_in = 1${mt.sql}`, ...mt.binds).then((r) => {
        counts.kho_da_in = r?.cnt ?? 0;
      }),
      // 04/11/2026: phieu cap linh kien KT da xac nhan - Kho in / xuat.
      one(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(d.ma_misa), ''), d.id)) as cnt FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.trang_thai = 'da_cap' AND COALESCE(d.kho_tt, 'cho_in') = 'cho_in'${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.kho_lk_cho_in = r?.cnt ?? 0;
      }),
      one(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(d.ma_misa), ''), d.id)) as cnt FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.trang_thai = 'da_cap' AND d.kho_tt = 'da_in'${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.kho_lk_da_in = r?.cnt ?? 0;
      }),
      // KTV bao khong nhan duoc hang -> Kho danh gia gui thanh cong / that bai (12/10/2026).
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'khieu_nai_van_chuyen'${mt.sql}`, ...mt.binds).then((r) => {
        counts.kho_khieu_nai = r?.cnt ?? 0;
      }),
      // Thung Kho da nhan, cho Admin BH nhan ban giao noi bo (nhac Kho mang hang sang).
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh g WHERE g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0 AND g.tu_choi_tt IS NULL${mg.sql}`, ...mg.binds).then((r) => {
        counts.kho_cho_ban_giao = r?.cnt ?? 0;
      }),
      // 13/11/2026: Admin BH tu choi tiep nhan thung -> Kho phan hoi dong y / khong dong y.
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh g WHERE g.tu_choi_tt = 'cho_kho'${mg.sql}`, ...mg.binds).then((r) => {
        counts.kho_thung_tu_choi = r?.cnt ?? 0;
      }),
    );
  }

  // ---- Admin bao hanh (hoac qtri) ----
  if (user.la_admin_bh || user.la_qtri) {
    jobs.push(
      one(`SELECT COUNT(*) as cnt FROM phieu_gui_bh g WHERE g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0 AND g.tu_choi_tt IS NULL${mg.sql}`, ...mg.binds).then((r) => {
        counts.admin_cho_tiep_nhan_noi_bo = r?.cnt ?? 0;
      }),
      // don cha cho xac nhan SL - khop GET /admin/don-cha
      one(
        `SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE p.trang_thai_cha = 'cho_xac_nhan_so_luong' AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.admin_cho_xac_nhan_sl = r?.cnt ?? 0;
      }),
      // don vi can xu ly - khop GET /admin/don-vi (bang thong nhat)
      one(
        `SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai')
           AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.admin_cho_phan_loai = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'cho_admin_xac_nhan'${mp.sql}`, ...mp.binds).then((r) => {
        counts.admin_cho_xac_nhan_hoan_tat = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL${mp.sql}`, ...mp.binds).then((r) => {
        counts.admin_san_sang_gom = r?.cnt ?? 0;
      }),
      // 12/10/2026: de xuat linh kien NV cho Admin len MISA cap.
      one(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(p.case_id), ''), u.id)) as cnt FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.trang_thai = 'cho_cap'${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.admin_de_xuat_cho_cap = r?.cnt ?? 0;
      }),
      // 16/11/2026: lan cap linh kien (app Dat LK) NV da nhan, cho Admin BH xac nhan tieu hao -> tru cong no NV.
      one(
        `SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(p.case_id), ''), u.id)) as cnt FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.trang_thai = 'lien_ket' AND d.lk_buoc = 'xong' AND d.xn_luc IS NULL AND u.trang_thai <> 'cho_chan_doan' AND ${DX_XAC_NHAN_SQL("d")}${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.admin_xn_tieu_hao = r?.cnt ?? 0;
      }),
      // 04/11/2026: ticket thieu hang ben linh-kien-app da dong (hang da ve / tu choi / khong mua duoc) - Admin BH chua bam "Da nam".
      one(
        `SELECT COUNT(*) as cnt FROM thieu_hang_bh t2 JOIN phieu_sua_chua_bh_ct u ON u.id = t2.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE t2.da_xem = 0 AND t2.trang_thai IN ('Kho xac nhan hang da ve', 'Kho tu choi', 'Mua hang tu choi')${mp.sql}`,
        ...mp.binds,
      ).then((r) => {
        counts.admin_thieu_hang_da_ve = r?.cnt ?? 0;
      }),
      // 13/11/2026: tra xac linh kien - xac cho gom thung, thung nhap, thung KT tra lai.
      one(
        `SELECT (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE ${XAC_CHO_GOM}${mp.sql})
          + (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE ${XAC_DX_CHO_GOM}${mp.sql}) as cnt`,
        ...mp.binds,
        ...mp.binds,
      ).then((r) => {
        counts.admin_xac_cho_gom = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM thung_xac_bh t WHERE t.trang_thai = 'nhap'${mt.sql}`, ...mt.binds).then((r) => {
        counts.admin_thung_xac_nhap = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM thung_xac_bh t WHERE t.trang_thai = 'nhap' AND t.ly_do_tra_lai IS NOT NULL${mt.sql}`, ...mt.binds).then((r) => {
        counts.admin_thung_xac_tra_lai = r?.cnt ?? 0;
      }),
      // 20/10/2026: phieu tra Ke toan tu choi, tra ve Admin BH.
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'nhap' AND t.ly_do_tu_choi_kt IS NOT NULL${mt.sql}`, ...mt.binds).then((r) => {
        counts.admin_phieu_tra_tu_choi = r?.cnt ?? 0;
      }),
    );
  }

  // ---- Tra xac (16/11/2026, v1.142): cung so viec cua Admin BH o man Tra xac, chi xac / thung cua doi tac duoc gan ----
  if (user.la_tra_xac && !(user.la_admin_bh || user.la_qtri)) {
    const { results: dts } = await db.prepare("SELECT doi_tac_id FROM user_doi_tac_bh WHERE email = ?").bind(user.email).all<{ doi_tac_id: number }>();
    const ds = JSON.stringify(dts.map((r) => r.doi_tac_id));
    const dtP = ` AND ${DOI_TAC_ID_SQL("p")} IN (SELECT value FROM json_each(?))`;
    jobs.push(
      one(
        `SELECT (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE ${XAC_CHO_GOM}${dtP}${mp.sql})
          + (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE ${XAC_DX_CHO_GOM}${dtP}${mp.sql}) as cnt`,
        ds, ...mp.binds, ds, ...mp.binds,
      ).then((r) => {
        counts.admin_xac_cho_gom = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM thung_xac_bh t WHERE t.trang_thai = 'nhap' AND t.doi_tac_id IN (SELECT value FROM json_each(?))${mt.sql}`, ds, ...mt.binds).then((r) => {
        counts.admin_thung_xac_nhap = r?.cnt ?? 0;
      }),
      one(`SELECT COUNT(*) as cnt FROM thung_xac_bh t WHERE t.trang_thai = 'nhap' AND t.ly_do_tra_lai IS NOT NULL AND t.doi_tac_id IN (SELECT value FROM json_each(?))${mt.sql}`, ds, ...mt.binds).then((r) => {
        counts.admin_thung_xac_tra_lai = r?.cnt ?? 0;
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
      one(`SELECT COUNT(*) as cnt FROM phieu_tra_bh t WHERE t.trang_thai = 'cho_ke_toan_duyet'${mt.sql}`, ...mt.binds).then((r) => {
        counts.ketoan_cho_duyet = r?.cnt ?? 0;
      }),
      // 16/11/2026: ke toan khong con xac nhan cap linh kien o app nay (lam ben app Dat linh kien) - bo dem ketoan_de_xuat_lk.
      one(`SELECT COUNT(*) as cnt FROM thung_xac_bh t WHERE t.trang_thai = 'cho_ke_toan'${mt.sql}`, ...mt.binds).then((r) => {
        counts.ketoan_thung_xac = r?.cnt ?? 0;
      }),
    );
  }

  await Promise.all(jobs.map((j) => j.catch(() => undefined)));
  return counts;
}
