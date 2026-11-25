# Tổng hợp logic — App Bảo hành đổi trả 3T (Worker `suachua`, trước gọi "Gửi bảo hành linh kiện")

> Mô tả logic **đang chạy thật** (theo code + `CLAUDE.md` tới 17/11/2026, v1.144). `CLAUDE.md` là lịch sử chi tiết từng đợt (rất dài);
> file này là bản tóm tắt nghiệp vụ. Bản trình bày đầy đủ có hình: `du an sua chua bao hanh/Luong-Quy-Trinh-Tong-Bao-Hanh.html`
> (cũng hiện ở màn "📘 Logic hệ thống" trong app) và `Luong-Cap-Linh-Kien-Bao-Hanh.html`. Logic đổi thì sửa đè đúng mục; lịch sử ở
> `nhat_ky_lam_viec.md`. Không ghi tài khoản, mật khẩu, khoá.

## 1. Hệ thống là gì

- Quy trình **gửi linh kiện / máy lỗi** từ KTV / CTV / Trạm về kho trung tâm để sửa chữa hoặc đổi mới trong bảo hành, rồi gửi trả lại;
  kèm cấp linh kiện cho NV sửa chữa, trả xác linh kiện cho đối tác, trừ công nợ sửa chữa.
- App độc lập: Worker `suachua` (Hono) + D1 + giao diện React (PWA). Google OAuth riêng. Ảnh lưu Google Drive (không lưu trong D1).
- Đơn cha = phiếu gửi (thùng hàng) `DH-…`; mỗi dòng linh kiện = **đơn vị** `DH-…-n` chạy trạng thái riêng. Mỗi dòng bắt buộc gắn mã case (CRM).

## 2. Vai trò

| Vai trò | Việc chính |
|---|---|
| KTV / CTV / Trạm (+ KTV triển khai) | Tạo thùng gửi (có thể tạo hộ KTV khác), thêm đơn, xác nhận gửi xe, xác nhận nhận hàng trả |
| Kho (theo miền Bắc / Nam) | Tiếp nhận ở mức thùng (không mở kiểm từng LK), có thể tiếp nhận trái miền; đóng gói, in, gửi phiếu trả |
| Admin bảo hành (theo miền) | Nhận thùng từ Kho (hoặc từ chối thùng), phân loại Trong / Ngoài BH, chọn hướng xử lý, Hãng / Đối tác, xác nhận hoàn tất, lên phiếu trả, xác nhận tiêu hao linh kiện sửa chữa |
| NV sửa chữa | Chẩn đoán và nộp kết quả (4 kết quả), không tự đóng đơn |
| Kế toán | Nhập / sửa mã MISA phiếu trả, duyệt phiếu trả, duyệt thùng trả xác |
| Trả xác | Gom thùng trả xác + ghi kết quả xác cho các đối tác được gán |
| Giám sát (chính / phụ theo khu vực), View | Theo dõi khu vực; GS bổ sung thông tin thay KTV |
| Admin hệ thống (qtri) | Quản trị, xem như người dùng khác |

## 3. Luồng chính

```
KTV tạo thùng (nháp) → thêm đơn (mã case bắt buộc, chặn trùng case + linh kiện) → xác nhận gửi xe / giao trực tiếp
  → Kho tiếp nhận thùng (có thể đổi miền; thực tế chưa nhận được hàng → Kho từ chối, thùng về nháp KTV + cảnh báo đỏ)  → Admin BH xác nhận nhận từ Kho (hoặc từ chối thùng → Kho / KTV phản hồi, quá 7 ngày tự huỷ)
  → từng đơn vị: xác nhận SL → Admin phân loại Trong / Ngoài BH → hướng xử lý:
       Sửa chữa (giao NV — bắt buộc đủ Hãng, Đối tác, còn / hết BH) | Đổi mới | Từ chối / huỷ BH | Chuyển kho
       NV: Không lỗi | Sửa được | Đề xuất đổi mới (Admin duyệt) | Trả xác  → Admin xác nhận hoàn tất (có thể lùi về NV)
  → Admin lên phiếu trả theo KTV (sửa được tới khi Kế toán duyệt) → Kế toán duyệt → Kho đóng gói / in / gửi
  → KTV xác nhận đã nhận (hoặc báo không nhận được); phiếu trả tự đóng sau 14 ngày.
```

- **9 nhóm giai đoạn** (gom 21 giai đoạn chi tiết): Đơn nháp · Chờ tiếp nhận · Đã tiếp nhận · Đang sửa chữa · Chờ gửi trả · Đang gửi trả ·
  Đã kết thúc · Đã huỷ · Bị từ chối. Định nghĩa ở `NHOM_GD` (frontend `lib/constants.ts` = backend `routes/traCuu.ts`, sửa cùng lúc).
- **Ưu tiên linh kiện đã đặt** (v1.150): chọn mã case khi thêm / sửa đơn → các linh kiện đã đặt cho case đó bên app Đặt linh kiện (trừ đơn
  trả hàng / bị từ chối / huỷ) lên đầu ô chọn linh kiện, nhãn "📦 Đã đặt ×SL". Tra qua `GET /api/case-lookup/lk-da-dat` → linh-kien-app
  `/api/suachua-partner/lk-theo-case`; lỗi kết nối thì danh sách giữ thứ tự thường.
- **Mã yêu cầu = case DVBH hoặc mã Lada** (v1.151): cùng 1 ô. Tra DVBH trước; không thấy (hoặc DVBH lỗi) mà mã có dạng Lada (1 chữ cái +
  ≥5 số, không "SC") → tra hệ Lada qua linh-kien-app `/api/suachua-partner/lada`. Lada thấy → tạo đơn, lưu bằng chứng (`case_lookup_snapshot`,
  `nguon: "lada"`); Lada không thấy / lỗi → chỉ tạo khi người tạo tích "tự chịu trách nhiệm" (`xac_nhan_lada`). Đơn ghi `loai_ma = 'lada'`,
  `lada_tim_thay` 1/0; KTV trên đơn Lada khác KTV thùng chỉ cảnh báo, không chặn. Linh kiện đã đặt theo mã Lada (`dat_don_hang.ma_lada`) cũng
  được ưu tiên.
- 3 linh kiện của 1 đơn: **A** KTV chọn, **B** thực tế gửi về, **C** đổi mới — có đánh giá lệch A/B/C.
- Huỷ / từ chối đơn: bắt buộc lý do. "Lùi lại" đơn, đổi linh kiện hàng loạt, tách SL đơn vị có sẵn cho Admin BH.
- **Kho từ chối thùng chưa về** (v1.145): thùng "Đang gửi về Kho" mà thực tế chưa nhận được → Kho (hoặc Admin BH làm hộ) bấm
  "⛔ Chưa nhận được", lý do bắt buộc → thùng về **nháp** của KTV (rời danh sách chờ Kho), cột `phieu_gui_bh.kho_tc_*` lưu lý do / người /
  lúc / số lần. KTV nhận ngay Web Push + thẻ đỏ trên cùng Trang chủ + banner trong chi tiết thùng + số việc `ktv_kho_tu_choi` (cả thông
  báo 12h); cảnh báo còn tới khi KTV gửi lại. Gửi lại vẫn qua quy tắc bước 1 (quá SLA từ lúc tạo thùng → phải giải trình). Kho thấy
  nhãn "Từng bị từ chối N lần" khi thùng về lại. Thùng bên khovan không được báo huỷ (giữ "chờ xử lý").
- **Huỷ thùng đang gửi về Kho + mở lại** (v1.156): Kho / Admin BH bấm "🗑 Huỷ" trên thùng "Đang gửi về Kho" (thực tế không về, VD thùng
  AppSheet cũ), lý do bắt buộc → dùng chung logic huỷ thùng (`lib/tuChoiThung.ts`): thùng `da_huy` (`tu_choi_tt='da_huy'`, lý do / người / lúc
  ở cột `tu_choi_*`), đơn cha chưa tách → `huy_thung`, đơn Odoo gỡ về "Chưa gửi" (ghi "Đơn Odoo cũ: …" vào ghi chú, cron báo DVBH xoá).
  "↺ Mở lại" ở Thùng hàng › Từ chối › "Thùng đã huỷ" (Kho / Admin BH, lý do bắt buộc) áp cho mọi thùng đã huỷ: thùng về trạng thái trước
  khi huỷ (đọc nhật ký: đang gửi về Kho / Kho đã nhận chờ Admin), đơn về "Chờ xác nhận SL", gắn lại đơn Odoo cũ nếu chưa gắn đơn khác và chưa
  bị "Hủy đơn lỗi".
- **Thời gian tồn của thùng** (v1.146): thanh "⏱ Tồn N thùng" trên danh sách thùng đang về Kho (Kho, Admin BH) và thùng Kho đã nhận
  chờ Admin nhận nội bộ: 4 mức Dưới 1 ngày / 1–2 / 2–3 / Trên 3 ngày (giờ bỏ Chủ nhật, `GET /api/kho/thung-ton`), bấm mức để lọc
  (`?ton=`, `tonFilter`), kèm thùng tồn lâu nhất. Danh sách xếp thùng cũ nhất lên đầu; huy hiệu ghi "Tồn x ngày y giờ" màu theo SLA
  bước (bước 2 = 48h). KTV thấy "Chờ Kho nhận · đã gửi x ngày" (đỏ khi quá SLA). Mốc: thùng đang về = lúc KTV gửi; chờ Admin = lúc Kho nhận.
- SLA tính bỏ Chủ nhật; bấm số giờ SLA để ghi lý do chậm.
- Giải trình bước quá SLA (hộp "📝 Giải trình"): chọn lý do chậm + **phân loại lỗi** bắt buộc (Lỗi nội bộ / Lỗi đối tác / Lỗi của tôi / Khác).
  Khác "Lỗi của tôi" thì bắt buộc **bằng chứng**: mô tả chữ hoặc ảnh (ảnh lưu Google Drive, D1 chỉ lưu link). Lý do chậm chọn ở cổng SLA
  (tự ghi giải trình vai BO) không có phân loại lỗi.

## 4. Cấp linh kiện sửa chữa (từ 16/11/2026 xử lý hoàn toàn ở app Đặt linh kiện)

- NV / Admin BH tạo đề xuất ở đây hoặc NV đặt trực tiếp trên app Đặt linh kiện; đơn bên app LK là nơi duy nhất Kế toán / Kho xử lý.
  Đơn tạo ở hệ nào thì chỉ sửa được ở hệ đó, và chỉ khi Kế toán chưa xử lý.
- **Loại cấp linh kiện** theo đơn BH (`loaiDeXuatSuaChua()`, có bản sao FE và bên app LK — đổi 1 nơi đổi cả 3): hết BH → **MUA HÀNG SỬA CHỮA**
  (NV chuyển tiền như đơn mua); còn BH + đối tác Karofi → **HỖ TRỢ SỬA CHỮA 0 ĐỒNG**; còn lại → **CÔNG NỢ SỬA CHỮA**. Ưu tiên trước bảo hành (v1.154): Admin BH duyệt hướng xử lý **Dịch vụ tính phí** → **MUA HÀNG SỬA CHỮA**
  dù đơn còn bảo hành. Đây là loại GỢI Ý — từ v1.152 (app Đặt LK v1.547) NV được chọn loại khác trên app Đặt LK (VD sản
  phẩm hết BH nhưng linh kiện bên trong còn BH); lần cấp chọn khác gợi ý lưu `lk_loai_goi_y` + lý do và hiện cảnh báo đỏ "Khác loại gợi ý".
- Đối tác = danh mục `doi_tac_bh` (tự nạp từ CRM, đánh dấu Karofi); Hãng = chữ CRM, Admin BH sửa được.

## 5. Xác nhận tiêu hao & trừ công nợ sửa chữa

- Chỉ đơn CÔNG NỢ SỬA CHỮA: NV xác nhận đã nhận → Admin BH xác nhận số dùng + xử lý xác (trả đối tác / lưu kho / tiêu huỷ / thất lạc —
  thất lạc có trừ hay không do Admin chọn) → app LK **tự tạo đơn "TRỪ CÔNG NỢ - SỬA CHỮA"** (và "TRẢ HÀNG CÔNG NỢ - SỬA CHỮA" cho
  phần không dùng) đi thẳng Kế toán, không qua Tác nghiệp. Sửa / huỷ xác nhận được tới khi Kế toán chốt.
- HỖ TRỢ SỬA CHỮA 0 ĐỒNG: không trừ công nợ nhưng vẫn xác nhận xác. MUA HÀNG SỬA CHỮA: không xác nhận xác.

## 6. Trả xác linh kiện

Xác chờ gom (đơn vị Đổi mới / sửa có thay LK, xử lý xác "Trả đối tác", tính theo linh kiện B) → thùng trả xác `TX-…` (`nhap` →
`cho_ke_toan` → `da_duyet`; bắt buộc mã EO + ≥ 1 xác; 1 thùng 1 miền, 1 đối tác) → Kế toán duyệt (hoặc trả lại có lý do). Thêm / bớt xác
tới khi Kế toán duyệt (Kế toán không duyệt thùng rỗng); xác trong thùng thì không đổi xử lý xác / không lùi đơn. Luật 1 miền 1 đối tác áp cả bấm tay lẫn
import Excel (thùng mới từ import lấy đối tác + miền của xác đầu). Người gom "Huỷ gửi KT" khi chưa duyệt; thùng nháp rỗng xoá được. Kết quả ngoài thùng:
tiêu huỷ / thất lạc / không có xác / đã trả ngoài (+ "Lưu kho" ghi từ xác nhận tiêu hao) → tab "Đã xử lý khác", đưa lại chờ gom được; đơn trước
01/11/2026 coi như đã xử lý ngoài (cron 15 phút tự đánh dấu cả đơn cũ phân loại muộn). Hướng dẫn: `du an sua chua bao hanh/Huong-dan-Tra-xac-linh-kien_25-11-2026.html`.

## 7. Lịch chạy tự động

Cron mỗi 15 phút (`*/15 * * * *`) điều phối: đồng bộ đơn Odoo về app và đẩy trạng thái về DVBH theo các đợt trong ngày, danh bạ KTV /
khu vực từ app Đặt linh kiện mỗi giờ, ETX nhân sự (01:00), top linh kiện (02:00), báo cáo BO 1 lần / ngày, **thông báo tổng hợp 12h trưa**
theo vai trò (push + chuông), tự đóng phiếu trả 14 ngày, tự đánh dấu "đã xử lý ngoài" xác đơn trước 01/11/2026, **đẩy việc cần giải trình sang App Nhiệm vụ eOffice 30 phút / lần**. Chi tiết thứ tự: mục 12 của `Luong-Quy-Trinh-Tong-Bao-Hanh.html`.

## 8. Kết nối hệ khác

| Hệ | Nội dung |
|---|---|
| App Đặt linh kiện (`linh-kien-app`) | Danh mục LK / danh bạ KTV / khu vực (kéo về), phân loại LK (đẩy ngược), ticket thiếu hàng bảo hành, cấp linh kiện + trừ công nợ sửa chữa, gợi ý đơn BH (Service Binding + khoá đồng bộ) |
| DVBH | Tra case CRM, API luồng gửi bảo hành của 1 ca (case-timeline), đẩy trạng thái đơn Odoo + tóm tắt gửi BH theo ca (`lib/tomTatCa.ts`: số LK, giai đoạn thấp nhất, lần gửi xe cuối, thời gian xử lý lâu nhất; bỏ đơn huỷ / từ chối; chỉ ca có thay đổi, cùng request 15 phút) |
| Odoo | Kéo đơn bảo hành về, xuất file import kết quả |
| khovan | Đẩy thùng khi gửi thật |
| ETX nhân sự | Tự duyệt / khoá tài khoản |
| App Nhiệm vụ eOffice (Cổng nhiệm vụ `taskFeedNhan`, mã app `bao-hanh-quan-tri`, secret TASK_FEED_KEY) | Việc **quá SLA bước, chưa ai giải trình** (cùng luật màn "Cần giải trình"), gửi ảnh chụp đủ 30 phút / lần (`lib/viecGiaiTrinhCong.ts`). Người nhận: bước Kho / Admin BH / Kế toán → mọi tài khoản giữ vai đó cùng miền (chưa gán / Cả 2 miền thấy hết, đơn chưa khai báo miền hiện cho mọi miền); bước NV sửa → NV được giao (người kiêm Admin / Kho / KT nhận cả bước NV theo miền); bước KTV giữ quá SLA + thời gian chuyển GS → Giám sát khu vực của KTV. KTV và Admin hệ thống (chỉ cờ quản trị) không nhận. id việc = `GT-<mã thùng / đơn / phiếu trả>-<bước>`, link mở thẳng `/<mã>`, gấp (🔴) khi quá 3 × SLA. Ghi giải trình → gửi "xong" ngay. Cài đặt › "App Nhiệm vụ eOffice": xem trước, đẩy ngay |

## BC KPIs nhân viên theo tháng (v1.158)

`#/bao-cao-kpi` (Admin hệ thống / Admin BH / View) — chỉ tính khi bấm "📥 Tải số liệu" (`GET /api/bao-cao-kpi?thang=YYYY-MM`, `lib/baoCaoKpi.ts`,
không cache, không cron), tải Excel 5 sheet. Ngưỡng 24 giờ SLA (liên tục, bỏ Chủ nhật); tháng theo lúc làm xong; dòng bắt đầu từ dữ liệu AppSheet
chỉ đếm, không tính giờ; dòng đang chờ chỉ hiện ở tháng hiện tại, không vào tỷ lệ.

| KPI | Từ → đến | Người chịu | Ghi chú |
|---|---|---|---|
| Kho gửi hàng trả | Kế toán duyệt (lần vào `da_duyet_ke_toan` gần nhất) → Kho bấm Gửi (`da_gui`) | người bấm gửi, gom theo miền phiếu trả | |
| Admin BH xử lý | MIN(Kho nhận thùng + 2h, Admin xác nhận nhận thùng) (đơn không thùng: lúc tạo đơn) → lần đầu đơn vị rời tay Admin (sang trạng thái khác `cho_phan_loai` / `admin_can_xem_lai` / `cho_bo_sung_tt`) | người thao tác lần đó | Trừ giờ chờ KTV bổ sung; quá 24h mà có giải trình bên ngoại cảnh ở bước Admin → "Không xét"; SL xử lý = mọi đơn vị xong trong tháng |
| NV sửa chữa | Vào `cho_chan_doan` → nộp kết quả (`cho_admin_xac_nhan` / `san_sang_gom_phieu_tra` / `admin_can_xem_lai`), mỗi lượt giao 1 dòng | NV được giao (`nguoi_sua_chua`) | Đơn B2B chưa có trên hệ thống |

## 9. Tài liệu liên quan

`CLAUDE.md`, `DEPLOY.md`, `DESIGN_SYSTEM.md`, `SRS_tong_hop.md`, `nhat_ky_lam_viec.md`, thư mục `du an sua chua bao hanh/` (kế hoạch, phân tích,
hướng dẫn KTV / Admin BH / cấp LK & trả xác).

## Cửa sổ thông tin eOffice (popup Giám đốc)

`GET /api/cua-so` (không cần đăng nhập) → Worker gọi `csApi` eOffice bằng secret `CUA_SO_KHOA`, đệm 60 giây, kèm tranh SVG. Frontend `CuaSoThongTin` hiện mỗi lần mở app (và khi quay lại sau ≥ 10 phút ẩn), nút "Vào app" khoá theo `khoaNutGiay`. Lỗi / chậm / chưa có khoá → không hiện, vào app bình thường. Cùng 1 bộ mã ở mọi app hệ DVBH (bản gốc ở linh-kien-app).
