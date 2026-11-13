// Xac du dieu kien gom (chua vao thung, chua xu ly ngoai). Alias u = don vi.
export const XAC_CHO_GOM = `u.huong_xu_ly = 'doi_moi' AND u.xu_ly_xac = 'tra_doi_tac' AND u.thung_xac_id IS NULL AND u.xac_tt IS NULL
  AND u.trang_thai NOT IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho','cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt')`;
