-- 09/10/2026: "o danh sach odoo cho gui bao hanh, cho phep xac nhan huy don (tao nham tren odoo khong
-- can gui bao hanh - cho phep mo lai de gui neu tat nham)". KTV (hoac nguoi tao ho) danh dau 1 don Odoo
-- "khong gui" -> an khoi danh sach cho gui + so viec; mo lai = xoa 3 cot nay. Cot rieng tren don_bh_odoo:
-- upsert cua cron dong bo chi SET cac cot du lieu Odoo nen khong ghi de.
ALTER TABLE don_bh_odoo ADD COLUMN khong_gui_boi TEXT;
ALTER TABLE don_bh_odoo ADD COLUMN khong_gui_luc TEXT;
ALTER TABLE don_bh_odoo ADD COLUMN khong_gui_ly_do TEXT;
