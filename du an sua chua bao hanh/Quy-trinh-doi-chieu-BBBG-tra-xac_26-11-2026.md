# Logic & quy trình xử lý Biên bản bàn giao (BBBG) trả xác — 26/11/2026

> Nguồn: đợt đối chiếu BBBG "Trả xác LK về KAROFI 18-11" (511 xác, 55 mã hàng) với dữ liệu thật app.
> Kết quả + script: thư mục `Doi-chieu-BBBG-tra-xac-KAROFI_18-11/` (file JSON dữ liệu thật KHÔNG đưa lên repo).
> Yêu cầu nguyên văn: *"tách các mã "MYC" thành từng ID rồi gắn với linh kiện trả tại cột B rồi đối chiếu với data thật để đánh giá"*,
> *"tôi cần logic và cách xử lý sau này"*.

## 1. Nguyên tắc (logic gốc)

| # | Nguyên tắc | Lý do |
|---|---|---|
| 1 | **App là nguồn duy nhất.** BBBG là bản in ra TỪ thùng trả xác `TX-…` trên app, không lập tay rồi mới nhập. | Xác lập tay không vào thùng → nằm mãi ở "Xác chờ gom", Kế toán không duyệt được, dễ gom trùng. |
| 2 | **1 xác = 1 mã xác app** (`DH-…-n` xác Đổi mới, `DX-…` xác sau cấp LK sửa chữa). Mã case / Lada chỉ để tham khảo. | 1 case có thể có nhiều đơn vị (VD `SC261026817` có 6 nguồn) — đếm theo case thì không phân biệt được. |
| 3 | **Mã hàng trên BBBG = mã B** (linh kiện thực tế gửi về), không phải mã A (khai lúc gửi) hay C (đổi mới). | Quản lý xác của app tính theo B. Xác thật khác B → Admin BH sửa B trên đơn vị TRƯỚC khi gom (sửa được bất cứ lúc nào). |
| 4 | **Mỗi dòng BBBG = 1 mã hàng**, không gộp ô, không ghi chú "trong đó có mã khác". | Dòng Nguồn xung 168 cái thực tế chứa 4 mã (`2009010118` ×150, `…099` ×8, `…161` ×6, `…124` ×4). |
| 5 | **1 thùng TX = 1 miền + 1 đối tác** (luật đã có). Case thuộc đối tác khác (NSKX…) không được nằm trong BBBG KAROFI. | Đối soát công nợ / trả xác theo từng đối tác. |
| 6 | Xác chỉ được tính "đã trả" khi **Kế toán duyệt thùng** (`da_duyet`). | Có người chịu trách nhiệm đối chiếu Mã EO. |

## 2. Logic ghép 1 dòng BBBG với 1 xác app (dùng khi phải đối chiếu file lập tay)

Đầu vào mỗi dòng: `mã case/Lada` + `mã hàng`. Mỗi xác app chỉ được ghép 1 lần.

1. Tìm mọi xác của case (đơn vị Đổi mới + đề xuất cấp LK sửa chữa). Không có → **Không có trong app**.
2. Ưu tiên ghép xác có **mã B = mã hàng**; không có thì ghép theo **mã A hoặc C** (ghi rõ "khớp theo A/C"); vẫn không có thì lấy 1 đơn vị còn lại của case → **Lệch mã LK**; hết đơn vị → **Thừa**.
3. Trong các ứng viên, ưu tiên xác "Đổi mới + Trả đối tác + chưa xử lý" trước.
4. Xếp kết luận theo trạng thái xác được ghép:

| Kết luận | Điều kiện | Cách xử lý |
|---|---|---|
| ✅ Khớp – đang chờ gom | Đúng B, Đổi mới / Trả đối tác, chưa vào thùng, chưa có kết quả | Đưa vào thùng TX |
| 🟩 Khớp theo A/C | Đúng case, mã hàng = A hoặc C | Kiểm xác thật: đúng như BBBG → **sửa B** trên app; đúng như app → sửa BBBG. Rồi đưa vào thùng |
| ❌ Lệch mã LK | Đúng case, mã khác cả A/B/C | Mở thùng kiểm xác thật → sửa B hoặc rút xác khỏi BBBG |
| 🟨 Đã xử lý ngoài | `xac_tt = ngoai` (đơn trước 01/11/2026) | Thật sự trả đợt này → "Đưa lại chờ gom" rồi gom; không thì bỏ khỏi BBBG |
| ❌ Không phải xác trả | Đơn Từ chối / Xác nhận trừ nợ / xử lý xác ≠ Trả đối tác | Rút xác khỏi thùng (không thuộc diện trả nhà máy), hoặc Admin BH sửa hướng xử lý nếu app ghi sai |
| ❌ Thừa / Không có trong app | Case hết đơn vị / không tìm thấy | Rút xác, hoặc tạo đơn bổ sung nếu là xác thật hợp lệ |
| ⚠ App có – BBBG thiếu | Xác chờ gom của case trong BBBG nhưng không có dòng nào | Kiểm kho: còn → để đợt sau; đã gửi mà quên ghi → bổ sung vào thùng |

## 3. Quy trình chuẩn sau này (mỗi đợt trả xác)

| Bước | Ai | Làm gì trên app |
|---|---|---|
| 1 | (tự động) | Đơn vị Đổi mới có xử lý xác "Trả đối tác" (và LK sửa chữa đã xuất) tự vào **Trả xác › Xác chờ gom**. |
| 2 | Admin BH / Trả xác | Định kỳ (đề xuất: cuối tuần hoặc khi đủ hàng — **mở**, chờ chốt), lọc chờ gom theo **đối tác + miền**, tạo thùng TX nháp. |
| 3 | Admin BH / Trả xác | Đóng kiện thật: **đưa từng xác vào thùng TX theo mã xác** (tick trên app hoặc Import Excel cột "Mã xác" + "Vào thùng"). Xác cầm trên tay khác mã B → sửa B trước. Xác không tìm thấy → ghi kết quả "Thất lạc / Không có xác". |
| 4 | Admin BH / Trả xác | Nhập **Mã EO**, ghi chú số kiện → **Gửi Kế toán**. |
| 5 | Kế toán | Đối chiếu Mã EO + danh sách xác → **Duyệt** (hoặc Trả lại có lý do). |
| 6 | Admin BH / Trả xác | Lập **BBBG từ danh sách xác của thùng đã duyệt** (mục "Tổng hợp LK" trong chi tiết thùng) → ký Người lập / Giao vận / Nhà máy → giao hàng. Hiện app CHƯA có nút tải BBBG riêng cho 1 thùng — xem §5. |

Không được: lập BBBG tay trước rồi mới nhập app; gộp nhiều mã hàng 1 dòng; ghi mã case thay mã xác; trộn đối tác trong 1 thùng.

## 4. Xử lý đợt 18/11 và tồn đọng (chuyển tiếp)

Kết quả đối chiếu 511 xác (D1 thật, 26/11/2026): **467** khớp · **15** khớp theo A/C · **16** lệch mã · **9** đã xử lý ngoài ·
**3** đơn trừ nợ · **1** thừa · **13** xác app có mà BBBG thiếu. Case khác đối tác: `SC2611050219` (NSKX).

1. Kiểm 29 xác đỏ / vàng (file `Doi-chieu-…xlsx`, sheet "Chi tiet 511 xac") + 13 xác thiếu → sửa B / đưa lại chờ gom / rút khỏi danh sách.
2. Lấy cột "Mã xác app" của các dòng đã chốt → Import Excel (Kết quả = Vào thùng, Mã thùng = MOI) → 1 thùng TX KAROFI miền Bắc → nhập Mã EO → gửi Kế toán.
3. Tồn đọng: còn **799** xác KAROFI miền Bắc chờ gom không có trong BBBG (614 đơn tạo trước 18/11) → kiểm kho, gom ở đợt sau theo quy trình §3.

## 5. Đề xuất bổ sung app (làn thường — **mở**, chờ Giám đốc duyệt)

1. Nút **"Tải BBBG"** trong chi tiết thùng TX: sheet 1 đúng mẫu công ty (tổng hợp theo mã B, 1 mã 1 dòng, đối tác / miền / Mã EO / mã TX / chữ ký); sheet 2 mỗi xác 1 dòng (mã xác, case, mã B, kiện).
2. Trường **số kiện** cho từng xác trong thùng (thay cột "Số Thùng" gộp ô).
3. **Import BBBG theo mã case + mã hàng**: app ghép tự động theo logic §2, hiện bảng xem trước theo kết luận, chỉ đưa vào thùng các dòng "Khớp" — thay cho việc chạy script tay như đợt 18/11.
