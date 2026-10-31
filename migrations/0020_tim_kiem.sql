-- 31/10/2026: chuoi tim kiem KHONG DAU cho moi don cha (yeu cau "nguoi dung thuong tim theo ID case CRM,
-- ten linh kien ho gui hoac ten khach hang"). SQLite LOWER/LIKE khong xu ly duoc chu Viet co dau (go
-- "tran thi mai" khong ra "Trần Thị Mai") -> luu san 1 chuoi da bo dau, chu thuong gom: ma don, ma case,
-- ten khach (bang chung case + khach le), serial, san pham, ten + ma linh kien A/B/C, mo ta loi, ten KTV.
-- Cap nhat boi lib/timKiem.ts (khi tao don + cron 15 phut cho don co thay doi).
ALTER TABLE phieu_sua_chua_bh ADD COLUMN tim_kiem TEXT;
ALTER TABLE phieu_sua_chua_bh ADD COLUMN tim_kiem_luc TEXT;
