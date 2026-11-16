-- 16/11/2026 (v1.133, linh-kien-app v1.498 migration 0121) - nguyen van: "đóng luồng hoạt động trên app đổi trả, chuyển hoàn toàn sang app đặt
-- lk - nhưng vẫn cho tạo đơn trực tiếp trên app đổi trả, sửa 1 số thông tin cơ bản khi tạo linh kiện (nếu như kế toán chưa xử lý (app sửa chữa
-- chỉ dùng để theo dõi thông tin và chuyển trạng thái theo API)" + "Cấp lk tạo được từ cả 2 bên ... kế toán duyệt trên app lk".
-- De xuat MOI: tao ngay don "CÔNG NỢ SỬA CHỮA" ben linh-kien-app (POST /api/suachua-partner/don-sc), trang_thai = 'lien_ket' (khong vao
-- hang doi Admin BH cap / Ke toan / Kho cu); don NV dat thang tren linh-kien-app cung hien o day (nguon = 'linhkien'). Trang thai lay ve
-- qua GET /api/suachua-partner/don-sc (luc mo don vi + cron 15 phut). nguon NULL = de xuat luong cu (chay not toi het).
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN nguon TEXT;          -- 'doitra' | 'linhkien' | NULL (luong cu)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_tt TEXT;          -- trang_thai_hien_tai cua don ben linh-kien-app
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_nhan TEXT;        -- nhan hien thi (vd "Kho đang xuất hàng")
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_buoc TEXT;        -- cho | xu_ly | xong | dong
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_sua_duoc INTEGER NOT NULL DEFAULT 0; -- Ke toan chua xu ly -> sua / huy ngay duoc
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_giai_doan TEXT;   -- mo ta giai doan (vi sao khong sua duoc)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_pxk TEXT;         -- phieu xuat kho chua don
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_yeu_cau_huy TEXT; -- bo phan dang can dong y huy (kho / mua_hang / ke_toan)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_lan INTEGER NOT NULL DEFAULT 1;    -- lan tao don (sua ma LK / SL = huy + tao lai)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_ddh_cu TEXT;      -- cac don cu da thay (DDH-.., cach nhau ", ")
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_dong_bo_luc TEXT;
CREATE INDEX IF NOT EXISTS idx_dxlk_lk_ddh ON de_xuat_linh_kien_bh(lk_ddh_id) WHERE lk_ddh_id IS NOT NULL;
