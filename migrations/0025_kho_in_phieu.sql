-- 04/11/2026 - trang thai trung gian cua Kho cho phieu tra da duoc Ke toan duyet: "Chờ kho in phiếu" (0) /
-- "Kho đã in phiếu" (1), doi qua lai duoc. Khong dung lai bang (phieu_tra_bh co bang con FK tro toi).
ALTER TABLE phieu_tra_bh ADD COLUMN kho_da_in INTEGER NOT NULL DEFAULT 0;
ALTER TABLE phieu_tra_bh ADD COLUMN kho_in_boi TEXT;
ALTER TABLE phieu_tra_bh ADD COLUMN kho_in_luc TEXT;
