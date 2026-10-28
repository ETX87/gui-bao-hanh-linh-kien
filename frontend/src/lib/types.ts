// Kieu du lieu dung chung frontend - khop DUNG ten cot voi migrations/0001_init.sql (khong doan lai).

export type LogEntityType = "phieu_gui" | "phieu_sc" | "phieu_sc_ct" | "phieu_tra";

export interface AppUser {
  email: string;
  ten: string | null;
  bi_khoa: boolean;
  trang_thai_duyet: "Cho duyet" | "Da duyet" | "Tu choi";
  la_ktv_dvbh: boolean;
  la_ve_tinh: boolean;
  la_kho: boolean;
  la_admin_bh: boolean;
  la_nv_sua_chua: boolean;
  la_ke_toan: boolean;
  la_giam_sat: boolean;
  la_view: boolean;
  la_qtri: boolean;
  // 11/10/2026: mien phu trach cua nguoi xu ly - MB / MN / ALL (ca 2) / null (chua gan = thay tat ca).
  mien?: "MB" | "MN" | "ALL" | null;
  // 16/10/2026: trang thai tren ETX nhan su (chi tra o GET /users) - 'on' dang lam / 'off' da nghi / null khong co tren ETX.
  etx_trang_thai?: "on" | "off" | null;
  khoa_boi_etx?: number;
}

// Mien cua don: MB / MN / null = "Khu vuc chua khai bao".
export type Mien = "MB" | "MN";

export interface PhieuGui {
  id: string;
  nguoi_tao: string;
  // Email GS/Admin BH THAT SU bam tao (yeu cau 05/09/2026 "tạo hộ") - null neu chinh KTV (nguoi_tao)
  // tu tao lay.
  nguoi_tao_ho: string | null;
  ngay_tao: string;
  ngay_gui_xe: string | null;
  hinh_thuc_gui: string | null;
  ma_xe_hoac_tai_xe: string | null;
  don_vi_van_chuyen: string | null;
  ma_van_don: string | null;
  trang_thai: "nhap" | "da_gui" | "da_tiep_nhan";
  su_co_tiep_nhan: boolean;
  su_co_ly_do: string | null;
  su_co_ghi_chu: string | null;
  nguoi_nhan_kho: string | null;
  thoi_gian_nhan_kho: string | null;
  admin_tiep_nhan: boolean;
  admin_nguoi_nhan: string | null;
  admin_thoi_gian_nhan: string | null;
  mien?: Mien | null;
  created_at: string;
  updated_at: string;
  so_don?: number; // GET /admin/phieu-gui (12/10/2026)
}

export interface GhiChuLog {
  id: number;
  phieu_gui_id: string;
  tac_gia: string;
  thoi_gian: string;
  noi_dung: string;
}

export interface DonCha {
  id: string;
  phieu_gui_id: string | null;
  case_id: string | null;
  ma_lk: string | null;
  mo_ta_loi: string | null;
  so_luong_khai: number;
  odoo_id?: number | null;
  so_luong_thuc_nhan: number | null;
  ly_do_chenh_lech_sl: string | null;
  loai_doi_tru_de_xuat: "doi_tra" | "tru_cong_no" | null;
  nguon_tao: "ktv" | "admin_dich_vu";
  ten_khach_hang: string | null;
  sdt_khach_hang: string | null;
  dia_chi_khach_hang: string | null;
  san_pham_bh: string | null;
  trang_thai_cha: "cho_xac_nhan_so_luong" | "da_tach";
  email_gs: string | null;
  xac_nhan_khac_ktv?: string | null; // 05/10/2026 muc 9: email nguoi xac nhan tao don du case thuoc KTV khac
  ktv_tren_case?: string | null;
  mien?: Mien | null;
  created_at: string;
  // Cot join them (tu GET /admin/don-cha) - email KTV tao phieu gui chua don nay (null neu don dich
  // vu khach le, khong thuoc phieu gui nao).
  ktv?: string | null;
  // Lay tu "bang chung case" da luu (case_lookup_snapshot) - 12/10/2026 de xuat #13/#14 ra soat Admin BH.
  case_khach_hang?: string | null;
  case_ngay_mua?: string | null;
  case_tiep_nhan?: string | null;
}

export interface DonVi {
  id: string;
  parent_id: string;
  so_thu_tu: number;
  ma_lk_thuc_te: string | null; // C - linh kien doi moi / thay the (NULL = giong B)
  ma_lk_nhan?: string | null; // B - linh kien thuc te gui ve (NULL = giong A = ma_lk don cha)
  loai_bao_hanh: string | null;
  thong_tin_mail_pd: string | null;
  ma_phe_duyet: string | null;
  huong_xu_ly: string | null;
  loai_doi_tru: string | null;
  nguoi_sua_chua: string | null;
  ly_do_tu_choi: string | null;
  xu_ly_xac: string | null;
  ket_qua_chan_doan: string | null;
  ket_qua_nv?: string | null; // 12/10/2026: da_sua_xong | khong_sua_duoc | khong_loi | kiem_tra_tu_van
  ghi_chu_nv?: string | null; // 21/10/2026: ghi chu NV khi nop ket qua
  so_dx_cho_cap?: number; // GET /nv/viec-cua-toi
  so_dx_da_cap?: number;
  admin_xac_nhan_hoan_tat: boolean;
  phieu_tra_id: string | null;
  trang_thai: string;
  so_lan_yeu_cau_lam_lai: number;
  ly_do_bo_sung: string | null;
  updated_at: string;
  created_at: string;
  // Cac cot join them (tu GET /admin/don-vi, GET /phieu-gui/don-vi/tra-cuu, GET /tra-cuu/don-vi)
  case_id?: string | null;
  ma_lk?: string | null;
  mo_ta_loi?: string | null;
  phieu_gui_id?: string | null;
  nguon_tao?: string;
  ten_khach_hang?: string | null;
  sdt_khach_hang?: string | null;
  san_pham_bh?: string | null;
  loai_doi_tru_de_xuat?: string | null;
  ktv?: string | null;
  ngay_gui_xe?: string | null;
  mien?: Mien | null;
  // Lay tu "bang chung case" da luu (case_lookup_snapshot) - 12/10/2026 de xuat #13/#14 ra soat Admin BH.
  case_khach_hang?: string | null;
  case_ngay_mua?: string | null;
  case_tiep_nhan?: string | null;
  // Thu hoi chi phi bao hanh tu hang (12/10/2026) - ghi nhan thu cong, khong bat buoc.
  so_tien_thu_hoi_hang?: number | null;
  thu_hoi_hang_ghi_chu?: string | null;
  thu_hoi_hang_boi?: string | null;
  thu_hoi_hang_luc?: string | null;
}

// De xuat linh kien sua chua (12/10/2026) - don con cua 1 don vi bao hanh.
export interface DeXuatLk {
  id: string;
  unit_id: string;
  ma_lk: string;
  so_luong: number;
  ghi_chu: string | null;
  trang_thai: "cho_cap" | "da_cap" | "tu_choi" | "huy";
  nguoi_de_xuat: string;
  created_at: string;
  ma_misa: string | null;
  ma_don_hang: string | null;
  ly_do_tu_choi: string | null;
  nguoi_xu_ly: string | null;
  xu_ly_luc: string | null;
  updated_at: string;
  // join them o GET /de-xuat
  unit_trang_thai?: string;
  ma_lk_thuc_te?: string | null;
  ma_lk_nhan?: string | null;
  unit_ma_lk?: string | null;
  mo_ta_loi?: string | null;
  case_id?: string | null;
  mien?: Mien | null;
  ktv?: string | null;
}

export interface PhieuTra {
  id: string;
  so_don?: number; // GET /phieu-tra (12/10/2026): so don vi trong phieu
  ktv_nhan: string;
  nguoi_tao: string;
  trang_thai: string;
  loai_doi_tru: "doi_tra" | "tru_cong_no";
  ma_don_hang: string | null;
  ma_misa: string | null;
  ma_van_don: string | null;
  ly_do_tu_choi_kt: string | null;
  danh_gia_ktv: string | null;
  khong_nhan_duoc_ghi_chu: string | null;
  // Kho danh gia khieu nai "khong nhan duoc hang" (12/10/2026).
  kq_khieu_nai?: "thanh_cong" | "that_bai" | null;
  kq_khieu_nai_ghi_chu?: string | null;
  kq_khieu_nai_boi?: string | null;
  kq_khieu_nai_luc?: string | null;
  mien?: Mien | null;
  // Kho / Ke toan day nguoc phieu da duyet ve Admin BH (19/10/2026).
  ly_do_day_nguoc?: string | null;
  day_nguoc_boi?: string | null;
  day_nguoc_vai_tro?: "kho" | "ke_toan" | null;
  day_nguoc_luc?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogRow {
  id: number;
  entity_type: LogEntityType;
  entity_id: string;
  tu_trang_thai: string | null;
  den_trang_thai: string | null;
  nguoi_thuc_hien: string;
  thoi_gian: string;
  ghi_chu: string | null;
}

export interface LinhKien {
  ma_lk: string;
  ten_lk: string;
  don_vi: string | null;
  ghi_chu: string | null;
  anh_demo: string | null;
  so_thang_bao_hanh: number | null;
  loai_hang: string | null;
  nguon_du_lieu: "dong_bo" | "noi_bo";
  duoc_dung_bao_hanh: boolean;
  ngay_cap_nhat: string;
  top_hang?: number | null; // hang top xu ly thanh cong 30 ngay (05/10/2026 muc 7)
  top_so_luong?: number | null;
  don_vi_cho_day?: number; // 1 = Phan loai sua tay chua day duoc sang linh-kien-app (2026-10-11)
}

export interface SettingItem {
  id: number;
  noi_dung: string;
  bat_tat: boolean;
  stt: number;
}

// Preview 1 case tra ve tu GET /api/case-lookup?id=... (proxy sang he DVBH goc, CHI DOC) - khop DUNG
// 29 field cua CaseLookupPreview ben backend/src/lib/caseLookupClient.ts (doc truc tiep contract that
// cua partnerApi.ts truoc khi viet, khong doan).
export interface CaseLookupPreview {
  ky_thuat_vien: string | null;
  khach_hang: string | null;
  seri_san_pham: string | null;
  khu_vuc: string | null;
  tinh: string | null;
  quan_huyen: string | null;
  hang: string | null;
  san_pham_bao_hanh: string | null;
  tien_do_hoan_thanh: string | null;
  mo_ta_loi: string | null;
  nhom_san_pham: string | null;
  nhom_yeu_cau: string | null;
  loai_yeu_cau: string | null;
  hinh_thuc_bao_hanh: string | null;
  ngay_mua: string | null;
  thoi_gian_cskh_tiep_nhan: string | null;
  thoi_gian_hen_xu_ly: string | null;
  thoi_gian_hoan_thanh: string | null;
  doi_tac: string | null;
  link_crm: string | null;
  noi_dung_xu_ly: string | null;
  luu_y_loi_linh_kien: string | null;
  cach_thuc_xu_ly: string | null;
  nganh: string | null;
  loai_nganh: string | null;
  nhom_kh: string | null;
  dt_san_pham: number | null;
  dt_linh_kien: number | null;
  dt_dich_vu: number | null;
  ly_do_qua_han: string | null;
}

// Danh ba KTV/CTV/Tram/Ve tinh (ktv_lien_he_bh) - dung de auth.ts (backend) tu dong duyet tai khoan
// khi email_dang_nhap khop luc dang nhap lan dau, va tinh email_gs (Giam sat phu trach) qua
// khu_vuc_ma. HYBRID dong bo (tu linh-kien-app, khi co che day trien khai xong) + noi_bo (qtri tu
// khai bao qua man #/qtri/ktv, xem CLAUDE.md).
export interface KtvLienHe {
  ma_ktv: string;
  ten_hien_thi: string | null;
  sdt: string | null;
  gmail: string | null;
  email_dang_nhap: string | null;
  vai_tro_ktv: "KTV" | "CTV" | "Tram" | "Ve tinh" | null;
  khu_vuc_ma: string | null;
  ktv_cap1_phu_trach: string | null;
  nguon_du_lieu: "dong_bo" | "noi_bo";
  dong_bo_luc: string;
  mien_gan?: Mien | null; // 11/10/2026: mien gan tam (uu tien hon mien suy tu khu_vuc_ma)
}

// Khu vuc "quan sat duoc" tu ktv_lien_he_bh.khu_vuc_ma (GROUP BY, xem routes/khuVuc.ts) - ten/
// gs_email co the null neu Khu vuc nay CHUA tung co dong khu_vuc_bh tuong ung (chua duoc qtri gan GS
// hoac chua dong bo tu linh-kien-app).
export interface KhuVucQuanSat {
  ma: string;
  so_ktv: number;
  ten: string | null;
  gs_email: string | null;
}

export interface FastActionMeta {
  key: string;
  label: string;
  huong?: string;
  loaiBH?: string;
  loaiDoiTru?: string;
  lyDoTuChoi?: string;
  special?: "bo_sung_tt" | "bao_cao_sai";
}

// Don bao hanh tao tren Odoo, keo ve qua dvbh (GET /api/odoo-don/cho-gui).
export interface OdooDon {
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  ma_linh_kien: string | null;
  ten_linh_kien: string | null;
  so_luong: number | null;
  trang_thai: string | null;
  tinh_trang_loi: string | null;
  ghi_chu: string | null;
  ngay_tao: string | null;
  khong_gui_boi?: string | null;
  khong_gui_luc?: string | null;
  khong_gui_ly_do?: string | null;
}
