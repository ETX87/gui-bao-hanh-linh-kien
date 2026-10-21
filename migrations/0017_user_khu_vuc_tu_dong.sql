-- 21/10/2026: keo khu vuc phu trach cua tai khoan nhan su tu linh-kien-app (bang user_khu_vuc) 1 lan/ngay + dong bo tay.
-- users.mien_tu_dong = 1: mien cua tai khoan do he thong tu suy tu khu vuc (duoc ghi de o lan dong bo sau);
-- 0: Admin gan tay (khong ghi de). Admin dat ve "chua gan" thi lan dong bo sau lai tu suy.
ALTER TABLE users ADD COLUMN mien_tu_dong INTEGER NOT NULL DEFAULT 0;
