-- 13/11/2026: Admin BH tu choi tiep nhan thung tu Kho -> Kho phan hoi -> KTV phan hoi (7 ngay) -> huy thung.
-- tu_choi_tt: NULL (binh thuong) | 'cho_kho' (cho Kho phan hoi) | 'cho_ktv' (Kho dong y, cho KTV, han tu_choi_han) | 'da_huy'.
-- Kho / KTV khong dong y -> tu_choi_tt ve NULL (thung ve luong binh thuong), ly do luu o phan_hoi_*.
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_tt TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_ly_do TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_boi TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_luc TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_han TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN tu_choi_lan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_y_kien TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_y_kien_boi TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN kho_y_kien_luc TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN phan_hoi_vai_tro TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN phan_hoi_ly_do TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN phan_hoi_boi TEXT;
ALTER TABLE phieu_gui_bh ADD COLUMN phan_hoi_luc TEXT;
CREATE INDEX idx_phieu_gui_bh_tu_choi ON phieu_gui_bh(tu_choi_tt);
