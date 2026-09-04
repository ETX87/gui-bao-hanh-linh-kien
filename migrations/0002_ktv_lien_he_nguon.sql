-- Them cot phan biet nguon du lieu cho ktv_lien_he_bh (dong bo tu linh-kien-app vs qtri tu khai bao
-- thu cong trong chinh suachua) - mau HYBRID da dung cho linh_kien_bh (xem 0001_init.sql), ap dung
-- lai o day theo yeu cau "thieu modules quan ly danh sach ktv" (04/09/2026): truoc gio bang nay CHI
-- nhan duoc du lieu qua sync day tu linh-kien-app (routes/sync.ts) - nhung co che day do CHUA duoc
-- trien khai xong ben linh-kien-app (xem CLAUDE.md "Giai doan 5"), nen bang nay dang RONG tren
-- production, khien khong co du lieu nao de auth.ts doi chieu tu dong duyet tai khoan KTV. Them kha
-- nang qtri tu khai bao thu cong (nguon_du_lieu='noi_bo') de co the dung tinh nang auto-duyet ngay,
-- khong can cho toi khi lien-kien-app trien khai xong co che day.
ALTER TABLE ktv_lien_he_bh ADD COLUMN nguon_du_lieu TEXT NOT NULL DEFAULT 'noi_bo' CHECK (nguon_du_lieu IN ('dong_bo', 'noi_bo'));
