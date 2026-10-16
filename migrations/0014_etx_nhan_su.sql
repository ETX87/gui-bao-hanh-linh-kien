-- Migration 0014 (16/10/2026): ban sao danh ba "ETX nhan su" lay tu linh-kien-app (GET /api/suachua-partner/etx-nhan-su,
-- linh-kien-app PULL ETX hang tuan). Dung de: tu duyet tai khoan neu Gmail dang lam viec tren ETX, tu khoa khi chuyen
-- sang nghi viec (va mo lai khi di lam lai) - xem backend/src/lib/etxSync.ts. gmail luu chu thuong de khop users.email.
CREATE TABLE etx_nhan_su_bh (
  ma_nhan_su          TEXT PRIMARY KEY,
  ho_ten              TEXT,
  chuc_danh           TEXT,
  gmail               TEXT,
  trang_thai_lam_viec TEXT NOT NULL,  -- 'on' | 'off'
  ma_ktv              TEXT,
  updated_at          TEXT NOT NULL
);
CREATE INDEX idx_etx_nhan_su_bh_gmail ON etx_nhan_su_bh(gmail);

-- Tai khoan bi khoa TU DONG vi nghi viec tren ETX (de chi tu mo lai dung nhung tai khoan nay khi ETX bao di lam lai, khong
-- mo nham tai khoan Admin khoa tay).
ALTER TABLE users ADD COLUMN khoa_boi_etx INTEGER NOT NULL DEFAULT 0;
