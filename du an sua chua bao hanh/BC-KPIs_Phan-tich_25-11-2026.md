# BC KPIs nhân viên — phân tích file Excel T10 & triển khai trên app (25/11/2026, v1.158)

> Nguồn: file KPI tháng 10 "BC DVBH 2610 - bảo hành.xlsx" (sheet tổng hợp + sheet DATA 144.664 dòng xuất từ AppSheet).
> Yêu cầu nguyên văn: *"đây là báo cáo kpis tháng 10 của tôi cho nhân viên. hãy phân tích các chỉ số => liệt kê các số liệu cần thiết
> => báo cáo các số liệu có trên hệ thống => đề xuất phương án triển khai => xây dựng trên app mục BC KPIs cho phép tải về (bc này không cần
> chạy liên tục, chỉ cần thêm nút load bc, thì mới load số liệu khi cần)"*.

## 1. Ba KPI trong file Excel (số T10)

| KPI | Sheet | Cách Excel tính | Kết quả T10 (2610) |
|---|---|---|---|
| **Kho — tốc độ gửi hàng trả** | Tốc độ gửi hàng | Mỗi PXK (dòng đầu tiên của PXK, bỏ "HÀNG TRỪ KHO"), `CA = Ngày kho xác nhận − Ngày tạo đơn trả`, đúng hạn khi `CA ≤ 24` | MB 262/265, MN 338/349 → **600/614 = 97,7%** |
| **Admin BH — tốc độ xử lý** | KPIs Admin BH | Mỗi dòng linh kiện "Đã làm" (Đã sửa xong / Hoàn thành / Từ chối). Từ "ngày admin nhận" = MIN(Kho nhận + 2h, Admin nhận) tới "ngày lên đơn đề xuất LK", nếu không có thì ngày sửa xong; trừ giờ cuối tuần (nhận thứ 7: −39h, thứ 6: −63h) và ngày Tết. Dưới 24h / Tồn quá 24h; **Không xét** khi nguyên nhân chậm "Không có linh kiện" / "Hết hàng tồn kho" hoặc ca trong danh sách "Ca bỏ ko tính 24h". Kèm số lượng xử lý theo admin | MB 99,8% / MN 96,7% dưới 24h; 5.127 linh kiện (toan 2.359 · tuyen 1.259 · nhu 1.378 · doanh 131) |
| **NV sửa chữa — năng suất** | NS SUẤT NV SỬA CHỮA | Dòng có phương án "sửa chữa / sửa dịch vụ" + người sửa. Từ "ngày giao NV sửa chữa" (không có thì Admin nhận / ngày gửi) tới ngày sửa xong (đang sửa thì tới NOW), trừ giờ cuối tuần. Dưới 24h / Tồn quá 24h theo tài khoản CRM; cộng đơn B2B (Google Sheet riêng) | khuongnv 21 dưới / 96 quá (17,9%) · vietnv 6 / 15 (28,6%) · B2B 0 |

### Điểm cần lưu ý trong công thức Excel (phát hiện khi đọc hàm gốc)

1. **Kho**: cột `CA` đặt tên "Số giờ…" nhưng là hiệu 2 ngày (đơn vị **ngày**, không nhân 24) rồi so `≤ 24` → thực chất ngưỡng là **24 ngày**, nên tỷ lệ đúng hạn 97,7% đang cao hơn thực tế.
2. **Admin**: `Thời gian admin sửa = 24 × (IF(DL<>"", DL, IF(DH<>"", DH, CW)) − CY)` — `DH` là **số giờ** sửa của NV (VD 30), không phải ngày giờ → mọi ca sửa chữa có NV mà chưa có đề xuất LK luôn ra 0 giờ ("Dưới 24h").
3. Giờ cuối tuần trừ cứng 39h / 63h, khác luật hệ thống mới (24h liên tục, chỉ bỏ Chủ nhật — chốt 04/10/2026).
4. Excel tính "đang sửa" bằng `NOW()` nên mở lại file là số thay đổi.

## 2. Số liệu cần thiết & có trên hệ thống chưa

| Số liệu | Trên hệ thống mới (`suachua`) | Ghi chú |
|---|---|---|
| Kế toán duyệt phiếu trả (ngày giờ) | ✅ nhật ký `logs_bh` phiếu trả `cho_ke_toan_duyet → da_duyet_ke_toan` | |
| Kho gửi hàng trả (ngày giờ, người) | ✅ nhật ký `da_duyet_ke_toan → da_gui` | |
| Miền phiếu trả / đơn | ✅ cột `mien` (MB / MN / chưa khai báo) | |
| Kho nhận thùng, Admin nhận thùng | ✅ `phieu_gui_bh.thoi_gian_nhan_kho`, `admin_thoi_gian_nhan`, `admin_nguoi_nhan` | |
| Lúc linh kiện rời tay Admin (giao NV / sẵn sàng trả / huỷ / chuyển kho) + người | ✅ nhật ký đơn vị `phieu_sc_ct` | Thay cho "ngày lên đơn đề xuất / sửa xong" của Excel |
| Thời gian chờ KTV bổ sung | ✅ nhật ký `cho_bo_sung_tt` | Excel không có — app trừ ra cho công bằng với Admin |
| Nguyên nhân chậm "Không có linh kiện / Hết hàng tồn kho" | ✅ giải trình `giai_trinh_bh` bên **ngoại cảnh** | Thay cho cột "NGUYÊN NHÂN CHẬM" + danh sách ca loại trừ tay |
| Giao NV sửa chữa / NV nộp kết quả, NV được giao | ✅ nhật ký `→ cho_chan_doan`, `cho_chan_doan → …`, `nguoi_sua_chua` | |
| Đơn B2B của NV | ❌ chưa có (Google Sheet riêng) | Mở — cần nguồn dữ liệu |
| Dữ liệu tháng 10/2026 | ⚠️ chỉ là bản nhập AppSheet (dừng AppSheet 01/11/2026), không có mốc giờ từng bước | BC KPIs chuẩn từ **tháng 11/2026**; dòng AppSheet chỉ đếm, không tính giờ |

## 3. Phương án đã triển khai (v1.158)

- Menu **🎯 BC KPIs** (`#/bao-cao-kpi`) cho Admin hệ thống / Admin BH / View. Mở màn **không tải gì**; chọn tháng → **📥 Tải số liệu** mới tính
  (`GET /api/bao-cao-kpi?thang=YYYY-MM`, không cache, không cron) → **⬇ Tải Excel** (5 sheet: Tổng hợp, Kho gửi hàng, Admin BH, NV sửa chữa, Chi tiết).
- Giờ tính theo SLA hệ thống (liên tục, bỏ Chủ nhật). Ngưỡng 24h cho cả 3 KPI như Excel. Tháng tính theo lúc **làm xong**.
- Dòng "đang chờ" (Kho chưa gửi, NV đang sửa) chỉ hiện ở tháng hiện tại, tính tới lúc tải, **không** vào tỷ lệ.
- Khác Excel có chủ đích: sửa 2 lỗi công thức ở mục 1; ngưỡng giờ thật cho Kho; Admin tính tới lúc rời tay Admin (không phải lúc sửa xong);
  trừ thời gian chờ KTV bổ sung; "Không xét" lấy từ giải trình ngoại cảnh thay cho danh sách tay.

## 4. Việc mở

- Đơn B2B: cần quyết định nguồn (nhập vào app hay đọc Google Sheet) — chưa làm.
- NV sửa chữa: Excel không loại trừ ca chờ linh kiện; app giữ đúng như vậy (chỉ ghi chú). Có loại trừ hay không là câu hỏi mở.
- SLA bước NV trên hệ thống là 48h, KPI Excel là 24h — app dùng 24h theo KPI; nếu muốn đồng bộ thì cần chốt.
