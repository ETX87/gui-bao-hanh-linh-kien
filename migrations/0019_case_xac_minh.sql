-- 30/10/2026: cong ma case "mem" khi he DVBH loi/khong phan hoi.
-- KTV van tao duoc don (tich "Vẫn tạo đơn, hệ thống sẽ xác minh mã case sau"), don gan co
-- case_xac_minh = 1; cron 15 phut hoi lai dvbh:
--   khop dung KTV -> 0 (+ luu bang chung case), khong tim thay case / lech KTV -> 2 + ly do (bao Admin BH).
-- 0 = binh thuong / da xac minh, 1 = chua xac minh, 2 = xac minh that bai.
ALTER TABLE phieu_sua_chua_bh ADD COLUMN case_xac_minh INTEGER NOT NULL DEFAULT 0;
ALTER TABLE phieu_sua_chua_bh ADD COLUMN case_xac_minh_loi TEXT;
CREATE INDEX IF NOT EXISTS idx_psc_case_xac_minh ON phieu_sua_chua_bh(case_xac_minh) WHERE case_xac_minh <> 0;
CREATE INDEX IF NOT EXISTS idx_psc_case_id ON phieu_sua_chua_bh(case_id) WHERE case_id IS NOT NULL;
