-- 12/11/2026 (v1.112): day phieu cap linh kien sua chua sang linh-kien-app thanh don "SỬA CHỮA TẠI KHO" chi xem (lib/capLkPush.ts).
-- Dong duoc day: da Ke toan xac nhan (kt_luc co) va dang da_cap, hoac da tung day (de bao huy). Day lai khi updated_at khac lan day.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_day_luc TEXT;   -- updated_at da day thanh cong
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_ddh_id TEXT;    -- ma don dat ben linh-kien-app (DDH-xxxxxx)
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_loi TEXT;       -- loi lan day gan nhat (NULL = ok)
