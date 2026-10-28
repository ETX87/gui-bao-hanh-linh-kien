-- 29/10/2026: 3 tang linh kien cua 1 don vi bao hanh.
--   A = phieu_sua_chua_bh.ma_lk           : linh kien KTV/GS chon luc tao don (hoac mac dinh tu Odoo)
--   B = phieu_sua_chua_bh_ct.ma_lk_nhan   : linh kien THUC TE gui ve, Admin BH xac nhan (NULL = giong A)
--   C = phieu_sua_chua_bh_ct.ma_lk_thuc_te: linh kien DOI MOI / thay the tra cho KTV (NULL = giong B)
-- Quan ly xac (xu_ly_xac, phieu tra xac doi tac) tinh theo B.
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN ma_lk_nhan TEXT;
