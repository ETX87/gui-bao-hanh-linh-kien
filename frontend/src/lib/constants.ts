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
  // 4 ket qua moi cua NV (12/10/2026) - cot ket_qua_nv.
  da_sua_xong: "Đã sửa xong",
  khong_sua_duoc: "Không sửa được",
  kiem_tra_tu_van: "Chỉ kiểm tra, tư vấn",
};

// Lua chon NV nop ket qua (12/10/2026): "Da sua xong, khong sua duoc, khong co loi, chi kiem tra tu van".
export const KET_QUA_NV_OPTIONS: { value: string; label: string }[] = [
  { value: "da_sua_xong", label: "Đã sửa xong" },
  { value: "khong_sua_duoc", label: "Không sửa được" },
  { value: "khong_loi", label: "Không có lỗi" },
  { value: "kiem_tra_tu_van", label: "Chỉ kiểm tra, tư vấn" },
];

// Ket qua hien thi: uu tien ket_qua_nv (moi), roi cot cu ket_qua_chan_doan.
export function ketQuaLabel(u: { ket_qua_nv?: string | null; ket_qua_chan_doan?: string | null }): string | null {
  const v = u.ket_qua_nv || u.ket_qua_chan_doan;
  return v ? KET_QUA_CHAN_DOAN_LABELS[v] || v : null;
}

// De xuat linh kien (12/10/2026).
export const DE_XUAT_TT_LABELS: Record<string, string> = { cho_cap: "Chờ Admin cấp", cho_ke_toan: "Chờ KT xác nhận", da_cap: "Đã cấp", tu_choi: "Từ chối", huy: "Đã huỷ" };

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

// 20/10/2026: "giai doan" cua 1 don trong TOAN luong (man Tra cuu / Tong quan) - gom ca don cha chua
// tach (thung) va trang thai phieu tra cua don vi da vao phieu. Thu tu = thu tu quy trinh.
export const GIAI_DOAN: { key: string; label: string; tone: "gray" | "blue" | "amber" | "orange" | "violet" | "green" | "red"; icon: string }[] = [
  { key: "thung_nhap", label: "Thùng nháp — KTV chưa gửi", tone: "gray", icon: "📝" },
  { key: "thung_dang_gui", label: "Đang gửi về Kho", tone: "blue", icon: "🚚" },
  { key: "thung_cho_admin_nhan", label: "Kho đã nhận — chờ Admin nhận", tone: "amber", icon: "📥" },
  { key: "cho_xac_nhan_so_luong", label: "Chờ xác nhận SL", tone: "amber", icon: "🔢" },
  { key: "cho_phan_loai", label: "Chờ phân loại", tone: "amber", icon: "🗂️" },
  { key: "admin_can_xem_lai", label: "Admin cần xem lại", tone: "orange", icon: "🔁" },
  { key: "cho_bo_sung_tt", label: "Chờ KTV bổ sung", tone: "violet", icon: "✍️" },
  { key: "cho_chan_doan", label: "Đang sửa chữa (NV)", tone: "blue", icon: "🔧" },
  { key: "cho_admin_xac_nhan", label: "Chờ Admin xác nhận", tone: "amber", icon: "✔️" },
  { key: "san_sang_gom_phieu_tra", label: "Chờ tạo phiếu trả", tone: "amber", icon: "↩️" },
  { key: "tra_nhap", label: "Phiếu trả nháp (Admin)", tone: "amber", icon: "📄" },
  { key: "tra_cho_ke_toan_duyet", label: "Chờ Kế toán duyệt", tone: "violet", icon: "💰" },
  { key: "tra_da_duyet_ke_toan", label: "Chờ Kho đóng gói / gửi", tone: "blue", icon: "📤" },
  { key: "tra_da_gui", label: "Đang gửi trả KTV", tone: "blue", icon: "🚚" },
  { key: "tra_khieu_nai_van_chuyen", label: "KTV báo không nhận được", tone: "red", icon: "⚠️" },
  { key: "tra_ktv_da_nhan", label: "Hoàn tất (KTV đã nhận)", tone: "green", icon: "✅" },
  { key: "tra_gui_that_bai", label: "Gửi thất bại (thất lạc)", tone: "red", icon: "❌" },
  { key: "tra_ket_thuc_khong_gui", label: "Kết thúc, không gửi", tone: "gray", icon: "⏹️" },
  { key: "ket_thuc_tu_choi", label: "Đã huỷ", tone: "gray", icon: "⛔" },
  { key: "ket_thuc_chuyen_kho", label: "Đã chuyển kho", tone: "gray", icon: "🏬" },
];
export const GIAI_DOAN_MAP: Record<string, (typeof GIAI_DOAN)[number]> = Object.fromEntries(GIAI_DOAN.map((g) => [g.key, g]));

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
