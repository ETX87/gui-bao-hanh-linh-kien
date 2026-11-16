// Xac du dieu kien gom (chua vao thung, chua xu ly ngoai). Alias u = don vi.
export const XAC_CHO_GOM = `u.huong_xu_ly = 'doi_moi' AND u.xu_ly_xac = 'tra_doi_tac' AND u.thung_xac_id IS NULL AND u.xac_tt IS NULL
  AND u.trang_thai NOT IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho','cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt')`;

// 16/11/2026: xac linh kien sau sua chua - de xuat cap linh kien da xuat (luong cu: Kho da xuat; luong CÔNG NỢ SỬA CHỮA
// ben linh-kien-app: da giao xong). Alias d = de_xuat_linh_kien_bh.
export const XAC_DX_CHO_GOM = `d.thung_xac_id IS NULL AND d.xac_tt IS NULL
  AND ((d.trang_thai = 'da_cap' AND d.kho_tt = 'da_xuat') OR (d.trang_thai = 'lien_ket' AND d.lk_buoc = 'xong'))`;

// Ket qua xac ngoai thung (khong tra doi tac qua he thong).
export const XAC_KQ = ["ngoai", "tieu_huy", "that_lac", "khong_co"] as const;
export const XAC_KQ_LABEL: Record<string, string> = {
  ngoai: "Đã xử lý ngoài hệ thống",
  tieu_huy: "Xác đã tiêu huỷ",
  that_lac: "Xác thất lạc",
  khong_co: "Không có xác",
};
export const XAC_KQ_SQL = XAC_KQ.map((k) => `'${k}'`).join(",");
export const laDx = (id: string) => id.startsWith("DX-");
