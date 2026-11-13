// Nhan tieng Viet cho API doi tac case-timeline (routes/partnerCase.ts, 06/11/2026). Chep tu
// frontend/src/lib/constants.ts (backend khong import duoc frontend) - doi nhan ben frontend thi sua ca day.

export const HUONG_XU_LY_LABELS_VI: Record<string, string> = {
  sua_chua: "Sửa chữa",
  doi_moi: "Đổi mới",
  tra_lai_ktv: "Trả lại KTV",
  xac_nhan_tru_no: "Xác nhận linh kiện, trừ công nợ",
  dich_vu_tinh_phi: "Dịch vụ tính phí",
  tu_choi: "Huỷ đơn bảo hành",
  chuyen_kho: "Chuyển kho",
};

export const TRANG_THAI_CHA_VI: Record<string, string> = {
  cho_xac_nhan_so_luong: "Chờ xác nhận số lượng",
  da_tach: "Đã xác nhận số lượng",
};

export const TRANG_THAI_UNIT_VI: Record<string, string> = {
  cho_phan_loai: "Chờ phân loại",
  admin_can_xem_lai: "Admin cần xem lại",
  cho_bo_sung_tt: "Chờ KTV bổ sung",
  cho_chan_doan: "Chờ NV chẩn đoán",
  cho_admin_xac_nhan: "Chờ Admin xác nhận",
  san_sang_gom_phieu_tra: "Sẵn sàng gộp phiếu trả",
  ket_thuc_tu_choi: "Đã huỷ",
  ket_thuc_chuyen_kho: "Đã chuyển kho",
};

export const TRANG_THAI_GUI_VI: Record<string, string> = {
  nhap: "Nháp",
  da_gui: "Đã gửi xe",
  da_tiep_nhan: "Kho đã tiếp nhận",
};

export const TRANG_THAI_TRA_VI: Record<string, string> = {
  nhap: "Nháp",
  cho_ke_toan_duyet: "Chờ Kế toán duyệt",
  da_duyet_ke_toan: "Đã duyệt — chờ Kho đóng gói/gửi",
  da_gui: "Đã gửi — chờ KTV xác nhận",
  ktv_da_nhan: "Đã hoàn tất",
  khieu_nai_van_chuyen: "Khiếu nại vận chuyển",
  gui_that_bai: "Gửi thất bại (thất lạc)",
  ket_thuc_khong_gui: "Kết thúc, không gửi",
};

// = GIAI_DOAN cua frontend (man Tra cuu) - buoc thuc te cua don trong toan luong.
export const GIAI_DOAN_VI: Record<string, string> = {
  thung_nhap: "Thùng nháp — KTV chưa gửi",
  thung_dang_gui: "Đang gửi về Kho",
  thung_cho_admin_nhan: "Kho đã nhận — chờ Admin nhận",
  thung_tu_choi: "Admin từ chối thùng — chờ Kho / KTV phản hồi",
  cho_xac_nhan_so_luong: "Chờ xác nhận SL",
  cho_phan_loai: "Chờ phân loại",
  admin_can_xem_lai: "Admin cần xem lại",
  cho_bo_sung_tt: "Chờ KTV bổ sung",
  cho_chan_doan: "Đang sửa chữa (NV)",
  cho_admin_xac_nhan: "Chờ Admin xác nhận",
  san_sang_gom_phieu_tra: "Chờ tạo phiếu trả",
  tra_nhap: "Phiếu trả nháp (Admin)",
  tra_cho_ke_toan_duyet: "Chờ Kế toán duyệt",
  tra_da_duyet_ke_toan: "Chờ Kho đóng gói / gửi",
  tra_da_gui: "Đang gửi trả KTV",
  tra_khieu_nai_van_chuyen: "KTV báo không nhận được",
  tra_ktv_da_nhan: "Hoàn tất (KTV đã nhận)",
  tra_gui_that_bai: "Gửi thất bại (thất lạc)",
  tra_ket_thuc_khong_gui: "Kết thúc, không gửi",
  ket_thuc_tu_choi: "Đã huỷ",
  ket_thuc_chuyen_kho: "Đã chuyển kho",
};
