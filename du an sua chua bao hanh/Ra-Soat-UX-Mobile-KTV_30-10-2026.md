# Rà soát giao diện mobile cho KTV hiện trường (30/10/2026)

Yêu cầu: *"giao diện cho mobile ktv tôi thấy nó khó nhìn, khó nắm bắt nội dung cần xử lý. Với vai trò 1 KTV đi ngoài
đường => kiểm tra từng giao diện công việc, thực hiện các nhiệm vụ 1 cách đơn giản hiệu quả với vài click. dễ xác định
tôi cần làm cái gì, đã làm cái gì, nhanh chóng quản lý được cái tôi đã làm, cần phải làm. Giao diện thân thiện, gọn gàng
=> nghiên cứu các giao diện gửi hàng bảo hành phù hợp cho KTV hiện trường => phân tích => so sánh với giao diện hiện tại
=> đưa ra vấn đề => phản biện"*

## Cách kiểm tra

- Bản v1.047 chạy local, khung 375×812, đăng nhập là KTV "Nguyễn Văn An".
- Dữ liệu giống 1 KTV thật:
  - 7 đơn Odoo chờ gửi, 1 đơn đã hủy;
  - 1 thùng nháp có 2 đơn, 1 thùng đang trên xe;
  - 2 thùng Kho đã nhận, trong đó có 1 đơn Admin yêu cầu bổ sung (đã quá hạn 30h), 1 đơn đang sửa và 1 đơn chờ phân loại;
  - 1 phiếu trả đang gửi về.
- Đóng vai KTV đi lần lượt các màn: Trang chủ → Gửi hàng → chi tiết thùng → Thêm đơn → Tiến độ → Nhận hàng.

## Người dùng: KTV ngoài hiện trường

- Thao tác 1 tay, đứng ngoài nắng, mạng chập chờn, xen giữa các ca sửa.
- Nhớ đơn theo tên khách và địa chỉ, không nhớ theo mã case `anv.dvkh-1001052201-88121`.
- Chỉ có 3 câu hỏi khi mở app:
  1. Hôm nay tôi phải làm gì?
  2. Hàng tôi gửi đang ở đâu?
  3. Có gì về cho tôi chưa?

## Mẫu giao diện tham khảo (các app hiện trường / gửi hàng phổ biến)

| Mẫu | Ví dụ | Điểm áp dụng được |
|---|---|---|
| Tab theo trạng thái, mỗi tab có số | Shopee/Lazada người bán: Chờ xác nhận · Chờ lấy hàng · Đang giao · Đã giao · Trả hàng | Trạng thái là **tab**, không phải bộ lọc |
| 1 thẻ = 1 việc + 1 nút chính to ở cuối thẻ | App tài xế GHN, GHTK, Grab | Không cần mở chi tiết mới làm được việc |
| Màn "Hôm nay" chỉ hiện việc kế tiếp | Jobber, ServiceTitan (field service) | Việc gấp nhất lên đầu, thông tin khách trước mã |
| Dòng tiến trình ngắn kiểu theo dõi kiện hàng | Theo dõi đơn Shopee / GHN | "Đã gửi → Kho nhận → Đang sửa → Đang trả về" bằng lời của người dùng |
| Chọn thay vì gõ | Quét mã, chọn từ danh sách gần đây | Không bắt gõ chuỗi mã dài trên điện thoại |

## So sánh với giao diện hiện tại — 11 vấn đề

| # | Vấn đề | Bằng chứng | Mức |
|---|---|---|---|
| 1 | Trang chủ nói 1 việc 3 lần: thẻ xanh "Bạn có 10 việc", khối "Cảnh báo đơn tồn", lưới "Tổng quan hàng đợi". Có chữ kỹ thuật "TB —", "giờ SLA, không tính Chủ nhật". | Trang dài 1.132px, khoảng 1,5 màn hình, nội dung lặp | Cao |
| 2 | **Không có chỗ xem "đã làm"**. Tiến độ chỉ liệt kê đơn đã được Admin tách. Đơn trong thùng nháp và thùng đang trên xe không có ở đâu cả. | 10 đơn thật, Tiến độ chỉ hiện 7, mất 4 đơn của 2 thùng KTV vừa gửi | **Nghiêm trọng** |
| 3 | Việc gấp không lên đầu. Trang chủ xếp theo số lượng (7 đơn Odoo trước). Đơn Admin chờ bổ sung, quá hạn 30h, nằm thứ 4/7 trong Tiến độ, lẫn với đơn đã xong. | Đo vị trí trong danh sách | Cao |
| 4 | Ngôn ngữ nội bộ: "Sẵn sàng gộp phiếu trả", "Loại đối trừ đề xuất", "Mã MISA", "Miền", "Gửi về kho miền", trạng thái Odoo "Mới", huy hiệu SLA "18h". | Màn Tiến độ, chi tiết thùng, Nhận hàng | Cao |
| 5 | Mã đứng trước người: thẻ đơn Odoo hiện mã đơn và mã case dài lên đầu, **không có tên khách**. Tên linh kiện bị cắt "(12010…". | Màn Gửi hàng | Cao |
| 6 | Màn Gửi hàng trộn 2 danh sách. 7 thẻ đơn Odoo ở trên, thùng của tôi nằm dưới ~1.000px. Nút đỏ "Hủy đơn lỗi" trên mọi thẻ, ngang tầm ô chọn. Thùng nháp không nói còn thiếu bước gì. | Trang dài 2.135px | Cao |
| 7 | Bộ lọc kiểu máy tính chiếm nửa màn đầu: 3–4 ô chọn (Miền, Người tạo phiếu, Hình thức gửi…), trong khi KTV chỉ có vài chục đơn. | Gửi hàng, Tiến độ, Nhận hàng | Trung bình |
| 8 | Chi tiết thùng: 6 ô vận chuyển ở đầu, danh sách đơn ở cuối (cuộn ~1.400px). 2 nút lưu trùng nhau ("Lưu nháp" / "Lưu nháp, gửi sau"). Nhật ký trống vẫn chiếm chỗ. | Thùng nháp BH-000001 | Trung bình |
| 9 | Nhận hàng: thẻ phiếu không nói bên trong có gì. Chi tiết mở bảng 9 cột của Admin, phải cuộn ngang. Nút "Xác nhận đã nhận" nằm cuối. | Phiếu TR-000001 | Trung bình |
| 10 | Mã case phải gõ tay chuỗi ~25 ký tự, không chọn được từ case gần đây. | Form Thêm đơn | Trung bình |
| 11 | Thanh dưới dành 1/5 chỗ cho "Lịch sử" (ít dùng). Nút "Thoát" nổi bật ở góc trên, dễ bấm nhầm. | Thanh menu | Thấp |

Điểm tốt nên giữ:
- Thẻ thay bảng trên mobile.
- Form "Thêm đơn" riêng cho mobile: nút +/- to, ô chụp ảnh lớn.
- Đơn Odoo điền sẵn ca / linh kiện / số lượng. Từ đơn Odoo tới thùng đã gửi chỉ mất ~4–5 chạm.
- Tự nhớ cách giao hàng, tự xoá thùng rỗng.

## Phản biện

- **Số lần bấm không phải vấn đề chính.** Luồng Odoo → thùng → gửi xe chỉ 4–5 chạm. Cái khó là **định hướng**: không biết
  việc nào gấp, không thấy hàng của mình đang ở đâu. Sửa phải nhắm vào sắp xếp và hiển thị trạng thái, không phải bớt bước.
- **Vấn đề 2 không chỉ là giao diện.** API tra cứu của KTV chỉ trả đơn đã tách. Phải sửa cả backend, gộp thêm đơn trong thùng
  nháp và thùng đang gửi.
- **Cảnh báo đơn tồn** (làm 12/10/2026) được yêu cầu cho mọi vai trò, không nên bỏ hẳn. Với KTV, chỉ cần gắn nhãn "quá hạn"
  ngay trên thẻ việc, bỏ khối riêng và phần chú thích kỹ thuật.
- **Nhãn theo góc nhìn KTV.** Chi tiết đơn đang dùng chung với Admin. Nếu viết 2 bộ nhãn riêng dễ bị lệch nhau. Nên làm 1 hàm
  "trạng thái theo góc nhìn KTV" quy ~20 trạng thái nội bộ về 5–6 câu dễ hiểu (Chưa gửi / Đang trên xe / Kho đã nhận /
  Đang xử lý / Cần bạn bổ sung / Đang trả về / Đã nhận).
- **Mã case vẫn cần** khi gọi tổng đài / CRM. Hạ xuống dòng phụ có nút sao chép, không bỏ.
- **Tách Odoo và thùng thành 2 tab** có thể khiến KTV quên đơn Odoo. Cần giữ số đếm trên tab và đưa vào danh sách "Việc của
  tôi" ở trang chủ.
- **Bộ lọc vẫn có ích** với KTV lớn (50+ đơn/tháng). Không bỏ, mà thu vào 1 nút "Lọc" bên cạnh ô tìm.
- **Tránh vỡ giao diện máy tính.** Bảng, thẻ, chi tiết đang dùng chung cho mọi vai trò. Nên làm các màn KTV mobile riêng (giống
  cách đã làm `AddDonMobileSheet`), không sửa thẳng component chung.
- **Ngoài phạm vi:** chế độ offline thật (lưu thao tác khi mất mạng) cần đánh giá riêng, không gộp vào vòng này.

## Hướng đề xuất — ĐÃ LÀM ĐỦ 7 ở v1.048 (30/10/2026)

1. **Trang chủ KTV = "Việc của tôi"**: 1 danh sách thẻ xếp theo độ gấp.
   - Thứ tự: cần bổ sung → hàng về chờ nhận → thùng nháp chưa gửi → đơn Odoo mới.
   - Mỗi thẻ có tên khách, linh kiện và 1 nút làm ngay.
   - Bên dưới là "Đang theo dõi": các thùng / đơn đang đi, mỗi cái kèm dòng tiến trình ngắn.
2. **Thanh dưới 4 tab**: Việc của tôi · Gửi hàng · Đơn của tôi · Nhận hàng.
   - "Đơn của tôi" có 2 tab con: Đang xử lý / Đã xong, gồm cả đơn chưa tách.
   - Lịch sử Serial / Case chuyển vào ô tìm của "Đơn của tôi".
3. **Gửi hàng** tách 2 tab: "Đơn Odoo mới (7)" và "Thùng của tôi". Thùng nháp ghi rõ việc còn thiếu (VD "Còn 1 bước: xác nhận
   đã gửi xe"). "Hủy đơn lỗi" chuyển vào menu ⋯ của thẻ.
4. **Chi tiết thùng**: danh sách đơn lên đầu; thông tin vận chuyển thu gọn 1 dòng, bấm mới mở form; 1 nút lưu; nút chính
   dính đáy màn hình.
5. **Nhận hàng**: thẻ hiện ngay danh sách linh kiện + khách bên trong, nút "Đã nhận" ngay trên thẻ, bỏ bảng 9 cột.
6. **Thêm đơn**: chọn mã case từ các đơn Odoo / case gần đây, hoặc dán, thay vì gõ.
7. **Nhãn trạng thái theo góc nhìn KTV** dùng chung ở mọi màn KTV. Ẩn Miền, MISA, SLA, "loại đối trừ" với KTV, hoặc đổi tên dễ
   hiểu.
