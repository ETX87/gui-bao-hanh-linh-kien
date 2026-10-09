-- 09/10/2026: nut FAST "Huy do khong co hang" truoc day ghi ly_do_tu_choi = 'Khong co hang' (khong dau)
-- trong khi danh muc da doi sang 'Không có hàng' tu migration 0004 -> dong bo lai du lieu cu.
UPDATE phieu_sua_chua_bh_ct SET ly_do_tu_choi = 'Không có hàng' WHERE ly_do_tu_choi = 'Khong co hang';
UPDATE phieu_sua_chua_bh_ct SET ly_do_tu_choi = 'Không phải lỗi bảo hành' WHERE ly_do_tu_choi = 'Khong phai loi bao hanh';
UPDATE phieu_sua_chua_bh_ct SET ly_do_tu_choi = 'Khách không đồng ý sửa/đổi' WHERE ly_do_tu_choi = 'Khach khong dong y sua/doi';
UPDATE phieu_sua_chua_bh_ct SET ly_do_tu_choi = 'Trùng đơn / không cần xử lý' WHERE ly_do_tu_choi = 'Trung don/khong can xu ly';
