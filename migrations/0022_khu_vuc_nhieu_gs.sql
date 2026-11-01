-- 01/11/2026: 1 Khu vuc co the co NHIEU Giam sat cung phu trach. Bang khu_vuc_gs_bh la nguon that
-- danh sach GS cua tung Khu vuc; khu_vuc_bh.gs_email giu lai lam "GS chinh" (GS dau tien / GS do
-- linh-kien-app dong bo sang) de dong goi vao phieu_sua_chua_bh.email_gs nhu cu.
CREATE TABLE IF NOT EXISTS khu_vuc_gs_bh (
  khu_vuc_ma TEXT NOT NULL,
  gs_email   TEXT NOT NULL,
  PRIMARY KEY (khu_vuc_ma, gs_email)
);
CREATE INDEX IF NOT EXISTS idx_khu_vuc_gs_email ON khu_vuc_gs_bh(gs_email);
INSERT OR IGNORE INTO khu_vuc_gs_bh (khu_vuc_ma, gs_email)
  SELECT ma, LOWER(TRIM(gs_email)) FROM khu_vuc_bh WHERE gs_email IS NOT NULL AND TRIM(gs_email) <> '';
