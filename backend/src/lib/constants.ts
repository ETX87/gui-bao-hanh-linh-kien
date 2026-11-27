// Hang so nghiep vu da chot qua nhieu vong CLAUDE.md - port dung tu prototype-html/index.html
// (HUONG_CAN_NV, HUONG_TAO_PHIEU_TRA, cac gia tri enum huong_xu_ly/loai_bao_hanh/loai_doi_tru...).
// KHONG doi gia tri o day neu chua doi chieu lai CLAUDE.md - day la nguon that duy nhat cho danh
// sach enum, dung o ca validate backend lan (sau nay) UI frontend.

export const HUONG_XU_LY_VALUES = ["sua_chua", "doi_moi", "tra_lai_ktv", "xac_nhan_tru_no", "dich_vu_tinh_phi", "tu_choi", "chuyen_kho"] as const;
export type HuongXuLy = (typeof HUONG_XU_LY_VALUES)[number];

export const LOAI_BAO_HANH_VALUES = ["trong_bh", "ngoai_bh"] as const;
export type LoaiBaoHanh = (typeof LOAI_BAO_HANH_VALUES)[number];

export const LOAI_DOI_TRU_VALUES = ["doi_tra", "tru_cong_no"] as const;
export type LoaiDoiTru = (typeof LOAI_DOI_TRU_VALUES)[number];

export const XU_LY_XAC_VALUES = ["tra_doi_tac", "tieu_huy", "luu_kho"] as const;
export type XuLyXac = (typeof XU_LY_XAC_VALUES)[number];

export const KET_QUA_CHAN_DOAN_VALUES = ["khong_loi", "sua_duoc", "de_xuat_doi_moi", "tra_xac"] as const;
export type KetQuaChanDoan = (typeof KET_QUA_CHAN_DOAN_VALUES)[number];

// Ket qua cuoi cua NV sua chua (12/10/2026): "Da sua xong, khong sua duoc, khong co loi, chi kiem tra tu
// van". Luu o cot moi phieu_sua_chua_bh_ct.ket_qua_nv (cot cu ket_qua_chan_doan giu cho du lieu cu).
export const KET_QUA_NV_VALUES = ["da_sua_xong", "khong_sua_duoc", "khong_loi", "kiem_tra_tu_van"] as const;
export type KetQuaNv = (typeof KET_QUA_NV_VALUES)[number];
// Ghi kem vao cot cu (neu tuong duong) de bao cao cu van dung.
export const KET_QUA_NV_TO_CU: Partial<Record<KetQuaNv, KetQuaChanDoan>> = { da_sua_xong: "sua_duoc", khong_loi: "khong_loi" };

// Huong xu ly BAT BUOC gan 1 NV cu the (sua_chua/dich_vu_tinh_phi) - don vi chuyen sang cho_chan_doan.
export const HUONG_CAN_NV: readonly HuongXuLy[] = ["sua_chua", "dich_vu_tinh_phi"];

// Huong xu ly di THANG toi san_sang_gom_phieu_tra (khong qua NV chan doan) - tu tao/gop phieu tra.
export const HUONG_TAO_PHIEU_TRA: readonly HuongXuLy[] = ["doi_moi", "tra_lai_ktv", "xac_nhan_tru_no"];

// 27/11/2026 (v1.166): huong co XAC linh kien loi o kho -> BAT BUOC chon xu ly xac (tra doi tac / tieu huy / luu kho), xac "Tra doi tac"
// vao Quan ly xac. Nguyen van: "trừ công nợ là trừ công nợ của kTV, còn xác thì vẫn có, vẫn phải xác định có trả đối tác hay không".
export const HUONG_CO_XAC: readonly HuongXuLy[] = ["doi_moi", "xac_nhan_tru_no"];
export const coXac = (h: string | null | undefined): boolean => !!h && (HUONG_CO_XAC as readonly string[]).includes(h);
export const HUONG_CO_XAC_SQL = HUONG_CO_XAC.map((h) => `'${h}'`).join(",");

// Ma dinh danh "khach le" dung lam khoa nhom trong danh sach tao phieu tra (KHONG phai email that).
export const KHACH_LE_KEY = "__khach_le__";

// Nhan tieng Viet co dau cho cac gia tri enum - dung khi ghi nhat ky (logs_bh) de UI chi tiet hien
// cau doc duoc thay vi ma tho (09/10/2026, "co van de gi phat hien thi xu ly luon").
export const LBL: Record<string, string> = {
  trong_bh: "Trong bảo hành", ngoai_bh: "Ngoài bảo hành",
  sua_chua: "Sửa chữa", doi_moi: "Đổi mới", tra_lai_ktv: "Trả lại KTV", xac_nhan_tru_no: "Xác nhận trừ công nợ",
  dich_vu_tinh_phi: "Dịch vụ tính phí", tu_choi: "Huỷ đơn bảo hành", chuyen_kho: "Chuyển kho",
  doi_tra: "Đổi trả", tru_cong_no: "Trừ công nợ",
  tra_doi_tac: "Trả xác cho đối tác", tieu_huy: "Tiêu huỷ", luu_kho: "Đang lưu kho",
  khong_loi: "Không lỗi", sua_duoc: "Sửa được", de_xuat_doi_moi: "Đề xuất đổi mới", tra_xac: "Trả xác",
  da_sua_xong: "Đã sửa xong", khong_sua_duoc: "Không sửa được", kiem_tra_tu_van: "Chỉ kiểm tra, tư vấn",
  sai_case: "Sai case", thieu_mota: "Thiếu mô tả", linh_kien_khong_khop: "Linh kiện không khớp", khac: "Khác",
};
