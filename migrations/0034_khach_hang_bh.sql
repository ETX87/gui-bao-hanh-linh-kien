-- 14/11/2026: danh ba khach hang (NPP / khach le) cho Admin BH tao don thu cong - chon lai tu danh sach hoac tao moi.
CREATE TABLE IF NOT EXISTS khach_hang_bh (
  id TEXT PRIMARY KEY,                 -- KH-000001
  loai TEXT NOT NULL DEFAULT 'kh_le',  -- 'npp' | 'kh_le'
  ten TEXT NOT NULL,
  sdt TEXT NOT NULL DEFAULT '',
  dia_chi TEXT NOT NULL DEFAULT '',
  ghi_chu TEXT NOT NULL DEFAULT '',
  tim_kiem TEXT NOT NULL DEFAULT '',    -- chuoi bo dau (normVi) de tim khong dau
  mien TEXT,
  an INTEGER NOT NULL DEFAULT 0,       -- 1 = an khoi danh sach chon (khong xoa vi don cu tham chieu)
  nguoi_tao TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_khach_hang_bh_sdt ON khach_hang_bh(sdt);
ALTER TABLE phieu_sua_chua_bh ADD COLUMN khach_hang_id TEXT;
INSERT OR IGNORE INTO id_counters (ten_bang, gia_tri_hien_tai) VALUES ('khach_hang_bh', 0);
