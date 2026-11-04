-- 04/11/2026 - nguyen van: "Phieu cap linh kien sua chua tach thanh cac giai doan: Cho KT, (KT xac nhan xong) => cho kho in,
-- kho da in, Kho da xuat (co 2 nut da in hoac da xuat luon cho kho) => Cho kho nhin thay don cap lk".
-- trang_thai giu 'da_cap' (= KT da xac nhan); giai doan cua Kho luu o cot rieng kho_tt: cho_in | da_in | da_xuat.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kho_tt TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kho_in_boi TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kho_in_luc TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kho_xuat_boi TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kho_xuat_luc TEXT;
-- Du lieu cu: de xuat nhap tu AppSheet (khong co buoc KT) coi nhu Kho da xuat; de xuat KT da xac nhan qua luong moi -> cho Kho in.
UPDATE de_xuat_linh_kien_bh SET kho_tt = CASE WHEN kt_luc IS NULL THEN 'da_xuat' ELSE 'cho_in' END WHERE trang_thai = 'da_cap';
CREATE INDEX idx_dxlk_kho ON de_xuat_linh_kien_bh(trang_thai, kho_tt);
