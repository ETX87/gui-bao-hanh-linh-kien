-- 12/10/2026 - "De xuat linh kien" (NV sua chua xin cap linh kien) - nguyen van chot:
--   "NV se tu bao linh kien can duoc cap, Admin bao hanh se len misa de xuat tu kho sang. Cu de xuat den
--    khi sua xong hoac xac dinh la khong sua duoc. => NV sua chua se xac nhan: Da sua xong, khong sua
--    duoc, khong co loi, chi kiem tra tu van."
-- Moi de xuat la 1 DON CON cua don vi bao hanh (unit_id) - lien ket me-con. Khong gioi han so lan de
-- xuat / tu choi.

CREATE TABLE de_xuat_linh_kien_bh (
    id              TEXT PRIMARY KEY,                 -- DX-000001
    unit_id         TEXT NOT NULL REFERENCES phieu_sua_chua_bh_ct(id),
    ma_lk           TEXT NOT NULL,
    so_luong        INTEGER NOT NULL DEFAULT 1,
    ghi_chu         TEXT,
    trang_thai      TEXT NOT NULL DEFAULT 'cho_cap',  -- cho_cap | da_cap | tu_choi | huy
    nguoi_de_xuat   TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    ma_misa         TEXT,                             -- Admin BH nhap khi cap (phieu xuat MISA)
    ma_don_hang     TEXT,
    ly_do_tu_choi   TEXT,
    nguoi_xu_ly     TEXT,
    xu_ly_luc       TEXT,
    updated_at      TEXT NOT NULL
);
CREATE INDEX idx_dxlk_unit ON de_xuat_linh_kien_bh(unit_id);
CREATE INDEX idx_dxlk_trang_thai ON de_xuat_linh_kien_bh(trang_thai);

INSERT INTO id_counters (ten_bang, gia_tri_hien_tai) VALUES ('de_xuat_linh_kien_bh', 0);

-- Ket qua cuoi cua NV (4 gia tri moi). Cot cu ket_qua_chan_doan co CHECK chi 4 gia tri cu va bang
-- phieu_sua_chua_bh_ct co bang con FK toi nen khong dung lai bang de doi CHECK - them cot moi, du lieu
-- cu van doc tu ket_qua_chan_doan.
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN ket_qua_nv TEXT;  -- da_sua_xong | khong_sua_duoc | khong_loi | kiem_tra_tu_van
