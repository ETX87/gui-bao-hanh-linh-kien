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

// Huong xu ly BAT BUOC gan 1 NV cu the (sua_chua/dich_vu_tinh_phi) - don vi chuyen sang cho_chan_doan.
export const HUONG_CAN_NV: readonly HuongXuLy[] = ["sua_chua", "dich_vu_tinh_phi"];

// Huong xu ly di THANG toi san_sang_gom_phieu_tra (khong qua NV chan doan) - tu tao/gop phieu tra.
export const HUONG_TAO_PHIEU_TRA: readonly HuongXuLy[] = ["doi_moi", "tra_lai_ktv", "xac_nhan_tru_no"];

// Ma dinh danh "khach le" dung lam khoa nhom trong danh sach tao phieu tra (KHONG phai email that).
export const KHACH_LE_KEY = "__khach_le__";
