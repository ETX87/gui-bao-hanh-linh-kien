-- 16/11/2026 - Tru cong no sua chua cho NV sua chua. Nguyen van chot: "1. Thất lạc có trừ hay không sẽ cho admin BH lựa chọn 2. Có
-- 3. trừ luôn cho vn sửa chữa, xác sẽ tiếp tục theo dõi đến khi trả xác thành công cho đối tác (hoặc hủy xác theo quy trình)
-- 4. Admin BH xác nhận 5. App đổi trả dừng các luồng thao tác của KT, KT hoàn toàn làm bên linh kiện app => các thông tin sẽ đồng bộ
-- từ app linh kiện để theo dõi 6. Diễn giải MISA tương tự đơn phân loại: trừ công nợ".
-- Moi lan cap (de_xuat lien_ket, so_luong = SL NV da nhan): Admin BH xac nhan SL dung + ket qua xac -> he thong tao don
-- "TRỪ CÔNG NỢ - SỬA CHỮA" (sl_tru) + "TRẢ HÀNG CÔNG NỢ - SỬA CHỮA" (sl_tra = nhan - dung) ben linh-kien-app.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN sl_dung INTEGER;        -- SL linh kien da dung (Admin xac nhan)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN sl_tra INTEGER;         -- SL du phai tra kho
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN sl_tru INTEGER;         -- SL tru cong no (= sl_dung, tru xac that lac Admin chon khong tru)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xac_kq TEXT;            -- tra_doi_tac | luu_kho | tieu_huy | khong_co | that_lac | ngoai
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tru_that_lac INTEGER;   -- xac that lac: 1 = van tru cong no NV, 0 = khong tru
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xn_boi TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xn_luc TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN xn_ghi_chu TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tru_ddh_id TEXT;        -- don TRỪ CÔNG NỢ - SỬA CHỮA ben linh-kien-app
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tru_nhan TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tru_buoc TEXT;          -- cho | xu_ly | xong | dong
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tra_ddh_id TEXT;        -- don TRẢ HÀNG CÔNG NỢ - SỬA CHỮA
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tra_nhan TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN tra_buoc TEXT;
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN cn_loi TEXT;            -- loi lan gui tao don gan nhat
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN cn_lan INTEGER NOT NULL DEFAULT 1; -- lan gui (gui lai sau khi don ben kia bi huy)
CREATE INDEX IF NOT EXISTS idx_dxlk_xn ON de_xuat_linh_kien_bh(xn_luc);
