import { KHOANG_DEF, type FilterDef } from "../../ui/FilterBar";
import type { ColFilter, FilterCol } from "../../ui/ColumnFilter";
import { ADMIN_COLS_DEF, type AdminColKey } from "../../hooks/useAdminCols";
import { HUONG_XU_LY_LABELS, KHACH_LE_KEY, LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { displayName } from "../../hooks/useUserNames";

// 16/11/2026 ("menu Đơn BH => các tab triển khai bổ sung thêm công cụ filter dạng excel (cả loại xem Theo linh kiện hoặc
// Theo KTV)"): bang thong nhat Admin BH (tab "Chờ phân loại") loc + sap xep tren tieu de cot. Backend (locBangThongNhat +
// sortBangThongNhat trong routes/adminBH.ts) da nhan nhieu gia tri "a,b", loc chu f_*, so sl_tu/sl_den, ?sort=<khoa cot>.

export const TT_DEF: FilterDef = {
  key: "tt",
  label: "Trạng thái",
  static: [
    { value: "cho_xac_nhan_so_luong", label: "Chờ xác nhận số lượng" },
    { value: "cho_phan_loai", label: "Chờ phân loại" },
    { value: "admin_can_xem_lai", label: "NV trả lại (cần xem lại)" },
    { value: "cho_bo_sung_tt", label: "Đang chờ KTV bổ sung" },
  ],
};
const KTV_DEF: FilterDef = { key: "ktv", label: "Người gửi", fmt: (v) => (v === KHACH_LE_KEY ? "Khách lẻ (đơn dịch vụ)" : displayName(v)) };
const LK_A: FilterDef = { key: "lk", label: "LK KTV chọn (A)", kind: "lk" };
const LK_B: FilterDef = { key: "lk_nhan", label: "LK gửi về (B)", kind: "lk" };
const LK_C: FilterDef = { key: "lk_tt", label: "LK đổi mới (C)", kind: "lk" };
const HUONG: FilterDef = { key: "huong", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS, noneLabel: "(Chưa phân loại)" };
const PL: FilterDef = { key: "pl", label: "Loại LK", noneLabel: "(Chưa phân loại)" };
const CHAM: FilterDef = {
  key: "cham",
  label: "SLA",
  static: [
    { value: "dung_han", label: "🟢 Còn trong hạn" },
    { value: "qua_han", label: "🟡 Quá hạn SLA 24h" },
    { value: "nguy_hiem", label: "🔴 Quá 72h (nguy hiểm)" },
  ],
};
const MIEN: FilterDef = {
  key: "mien",
  label: "Miền",
  static: [
    { value: "MB", label: "Miền Bắc" },
    { value: "MN", label: "Miền Nam" },
    { value: "__none__", label: "Chưa khai báo" },
  ],
};
const DOITRU: FilterDef = { key: "doitru", label: "Loại đối trừ", static: Object.entries(LOAI_DOI_TRU_LABELS).map(([value, label]) => ({ value, label })) };

// Bo loc nhanh (luoi o chon, an mac dinh).
export const ADMIN_QUICK_DEFS: FilterDef[] = [TT_DEF, KTV_DEF, LK_A, LK_B, LK_C, HUONG, PL, CHAM, MIEN, { ...KHOANG_DEF, label: "Thời gian" }];

// Bo loc tieu de cot theo khoa cot (AdminColKey) + cot ID.
export const ADMIN_COL_FILTERS: Partial<Record<AdminColKey | "id", ColFilter>> = {
  id: { type: "text", key: "f_id", placeholder: "Mã đơn…" },
  trangthai: { type: "multi", def: TT_DEF },
  sla: { type: "single", def: CHAM },
  nguon: { type: "multi", def: KTV_DEF },
  mien: { type: "multi", def: MIEN },
  khachhang: { type: "text", key: "f_khach", placeholder: "Tên khách…" },
  linhkien: { type: "multi", def: LK_B },
  phanloai: { type: "multi", def: PL },
  mota: { type: "text", key: "f_mota", placeholder: "Từ trong mô tả…" },
  sdt: { type: "text", key: "f_sdt", placeholder: "SĐT…" },
  donchacode: { type: "text", key: "f_doncha", placeholder: "DH-…" },
  phieuguicode: { type: "text", key: "f_gui", placeholder: "BH-…" },
  doitru: { type: "multi", def: DOITRU },
  huongxuly: { type: "multi", def: HUONG },
};

// Moi cot loc / sap xep (chip dang loc + nut loc theo cot o che do nhom / dien thoai).
export const ADMIN_FILTER_COLS: FilterCol[] = [
  { key: "id", label: "ID", filter: ADMIN_COL_FILTERS.id, sortKey: "id" },
  ...(Object.keys(ADMIN_COLS_DEF) as AdminColKey[]).map((k) => ({ key: k, label: ADMIN_COLS_DEF[k].label, filter: ADMIN_COL_FILTERS[k], sortKey: k })),
  { key: "lk_a", label: "LK KTV chọn (A)", filter: { type: "multi", def: LK_A } },
  { key: "lk_c", label: "LK đổi mới (C)", filter: { type: "multi", def: LK_C } },
  { key: "sl", label: "SL khai", filter: { type: "number", key: "sl" }, sortKey: "sl" },
  { key: "ngaytao", label: "Thời gian tạo", filter: { type: "date", key: "khoang" }, sortKey: "ngaytao" },
];

export const ADMIN_FILTER_KEYS = ["tt", "ktv", "lk", "lk_nhan", "lk_tt", "pl", "cham", "mien", "huong", "khoang", "doitru", "f_id", "f_case", "f_mota", "f_khach", "f_sdt", "f_doncha", "f_gui", "sl_tu", "sl_den"];
