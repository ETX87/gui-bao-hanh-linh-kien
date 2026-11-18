-- 18/11/2026: Kho tu choi thung "dang gui ve Kho" vi thuc te chua nhan duoc hang (KTV bam gui nhung chua gui that).
-- Thung quay ve 'nhap' cua KTV + canh bao nghiem trong cho KTV. Canh bao con hieu luc khi trang_thai='nhap' AND kho_tc_luc IS NOT NULL.
ALTER TABLE phieu_gui_bh ADD COLUMN kho_tc_ly_do TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_tc_boi TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_tc_luc TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_tc_lan INTEGER NOT NULL DEFAULT 0;
