-- Phat hien 15 vong ra soat UX (08/09/2026): danh muc "Ly do cham" / "Ly do huy" o
-- migrations/0001_init.sql duoc seed bang chuoi ASCII khong dau - lo ra o MOI dropdown cong SLA /
-- huy don trong toan he thong. Cap nhat lai sang tieng Viet co dau (chi doi cac dong con dung
-- nguyen van gia tri seed goc - khong dung vao dong qtri da tu sua/them).

UPDATE settings_ly_do_cham_bh SET noi_dung = 'Không có linh kiện'                     WHERE noi_dung = 'Khong co linh kien';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Chờ kho xuất hàng'                      WHERE noi_dung = 'Cho kho xuat hang';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Do sửa chữa chậm'                       WHERE noi_dung = 'Do sua chua cham';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'KTV cung cấp thiếu thông tin'           WHERE noi_dung = 'KTV cung cap thieu thong tin';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Chờ mail phê duyệt từ cấp quản lý'      WHERE noi_dung = 'Cho mail phe duyet tu cap quan ly';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Do khách hàng chưa thanh toán'          WHERE noi_dung = 'Do khach hang chua thanh toan';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Đang chờ thông tin từ bộ phận khác'     WHERE noi_dung = 'Dang cho thong tin tu bo phan khac';
UPDATE settings_ly_do_cham_bh SET noi_dung = 'Hết hàng tồn kho'                       WHERE noi_dung = 'Het hang ton kho';

UPDATE settings_ly_do_tu_choi_bh SET noi_dung = 'Không có hàng'                       WHERE noi_dung = 'Khong co hang';
UPDATE settings_ly_do_tu_choi_bh SET noi_dung = 'Không phải lỗi bảo hành'             WHERE noi_dung = 'Khong phai loi bao hanh';
UPDATE settings_ly_do_tu_choi_bh SET noi_dung = 'Khách không đồng ý sửa/đổi'          WHERE noi_dung = 'Khach khong dong y sua/doi';
UPDATE settings_ly_do_tu_choi_bh SET noi_dung = 'Trùng đơn / không cần xử lý'         WHERE noi_dung = 'Trung don/khong can xu ly';
UPDATE settings_ly_do_tu_choi_bh SET noi_dung = 'Khác'                                WHERE noi_dung = 'Khac';
