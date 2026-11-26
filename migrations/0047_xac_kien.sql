-- 26/11/2026 (v1.162) - So kien (thung vat ly) cua tung xac trong thung tra xac TX-.
-- Nguyen van: "Làm cả 3" (nut Tai BBBG theo thung, truong so kien, import BBBG theo ma case + ma hang).
-- Thay cot "Số Thùng" gop o tren BBBG lap tay: moi xac ghi kien rieng (VD "1", "3", "1+2", "Để ngoài").
-- Bo xac khoi thung -> xoa kien (ve cho gom).
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN xac_kien TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_kien TEXT;
