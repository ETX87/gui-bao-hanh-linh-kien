# Gộp các màn hình trùng chức năng (31/10/2026) — phương án, CHƯA sửa code

Nguyên văn yêu cầu: *"tôi thấy có rất nhiều giao diện có chức năng tương tự nhau nhưng đang bị phân thành nhiều màn hình cho nhiều vai trò, xác định các màn có chức năng tượng tự, gộp chúng lại giảm việc xây dựng quá nhiều giao diện => chỉ tập trung vào 1 số giao diện chính và tái sử dụng chon các vai trò"*

## Hiện trạng (v1.050)

- 21 mục menu. Tài khoản Admin hệ thống thấy 19 mục.
- 59 file màn hình, khoảng 11.700 dòng.

Đọc theo dữ liệu thì thực ra chỉ có **3 loại danh sách**:

| Loại dữ liệu | Các màn đang tách riêng | API đang gọi |
|---|---|---|
| **Phiếu trả** (`phieu_tra_bh`) | Admin "Phiếu trả bảo hành" (phần danh sách) · Admin "Phiếu đã gửi kế toán" · Kế toán "Duyệt" (2 tab) · Kho "Đóng gói & gửi trả" (3 danh sách) · KTV "Nhận hàng" | **Cùng 1 API** `GET /phieu-tra?trang_thai=…` |
| **Đơn bảo hành** (đơn vị) | Admin "Xử lý đơn" (bảng thống nhất) · "KTV đang sửa" · "Xác nhận hoàn tất" · NV "Chẩn đoán" · "Tra cứu mọi đơn" | 5 API khác nhau, cùng cột / bộ lọc |
| **Thùng hàng** (`phieu_gui_bh`) | KTV "Gửi hàng" / "Tạo hộ" · Kho "Tiếp nhận" (chờ nhận, chờ bàn giao, gần đây) · Admin "Thùng chờ nhận nội bộ" + "Thùng đang gửi về Kho" | 3 API khác nhau |

Ngoài ra còn các cặp trùng:
- Trang chủ ↔ Tổng quan hệ thống: cùng đếm số đơn theo giai đoạn.
- Tra cứu mọi đơn ↔ Lịch sử Serial / Case: cùng là tìm đơn theo case / serial.
- Danh sách KTV · Giám sát khu vực · Người dùng: cùng là quản lý nhân sự.

Phần chi tiết thì **đã dùng chung**: UI chi tiết đơn / thùng / phiếu trả, các modal xử lý và nút thao tác (đã tự đổi theo vai trò + trạng thái). Phần trùng chỉ nằm ở **các màn danh sách** và **menu**.

## Phương án: 5 màn chính dùng chung cho mọi vai trò

Mỗi màn gồm:
- 1 bảng dùng chung;
- **tab "giai đoạn"**, mỗi vai trò mở ra ở đúng tab việc của mình;
- bộ lọc + tìm kiếm dùng chung (v1.050);
- nút thao tác hàng loạt chỉ hiện khi vai trò có quyền.

| Màn chung | Tab (theo quy trình) | Vai trò mặc định mở ở tab | Thay cho |
|---|---|---|---|
| **1. Thùng hàng** | Nháp · Đang gửi về Kho · Kho đã nhận – chờ Admin · Đã nhận nội bộ · Tất cả | KTV / Giám sát: Nháp (thùng của mình / tạo hộ) · Kho: Đang gửi về · Admin: Chờ Admin | Gửi hàng / Tạo hộ (bản máy tính), Kho Tiếp nhận, 2 thẻ thùng trong "Xử lý đơn" |
| **2. Đơn bảo hành** | Chờ xác nhận SL · Chờ phân loại · Chờ KTV bổ sung · Đang sửa · Chờ hoàn tất · Chờ trả · Tất cả | Admin: Chờ phân loại · NV: Đang sửa (chỉ đơn của mình) · Giám sát / View: Tất cả (theo phạm vi) | Xử lý đơn, KTV đang sửa, Xác nhận hoàn tất, NV Chẩn đoán, Tra cứu mọi đơn |
| **3. Phiếu trả** | Chờ tạo phiếu (đơn sẵn sàng) · Nháp · Chờ KT duyệt · Chờ Kho gửi · Đang gửi · Khiếu nại · Đã xong · Tất cả | Admin: Chờ tạo phiếu · Kế toán: Chờ KT duyệt (+ tab "Đã xử lý") · Kho: Chờ Kho gửi · KTV: Đang gửi | Phiếu trả BH, Phiếu đã gửi KT, Kế toán Duyệt, Kho Đóng gói, KTV Nhận hàng (bản máy tính) |
| **4. Trang chủ** | Việc của tôi + cảnh báo đơn tồn + số theo giai đoạn (bấm số mở thẳng tab tương ứng ở màn 2) | mọi vai trò | Trang chủ + Tổng quan hệ thống |
| **5. Quản trị** | Người dùng · Danh sách KTV · Khu vực · Cài đặt · Danh mục linh kiện | qtri (Admin BH chỉ thấy tab Linh kiện) | 5 màn quản trị riêng |

Giữ riêng, vì nghiệp vụ khác hẳn:
- **Cấp linh kiện** (đề xuất của NV).
- **Lịch sử Serial / Case**: thành 1 chế độ xem "gom theo sản phẩm" ngay trong màn 2.
- **3 màn mobile của KTV** (Việc của tôi / Đơn của tôi / Nhận hàng dạng thẻ): vừa làm ở v1.048 theo yêu cầu riêng. Bản điện thoại giữ dạng thẻ, bản máy tính dùng màn chung.

### Menu sau khi gộp (Admin hệ thống: 19 → 7 mục)

Trang chủ · Thùng hàng · Đơn bảo hành · Cấp linh kiện · Phiếu trả · Lịch sử · Quản trị.

Kho / Kế toán / NV chỉ thấy 2–3 mục.

### Phản biện / rủi ro

- **Quyền dữ liệu không đổi.** Backend vẫn lọc theo vai trò (NV chỉ thấy đơn được giao, Kho / Kế toán theo miền, Giám sát theo khu vực). Màn chung chỉ đổi cách hiển thị.
  - Cần thêm 1 API danh sách đơn chung: mở rộng `GET /tra-cuu/don-vi` nhận tham số giai đoạn và tự áp phạm vi NV / miền.
  - Cần thêm 1 API danh sách thùng chung.
- **Bảng Admin "Xử lý đơn" phức tạp nhất:** nhóm ×N, chọn hàng loạt, tuỳ biến cột, xử lý nhanh. Màn 2 sẽ lấy chính bảng này làm khung. Tab nào không có thao tác (VD "Tất cả" cho View) thì ẩn cột Hành động.
- **Link cũ** (`#/kho/dong-goi`, `#/ketoan/duyet`…, link phiếu trả gửi qua Zalo) phải chuyển tiếp sang màn mới + đúng tab, không được hỏng.
- **Số việc trên menu:** gom về 5 mục nên huy hiệu là tổng của các tab; chi tiết từng tab hiện ngay trên thanh tab.
- **Thay đổi lớn:** chia 3 đợt, mỗi đợt deploy và kiểm thử riêng.

### Thứ tự đề xuất (mỗi đợt 1 phiên bản)

1. **Phiếu trả** — dễ nhất, vì 5 màn đã dùng chung 1 API.
2. **Thùng hàng + Trang chủ / Tổng quan.**
3. **Đơn bảo hành + Quản trị.**
