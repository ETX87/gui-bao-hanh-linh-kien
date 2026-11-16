# Phân tích luồng trừ công nợ sửa chữa cho NV sửa chữa (16/11/2026)

## 1. Yêu cầu (nguyên văn)

> phân tích luồng quy trình trừ công nợ sửa chữa cho nv sửa chữa:
> 1. sau khi kho cấp LK cho nv sửa chữa => nv sửa chữa sửa xong và bàn giao sản phẩm sau sửa cho kho hoặc trực tiếp ktv
> 2. Đồng thời sẽ giao xác lk đã sửa hoàn trả lk mới về cho admin bảo hành
> 3. Admin bảo hành sẽ xác nhận lk theo các trạng thái xác khác nhau
> 4. Hệ thống tự tạo đơn trừ công nợ sửa chữa trên app lk
> 5. Kế toán duyệt và trừ công nợ
> 6. Toàn luồng quy trình cần minh bạch và dễ quản lý, nv sửa chữa có thể tự quản lý các lk mình đã xử dụng, tình trạng đối từ công nợ hiện tại...

## 2. Đã có gì (đọc code + dữ liệu production 16/11/2026)

| Bước | Hiện trạng | Ở đâu |
|---|---|---|
| Cấp LK cho NV (công nợ ký gửi) | **Có.** Đơn "CÔNG NỢ SỬA CHỮA" bên app Đặt LK. Đơn được tạo từ app Đặt LK hoặc từ app này (đề xuất DX → đơn bên kia, v1.133). Kế toán duyệt, Kho xuất, NV xác nhận nhận hàng. Trạng thái đồng bộ về app này (`de_xuat.lk_buoc`). | linh-kien-app v1.495–v1.504; suachua v1.133 |
| NV sửa xong → bàn giao sản phẩm | **Có.** "Đã sửa xong" đẩy thẳng sang Kho (phiếu trả chờ Kho gửi). "✔ Đã bàn giao máy (kết thúc luôn)" bàn giao trực tiếp. | `nvSuaChua.ts` (v1.035, v1.101) |
| NV giao xác + trả LK mới chưa dùng cho Admin BH | **Chưa có.** NV không khai đã dùng bao nhiêu, xác giao chưa, còn dư bao nhiêu. | — |
| Admin xác nhận theo trạng thái xác | **Có 1 phần.** Màn Trả xác (v1.118, v1.137–v1.138) đã có xác sau sửa chữa + kết quả (vào thùng / tiêu huỷ / thất lạc / không có xác / trả ngoài). Nhưng xác sửa chữa đang **tự vào danh sách chờ gom ngay khi linh kiện giao xong**, trước cả khi NV sửa và giao xác thật. | `routes/xac.ts` |
| Tự tạo đơn trừ công nợ trên app LK | **Chưa có.** Bên linh-kien-app đã ghi rõ ở mục "Giai đoạn sau (CHƯA làm)": đơn "TIÊU HAO SỬA CHỮA" 0đ trừ kho ký gửi NV. | linh-kien-app CLAUDE.md |
| Kế toán duyệt, trừ công nợ | **Có sẵn khung.** Đơn trừ công nợ vào phiếu → Kế toán chốt → "Hàng trừ kho". | linh-kien-app |
| NV tự quản lý LK đang giữ / công nợ | **Chưa có** ở app này. App LK có màn tồn kho / công nợ của KTV. Nhưng chưa tách được "đã dùng cho đơn nào, xác giao chưa, chờ trừ hay đã trừ". | — |

**Số liệu production:**
- Chưa có đơn "CÔNG NỢ SỬA CHỮA" nào bên app LK.
- 62 đơn đang chờ NV sửa, mới 1 đơn NV tự nộp kết quả.
- 105 lần cấp linh kiện theo luồng cũ (Kho xuất theo PXK MISA, không ghi công nợ cho NV) trong tháng 11.

→ Luồng mới chưa có dữ liệu cũ phải chuyển đổi. Nên làm và chốt quy tắc **trước** khi NV bắt đầu đặt hàng công nợ.

**Đã chốt từ trước (linh-kien-app, 15/11/2026), giữ nguyên:**
- (2) Mốc trừ công nợ theo loại xử lý xác:
  - xác "Trả đối tác" → trừ khi thùng trả xác được Kế toán duyệt;
  - "Lưu kho / Tiêu huỷ" hoặc không có xác → trừ khi Admin BH xác nhận tiêu hao.
- (3) Linh kiện nhận mà không dùng hết → **bắt buộc trả kho** (đơn TRẢ HÀNG CÔNG NỢ).
- Chống trừ 2 lần: 1 dòng cấp chỉ trừ tối đa đúng số lượng đã nhận.

## 3. Luồng đề xuất

Đơn vị quản lý là **1 dòng cấp linh kiện**, tức 1 đề xuất DX = 1 đơn CÔNG NỢ SỬA CHỮA. Mỗi dòng có 4 con số: **Nhận – Dùng – Trả kho – Đã trừ**.

```
① Kho xuất → NV xác nhận nhận (app LK)                 → dòng: "Đang giữ"  (SL nhận)
② NV sửa xong, nộp kết quả (app này) + KHAI từng dòng:  SL đã dùng, SL dư trả lại, xác (giao Admin / không có xác)
                                                        → dòng: "Chờ Admin xác nhận"
③ Admin BH nhận xác + LK dư, xác nhận từng dòng:
     xác = Trả đối tác  → vào "Xác chờ gom" → thùng trả xác → KT duyệt thùng ─┐
     xác = Lưu kho / Tiêu huỷ / Không có xác ───────────────────────────────────┤
     xác = Thất lạc  → (chờ chốt câu hỏi Q1)                                     │
     SL dư           → hệ thống tạo đơn TRẢ HÀNG CÔNG NỢ (app LK) → Kho nhận lại │
④ Hệ thống tự tạo đơn "TIÊU HAO SỬA CHỮA" 0đ (app LK) cho SL đã dùng   ◄─────────┘
⑤ Kế toán chốt phiếu (app LK) → "Hàng trừ kho" → báo ngược về app này  → dòng: "Đã trừ công nợ"
```

**Bàn giao sản phẩm** (bước 1 của yêu cầu) giữ nguyên 2 nút sẵn có: "Đã sửa xong" → Kho; "Đã bàn giao máy (kết thúc luôn)" → trực tiếp KTV. Chỉ **thêm phần khai linh kiện** vào cùng form nộp kết quả. Đơn có linh kiện cấp mà chưa khai thì không cho nộp. Cả 4 kết quả đều phải khai, vì "Không sửa được" vẫn có thể đã dùng / làm hỏng linh kiện.

## 4. Minh bạch & tự quản lý (yêu cầu 6)

Màn mới **"🔩 Linh kiện của tôi"** (NV sửa chữa), Admin BH / Kế toán xem theo từng NV:

- Ô tổng: **Đang giữ** (đã nhận, chưa khai), **Chờ Admin xác nhận**, **Chờ trừ** (đơn tiêu hao chờ Kế toán / xác chờ thùng duyệt), **Đã trừ**, **Phải trả kho**, **Công nợ hiện tại** = Nhận − Đã trừ − Đã trả kho (SL + giá trị theo giá công nợ bên app LK).
- Bảng từng dòng cấp: mã DX / DDH, đơn bảo hành + case, linh kiện, Nhận / Dùng / Trả / Đã trừ, trạng thái xác, mã thùng xác, đơn tiêu hao, ngày từng mốc. Có lọc kiểu Excel + tải Excel.
- Cảnh báo:
  - giữ linh kiện quá N ngày mà đơn đã nộp kết quả chưa khai;
  - Admin chưa xác nhận quá 24h (vào hệ thống bước + SLA đang có);
  - linh kiện dư chưa trả kho.
- UI chi tiết đơn bảo hành: khối "🔩 Linh kiện cấp" hiện đủ 4 con số + trạng thái trừ công nợ từng dòng.

## 5. Thay đổi kỹ thuật (dự kiến)

**App này (suachua):**
- Migration: `de_xuat_linh_kien_bh` thêm `sl_nhan` (đồng bộ từ app LK), `sl_dung`, `sl_tra`, `xac_khai` (giao / khong_co), `nv_khai_luc`, `admin_xn_boi/luc`, `tieu_hao_ddh_id`, `tra_hang_ddh_id`, `tru_tt` (cho / da_tru / loi).
- Form nộp kết quả NV: bảng khai linh kiện. Màn Admin "Xác nhận linh kiện sửa chữa" (hàng loạt).
- **Sửa v1.137:** xác sau sửa chữa của luồng mới chỉ vào "Xác chờ gom" sau khi Admin xác nhận "Trả đối tác" (không tự vào khi linh kiện giao xong). Luồng cũ giữ như hiện tại.
- Cron 15 phút: gửi lệnh tạo đơn tiêu hao / trả hàng sang app LK (chống trùng theo mã DX + loại), kéo trạng thái về.

**App Đặt LK (linh-kien-app):**
- API `POST /suachua-partner/tieu-hao` và `/tra-hang`: tạo đơn 0đ, gắn với đơn cấp gốc, kiểm SL ≤ SL nhận − đã trừ − đã trả, tự vào phiếu. Kế toán chốt → "Hàng trừ kho" (khung có sẵn).
- Trạng thái về app này qua `GET /don-sc` sẵn có (thêm trường đơn tiêu hao / trả hàng).

**Chia giai đoạn:**
- **GĐ1:** NV khai + Admin xác nhận + màn "Linh kiện của tôi" — chỉ app này, dùng được ngay để theo dõi.
- **GĐ2:** tự tạo đơn tiêu hao / trả hàng bên app LK + đồng bộ "Đã trừ".
- **GĐ3:** cảnh báo + báo cáo công nợ NV.

## 6. Câu hỏi cần chốt trước khi làm

- **Q1. Xác thất lạc** (NV / Admin làm mất xác): vẫn trừ công nợ NV như tiêu hao (ghi nhận vi phạm), hay KHÔNG trừ, NV tiếp tục chịu công nợ đến khi xử lý?
- **Q2. "Đã trả ngoài hệ thống"**: tính như trả đối tác thành công (trừ ngay khi Admin xác nhận)?
- **Q3. Xác "Trả đối tác"**: giữ quyết định cũ (chỉ trừ khi thùng xác được Kế toán duyệt, có thể chậm vài tuần), hay trừ ngay khi Admin xác nhận đã nhận xác (thùng xác chỉ là việc của Admin với nhà máy)?
- **Q4. Ai khai SL dùng**: NV khai lúc nộp kết quả, Admin xác nhận / sửa (đề xuất); hay Admin khai luôn?
- **Q5. Luồng cấp cũ** (Kho xuất theo PXK, không ghi công nợ NV — 105 lần trong tháng 11): ngừng hẳn cho đơn mới, chỉ dùng CÔNG NỢ SỬA CHỮA?
- **Q6.** Câu diễn giải MISA cho đơn tiêu hao / trả hàng (Kế toán chốt) — câu hỏi còn mở từ linh-kien-app.
