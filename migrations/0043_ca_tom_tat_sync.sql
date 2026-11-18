-- 18/11/2026 (dvbh "Quản lý tồn" > Danh sách chi tiết): tóm tắt gửi bảo hành THEO CA đẩy sang dvbh cùng lần cron 15 phút
-- (lib/tomTatCa.ts, ghép vào POST /api/partner/sync/sua-chua-trang-thai sẵn có). Bảng này nhớ bản đã gửi để chỉ đẩy ca có thay đổi.
CREATE TABLE IF NOT EXISTS ca_tom_tat_sync (
  case_id      TEXT PRIMARY KEY,
  last_hash    TEXT,
  xong         INTEGER NOT NULL DEFAULT 0, -- 1 = mọi đơn của ca đã kết thúc/huỷ -> các lần sau bỏ qua (trừ khi ca có đơn mới)
  last_sent_at TEXT,
  last_error   TEXT
);
