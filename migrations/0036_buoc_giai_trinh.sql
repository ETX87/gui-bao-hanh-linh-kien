-- 15/11/2026 (doi tac: "Define rõ từng bước ... khi nào KTV phải giải trình, khi nào TNGS phải giải trình"):
-- 1) Ly do cham gan "ben chiu trach nhiem" (ktv / gs / kho / admin_bh / nv / ke_toan / van_chuyen / ngoai_canh).
-- 2) Bang giai trinh theo tung lan dung buoc (KTV / GS / BO giai trinh khi buoc qua SLA).
ALTER TABLE settings_ly_do_cham_bh ADD COLUMN ben TEXT;

UPDATE settings_ly_do_cham_bh SET ben = 'ngoai_canh' WHERE noi_dung IN ('Không có linh kiện', 'Hết hàng tồn kho', 'Chờ mail phê duyệt từ cấp quản lý', 'Do khách hàng chưa thanh toán');
UPDATE settings_ly_do_cham_bh SET ben = 'kho' WHERE noi_dung = 'Chờ kho xuất hàng';
UPDATE settings_ly_do_cham_bh SET ben = 'nv' WHERE noi_dung = 'Do sửa chữa chậm';
UPDATE settings_ly_do_cham_bh SET ben = 'ktv' WHERE noi_dung = 'KTV cung cấp thiếu thông tin';
UPDATE settings_ly_do_cham_bh SET ben = 'admin_bh' WHERE noi_dung = 'Đang chờ thông tin từ bộ phận khác';
UPDATE settings_ly_do_cham_bh SET ben = 'admin_bh' WHERE ben IS NULL;

INSERT INTO settings_ly_do_cham_bh (noi_dung, stt, ben) VALUES
  ('KTV chưa gom đủ hàng để gửi', 20, 'ktv'),
  ('Nhà xe / bưu điện chưa lấy hàng', 21, 'van_chuyen'),
  ('Hàng đang trên đường, chưa về kho', 22, 'van_chuyen'),
  ('KTV bận việc hiện trường', 23, 'ktv'),
  ('Không liên lạc được KTV', 24, 'gs'),
  ('KTV chưa kiểm tra hàng trả về', 25, 'ktv'),
  ('Kho chưa bàn giao hàng cho Admin', 26, 'kho'),
  ('Quá tải đơn trong ngày', 27, 'admin_bh');

CREATE TABLE IF NOT EXISTS giai_trinh_bh (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,   -- phieu_gui | phieu_sc | phieu_sc_ct | phieu_tra
  entity_id   TEXT NOT NULL,
  giai_doan   TEXT NOT NULL,   -- buoc dang dung (giai_doan cua man Tra cuu)
  vai_tro     TEXT NOT NULL,   -- ktv | gs | bo
  ly_do       TEXT NOT NULL,
  ben         TEXT,            -- ben chiu trach nhiem (theo ly do)
  ghi_chu     TEXT,
  qua_gio     REAL,            -- so gio qua SLA luc giai trinh
  nguoi       TEXT NOT NULL,
  luc         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_giai_trinh_entity ON giai_trinh_bh(entity_type, entity_id, giai_doan);
