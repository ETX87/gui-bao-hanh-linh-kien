-- 02/11/2026 - luong cap linh kien moi: Admin BH dong y cap (bat buoc ma don hang, MISA tuy chon) -> trang thai
-- 'cho_ke_toan' -> Ke toan nhap ma MISA + xac nhan -> 'da_cap'. nguoi_xu_ly/xu_ly_luc = Admin dong y cap;
-- 2 cot moi luu nguoi/thoi diem Ke toan xac nhan. Cot trang_thai khong co CHECK nen khong can dung lai bang.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kt_boi TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN kt_luc TEXT;
