-- 0041 (16/11/2026, v1.142 + linh-kien-app v1.508). Nguyen van yeu cau chu he thong:
-- "1. Đơn bh cần thêm cột Hãng, Đối tác (lấy từ CRM). (admin BH có thể sửa lại nếu chưa chính xác khi duyệt đơn) => khi đẩy 1 đơn sang nv sửa
--  chữa, bắt buộc phải chọn đủ Hãng, Đối tác, còn bảo hành/hết bảo hành ... Đơn của đối tác Karofi => mặc định xuất sang đơn "HỖ TRỢ SỬA CHỮA
--  0 ĐỒNG" (nếu còn bảo hành), các đối tác khác sẽ xuất "CÔNG NỢ SỬA CHỮA". Trường hợp hết bảo hành => đề xuất dạng "MUA HÀNG SỬA CHỮA". => Chỉ
--  có đơn "CÔNG NỢ SỬA CHỮA" mới cần lên đơn trừ công nợ. ... 4. thêm vai trò "Trả xác", vai trò này nhìn thấy menu trả xác và có quyền xác nhận
--  trả xác cho các đối tác được quyền xử lý."
-- Chot (AskUserQuestion): Doi tac = DANH MUC trong Cai dat (tu nap tu gia tri CRM, Admin them / sua, danh dau doi tac Karofi); Hang = chu tu CRM
-- sua tu do; vai tro Tra xac = gom thung + ghi ket qua xac + gui Ke toan voi xac cua doi tac duoc gan (Ke toan van duyet thung).

CREATE TABLE IF NOT EXISTS doi_tac_bh (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ten TEXT NOT NULL COLLATE NOCASE UNIQUE,
  la_karofi INTEGER NOT NULL DEFAULT 0,
  bat_tat INTEGER NOT NULL DEFAULT 1,
  stt INTEGER NOT NULL DEFAULT 0,
  ghi_chu TEXT,
  nguoi_cap_nhat TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Nap 1 lan tu cac gia tri "doi_tac" CRM da luu trong bang chup case.
INSERT OR IGNORE INTO doi_tac_bh (ten, la_karofi, created_at, updated_at)
SELECT TRIM(json_extract(data, '$.doi_tac')),
       CASE WHEN UPPER(json_extract(data, '$.doi_tac')) LIKE '%KAROFI%' THEN 1 ELSE 0 END,
       datetime('now', '+7 hours'), datetime('now', '+7 hours')
FROM case_lookup_snapshot
WHERE json_valid(data) AND TRIM(COALESCE(json_extract(data, '$.doi_tac'), '')) <> ''
GROUP BY TRIM(json_extract(data, '$.doi_tac'));

-- Moi case moi / cap nhat tu CRM: doi tac chua co trong danh muc -> tu them (moi duong ghi case_lookup_snapshot).
CREATE TRIGGER IF NOT EXISTS trg_cls_doi_tac_i AFTER INSERT ON case_lookup_snapshot
WHEN json_valid(NEW.data) AND TRIM(COALESCE(json_extract(NEW.data, '$.doi_tac'), '')) <> ''
BEGIN
  INSERT OR IGNORE INTO doi_tac_bh (ten, la_karofi, created_at, updated_at)
  VALUES (TRIM(json_extract(NEW.data, '$.doi_tac')), CASE WHEN UPPER(json_extract(NEW.data, '$.doi_tac')) LIKE '%KAROFI%' THEN 1 ELSE 0 END,
          datetime('now', '+7 hours'), datetime('now', '+7 hours'));
END;
CREATE TRIGGER IF NOT EXISTS trg_cls_doi_tac_u AFTER UPDATE OF data ON case_lookup_snapshot
WHEN json_valid(NEW.data) AND TRIM(COALESCE(json_extract(NEW.data, '$.doi_tac'), '')) <> ''
BEGIN
  INSERT OR IGNORE INTO doi_tac_bh (ten, la_karofi, created_at, updated_at)
  VALUES (TRIM(json_extract(NEW.data, '$.doi_tac')), CASE WHEN UPPER(json_extract(NEW.data, '$.doi_tac')) LIKE '%KAROFI%' THEN 1 ELSE 0 END,
          datetime('now', '+7 hours'), datetime('now', '+7 hours'));
END;

-- Don cha: Hang + Doi tac Admin BH chot (NULL = lay theo CRM - lib/doiTac.ts HANG_SQL / DOI_TAC_ID_SQL). Ghi khi phan loai sang NV / sua tay.
ALTER TABLE phieu_sua_chua_bh ADD COLUMN hang TEXT;
ALTER TABLE phieu_sua_chua_bh ADD COLUMN doi_tac_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_pscbh_doi_tac ON phieu_sua_chua_bh(doi_tac_id);

-- Vai tro "Tra xac" + doi tac duoc xu ly.
ALTER TABLE users ADD COLUMN la_tra_xac INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS user_doi_tac_bh (
  email TEXT NOT NULL,
  doi_tac_id INTEGER NOT NULL,
  PRIMARY KEY (email, doi_tac_id)
);

-- Thung tra xac gan 1 doi tac trong danh muc (cot chu doi_tac cu giu nguyen = ten hien thi).
ALTER TABLE thung_xac_bh ADD COLUMN doi_tac_id INTEGER;

-- Loai de xuat cua don cap ben linh-kien-app (CÔNG NỢ SỬA CHỮA / HỖ TRỢ SỬA CHỮA 0 ĐỒNG / MUA HÀNG SỬA CHỮA). NULL = chua dong bo
-- (moi lan cap truoc 16/11 deu la CÔNG NỢ SỬA CHỮA). Chi CÔNG NỢ SỬA CHỮA vao hang doi xac nhan tieu hao + tao don tru.
ALTER TABLE de_xuat_linh_kien_bh ADD COLUMN lk_loai TEXT;
