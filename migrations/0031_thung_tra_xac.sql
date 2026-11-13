-- 13/11/2026 - Module quan ly tra xac linh kien. Nguyen van: "linh kiện được gửi về bh, admin bh duyệt đổi mới
-- => xác nhận trạng thái trả xác => admin bh định kỳ sẽ gom nhiều xác linh kiện và trả về 1 đợt cho nhà máy =>
-- tạo thùng trả xác => add linh kiện => thêm thông tin (mã EO) => kế toán và kiểm tra thông tin => phê duyệt =>
-- kết thúc luồng trả xác."
-- Thung tra xac doc lap voi phieu tra KTV (1 don vi Doi moi vua co phieu tra linh kien moi ve KTV, vua co xac
-- tra nha may): trang_thai nhap -> cho_ke_toan -> da_duyet (ket thuc). KT tra lai -> nhap.

CREATE TABLE IF NOT EXISTS thung_xac_bh (
  id TEXT PRIMARY KEY,
  trang_thai TEXT NOT NULL DEFAULT 'nhap',
  doi_tac TEXT,
  ma_eo TEXT,
  ghi_chu TEXT,
  mien TEXT,
  nguoi_tao TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  gui_kt_boi TEXT,
  gui_kt_luc TEXT,
  kt_boi TEXT,
  kt_luc TEXT,
  ly_do_tra_lai TEXT,
  tra_lai_boi TEXT,
  tra_lai_luc TEXT
);
CREATE INDEX IF NOT EXISTS idx_thung_xac_tt ON thung_xac_bh(trang_thai);

CREATE TABLE IF NOT EXISTS thung_xac_log_bh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thung_id TEXT NOT NULL,
  tu_trang_thai TEXT,
  den_trang_thai TEXT,
  nguoi_thuc_hien TEXT,
  thoi_gian TEXT NOT NULL,
  ghi_chu TEXT
);
CREATE INDEX IF NOT EXISTS idx_thung_xac_log ON thung_xac_log_bh(thung_id);

-- Xac cua tung don vi: thung_xac_id = thung dang chua xac; xac_tt: NULL (chua xu ly - cho gom neu du dieu kien),
-- 'trong_thung', 'da_tra' (KT da duyet thung), 'ngoai' (da xu ly ngoai he thong).
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN thung_xac_id TEXT;
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN xac_tt TEXT;
CREATE INDEX IF NOT EXISTS idx_psc_ct_thung_xac ON phieu_sua_chua_bh_ct(thung_xac_id);
CREATE INDEX IF NOT EXISTS idx_psc_ct_xac_tt ON phieu_sua_chua_bh_ct(xu_ly_xac, xac_tt);

INSERT OR IGNORE INTO id_counters (ten_bang, gia_tri_hien_tai) VALUES ('thung_xac_bh', 0);

-- Chot 13/11/2026: xac cua don tao truoc ngay dung AppSheet (01/11/2026) coi nhu da xu ly ngoai he thong.
UPDATE phieu_sua_chua_bh_ct SET xac_tt = 'ngoai'
WHERE huong_xu_ly = 'doi_moi' AND xu_ly_xac = 'tra_doi_tac' AND xac_tt IS NULL
  AND parent_id IN (SELECT id FROM phieu_sua_chua_bh WHERE created_at < '2026-11-01');
