-- 16/11/2026 - Tra xac vong 2. Nguyen van: "1. thêm nút xác nhận nhanh: "Xác đã tiêu hủy", "Xác thất lạc", "Không có xác" hàng loạt.
-- 3. Xác bao gồm xác KTV gửi về thực tế (LK B) + xác linh kiện sau sửa chữa (xuất công nợ sửa chữa)".
-- xac_tt nay nhan them: 'tieu_huy' | 'that_lac' | 'khong_co' (cung nhom ket thuc ngoai thung voi 'ngoai').
-- xac_xl_* = ai / luc nao / ghi chu khi danh dau ket qua xac ngoai thung.
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN xac_xl_boi TEXT;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN xac_xl_luc TEXT;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN xac_xl_ghi_chu TEXT;

-- Xac sua chua: moi de xuat cap linh kien da xuat (luong cu Kho da xuat / luong CÔNG NỢ SỬA CHỮA da giao xong) = 1 xac
-- (linh kien cu thao ra), ma = de_xuat.ma_lk, SL = de_xuat.so_luong.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN thung_xac_id TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_tt TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_xl_boi TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_xl_luc TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_xl_ghi_chu TEXT;
CREATE INDEX IF NOT EXISTS idx_dxlk_thung_xac ON de_xuat_linh_kien_bh(thung_xac_id);

-- Cung moc voi xac Doi moi (0031): don tao truoc 01/11/2026 coi nhu da xu ly ngoai he thong.
UPDATE de_xuat_linh_kien_bh SET xac_tt = 'ngoai'
WHERE xac_tt IS NULL AND unit_id IN (SELECT u.id FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE p.created_at < '2026-11-01');
