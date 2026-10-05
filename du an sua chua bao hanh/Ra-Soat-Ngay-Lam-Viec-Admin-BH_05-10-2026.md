# Rà soát 1 ngày làm việc của Admin bảo hành (05/10/2026)

**Cách test:** chạy `wrangler dev` local với D1 riêng. Dữ liệu mô phỏng 1 ngày: 15 KTV, 26 thùng, 120 đơn
cha (84 đơn SL 1, 12 đơn SL 2, 4 đơn SL 3), tách ra **143 đơn vị**. Case lookup dùng stub (bản tạm) trả
đúng KTV. Đóng vai Admin BH bằng "Chế độ test", dùng màn hình desktop 1440px, đi hết luồng tới lúc gửi
duyệt kế toán. Mỗi bước đều đếm số click, số trường nhập và thời gian máy phản hồi.

## 1. Tốc độ + số bước nhập liệu từng luồng (hiện tại)

| Bước | Thao tác hiện tại | Click / trường nhập | Máy phản hồi | Ước tính thời gian người làm (120 đơn/ngày) |
|---|---|---|---|---|
| A. Tiếp nhận thùng từ Kho | Bấm từng thùng | 1 click/thùng, không nhập | ~150 ms | 26 thùng × ~8 s ≈ **3–4 phút** |
| B. Xác nhận số lượng thực nhận | Mở modal → Xác nhận | 2 click/đơn cha (84% không đổi gì) | ~0,35 s | 120 × ~6 s ≈ **12 phút** |
| C1. Phân loại bằng ⚡ FAST 1 chạm (Đổi mới/Trừ nợ/Huỷ không hàng) | ⚡ → chọn nút | 2 click/đơn vị | ~0,46 s | ~10 s/đơn vị |
| C2. ⚡ Sửa chữa | ⚡ → nút → chọn NV → Áp dụng | 5 click | | ~20 s/đơn vị |
| C3. ⚡ "… có phê duyệt" | ⚡ → nút → gõ mail PD → Áp dụng | 4 click + 1–2 ô gõ | | ~40 s/đơn vị |
| C4. Phân loại hàng loạt | Tick từng ô → Phân loại hàng loạt → 3 ô chọn → Áp dụng | N click tick + ~4 | 2,7 s / 72 đơn vị | 72 đơn vị ≈ 2–3 phút (chủ yếu là tick) |
| C5. Phân loại đầy đủ (1 đơn) | Mở → 3 ô chọn + ô tìm linh kiện → Lưu | ~7 click | | ~30 s |
| D. Xác nhận hoàn tất (sau NV sửa) | Mở chi tiết → Xác nhận → (Đổi mới: chọn xử lý xác) → đóng chi tiết | 4 click/đơn vị | ~1,4 s | 16 đơn vị ≈ **4 phút** |
| E1. Tự động gộp phiếu trả | 1 click + xác nhận | 2 | 2,5 s | 88 đơn vị → 18 phiếu, **< 1 phút** |
| E2. Hoàn thiện từng phiếu trả | Mở → gõ mã ĐH → gõ MISA → Lưu mã → Gửi duyệt → đóng | 6 click + 2 ô gõ/phiếu | ~3,2 s | 18 × ~45 s ≈ **13–14 phút** |

**Tổng thời gian thao tác thuần (chưa tính đọc/kiểm tra):** khoảng **65–75 phút/ngày** cho 120 đơn. Phần
lớn rơi vào B, C và E2. Máy phản hồi đều dưới 3 giây, nên chậm là do số click chứ không phải do hệ thống.

## 2. Bảng vấn đề → giải pháp

| # | Vấn đề | Mức | Giải pháp | Trạng thái |
|---|---|---|---|---|
| 1 | Danh sách đơn cha chờ xác nhận số lượng bị chặn ở 100 dòng, không có nút chuyển trang. 120 đơn thì 20 đơn bị ẩn (tiêu đề ghi "(100)") | Cao | Nâng giới hạn lên 1000 | ✅ Sửa v1.012 |
| 2 | Nút ⚡ "Từ chối" không hỏi lý do huỷ, nên backend luôn báo lỗi 400 và nút không dùng được | Cao | Form hỏi "Lý do huỷ" (danh mục Cài đặt) | ✅ Sửa v1.012 |
| 3 | Phân loại hàng loạt mặc định "Đổi trả", ghi đè đề xuất "Trừ công nợ" của KTV (19/72 đơn bị đổi sai) | Cao | Thêm lựa chọn mặc định "Theo đề xuất của KTV (từng đơn)" | ✅ Sửa v1.012 |
| 4 | Hàng loạt không tự gộp vào phiếu trả như ⚡ FAST, nên 2 đường cho kết quả khác nhau | TB | Hàng loạt gộp vào phiếu "Nhập" đúng KTV + loại đối trừ | ✅ Sửa v1.012 |
| 5 | "Lý do chậm" khi làm hàng loạt là ô gõ tự do, trong khi form lẻ chọn từ danh mục | TB | Đổi sang ô chọn danh mục | ✅ Sửa v1.012 |
| 6 | Phiếu trả: gõ mã rồi bấm "Gửi duyệt" mà chưa "Lưu mã" thì báo thiếu MISA, phiếu vẫn ở trạng thái Nhập (dễ mắc) | TB | "Gửi duyệt" tự lưu mã trước | ✅ Sửa v1.012 |
| 7 | Số "việc cần làm" của Admin tính cả đơn đang chờ KTV bổ sung | Thấp | Bỏ `cho_bo_sung_tt` khỏi số đếm | ✅ Sửa v1.012 |
| 8 | Top linh kiện 30 ngày chỉ tính đơn đã "xác nhận hoàn tất", bỏ sót toàn bộ đơn Đổi mới / Trừ nợ / Trả lại (dữ liệu thử: 16/131 đơn được tính) | Cao | Tính cả đơn đã tới bước trả hàng (trừ huỷ/chuyển kho) | ✅ Sửa v1.012 |
| 9 | Bảng thống nhất chưa có lọc / tìm / sắp xếp (theo KTV, linh kiện, trạng thái, SLA, thùng) | Cao | Thanh lọc + ô tìm + nhóm theo KTV / linh kiện | Đề xuất |
| 10 | Chưa có hàng loạt cho tiếp nhận thùng và xác nhận số lượng (84% SL không đổi) | Cao | "Tiếp nhận tất cả thùng đã chọn"; "Xác nhận SL = khai cho N đơn đã chọn" | Đề xuất |
| 11 | ⚡ FAST chỉ làm từng đơn; muốn "Đổi mới trong BH" cho 30 đơn phải bấm 60 lần | Cao | Thanh hàng loạt có sẵn các nút FAST (Đổi mới / Trừ nợ / Huỷ không hàng…) cho N đơn đã chọn | Đề xuất |
| 12 | Xác nhận hoàn tất: không có hàng loạt, xác nhận xong modal chi tiết vẫn mở | TB | Chọn nhiều → xác nhận; tự đóng chi tiết | Đề xuất |
| 13 | Cột "Khách hàng" trống, cột "Nguồn" hiện email chứ không hiện tên KTV, đề xuất đối trừ của KTV bị ẩn mặc định | TB | Lấy tên khách từ bản lưu case, tên KTV từ danh bạ; hiện cột đề xuất | Đề xuất |
| 14 | Cảnh báo hết hạn bảo hành chỉ hiện trong form phân loại đầy đủ; FAST / hàng loạt bỏ qua | TB | Badge "Hết BH" ngay trên dòng bảng (tính từ bản lưu case) | Đề xuất |
| 15 | Đổi mới qua FAST / hàng loạt không bao giờ ghi "xử lý xác" (trả đối tác / tiêu huỷ / lưu kho) | TB | Hỏi lựa chọn xử lý xác (mặc định theo cài đặt) ngay trong FAST / hàng loạt | Cần chốt nghiệp vụ |
| 16 | Danh sách phiếu trả không có cột số đơn; chưa nhập được mã cho nhiều phiếu trên 1 màn | Thấp | Thêm cột số đơn; màn "nhập mã nhanh" dạng bảng | Đề xuất |
| 17 | Thùng chờ tiếp nhận chỉ hiện email, không hiện tên KTV và số đơn | Thấp | Hiện tên + số đơn | Đề xuất |

## 3. Cảnh báo / chỉ dẫn đã có

- **Đã có:** badge SLA 3 mức, bấm vào để ghi lý do chậm; bắt nhập lý do chậm khi quá hạn; cảnh báo hết
  hạn BH (chỉ trong form đầy đủ); chặn thiếu NV / mail PD / MISA; báo sự cố tiếp nhận của Kho; cảnh báo
  "tạo thay" khi case lệch KTV.
- **Còn thiếu:**
  - cảnh báo hết hạn BH ngay trên bảng;
  - nhắc "còn N phiếu trả chưa nhập mã";
  - chỉ dẫn bước tiếp theo sau mỗi thao tác (ví dụ: "Đã chuyển 12 đơn vào phiếu TR-000005 → Mở phiếu").

## 4. Ước tính sau khi làm các đề xuất 9–13

| Bước | Hiện tại | Sau đề xuất |
|---|---|---|
| A. Tiếp nhận | 3–4 phút | ~1 phút (chọn tất cả → 1 click) |
| B. Xác nhận SL | ~12 phút | ~2 phút (hàng loạt, chỉ sửa đơn lệch) |
| C. Phân loại | ~25–30 phút | ~8–10 phút (lọc theo linh kiện/KTV → chọn tất cả → nút FAST hàng loạt) |
| D. Hoàn tất | ~4 phút | ~1 phút |
| E. Phiếu trả | ~14 phút | ~8 phút (gửi duyệt tự lưu đã có; thêm nhập mã dạng bảng) |
| **Tổng** | **~65–75 phút** | **~20–25 phút** |
