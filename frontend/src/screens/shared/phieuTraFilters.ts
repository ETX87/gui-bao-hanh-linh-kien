import type { FilterDef } from "../../ui/FilterBar";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, KHACH_LE_KEY, isDoiTacKey, doiTacNameFromKey } from "../../lib/constants";
import { displayName } from "../../hooks/useUserNames";

// Bo loc dung chung cho cac danh sach phieu tra (21/10/2026).
const nhanLabel = (v: string) => (v === KHACH_LE_KEY ? "Khách lẻ" : isDoiTacKey(v) ? `Đối tác: ${doiTacNameFromKey(v)}` : displayName(v));

export function phieuTraDefs(opts: { nguoiNhan?: boolean; trangThai?: boolean } = {}): FilterDef[] {
  const d: FilterDef[] = [];
  if (opts.trangThai) d.push({ key: "trang_thai", label: "Trạng thái", kind: "map", labels: TRANG_THAI_PHIEU_TRA_LABELS });
  if (opts.nguoiNhan !== false) d.push({ key: "ktv", label: "Người nhận", fmt: nhanLabel });
  d.push(
    { key: "loai_doi_tru", label: "Đối trừ", static: Object.entries(LOAI_DOI_TRU_LABELS).map(([value, label]) => ({ value, label })) },
    { key: "nguoi_tao", label: "Người tạo phiếu", kind: "person" },
    { key: "nv", label: "NV sửa chữa", kind: "person" },
    { key: "mien", label: "Miền", static: [{ value: "MB", label: "Miền Bắc" }, { value: "MN", label: "Miền Nam" }, { value: "none", label: "Chưa khai báo" }] },
  );
  return d;
}
