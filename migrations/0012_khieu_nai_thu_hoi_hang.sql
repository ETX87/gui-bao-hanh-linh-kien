-- 12/10/2026 - tra loi cau hoi mo trong CLAUDE.md:
-- (4) "That lac tren duong tra": KTV bao khong nhan duoc linh kien (khieu nai van chuyen) -> Kho danh
--     gia gui thanh cong hay that bai. Truoc day trang thai khieu_nai_van_chuyen la ngo cut, khong ai
--     xu ly duoc. Thanh cong -> ktv_da_nhan; that bai -> trang thai ket thuc moi 'gui_that_bai'
--     (phieu_tra_bh.trang_thai khong co CHECK nen khong can dung lai bang).
ALTER TABLE phieu_tra_bh ADD COLUMN kq_khieu_nai TEXT;            -- 'thanh_cong' | 'that_bai'
ALTER TABLE phieu_tra_bh ADD COLUMN kq_khieu_nai_ghi_chu TEXT;
ALTER TABLE phieu_tra_bh ADD COLUMN kq_khieu_nai_boi TEXT;
ALTER TABLE phieu_tra_bh ADD COLUMN kq_khieu_nai_luc TEXT;

-- (5) Thu hoi chi phi bao hanh tu hang: hien ghi nhan thu cong, them vung nhap so tien da thu duoc
--     (khong bat buoc) o cap don vi con.
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN so_tien_thu_hoi_hang INTEGER;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN thu_hoi_hang_ghi_chu TEXT;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN thu_hoi_hang_boi TEXT;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN thu_hoi_hang_luc TEXT;
