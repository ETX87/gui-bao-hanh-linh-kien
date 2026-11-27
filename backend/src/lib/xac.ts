import { HUONG_CO_XAC_SQL } from "./constants";

// Xac du dieu kien gom (chua vao thung, chua xu ly ngoai). Alias u = don vi. v1.166: ca don Xac nhan tru cong no (HUONG_CO_XAC).
export const XAC_CHO_GOM = `u.huong_xu_ly IN (${HUONG_CO_XAC_SQL}) AND u.xu_ly_xac = 'tra_doi_tac' AND u.thung_xac_id IS NULL AND u.xac_tt IS NULL
  AND u.trang_thai NOT IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho','cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt')`;

// 16/11/2026: xac linh kien sau sua chua - de xuat cap linh kien da xuat (luong cu: Kho da xuat; luong CÔNG NỢ SỬA CHỮA
// ben linh-kien-app: da giao xong). Alias d = de_xuat_linh_kien_bh.
// 16/11/2026 (tru cong no sua chua): luong CÔNG NỢ SỬA CHỮA chi vao cho gom sau khi Admin BH xac nhan tieu hao voi xac "Trả đối tác"
// (NV da giao xac that) - khong tu vao ngay khi linh kien giao xong nhu v1.137. SL xac = SL da dung.
export const XAC_DX_CHO_GOM = `d.thung_xac_id IS NULL AND d.xac_tt IS NULL
  AND ((d.trang_thai = 'da_cap' AND d.kho_tt = 'da_xuat')
    OR (d.trang_thai = 'lien_ket' AND d.lk_buoc = 'xong' AND d.xn_luc IS NOT NULL AND d.xac_kq = 'tra_doi_tac' AND COALESCE(d.sl_dung, 0) > 0))`;

// Ket qua xac ngoai thung (khong tra doi tac qua he thong).
export const XAC_KQ = ["ngoai", "tieu_huy", "that_lac", "khong_co", "luu_kho"] as const;
export const XAC_KQ_LABEL: Record<string, string> = {
  ngoai: "Đã xử lý ngoài hệ thống",
  tieu_huy: "Xác đã tiêu huỷ",
  that_lac: "Xác thất lạc",
  khong_co: "Không có xác",
  luu_kho: "Lưu kho",
};
export const XAC_KQ_SQL = XAC_KQ.map((k) => `'${k}'`).join(",");
export const laDx = (id: string) => id.startsWith("DX-");

// 25/11/2026 (v1.160): luat chot 13/11/2026 "xac don tao truoc 01/11/2026 coi nhu da xu ly ngoai he thong" - migration 0031 chi danh dau 1 lan,
// don cu phan loai Doi moi + "Tra doi tac" SAU do van lot vao "Xac cho gom" (44 xac da sua tay 25/11). Cron 15 phut danh dau lai, ghi nhat ky don.
// Khong doi updated_at (khong lam lech dong ho buoc / SLA).
const XAC_CU_CHUA_DANH_DAU = `huong_xu_ly IN (${HUONG_CO_XAC_SQL}) AND xu_ly_xac = 'tra_doi_tac' AND thung_xac_id IS NULL AND xac_tt IS NULL
  AND parent_id IN (SELECT id FROM phieu_sua_chua_bh WHERE created_at < '2026-11-01')
  AND NOT EXISTS (SELECT 1 FROM logs_bh l WHERE l.entity_type = 'phieu_sc_ct' AND l.entity_id = phieu_sua_chua_bh_ct.id AND l.ghi_chu LIKE '%đưa lại danh sách chờ gom%')`;
// ^ nguoi da bam "Dua lai cho gom" (thuc te con xac can tra) thi ton trong, khong danh dau lai.
export async function danhDauXacDonCu(db: D1Database, now: string): Promise<number> {
  const ghi = "Đơn trước 01/11/2026 — coi như đã xử lý ngoài hệ thống (luật chốt 13/11/2026)";
  const [, r] = await db.batch([
    db.prepare(`INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu)
      SELECT 'phieu_sc_ct', id, trang_thai, trang_thai, 'he-thong', ?, ? FROM phieu_sua_chua_bh_ct WHERE ${XAC_CU_CHUA_DANH_DAU}`).bind(now, `Xác: Đã xử lý ngoài hệ thống | ${ghi}`),
    db.prepare(`UPDATE phieu_sua_chua_bh_ct SET xac_tt = 'ngoai', xac_xl_luc = ?, xac_xl_ghi_chu = ?, updated_at = updated_at WHERE ${XAC_CU_CHUA_DANH_DAU}`).bind(now, ghi),
  ]);
  return r.meta.changes ?? 0;
}
