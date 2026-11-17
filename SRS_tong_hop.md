# SRS tổng hợp — App Bảo hành đổi trả 3T

> Đặc tả yêu cầu **đã chốt** (theo code + `CLAUDE.md` tới 17/11/2026, v1.144). Khi các tài liệu cũ trong `du an sua chua bao hanh/`
> mâu thuẫn nhau, các mục "Phản hồi vòng 1–4" và các đợt sau trong `CLAUDE.md` thắng. Logic chi tiết: `TONG_HOP_LOGIC.md`.

## 1. Mục tiêu

Thay AppSheet (đã dừng 01/11/2026): mọi linh kiện / máy lỗi gửi về bảo hành có thùng, có mã case, theo dõi được từng đơn vị qua từng bước
tới khi KTV nhận lại; kiểm soát SLA, trách nhiệm từng bộ phận, cấp linh kiện sửa chữa, trả xác và trừ công nợ chính xác, ít thao tác tay.

## 2. Người dùng

KTV / CTV / Trạm, KTV triển khai, Kho, Admin bảo hành, NV sửa chữa, Kế toán, Trả xác, Giám sát, View, Admin hệ thống (quyền ở
`TONG_HOP_LOGIC.md` §2). Phân miền Bắc / Nam theo khu vực (tự phân khi KTV đăng nhập lần đầu). Menu và số việc theo vai trò.

## 3. Màn hình chính

| Màn | Yêu cầu chính |
|---|---|
| Trang chủ / Tổng quan | Thẻ đếm theo 9 nhóm giai đoạn (bấm → danh sách đã lọc), "Việc của tôi" nổi bật |
| Đơn của tôi (KTV) | Tạo thùng / đơn (mobile-first, chụp ảnh, lưu nháp gửi sau, % tải ảnh), theo dõi, xác nhận nhận hàng; tab Đã xong / Huỷ - từ chối |
| Đơn bảo hành (BO) | 3 chế độ xem Danh sách / Theo KTV / Theo linh kiện; tab Mọi giai đoạn bảng kiểu Excel + Tải Excel; "Bước đang dừng" (tải khi mở) |
| Chi tiết đơn / thùng | Popup 95% màn hình, luồng quy trình ngang + "Xem chi tiết", nút thao tác ở tiêu đề / footer, nhật ký gộp các nguồn |
| Tiếp nhận (Kho, Admin BH) | Thùng chờ tiếp nhận, mở xem và tiếp nhận ngay trong chi tiết, từ chối thùng |
| Phiếu trả | Bảng nhóm theo KTV, sửa tới khi Kế toán duyệt, diễn giải MISA, file import Odoo, in phiếu |
| Cấp linh kiện / Linh kiện của tôi | Đề xuất, NV đang giữ, chờ Admin xác nhận tiêu hao, sửa / huỷ xác nhận |
| Trả xác linh kiện | Xác chờ gom (theo KTV / linh kiện, lọc Excel), thùng trả xác, import kết quả xác hàng loạt |
| Báo cáo | Báo cáo BO theo tháng (gộp phòng ban / tách nhân viên), "Điểm nghẽn & trách nhiệm" |
| Logic hệ thống | 2 tài liệu luồng (tổng + cấp linh kiện) cho mọi tài khoản không phải KTV thuần |
| Quản trị | Người dùng (cờ vai trò, miền, đối tác trả xác), danh mục LK, đối tác, danh sách KTV, xem như người dùng |

## 4. Quy tắc nhập liệu

- Mã case bắt buộc mỗi đơn, phải khớp KTV (lệch KTV thì tạo thay có ghi nhận); không trùng case + linh kiện đang mở.
- Giao NV sửa: bắt buộc Hãng, Đối tác, còn / hết bảo hành. Huỷ / từ chối / trả lại: bắt buộc lý do.
- Thùng trả xác gửi Kế toán: bắt buộc mã EO + ≥ 1 xác.

## 5. Yêu cầu chung

- Bảng 1 dòng / ô cắt "…", lọc + sắp xếp kiểu Excel trên mọi bảng, phân trang 20 dòng; tìm không dấu theo case / khách / linh kiện.
- Link mở thẳng theo ID (`/DH-…`, `/BH-…`, `/TR-…`).
- Thông báo tổng hợp 1 lần / ngày lúc 12h theo vai trò (push + chuông).
- Mọi thời gian giờ Việt Nam; SLA bỏ Chủ nhật. Ảnh lưu Drive. Tối ưu lượt đọc D1 (index, tải lười).
