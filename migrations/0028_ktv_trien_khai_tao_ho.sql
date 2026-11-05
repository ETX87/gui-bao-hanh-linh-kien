-- 05/11/2026 - nguyen van: "1. Lấy thêm thông tin KTV triển khai từ DVBH để xác định người được quyền tạo đơn bảo hành. chỉ cần là
-- 1 trong 2 người là tạo được (ví dụ trạm triển khai là Trạm A, KTV triển khai là KTV B chạy sự cố SC001) => Trạm A hoặc KTV B đều
-- có thể lên đặt đơn bh cho SC0001. 2. 1 Tài khoản KTV có thể tạo đơn thay cho 1 tài khoản KTV khác, thêm trong phần cài đặt
-- Danh sách KTV danh sách các KTV có thể tạo hộ ..."
-- KTV trien khai cua don Odoo (case_dvbh.ktv_trien_khai ben dvbh, migration 0135 ben do). tk_hoi = da nhan truong nay tu dvbh.
ALTER TABLE don_bh_odoo ADD COLUMN ktv_trien_khai TEXT;
ALTER TABLE don_bh_odoo ADD COLUMN ma_ktv_tk TEXT;
ALTER TABLE don_bh_odoo ADD COLUMN tk_hoi INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_dbo_ktv_tk ON don_bh_odoo(ma_ktv_tk, trang_thai);
-- KTV (email) duoc tao don ho cho KTV khac (cho_email). Gan o Quan tri > Danh sach KTV.
CREATE TABLE ktv_tao_ho_bh (
    email      TEXT NOT NULL,
    cho_email  TEXT NOT NULL,
    nguoi_gan  TEXT,
    created_at TEXT NOT NULL,
    PRIMARY KEY (email, cho_email)
);
CREATE INDEX idx_ktv_tao_ho_cho ON ktv_tao_ho_bh(cho_email);
