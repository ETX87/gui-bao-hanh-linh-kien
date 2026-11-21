-- 21/11/2026: ma yeu cau co the la ma Lada (don Ecolada) thay cho ma case DVBH - cung cot case_id.
-- loai_ma = 'lada' (NULL = case DVBH / ma khac nhu cu); lada_tim_thay = 1 tim thay tren he Lada, 0 = khong thay (nguoi tao tich tu chiu trach nhiem).
ALTER TABLE phieu_sua_chua_bh ADD COLUMN loai_ma TEXT;
ALTER TABLE phieu_sua_chua_bh ADD COLUMN lada_tim_thay INTEGER;
