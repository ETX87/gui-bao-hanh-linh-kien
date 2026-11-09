-- 09/11/2026: "Khi admin BH hủy hoặc từ chối 1 đơn bh, phải chọn lý do hủy và ghi chú (tùy chọn)"
-- Ghi chu tu do cua Admin BH luc huy (di kem ly_do_tu_choi chon tu danh muc).
ALTER TABLE phieu_sua_chua_bh_ct ADD COLUMN ghi_chu_huy TEXT;
