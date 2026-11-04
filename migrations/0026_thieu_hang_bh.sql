-- Thieu hang bao hanh -> ticket ben linh-kien-app (2026-11-04). Yeu cau: "Them luong gui don Thieu linh kien tu App bao hanh sang app
-- dat linh kien dua theo ly do cham: 'Khong co linh kien', 'Het hang ton kho' => don day sang app linh kien, tao ticket thieu hang de
-- kho va nhan vien mua hang xu ly. Khi ticket duoc duyet hoac thay doi se phan hoi ve don bao hanh goc de admin bh nam duoc thong tin
-- hang da ve."
-- 1 dong = 1 linh kien thieu cua 1 don vi bao hanh. ticket_id NULL = chua gui duoc sang linh-kien-app (cron 15 phut gui lai).
-- trang_thai = ban sao trang thai ticket ben linh-kien-app ('Cho gui' khi chua gui duoc).
CREATE TABLE thieu_hang_bh (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id        TEXT NOT NULL REFERENCES phieu_sua_chua_bh_ct(id),
    ma_lk          TEXT NOT NULL,
    so_luong       INTEGER NOT NULL DEFAULT 1,
    ly_do          TEXT,
    ghi_chu        TEXT,
    nguon          TEXT NOT NULL DEFAULT 'tu_dong',  -- 'tu_dong' (theo ly do cham) | 'tay' (bam nut Bao thieu hang)
    nguoi_bao      TEXT NOT NULL,
    ngay_bao       TEXT NOT NULL,
    ticket_id      TEXT,
    trang_thai     TEXT NOT NULL DEFAULT 'Cho gui',
    ngay_du_kien   TEXT,
    ma_eo_mua      TEXT,
    ghi_chu_xu_ly  TEXT,
    nguoi_xu_ly    TEXT,
    cap_nhat_lk    TEXT,
    loi_gui        TEXT,
    da_xem         INTEGER NOT NULL DEFAULT 0,       -- Admin BH bam "Da nam" sau khi ticket dong
    updated_at     TEXT NOT NULL
);
CREATE INDEX idx_thb_unit ON thieu_hang_bh(unit_id);
CREATE INDEX idx_thb_ticket ON thieu_hang_bh(ticket_id);
CREATE INDEX idx_thb_tt ON thieu_hang_bh(trang_thai, da_xem);
