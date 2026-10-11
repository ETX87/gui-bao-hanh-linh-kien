-- 2026-10-11: "phan loai cho phep dong bo nguoc ve danh sach linh kien app". Danh dau dong linh kien
-- dong bo vua bi Admin BH sua tay Phan loai (don_vi) ma CHUA day duoc sang linh-kien-app - trong luc
-- cho, dot dong bo linh-kien-app -> suachua KHONG ghi de don_vi cua dong nay (xem routes/sync.ts);
-- cron 15 phut gui lai (lib/linhKienPush.ts). Day thanh cong -> ve 0.
ALTER TABLE linh_kien_bh ADD COLUMN don_vi_cho_day INTEGER NOT NULL DEFAULT 0;
