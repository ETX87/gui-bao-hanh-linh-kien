// Nhan hien thi tieng Viet cho cac enum nghiep vu - khop DUNG gia tri voi backend/src/lib/constants.ts
// (khong doi gia tri o day neu chua doi chieu lai CLAUDE.md).

export const HUONG_XU_LY_LABELS: Record<string, string> = {
  sua_chua: "Sửa chữa",
  doi_moi: "Đổi mới",
  tra_lai_ktv: "Trả lại KTV",
  xac_nhan_tru_no: "Xác nhận linh kiện, trừ công nợ",
  dich_vu_tinh_phi: "Dịch vụ tính phí",
  tu_choi: "Huỷ đơn bảo hành",
  chuyen_kho: "Chuyển kho",
};

export const LOAI_BAO_HANH_LABELS: Record<string, string> = {
  trong_bh: "Trong bảo hành",
  ngoai_bh: "Ngoài bảo hành (có phê duyệt)",
};

export const LOAI_DOI_TRU_LABELS: Record<string, string> = {
  doi_tra: "Đổi trả",
  tru_cong_no: "Trừ công nợ",
};

export const XU_LY_XAC_LABELS: Record<string, string> = {
  tra_doi_tac: "Trả đối tác",
  tieu_huy: "Tiêu huỷ",
  luu_kho: "Đang lưu kho",
};

export const KET_QUA_CHAN_DOAN_LABELS: Record<string, string> = {
  khong_loi: "Không lỗi",
  sua_duoc: "Sửa được",
  de_xuat_doi_moi: "Đề xuất đổi mới",
  tra_xac: "Trả xác",
};

export const HUONG_CAN_NV = ["sua_chua", "dich_vu_tinh_phi"];

// Khoa nhom "khach le" dung trong danh sach tao phieu tra (khop DUNG hang so backend KHACH_LE_KEY,
// backend/src/lib/constants.ts) - KHONG phai email that.
export const KHACH_LE_KEY = "__khach_le__";

// Tien to nhan dien "ktv_nhan" la mot Doi tac ao (chot 2026-09-08: "trả xác cho đối tác" dung
// LAI dung co che voi "khach le" o tren - phieu_tra_bh.ktv_nhan von la text tu do, khong FK -
// tu sinh 1 khoa on dinh theo ten doi tac ngay luc Admin BH tao phieu, khong can bang/man quan
// ly rieng). Sau nay neu doi tac tu dang nhap that, chi can doi ktv_nhan sang dung email ho.
export const DOI_TAC_KEY_PREFIX = "__doi_tac__:";

export function isDoiTacKey(key: string): boolean {
  return key.startsWith(DOI_TAC_KEY_PREFIX);
}

export function doiTacKeyFromName(tenDoiTac: string): string {
  const slug = tenDoiTac
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bo dau
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${DOI_TAC_KEY_PREFIX}${slug || "chua-dat-ten"}`;
}

export function doiTacNameFromKey(key: string): string {
  return key.slice(DOI_TAC_KEY_PREFIX.length).replace(/-/g, " ");
}

export const TRANG_THAI_UNIT_LABELS: Record<string, string> = {
  cho_phan_loai: "Chờ phân loại",
  admin_can_xem_lai: "Admin cần xem lại",
  cho_bo_sung_tt: "Chờ KTV bổ sung",
  cho_chan_doan: "Chờ NV chẩn đoán",
  cho_admin_xac_nhan: "Chờ Admin xác nhận",
  san_sang_gom_phieu_tra: "Sẵn sàng gộp phiếu trả",
  ket_thuc_tu_choi: "Đã huỷ",
  ket_thuc_chuyen_kho: "Đã chuyển kho",
};

export const TRANG_THAI_PHIEU_GUI_LABELS: Record<string, string> = {
  nhap: "Nháp",
  da_gui: "Đã gửi xe",
  da_tiep_nhan: "Kho đã tiếp nhận",
};

export const TRANG_THAI_PHIEU_TRA_LABELS: Record<string, string> = {
  nhap: "Nhập",
  cho_ke_toan_duyet: "Chờ Kế toán duyệt",
  da_duyet_ke_toan: "Đã duyệt — chờ Kho đóng gói/gửi",
  da_gui: "Đã gửi — chờ KTV xác nhận",
  ktv_da_nhan: "Đã hoàn tất",
  khieu_nai_van_chuyen: "Khiếu nại vận chuyển",
  gui_that_bai: "Gửi thất bại (thất lạc)",
};

export const LY_DO_BO_SUNG_OPTIONS = [
  { value: "sai_case", label: "Sai case" },
  { value: "thieu_mota", label: "Thiếu mô tả" },
  { value: "linh_kien_khong_khop", label: "Linh kiện không khớp" },
  { value: "khac", label: "Khác" },
];

const LY_DO_BO_SUNG_LABELS: Record<string, string> = Object.fromEntries(LY_DO_BO_SUNG_OPTIONS.map((o) => [o.value, o.label]));

// "<ma>: ghi chu tu do" -> "Nhan tieng Viet — ghi chu tu do" (Phat hien 4 vong ra soat UX): ban cu
// hien nguyen <ma>: prefix trong bang thong nhat Admin.
export function formatLyDoBoSung(raw: string | null | undefined): string {
  if (!raw) return "—";
  const idx = raw.indexOf(":");
  const code = (idx >= 0 ? raw.slice(0, idx) : raw).trim();
  const rest = idx >= 0 ? raw.slice(idx + 1).trim() : "";
  const label = LY_DO_BO_SUNG_LABELS[code] || code;
  return rest ? `${label} — ${rest}` : label;
}

// Hinh thuc gui hang - 1 nguon su that (truoc day mang options nam trong PhieuGuiDetailModal, cac
// bang danh sach lai hien gia tri tho `nha_xe`/`xe_noi_bo`). Phat hien 4 vong ra soat UX.
export const HINH_THUC_GUI_OPTIONS = [
  { value: "xe_noi_bo", label: "Xe nội bộ" },
  { value: "nha_xe", label: "Nhà xe / vận chuyển" },
  { value: "buu_dien", label: "Bưu điện / chuyển phát" },
  // 11/10/2026: KTV/khach tu mang hang den giao tan noi - khong co don vi van chuyen / ma van don.
  { value: "giao_truc_tiep", label: "Giao trực tiếp" },
];
export const HINH_THUC_GUI_LABELS: Record<string, string> = Object.fromEntries(HINH_THUC_GUI_OPTIONS.map((o) => [o.value, o.label]));

export const FAST_ACTION_ICONS: Record<string, string> = {
  doi_moi_fast: "🆕",
  tru_no_fast: "💳",
  sua_chua_fast: "🔧",
  bo_sung_tt: "✍️",
  tu_choi_fast: "🚫",
  bao_cao_sai: "🐞",
  huy_khong_co_hang: "📦",
  doi_moi_pd: "🆕✅",
  tru_no_pd: "💳✅",
  sua_chua_pd: "🔧✅",
};
