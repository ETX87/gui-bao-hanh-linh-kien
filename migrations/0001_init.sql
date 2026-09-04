-- Schema TONG HOP 1 lan cho he doc lap "Sua chua bao hanh" (Worker "suachua") - dung mau
-- "linh-kien-app/migrations/0001_init.sql" da lam: viet THANG hinh dang CUOI CUNG cua tung bang theo
-- dung field da chot qua toan bo cac vong CLAUDE.md (khong replay tung buoc thiet ke nho da doi qua
-- cac vong prototype). Doi chieu tung field voi chinh cac ham JS tao du lieu trong prototype-html/
-- index.html (createPhieuGui/submitAddDon/submitSoLuongThucNhan/applyPhanLoai/createPhieuTraForUnits/
-- addLog...) de dam bao khop 100%, khong doan.
--
-- Khac biet CO CHU DICH so voi prototype (da chot trong CLAUDE.md + file phan tich Cloudflare):
--   - KHONG con cot "mien" (2 gia tri Nam/Bac don gian) - thay bang Khu vuc dong bo tu linh-kien-app.
--   - KHONG co bang case_dvbh/cases noi bo - tra cuu qua case-lookup API sang dvbh (Giai doan 5).
--   - Cac mang long trong object JS (ghi_chu_log[], anh_truoc[]/anh_sau[]/anh_loi_thuc_te[],
--     bao_cao_sai_thong_tin[], anh_bien_ban[]) tach thanh bang con - D1/SQL khong luu mang JSON linh
--     dong nhu object JS duoc.
--   - de_xuat_linh_kien_bh/phieu_tra_xac_bh (nhac trong tai lieu #4/#5 som hon) CHUA duoc tao o day -
--     prototype vong 1 (21/08/2026) da xac nhan CHUA trien khai 2 tinh nang nay ("Chua co: phieu tra
--     xac, ticket de xuat vat tu sua chua bulk-action, dashboard...") - se them khi thuc su lam tinh
--     nang do, tranh bay schema truoc khi biet chac field can gi.

-- ---------- Bo dem sinh ID tuan tu (BH-000001/DH-000001/TR-000001, khop dung prefix cua ham
-- nextId() trong prototype) - dung mau id_counters cua dvbh/linh-kien-app (UPDATE...RETURNING de
-- tang atomic, khong phai SELECT COUNT(*) doc lai toan bang moi lan sinh 1 ID). ----------

CREATE TABLE id_counters (
    ten_bang          TEXT PRIMARY KEY,
    gia_tri_hien_tai  INTEGER NOT NULL DEFAULT 0
);
INSERT INTO id_counters (ten_bang, gia_tri_hien_tai) VALUES
    ('phieu_gui_bh', 0), ('phieu_sua_chua_bh', 0), ('phieu_tra_bh', 0);

-- ---------- Tai khoan he thong (Worker "suachua" - Auth doc lap, KHONG dung chung OAuth/session voi
-- dvbh/linhkien) ----------

CREATE TABLE users (
    email             TEXT PRIMARY KEY,
    ten               TEXT,
    bi_khoa           INTEGER NOT NULL DEFAULT 0,
    trang_thai_duyet  TEXT NOT NULL DEFAULT 'Cho duyet' CHECK (trang_thai_duyet IN ('Cho duyet', 'Da duyet', 'Tu choi')),
    -- Co vai tro nghiep vu - khop dung 7 vai tro da chot (KTV/Kho/Admin BH/NV sua chua/Ke toan/Giam
    -- sat/View) + Admin he thong (qtri). la_ktv_dvbh/la_ve_tinh dat ten GIONG linh-kien-app (khong
    -- phai trung nghia "dvbh" - chi la quy uoc dat ten cho de doi chieu voi ktv_lien_he_bh.vai_tro_ktv
    -- dong bo ve, xem duoi).
    la_ktv_dvbh       INTEGER NOT NULL DEFAULT 0,
    la_ve_tinh        INTEGER NOT NULL DEFAULT 0,
    la_kho            INTEGER NOT NULL DEFAULT 0,
    la_admin_bh       INTEGER NOT NULL DEFAULT 0,
    la_nv_sua_chua    INTEGER NOT NULL DEFAULT 0,
    la_ke_toan        INTEGER NOT NULL DEFAULT 0,
    -- MOI (chot 03/09/2026: "GS va View lam theo huong cua linh-kien-app") - Giam sat chi theo doi
    -- (khong duyet), scope qua phieu_sua_chua_bh.email_gs dong goi san (xem duoi).
    la_giam_sat       INTEGER NOT NULL DEFAULT 0,
    -- Doi ten tu "quanly" cua prototype - gio gioi han theo Khu vuc qua user_khu_vuc_bh (khong con
    -- "xem tat ca" nhu quanly cu).
    la_view           INTEGER NOT NULL DEFAULT 0,
    -- = "qtri" cua prototype (Admin he thong: CRUD nguoi dung/vai tro, Cai dat).
    la_qtri           INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE login_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    thoi_gian   TEXT NOT NULL DEFAULT (datetime('now')),
    ip          TEXT,
    user_agent  TEXT
);
CREATE INDEX idx_login_log_thoi_gian ON login_log(thoi_gian);
CREATE INDEX idx_login_log_email ON login_log(email);

-- ---------- Du lieu tham chieu dong bo qua co che "day" (push) tu linh-kien-app (xem CLAUDE.md muc
-- "Chot 5 cau hoi mo..." + file phan tich muc 3) - KHONG CRUD noi bo, luon theo dung linh-kien-app,
-- sua phai sua o linh-kien-app roi doi tro se tu day sang. Giai doan 1 chi tao bang - route nhan
-- POST /api/partner/sync/* la viec cua Giai doan 5. ----------

CREATE TABLE ktv_lien_he_bh (
    ma_ktv              TEXT PRIMARY KEY,
    ten_hien_thi        TEXT,
    sdt                 TEXT,
    gmail               TEXT,
    email_dang_nhap     TEXT,
    vai_tro_ktv         TEXT CHECK (vai_tro_ktv IN ('KTV', 'CTV', 'Tram', 'Ve tinh')),
    khu_vuc_ma          TEXT,
    ktv_cap1_phu_trach  TEXT,
    dong_bo_luc         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ktv_lien_he_bh_email ON ktv_lien_he_bh(email_dang_nhap) WHERE email_dang_nhap IS NOT NULL;
CREATE INDEX idx_ktv_lien_he_bh_khu_vuc ON ktv_lien_he_bh(khu_vuc_ma) WHERE khu_vuc_ma IS NOT NULL;

CREATE TABLE khu_vuc_bh (
    ma           TEXT PRIMARY KEY,
    ten          TEXT NOT NULL,
    gs_email     TEXT,
    dong_bo_luc  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Khu vuc duoc gan cho tai khoan "View" (la_view) - CHI dung de gioi han pham vi xem, KHONG phai
-- "khu vuc phu trach mem" nhu TN/Kho/Ke toan ben linh-kien-app. Chua gan khu vuc nao -> khong thay
-- don nao (an toan mac dinh, dung mau khuVucViewEmailInSql() cua linh-kien-app).
CREATE TABLE user_khu_vuc_bh (
    user_email  TEXT NOT NULL REFERENCES users(email),
    khu_vuc_ma  TEXT NOT NULL REFERENCES khu_vuc_bh(ma),
    PRIMARY KEY (user_email, khu_vuc_ma)
);

-- ---------- Danh muc linh kien - HYBRID: dong bo tu linh-kien-app (nguon_du_lieu='dong_bo') + tu
-- tao them noi bo (nguon_du_lieu='noi_bo', CO CRUD day du) - dung yeu cau goc "cho phep tao them, sua
-- thong tin, tat bat danh sach su dung trong bao hanh". Loc dong bo: TOAN BO ben linh-kien-app dang
-- bat_tat=1 (chot 03/09/2026, khong loc theo chi_sua_chua). ----------

CREATE TABLE linh_kien_bh (
    ma_lk                TEXT PRIMARY KEY,
    ten_lk               TEXT NOT NULL,
    don_vi               TEXT,
    ghi_chu              TEXT,
    anh_demo             TEXT,
    -- 2 cot bao hanh CAN, KHONG co san ben linh-kien-app (da ghi nhan tu vong phan tich dau tien).
    so_thang_bao_hanh    INTEGER,
    loai_hang            TEXT,
    nguon_du_lieu        TEXT NOT NULL DEFAULT 'noi_bo' CHECK (nguon_du_lieu IN ('dong_bo', 'noi_bo')),
    ma_lk_nguon          TEXT, -- map nguoc "ma_linh_kien" ben linh-kien-app (NULL neu noi_bo)
    -- Bat/tat RIENG cua bao hanh - DOC LAP voi "bat_tat" ben linh-kien-app (co the tat 1 linh kien
    -- chi trong pham vi bao hanh ma khong anh huong viec no van ban binh thuong ben kia).
    duoc_dung_bao_hanh   INTEGER NOT NULL DEFAULT 1,
    dong_bo_luc          TEXT,
    nguoi_cap_nhat       TEXT REFERENCES users(email),
    ngay_cap_nhat        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_linh_kien_bh_nguon ON linh_kien_bh(ma_lk_nguon) WHERE ma_lk_nguon IS NOT NULL;

-- ---------- Xac thuc du lieu day tu linh-kien-app (routes/sync.ts) - KHONG dung bang nhieu-key kieu
-- partner_api_keys cua dvbh (thiet ke cho nhieu doi tac ben ngoai khac nhau) - day la quan he 1-1 co
-- dinh giua dung 2 Worker noi bo, nen chi can 1 secret dung chung (Env.LINHKIEN_SYNC_API_KEY, dat
-- qua "wrangler secret put", so sanh truc tiep trong routes/sync.ts) - khong can bang rieng. ----------

-- ---------- Phieu gui bao hanh (KTV tao) - xem createPhieuGui() trong prototype ----------

CREATE TABLE phieu_gui_bh (
    id                    TEXT PRIMARY KEY,
    nguoi_tao             TEXT NOT NULL REFERENCES users(email),
    ngay_tao              TEXT NOT NULL,
    ngay_gui_xe           TEXT,
    hinh_thuc_gui         TEXT,
    ma_xe_hoac_tai_xe     TEXT,
    don_vi_van_chuyen     TEXT,
    ma_van_don            TEXT,
    ghi_chu               TEXT,
    trang_thai            TEXT NOT NULL DEFAULT 'nhap',
    su_co_tiep_nhan       INTEGER NOT NULL DEFAULT 0,
    su_co_ly_do           TEXT,
    su_co_ghi_chu         TEXT,
    nguoi_nhan_kho        TEXT,
    thoi_gian_nhan_kho    TEXT,
    admin_tiep_nhan       INTEGER NOT NULL DEFAULT 0,
    admin_nguoi_nhan      TEXT,
    admin_thoi_gian_nhan  TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_phieu_gui_bh_nguoi_tao ON phieu_gui_bh(nguoi_tao);
CREATE INDEX idx_phieu_gui_bh_trang_thai ON phieu_gui_bh(trang_thai);

-- Nhat ky / phan hoi tu do (ghi_chu_log[] trong prototype, KTV/Kho/Admin BH cung doc-ghi duoc).
CREATE TABLE phieu_gui_bh_ghi_chu (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phieu_gui_id  TEXT NOT NULL REFERENCES phieu_gui_bh(id),
    tac_gia       TEXT NOT NULL,
    thoi_gian     TEXT NOT NULL DEFAULT (datetime('now')),
    noi_dung      TEXT NOT NULL
);
CREATE INDEX idx_ghi_chu_phieu_gui ON phieu_gui_bh_ghi_chu(phieu_gui_id);

-- ---------- Don sua chua bao hanh - DON CHA (submitAddDon()/submitTaoDonDichVu() trong prototype) ----------

CREATE TABLE phieu_sua_chua_bh (
    id                    TEXT PRIMARY KEY,
    phieu_gui_id          TEXT REFERENCES phieu_gui_bh(id), -- NULL = don dich vu tinh phi (khach le, Admin BH tu tao)
    case_id               TEXT, -- ID case ben dvbh (case-lookup) - tuy chon voi don dich vu tinh phi
    ma_lk                 TEXT REFERENCES linh_kien_bh(ma_lk),
    mo_ta_loi             TEXT,
    ghi_chu               TEXT,
    so_luong_khai         INTEGER NOT NULL DEFAULT 1,
    so_luong_thuc_nhan    INTEGER,
    ly_do_chenh_lech_sl   TEXT,
    loai_doi_tru_de_xuat  TEXT CHECK (loai_doi_tru_de_xuat IN ('doi_tra', 'tru_cong_no')),
    nguon_tao             TEXT NOT NULL CHECK (nguon_tao IN ('ktv', 'admin_dich_vu')),
    -- Chi dung khi case_id IS NULL (khach le, khong co ma case that).
    ten_khach_hang        TEXT,
    sdt_khach_hang        TEXT,
    dia_chi_khach_hang    TEXT,
    san_pham_bh           TEXT,
    trang_thai_cha        TEXT NOT NULL DEFAULT 'cho_xac_nhan_so_luong',
    -- MOI (thiet ke Giai doan 1, khong co trong prototype): dong goi san email GS phu trach ngay luc
    -- tao don (tra tu ktv_lien_he_bh.khu_vuc_ma -> khu_vuc_bh.gs_email cua KTV tao don) - dung cho
    -- scope vai tro Giam sat (la_giam_sat), dung mau "ddh.email_gs" cua linh-kien-app thay vi join
    -- dong moi lan truy van. NULL neu KTV chua duoc gan Khu vuc hoac Khu vuc chua co GS phu trach.
    email_gs              TEXT,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_psc_phieu_gui ON phieu_sua_chua_bh(phieu_gui_id) WHERE phieu_gui_id IS NOT NULL;
CREATE INDEX idx_psc_trang_thai_cha ON phieu_sua_chua_bh(trang_thai_cha);
CREATE INDEX idx_psc_email_gs ON phieu_sua_chua_bh(email_gs) WHERE email_gs IS NOT NULL;

-- Anh loi luc KTV gui hang (anh_loi[] trong prototype).
CREATE TABLE phieu_sua_chua_bh_anh (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id  TEXT NOT NULL REFERENCES phieu_sua_chua_bh(id),
    anh_url    TEXT NOT NULL
);
CREATE INDEX idx_psc_anh_parent ON phieu_sua_chua_bh_anh(parent_id);

-- Ghi nhan noi bo "KTV bao cao sai thong tin" (yeu cau 31/08/2026, bao_cao_sai_thong_tin[] trong
-- prototype) - CHI vai tro giam sat (la_admin_bh/la_qtri/la_view) moi doc duoc, KHONG lam thay doi
-- trang thai don.
CREATE TABLE phieu_sua_chua_bh_baocaosai (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id  TEXT NOT NULL REFERENCES phieu_sua_chua_bh(id),
    tac_gia    TEXT NOT NULL,
    thoi_gian  TEXT NOT NULL DEFAULT (datetime('now')),
    noi_dung   TEXT NOT NULL
);
CREATE INDEX idx_psc_baocaosai_parent ON phieu_sua_chua_bh_baocaosai(parent_id);

-- ---------- Don sua chua bao hanh - DON VI CON (tu sinh theo so_luong_thuc_nhan Admin BH xac nhan -
-- xem submitSoLuongThucNhan()/applyPhanLoai() trong prototype) ----------

CREATE TABLE phieu_sua_chua_bh_ct (
    id                       TEXT PRIMARY KEY, -- dang "<id cha>-<so_thu_tu>"
    parent_id                TEXT NOT NULL REFERENCES phieu_sua_chua_bh(id),
    so_thu_tu                INTEGER NOT NULL,
    ma_lk_thuc_te             TEXT REFERENCES linh_kien_bh(ma_lk), -- NULL = dung linh kien goc cua don cha
    loai_bao_hanh             TEXT CHECK (loai_bao_hanh IN ('trong_bh', 'ngoai_bh')),
    thong_tin_mail_pd         TEXT,
    ma_phe_duyet              TEXT,
    huong_xu_ly               TEXT CHECK (huong_xu_ly IN ('sua_chua', 'doi_moi', 'tra_lai_ktv', 'xac_nhan_tru_no', 'dich_vu_tinh_phi', 'tu_choi', 'chuyen_kho')),
    loai_doi_tru              TEXT CHECK (loai_doi_tru IN ('doi_tra', 'tru_cong_no')),
    nguoi_sua_chua            TEXT REFERENCES users(email),
    ly_do_tu_choi             TEXT,
    xu_ly_xac                 TEXT CHECK (xu_ly_xac IN ('tra_doi_tac', 'tieu_huy', 'luu_kho')),
    ket_qua_chan_doan         TEXT CHECK (ket_qua_chan_doan IN ('khong_loi', 'sua_duoc', 'de_xuat_doi_moi', 'tra_xac')),
    admin_xac_nhan_hoan_tat   INTEGER NOT NULL DEFAULT 0,
    phieu_tra_id              TEXT REFERENCES phieu_tra_bh(id),
    trang_thai                TEXT NOT NULL DEFAULT 'cho_phan_loai',
    so_lan_yeu_cau_lam_lai    INTEGER NOT NULL DEFAULT 0,
    ghi_chu_admin             TEXT,
    ghi_chu_bo_sung           TEXT,
    ly_do_bo_sung             TEXT,
    ly_do_tra_lai_admin       TEXT,
    ly_do_yeu_cau_lam_lai     TEXT,
    created_at                TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_psc_ct_parent ON phieu_sua_chua_bh_ct(parent_id);
CREATE INDEX idx_psc_ct_trang_thai ON phieu_sua_chua_bh_ct(trang_thai);
CREATE INDEX idx_psc_ct_phieu_tra ON phieu_sua_chua_bh_ct(phieu_tra_id) WHERE phieu_tra_id IS NOT NULL;
CREATE INDEX idx_psc_ct_nguoi_sua_chua ON phieu_sua_chua_bh_ct(nguoi_sua_chua) WHERE nguoi_sua_chua IS NOT NULL;

-- Anh truoc/sau sua + anh linh kien loi thuc te (anh_truoc[]/anh_sau[]/anh_loi_thuc_te[] trong
-- prototype) - gop 1 bang, phan biet bang cot "loai".
CREATE TABLE phieu_sua_chua_bh_ct_anh (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id  TEXT NOT NULL REFERENCES phieu_sua_chua_bh_ct(id),
    loai     TEXT NOT NULL CHECK (loai IN ('truoc', 'sau', 'loi_thuc_te')),
    anh_url  TEXT NOT NULL
);
CREATE INDEX idx_psc_ct_anh_unit ON phieu_sua_chua_bh_ct_anh(unit_id);

-- ---------- Phieu tra bao hanh (Admin BH gom, xem createPhieuTraForUnits() trong prototype) ----------

CREATE TABLE phieu_tra_bh (
    id                       TEXT PRIMARY KEY,
    ktv_nhan                 TEXT NOT NULL, -- email KTV, hoac hang so khach le
    nguoi_tao                TEXT NOT NULL REFERENCES users(email),
    trang_thai                TEXT NOT NULL DEFAULT 'nhap',
    loai_doi_tru               TEXT NOT NULL CHECK (loai_doi_tru IN ('doi_tra', 'tru_cong_no')),
    ma_don_hang               TEXT,
    ma_misa                   TEXT,
    ma_van_don                TEXT,
    ly_do_tu_choi_kt          TEXT,
    danh_gia_ktv              TEXT,
    khong_nhan_duoc_ghi_chu   TEXT,
    created_at                TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ptb_ktv_nhan ON phieu_tra_bh(ktv_nhan);
CREATE INDEX idx_ptb_trang_thai ON phieu_tra_bh(trang_thai);

-- Anh bien ban dong goi (anh_bien_ban[] trong prototype).
CREATE TABLE phieu_tra_bh_anh (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phieu_tra_id  TEXT NOT NULL REFERENCES phieu_tra_bh(id),
    anh_url       TEXT NOT NULL
);
CREATE INDEX idx_ptb_anh_phieu ON phieu_tra_bh_anh(phieu_tra_id);

-- ---------- Nhat ky insert-only, dung chung 4 entity_type (addLog() trong prototype) ----------

CREATE TABLE logs_bh (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type      TEXT NOT NULL CHECK (entity_type IN ('phieu_gui', 'phieu_sc', 'phieu_sc_ct', 'phieu_tra')),
    entity_id        TEXT NOT NULL,
    tu_trang_thai    TEXT,
    den_trang_thai   TEXT,
    nguoi_thuc_hien  TEXT NOT NULL,
    thoi_gian        TEXT NOT NULL DEFAULT (datetime('now')),
    ghi_chu          TEXT
);
CREATE INDEX idx_logs_bh_entity ON logs_bh(entity_type, entity_id);
CREATE INDEX idx_logs_bh_thoi_gian ON logs_bh(thoi_gian);

-- ---------- Settings (danh muc "Ly do cham"/"Ly do huy", seed dung 8+5 gia tri that da xac nhan
-- trong prototype - xem CLAUDE.md muc "Phan hoi vong 2" va "Doi chieu nut chuc nang AppSheet goc") ----------

CREATE TABLE settings_ly_do_cham_bh (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    noi_dung  TEXT NOT NULL,
    bat_tat   INTEGER NOT NULL DEFAULT 1,
    stt       INTEGER NOT NULL DEFAULT 0
);
INSERT INTO settings_ly_do_cham_bh (noi_dung, stt) VALUES
    ('Khong co linh kien', 1), ('Cho kho xuat hang', 2), ('Do sua chua cham', 3),
    ('KTV cung cap thieu thong tin', 4), ('Cho mail phe duyet tu cap quan ly', 5),
    ('Do khach hang chua thanh toan', 6), ('Dang cho thong tin tu bo phan khac', 7),
    ('Het hang ton kho', 8);

CREATE TABLE settings_ly_do_tu_choi_bh (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    noi_dung  TEXT NOT NULL,
    bat_tat   INTEGER NOT NULL DEFAULT 1,
    stt       INTEGER NOT NULL DEFAULT 0
);
INSERT INTO settings_ly_do_tu_choi_bh (noi_dung, stt) VALUES
    ('Khong co hang', 1), ('Khong phai loi bao hanh', 2), ('Khach khong dong y sua/doi', 3),
    ('Trung don/khong can xu ly', 4), ('Khac', 5);
