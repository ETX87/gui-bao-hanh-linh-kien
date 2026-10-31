-- 31/10/2026: KTV bao thieu THEO TUNG MON khi nhan hang tra (thung 10 mon chi thieu 1, van dien tu x2 chi
-- nhan x1). Moi mon = 1 don vi (phieu_sua_chua_bh_ct).
--   ktv_thieu = 1: KTV bao khong nhan duoc mon nay (dang cho Kho danh gia)
--   that_lac  = 1: Kho danh gia mon nay that lac (xu ly ngoai he thong, phuong an ghi o phieu tra)
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN ktv_thieu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN that_lac INTEGER NOT NULL DEFAULT 0;
