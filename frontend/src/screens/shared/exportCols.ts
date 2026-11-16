import type { ExportCol } from "../../ui/ExcelExport";
import type { DonVi, DeXuatLk } from "../../lib/types";
import { displayName } from "../../hooks/useUserNames";
import { fmtDate } from "../../lib/format";
import {
  HUONG_XU_LY_LABELS,
  LOAI_BAO_HANH_LABELS,
  LOAI_DOI_TRU_LABELS,
  XU_LY_XAC_LABELS,
  TRANG_THAI_UNIT_LABELS,
  DE_XUAT_TT_LABELS,
  ketQuaLabel,
} from "../../lib/constants";

// 16/11/2026: cot file Excel "tải theo bộ lọc" dung chung cho cac danh sach don vi bao hanh / de xuat cap linh kien.
type NameOf = (ma: string | null | undefined) => string;
const lab = (m: Record<string, string>, v: string | null | undefined) => (v ? m[v] || v : "");
const mien = (v: string | null | undefined) => (v === "MB" ? "Miền Bắc" : v === "MN" ? "Miền Nam" : "Chưa khai báo");
const nguoi = (v: string | null | undefined) => (v ? displayName(v) : "");

export type DonViX = DonVi & { ktv?: string | null; mien?: string | null; case_khach_hang?: string | null; case_serial?: string | null; so_luong_khai?: number | null; so_luong_thuc_nhan?: number | null };

export function donViExportCols(nameOf: NameOf): ExportCol<DonViX>[] {
  return [
    { header: "ID đơn vị", value: (r) => r.id, width: 16 },
    { header: "Đơn cha", value: (r) => r.parent_id, width: 14 },
    { header: "Trạng thái", value: (r) => lab(TRANG_THAI_UNIT_LABELS, r.trang_thai), width: 24 },
    { header: "Thùng", value: (r) => r.phieu_gui_id, width: 12 },
    { header: "Miền", value: (r) => mien(r.mien), width: 12 },
    { header: "KTV / Nguồn", value: (r) => (r.ktv ? displayName(r.ktv) : r.ten_khach_hang ? `Khách lẻ · ${r.ten_khach_hang}` : "Khách lẻ"), width: 30 },
    { header: "Mã case", value: (r) => r.case_id, width: 16 },
    { header: "Khách hàng", value: (r) => r.case_khach_hang || r.ten_khach_hang, width: 24 },
    { header: "Serial", value: (r) => r.case_serial, width: 16 },
    { header: "LK KTV chọn (A)", value: (r) => (r.ma_lk ? nameOf(r.ma_lk) : ""), width: 30 },
    { header: "LK gửi về (B)", value: (r) => nameOf(r.ma_lk_nhan || r.ma_lk), width: 30 },
    { header: "LK đổi mới (C)", value: (r) => nameOf(r.ma_lk_thuc_te || r.ma_lk_nhan || r.ma_lk), width: 30 },
    { header: "SL khai", value: (r) => r.so_luong_khai, width: 8 },
    { header: "SL thực nhận", value: (r) => r.so_luong_thuc_nhan, width: 8 },
    { header: "Mô tả lỗi", value: (r) => r.mo_ta_loi, width: 40 },
    { header: "Loại BH", value: (r) => lab(LOAI_BAO_HANH_LABELS, r.loai_bao_hanh), width: 14 },
    { header: "Hướng xử lý", value: (r) => lab(HUONG_XU_LY_LABELS, r.huong_xu_ly), width: 18 },
    { header: "Loại đối trừ", value: (r) => lab(LOAI_DOI_TRU_LABELS, r.loai_doi_tru), width: 14 },
    { header: "Xử lý xác", value: (r) => lab(XU_LY_XAC_LABELS, r.xu_ly_xac), width: 14 },
    { header: "NV sửa chữa", value: (r) => nguoi(r.nguoi_sua_chua), width: 24 },
    { header: "Kết quả NV", value: (r) => ketQuaLabel(r), width: 18 },
    { header: "Ghi chú NV", value: (r) => r.ghi_chu_nv, width: 30 },
    { header: "Lý do huỷ", value: (r) => r.ly_do_tu_choi, width: 24 },
    { header: "Phiếu trả", value: (r) => r.phieu_tra_id, width: 12 },
    { header: "Tạo lúc", value: (r) => fmtDate(r.created_at), width: 16 },
    { header: "Cập nhật", value: (r) => fmtDate(r.updated_at), width: 16 },
  ];
}

export type DeXuatX = DeXuatLk & { ktv?: string | null; case_id?: string | null; nguoi_sua_chua?: string | null; mien?: string | null; mo_ta_loi?: string | null };
const KHO_LABEL: Record<string, string> = { cho_in: "Chờ Kho in phiếu", da_in: "Kho đã in phiếu", da_xuat: "Kho đã xuất" };

export function deXuatExportCols(nameOf: NameOf): ExportCol<DeXuatX>[] {
  return [
    { header: "Mã đề xuất", value: (r) => r.id, width: 14 },
    { header: "Đơn vị bảo hành", value: (r) => r.unit_id, width: 16 },
    { header: "Trạng thái", value: (r) => (r.trang_thai === "lien_ket" ? r.lk_nhan || DE_XUAT_TT_LABELS.lien_ket : lab(DE_XUAT_TT_LABELS, r.trang_thai)), width: 24 },
    { header: "Giai đoạn Kho", value: (r) => lab(KHO_LABEL, r.kho_tt), width: 16 },
    { header: "Mã LK", value: (r) => r.ma_lk, width: 14 },
    { header: "Tên linh kiện", value: (r) => nameOf(r.ma_lk), width: 34 },
    { header: "SL", value: (r) => r.so_luong, width: 6 },
    { header: "Mã case", value: (r) => r.case_id, width: 16 },
    { header: "KTV", value: (r) => nguoi(r.ktv), width: 28 },
    { header: "NV sửa chữa", value: (r) => nguoi(r.nguoi_sua_chua), width: 24 },
    { header: "Người đề xuất", value: (r) => nguoi(r.nguoi_de_xuat), width: 24 },
    { header: "Mã đơn hàng", value: (r) => r.ma_don_hang, width: 14 },
    { header: "Mã PXK / MISA", value: (r) => r.ma_misa || r.lk_pxk, width: 16 },
    { header: "Đơn Đặt LK", value: (r) => r.lk_ddh_id, width: 14 },
    { header: "Miền", value: (r) => mien(r.mien), width: 12 },
    { header: "Ghi chú", value: (r) => r.ghi_chu, width: 30 },
    { header: "Lý do từ chối", value: (r) => r.ly_do_tu_choi, width: 24 },
    { header: "Tạo lúc", value: (r) => fmtDate(r.created_at), width: 16 },
    { header: "KT xác nhận", value: (r) => (r.kt_luc ? `${fmtDate(r.kt_luc)} · ${nguoi(r.kt_boi)}` : ""), width: 26 },
    { header: "Kho xuất", value: (r) => (r.kho_xuat_luc ? `${fmtDate(r.kho_xuat_luc)} · ${nguoi(r.kho_xuat_boi)}` : ""), width: 26 },
  ];
}
