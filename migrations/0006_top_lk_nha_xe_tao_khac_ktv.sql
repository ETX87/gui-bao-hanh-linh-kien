-- 05/10/2026 - 3 yeu cau cung dot:
-- (muc 9) Admin BH / Giam sat tao don HO duoc xac nhan tao don du case thuoc KTV khac tren he thong:
--   ghi nhan email nguoi xac nhan + KTV dang ghi tren case (bang chung).
ALTER TABLE phieu_sua_chua_bh ADD COLUMN xac_nhan_khac_ktv TEXT;
ALTER TABLE phieu_sua_chua_bh ADD COLUMN ktv_tren_case TEXT;

-- (muc 4) Luu vet phuong an gui hang lan gan nhat cua tung KTV (tu dien khi tao phieu moi) - truoc
-- day chep tu phieu tao gan nhat (ke ca phieu nhap chua ai sua) nen hay chep lai gia tri mac dinh.
CREATE TABLE ktv_nha_xe_bh (
    email              TEXT PRIMARY KEY,
    hinh_thuc_gui      TEXT,
    ma_xe_hoac_tai_xe  TEXT,
    don_vi_van_chuyen  TEXT,
    updated_at         TEXT
);

-- (muc 7) Top linh kien xu ly thanh cong 30 ngay gan nhat - tinh lai moi ngay 1 lan o khung gio cai
-- dat (sync_state.lk_top_gio, mac dinh 2h sang gio VN), dung de xep thu tu danh sach chon linh kien.
CREATE TABLE linh_kien_top_bh (
    ma_lk     TEXT PRIMARY KEY,
    hang      INTEGER NOT NULL,
    so_luong  INTEGER NOT NULL,
    tinh_luc  TEXT NOT NULL
);
