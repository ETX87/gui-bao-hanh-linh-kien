# Rà soát luồng quy trình & thông tin nhập liệu — Module Sửa chữa bảo hành

**Mục đích tài liệu này:** trình bày lại toàn bộ hiểu biết hiện tại của tôi về quy trình, theo đúng
thứ tự thao tác thực tế và đúng tên trường sẽ nhập, để bạn tự đối chiếu và chỉ ra chỗ nào còn sai —
**không phải** tài liệu kỹ thuật (schema/route ở `Ke-hoach-Trien-khai_Quan-ly-Sua-chua-Bao-hanh.md`,
**tôi chưa cập nhật file đó** vì còn vài điểm ở mục 13 dưới đây cần bạn chốt trước, tránh phải thiết
kế lại bảng 2 lần). Chỗ nào tôi đang **suy luận/giả định** đánh dấu 🟡.

**Bản này đã gộp toàn bộ góp ý vòng 2** (phân miền, kho chỉ nhận thùng, phân loại trong/ngoài bảo
hành, phiếu trả tách theo KTV, upload ảnh lên Drive, luồng trả xác...).

---

## 1. Các vai trò tham gia

| Vai trò | Cờ trong hệ thống | Việc chính trong luồng này |
|---|---|---|
| KTV / CTV / Trạm | `la_ktv_dvbh` / `la_ve_tinh` (đã có) | Tạo phiếu gửi hàng, thêm dòng linh kiện lỗi, xác nhận đã gửi, xác nhận nhận hàng trả |
| Kho / điều vận tiếp nhận | `la_kho` (đã có) | Tiếp nhận **thùng hàng vật lý** (không mở kiểm từng linh kiện), đóng gói phiếu trả theo miền mình phụ trách |
| Admin bảo hành | `la_admin_bh` (**mới**) | Phân loại từng dòng LK, xác nhận trong/ngoài bảo hành, xác nhận hoàn tất sau khi NV sửa xong, tạo phiếu trả theo KTV, xử lý trả xác |
| NV sửa chữa (SCVP) | `la_nv_sua_chua` (**mới**) | Chẩn đoán, đề xuất linh kiện, chụp ảnh báo cáo, cập nhật kết quả — **không tự đóng ticket**, luôn phải qua Admin bảo hành xác nhận |
| Kế toán | `la_ke_toan` (đã có) | Duyệt đối soát trước khi gửi trả |

---

## 2. Phân miền Nam / Bắc — áp dụng xuyên suốt cả module

- Mỗi **Giám sát (GS)** được gán 1 miền (`Nam` hoặc `Bắc`).
- **KTV/CTV/Trạm** thừa hưởng miền theo GS phụ trách mình (hệ thống đã có sẵn quan hệ 1-1 này ở
  `users.giam_sat_quan_ly` — không cần thêm bảng mới, chỉ cần gắn thêm "miền" cho GS).
- **Kho** và **Admin bảo hành** cũng được gán miền riêng (trực tiếp trên tài khoản từng người). **NV
  sửa chữa** cũng có miền riêng nhưng **không có quyền tiếp nhận trái miền** (xem dưới).
- Mặc định mỗi người chỉ thấy hàng đợi thuộc miền mình. Có 1 **filter "Xem toàn quốc"** (tắt mặc định)
  để chủ động thấy đơn miền khác khi cần hỗ trợ (ví dụ KTV gửi nhầm hàng ra miền khác).
- **Số đếm "cần xử lý" luôn tính theo miền hiện tại của đơn**, không phụ thuộc người xem có bật filter
  toàn quốc hay không.
- ✅ Đã xác nhận: **chỉ Kho và Admin bảo hành** có quyền "tiếp nhận trái miền" — khi họ thực sự xử lý 1
  đơn thuộc miền khác (qua filter toàn quốc), đơn đó **đổi hẳn sang miền của người xử lý** từ đó về
  sau. **NV sửa chữa không có quyền này** — chỉ làm việc trong đúng miền đã được gán cho dòng.

---

## 3. Luồng tổng quát (đã cập nhật)

```
[KTV] Tạo phiếu gửi hàng (Nháp, thuộc miền theo GS của KTV)
      → thêm 1..N dòng linh kiện/sản phẩm lỗi vào phiếu
      → Xác nhận đã gửi xe (hệ thống hỏi lại "Ngày gửi xe", mặc định = lúc bấm, có thể sửa)
                    ↓
[Kho - đúng miền, hoặc miền khác nếu được đánh dấu cần hỗ trợ]
      Tiếp nhận THÙNG HÀNG vật lý — chỉ đối chiếu số kiện/thùng, KHÔNG mở kiểm từng linh kiện
      → lúc này thông tin vận chuyển ở header mới bị khoá lại
                    ↓ (từng dòng LK trong phiếu bắt đầu chạy trạng thái riêng)
[Admin bảo hành - đúng miền] Với từng dòng LK:
   a) Xác nhận Trong bảo hành / Ngoài bảo hành
      - Ngoài bảo hành → nhập thêm: thông tin mail phê duyệt + mã phê duyệt (nếu có)
   b) Chọn hướng xử lý: Sửa chữa (gán NV) / Đổi mới / Từ chối-Huỷ / Chuyển kho
                    ↓
[NV sửa chữa - đúng miền] (chỉ khi hướng xử lý = Sửa chữa) Chẩn đoán → 1 trong 4 kết quả
   ├─ Không lỗi     → trả nguyên trạng
   ├─ Sửa được      → đề xuất linh kiện + ảnh báo cáo → Admin BH duyệt + nhập mã MISA → sửa xong
   ├─ Đề xuất đổi mới → Admin BH duyệt riêng → chuyển hướng Đổi mới
   └─ Trả xác        → mở luôn 1 "Phiếu trả xác" (mục 9)
      NV KHÔNG tự đóng ticket — luôn nộp kết quả lên, chờ Admin bảo hành xác nhận hoàn tất.
                    ↓
[Đổi mới HOẶC Sửa chữa có thay linh kiện] → tự mở 1 "Phiếu trả xác" song song (mục 9)
                    ↓
[Admin bảo hành] Xác nhận hoàn tất xử lý dòng này
                    ↓
[Admin bảo hành] Gom các dòng đã xong của CÙNG 1 KTV thành 1 hoặc nhiều "Phiếu trả bảo hành"
      (1 KTV có thể có nhiều phiếu trả cùng lúc, tách theo cách Admin bảo hành phân loại hàng hoá)
                    ↓
[Kho] Đóng gói theo từng phiếu trả — nhập mã vận đơn
                    ↓
[Kế toán] Duyệt đối soát (đối chiếu mã MISA) → cho phép gửi
                    ↓
[KTV] Xác nhận nhận hàng trả → (không nhận được → mở khiếu nại vận chuyển)
```

---

## 4. Bước 1 — KTV tạo phiếu gửi hàng (header)

Không đổi so với bản trước — xem lại nhanh:

| Trường | Bắt buộc? | Nguồn |
|---|---|---|
| Ngày tạo | Tự động | Hệ thống |
| Ngày gửi xe (dự kiến) | Có | Nhập tay lúc tạo — **sẽ được hỏi lại ở bước xác nhận gửi, xem mục 6** |
| Hình thức gửi | Có | Chọn: Xe nội bộ / Giao vận ngoài |
| Mã xe/tài xế **hoặc** Đơn vị vận chuyển + Mã vận đơn | Tuỳ hình thức | Nhập tay |
| Ghi chú vận chuyển | Không | Nhập tay |

Miền của phiếu = miền của KTV tạo (suy ra từ GS phụ trách).

---

## 5. Bước 2 — Thêm từng dòng linh kiện/sản phẩm lỗi vào phiếu

| Trường | Bắt buộc? | Nguồn |
|---|---|---|
| Mã ID sự cố (case) | Có — nhập trước tiên | Chọn từ case có sẵn (`case_dvbh.id`) → tự lấy khách hàng, hãng, sản phẩm bảo hành, serial, khu vực, KTV phụ trách |
| Linh kiện cần sửa (hoặc sản phẩm) | Có | Chọn từ danh mục `linh_kien` dùng chung với Đặt mua linh kiện (có thể là mã "chỉ dùng bảo hành") |
| Mô tả tình trạng lỗi | Có | Nhập tay |
| Ảnh lỗi | Không | **Upload trực tiếp** (không còn dán link tay) — xem mục 8 |
| Ghi chú | Không | Nhập tay |

---

## 6. Bước 3 — Xác nhận đã gửi xe (cập nhật chi tiết)

- KTV bấm "Xác nhận đã gửi xe" khi hàng thực sự rời trạm.
- Hệ thống **hỏi lại "Ngày gửi xe"** ngay lúc đó — ô này **mặc định điền theo đúng thời điểm bấm**
  (không phải ngày đã nhập lúc tạo phiếu).
- KTV có thể **sửa lại** ngày này nếu muốn (ví dụ xác nhận trễ so với lúc xe đi thật).
- Nếu KTV **huỷ hộp thoại này** (không xác nhận lại) → hệ thống **giữ nguyên ngày gửi xe đã nhập từ
  lúc tạo phiếu ban đầu**, không ghi đè bằng thời điểm bấm.
- Sau khi xác nhận: phiếu chuyển **Đã gửi**. Thông tin vận chuyển **vẫn sửa được** cho tới khi Kho xác
  nhận tiếp nhận (mục 7) — khớp với hiểu biết trước, bạn đã xác nhận đúng.

---

## 7. Bước 4 — Kho tiếp nhận (chỉ ở mức thùng hàng)

**Quan trọng:** Kho **không mở thùng kiểm từng linh kiện** — chỉ xác nhận **số kiện/thùng vật lý**
nhận được so với số đã khai.

| Trường | Bắt buộc? | Nguồn |
|---|---|---|
| Mã tra cứu | Có | Quét QR hoặc gõ tay |
| Số kiện/thùng khai báo | Hiển thị sẵn | Lấy từ phiếu |
| Số kiện/thùng thực nhận | Có | Kho nhập tay khi kiểm đếm |
| Ghi chú lệch (nếu có) | Tuỳ | Nhập tay |

Từ đây, thông tin vận chuyển ở header bị khoá; từng dòng LK trong phiếu chính thức vào hàng đợi xử lý
của Admin bảo hành.

---

## 8. Bước 5 — Admin bảo hành xử lý từng dòng

**a) Phân loại Trong bảo hành / Ngoài bảo hành**

| Trường | Bắt buộc? | Nguồn |
|---|---|---|
| Trong bảo hành / Ngoài bảo hành | Có | Chọn 1 trong 2 |
| Thông tin mail phê duyệt | Có, nếu chọn Ngoài bảo hành | Nhập tay (email/tham chiếu phê duyệt đã xin ngoài hệ thống) |
| Mã phê duyệt | Không bắt buộc, chỉ nếu có | Nhập tay |

✅ Đã xác nhận: phê duyệt "ngoài bảo hành" xảy ra ngoài hệ thống, Admin bảo hành chỉ ghi lại bằng
chứng — không có hàng đợi duyệt trong app.

**Bổ sung 2026-08-17 — cảnh báo hết hạn bảo hành:** mỗi mã linh kiện có `so_thang_bao_hanh` (12/24/36
tháng...) + phân loại máy/linh kiện lẻ. Hệ thống so sánh (thời điểm tiếp nhận sự cố − ngày mua theo
case) với số tháng này — nếu vượt, hiện cảnh báo "Linh kiện/Sản phẩm này đã hết thời gian bảo hành", và
**bắt buộc nhập thông tin duyệt + mã duyệt** (dùng đúng 2 ô mail/mã phê duyệt ở trên) nếu Admin bảo
hành vẫn muốn xử lý tiếp. ✅ Đã xác nhận: "Thời điểm tiếp nhận sự cố" = mốc CSKH tiếp nhận yêu cầu từ
khách ban đầu (`case_dvbh.thoi_gian_cskh_tiep_nhan`), không phải lúc Kho nhận thùng hàng ở module này.

**b) Chọn hướng xử lý** (áp dụng cho cả 2 loại trong/ngoài bảo hành ở trên):

| Hướng xử lý | Bước tiếp theo |
|---|---|
| Sửa chữa | Gán 1 NV sửa chữa (`la_nv_sua_chua`) → mục 9 |
| Đổi mới | Xuất linh kiện/sản phẩm mới → tự mở Phiếu trả xác (mục 10) |
| Từ chối / Huỷ | Kết thúc, không xử lý |
| Chuyển kho | Kết thúc, nhập kho lại |

---

## 9. Bước 6 — NV sửa chữa chẩn đoán (chỉ khi hướng xử lý = Sửa chữa)

| Kết quả chẩn đoán | Trường cần nhập thêm |
|---|---|
| Không lỗi | (không cần thêm) |
| Sửa được | Nếu cần vật tư (dây điện, cút nối...) → mở ticket "Đề xuất xuất linh kiện" riêng, xem mục 9.1 |
| Đề xuất đổi mới | Chờ Admin bảo hành duyệt riêng |
| Trả xác | Tự mở Phiếu trả xác ngay (mục 10) |

### 9.1. Đề xuất xuất linh kiện (vật tư sửa chữa) — ticket độc lập, KHÔNG phải "linh kiện lỗi cần thay"

**Sửa lại hiểu biết trước:** đây không phải 1 trường trong lúc chẩn đoán, mà là **1 ticket riêng, tách
khỏi dòng sửa chữa chính**. Ví dụ: NV sửa dây điện/cút nối cần dùng để thao tác sửa chữa (không phải
linh kiện lỗi của khách).

| Trường | Bắt buộc? | Ai nhập |
|---|---|---|
| Linh kiện xin xuất | Có | NV sửa chữa đề xuất, **hoặc chính Admin bảo hành tự tạo** (không cần chờ NV) |
| Số lượng | Có | Người tạo ticket |

- Khi ticket này còn ở trạng thái **chờ xử lý**: **dòng sửa chữa chính bị tạm dừng**, không đi tiếp
  được.
- Admin bảo hành xử lý ticket: **Huỷ**, hoặc **Duyệt** — khi duyệt phải nhập **mã đơn hàng** + **mã
  MISA** (làm việc trực tiếp trên MISA để xác nhận xuất kho).
- Ticket xử lý xong (huỷ hoặc duyệt) → dòng sửa chữa chính được **mở lại**, tiếp tục luồng.

⚠️ Mã MISA ở đây **khác hẳn** mã MISA ở phiếu trả bảo hành (mục 11) — 2 mã MISA riêng biệt, phục vụ 2
mục đích khác nhau (vật tư tiêu hao lúc sửa, so với lô hàng gửi trả KTV).

**Ảnh báo cáo sửa chữa** (mới bổ sung) — 3 nhóm ảnh riêng biệt, **mỗi nhóm tối đa 5 ảnh**:
1. Ảnh trước khi sửa
2. Ảnh sau khi sửa
3. Ảnh linh kiện lỗi

✅ Đã xác nhận: ảnh "linh kiện lỗi" là ảnh NV tự chụp khi mở máy kiểm tra thực tế, khác với ảnh lỗi KTV
đã upload lúc tạo dòng (mục 5) — 2 bộ ảnh riêng, không thay thế nhau.

NV cập nhật kết quả sửa xong, nhưng **không tự đóng ticket** — Admin bảo hành phải bấm xác nhận hoàn
tất thì dòng này mới coi là xong (mã MISA của vật tư sửa chữa đã nhập ở ticket riêng, mục 9.1 — không
nhập lại ở đây).

---

## 10. Luồng phụ — Phiếu trả xác

Áp dụng cho **mọi trường hợp có thay thế vật lý**: Đổi mới sản phẩm, hoặc Sửa chữa có thay linh kiện,
hoặc NV chẩn đoán ra kết quả "Trả xác". Hệ thống tự mở **1 Phiếu trả xác** gắn với dòng đó.

| Trường | Bắt buộc? | Ai xử lý |
|---|---|---|
| Trạng thái | Có | Kho hoặc Admin bảo hành chọn 1 trong: **Trả xác thành công** / **Huỷ bỏ** / **Tiêu huỷ** / **Trả xác cho KTV** |
| Thời gian trả xác | Có, khi xác nhận trạng thái | Tự điền theo lúc xác nhận, sửa được |
| Mã duyệt trả xác | Tuỳ | Nhập tay |
| Ghi chú | Không | Nhập tay |

✅ Đã xác nhận: phiếu trả xác tự động phát sinh ngay khi dòng LK chuyển sang Đổi mới/Sửa có thay
LK/Trả xác — không cần Admin bảo hành bấm tạo thủ công.

---

## 11. Bước 7 — Phiếu trả bảo hành (đã tách hẳn khỏi "đóng gói theo phiếu gửi")

Thay đổi quan trọng so với bản trước: **phiếu trả không còn tự động 1-1 với phiếu gửi ban đầu**.

- **Admin bảo hành** là người **chủ động tạo phiếu trả**, theo từng KTV.
- 1 phiếu trả gộp nhiều **dòng LK đã xử lý xong** (có thể đến từ nhiều phiếu gửi khác nhau, miễn cùng
  1 KTV).
- Tại **cùng 1 thời điểm**, 1 KTV có thể có **nhiều phiếu trả khác nhau** đang tồn tại song song, tuỳ
  Admin bảo hành phân loại hàng hoá để tách.
- ✅ Đã xác nhận: **tiêu chí tách hoàn toàn do Admin bảo hành tự quyết định thủ công** — tạo phiếu, tick
  chọn dòng muốn gộp, lưu nháp; có thể tạo tiếp phiếu khác cho cùng KTV; sau khi xử lý MISA ở ngoài hệ
  thống thì quay lại nhập mã MISA từng phiếu rồi xác nhận gửi kho. Không có quy tắc cố định nào khác.
  Mô hình này giống hệt cơ chế `phieu_xuat_kho` đã có sẵn — xem `Ke-hoach...` mục 3.

Sau khi Admin bảo hành tạo phiếu trả → Kho đóng gói theo đúng phiếu đó → Kế toán duyệt đối soát → Kho
gửi đi (mã vận đơn) → KTV xác nhận nhận (như bản trước, không đổi).

---

## 12. Ảnh & lưu trữ

Toàn bộ ảnh trong module (ảnh lỗi lúc tạo dòng, 3 nhóm ảnh báo cáo sửa chữa) chuyển từ "dán link Drive
thủ công" sang **upload trực tiếp trong app**, hệ thống tự đẩy lên **Google Drive của tài khoản Admin**
(đã cấp quyền OAuth cho việc này) và lưu lại link kết quả. Đây là một hạng mục kỹ thuật mới cần dựng
riêng (đăng ký OAuth Drive-scope cho tài khoản Admin, xin quyền upload — khác với OAuth đăng nhập hiện
có), sẽ ghi rõ ở bản kế hoạch kỹ thuật sau khi các điểm dưới đây được chốt.

---

## 13. Câu hỏi vòng 2 — ĐÃ CHỐT (2026-08-17)

Toàn bộ câu hỏi vòng trước đã được trả lời trực tiếp. Bản kế hoạch kỹ thuật
(`Ke-hoach-Trien-khai_Quan-ly-Sua-chua-Bao-hanh.md`) đã cập nhật theo đúng các chốt dưới đây:

1. ✅ Cờ "cần hỗ trợ" — **không phải** bật tay theo phiếu/dòng. Thực tế: mỗi người mặc định chỉ thấy
   miền mình; có **filter "Xem toàn quốc"** để chủ động thấy đơn miền khác khi cần hỗ trợ; số đếm cần
   xử lý luôn tính theo miền hiện tại của đơn; **khi 1 người khác miền thực sự xử lý** 1 đơn, đơn đó
   đổi hẳn sang miền của người xử lý — xem `Ke-hoach...` mục 2.
2. ✅ "Ngoài bảo hành" — đúng là ghi lại bằng chứng phê duyệt (mail + mã), không có hàng đợi duyệt
   trong app. Đã bỏ hẳn bảng `approvals`/`phe_duyet_ngoai_le_bh` khỏi thiết kế.
3. ✅ Ảnh "linh kiện lỗi" của NV sửa chữa là ảnh riêng, khác ảnh lỗi KTV chụp lúc tạo dòng.
4. ✅ Phiếu trả xác tự động phát sinh, không cần Admin bảo hành tạo tay.
5. ✅ Tiêu chí tách phiếu trả — **hoàn toàn do Admin bảo hành tự quyết định thủ công** theo ví dụ bạn
   mô tả (tạo phiếu → tick dòng muốn gộp → lưu nháp → có thể tạo tiếp phiếu khác → sau khi xử lý MISA
   ở ngoài hệ thống thì quay lại nhập mã MISA từng phiếu → xác nhận gửi kho). Phát hiện quan trọng: mô
   hình này **giống hệt** cơ chế `phieu_xuat_kho` đã có sẵn trong hệ thống (nháp → gộp nhiều dòng →
   nhập mã MISA/vận đơn sau → xác nhận) — nên "Phiếu trả bảo hành" được thiết kế theo đúng khuôn đó,
   xem `Ke-hoach...` mục 3.
6. ✅ Mọi dòng LK bắt buộc gắn 1 mã ID sự cố có sẵn — không có case thì không tạo được dòng.

## 14. Câu hỏi vòng 3 — ĐÃ CHỐT (2026-08-17, đợt 2)

1. ✅ Quy tắc "đổi miền khi người khác miền xử lý" — **chỉ Kho và Admin bảo hành** có quyền tiếp nhận
   trái miền. **NV sửa chữa không có quyền này.**
2. ✅ Sửa lại hiểu nhầm của tôi: mã MISA **không phải chỉ 1 nơi**. Có **2 mã MISA độc lập**:
   - Vật tư sửa chữa (dây điện, cút nối...) = **1 ticket riêng** (`de_xuat_linh_kien_bh`), tách khỏi
     dòng sửa chữa chính — trong lúc ticket này chờ xử lý, dòng chính bị **tạm dừng**; NV hoặc chính
     Admin bảo hành có thể tạo ticket này; Admin bảo hành duyệt (nhập mã đơn hàng + mã MISA) hoặc huỷ,
     dòng chính mới được xử lý tiếp — xem mục 9.1.
   - Lô hàng trả về KTV = mã MISA riêng ở phiếu trả bảo hành (mục 11), không liên quan gì tới mã ở
     trên.

## 15. Bổ sung mới vòng 3 — kiểm tra hết hạn bảo hành theo linh kiện

Mỗi mã linh kiện có số tháng bảo hành tối đa (12/24/36 tháng...) + phân loại máy/linh kiện lẻ. Khi Admin
bảo hành xử lý 1 dòng, hệ thống so sánh (thời điểm tiếp nhận sự cố − ngày mua, lấy theo case) với số
tháng bảo hành của mã đó — vượt quá thì cảnh báo "Linh kiện/Sản phẩm này đã hết thời gian bảo hành", và
Admin bảo hành muốn xử lý tiếp thì bắt buộc nhập thông tin duyệt + mã duyệt.

**Đã xác nhận (2026-08-17, đợt 3):**

1. ✅ "Thời điểm tiếp nhận sự cố" = mốc CSKH tiếp nhận yêu cầu từ khách ban đầu
   (`case_dvbh.thoi_gian_cskh_tiep_nhan`), không phải lúc Kho nhận thùng hàng ở module này.
2. ✅ "Thông tin duyệt + mã duyệt" khi hết hạn bảo hành dùng chung đúng 2 trường đã có cho nhánh
   "Ngoài bảo hành" — không tạo thêm cặp trường riêng.

Toàn bộ câu hỏi mở tính đến nay đã được chốt — bản kế hoạch kỹ thuật (`Ke-hoach-Trien-khai...md`) đã
cập nhật khớp 100% với các chốt này, sẵn sàng cho bước dựng migration D1 khi bạn muốn bắt đầu.
