-- 01/11/2026: GS phu duoc Admin gan o linh-kien-app (Quan ly nguoi dung > tai khoan GS > Khu vuc phu trach, bang user_khu_vuc ben
-- do) dong bo sang day. nguon = 'linhkien' (GS chinh khu_vuc_bh.gs_email + GS phu dong bo ve) | 'tay' (qtri gan o man Giam sat
-- khu vuc cua app nay). Dong bo chi ghi lai cac dong 'linhkien', khong dung dong 'tay'.
ALTER TABLE khu_vuc_gs_bh ADD COLUMN nguon TEXT NOT NULL DEFAULT 'tay';
UPDATE khu_vuc_gs_bh SET nguon = 'linhkien'
  WHERE EXISTS (SELECT 1 FROM khu_vuc_bh kv WHERE kv.ma = khu_vuc_gs_bh.khu_vuc_ma AND LOWER(TRIM(kv.gs_email)) = khu_vuc_gs_bh.gs_email);
