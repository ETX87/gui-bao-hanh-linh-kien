-- Don bao hanh tao tren Odoo (OCRM) -> dvbh (pipeline auto qs, 4-5 dot/ngay) -> suachua TU XIN dinh ky
-- (cron 15 phut, con tro (ngay_dong_bo, odoo_id)) - yeu cau 04/10/2026, xem CLAUDE.md muc "Keo don bao
-- hanh Odoo". KTV chon don "cho gui sua" (Odoo new/repairing) dua vao thung; trang thai gui sua duoc
-- day NGUOC ve dvbh theo lo.

-- Ban sao don Odoo (chi cac cot can dung). ma_ktv tach tu case_dvbh.ky_thuat_vien "(ma) ..." de loc
-- "don cua KTV nao" - doi chieu ktv_lien_he_bh.ma_ktv.
CREATE TABLE don_bh_odoo (
    odoo_id             INTEGER PRIMARY KEY,
    ma_don              TEXT,
    case_id             TEXT,
    ma_linh_kien        TEXT,
    ten_linh_kien       TEXT,
    so_luong            REAL,
    trang_thai          TEXT,
    tinh_trang_loi      TEXT,
    ghi_chu             TEXT,
    ngay_tao            TEXT,
    ngay_hoan_thanh     TEXT,
    ngay_cap_nhat_odoo  TEXT,
    con_hieu_luc        INTEGER NOT NULL DEFAULT 1,
    ky_thuat_vien       TEXT,
    ma_ktv              TEXT,
    ngay_dong_bo        TEXT,
    synced_at           TEXT NOT NULL
);
CREATE INDEX idx_dbo_ktv ON don_bh_odoo(ma_ktv, trang_thai);

-- Don cha tao tu 1 don Odoo (NULL = KTV khai tay nhu truoc). 1 don Odoo chi vao 1 don cha.
ALTER TABLE phieu_sua_chua_bh ADD COLUMN odoo_id INTEGER;
CREATE UNIQUE INDEX idx_psc_odoo ON phieu_sua_chua_bh(odoo_id) WHERE odoo_id IS NOT NULL;

-- Con tro + thong tin lan dong bo gan nhat (key-value).
CREATE TABLE sync_state (
    key         TEXT PRIMARY KEY,
    value       TEXT,
    updated_at  TEXT
);

-- Trang thai gui sua DA DAY ve dvbh (de chi day phan thay doi).
CREATE TABLE odoo_status_sync (
    odoo_id        INTEGER PRIMARY KEY,
    last_status    TEXT,
    last_detail    TEXT,
    last_ma_phieu  TEXT,
    last_sent_at   TEXT,
    last_error     TEXT
);
CREATE INDEX idx_oss_status ON odoo_status_sync(last_status);
