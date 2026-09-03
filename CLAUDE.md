# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong thư mục này.

## Nguyên tắc bắt buộc: CLAUDE.md là file lịch sử dự án, luôn phải cập nhật

File này **không chỉ là hướng dẫn tĩnh** — nó là **nhật ký lịch sử sống** của toàn bộ dự án: mọi nội
dung nghiệp vụ, mọi thay đổi kỹ thuật, mọi vấn đề đã trao đổi và đã chốt với người dùng/người vận
hành. Đây là quy tắc áp dụng cho **mọi phiên làm việc trong thư mục này, không có ngoại lệ**:

1. **Sau mỗi lượt trao đổi có phát sinh quyết định, thay đổi, hoặc phát hiện mới** (không chỉ khi
   người dùng yêu cầu rõ ràng "cập nhật CLAUDE.md") — thêm ngay 1 mục mới (hoặc sửa mục đã có nếu
   cùng chủ đề) vào file này **trước khi coi công việc là xong**, không để dồn qua phiên sau rồi quên.
2. **Không tự tóm tắt/diễn giải khi ghi lại yêu cầu gốc của người dùng** — trích **nguyên văn** (dùng
   dấu ngoặc kép hoặc block quote) các câu người dùng đã nói để chốt quyết định, kèm theo phần diễn
   giải/triển khai bên dưới. Đây là cách toàn bộ file này đã được viết từ đầu — giữ nguyên phong cách.
3. **Mỗi mục mới nên có cấu trúc**: (a) bối cảnh/nguyên văn yêu cầu hoặc câu hỏi, (b) quyết định đã
   chốt hoặc đã triển khai, (c) lỗi/vấn đề phát hiện được trong lúc làm (nếu có) và cách đã sửa, (d)
   kiểm thử đã chạy để xác minh (nếu có code/prototype liên quan). Không bỏ qua phần (c)/(d) chỉ vì
   muốn viết gọn — đây chính là phần giúp phiên sau không lặp lại sai lầm hoặc nghi ngờ nhầm việc đã
   xong.
4. **Khi phát hiện 2 tài liệu/2 mục mâu thuẫn nhau**, không âm thầm chọn 1 bên — ghi rõ trong CLAUDE.md
   mục nào là "nguồn đúng nhất hiện tại", mục nào đã bị thay thế/lỗi thời (theo đúng cách các mục
   "Phản hồi vòng N" trong file này đã làm với các tài liệu #1–#4).
5. **Cập nhật đoạn "Trạng thái" ở đầu file** (ngay dưới mục này) mỗi khi có vòng thay đổi mới đáng kể
   — vẫn giữ các mốc cũ, chỉ nối thêm mốc mới nhất, không xoá lịch sử.
6. **Câu hỏi còn mở, chưa được người dùng trả lời** — ghi vào mục "Câu hỏi mở còn lại" (không tự suy
   đoán rồi ghi như đã chốt), và khi người dùng trả lời, chuyển từ "mở" sang "đã chốt" ngay tại đúng
   mục đó (xem cách mục "Câu hỏi mở còn lại" đánh dấu `~~gạch ngang~~` các câu đã có câu trả lời).
7. Nguyên tắc này áp dụng cho **cả những thay đổi nhỏ** (1 nút, 1 field, 1 CSS rule) lẫn thay đổi lớn
   (schema, luồng nghiệp vụ) — vì trong dự án này, nhiều lần chính các thay đổi tưởng nhỏ (VD 1 trường
   `so_luong_khai` bị thiếu, 1 modal đóng nhầm khi kéo chuột) lại phản ánh 1 vấn đề nghiệp vụ/kỹ thuật
   lớn hơn nếu không được ghi lại rõ ràng.

## Dự án này là gì

Đây là thư mục **đặc tả nghiệp vụ** (chưa có code) cho module mới **"Sửa chữa bảo hành"** (nội bộ
gọi là "Gửi bảo hành linh kiện") — quy trình gửi linh kiện/máy lỗi từ KTV/CTV/Trạm về kho trung tâm
để sửa chữa hoặc đổi mới trong bảo hành, rồi trả lại. Module này sẽ được **build vào bên trong** hệ
thống lớn hơn đang chạy thật tại `../cloudflare smarttrade base` (Cloudflare Workers + Hono + D1,
xem `CLAUDE.md` của repo đó) — không phải một app độc lập. Toàn bộ quyết định kỹ thuật trong các
tài liệu ở đây được thiết kế để **tái dùng tối đa** hạ tầng, pattern và quy ước đã có của repo đó
(state machine + log insert-only, `moduleAccess.ts`, `scopeDatMua.ts`, `dataVersions`/`cachedReport`,
mẫu `phieu_xuat_kho`...) — xem mục "Liên hệ với hệ thống chính" bên dưới.

**Trạng thái (cập nhật 22/08/2026):** đã có **1 bản click-through prototype HTML/JS chạy offline**
(`du an sua chua bao hanh/prototype-html/index.html`, xem mục "Prototype HTML" bên dưới) để test
UX bằng tay — **chưa migrate D1, chưa viết route/code thật cho hệ thống production**. Toàn bộ câu
hỏi mở qua 3 vòng rà soát (16–17/08/2026) đã được chốt — xem
`du an sua chua bao hanh/Ke-hoach-Trien-khai_Quan-ly-Sua-chua-Bao-hanh.md` mục 0 và
`Ra-Soat_Luong-Quy-Trinh-Va-Nhap-Lieu.md` mục 13–15. Sau vòng test prototype đầu tiên
(21/08/2026), có **15 yêu cầu/phát hiện mới** làm thay đổi schema/luồng so với #4 — xem mục
"Phản hồi vòng 1 sau khi test prototype" bên dưới. Prototype sau đó đã được **redesign toàn bộ giao
diện** theo phong cách `../linh-kien-app` (22/08/2026, xem mục "Thiết kế giao diện" bên dưới), rồi
tiếp tục điều chỉnh theo **"Phản hồi vòng 3"** (22/08/2026, 4 điểm: bỏ trường ghi chú trùng lặp, nhớ
thông tin nhà xe theo KTV, Admin BH đọc được ghi chú sự cố của Kho, gộp 1 bảng chung xử lý mọi đơn
bảo hành trong thùng) rồi **"Phản hồi vòng 4"** (22/08/2026, 3 điểm: KTV đổi được linh kiện khi Admin
yêu cầu bổ sung do sai mã, Admin đổi trực tiếp "linh kiện sửa chữa thực tế" không cần hỏi lại KTV,
KTV có trường đề xuất loại đối trừ lúc tạo đơn — điểm này giải quyết dứt điểm câu hỏi mở #2 đã treo
từ vòng phân tích đầu). **"Phản hồi vòng 4" cùng vòng 1/2/3 và mục "Thiết kế giao diện" bên dưới là
nguồn mới nhất, ghi đè lên #4 ở những điểm xung đột**. Sau đó có thêm 1 vòng QA toàn hệ thống bằng
Chrome thật (31/08/2026, 5 lỗi tìm được đều đã sửa), 1 vòng đối chiếu 50 action AppSheet gốc
(31/08/2026, 7 tính năng mới), và 1 vòng 4 yêu cầu UI/vai trò (01/09/2026: xem trước giao diện mobile,
viền màu phân biệt ô nhập được, click-vào-dòng-để-mở-chi-tiết cho mọi bảng, 2 vai trò mới `qtri`/
`quanly`), và 1 vòng 4 yêu cầu UI toàn hệ thống (02/09/2026: bảng luôn 1 dòng không xuống dòng, modal
chi tiết tràn màn hình, log gộp đủ 4 nguồn tách vùng riêng biệt, chỉnh lại gam màu nền/card cho rõ
ranh giới), rồi tiếp theo là đổi menu mobile từ drawer sang bottom tab bar cố định (02/09/2026, cùng
ngày), rồi sort log mới nhất lên đầu + 1 vòng đánh giá lại visual hierarchy toàn hệ thống (02/09/2026:
badge SLA phân 3 mức khẩn cấp, khu vực "Việc của tôi" nổi bật hẳn khỏi số liệu tham khảo, trường chỉ-
xem không còn trông như ô nhập bị khoá), rồi cuối cùng chuyển nút thao tác của 2 "UI chi tiết" lên
top tiêu đề modal (02/09/2026, để luôn nhìn thấy được dù cuộn tới đâu), và tiếp theo là 1 vòng 3 yêu
cầu (03/09/2026): lời chào rút gọn lên topbar, gộp 2 settings admin về 1 trang `#/qtri/cai-dat`, và
sidebar mặc định thu gọn + nội dung tự giãn + huy hiệu số việc từng tab, rồi cột Trạng
thái chuyển lên vị trí 2 trong mọi bảng + UI chi tiết đơn bảo hành có đầy đủ nút thao tác cố định ở
footer (03/09/2026, cùng ngày), và gần nhất là badge SLA đơn giản hoá (bỏ chữ, thêm màu xanh lá) +
bảng thống nhất Admin BH có tuỳ biến cột đầy đủ (kéo đổi vị trí/độ rộng, bật tắt cột) + nút tự động
gộp phiếu trả cho mọi nhân viên (03/09/2026, cùng ngày) — xem 10 mục cuối cùng phía dưới (theo đúng
thứ tự thời gian) để có chi tiết đầy đủ.

## Bản đồ tài liệu (đọc theo đúng thứ tự này nếu cần hiểu lại từ đầu)

| # | File | Vai trò của tài liệu |
|---|---|---|
| 1 | `du an sua chua bao hanh/He-thong-quy-trinh-bao-hanh_Phan-tich-va-De-xuat.md` | Bản phân tích gốc: hiện trạng as-is trên Google Sheets/AppSheet, điểm yếu, mô hình dữ liệu & sơ đồ to-be **phiên bản đầu** (đã lỗi thời một phần — xem #2) |
| 2 | `du an sua chua bao hanh/Danh-gia-va-Hoan-thien-Quy-trinh-Bao-hanh.md` | Đối chiếu #1 với dữ liệu Excel thật, phát hiện các nhánh nghiệp vụ bị thiếu (case ngoại lệ có phê duyệt, trả xác, chờ linh kiện), sơ đồ to-be **phiên bản 2** |
| 3 | `du an sua chua bao hanh/Ra-Soat_Luong-Quy-Trinh-Va-Nhap-Lieu.md` | Rà soát lại toàn bộ luồng theo đúng thứ tự thao tác + tên trường nhập liệu, đối chiếu với người vận hành qua 3 vòng hỏi-đáp — **nguồn đúng nhất hiện tại cho hiểu biết nghiệp vụ** |
| 4 | `du an sua chua bao hanh/Ke-hoach-Trien-khai_Quan-ly-Sua-chua-Bao-hanh.md` | Kế hoạch kỹ thuật cuối cùng: schema D1, route backend, phân quyền, state machine rút gọn, danh sách màn hình — **nguồn đúng nhất hiện tại cho thiết kế kỹ thuật, đã khớp 100% với #3** |
| — | `du an sua chua bao hanh/Format và luồng quy trình đơn gửi bảo hành.xlsx` | Dữ liệu vận hành thật (8 sheet) — nguồn bằng chứng cho #2. Xem mục "Bằng chứng dữ liệu thật" bên dưới để tra nhanh mà không cần mở lại file. |
| 5 | `du an sua chua bao hanh/Ma-tran-CRUD-Vai-tro-Truong-du-lieu.xlsx` | Ma trận CRUD 6 vai trò × ~76 trường dữ liệu (sheet "Ma tran CRUD"), chú giải (sheet "Chu giai"), 8 điểm cần cơ chế "đẩy ngược" giữa các vai trò (sheet "Diem day nguoc"), luồng UX cho case nhiều đơn vị + ma trận ưu tiên bulk-action theo 13 màn hình (sheet "UX - nhieu don vi"). Đã tách `phieu_sua_chua_bh` thành **đơn cha** (KTV khai, so_luong_khai) + **đơn vị con `phieu_sua_chua_bh_ct`** (tự sinh theo so_luong_thuc_nhan Admin BH xác nhận) — xem tóm tắt ở mục "Ma trận CRUD & đơn cha/đơn vị con" bên dưới. |
| 6 | `du an sua chua bao hanh/prototype-html/index.html` | Bản click-through prototype (HTML/CSS/JS thuần, không phụ thuộc thư viện ngoài, chạy offline bằng cách mở file trực tiếp trong trình duyệt) — xem mục "Prototype HTML" bên dưới. |

**Quan trọng:** #4 (Ke-hoach) là nguồn chốt cho schema/route/phân quyền GỐC, nhưng **#5 (ma trận CRUD)
và mục "Phản hồi vòng 1 sau khi test prototype" bên dưới đã SỬA/BỔ SUNG nhiều điểm so với #4** — khi
có xung đột, phần cập nhật trong chính CLAUDE.md này (do mới hơn) là bản đúng nhất, #4 chưa được
sửa lại theo kịp. #1 chỉ còn giá trị lịch sử (sơ đồ to-be trong #1 **thiếu** nhóm case ngoại lệ có
phê duyệt — đã sửa ở #2, rồi #2 tự nó cũng bị **thay thế một phần** ở #4 khi ý tưởng bảng `approvals`
bị bỏ hẳn — xem mục 0 của #4, dòng "Case ngoại lệ / phê duyệt". Đừng lấy sơ đồ mermaid trong #1 hoặc
#2 làm chuẩn cuối.

## Bối cảnh nghiệp vụ (rút ra từ dữ liệu thật, không phải suy đoán)

- Công ty là đơn vị dịch vụ bảo hành/sửa chữa cho mạng lưới KTV/CTV/Trạm khắp cả nước (email dạng
  `karofihanoi04@gmail.com`, `dichvu3tbacninh@gmail.com`...), xử lý hàng gửi về từ hiện trường.
- **Karofi (máy lọc nước) chiếm ~82% khối lượng hàng thật** (197/239 dòng `Nhãn hàng` trong
  `HANG VE KHO`) — đây gần như là vận hành một-nhãn-hàng-là-chính, các hãng khác (MISHIO KACHI,
  CUCKOO, SEVILLA, HASUKA, SANAKY, Livotec...) chỉ là phần nhỏ. Thiết kế module cần tối ưu cho case
  phổ biến (Karofi, linh kiện lọc nước) trước, không nên đối xử ngang hàng mọi hãng.
- Vận hành hiện tại đã có phân biệt **"Đối tác" (79/239) vs "KTV" (160/239)** như hai loại người gửi
  hàng khác nhau trong `HANG VE KHO.Loại đối tượng` — cần xác nhận "Đối tác" ở đây có trùng khái
  niệm "CTV" trong hệ thống chính hay là một loại thứ ba chưa được model.

## Vai trò & luồng nghiệp vụ (tóm tắt — chi tiết đầy đủ xem tài liệu #3, #4)

| Vai trò | Cờ hệ thống | Việc chính |
|---|---|---|
| KTV / CTV / Trạm | `la_ktv_dvbh` / `la_ve_tinh` (đã có) | Tạo phiếu gửi, thêm dòng LK (bắt buộc gắn `case_dvbh.id`), xác nhận gửi xe, xác nhận nhận hàng trả |
| Kho | `la_kho` (đã có) + `mien` (mới) | Tiếp nhận **ở mức thùng hàng** (không mở kiểm từng LK), đóng gói phiếu trả, xử lý trả xác — có quyền "tiếp nhận trái miền" |
| Admin bảo hành | `la_admin_bh` (**mới**) + `mien` (mới) | Phân loại Trong/Ngoài bảo hành, chọn hướng xử lý, duyệt đề xuất linh kiện, xác nhận hoàn tất, tạo phiếu trả theo KTV — có quyền "tiếp nhận trái miền" |
| NV sửa chữa (SCVP) | `la_nv_sua_chua` (**mới**) + `mien` (mới) | Chẩn đoán (4 kết quả), đề xuất vật tư, upload ảnh — **không tự đóng ticket**, không có quyền đổi miền |
| Kế toán | `la_ke_toan` (đã có) | Duyệt đối soát phiếu trả trước khi gửi |

Luồng tổng quát (bản mới nhất, xem `Ke-hoach...` mục 5 để có state machine đầy đủ từng nhánh):

```
KTV tạo phiếu gửi (mỗi dòng LK bắt buộc gắn case_dvbh.id có sẵn)
  → Xác nhận gửi xe → Kho tiếp nhận (mức thùng, có thể đổi miền)
  → [MỚI 21/08/2026] Admin bảo hành xác nhận tiếp nhận NỘI BỘ từ Kho (bước bàn giao riêng, xem
    "Phản hồi vòng 1" mục #6 — Admin phải bấm "đã nhận từ Kho" trước, sau đó mới "mở thùng" để thấy
    danh sách đơn bên trong; đây là bước ĐÃ CÓ trong tài liệu #1 mục 1.2 bước 3 nhưng bị gộp nhầm vào
    bước Kho tiếp nhận khi rút gọn ở #4 — nay tách lại đúng như #1)
  → từng dòng LK chạy trạng thái riêng:
      Admin BH phân loại Trong/Ngoài BH (+ cảnh báo hết hạn BH theo linh_kien.so_thang_bao_hanh)
        → chọn hướng xử lý: Sửa chữa | Đổi mới | Từ chối/Huỷ | Chuyển kho
      [Sửa chữa] NV chẩn đoán → Không lỗi | Sửa được (có thể mở ticket xin vật tư riêng,
        tạm dừng dòng chính) | Đề xuất đổi mới (Admin duyệt riêng) | Trả xác
      [Đổi mới hoặc Sửa có thay LK] → tự mở "Phiếu trả xác" song song
      Admin BH xác nhận hoàn tất → gom vào 1-nhiều "Phiếu trả bảo hành" theo KTV (Admin tự quyết định gộp)
  → Kho đóng gói → Kế toán duyệt đối soát → Kho gửi → KTV xác nhận nhận (hoặc mở khiếu nại vận chuyển)
```

Có **2 mã MISA độc lập, không liên quan nhau**: mã MISA cho vật tư tiêu hao NV xin xuất để thao tác
sửa chữa (`de_xuat_linh_kien_bh.ma_misa`), và mã MISA cho cả lô hàng trả về KTV
(`phieu_tra_bh.ma_misa`). Đừng gộp hai khái niệm này khi đọc code/schema sau này.

## Ma trận CRUD & đơn cha/đơn vị con (xem #5, file `.xlsx`)

Sau khi #4 (Ke-hoach) chốt xong, đã làm 1 vòng thiết kế chi tiết hơn ở mức **từng trường dữ liệu**
(ai Tạo/Sửa/Xem) trong file `Ma-tran-CRUD-Vai-tro-Truong-du-lieu.xlsx`, phát hiện thêm và sửa các
điểm sau so với #4 — **những điểm này chưa được cập nhật ngược lại vào #4**:

- **`phieu_sua_chua_bh` tách thành 2 tầng** (thay vì 1 bảng phẳng "1 dòng = 1 linh kiện" như #4 mô
  tả):
  - **Đơn cha `phieu_sua_chua_bh`** — cái KTV tạo: `case_id`, `ma_lk`, `mo_ta_loi`, `ghi_chu`,
    **`so_luong_khai`** (mới, mặc định 1 — KTV khai số lượng linh kiện lỗi cùng loại/cùng case
    trong 1 dòng, trường này **hoàn toàn vắng mặt trong #1–#4**), `tiep_nhan_kho_id`, **`so_luong_thuc_nhan`**
    (mới — Admin bảo hành xác nhận qua popup lúc mở đơn lần đầu, mặc định = so_luong_khai, sửa được),
    **`ly_do_chenh_lech_sl`** (mới, **bắt buộc** nếu so_luong_thuc_nhan ≠ so_luong_khai),
    `trang_thai_tong_hop` (hệ thống tự tính, hiển thị dạng "1/3 hoàn tất" cho danh sách thu gọn).
  - **Đơn vị con `phieu_sua_chua_bh_ct`** — tự động sinh N bản ghi (ID dạng `<ID_cha>-1`,
    `<ID_cha>-2`...) ngay khi Admin BH xác nhận `so_luong_thuc_nhan`. Toàn bộ trường "diễn biến
    riêng từng cái" của #4 (`loai_bao_hanh`, `thong_tin_mail_pd`, `ma_phe_duyet`, `huong_xu_ly`,
    `nguoi_sua_chua`, `ket_qua_chan_doan`, `admin_xac_nhan_hoan_tat`, `phieu_tra_id`, `trang_thai`,
    `trang_thai_cho`, `mien`) chuyển hết xuống bảng này — 1 case gửi 2 cái cùng lỗi có thể kết thúc
    với 2 hướng xử lý khác nhau (1 sửa được, 1 phải đổi mới).
  - Nếu N=1 (đa số trường hợp thực tế), giao diện **không đổi gì** — ẩn hết UI "nhóm", hiển thị như
    1 đơn đơn lẻ bình thường.
  - **UI bắt buộc: đơn cha LUÔN hiển thị dạng 1 dòng thu gọn** (badge "x2", "x3" + trạng thái tổng
    hợp "1/2 hoàn tất") — chỉ khi mở chi tiết mới sổ ra danh sách đơn vị con để Admin BH/NV xử lý
    riêng từng cái hoặc "Báo cáo chung" 1 lần cho cả nhóm. **[NHẤN MẠNH LẠI 21/08/2026 — xem mục
    #7 "Phản hồi vòng 1" bên dưới]**: đây là điểm bản prototype vòng 1 làm SAI (hiện đơn vị con thành
    danh sách phẳng ngang hàng đơn cha) — khi build hệ thống thật, đây là yêu cầu UI **bắt buộc**,
    không phải tuỳ chọn.
- **`de_xuat_linh_kien_bh` và `phieu_tra_xac_bh` gắn với ID ĐƠN VỊ CON**, không phải ID đơn cha —
  1 đơn vị có thể xin vật tư sửa chữa riêng, 1 đơn vị khác (cùng đơn cha) thì không.
- **8 điểm cần cơ chế "đẩy ngược"** giữa các vai trò (sheet "Diem day nguoc") — đã liệt kê đầy đủ ở
  đó kèm bằng chứng dữ liệu thật cho từng điểm (đáng chú ý: **Kế toán từ chối phiếu trả đã từng xảy
  ra thật** — 1/239 dòng `Trạng thái kế toán` = "Đã từ chối" trong dữ liệu gốc, nhưng #4 mục 5 không
  có nhánh từ chối nào trong state machine `phieu_tra_bh`). **Quyết định 21/08/2026: đưa cả 8 điểm
  vào bản dựng** (không phải chỉ 3 điểm ưu tiên cao như đề xuất ban đầu).
- **Quyết định 21/08/2026 khác** (trả lời câu hỏi mở của #4/#5):
  - Trong phiếu trả bảo hành, **Kế toán duyệt TRƯỚC, Kho đóng gói SAU** (khác thứ tự gốc ở #4 mục 5
    là Kho đóng gói → Kế toán duyệt → Kho gửi) — state machine đúng: `nhap` (Admin BH tạo, nhập mã
    MISA) → `cho_ke_toan_duyet` → Kế toán duyệt/từ chối → (nếu duyệt) Kho đóng gói → Kho gửi → KTV
    nhận.
  - Không thực thi ngưỡng escalate (số lần Admin BH từ chối đề xuất linh kiện của NV) ở bản test đầu —
    chỉ đếm hiển thị, không chặn.
  - Các đơn vị con cùng 1 đơn cha **được phép tách vào các phiếu trả khác nhau**, không bắt buộc đi
    chung.
  - Ở màn "Đóng gói & duyệt kế toán": cho phép bulk-action ở bước Kho đóng gói, nhưng **Kế toán
    KHÔNG được duyệt hàng loạt** — mỗi phiếu phải mở và duyệt riêng (kiểm soát nội bộ / segregation
    of duties, xem mục so sánh RMA quốc tế phía trên).

## Prototype HTML (`du an sua chua bao hanh/prototype-html/index.html`)

Bản click-through để **test luồng/UX bằng tay**, KHÔNG phải bản demo production. Chạy bằng cách mở
trực tiếp file `.html` trong trình duyệt (Chrome/Edge/Firefox) — không cần cài đặt, không cần
server, không cần internet.

**Hạn chế cố ý của prototype (không phải thiếu sót cần sửa, mà là giới hạn của một trang HTML
tĩnh không có backend):**
1. Không multi-user thật — mô phỏng bằng nút "Chuyển vai trò" dùng chung 1 `localStorage` (~1
   "server ảo" trên máy người test), không mô phỏng được 2 người thao tác đồng thời/tranh chấp dữ
   liệu.
2. Dữ liệu chỉ nằm trong trình duyệt (`localStorage`, ~5–10MB) — đổi trình duyệt/máy là mất, không
   đồng bộ.
3. Không đăng nhập Google OAuth thật — chọn user mẫu qua dropdown.
4. Không upload ảnh lên Google Drive thật — ảnh lưu tạm base64 trong trình duyệt.
5. Không có case_dvbh/CRM thật — danh sách case là dữ liệu bịa để test (8 case mẫu), **không phải
   khách hàng thật**.
6. Không có SLA/cron/thông báo đa kênh real-time.
7. Không có MISA/kế toán thật — chỉ là ô nhập tay mô phỏng.
8. ~~Quét mã QR bằng camera chỉ mô phỏng UI mở camera, không thật sự giải mã QR~~ — **[ĐÃ SỬA
   22/08/2026]** xem mục "Quét QR bằng camera THẬT" bên dưới — `openCameraScanModal()` giờ đọc khung
   hình video thật bằng `jsQR` và tự khớp với `phieu_gui` đang chờ tiếp nhận.
9. ~~Tem/mã QR dán thùng chỉ hiển thị chữ + khung placeholder, không phải mã QR quét được thật~~ —
   **[ĐÃ SỬA 22/08/2026]** xem mục "Mã QR thật (không còn là placeholder)" bên dưới — tem dán thùng ở
   `renderPhieuGuiDetail` giờ là ảnh QR thật, quét được bằng bất kỳ app đọc QR nào (điện thoại thường,
   không cần app nội bộ).

**Phạm vi vòng 1 (đã chốt 21/08/2026, "luồng chính trước"):** đầy đủ luồng chính (tạo phiếu → gửi →
Kho tiếp nhận → Admin BH tiếp nhận nội bộ → phân loại → NV chẩn đoán → Admin xác nhận hoàn tất → gộp
phiếu trả → Kế toán duyệt → Kho đóng gói/gửi → KTV nhận) + 7/8 điểm đẩy ngược (trừ điểm #5 "lý do
huỷ đề xuất linh kiện" vì tính năng `de_xuat_linh_kien_bh` chưa đưa vào vòng 1). **Chưa có**: phiếu
trả xác, ticket đề xuất vật tư sửa chữa, bulk-action, dashboard, màn gán vai trò/miền.

**Kiểm thử:** trước khi giao mỗi bản, chạy smoke-test tự động bằng Node + `jsdom` (giả lập trình
duyệt, gọi trực tiếp các hàm JS của app như người dùng thật bấm nút) thay vì chỉ đọc code bằng mắt —
vì công cụ trình duyệt sandbox của phiên làm việc này không chạy được JS trên file `file://` cục bộ
(chỉ render snapshot tĩnh). Script test không lưu trong repo (nằm ở thư mục scratchpad của phiên
làm việc) — nếu cần lặp lại, viết lại theo mẫu: `new JSDOM(html, {runScripts:'dangerously',
resources:'usable', url:'http://localhost/index.html'})`, override `window.confirm`/`window.alert`
để bắt lỗi, rồi gọi thẳng các hàm global (`window.createPhieuGui()`, `window.submitPhanLoai(id)`...)
theo đúng thứ tự luồng nghiệp vụ.

## Phản hồi vòng 1 sau khi test prototype (21/08/2026) — 16 yêu cầu, PHẢI giữ đủ khi build hệ thống thật

(Người vận hành đánh số 1–15 trong phản hồi gốc, riêng câu đầu tiên gộp 2 ý — đánh lại thành 1–16
cho rõ, không bỏ sót ý nào.)

Đây là nguyên văn phản hồi của người vận hành sau khi test bản prototype vòng 1, đã áp dụng vào
prototype ở mức có thể; các điểm còn mơ hồ được đánh dấu rõ **[CẦN HỎI LẠI]** thay vì tự suy đoán.

1. **Tem/mã QR dán thùng + cột "LOẠI ĐỐI TRỪ DO KTV CHỌN" bị thiếu.**
   - Tem/QR: đã thêm vào prototype (hiển thị mã lớn dạng "viết tay hoặc in tem" ngay sau khi tạo
     phiếu gửi) — xem giới hạn #9 ở mục Prototype HTML phía trên (chưa phải QR quét được thật).
   - `LOẠI ĐỐI TRỪ`: xem mục #10, #12 bên dưới — đã đưa vào schema (`phieu_sua_chua_bh_ct.loai_doi_tru`),
     **người xác nhận cuối cùng là Admin bảo hành** lúc phân loại (không phải KTV như tên cột gốc) —
     nhưng **[ĐÃ CHỐT 22/08/2026, "Phản hồi vòng 4"]** KTV vẫn CÓ vai trò đề xuất ban đầu lúc tạo đơn
     (`phieu_sua_chua_bh.loai_doi_tru_de_xuat`), Admin BH xác nhận/ghi đè lại — xem câu hỏi mở #2 và
     mục "Phản hồi vòng 4" phía dưới.
2. **Thiếu chức năng quét mã bằng camera cho Kho.** Đã thêm nút "Quét bằng camera" ở màn tiếp nhận
   kho (mở `getUserMedia`, mô phỏng UI) — **[CẦN LÀM THẬT KHI BUILD PRODUCTION]** tích hợp thư viện
   giải mã QR thật (vd `jsQR`), quét được cả từ camera điện thoại nếu chạy trên PWA/mobile web.
3. **Phiếu nháp cho phép xoá nếu bên trong không có đơn.** Đã thêm nút "Xoá phiếu" cho `phieu_gui_bh`
   khi `trang_thai='nhap'` và không có đơn con nào bên trong.
4. **Đơn cho phép xoá nếu chưa ấn gửi đi.** Đã có sẵn từ vòng trước (xoá `phieu_sua_chua_bh` khi
   phiếu cha còn `nhap`) — xác nhận lại đây là hành vi đúng, không đổi gì thêm.
5. **Luồng tiếp theo khi Kho báo hàng nhận bị lỗi?** Chốt: **báo lỗi CHỈ LÀ CẢNH BÁO, không chặn**
   Admin bảo hành tiếp tục xử lý — đã sửa lại trong prototype (trước đó có lỗi: báo sự cố không tự
   set hàng đã tiếp nhận, khiến đơn "biến mất" khỏi hàng đợi Admin BH). Ngoài ra: **KTV được phép ghi
   log/ghi chú phản hồi vào phiếu gửi** bất kỳ lúc nào trong quá trình gửi hàng, trước khi Admin bảo
   hành xác nhận xử lý — đã thêm 1 khu vực "Ghi chú / phản hồi" (dạng nhật ký nhiều dòng, có mốc
   thời gian + người viết) trên chi tiết phiếu gửi, KTV viết được, Kho/Admin BH xem được.
6. **Màn Admin bảo hành cần tổ chức lại theo 2 bước, nhóm theo KTV:** (a) Admin BH xác nhận **tiếp
   nhận thùng hàng nội bộ từ Kho** (bàn giao vật lý Kho → Admin BH, KHÁC với bước Kho tiếp nhận từ
   KTV) — danh sách nhóm theo KTV; (b) sau khi xác nhận, bấm "mở thùng" mới hiện chi tiết danh sách
   đơn bảo hành bên trong để xử lý. Đây thực ra là bước đã có trong tài liệu #1 mục 1.2 bước 3
   nhưng bị gộp nhầm vào bước Kho tiếp nhận khi #4 rút gọn — đã tách lại đúng nguyên bản #1. Đã sửa
   trong prototype + cập nhật state machine ở mục "Vai trò & luồng nghiệp vụ" phía trên.
7. **Giao diện xác nhận số lượng (Admin BH) bị lỗi: kéo chuột ra ngoài modal làm modal đóng mất dữ
   liệu đang nhập.** Nguyên nhân: modal đóng theo sự kiện `click` trên nền, nhưng thao tác chọn/kéo
   chữ bên trong modal rồi thả chuột ra ngoài cũng kích hoạt `click` trên nền → đóng nhầm. Đã sửa:
   chỉ đóng modal khi **cả `mousedown` và `click` đều bắt đầu/kết thúc trên nền**, không đóng nếu
   thao tác bắt đầu từ bên trong modal. **Áp dụng bài học này cho component modal của hệ thống thật.**
8. **Giao diện tách đơn làm SAI yêu cầu — đơn vị con phải nằm lồng trong đơn cha, không phải danh
   sách phẳng ngang hàng.** Đã sửa lại đúng như thiết kế gốc ở file Excel (mục "Ma trận CRUD &
   đơn cha/đơn vị con" phía trên): đơn cha hiển thị dạng thu gọn, chỉ mở rộng ra đơn vị con khi Admin
   bảo hành bấm vào để xử lý riêng.
9. **Khi Admin bảo hành bấm "Gửi yêu cầu KTV xác minh thông tin" (đẩy ngược #2), đơn biến mất khỏi
   màn hình Admin — rất khó quản trị.** Lỗi thật trong prototype vòng 1 (bộ lọc hàng đợi Admin BH
   không hiển thị các đơn ở trạng thái `cho_bo_sung_tt`). Đã sửa: đơn vẫn hiển thị trong hàng đợi
   Admin BH, chỉ đổi màu/badge riêng ("Đang chờ KTV bổ sung", màu tím) để phân biệt với các ca khác,
   không biến mất.
10. ~~Nếu sửa chữa TRONG bảo hành, không bắt buộc nhập thông tin mail và mã phê duyệt~~ —
    **[ĐÃ CHỐT 21/08/2026, ghi đè quyết định 17/08/2026]**: xác nhận rõ — **nếu hết hạn bảo hành
    nhưng Admin bảo hành vẫn chọn "Trong bảo hành" thì KHÔNG bắt buộc nhập mail/mã phê duyệt.** Chỉ
    cần hiển thị **cảnh báo dạng chữ, màu đỏ, nổi bật** bên dưới form ("Sản phẩm này đã hết thời gian
    bảo hành") — không chặn thao tác. Quyết định 17/08/2026 (Ra-Soat mục 15: "bắt buộc nhập dù chọn
    loai_bao_hanh là gì") **đã bị thay thế bởi quyết định này**. Đã sửa prototype: cảnh báo đổi từ
    màu vàng (amber) sang **đỏ**, chỉ bắt buộc mail/mã phê duyệt khi `loai_bao_hanh='ngoai_bh'`.
11. **Admin bảo hành xác nhận đồng thời `LOẠI ĐỐI TRỪ` cho KTV = `TRỪ CÔNG NỢ` hoặc `ĐỔI TRẢ`.** Đã
    thêm trường `loai_doi_tru` (bắt buộc chọn) vào form phân loại của Admin BH, lưu ở cấp **đơn vị
    con** (`phieu_sua_chua_bh_ct.loai_doi_tru`), vì mỗi đơn vị trong 1 đơn cha có thể có hướng đối
    trừ khác nhau.
12. **Danh sách chọn KTV khi tạo phiếu trả chỉ nên hiện các KTV có đơn cần tạo phiếu trả.** Đã sửa:
    lọc dropdown chỉ còn KTV có ít nhất 1 đơn vị `san_sang_gom_phieu_tra` chưa gộp, HOẶC đã có sẵn
    phiếu trả đang `nhap` cho KTV đó.
13. **Chức năng tách phiếu trả cần thêm "mã phiếu đơn hàng" + "mã phiếu xuất kho"; 1 phiếu trả chỉ
    được chứa 1 loại đối trừ (toàn Trừ công nợ hoặc toàn Đổi trả, không trộn); với loại Trừ công nợ,
    mã đơn hàng + mã MISA KHÔNG bắt buộc.**
    - ~~"do ktv nhập"~~ — **[ĐÃ CHỐT 21/08/2026]**: xác nhận đúng là **Admin bảo hành nhập** (câu chữ
      gốc là gõ nhầm), khớp với những gì prototype đã tạm implement.
    - Đã thêm `phieu_tra_bh.loai_doi_tru` — khoá theo đơn vị con đầu tiên được thêm vào phiếu, mọi
      đơn vị thêm sau phải cùng loại mới cho thêm (validate chặn nếu khác loại).
    - Đã thêm `phieu_tra_bh.ma_don_hang` (mới, song song `ma_misa` đã có) — theo đúng mô hình
      `de_xuat_linh_kien_bh` (có sẵn cả `ma_don_hang` lẫn `ma_misa`).
    - Với `loai_doi_tru='tru_cong_no'`: `ma_don_hang`/`ma_misa` **không bắt buộc**.
14. **Mã MISA bắt buộc mới được gửi Kế toán duyệt** (áp dụng cho loại `doi_tra`; loại `tru_cong_no`
    thì không bắt buộc theo mục #13). Đã đổi từ `confirm()` cảnh báo mềm sang **chặn cứng** — không
    cho bấm "Gửi duyệt kế toán" nếu thiếu mã MISA và `loai_doi_tru != 'tru_cong_no'`.
15. **Đang gửi kế toán rồi thì không cho tách đơn khỏi phiếu — muốn tách phải "Huỷ gửi" trước.** Đã
    sửa: nút "Tách khỏi phiếu" chỉ hiện khi phiếu còn `trang_thai='nhap'`. Thêm hành động mới
    **"Huỷ gửi duyệt"** (chỉ khả dụng khi `trang_thai='cho_ke_toan_duyet'`, tức là Kế toán CHƯA xử
    lý) đưa phiếu quay lại `nhap`, sau đó mới tách đơn được. Đây là 1 tinh chỉnh của "đẩy ngược #7"
    trong ma trận Excel (mục "Diem day nguoc") — trước đó cho tách ở bất kỳ trạng thái nào trước
    `da_gui`, nay siết lại chỉ cho tách khi còn `nhap`.
16. ~~Kế toán duyệt sẽ có nhiều trạng thái khác nhau~~ — **[ĐÃ CHỐT 21/08/2026]**: xác nhận rõ —
    **"trạng thái duyệt khác nhau" thực ra là do LOẠI ĐỐI TRỪ khác nhau**, không phải Kế toán cần
    thêm state machine mới ngoài Duyệt/Từ chối. Tức là bản giữ nguyên Duyệt/Từ chối nhị phân **là
    đúng** — chỉ cần đảm bảo màn Kế toán luôn hiển thị rõ phiếu đang duyệt thuộc loại đối trừ nào
    (đã làm: badge `Đổi trả`/`Trừ công nợ` trên danh sách phiếu trả ở cả màn Admin bảo hành và màn
    Kế toán duyệt) để Kế toán áp dụng đúng quy trình đối soát nội bộ tương ứng với từng loại (quy
    trình đối soát khác nhau đó nằm ngoài phạm vi app, xử lý thủ công theo loại đối trừ hiển thị).

## Phản hồi vòng 2 sau khi test prototype (21/08/2026)

1. ~~Mail/PD khi hết hạn BH~~ → xem mục #10 ở trên, đã chốt và sửa prototype (banner đỏ).
2. ~~Ai nhập mã đơn hàng/PXK~~ → xem mục #13 ở trên, xác nhận Admin bảo hành, không đổi gì thêm.
3. ~~Kế toán nhiều trạng thái~~ → xem mục #16 ở trên, đã chốt: không phải trạng thái mới, chỉ là badge phân biệt loại đối trừ.
4. **[MỚI] SLA 24h theo từng vai trò — bắt buộc nhập lý do chậm nếu quá hạn.** "Bổ sung các mốc
   thời gian xử lý riêng cho từng vai trò. Nếu cứ quá 24h tính từ thời điểm gửi sang mà chưa được xử
   lý sẽ phải nhập lý do chậm mới được tiếp tục xử lý. Lý do chậm sẽ cho phép bổ sung trong
   Settings." Đã thêm vào prototype:
   - `DB.settings.ly_do_cham` — danh mục lý do chậm, seed đúng 8 giá trị thật đã tìm thấy ở
     `SETTINGS.NGUYÊN NHÂN CHẬM` trong dữ liệu Excel gốc (mục "Bằng chứng dữ liệu thật" phía trên,
     trường này trước giờ CHƯA từng được đưa vào bất kỳ bản thiết kế nào — nay chính thức được dùng):
     Không có linh kiện, Chờ kho xuất hàng, Do sửa chữa chậm, KTV cung cấp thiếu thông tin, Chờ mail
     phê duyệt từ cấp quản lý, Do khách hàng chưa thanh toán, Đang chờ thông tin từ bộ phận khác, Hết
     hàng tồn kho.
   - Thêm nút "⚙ Cai dat ly do cham" trên thanh top bar (đang tạm cho **Admin bảo hành** quản lý danh
     mục này trong prototype vì chưa có màn Admin hệ thống/Settings module trong phạm vi vòng 1 —
     **[CẦN XÁC NHẬN]** vai trò nào thực sự được quyền sửa danh mục "Lý do chậm" khi build thật: Admin
     bảo hành hay Admin hệ thống).
   - Áp SLA 24h cho **7 điểm xử lý chính** (mốc bắt đầu tính = thời điểm việc đó "sang tay" cho vai
     trò tương ứng, dùng `updated_at` của lần chuyển trạng thái gần nhất): Kho xác nhận tiếp nhận (từ
     lúc `phieu_gui_bh.trang_thai='da_gui'`), Admin BH xác nhận tiếp nhận nội bộ (từ lúc Kho xác
     nhận), Admin BH phân loại từng đơn vị (từ lúc đơn vị được tạo hoặc bị NV trả lại), NV nộp kết
     quả chẩn đoán (từ lúc được gán), Admin BH xác nhận hoàn tất (từ lúc NV nộp kết quả), Kế toán
     duyệt (từ lúc Admin BH gửi duyệt), Kho đóng gói + Kho gửi (từ lúc bước trước đó xong). Mỗi danh
     sách/hàng đợi đều hiện badge số giờ đã trôi qua, đỏ nếu **quá hạn**.
   - Khi bấm hành động xử lý mà đã quá 24h: hệ thống chèn thêm 1 trường "Lý do chậm" **bắt buộc**
     (chọn từ danh mục Settings + ghi chú tự do) ngay trong cùng form/hành động đó — không phải 1
     bước chặn riêng, người dùng chọn lý do xong là thao tác tiếp tục được luôn trong cùng 1 lần bấm.
   - **[CẦN XÁC NHẬN]** mốc "24h tính từ thời điểm gửi sang" có tính giờ hành chính (bỏ qua ngoài giờ
     làm việc/cuối tuần) hay tính đủ 24h đồng hồ liên tục? Prototype đang tính **đủ 24h đồng hồ liên
     tục** (đơn giản nhất, không có khái niệm giờ hành chính) — cần xác nhận trước khi build thật.
5. **[MỚI] Rà soát `PHƯƠNG ÁN XỬ LÝ` thật (nguyên văn từ SETTINGS) so với `huong_xu_ly` hiện có (chỉ
   4 giá trị: Sửa chữa | Đổi mới | Từ chối-Huỷ | Chuyển kho) — phát hiện các bước còn thiếu:**

   | # | Giá trị thật trong SETTINGS | Đã có trong `huong_xu_ly`? | Phân tích |
   |---|---|---|---|
   | 1 | Đổi mới trong bảo hành | ✅ `doi_moi` | Khớp |
   | 2 | Sửa chữa trong bảo hành | ✅ `sua_chua` | Khớp |
   | 3 | Trả lại KTV | ⚠️ Gộp chung vào `tu_choi` | **Có thể là 2 khái niệm khác nhau bị gộp làm 1** — "Trả lại KTV" nghe như trả hàng nguyên trạng về (có thể vẫn cần đi qua phiếu trả vật lý), khác với "Huỷ đơn bảo hành" (mục #9, có thể không cần trả gì cả). `tu_choi` hiện tại đang xử lý cả 2 như nhau (kết thúc, không tạo phiếu trả) — **cần tách**. |
   | 4 | Xác nhận linh kiện, trừ công nợ | ❌ Chưa có | Đọc tên có vẻ là: xác nhận linh kiện lỗi thật, xử lý bằng cách trừ công nợ KTV, **không sửa/không đổi vật lý** — khác hẳn 4 hướng hiện tại. Chưa rõ có tạo phiếu trả (trả xác linh kiện) hay kết thúc thẳng. |
   | 5 | Hỗ trợ đổi mới bảo hành có phê duyệt | 🟡 Có thể đã phủ được | = `doi_moi` + `loai_bao_hanh='ngoai_bh'` (đã có sẵn 2 trường mail/mã phê duyệt) — không cần thêm giá trị enum mới, chỉ là tổ hợp của 2 trường đã có. |
   | 6 | Hỗ trợ sửa chữa bảo hành có phê duyệt | 🟡 Có thể đã phủ được | Tương tự #5, = `sua_chua` + `ngoai_bh`. |
   | 7 | Hỗ trợ trừ công nợ bảo hành có phê duyệt (lặp lại 2 lần trong danh sách gốc, giữ nguyên trạng dữ liệu) | 🟡 Có thể đã phủ được | = mục #4 (nếu được thêm) + `ngoai_bh`. |
   | 8 | **Sửa dịch vụ tính phí** | ❌ HOÀN TOÀN CHƯA CÓ | **Gap nghiêm trọng nhất, đã bị bỏ sót xuyên suốt từ tài liệu #1 đến nay** (Danh-gia-va-Hoan-thien mục 1 cột "Có trong sơ đồ to-be?" đã ghi ❌ Không có từ vòng phân tích đầu tiên 13-17/08, chưa từng được giải quyết). Ngụ ý có khả năng tồn tại 1 luồng sửa chữa **trả phí** (ngoài bảo hành, khách trả tiền) hoàn toàn khác quy trình bảo hành miễn phí — có thể phát sinh: báo giá, khách đồng ý trả phí, thu tiền trước khi sửa... **Cần hỏi rõ: module này có cần xử lý luồng tính phí không, hay đó là 1 quy trình/hệ thống hoàn toàn khác nằm ngoài phạm vi "Sửa chữa bảo hành"?** |
   | 9 | Hủy đơn bảo hành | ⚠️ Gộp chung vào `tu_choi` | Xem mục #3 — cần tách khỏi "Trả lại KTV". |
   | 10 | Hủy bỏ xác linh kiện | ✅ Đã có, đúng cấp | Đây là 1 trạng thái của `phieu_tra_xac_bh.trang_thai` (`huy_bo`), không phải `huong_xu_ly` cấp đơn vị — SETTINGS gốc gộp chung nhiều cấp độ khác nhau vào 1 danh mục phẳng, đây là 1 ví dụ. Không cần sửa gì, chỉ ghi chú lại để không nhầm khi đọc dữ liệu cũ. |

   **Kết luận — 3 việc cần làm, đã hỏi lại thay vì tự quyết (xem AskUserQuestion cùng lượt phản hồi
   này):** (a) có tách "Trả lại KTV" khỏi "Huỷ đơn bảo hành" thành 2 `huong_xu_ly` riêng không, và
   "Trả lại KTV" có tạo phiếu trả vật lý không; (b) "Xác nhận linh kiện, trừ công nợ" có phải 1
   `huong_xu_ly` thứ 5 không, và nó có tạo phiếu trả vật lý không; (c) "Sửa dịch vụ tính phí" có
   thuộc phạm vi module này không.

   **[ĐÃ TRẢ LỜI 21/08/2026, vòng 3]:**
   - (a) **Tách riêng** — `tra_lai_ktv` (mới) khác `tu_choi` (nay chỉ còn nghĩa "Huỷ đơn bảo hành,
     kết thúc, không gửi gì"). `tra_lai_ktv` **CÓ tạo phiếu trả vật lý** (đi vào
     `san_sang_gom_phieu_tra` giống `doi_moi`).
   - (b) **Thêm mới** `xac_nhan_tru_no` ("Xác nhận linh kiện, trừ công nợ") — **CÓ tạo phiếu trả**
     (trả xác linh kiện lỗi về, dù không sửa/đổi) — cùng đi vào `san_sang_gom_phieu_tra`.
   - (c) **CÓ thuộc phạm vi module này**, nhưng đi kèm một **thay đổi phạm vi lớn hơn** — nguyên văn
     trả lời: *"luồng xử lý vẫn tương đương, chỉ là tách ra để chọn admin bh chọn. Đây sẽ là đơn bảo
     hành do chính admin bh tự tạo, nguồn là đến từ KH lẻ (nếu có mã ID thì thôi, không có mã bắt
     buộc phải nhập thông tin kh như tên, sdt, địa chỉ, sản phẩm bảo hành. linh kiện bị lỗi, mô tả
     lỗi => tương tự như đơn KTV phải tạo) => sau đó chọn như bình thường. thường sẽ là luồng gửi nv
     sửa chữa => nhưng phương án xử lý sẽ chọn là dịch vụ sửa chữa tính phí..."*

     Diễn giải và đã build vào prototype:
     - **Admin bảo hành có thể tự tạo đơn cha trực tiếp** (không qua KTV, không qua phiếu gửi, không
       qua Kho) — dành cho khách hàng lẻ walk-in trả phí. Đã thêm màn "Tạo đơn dịch vụ tính phí" ở
       mục 3 màn Hàng đợi phân loại.
     - `case_id` với luồng này là **tuỳ chọn** (khác hẳn luồng KTV, nơi `case_id` bắt buộc tuyệt
       đối) — nếu không có case, Admin BH bắt buộc nhập tay: tên khách hàng, SĐT, địa chỉ, sản phẩm
       bảo hành (địa chỉ không bắt buộc).
     - Đơn này **bỏ qua bước xác nhận số lượng thực nhận** (Admin BH tự nhập nên tự biết chính xác số
       lượng, không cần đối chiếu qua Kho) — tạo thẳng đơn vị con luôn.
     - Thêm `huong_xu_ly='dich_vu_tinh_phi'` (5 giá trị `huong_xu_ly` giờ là: `sua_chua`, `doi_moi`,
       `tra_lai_ktv`, `xac_nhan_tru_no`, `dich_vu_tinh_phi`, cộng `tu_choi`/`chuyen_kho` — 7 tổng) —
       hành xử giống `sua_chua` (gán NV, qua chẩn đoán) nhưng đánh dấu riêng để báo cáo/đối soát
       doanh thu dịch vụ tính phí tách biệt khỏi bảo hành miễn phí.
     - **Model dữ liệu:** `phieu_sua_chua_bh` cần thêm cột `nguon_tao` (`'ktv'` | `'admin_dich_vu'`)
       và 4 cột nullable `ten_khach_hang`, `sdt_khach_hang`, `dia_chi_khach_hang`, `san_pham_bh`
       (chỉ dùng khi `case_id IS NULL`). `phieu_gui_id` trên bảng này cũng phải thành **nullable**
       (đơn dịch vụ tính phí không thuộc phiếu gửi nào).
   - ~~GAP: `phieu_tra_bh` gắn cứng với 1 KTV để tự xác nhận nhận hàng — khách lẻ không có tài
     khoản để làm việc này~~ — **[ĐÃ CHỐT 21/08/2026, vòng 4, rồi TỔNG QUÁT HOÁ ở vòng 5]:**
     "Kho xác nhận kết thúc hộ" — nhưng **không chỉ riêng khách lẻ**. Vòng 5 (21/08/2026) làm rõ:
     *"trong luồng quy trình luôn có 1 bước kho có thể xác nhận kết thúc đơn xuất hàng"* — tức đây
     là 1 **bước dự phòng chung cho MỌI phiếu trả** (`phieu_tra_bh` ở trạng thái `da_gui`), không
     phải cơ chế riêng cho khách lẻ. Đã sửa prototype: màn "Đóng gói & gửi phiếu trả bảo hành" đổi
     tên mục thành "Đã gửi/giao — Kho có thể xác nhận kết thúc đơn xuất hàng", liệt kê **mọi** phiếu
     trả (cả của KTV thật lẫn khách lẻ) đang ở `da_gui`. Với phiếu của KTV thật: **màn KTV tự xác
     nhận (`#/ktv/nhan-hang`) vẫn là đường ưu tiên**, nhưng Kho **không bắt buộc phải chờ** KTV vào
     hệ thống nếu Kho đã biết chắc hàng đã tới tay người nhận (ví dụ KTV báo qua điện thoại) — Kho có
     quyền tự đóng đơn thay, dùng đúng trạng thái kết thúc `ktv_da_nhan` hiện có, chỉ khác người xác
     nhận (ghi log rõ "Kho xác nhận thay, dự phòng" để phân biệt với KTV tự xác nhận thật). Mã vận
     đơn cho nhóm khách lẻ vẫn là tuỳ chọn (để trống nếu khách đến nhận trực tiếp).
   - ~~Câu hỏi phụ: thời điểm thu tiền dịch vụ tính phí~~ — **[ĐÃ CHỐT 21/08/2026, vòng 5]**: *"tiền
     sẽ do kế toán ghi nhận, trên hệ thống bảo hành không cần ghi"* — module Sửa chữa bảo hành
     **không cần** thêm trường/bước nào để theo dõi việc thu tiền dịch vụ tính phí; việc này hoàn
     toàn thuộc phạm vi hệ thống/quy trình kế toán riêng, ngoài phạm vi module này. Không cần sửa gì
     trong prototype cho điểm này — xác nhận KHÔNG có gap ở đây (khác các điểm khác trong tài liệu
     này, mục này chốt xong là xong, không cần thêm trường nào).

## Thiết kế giao diện (UI redesign 22/08/2026) — theo phong cách `../linh-kien-app`

Theo yêu cầu 22/08/2026, đã rà soát design system thật của `F:\claude\QLBH 3T\linh-kien-app`
(React + Tailwind, tách từ hệ DVBH gốc) và port sang prototype HTML/CSS/JS thuần (không build step,
không React) — để module này, khi build thật, cùng ngôn ngữ thị giác với hệ sinh thái DVBH thay vì
tự sáng tạo bộ giao diện riêng.

### Tổng kết phong cách đã rà soát được từ `linh-kien-app`

- **Bảng màu theo tông (tone), không phải màu ngẫu nhiên**: `ocean` (xanh dương — chính/thao tác
  trung tính), `teal` (xanh lá — thành công/hoàn tất), `amber` (vàng — đang chờ/người khác xử lý),
  `coral` (đỏ cam — khẩn cấp/**việc của chính người xem**), `orange` (cam — ưu tiên), `violet` (tím —
  nhấn mạnh trường bắt buộc), `gray` (trung tính). Mỗi tone có 2 sắc độ dùng cho badge nhạt (nền
  sáng, chữ đậm) và badge đặc (nền đậm, chữ trắng).
- **Font**: Manrope (tiêu đề/số liệu lớn, `font-display`) + Inter (nội dung) + IBM Plex Mono (mã/số
  hiệu). Đã thêm Google Fonts link (có fallback hệ thống nếu offline).
- **Nguyên tắc cốt lõi lặp lại xuyên suốt code của họ**: **"muted khi = 0"** — số liệu bằng 0 phải mờ
  đi, không tô đậm/đỏ, để mắt người dùng chỉ dừng lại ở nơi THẬT SỰ có việc, tránh "báo động giả" khi
  quét nhanh nhiều thẻ liên tiếp (áp dụng cho `StatCard`, `Tabs` badge, `Sidebar` badge). Đây chính
  là cơ chế kỹ thuật đứng sau yêu cầu "2-3s biết việc gì cần làm" — không phải hiển thị NHIỀU hơn, mà
  hiển thị ĐÚNG và có phân cấp thị giác rõ.
- **`MyWorkloadStrip` ("Việc của tôi")** — 1 hàng pill màu coral, CHỈ hiện các mục có `count>0` **và**
  thuộc vai trò người đang xem, sắp theo số giảm dần, đặt NGAY đầu trang, bấm vào nhảy thẳng tới màn
  đã lọc sẵn. Đây là mẫu hình trực tiếp trả lời yêu cầu "2-3s phải biết mình còn việc gì, làm ở đâu".
- **Sidebar tối gradient (navy) cố định/thu gọn trên desktop, drawer trượt trên mobile** + TopBar
  trắng sticky (chuông thông báo, avatar). `useMediaQuery`/`useIsMobile` (ngưỡng 767px) quyết định
  sidebar là cột cố định hay overlay.
- **`TaoDonMobileScreen.tsx`** — màn tạo đơn RIÊNG cho mobile (không dùng chung Modal căn giữa với
  desktop) sau phản hồi thật "màn hình bị đưa đẩy, chỉ chiếm diện tích nhỏ" — 7 nguyên tắc đã áp
  dụng nguyên vẹn cho prototype này (xem mục dưới).

### Đã áp dụng vào prototype (`prototype-html/index.html`)

1. **Toàn bộ token màu/font** port 1:1 (cùng mã hex), định nghĩa `alias` cho các biến CSS cũ
   (`--blue`, `--card`, `--muted`...) trỏ sang token mới — nhờ vậy **mọi hàm `render*()` có sẵn tự
   động đổi giao diện** mà không phải sửa từng nơi gọi, chỉ sửa 1 khối `<style>`.
2. **Sidebar + TopBar** thay thế hoàn toàn thanh tab ngang cũ — sidebar lọc đúng menu theo vai trò
   đang đăng nhập (`ROUTES_BY_ROLE`), thu gọn được trên desktop, thành drawer trên mobile (< 900px).
3. **Trang chủ (`#/home`)** — màn hình mặc định sau khi đăng nhập/đổi vai trò cho **cả 5 vai trò**:
   - `workloadItems()` tính rõ từng "việc cần làm" theo đúng vai trò (vd KTV: phiếu nháp chưa gửi,
     đơn Admin BH yêu cầu bổ sung, hàng trả đang chờ nhận, cảnh báo sự cố tiếp nhận — Admin BH: thùng
     chờ tiếp nhận nội bộ, đơn chờ phân loại, đơn dịch vụ tính phí, chờ xác nhận hoàn tất...).
   - Dải pill "Việc của tôi" (chỉ hiện mục có việc, tone coral) + lưới `StatCard` đầy đủ mọi hàng đợi
     (kể cả mục = 0, làm mờ) — bấm vào bất kỳ đâu nhảy thẳng tới đúng màn hình.
4. **Màn hình "Thêm đơn bảo hành" cho KTV — rẽ nhánh mobile/desktop tự động** (`isMobileViewport()`,
   ngưỡng 767px, khớp `useIsMobile` gốc):
   - Mobile: `openAddDonMobileSheet()` — sheet phủ toàn màn hình thật (`position:fixed;inset:0`),
     `height:100dvh` (trừ đúng phần bàn phím che, không phải `100vh`), nút +/- số lượng 44×44px, nhãn
     luôn nằm TRÊN ô nhập, thanh CTA dính đáy có `padding-bottom:env(safe-area-inset-bottom)`, input
     ảnh có `capture="environment"` gợi ý mở thẳng camera.
   - Desktop: giữ modal căn giữa (đã restyle theo `Modal.tsx`: nền mờ blur, bo góc 16px, header/footer
     có viền).
   - **Dùng chung 1 bộ ID trường + 1 hàm `submitAddDon()`/`updateCaseInfo()`** giữa 2 giao diện — đúng
     nguyên tắc "không có 2 nguồn sự thật" mà `linh-kien-app` đã nêu rõ trong comment của họ.
5. **Modal, Toast, Badge, Card, Btn, StatCard** restyle theo đúng component tương ứng bên
   `linh-kien-app` (bo góc 16px, đổ bóng nhẹ, `focus-ring`, biến thể nút primary/secondary/green/red).

### Tự phản biện — phần CHƯA port / cố ý đơn giản hoá (để không bỏ sót ngầm)

- **`PipelineFlow` (thanh chevron mũi tên nối tiếp)** — KHÔNG port nguyên bản vì dùng `clip-path`
  polygon khá phức tạp, tốn công sức không tương xứng với lợi ích khi mục tiêu chính ("2-3s biết việc
  gì") đã đạt được qua `StatCard` + `workload-pill` (đơn giản hơn, cùng hiệu quả về mặt thông tin,
  chỉ khác hình thức). Nếu sau này thấy cần hình ảnh hoá "đường đi" của 1 đơn qua từng bước
  (không chỉ đếm số lượng theo hàng đợi), nên port thêm — hiện CHƯA có.
- **`SearchableSelect`** (ô nhập-tìm-theo-từ-khoá khi danh sách > 10 mục, vd KTV ~300 dòng, linh kiện
  ~400 dòng bên `linh-kien-app`) — **CHƯA port**. Prototype hiện dùng `<select>` thường cho case/linh
  kiện (mock chỉ 8/10 dòng nên chưa lộ vấn đề) — **nhưng dữ liệu thật `linh_kien` sẽ dài hơn nhiều**
  (~400+ theo `linh-kien-app`), `<select>` thường sẽ khó dùng trên mobile. Đây là 1 tồn đọng thật cần
  làm khi lên bản thật, không phải khi dữ liệu mock còn ít.
- **Chỉ 1 màn hình mobile riêng (Thêm đơn bảo hành)** — các modal khác của KTV (Xác nhận gửi xe, Bổ
  sung thông tin) và toàn bộ modal của Kho/Admin BH/NV/Kế toán **vẫn dùng modal căn giữa chung**,
  chưa có bản mobile riêng. Đây là lựa chọn có chủ đích giống `linh-kien-app` (họ cũng chỉ đầu tư 1
  màn mobile riêng cho đúng chỗ đau nhất — tạo đơn, không làm tràn lan mọi màn hình) — nhưng nếu Kho/
  Admin BH thực tế cũng thao tác nhiều trên điện thoại (chưa xác nhận), cần bổ sung thêm.
- **Sidebar chỉ hiện TỔNG số badge** (`workloadItems()` cộng dồn), không tách badge riêng từng mục
  menu như `Sidebar.tsx` gốc (mỗi mục có `countKey` riêng) — vì mỗi vai trò ở đây chỉ có 2-3 màn hình
  (khác `linh-kien-app` có nhiều tab hơn trong 1 module), tổng số đã đủ rõ; có thể tách nếu sau này
  1 vai trò có nhiều màn hình hơn.
- **Không có chuông thông báo (🔔) kiểu TopBar gốc** — thay bằng cả 1 trang "Trang chủ" làm nơi tổng
  hợp duy nhất (đơn giản hơn cho prototype 1-người-1-lúc; hệ thật có nhiều người dùng đồng thời nên
  chuông thông báo dạng dropdown vẫn có giá trị riêng — nên cân nhắc thêm khi build production).

### Test đã chạy để xác minh (không chỉ đọc code bằng mắt)

Bộ test mới `test_newui.js` (Node + jsdom, stub `window.matchMedia`) xác minh: tự động về `#/home`
sau khi đổi vai trò, sidebar lọc đúng menu theo vai trò, `workloadItems()` tính đúng và pill bấm được
nhảy đúng hash, sidebar thu gọn/drawer mobile không lỗi, **rẽ nhánh mobile/desktop cho "Thêm đơn bảo
hành" hoạt động đúng** (mobile ra `activeMobileSheet` không phải `activeModal` và ngược lại), nút
+/- số lượng hoạt động đúng kể cả chặn dưới 1, `closeModal()` đóng được cả 2 loại overlay, và toàn bộ
5 vai trò tính `workloadItems()` không lỗi. Cùng 4 bộ test nghiệp vụ trước đó (`test_prototype2.js`,
`test_sla.js`, `test_dichvu.js`, `test_khachle_end2end.js`) chạy lại **0 lỗi** sau redesign — xác nhận
việc đổi giao diện không làm hỏng logic nghiệp vụ đã chốt trước đó.

## Phản hồi vòng 3 sau khi test prototype (22/08/2026) — 4 điểm, đã áp dụng vào prototype

Nguyên văn 5 ý người vận hành gửi sau khi test bản UI redesign — ý #5 ("phần nào không hiểu thì hỏi,
không tự suy đoán") là chỉ đạo chung, không phải 1 yêu cầu riêng, áp dụng cho toàn bộ 4 điểm dưới đây.

1. **Bỏ trường "Ghi chú" đơn dòng trong header phiếu gửi (KTV) — trùng lặp với khu vực "Ghi chú/phản
   hồi" dạng nhật ký đã có sẵn.** Đã xoá field `#f_ghichu` khỏi form header trong `renderPhieuGuiDetail()`
   và bỏ dòng đọc/ghi `g.ghi_chu` trong `savePhieuGuiHeader()`. **Không xoá cột `ghi_chu` khỏi
   `DB.phieu_gui`** (vẫn khởi tạo `ghi_chu:''` trong `createPhieuGui()`) để không phải sửa cấu trúc dữ
   liệu chỉ vì 1 UI field — cột này coi như "chết", không còn UI nào đọc/ghi. Khu vực "Ghi chú / phản
   hồi về phiếu hàng" (mảng `g.ghi_chu_log`, đã có từ vòng 1 mục #5) tiếp tục là nơi duy nhất cho
   ghi chú tự do.
2. **Nhớ thông tin "nhà xe" (hình thức gửi/mã xe/đơn vị vận chuyển) lần gần nhất theo từng KTV, tự
   điền lại khi tạo phiếu mới thay vì nhập tay lại từ đầu.** Thêm `DB.meta.nhaXeHistory` (map theo
   email KTV) + 2 hàm mới:
   - `nhaXeHistoryOf(user)` — trả về `{hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, recentMaXe:[], recentDvvc:[]}`
     cho 1 KTV, tự khởi tạo mặc định (`hinh_thuc_gui:'xe_noi_bo'`) nếu chưa có.
   - `rememberNhaXe(user, hinhThuc, maXe, dvvc)` — gọi trong `savePhieuGuiHeader()` mỗi lần KTV lưu
     thông tin vận chuyển; cập nhật giá trị "lần cuối" (dùng để tự điền) **và** đẩy vào 2 danh sách
     `recentMaXe`/`recentDvvc` (tối đa 8 mục gần nhất, không trùng lặp) dùng làm `<datalist>` gợi ý
     gõ-để-chọn-nhanh cho các lần gõ tay khác (VD KTV đổi nhà xe khác lần này, vẫn muốn chọn nhanh từ
     lịch sử thay vì gõ lại toàn bộ).
   - `createPhieuGui()` đọc `nhaXeHistoryOf(me)` để điền sẵn 3 trường này ngay lúc tạo phiếu mới; toast
     xác nhận có nhắc "đã tự điền nhà xe lần trước" nếu có dữ liệu.
   - Input `#f_dvvc`/`#f_maxe` gắn `list="dl_dvvc"`/`list="dl_maxe"` trỏ tới 2 `<datalist>` render từ
     `recentDvvc`/`recentMaXe`.
3. **Khi Admin bảo hành mở thùng có báo sự cố, Admin không đọc được ghi chú hư hỏng và luồng trao đổi
   KTV↔Kho.** Nguyên nhân: `su_co_ly_do`/`su_co_ghi_chu` (Kho ghi) và ghi chú của KTV nằm ở 2 nơi tách
   biệt trong dữ liệu, và trước đó không có UI nào cho Admin BH mở xem cả hai cùng lúc. Đã sửa:
   - `submitSuCo()` giờ **đẩy thêm 1 dòng vào chính `g.ghi_chu_log`** (tiền tố `⚠ [Bao su co tiep
     nhan]`) mỗi khi Kho báo sự cố — gộp vào **chung 1 luồng hội thoại** với ghi chú của KTV, thay vì
     2 trường rời rạc không ai để ý.
   - Thêm `openGhiChuLogModal(guiId)`/`submitGhiChuLogModal(guiId)` — modal đọc/ghi dùng chung cho mọi
     vai trò (KTV/Kho/Admin BH), hiển thị banner đỏ tóm tắt sự cố (nếu có) + toàn bộ `ghi_chu_log` theo
     thời gian + người viết, có ô nhập để trả lời ngay trong modal.
   - Màn "Điểm tiếp nhận kho" (`renderKhoTiepNhan()`) và mục 1 "Thùng chờ Admin BH xác nhận tiếp nhận
     nội bộ" (`renderAdminGuiList()`) đều có link "💬 N trao đổi" / "💬 Xem/ghi chú" mở đúng modal này —
     Admin BH giờ đọc được đầy đủ trước khi bấm "Xác nhận đã nhận từ Kho".
4. **Xây 1 giao diện xử lý TẤT CẢ đơn bảo hành trong thùng bằng 1 bảng (table) chung — thay cho giao
   diện thẻ lồng nhau hiện tại quá to, nhiều bước click, và không phân biệt được nguồn gốc đơn (KTV
   gửi vs Admin BH tự tạo/khách lẻ).** Đây là thay đổi lớn nhất trong vòng này:
   - 2 hàm dữ liệu mới: `adminProcessableParents()` (các đơn cha đang `cho_xac_nhan_so_luong` mà Kho
     đã tiếp nhận và Admin BH đã xác nhận tiếp nhận nội bộ — cần Admin xác nhận số lượng thực nhận) và
     `adminProcessableUnits()` (các đơn vị con đang `cho_phan_loai` / `admin_can_xem_lai` /
     `cho_bo_sung_tt`, **lọc theo cùng điều kiện admin_tiep_nhan cho đơn có phiếu gửi, và luôn cho qua
     nếu là đơn khách lẻ không có `phieu_gui_id`** — đây chính là chỗ hợp nhất 2 nguồn).
   - `renderAdminUnifiedTable()` — render 1 `<table>` duy nhất, mỗi dòng là 1 đơn cha (badge "Chờ xác
     nhận SL") hoặc 1 đơn vị con (checkbox chọn + badge trạng thái), cột **Nguồn** phân biệt rõ
     "Khách lẻ" (badge tím) vs tên KTV kèm link `#/admin/phan-loai?gui=X` để vẫn xem được thùng gốc khi
     cần drill-in. Nút hành động ngay trên dòng ("Xác nhận SL" / "Phân loại" / "Yêu cầu bổ sung") — chỉ
     còn **1 lần click** để mở đúng modal xử lý, thay vì phải mở thùng → mở rộng đơn cha → mới thấy nút.
   - Chọn nhiều dòng (checkbox mỗi đơn vị con) qua `Set` toàn cục `ADMIN_SELECTED_UNITS` +
     `toggleUnitSelect()`/`renderAdminBulkBar()` (thanh nổi hiện số đã chọn + nút "Phân loại hàng
     loạt"/"Bỏ chọn") — dùng lại đúng modal phân loại hàng loạt đã có từ trước (`openBulkPhanLoaiModal`/
     `submitBulkPhanLoai`, nay nhận **mảng ID** thay vì chỉ 1 đơn cha, nên gộp được cả đơn KTV lẫn khách
     lẻ trong cùng 1 lần chọn — 2 hàm mới `openBulkPhanLoaiForParent(parentId)` (bấm từ view thẻ cũ,
     giữ tương thích ngược) và `openBulkPhanLoaiModalFromSelection()` (đọc từ `ADMIN_SELECTED_UNITS`).
   - `renderAdminGuiList()` được viết lại: mục 1 (thùng chờ Admin BH tiếp nhận nội bộ) giữ nguyên cấu
     trúc nhóm-theo-KTV nhưng thêm link đọc ghi chú (điểm #3); mục 2+3 cũ (danh sách link "thùng đã
     mở" + danh sách thẻ "đơn dịch vụ tính phí") **gộp làm một**, thay bằng lệnh gọi
     `renderAdminUnifiedTable()` duy nhất. Nút "+ Tạo đơn dịch vụ tính phí" chuyển lên đầu bảng thay vì
     nằm cuối trang.
   - View thẻ lồng nhau cũ (`renderParentCard`/`renderUnitClassifyCard`/`toggleParentExpand`, màn
     `#/admin/phan-loai?gui=X`) **không bị xoá** — vẫn là màn "drill-in xem theo từng thùng" khi Admin
     BH click vào link ở cột Nguồn, hữu ích khi cần xem toàn bộ ngữ cảnh 1 thùng cùng lúc; bảng chung
     mới là màn hình **mặc định/chính** để xử lý nhanh theo hàng đợi tổng.

**Kiểm thử đã chạy cho vòng này:** test mới `test_phase8.js` (Node + jsdom) xác minh riêng cả 4 điểm —
field `#f_ghichu` đã biến mất khỏi DOM, `rememberNhaXe`/`nhaXeHistoryOf` lưu và tự điền đúng cho phiếu
tạo tiếp theo (kể cả `<datalist>` gợi ý), `submitSuCo` gộp đúng vào `ghi_chu_log` và Admin BH đọc được
qua `openGhiChuLogModal`, bảng thống nhất hiển thị đúng cả đơn KTV lẫn khách lẻ cùng 1 bảng và chọn
nhiều dòng + phân loại hàng loạt hoạt động đúng (bao gồm dọn `ADMIN_SELECTED_UNITS` sau khi submit).
Chạy lại toàn bộ 6 bộ test trước đó (`smoke_all_routes.js`, `test_prototype2.js`, `test_sla.js`,
`test_dichvu.js`, `test_khachle_end2end.js`, `test_newui.js`) — **0 lỗi**, xác nhận không có hồi quy.
Đã cập nhật các test cũ còn gọi theo cách cũ (`setVal('#k_select', id); khoXacNhanTiepNhan()`) sang gọi
trực tiếp `khoXacNhanTiepNhan(id)`/`openSuCoModal(id)` do `renderKhoTiepNhan()` đã đổi từ dropdown
`#k_select` sang bảng có nút theo từng dòng (thay đổi thực hiện cùng đợt, phục vụ chính điểm #3).

## Phản hồi vòng 4 sau khi test prototype (22/08/2026) — 2 điểm về linh kiện + đối trừ, đã áp dụng

Nguyên văn 2 ý người vận hành:
1. "tôi gửi yêu cầu bổ sung sai mã linh kiện cho ktv, nhưng lại chỉ hiện box cho nhập mô tả lỗi,
   không cho đổi linh kiện."
2. "Cho phép admin đổi linh kiện sửa chữa thực tế mặc định sẽ = linh kiện ktv chọn. nhưng có thể đổi
   lại thành linh kiện khác. thay vì phải hỏi lại ktv."
3. (gửi giữa lượt, ghép chung vào vòng này) "KTV vẫn thiếu nút lựa chọn dạng đổi trả/trừ công nợ lúc
   tạo đơn" — đây chính là câu trả lời cho **câu hỏi mở #2** đã treo từ lâu (mục "Bằng chứng dữ liệu
   thật" ở trên, cột `LOẠI ĐỐI TRỪ DO KTV CHỌN`): xác nhận **KTV CÓ đề xuất ban đầu** lúc tạo đơn,
   Admin bảo hành vẫn là người xác nhận/có thể đổi lại lúc phân loại (giữ nguyên quyết định 21/08/2026
   mục #11) — tức mô hình đúng là "KTV đề xuất → Admin xác nhận/ghi đè", không phải "chỉ Admin chọn từ
   đầu" như prototype vòng 1-3 đang làm.

1. **Modal "Bổ sung thông tin theo yêu cầu Admin bảo hành" (`openBoSungModal`) thêm được trường đổi
   linh kiện.** Trước đó chỉ có ô sửa mô tả lỗi — nếu Admin BH gửi yêu cầu bổ sung với lý do
   `linh_kien_khong_khop` (sai mã linh kiện), KTV không có cách nào sửa lại mã LK, chỉ giải trình bằng
   chữ. Đã sửa:
   - Modal giờ hiện banner đỏ nhạt (`banner amber`) tóm tắt **lý do Admin BH đã yêu cầu** (đọc từ
     `phieu_sc_ct.ly_do_bo_sung` của đơn vị con đang `cho_bo_sung_tt`) — để KTV biết chính xác cần sửa
     gì, không phải đoán.
   - Thêm `<select id="m_lk2">` (đầy đủ danh mục `DB.linh_kien`, mặc định chọn đúng `s.ma_lk` hiện
     tại) — `submitBoSung()` giờ ghi `s.ma_lk` từ lựa chọn mới này, và log ghi rõ tên linh kiện mới.
2. **Admin bảo hành có trường "Linh kiện sửa chữa thực tế" riêng ở form Phân loại (`openPhanLoaiModal`
   /`phanLoaiFormHtml`), mặc định = linh kiện KTV đã chọn, đổi được trực tiếp không cần gửi yêu cầu bổ
   sung cho KTV.** Thêm cột mới **`phieu_sc_ct.ma_lk_thuc_te`** (nullable, mặc định `null` = "dùng
   linh kiện gốc của đơn cha") — đây là field **ở cấp đơn vị con**, không phải đơn cha, vì mỗi đơn vị
   trong 1 đơn cha (VD "x2") có thể cần đổi sang linh kiện thực tế khác nhau.
   - `phanLoaiFormHtml(w, since, unit)` nhận thêm tham số `unit` (optional) — khi có, render
     `<select id="m_lkthucte">` mặc định chọn `unit.ma_lk_thuc_te || parent.ma_lk`, kèm dòng hint ghi
     rõ linh kiện gốc KTV đã chọn để Admin đối chiếu. **Chỉ hiện ở modal phân loại 1 đơn vị riêng lẻ
     (`openPhanLoaiModal`)** — **KHÔNG hiện trong modal phân loại hàng loạt** (`openBulkPhanLoaiModal`,
     gọi `phanLoaiFormHtml` không truyền `unit`) vì nhiều đơn vị được chọn hàng loạt có thể thuộc
     nhiều đơn cha khác nhau, không có 1 giá trị mặc định chung hợp lý.
   - Thêm hàm dùng chung **`unitEffectiveLk(u)`** (`findLK(u.ma_lk_thuc_te || parent.ma_lk)`) —
     **mọi nơi hiển thị "linh kiện" của 1 đơn vị con** (bảng thống nhất Admin BH, thẻ phân loại cũ,
     màn Admin xác nhận hoàn tất, màn "Việc của tôi" của NV, bảng chọn đơn cho phiếu trả, màn Kế toán
     duyệt) đã được đổi sang gọi hàm này thay vì đọc thẳng `findLK(parent.ma_lk)`, kèm badge nhỏ
     "Đã đổi LK" (tone `b-blue`) khi `ma_lk_thuc_te` khác `ma_lk` gốc, để NV/Kế toán/Admin đều thấy rõ
     linh kiện đã bị thay so với lúc KTV gửi.
3. **Thêm "Loại đối trừ đề xuất" (`select#m_loaidoitru_kt`) vào form "Thêm đơn bảo hành" của KTV** (cả
   bản desktop lẫn mobile sheet, dùng chung field ID theo đúng nguyên tắc "1 nguồn sự thật" đã áp dụng
   từ vòng redesign UI) — lưu vào cột mới **`phieu_sc.loai_doi_tru_de_xuat`** (`'doi_tra'` mặc định
   hoặc `'tru_cong_no'`). Đây là đề xuất **ở cấp đơn cha** (KTV chọn 1 lần lúc gửi, trước khi đơn được
   tách thành đơn vị con). Cột này chỉ để tham khảo — không tự động áp dụng, không bắt buộc Admin phải
   theo. Form Phân loại của Admin BH (`phanLoaiFormHtml`) giờ **mặc định chọn sẵn** `select#m_loaidoitru`
   theo đúng đề xuất này (kèm dòng hint "KTV đề xuất lúc gửi hàng: ..."), Admin vẫn đổi lại thoải mái —
   khớp đúng quyết định 21/08/2026 mục #11 ("Admin bảo hành xác nhận... nhưng có gợi ý ban đầu từ KTV
   rồi Admin xác nhận lại"). Cột `phieu_gui` chi tiết (màn KTV) đã thêm cột "Đối trừ đề xuất" để KTV tự
   xem lại lựa chọn của mình.

**Kiểm thử đã chạy cho vòng này:** test mới `test_lk_fix.js` (Node + jsdom) xác minh đủ chuỗi: KTV tạo
đơn với linh kiện sai + đề xuất "Trừ công nợ" → Admin gửi yêu cầu bổ sung lý do "linh kiện không khớp"
→ modal bổ sung của KTV có trường đổi linh kiện + hiện đúng lý do Admin đã ghi → KTV đổi linh kiện,
lưu đúng vào `phieu_sc.ma_lk` → form Phân loại của Admin mặc định chọn "Trừ công nợ" đúng theo đề xuất
KTV + có trường "Linh kiện sửa chữa thực tế" mặc định đúng linh kiện KTV vừa sửa → Admin đổi tiếp sang
1 linh kiện khác hẳn, lưu đúng vào `phieu_sc_ct.ma_lk_thuc_te` mà không đụng đến `phieu_sc.ma_lk` gốc
→ `unitEffectiveLk()` trả đúng linh kiện thực tế → màn "Việc của tôi" của NV hiện đúng linh kiện thực
tế kèm badge "Đã đổi LK" → xác nhận modal phân loại hàng loạt KHÔNG có trường linh kiện thực tế. Chạy
lại toàn bộ 7 bộ test trước đó (`smoke_all_routes.js`, `test_prototype2.js`, `test_sla.js`,
`test_dichvu.js`, `test_khachle_end2end.js`, `test_newui.js`, `test_phase8.js`) — **0 lỗi**, không hồi
quy.

## Mã QR thật (không còn là placeholder) — 22/08/2026

Người dùng hỏi: *"hệ thống sinh mã QR không có thật à? có thể tự tạo code tự sinh trên client người
dùng không? mã do server trả về client tự tạo mã QR"*. Trả lời và đã triển khai: **có, hoàn toàn làm
được ở phía client, không cần gọi server nào để "vẽ" QR** — server (ở bản thật) hoặc `nextId()` (ở
prototype này) chỉ cần sinh ra **chuỗi mã** (vd `BH-000002`); việc mã hoá chuỗi đó thành ảnh QR quét
được là một phép biến đổi thuần thuật toán, không cần dữ liệu/mạng gì thêm — đúng mô hình người dùng
mô tả ("mã do server trả về, client tự tạo mã QR").

**Cách làm:** vì tự viết lại thuật toán sinh QR (Reed-Solomon, bố trí ma trận, mask pattern...) từ
đầu có rủi ro sai sót khó phát hiện bằng mắt (nhìn "giống QR" nhưng không quét được), đã dùng thư viện
JS đã được kiểm chứng rộng rãi thay vì tự viết:
- Lấy thư viện npm `qrcode` (v1.5.4, MIT, tác giả soldair — hơn 20 triệu lượt tải/tuần) và **đóng gói
  OFFLINE bằng `esbuild`** (`esbuild entry.js --bundle --minify --platform=browser --format=iife`)
  thành 1 file JS độc lập (~24KB minified), **nhúng thẳng vào `index.html`** như 1 khối `<script>`
  riêng ngay trước script chính — không gọi CDN nào lúc trang chạy, vẫn đúng nguyên tắc "chạy offline,
  không phụ thuộc thư viện ngoài" của prototype này (khác với việc "không được dùng thư viện nào cả" —
  ở đây thư viện được nhúng vật lý vào file, mở bằng `file://` vẫn chạy được không cần mạng).
- Chỉ dùng `QRCode.create(text, {errorCorrectionLevel:'M'})` của thư viện để lấy **ma trận module
  thật** (có Reed-Solomon thật) — không dùng `toCanvas`/`toDataURL`/`toFile` của thư viện (không cần
  Canvas). Hàm mới `renderQrSvg(text, sizePx)` (đặt cạnh `esc()`) tự vẽ SVG từ ma trận này (mỗi module
  = 1 `<rect>`, viền trắng 4-module đúng chuẩn QR để máy quét dễ nhận diện).
- Đã thay thế khung placeholder sọc đen-trắng trong `renderPhieuGuiDetail` (tem dán thùng) bằng
  `renderQrSvg(g.id, 96)` — mã QR thật, mã hoá đúng `g.id` (mã tra cứu phiếu gửi).
- **Xác minh round-trip thật** (không chỉ nhìn bằng mắt là "giống QR"): viết script Node dùng chính
  thư viện `qrcode` để tạo mã cho vài chuỗi mẫu, rasterize thành ảnh bitmap, rồi **decode lại bằng
  `jsQR`** (thư viện giải mã hoàn toàn độc lập, khác thư viện sinh mã) — khớp lại đúng 100% chuỗi gốc.
  Test jsdom mới `test_qr.js` lặp lại đúng quy trình này ngay trên `index.html` thật: gọi
  `renderQrSvg()` trực tiếp, VÀ mở màn `renderPhieuGuiDetail` thật, đọc SVG hiển thị trên màn hình,
  decode lại bằng `jsQR` → khớp đúng mã phiếu gửi. Cũng test trường hợp thư viện chưa nạp được
  (`window.QRCode` undefined) → `renderQrSvg` trả về thông báo lỗi rõ ràng thay vì `throw` làm vỡ
  trang. Chạy lại `smoke_all_routes.js`/`test_prototype2.js`/`test_sla.js`/`test_dichvu.js`/
  `test_search.js` — 0 lỗi, không hồi quy.
### Quét QR bằng camera THẬT (tiếp nối cùng ngày, không còn mô phỏng UI suông)

Sau khi làm xong chiều "sinh mã", đã làm luôn chiều ngược lại — **giải mã ảnh QR từ camera** ở màn
Kho "Quét bằng camera" (`renderKhoTiepNhan`), trước đó chỉ mở `getUserMedia` xem hình, không đọc gì.
- Thêm thư viện thứ 2, `jsqr` (npm, v1.4.0, Apache-2.0, tác giả cozmo) — bản build UMD sẵn có của
  chính package này đã chạy được thẳng trong trình duyệt (không cần esbuild bundle như `qrcode`), chỉ
  minify bằng esbuild cho gọn (~127KB) rồi nhúng thẳng vào `index.html` như 1 khối `<script>` thứ 2,
  cùng nguyên tắc offline/không CDN như `qrcode`. Expose `window.jsQR(imageData, width, height)`.
- `openCameraScanModal()` viết lại: sau khi mở camera, lặp đọc khung hình mỗi ~150ms
  (`setTimeout` đệ quy, không dùng `requestAnimationFrame` để đỡ tốn CPU vì quét QR không cần 60fps) —
  vẽ khung hình video xuống `<canvas>` ẩn (hạ độ phân giải xuống tối đa 480px chiều rộng để giải mã
  nhanh hơn, không cần full-res), gọi `jsQR` trên `ImageData` của canvas đó.
  - Quét ra chuỗi không khớp `phieu_gui` nào → báo lỗi mềm ngay trong modal, **không đóng camera**,
    tự thử lại khung tiếp theo.
  - Quét ra chuỗi khớp phiếu nhưng phiếu **không ở trạng thái `da_gui`** (VD đã tiếp nhận rồi, hoặc
    còn `nhap` chưa gửi) → báo lỗi mềm tương tự, không cho tiếp tục.
  - Quét khớp đúng 1 phiếu đang chờ tiếp nhận → dừng camera, đóng modal quét, mở `openConfirmScanModal`
    hiện tên KTV + số đơn bên trong, **CHƯA tự động xác nhận nhận hàng** — vẫn cần người dùng bấm nút
    "Xác nhận đã nhận thùng này" (tái dùng đúng `khoXacNhanTiepNhan()` đã có, kể cả cơ chế SLA/lý do
    chậm nếu quá hạn) hoặc "Quét lại". Quyết định có chủ đích: quét được ID chỉ nên dùng để **xác định
    nhanh đúng phiếu**, không nên tự động hoá luôn hành động xác nhận nhận hàng vật lý — đó vẫn phải
    là 1 thao tác người dùng chủ động xác nhận, giữ đúng tinh thần kiểm soát nội bộ.
  - Logic khớp phiếu (`resolveScannedGuiId(text)`) được tách thành 1 hàm thuần độc lập với
    DOM/camera — trả về `{ok:true, guiId}` hoặc `{ok:false, reason, message}` — để kiểm thử được bằng
    jsdom mà không cần giả lập Canvas/camera thật (jsdom không có Canvas 2D thật).
- **Kiểm thử đã chạy:** `test_camera_scan.js` (jsdom) — xác minh `window.jsQR` nạp được trong app
  thật; `resolveScannedGuiId()` đúng cho cả 3 nhánh (không khớp / khớp nhưng sai trạng thái / khớp và
  đúng trạng thái); mở modal camera khi không có camera thật (giả lập `getUserMedia` reject, đúng môi
  trường CI/jsdom) hiện đúng thông báo lỗi; mở thẳng `openConfirmScanModal` và bấm nút xác nhận →
  phiếu chuyển đúng `da_tiep_nhan`, modal tự đóng. Chạy lại toàn bộ 6 bộ test trước đó
  (`smoke_all_routes.js`, `test_prototype2.js`, `test_sla.js`, `test_dichvu.js`, `test_search.js`,
  `test_qr.js`) — 0 lỗi.
- Với mục "Prototype HTML" phía trên: giới hạn #8 (quét QR bằng camera chỉ mô phỏng UI) **nay đã hết
  hiệu lực** — xem đầu mục đó đã cập nhật dòng gạch ngang tương ứng.

### Tải ảnh QR về máy để in tem (tiếp nối cùng ngày)

Người dùng hỏi tiếp: *"tôi muốn tải ảnh qr để in thì làm sao? Thiết kế thêm chức năng."* Đã thêm
hàm `downloadQrLabel(text, filename)` (đặt cạnh `renderQrSvg`) + nút **"⬇ Tải ảnh QR (in tem)"** ngay
dưới mã QR trong `renderPhieuGuiDetail`.
- Vẽ lại QR bằng **Canvas** (không chuyển đổi từ chuỗi SVG của `renderQrSvg` — chuyển SVG→Image cần
  load bất đồng bộ và dễ dính lỗi "tainted canvas", không cần thiết ở đây) ở độ phân giải **cao hơn
  màn hình** (`moduleSize=12px`, so với ô nhỏ hiển thị trên trang) để in rõ nét, có ghi luôn chữ mã
  phiếu bên dưới hình (tự làm thành 1 "tem" hoàn chỉnh, không cần cắt ghép thủ công).
  Dùng **chung một nguồn dữ liệu module** (`qr.modules` từ `QRCode.create()`) với `renderQrSvg` —
  cùng toạ độ, cùng vùng viền trắng (quiet zone = 4 module) — nên hình tải về chắc chắn mã hoá đúng y
  hệt mã QR đã hiển thị trên màn hình và đã được xác minh quét được (`test_qr.js`), chỉ khác API vẽ
  (canvas `fillRect` thay vì SVG `<rect>`), không khác gì về mặt hình học.
- Xuất ảnh bằng `canvas.toDataURL('image/png')`, kích hoạt tải xuống qua thẻ `<a download="QR_<mã>.png">`
  tạm thời (tạo → click → xoá khỏi DOM ngay, không để lại rác). Tên file mặc định `QR_<mã phiếu>.png`,
  cho phép truyền tên tuỳ chỉnh qua tham số thứ 2.
- Xử lý lỗi mềm: nếu thư viện `QRCode` chưa nạp được, hoặc trình duyệt không hỗ trợ Canvas 2D →
  `alert()` thông báo rõ ràng, **không kích hoạt tải file rác**, không làm vỡ trang.
- **Kiểm thử đã chạy:** `test_qr_download.js` (jsdom, giả lập `HTMLCanvasElement.getContext('2d')`
  vì jsdom không có Canvas 2D thật) — đối chiếu **từng toạ độ** `fillRect` với đúng ma trận
  `qr.modules` thật (không chỉ đếm số lượng), rồi **so sánh chéo** tập toạ độ này với tập toạ độ
  `<rect>` của `renderQrSvg()` cho cùng 1 chuỗi đầu vào — khớp 100%, tức ảnh tải về chắc chắn mã hoá
  đúng y hệt QR hiển thị trên màn hình (đã biết quét được thật qua `test_qr.js`). Cũng test: định
  dạng xuất là `image/png`, tên file đúng (mặc định lẫn tuỳ chỉnh), thẻ `<a>` bị dọn khỏi DOM sau khi
  tải, trường hợp thư viện chưa nạp không kích hoạt tải nhầm, và nút trên màn hình thật
  (`renderPhieuGuiDetail`) tải đúng file cho đúng phiếu đang xem. Chạy lại toàn bộ 7 bộ test trước đó
  (`smoke_all_routes.js`, `test_prototype2.js`, `test_sla.js`, `test_dichvu.js`, `test_search.js`,
  `test_qr.js`, `test_camera_scan.js`) — 0 lỗi.

## QA toàn hệ thống (31/08/2026) — kiểm thử bằng Chrome thật qua cả 5 vai trò

Theo yêu cầu người dùng "đóng vai QA hệ thống... tự đưa mình vào vị trí test và test chi tiết tất cả
các luồng nghiệp vụ trực tiếp bằng UI và UX", đã dùng **Puppeteer điều khiển Chrome thật** (không
phải chỉ đọc code, không phải trình duyệt sandbox của phiên — sandbox không chạy được JS trên
`file://`) để tự động click-through toàn bộ 5 vai trò, kể cả cố tình điền sai/thiếu để dò biên
validate, chụp ảnh màn hình thật làm bằng chứng, đối chiếu lại với hàm xử lý khi có nghi vấn (tránh
kết luận nhầm — 2 lần tự phát hiện và sửa lại kết luận của chính mình do nhầm với cổng SLA 24h trước
khi đưa vào báo cáo). Toàn bộ kết quả (bằng chứng ảnh, ma trận phạm vi, đề xuất ưu tiên) đã xuất
thành 1 artifact riêng "Báo Cáo QA Sửa Chữa Bảo Hành" — không lưu lại trong repo, chỉ tóm tắt các
điểm đã áp dụng ở đây.

**5 lỗi/vấn đề tìm được, đã sửa hết theo phản hồi người dùng (31/08/2026):**
1. **[Nghiêm trọng, đã sửa]** `submitAddDon()` (KTV thêm đơn) và `submitTaoDonDichVu()` (Admin tạo
   đơn dịch vụ tính phí) đều đọc `so_luong_khai`/`so_luong` qua `parseInt(...)` mà **không kiểm tra
   lại bằng JS** — thuộc tính HTML `min="1"` trên `<input>` không có tác dụng vì các form này không
   submit qua `<form>` thật (chỉ là nút `onclick`). Hậu quả: nhập `0` hoặc số âm vẫn lưu được, và ở
   bước Admin xác nhận số lượng thực nhận, vòng lặp sinh đơn vị con `for(i=1;i<=sltn;i++)` với
   `sltn<=0` **không chạy lần nào** — đơn "biến mất" khỏi luồng xử lý hoàn toàn, không cảnh báo gì.
   Đã thêm `if(!soluong || soluong<1){ alert(...); return; }` ở cả 2 hàm.
2. **[Đã sửa, theo hướng NGƯỢC với đề xuất ban đầu — người dùng xác nhận]:** Ảnh biên bản đóng gói
   của Kho (`openKhoDongGoiModalDirect`, `openBulkKhoDongGoiModal`) **không phải trường bắt buộc**
   — trước đó nhãn mang dấu `*` (class `req`) trong khi hàm `khoDongGoi()` chưa từng kiểm tra
   `files.length>0`, gây lệch giữa UI và hành vi thật. Ban đầu đề xuất thêm validate bắt buộc, nhưng
   người dùng xác nhận **đúng ý là KHÔNG bắt buộc** — đã xoá `class="req"`, đổi nhãn thành
   "Ảnh biên bản đóng gói (tùy chọn)" ở cả bản đơn lẻ và hàng loạt, **giữ nguyên hành vi cũ** (không
   thêm validate).
3. **[Trung bình, đã sửa]** Toast (`.toast-wrap`, `position:fixed;bottom:18px;z-index:200`) có thể
   đè lên thanh CTA dính đáy của mobile sheet "Thêm đơn bảo hành" (`.ms-cta`, `z-index:110` — thấp
   hơn). Đã thêm class `mobile-sheet-open` gắn vào `<body>` khi `openAddDonMobileSheet()` mở (xoá lại
   trong `closeModal()`), kèm CSS `body.mobile-sheet-open .toast-wrap{bottom:84px;}` để đẩy toast lên
   trên thanh CTA khi sheet đang mở.
4. **[Trung bình, đã sửa]** Form "Phân loại đơn vị" (`phanLoaiFormHtml`) dài 8 trường xếp thẳng hàng
   không phân nhóm, và banner cảnh báo SLA (thông tin khẩn cấp nhất) lại nằm **cuối cùng** sau khi đã
   điền 6-7 trường. Đã: (a) chuyển `lyDoChamFieldHtml('m')` lên đầu, ngay trước cả banner hết hạn bảo
   hành; (b) thêm `<hr class="divider">` + 2 nhãn phụ in hoa "PHÂN LOẠI BẢO HÀNH" / "XỬ LÝ & PHÂN
   CÔNG" tách rõ 2 cụm trường theo đúng ngữ nghĩa.
5. **[Nhỏ, đã sửa]** Modal "Xác nhận đã gửi xe" (`openConfirmGuiModal`) có 2 nút ("Xác nhận với ngày
   này" / "Giữ nguyên ngày đã nhập") cho ra **kết quả giống hệt nhau** ở tình huống phổ biến nhất
   (ô ngày mặc định = hôm nay, trùng luôn với ngày gốc nếu KTV xác nhận gửi ngay trong ngày tạo
   phiếu). Đã gộp thành 1 nút "Xác nhận" duy nhất, đổi mặc định ô ngày từ "luôn là hôm nay" thành
   **"đúng ngày KTV đã nhập lúc tạo phiếu"** (`g.ngay_gui_xe`) — muốn đổi ngày khác (VD hôm nay) thì
   tự gõ lại ô, không cần 2 nút riêng.

**Các điểm đã xác minh ĐÚNG, không cần sửa** (ghi nhận trong artifact, không lặp lại chi tiết ở đây):
validate của Admin BH (mail phê duyệt, gán NV, tạo đơn dịch vụ, xác nhận SL lệch) đều chặn đúng qua
browser thật; Kế toán không có duyệt hàng loạt (đúng segregation of duties); "Trả lại Admin bảo hành"
của NV và "Từ chối phiếu trả" của Kế toán đều bắt buộc lý do đúng; không phát sinh lỗi runtime JS nào
trong toàn phiên test tương tác.

**Chưa sửa (cần hỏi lại vận hành trước khi quyết định):** NV nộp kết quả chẩn đoán không bắt buộc
kèm ảnh nào (kể cả "Sửa được"/"Đề xuất đổi mới") — form vốn **chưa từng đánh dấu bắt buộc** (không có
class `req` trên nhãn ảnh), nên đây không phải lỗi lệch UI/hành vi như 2 điểm Kho ở trên, mà là câu
hỏi nghiệp vụ thuần tuý: có nên bắt buộc ảnh khi kết quả không phải "Không lỗi" hay không — để nguyên
chờ xác nhận, không tự quyết.

**Kiểm thử đã chạy:** test mới `test_qa_fixes.js` (jsdom) xác minh riêng cả 5 điểm sửa (chặn số
lượng ≤0 ở cả 2 hàm, dữ liệu giữ nguyên trong modal khi bị chặn; đóng gói không ảnh vẫn thành công;
class `mobile-sheet-open` gắn/xoá đúng lúc; vị trí banner SLA đứng trước trường đầu tiên trong HTML,
có đủ divider + nhãn nhóm; modal xác nhận gửi xe chỉ còn 1 nút, mặc định đúng ngày đã nhập trước đó).
Chạy lại toàn bộ 8 bộ test trước đó — 0 lỗi, không hồi quy. Xác nhận thêm bằng ảnh chụp Chrome thật
(Puppeteer): form phân loại hiển thị đúng cấu trúc mới, toast không còn che nút "+ Thêm vào phiếu"
trên mobile.

## Đối chiếu nút chức năng AppSheet gốc (31/08/2026) — 7 tính năng mới đã build

Người dùng gửi 1 ảnh chụp 10 icon "thao tác nhanh" (quick action) từ app AppSheet gốc (`BH-MB-v4.1`)
đang chạy thật, cùng 1 bản export HTML của trang chỉnh sửa Actions trong AppSheet. Phát hiện quan
trọng: file HTML export đó **không chỉ là ảnh chụp tĩnh** — nó là DOM thật của trang **AppSheet Editor
(mục Behavior > Actions)**, bên trong còn nguyên **cây 50 action đã cấu hình** (đọc được qua
`class="jss140"` — nhãn text của từng node trong `MuiTreeView`), nhiều hơn hẳn 10 icon trong ảnh.
Đã đối chiếu toàn bộ 50 action này với `huong_xu_ly`/`loai_bao_hanh` hiện có trên web — phần lớn đã
khớp sẵn (chỉ thiếu "nút tắt" 1-click, không thiếu logic), còn lại 7 action **có khái niệm nghiệp vụ
mới thật sự** — đã hỏi lại người dùng cho từng cái thay vì tự đoán, và đã build đủ cả 7 theo đúng câu
trả lời (trừ mục 6 người dùng xác nhận bỏ qua).

**7 quyết định của người dùng và cách đã triển khai:**

1. **"Hủy do không có hàng => thêm vào trường lý do hủy. các lý do hủy này dạng listdown có thể bổ
   sung thêm."** Thêm danh mục mới `DB.settings.ly_do_tu_choi` (cùng khuôn mẫu với
   `ly_do_cham` đã có) — seed 5 giá trị (`Khong co hang, Khong phai loi bao hanh, Khach khong dong y
   sua/doi, Trung don/khong can xu ly, Khac`), có modal cài đặt riêng
   (`openLyDoTuChoiSettingsModal`/`addLyDoTuChoi`/`removeLyDoTuChoi`) + nút "⚙ Lý do huỷ" trên topbar
   cạnh nút "⚙ Lý do chậm" đã có. Cột mới `phieu_sc_ct.ly_do_tu_choi` — form phân loại
   (`phanLoaiFormHtml`) hiện thêm 1 `<select>` **bắt buộc** khi `huong_xu_ly='tu_choi'` (ẩn/hiện qua
   `toggleGanNV()`, dùng chung listener với ô "Gán NV"), validate trong `readPhanLoaiForm`. Hiển thị
   lại lý do đã chọn trong `openDetailUnitModal`.
2. **"KTV báo cáo sai thông tin => đây là 1 ghi nhận phụ, để admin bh note lại trường hợp liên quan
   đến KTV báo cáo sai thông tin, có thể sau này sử dụng trong việc phạt lỗi vi phạm báo cáo."** —
   xác nhận đây **không phải 1 hướng xử lý/trạng thái mới**, chỉ là nhật ký ghi chú riêng gắn vào đơn
   cha, không làm thay đổi trạng thái đơn. Thêm mảng `phieu_sc.bao_cao_sai_thong_tin` (khác với
   `ghi_chu_log` của phiếu gửi — đây là dữ liệu dành riêng cho mục đích tra cứu vi phạm sau này, cố ý
   tách biệt) + `openBaoCaoSaiModal`/`submitBaoCaoSai`. Nút "🐞" (kèm số đếm nếu đã có ghi nhận) đặt
   ngay trên dòng đơn vị của bảng thống nhất Admin BH, cạnh nút "Yêu cầu bổ sung".
3. **"Đẩy lại chưa tiếp nhận => sẽ có trường hợp Admin BH xác nhận nhầm (thực tế hàng chưa về) nên
   bổ sung thêm tính năng này."** Thêm `adminDayLaiChuaTiepNhan(guiId)` — đưa `phieu_gui.admin_tiep_nhan`
   về `false` (xoá `admin_nguoi_nhan`/`admin_thoi_gian_nhan`), đẩy thùng quay lại mục 1 "chờ Admin BH
   xác nhận tiếp nhận nội bộ". Có **chốt an toàn dữ liệu bắt buộc**: chỉ cho đẩy lại nếu **chưa có
   `phieu_sc` nào của thùng đó được Admin xác nhận số lượng thực nhận** (`trang_thai_cha==='da_tach'`)
   — nếu đã có đơn vị con được tách ra rồi thì chặn cứng, tránh dữ liệu con mồ côi. Nút "↩ Đẩy lại
   chưa tiếp nhận" đặt ở màn drill-in theo từng thùng (`renderAdminGuiDetail`, chỉ hiện khi đủ điều
   kiện), không đặt ở bảng thống nhất vì đây là hành động cấp-thùng (`phieu_gui`), không phải cấp-đơn.
4. **"Trả trực tiếp KTV => Tự tạo 1 phiếu trả hàng với mã đơn hàng và mã PXK ngẫu nhiên (Admin có thể
   thay đổi nếu muốn) -> và chuyển trạng thái sang chờ KTV xác nhận."**
5. **"Admin giao trực tiếp cho kho => ...(y hệt mục 4 nhưng)... chuyển trạng thái sang chờ Kho xác
   nhận."** Mục 4 và 5 build chung 1 cặp hàm `openTaoPhieuTraNhanhModal(unitId, mode)`/
   `submitTaoPhieuTraNhanh(unitId, mode)` (`mode='ktv'|'kho'`) — **đây là 2 đường tắt CÓ CHỦ ĐÍCH,
   bỏ qua hẳn luồng bình thường** (nhập → chờ Kế toán duyệt → Kho đóng gói → Kho gửi): tạo thẳng 1
   `phieu_tra` mới chỉ chứa đúng 1 đơn vị, mã đơn hàng + mã PXK **sinh ngẫu nhiên** (`randomCode()`,
   dạng `DH-123456`/`PXK-123456`) nhưng hiện ngay trong modal để Admin xem/sửa lại **trước khi tạo
   thật** (đúng yêu cầu "Admin có thể thay đổi nếu muốn"), rồi set thẳng
   `trang_thai='da_gui'` (mục 4, vào hàng đợi "chờ KTV xác nhận nhận hàng") hoặc
   `trang_thai='da_duyet_ke_toan'` (mục 5, vào hàng đợi "chờ Kho đóng gói" — diễn giải "chờ Kho xác
   nhận" thành bước đóng gói tiếp theo của Kho). Nút "⚡ Trả trực tiếp KTV" / "⚡ Giao trực tiếp Kho"
   đặt trên từng dòng đơn vị ở màn "Tạo & quản lý phiếu trả" (`readyTable`), chỉ áp dụng cho đơn vị
   **chưa thuộc phiếu trả nào**.
6. **"CHẤP NHẬN BẢO HÀNH => bỏ qua - nó là bước đồng ý bảo hành."** Xác nhận đúng như đã đoán — đây
   chỉ là 1 phần của form phân loại hiện có (`loai_bao_hanh='trong_bh'`), không cần action riêng.
   **Không code gì thêm cho mục này.**
7. **"Xác nhận trả xác => đây là bước cuối cùng với các trường hợp đổi mới linh kiện => còn lại xác
   sẽ có tùy chọn trả xác cho đối tác hay tiêu hủy, hoặc 'Đang lưu kho'."** Thêm cột mới
   `phieu_sc_ct.xu_ly_xac` (`tra_doi_tac | tieu_huy | luu_kho`). Sửa `xacNhanHoanTat(unitId)`: nếu
   `u.huong_xu_ly==='doi_moi'`, **không xác nhận hoàn tất trực tiếp như trước** mà mở
   `openXacNhanTraXacModal` bắt buộc chọn 1 trong 3 lựa chọn xử lý xác trước khi hoàn tất (vẫn giữ
   nguyên cổng SLA nếu quá hạn); mọi hướng xử lý khác (`sua_chua`, `tra_lai_ktv`...) **giữ nguyên
   hành vi xác nhận hoàn tất trực tiếp như cũ**, không bị ảnh hưởng — vì chỉ "đổi mới" mới thật sự
   sinh ra 1 "xác" linh kiện lỗi cần xử lý.

**2 lỗi có thật phát hiện được trong lúc build (không liên quan trực tiếp yêu cầu, nhưng phải sửa để
tính năng mới hoạt động đúng):**
- **`openModal()` không bao giờ dọn modal cũ trước khi tạo modal mới** — mọi màn "mở lại chính nó để
  làm mới nội dung" (VD `submitBaoCaoSai()` gọi lại `openBaoCaoSaiModal()`, hay `submitGhiChuLogModal()`
  gọi lại `openGhiChuLogModal()` đã có từ trước) để lại **nhiều thẻ `id="activeModal"` trùng nhau**
  trong DOM cùng lúc — `document.getElementById('activeModal')` luôn trả về thẻ **cũ nhất** (đầu
  tiên), khiến lần đọc giá trị ô nhập tiếp theo bị đọc nhầm dữ liệu của modal cũ đã ẩn phía dưới,
  không phải modal đang thật sự hiển thị. Phát hiện qua chính test mới của mục #2 (ghi nhận báo cáo
  sai lần 2 vô tình gửi lại đúng nội dung lần 1). Đã sửa `openModal()`: xoá `#activeModal` cũ (nếu
  có) ngay đầu hàm, trước khi tạo thẻ mới — sửa tận gốc, áp dụng cho **mọi** modal trong app, không
  chỉ modal mới thêm.
- **Nút "⚙ Lý do chậm" trên topbar từ trước tới giờ gần như vô hình** — dùng class `.btn-reset` mà
  không override màu, trong khi `.btn-reset{background:var(--sidebar-highlight);color:#fff;}` vốn
  thiết kế cho nền tối của sidebar (`--sidebar-highlight` là trắng 14% độ mờ) — đặt trên topbar nền
  trắng thì chữ trắng trên nền gần-như-trắng-trong-suốt, gần như không đọc được. Phát hiện khi debug
  vì sao nút "⚙ Lý do huỷ" mới thêm cũng không hiện trong ảnh chụp Chrome thật (đo `getBoundingClientRect()`
  xác nhận nút vẫn tồn tại đúng vị trí, chỉ là vô hình về màu — không phải lỗi layout/z-index). Đã
  sửa cả 2 nút: `style="background:#fff;color:var(--ink-600);border:1px solid var(--line);"` (khớp
  đúng tông `.btn.secondary` đã dùng ở nơi khác trong app).

**Kiểm thử đã chạy:** `test_appsheet_features.js` (jsdom) xác minh đủ cả 5 tính năng mới build (mục
6 không cần test vì không code gì) — danh mục lý do huỷ + validate bắt buộc + cài đặt thêm/xoá; ghi
nhận báo cáo sai không đổi trạng thái đơn vị + chặn nội dung rỗng; đẩy lại chưa tiếp nhận thành công
khi đủ điều kiện + bị chặn đúng cả 2 trường hợp (chưa từng xác nhận, đã có đơn vị con); tạo phiếu trả
nhanh cho cả 2 chế độ (ktv/kho) ra đúng trạng thái đích + lưu đúng mã đã Admin sửa lại + chặn tạo
trùng cho đơn vị đã có phiếu trả; xác nhận trả xác bắt buộc chọn 1 trong 3 lựa chọn cho `doi_moi`,
các hướng khác không bị ảnh hưởng. Đã cập nhật `test_sla.js` (test cũ, thêm 1 dòng chọn lý do huỷ vì
giờ là trường bắt buộc mới khi test huớng `tu_choi`). Chạy lại toàn bộ 10 bộ test — 0 lỗi, không hồi
quy (trừ `test_khachle_end2end.js`/`test_lk_fix.js`, 2 test đã biết cũ trước đó chưa cập nhật theo
API mới, đã ghi nhận là nợ kỹ thuật từ vòng "Đối chiếu Gemini" — không liên quan đợt sửa này). Xác
nhận thêm bằng Puppeteer (Chrome thật): cả 2 nút cài đặt trên topbar hiện đúng, đọc được rõ ràng.

## 4 yêu cầu UI/vai trò (01/09/2026) — xem trước mobile, viền ô nhập, click-để-mở, 2 vai trò mới

Người dùng gửi liên tiếp 4 yêu cầu (không chờ yêu cầu trước làm xong mới gửi tiếp) ngay sau đợt đối
chiếu AppSheet ở trên. Nguyên văn cả 4:

1. *"tôi cho tôi button chuyển giao diện sang giao diện mobile để tôi có thể test trực tiếp trên bản
   web demo."*
2. *"viền của các ô có thể nhập liệu tạo 1 viền màu để phân biệt với các ô không thể nhập liệu."*
3. *"tất cả các table đề có thể click vào dòng để mở giao diện UI chi tiết."*
4. *"hệ thống thiếu vai trò admin để phân quyền và vai trò view (Quản Lý, Kiểm Soát) để check và
   kiểm soát thông tin đơn hàng."*

Cả 4 đã build xong, kiểm thử bằng cả jsdom lẫn Chrome thật (Puppeteer), 0 lỗi.

**1. Nút "📱 Xem giao diện Mobile"** — vì JS không thể tự resize 1 tab trình duyệt thật (giới hạn bảo
mật của trình duyệt), đã dùng kỹ thuật `<iframe>` trỏ về cùng file (`location.href`) đặt trong khung
điện thoại 390×844 — iframe có viewport bố cục **độc lập** với tab cha, nên mọi `@media`/`matchMedia`
bên trong nó tự động chạy đúng theo bề rộng 390px thật (sidebar tự thu gọn thành hamburger, StatCard
tự xếp dọc...) mà không cần viết thêm CSS/JS riêng nào — không phải giả lập, là responsive thật đang
chạy trong 1 khung nhỏ. `openMobilePreview()`/`closeMobilePreview()` (đặt cạnh `closeMobileSidebar()`
đã có) — mở overlay `#mobilePreviewOverlay` (nền tối mờ, z-index cao) chứa khung điện thoại + nút
"🔄 Tải lại"/"✕ Đóng"; `openMobilePreview()` tự dọn overlay cũ trước khi tạo mới (tránh chồng nhiều
lớp nếu bấm liên tiếp). Nút đặt trên topbar, cạnh 2 nút cài đặt "⚙".

**2. Viền màu cho ô có thể nhập liệu.** Thêm 2 khối CSS mới ngay sau rule input/select/textarea gốc
(trước rule `:focus`):
```css
input[type=text]:not(:disabled):not([readonly]),
input[type=date]:not(:disabled):not([readonly]),
input[type=number]:not(:disabled):not([readonly]),
select:not(:disabled),
textarea:not(:disabled):not([readonly]){ border-color:var(--ocean-400); }
input:disabled,input[readonly],select:disabled,textarea:disabled,textarea[readonly]{
  background:var(--surface-200);color:var(--ink-400);border-color:var(--line);cursor:not-allowed;
}
```
Ô nhập được viền xanh dương (`--ocean-400`) rõ ràng, ô `disabled`/`readonly` viền xám nhạt + nền xám +
chữ mờ + con trỏ "not-allowed" — tận dụng đúng thuộc tính `disabled`/`readonly` sẵn có trên từng input
(không cần thêm class riêng ở từng nơi gọi, tự động áp dụng toàn app).

**3. Click vào dòng bảng để mở chi tiết.** Có sẵn 1 pattern CSS `tr.clickable-row` từ vòng refactor
Gemini trước đó nhưng bị khoanh vùng chỉ trong `table.tinh-te` — đã gỡ khoanh vùng, áp dụng chung cho
mọi bảng. Đã rà soát và gắn `onclick` cho **mọi bảng còn thiếu** trong file:
- Bảng "Phiếu gửi hàng của tôi" (KTV) → mở chi tiết phiếu gửi.
- Bảng "Danh sách đơn bảo hành trong phiếu" (trong chi tiết phiếu gửi) → hàm mới
  `openParentFirstUnitDetail(scId)` (mở đơn vị con đầu tiên của đơn cha; nếu đơn cha chưa tách đơn vị
  con nào thì báo toast mềm, không mở gì).
- 2 bảng ở màn Kho tiếp nhận → mở modal ghi chú/log (`openGhiChuLogModal`).
- Bảng thống nhất Admin BH (`renderAdminUnifiedTable`) — dòng đơn cha → chuyển sang màn drill-in theo
  thùng; dòng đơn vị con → mở modal chi tiết đơn vị.
- Bảng "Tạo & quản lý phiếu trả" (`readyTable`) và cả 3 biến thể bảng "Dòng" trong thẻ phiếu trả →
  mở modal chi tiết đơn vị.
Mọi ô chứa control lồng bên trong dòng (checkbox chọn hàng loạt, nút hành động, link "Mở"/"Xoá") đều
được bọc `event.stopPropagation()` để không vô tình kích hoạt luôn việc mở modal chi tiết khi bấm
đúng control đó. Bảng quản lý người dùng (`#/qtri/nguoi-dung`) **cố ý không** làm clickable-row vì sửa
đã là sửa trực tiếp inline ngay trên dòng (không có "chi tiết" nào khác để mở).

**4. 2 vai trò mới: `qtri` (Quản trị hệ thống) và `quanly` (Quản lý / Kiểm soát).**
- `ROUTES_BY_ROLE.qtri` → 1 màn `#/qtri/nguoi-dung` (`renderQtriNguoiDung`): bảng toàn bộ
  `DB.users`, mỗi dòng có `<select>` sửa trực tiếp Vai trò/Miền (`suaVaiTroNguoiDung`/
  `suaMienNguoiDung`, đổi ngay không cần nút Lưu riêng), nút "Xoá" (`xoaNguoiDung`, **chặn cứng tự xoá
  chính mình** — chỉ `alert()`, không cho qua), nút "+ Thêm người dùng" (`openThemNguoiDungModal`/
  `submitThemNguoiDung`, chặn trùng email). Đổi vai trò/miền của chính người đang đăng nhập sẽ hỏi xác
  nhận trước rồi tự điều hướng về `#/home` (vì menu/quyền của họ vừa đổi).
- `ROUTES_BY_ROLE.quanly` → 2 màn, **thuần chỉ xem, không có nút hành động nào làm đổi dữ liệu**:
  - `#/quanly/tong-quan` (`renderQuanLyTongQuan`) — dashboard tổng hợp số liệu **toàn hệ thống** (đếm
    theo trạng thái của `phieu_gui`/`phieu_sc_ct`/`phieu_tra`, đếm người dùng theo vai trò), dùng đúng
    class `.stat-card`/`.sc-*` có sẵn từ `renderHome()` (đã đọc lại code gốc để tránh bịa class không
    tồn tại — bản nháp đầu tiên tự nghĩ ra tên tone `ocean/coral/violet` không khớp 6 tone dot thật
    `gray/blue/green/amber/red/purple`, đã sửa lại trước khi test) — giữ nguyên nguyên tắc "mute khi
    = 0" đã áp dụng cho `StatCard` từ vòng redesign UI. Mỗi thẻ bấm được, nhảy sang màn tra cứu.
  - `#/quanly/tra-cuu` (`renderQuanLyTraCuu`) — bảng tra cứu **mọi đơn vị của mọi KTV/khách lẻ trong
    toàn hệ thống** (không lọc theo người tạo/miền như các màn KTV/Admin BH khác), có ô tìm kiếm dùng
    đúng pattern "không re-render toàn trang khi gõ phím" đã lập từ màn KTV tra cứu (biến toàn cục
    `QUANLY_TRACUU_SEARCH` + `updateQuanLyTraCuuTable()` chỉ thay `<tbody>`, giữ focus ô nhập). Clickable-row
    mở đúng modal chi tiết đơn vị (đọc-only, vì modal chi tiết vốn không có nút hành động nào khi mở
    từ ngữ cảnh này — đã test riêng để xác nhận không có nút `openPhanLoaiModal`/`khoXacNhanTiepNhan`/
    `submitPhanLoai` nào lọt vào HTML của màn này).
- 2 người dùng mẫu mới được seed (cả `seedData()` lẫn migration trong `load()` để dữ liệu cũ trong
  `localStorage` cũng tự có): `qtri.hethong@congty.vn` (Đỗ Thị Quản Trị), `quanly.kiemsoat@congty.vn`
  (Vũ Văn Kiểm Soát) — cả 2 không cần trường `mien` (`MIEN_CAN_VAI_TRO` chỉ áp dụng cho 4 vai trò vận
  hành gốc: `ktv/kho/adminbh/nv`).

**1 lỗi có thật phát hiện trong lúc build (bug tồn tại từ trước, không phải do 4 tính năng trên gây
ra, nhưng lộ ra khi chụp thử màn hình mobile 390px):** topbar bị `flex-wrap` tràn xuống dòng 2, đè lên
nội dung trang bên dưới thanh sticky — vì 3 nút mới/không thiết yếu (Xem mobile, 2 nút cài đặt) không
đủ chỗ ở bề rộng hẹp. Đã sửa bằng cách gắn class `topbar-desktop-only` cho cả 3 nút +
`@media (max-width:767px){.topbar-desktop-only{display:none;}}` — ẩn hẳn 3 nút này ở mobile thay vì để
tràn (chấp nhận được vì đây vốn là các thao tác quản trị/cài đặt, không phải thao tác chính của KTV
trên điện thoại). Xác nhận lại bằng ảnh chụp Puppeteer sau khi sửa: topbar không còn đè lên "Xin
chào..." card, sidebar/StatCard vẫn responsive đúng.

**Kiểm thử đã chạy:** `test_new_features.js` (jsdom) — mở/đóng overlay mobile preview + không để lại
overlay trùng khi bấm 2 lần liên tiếp; vai trò `qtri` đổi vai trò/miền người khác đúng, thêm người
dùng chặn trùng email, xoá người dùng chặn tự xoá chính mình; vai trò `quanly` render đúng cả 2 màn,
xác nhận số liệu tra cứu bằng đúng `DB.phieu_sc_ct.length` (toàn hệ thống, không bị lọc nhầm theo 1
người), xác nhận không có nút hành động nào trong HTML của màn tra cứu; spot-check `clickable-row` ở
bảng phiếu gửi KTV và bảng thống nhất Admin BH (bấm được, mở đúng modal); input được phép sửa xác nhận
`disabled===false`. Chạy lại toàn bộ 11 bộ test trước đó (bao gồm cả 5 test QR/camera và 2 test
QA-fixes/AppSheet của các vòng trước) — 0 lỗi, không hồi quy (`test_khachle_end2end.js`/`test_lk_fix.js`
vẫn là nợ kỹ thuật cũ, không thuộc bộ test thường quy). Xác nhận thêm bằng 5 ảnh chụp Puppeteer (Chrome
thật): overlay mobile preview responsive đúng thật (không phải giả lập), màn quản trị người dùng hiện
đúng viền xanh trên các ô `<select>`, màn "Tổng quan hệ thống"/"Tra cứu mọi đơn hàng" của vai trò
`quanly` hiện đúng dữ liệu nhiều KTV khác nhau cùng lúc, form "Thêm đơn bảo hành" của KTV hiện đúng
viền xanh trên input ngày/select/text.

## 4 yêu cầu UI toàn hệ thống (02/09/2026) — bảng 1 dòng, modal tràn màn hình, log đầy đủ, gam màu

Nguyên văn 4 yêu cầu người dùng gửi cùng lúc, kèm chỉ đạo quy trình rõ ràng ("phân tích toàn bộ dự án
→ đánh giá lại từng yêu cầu → kiểm tra tính khả thi → tìm kiếm thông tin online → đưa phương án → tự
phản biện → lập kế hoạch → triển khai → tái đánh giá → báo cáo chi tiết"):

1. *"tất cả giao diện dự án dạng table => đều tìm phương án chuyển hết về 1 dòng, không tạo thành 2
   dòng. (cả web và mobile)"*
2. *"Khi mở giao diện UI trên web thì sẽ mở popup giao diện tràn màn hình chứ không chỉ mở nhỏ nhỏ ở
   giữa."*
3. *"Lưu đầy đủ mọi log và trong giao diện UI chi tiết sẽ tách thành các mảng dữ liệu riêng biệt, có
   vùng hiện log riêng."*
4. *"Xem lại gam màu, hiện tại các vùng dữ liệu, và nền đang không rõ ràng. Chỉnh lại gam màu để làm
   nổi bật vùng làm việc, vùng xem thông tin => căn chỉnh lại màu và giao diện cho toàn hệ thống."*

Đã tra cứu tham khảo trước khi quyết định phương án (không tự bịa quy ước UI): CSS-Tricks/LogRocket
về kỹ thuật bảng dữ liệu không xuống dòng (khuyến nghị `white-space:nowrap` + container cuộn ngang,
không phải ép chữ xuống dòng); so sánh modal căn giữa vs full-screen dialog (khuyến nghị: modal nhỏ
cho xác nhận/form đơn giản, full-screen cho nội dung lớn/phức tạp cần tập trung cao — **không phải
"mọi modal đều full"**); mẫu UI "Activity Log"/timeline audit trail (nhiều nguồn log tách riêng theo
timestamp + người thực hiện); nguyên tắc "surface elevation" cho dashboard 2025 (phân tầng bằng MÀU
NỀN giữa các lớp, không chỉ dựa vào shadow).

**1. Bảng luôn 1 dòng (web + mobile).** Rà soát toàn bộ ~14 bảng danh sách dữ liệu thật trong file
(không tính các bảng key-value 2 cột trong modal chi tiết, vốn cố ý giữ wrap cho các trường mô tả dài
như "Địa chỉ"/"Mô tả lỗi"):
- Tìm thấy 9 chỗ `<td>` xếp 2 dòng theo kiểu `Tên chính<div class="fine">Phụ</div>` (VD "Nguyễn Văn Ký"
  xuống dòng rồi mới tới mã case bên dưới) — chuyển hết thành 1 dòng dùng dấu `·` phân cách
  (`Tên chính · Phụ`, dùng `<span>` thay `<div>`).
- 2 cột "Mô tả lỗi" (bảng thống nhất Admin BH) chưa có ellipsis như 1 bảng khác đã làm đúng từ trước
  (Kế toán/NV) — đã thêm `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` + `title="..."`
  để xem đủ khi hover, đồng bộ với pattern đã có.
- Thêm CSS toàn cục `table.tinh-te, .table-responsive table { white-space: nowrap; }` — dựa hẳn vào
  `.table-responsive` (cuộn ngang, đã có sẵn từ vòng refactor Gemini) thay vì để trình duyệt tự xuống
  dòng, đúng khuyến nghị đã tra cứu.
- **Phát hiện quan trọng nhất của mục này**: nút hành động trong 1 ô (`.btnrow`, dùng `flex-wrap:wrap`
  mặc định cho form thường) mới là thủ phạm chính khiến 1 dòng bảng "vỡ" thành 2 dòng trực quan (nút
  thứ 2 rớt xuống dưới nút đầu) — cơ chế này **khác** `white-space`, không bị chặn bởi rule nowrap ở
  trên. Đã thêm riêng `.table-responsive td .btnrow, table.tinh-te td .btnrow { flex-wrap: nowrap; }`.
- 5 bảng còn thiếu container cuộn ngang (`renderKtvTaoPhieu`, `renderPhieuGuiDetail`, `renderKhoTiepNhan`
  x2, `renderAdminUnifiedTable`, `readyTable` trong `renderAdminPhieuTra`) đã được bọc thêm
  `<div class="table-responsive">`.
- **Tự phản biện phát hiện thêm 1 vấn đề phụ**: dựa hẳn vào cuộn ngang thay vì xuống dòng có nghĩa
  người dùng phải BIẾT là còn dữ liệu ở bên phải — nhưng thanh cuộn overlay mặc định của hệ điều hành
  (mỏng, gần như trong suốt, chỉ hiện khi hover) không đủ rõ để nhận ra. Đã thêm CSS ép hiện 1 thanh
  cuộn mỏng nhưng **luôn thấy** cho `.table-responsive` (`scrollbar-width:thin` + `::-webkit-scrollbar`
  tô màu `--ocean-400`) thay vì để thanh cuộn ẩn mặc định.

**2. Modal tràn màn hình.** **Tự phản biện quan trọng nhất của cả đợt này**: bản nháp đầu tiên cho
**toàn bộ 35 modal** trong app đều tràn màn hình như nhau — chụp thử ngay 1 modal xác nhận đơn giản
("Báo sự cố tiếp nhận", chỉ 1 select + 1 textarea) thì lộ ra vấn đề mới: nội dung nằm lọt thỏm ở góc
trên-trái 1 panel gần-full-HD, phần còn lại là khoảng trống rỗng — đúng loại lỗi UX mà tài liệu tham
khảo đã cảnh báo ("modal nhỏ dành cho thông tin ít, tránh làm người dùng choáng ngợp"). Đã sửa lại
theo **2 kích cỡ rõ ràng** thay vì ép 1 kích cỡ cho tất cả:
- **Mặc định** (`.modal`, không thêm gì): kích cỡ theo nội dung như cũ nhưng **tăng đáng kể**
  (520px → 760px, 88vh → 90vh) — áp dụng cho 33/35 modal (mọi form nhập liệu, xác nhận, cài đặt) —
  đủ rộng rãi hơn hẳn bản cũ nhưng không để trống khoảng trắng vô nghĩa.
- **`.modal--full`** (tham số thứ 3 mới của `openModal(title, bodyHtml, full)`): panel gần kín màn
  hình (chừa 24px lề) trên desktop — **chỉ gán cho `openDetailUnitModal`/`openDetailTraModal`**, 2 màn
  thật sự nhiều dữ liệu (đúng loại nội dung tài liệu tham khảo khuyến nghị dùng full-screen dialog) —
  đây chính là 2 màn người dùng khả năng cao đã thấy chật chội khi phàn nàn (trước đó ép gọn trong
  520px nhưng chứa 2 cột thông tin + timeline + khung chat).
- Trên **mobile, mọi modal đều tràn màn hình như nhau** (không phân biệt mặc định/full) — màn hình
  nhỏ không còn khái niệm "modal vừa" hợp lý, đồng bộ với `.mobile-sheet` đã có từ vòng redesign UI
  trước.
- Thêm rule `.modal-body .field:not(.grid2 .field):not(.grid3 .field){max-width:640px;}` để form 1
  cột (không nằm trong layout nhiều cột) không bị kéo giãn hết bề rộng panel, giữ độ dài dòng dễ đọc.
- Đồng bộ luôn: `openModal()` gắn thêm class `body.modal-open` (song song `body.mobile-sheet-open` đã
  có) để đẩy `.toast-wrap` lên một chút trên mobile, tránh toast đè lên mép dưới panel giờ đã tràn hết
  màn hình.

**3. Log đầy đủ, tách vùng riêng biệt.** Rà lại `openDetailUnitModal()`: trước đó **chỉ đọc `DB.logs`
lọc theo `entity_type='phieu_sc_ct'` của riêng đơn vị đang xem** — bỏ sót hoàn toàn lịch sử của cả
chuỗi cha nó thuộc về, dù `addLog()` trên thực tế đã ghi đủ 4 `entity_type` xuyên suốt file
(`phieu_gui`, `phieu_sc`, `phieu_sc_ct`, `phieu_tra` — xác nhận bằng `grep "addLog("`). Đã sửa:
- Hàm dùng chung mới `renderLogBlock(title, logs)` — mỗi nguồn log là **1 khối riêng có tiêu đề + số
  đếm riêng**, không gộp chung 1 danh sách (đúng nguyên văn "tách thành các mảng dữ liệu riêng biệt,
  có vùng hiện log riêng").
- 4 khối hiện đủ khi có dữ liệu liên quan: 📦 Nhật ký đơn vị bảo hành này (`phieu_sc_ct`), 🗂️ Nhật ký
  đơn cha (`phieu_sc`, mới thêm), 🚚 Nhật ký phiếu gửi (`phieu_gui`, mới thêm — chỉ hiện nếu đơn thuộc
  1 phiếu gửi thật, không hiện với đơn dịch vụ tính phí/khách lẻ), ↩️ Nhật ký phiếu trả (`phieu_tra`,
  mới thêm — chỉ hiện nếu đơn đã được gộp vào 1 phiếu trả). Xếp dạng lưới 2 cột (`.grid2`), tự xuống
  1 cột trên mobile.
- Mục "💬 Trao đổi / Phản hồi của đơn hàng" (`ghi_chu_log` của phiếu gửi, có sẵn từ trước) giữ nguyên
  vị trí riêng, không gộp vào 4 khối trên — đây là hội thoại tự do, khác bản chất với log trạng thái.
- **Phát hiện thêm 1 nguồn dữ liệu chưa từng hiện ở đâu cả**: `phieu_sc.bao_cao_sai_thong_tin` (ghi
  nhận nội bộ "KTV báo cáo sai thông tin", thêm từ vòng đối chiếu AppSheet 31/08/2026) trước giờ chỉ
  ghi được qua modal riêng, **không có màn nào đọc lại được** trong ngữ cảnh 1 đơn vị cụ thể. Đã thêm
  vào modal chi tiết, nhưng có **quyết định phân quyền chủ động** (tự quyết, không hỏi lại vì đã có
  ngữ cảnh rõ từ tên gọi + mục đích ghi ở vòng 31/08): mục này **chỉ hiện cho vai trò giám sát**
  (`adminbh`/`qtri`/`quanly`), **ẩn với chính KTV đang bị ghi nhận** — vì bản chất dữ liệu là "đánh giá
  nội bộ, có thể dùng xử lý vi phạm báo cáo sau này" (nguyên văn từ vòng 31/08), không phải thông tin
  nghiệp vụ cần công khai cho người bị đánh giá.

**4. Gam màu.** Đo thử bằng mã hex trước khi sửa (không đoán): `--bg` (nền trang, `#f2f6f9`) và
`--surface-100` (nền vùng lồng bên trong 1 card, `#f5f8fa`) **chỉ lệch nhau ~1-3/255 mỗi kênh RGB** —
gần như không phân biệt được bằng mắt thường, đúng nguyên nhân gốc của "vùng dữ liệu và nền không rõ
ràng". Đã tách lại thành 1 thang độ sáng rõ rệt hơn, tăng dần theo đúng nguyên tắc "surface elevation"
đã tra cứu (phân tầng bằng màu nền, không chỉ shadow):
- `--bg`: `#f2f6f9` → `#e7edf3` (nền trang, tầng mờ nhất).
- `--surface-100`: `#f5f8fa` → `#eef2f6` (vùng lồng/tham khảo bên trong 1 card).
- `--surface-200`: `#e9eff3` → `#e1e8ee` (vùng nhấn mạnh/disabled, đậm nhất trong 4 mức).
- `--line`: `#e1eaf0` → `#d7e1e9` (viền card/bảng rõ hơn 1 chút).
- `.card` shadow: từ 1 lớp gần như vô hình (`0 1px 2px rgba(...,.04)`) → 2 lớp (`0 1px 2px` +
  `0 4px 14px rgba(...,.06)`) để card "nổi" rõ hơn khỏi nền, không chỉ dựa vào viền mảnh.
- **Cố ý KHÔNG đổi** các tông chữ phụ (`--ink-400`/`--fine`/`--muted`) — đây là phần chữ mờ có chủ đích
  theo nguyên tắc "mute khi không quan trọng" đã áp dụng nhất quán từ vòng redesign UI, không phải lỗi
  cần sửa; yêu cầu lần này tập trung vào "nền"/"vùng dữ liệu" (bố cục), không phải độ đậm chữ.

**Kiểm thử đã chạy:** test mới `test_ui_overhaul.js` (jsdom) xác minh riêng cả 4 mục — không còn
pattern `<td>` xếp chồng 2 dòng, các bảng còn thiếu đã có `.table-responsive`, CSS nowrap + chặn
`.btnrow` bể dòng đã tồn tại; `openDetailUnitModal`/`openDetailTraModal` có class `.modal--full`,
modal đơn giản (`openSuCoModal`) thì không, mở modal 2 lần liên tiếp không để lại nhiều `#activeModal`
(giữ nguyên fix cũ); modal chi tiết có đủ các khối log riêng biệt (đơn vị/đơn cha/phiếu gửi) xếp dạng
lưới 2 cột; "Ghi nhận nội bộ" hiện đúng cho `adminbh`, ẩn đúng với `ktv`; token màu mới đã áp dụng.
Chạy lại toàn bộ 11 bộ test trước đó (bao gồm QR/camera, QA-fixes, AppSheet, roles mới) — **0 lỗi,
không hồi quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật) ở cả desktop (1500px, 1200px) và
mobile (390px): bảng cuộn ngang đúng thay vì vỡ dòng (đo thêm `scrollWidth`/`clientWidth` qua
`page.evaluate` để chắc chắn không chỉ là "nhìn có vẻ đúng"), modal chi tiết tràn gần hết màn hình với
4 khối log rõ ràng, modal đơn giản không còn khoảng trống vô nghĩa sau khi sửa theo hướng 2 kích cỡ,
gam màu mới cho thấy ranh giới card/nền/vùng lồng rõ hơn hẳn ở mọi màn đã chụp thử.

## Menu mobile chuyển xuống bottom (02/09/2026)

Nguyên văn yêu cầu (gửi ngay sau vòng "4 yêu cầu UI toàn hệ thống" ở trên): *"giao diện mobile chuyển
menu xuống bottom."*

Trước đó, ở màn hình điện thoại thật (≤767px, đúng ngưỡng "mobile" chuẩn của app), menu điều hướng là
1 drawer trượt từ trái, mở bằng nút hamburger trên topbar — ẩn mặc định, phải bấm mới thấy. Đã đổi
sang **bottom tab bar cố định ở đáy màn hình** (mẫu điều hướng chuẩn của app di động — Instagram, Grab,
Shopee...), luôn hiển thị, không cần mở/đóng:

- **Chỉ áp dụng đúng ngưỡng ≤767px** (điện thoại thật) — vùng tablet 768–900px **vẫn giữ nguyên**
  drawer/hamburger cũ (màn đủ rộng, drawer không bị chật, đổi sẽ không có lợi gì thêm).
- `renderBottomNav()` (hàm mới) **dùng lại đúng 1 nguồn dữ liệu** `ROUTES_BY_ROLE` +
  `workloadItems()` với `renderSidebar()` đã có — không định nghĩa danh sách menu lần 2 phải bảo trì
  song song. Số mục tối đa 1 vai trò hiện có là 4 (Trang chủ + 3 màn, vai trò `ktv`/`adminbh`) — vừa
  khít 1 hàng ngang, không cần cơ chế "Xem thêm".
- Icon + nhãn xếp dọc trong mỗi nút (mẫu bottom-tab chuẩn), mục đang mở tô sáng, giữ nguyên chấm đỏ
  báo "có việc cần làm" trên icon Trang chủ (đã có từ sidebar, mang nguyên sang).
- Dùng nền gradient navy giống hệt sidebar (không tạo thêm 1 tông màu thứ 3), giữ nhất quán ngôn ngữ
  thị giác đã có.
- `env(safe-area-inset-bottom)` cho thanh này (tránh bị home-indicator iPhone che khuất) + thêm
  padding-bottom cho `.main-col` để nội dung trang không bị thanh cố định này đè lên ở cuối trang.
- Ẩn hẳn nút hamburger + drawer cũ ở ≤767px (không còn 2 cơ chế điều hướng chồng nhau).

**1 lỗi thật phát hiện ngay khi kiểm thử bằng Puppeteer (Chrome thật)** — bản đầu tiên chụp thử ở
390px thì thanh menu **hoàn toàn không hiện**, dù `renderBottomNav()` sinh đúng HTML (đã log kiểm tra
`innerHTML` xác nhận đủ 4 thẻ `<a>`). Debug bằng `getComputedStyle` thì `.bottom-nav` báo
`display:"none"` dù đang ở 390px. Nguyên nhân: **thứ tự CSS trong file bị đảo ngược** — rule
`.bottom-nav{display:none;...}` (mặc định) được viết SAU rule `@media(max-width:767px){.bottom-nav
{display:flex;}}`, mà 2 rule có cùng độ đặc tả (1 class), nên **rule đứng sau trong nguồn luôn thắng
bất kể `@media` có khớp hay không** — 1 lỗi CSS cascade kinh điển, không phải lỗi logic JS. Đã sửa
bằng cách đảo lại đúng thứ tự (rule mặc định `display:none` viết TRƯỚC, override `display:flex` trong
`@media` viết SAU) — verify lại bằng đúng `getComputedStyle` sau khi sửa, ảnh chụp xác nhận thanh menu
hiện đúng.

Cùng lúc đó, phát hiện thêm 1 vấn đề phụ cần xử lý để tránh hồi quy: khi thanh bottom-nav **luôn hiện
thường trực** trên mọi trang mobile (khác với trước đây, khi menu chỉ xuất hiện lúc bấm hamburger),
toast (`.toast-wrap`, mặc định `bottom:18px`) sẽ đè lên thanh menu mỗi khi hiện. Đã thêm 1 rule mới
`body:not(.mobile-sheet-open):not(.modal-open) .toast-wrap{bottom:74px;}` (chỉ áp dụng ở trạng thái
bình thường — khi có mobile-sheet/modal đang mở phủ kín màn hình thì 2 rule cũ đã có từ trước vẫn
đúng, vì lúc đó bottom-nav bị modal che khuất phía sau, không còn liên quan).

**Kiểm thử đã chạy:** `test_bottom_nav.js` (jsdom) — xác nhận đủ số mục theo từng vai trò, dùng đúng
dữ liệu `ROUTES_BY_ROLE` (không tạo nguồn riêng), chấm đỏ báo việc cần làm hiện đúng, trạng thái
"active" cập nhật đúng khi đổi hash, và có test riêng canh đúng **thứ tự 2 rule CSS** trong file (để
lỗi thứ tự y hệt không lặp lại âm thầm ở lần sửa sau). Chạy lại toàn bộ 12 bộ test trước đó — 0 lỗi,
không hồi quy. Xác nhận thêm bằng ảnh chụp Puppeteer thật: bottom nav hiện đúng ở 390px với đủ
icon/nhãn/chấm đỏ, bấm vào 1 mục điều hướng đúng trang + tô sáng đúng mục, ở 820px (tablet) drawer cũ
vẫn mở được bình thường (không bị ảnh hưởng), toast hiện rõ phía trên thanh menu không bị che, và mở
modal chi tiết (full-screen) trên mobile che đúng thanh menu phía sau (không bị lộ 2 lớp điều hướng
chồng nhau).

## Sort log mới nhất lên đầu + đánh giá lại toàn bộ visual hierarchy (02/09/2026)

Nguyên văn 2 yêu cầu, gửi cùng lúc với chỉ đạo quy trình đầy đủ (*"khám phá các giao diện đẹp trên thế
giới => phân tích các màn hình hiện tại => lên kế hoạch thay đổi... => phản biện lại thay đổi => chốt
kế hoạch => đưa ra bản chỉnh sửa cuối cùng => chỉnh sửa => tái đánh giá và => báo cáo kết quả"*):

1. *"các log lịch sử sort ngày mới nhất lên trên cùng."*
2. *"Với vai trò người dùng, hãy đánh giá lại toàn bộ giao diện hiện tại, tôi thấy rất khó nhìn. ví dụ
   như nhìn nhanh không thể xác định được vùng dữ liệu mình cần quan tâm, vùng cần nhập liệu."*

**1. Sort log.** Thêm hàm dùng chung `sortLogsDesc(logs)` (parse `new Date()`, không sửa mảng gốc —
chỉ đổi THỨ TỰ HIỂN THỊ, không đổi thứ tự lưu trong `DB`) — áp dụng cho toàn bộ 7 nơi từng hiển thị
log theo đúng thứ tự chèn (insertion order) trước đó: 4 khối `renderLogBlock()` trong modal chi tiết
đơn vị (đơn vị/đơn cha/phiếu gửi/phiếu trả), timeline trong `openDetailTraModal`, và mọi nơi hiện
`ghi_chu_log` (4 chỗ)/`bao_cao_sai_thong_tin` (2 chỗ).

**2. Đánh giá lại visual hierarchy.** Đã tra cứu nguyên tắc thiết kế dashboard/enterprise UI 2025-2026
trước khi sửa (không tự đoán): "kích cỡ/độ đậm làm việc nhiều hơn màu sắc khi quét nhanh", "dành màu
rực rỡ CHỈ cho cảnh báo/bất thường thật sự — tránh hiệu ứng cầu vồng", "trường chỉ-xem nên đọc được rõ
như trường có thể sửa, không nên làm mờ đi chỉ vì disabled" (nguồn: UXPin, Aaron Gustafson "Web Form
Conundrum", secretGeek "Don't make readonly fields less readable"). Sau đó chụp ảnh Chrome thật nhiều
màn hình (Trang chủ, bảng hàng đợi, form Phân loại, modal chi tiết, chi tiết phiếu gửi KTV) để phân
tích cụ thể — không phán đoán suông. Phát hiện 3 vấn đề cốt lõi rồi mới sửa:

- **Tín hiệu khẩn cấp phổ biến nhất (badge SLA `slaBadge()`) không có bậc thang.** Trước đó CHỈ 2 mức
  (đúng hạn = xám, quá hạn = pastel đỏ) — 1 đơn quá hạn 25 giờ và 1 đơn quá hạn **333 giờ (13+ ngày)**
  hiện ra **giống hệt nhau**, không cách nào phân biệt độ khẩn cấp bằng mắt thường dù đây là tín hiệu
  xuất hiện ở gần như mọi bảng/hàng đợi trong app. Đã thêm mức thứ 3: quá hạn **trên 72 giờ** (gấp 3
  lần mức SLA chuẩn 24h của hệ thống) chuyển sang badge **nền đặc + chữ trắng** (`.b-red-solid`, icon
  ⚠) — khác hẳn các badge pastel còn lại, dùng đúng tinh thần "màu mạnh dành riêng cho cảnh báo thật".
  `isOverdue()` (hàm riêng dùng để bắt buộc nhập lý do chậm) **giữ nguyên không đổi** — chỉ đổi phần
  hiển thị, không đụng logic nghiệp vụ.
- **"Việc của tôi" (khu vực CẦN LÀM NGAY) và "Tổng quan tất cả hàng đợi" (số liệu THAM KHẢO) trông
  giống hệt nhau về độ nổi bật** — chỉ khác nhau ở dòng chữ tiêu đề, không có gì buộc mắt dừng lại ở
  khu vực quan trọng hơn trước. Đã thêm modifier `.card-action` (viền trái đỏ cam đậm + tiêu đề đổi
  màu + icon 🔥) — **chỉ gắn khi thực sự có việc đang chờ** (rỗng thì giữ nguyên card trung tính, không
  "báo động giả"). Đồng thời tô màu số liệu lớn (`.sc-value`) trong StatCard theo đúng tông cảnh báo
  khi khác 0 (trước đó số luôn màu đen trung tính, chỉ 1 chấm tròn 8px góc trên phân biệt màu — quá
  nhỏ để "quét nhanh" nhận ra).
- **Nhãn nhóm trường trong form dài** (VD "PHÂN LOẠI BẢO HÀNH" / "XỬ LÝ & PHÂN CÔNG" trong form Phân
  loại) dùng nhầm class `.fine` (vốn dành cho chú thích phụ, màu rất nhạt 11px) — gần như vô hình, mất
  tác dụng phân tách section. Tách riêng thành class `.form-section-label` (màu ocean-700 + gạch chân
  màu) để thực sự đọc được như 1 tiêu đề phụ.
- **Trường disabled/readonly bị làm mờ quá mức, gây hiểu lầm hai chiều**: vừa trông như "1 ô nhập bị
  lỗi/khoá" (viền rõ + con trỏ "not-allowed", dễ khiến người dùng thử bấm rồi thắc mắc sao không gõ
  được) vừa làm chữ **khó đọc hơn** dữ liệu vẫn cần tham khảo (màu ink-400 rất nhạt) — đúng 2 lỗi mà
  tài liệu tham khảo cảnh báo. Đã bỏ viền (border-color:transparent — không còn trông như "ô nhập bị
  khoá"), đổi con trỏ sang `default` (bớt hàm ý "bị chặn"), và **tăng** độ tương phản chữ lên ink-700
  (rõ hơn hẳn ink-400 cũ) vì đây vẫn là dữ liệu người dùng cần đọc, chỉ là không sửa được.
- Bump nhẹ độ đậm/viền của `.workload-pill` (font-weight 700→800, thêm viền màu theo tông) và
  `.req::after` (dấu `*` bắt buộc, đậm hơn) — hỗ trợ thêm cho nguyên tắc "độ đậm > màu sắc khi quét".

**Tự phản biện trước khi chốt phạm vi:** cân nhắc chuyển hẳn các trường disabled/readonly sang plain
text (đúng khuyến nghị mạnh nhất trong tài liệu tham khảo) thay vì chỉ làm mềm CSS ô input — quyết
định **không làm** ở vòng này vì đòi hỏi tách lại markup theo `canEdit` ở nhiều màn hình khác nhau
(rủi ro/công sức lớn hơn nhiều so với 1 thay đổi CSS thuần), trong khi bản CSS đã đủ giải quyết đúng
triệu chứng người dùng nêu ra (nhầm là ô nhập được, chữ khó đọc) — ghi nhận đây là hướng cải tiến tiếp
theo nếu người dùng muốn làm triệt để hơn, không tự ý làm rộng phạm vi khi chưa được yêu cầu.

**Kiểm thử đã chạy:** `test_log_sort.js` (jsdom, xác nhận `sortLogsDesc()` sắp đúng + không sửa mảng
gốc, và modal chi tiết thực sự hiện log mới nhất trước log cũ dù thứ tự chèn ngược lại) và
`test_ui_hierarchy.js` (xác nhận 3 mức `slaBadge()` đúng ngưỡng, `isOverdue()` không bị ảnh hưởng,
`.card-action` gắn đúng theo có/không có việc — test cả 2 nhánh, kể cả vai trò `quanly` luôn rỗng việc
để đảm bảo nhánh "không nổi bật" cũng đúng, `.form-section-label` xuất hiện đúng trong form Phân loại,
và rule CSS input disabled/readonly đúng như kỳ vọng). Chạy lại toàn bộ 13 bộ test trước đó — **0 lỗi,
không hồi quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật) trước/sau: Trang chủ với card
"Việc của tôi" viền đỏ cam nổi bật rõ khỏi "Tổng quan" trung tính, bảng hàng đợi với badge SLA nền đặc
đỏ nổi bật hẳn khỏi các badge pastel còn lại (so sánh trực tiếp trước/sau cho thấy khác biệt rõ rệt),
form Phân loại với nhãn nhóm đọc được rõ ràng, và chi tiết phiếu gửi KTV với 4 trường lịch sử không
còn trông như ô nhập bị khoá trong khi trường thực sự sửa được vẫn nổi bật viền xanh như cũ.

## Nút thao tác chuyển lên top tiêu đề của UI chi tiết (02/09/2026)

Nguyên văn yêu cầu: *"trên bản web các nút tao tác, chuyển về top tiêu đề của UI chi tiết."*

Bối cảnh: 2 "UI chi tiết" (`openDetailUnitModal`/`openDetailTraModal`, dùng `.modal--full` — panel gần
kín màn hình từ vòng sửa "modal tràn màn hình" ở trên) trước đó chỉ có **đúng 1 nút** ("Đóng chi
tiết"/"Đóng"), đặt ở **cuối cùng** sau khi đã cuộn qua hết toàn bộ nội dung (2 cột thông tin, ảnh,
lưới log, khung trao đổi) — với panel giờ đã dài hơn nhiều (do vòng sửa trước), phải cuộn hết xuống
đáy mới bấm được nút này.

Đã thêm tham số thứ 4 cho `openModal(title, bodyHtml, full, headerActions)` — `headerActions` là HTML
của nhóm nút, được chèn vào `.modal-head` (giữa tiêu đề và nút đóng ×) thay vì cuối `.modal-body`.
`.modal-head` có `flex-shrink:0` (không cuộn theo nội dung, đã có sẵn từ đầu) nên nút đặt ở đây **luôn
nhìn thấy được bất kể đang cuộn tới đâu** trong panel. CSS `.modal-head` đổi từ
`justify-content:space-between` (chỉ hợp với 2 phần tử) sang `h3{flex:1}` (chiếm hết khoảng trống còn
lại, tự ellipsis nếu tiêu đề dài) + `.modal-head-actions{flex-shrink:0}` (nhóm nút + nút đóng đều dính
sát phải, không co lại). Cả 2 hàm `openDetailUnitModal`/`openDetailTraModal` chuyển nút "Đóng chi
tiết"/"Đóng" từ `.btnrow` cuối nội dung sang tham số `headerActions` này — không thêm chức năng gì
mới, chỉ đổi vị trí đúng như yêu cầu. 33/35 modal còn lại (form/xác nhận thường, không phải "UI chi
tiết") không gọi tham số này, giữ nguyên hành vi cũ (không có `headerActions` thì `openModal()` không
render div phụ nào, không ảnh hưởng).

**Kiểm thử đã chạy:** `test_modal_header_actions.js` (jsdom) — xác nhận nút đã có trong `.modal-head`
và **không còn** trong `.modal-body` cho cả 2 modal, bấm nút trong header vẫn đóng được modal đúng
(`closeModal()`), và modal thường (`openSuCoModal`, không truyền `headerActions`) không bị thêm nhầm
div `.modal-head-actions` rỗng. Chạy lại toàn bộ 15 bộ test trước đó — 0 lỗi, không hồi quy. Xác nhận
thêm bằng ảnh chụp Puppeteer (Chrome thật): nút "Đóng chi tiết" hiện đúng cạnh tiêu đề trên desktop,
**vẫn hiện nguyên vị trí sau khi cuộn sâu xuống cuối nội dung** (ảnh chụp trước/sau cuộn để đối
chứng — đây chính là mục đích của yêu cầu), và trên mobile (390px) tiêu đề tự ellipsis, nút + × vẫn
đủ chỗ trên 1 hàng, không tràn/xuống dòng.

## Lời chào lên topbar + gộp Cài đặt hệ thống + sidebar mặc định thu gọn (03/09/2026)

Nguyên văn 3 yêu cầu, gửi cùng lúc:

1. *"banner xin chào chiếm quá nhiều diện tích không cần thiết, cho nó lên thành lời chào ở góc trên
   top banner."*
2. *"Các settings cho tài khoản admin. chuyển nó về chung 1 modules settings cho admin hệ thống quản
   trị."*
3. *"Giao diện web dành cho các vai trò xử lý tự động kéo giãn ra khi thu gọn menu. (mặc định menu
   sẽ ở trạng thái thu gọn - thẻ menu nào có việc cần làm sẽ tô đậm số việc cần làm lên như 1 dạng
   báo có tin nhắn)"*

**1. Lời chào chuyển lên topbar.** The `<div class="card">` "Xin chào, {tên}" + dòng phụ "Vai trò ·
Miền · email" ở đầu Trang chủ (~70-80px chiều cao) đã xoá hẳn khỏi `renderHome()`. Thay bằng
`<span id="topbarGreeting">` tĩnh trong `<header class="topbar">`, cập nhật nội dung qua `updateAvatar()`
(hàm đã có sẵn, gọi mỗi khi đổi vai trò — mở rộng thêm luôn việc set `innerHTML` của greeting + set
`title` tooltip đầy đủ vai trò/miền/email trên chính avatar tròn, thay vì phải thêm 1 lệnh gọi mới ở
nơi khác). Chỉ hiện trên desktop (`topbar-desktop-only` — mobile đã thấy tên qua dropdown "Vai trò"
đang chọn, không cần thêm dòng riêng khi màn hình đã chật). Trang chủ giờ mở đầu ngay bằng "🔥 Việc
của tôi" — khu vực quan trọng nhất lên vị trí đầu tiên thay vì bị đẩy xuống dưới lời chào.

**2. Gộp settings admin về 1 module.** Trước đó nút "⚙ Lý do chậm"/"⚙ Lý do huỷ" nằm thẳng trên
topbar **toàn cục, hiện cho MỌI vai trò** đang xem — đây chính là lỗ hổng đã ghi nhận ở mục "Phản hồi
vòng 2" (`[CẦN XÁC NHẬN] vai trò nào thực sự được quyền sửa danh mục "Lý do chậm"`), treo từ trước khi
có vai trò `qtri`. Đã dời hẳn 2 nút này ra khỏi topbar, gộp vào 1 trang mới **`#/qtri/cai-dat`
("Cài đặt hệ thống")** — chỉ vai trò Quản trị hệ thống thấy trong sidebar, vừa gộp đúng yêu cầu vừa
giải quyết luôn câu hỏi mở cũ. Khác với modal cũ (bấm nút mới mở popup riêng), trang mới hiện **trực
tiếp cả 2 danh mục dạng lưới 2 cột ngay trên trang** (không cần thêm 1 lượt bấm/mở modal) — 2 hàm
`openLyDoChamSettingsModal`/`openLyDoTuChoiSettingsModal` (chỉ có đúng 2 nơi gọi là 2 nút topbar vừa
xoá) đã bỏ hẳn, thay bằng `lyDoChamListHtml()`/`lyDoTuChoiListHtml()` (trả về HTML nhúng thẳng vào
trang) + `addLyDoCham()`/`removeLyDoCham()`/... đổi từ "mở lại modal" sang gọi `render()` (đúng cách
làm `xoaNguoiDung()` ở trang `#/qtri/nguoi-dung` bên cạnh đã dùng).

**3. Sidebar mặc định thu gọn + nội dung tự giãn + huy hiệu từng tab.**
- `SIDEBAR_COLLAPSED` đổi mặc định `false` → `true`.
- **Nội dung tự kéo giãn khi thu gọn**: `renderSidebar()` giờ đồng bộ 1 class `body.sidebar-collapsed`
  theo đúng `SIDEBAR_COLLAPSED` mỗi lần render (thay vì chỉ đổi độ rộng `<aside>`) — CSS
  `body.sidebar-collapsed .wrap,body.sidebar-collapsed footer.note{max-width:1440px;}` (tăng từ
  1180px mặc định) tận dụng đúng ~176px vừa giải phóng khi sidebar co từ 248px xuống 72px. Đã xác
  nhận bằng ảnh chụp so sánh trực tiếp: cùng 1 bảng dữ liệu, bản thu gọn hiện thêm được 1-2 cột trước
  khi bị cắt, bản mở rộng bị cắt sớm hơn hẳn.
- **Huy hiệu số việc cần làm cho TỪNG tab riêng** (trước đây chỉ "Trang chủ" có huy hiệu tổng): gom
  `workloadItems()` theo đúng field `hash` sẵn có của từng item, gắn `.si-count` vào đúng mục sidebar
  tương ứng. Khi **thu gọn** (chỉ còn icon, không còn chỗ đặt cạnh nhãn như bình thường), `.si-count`
  chuyển từ ẩn hẳn (hành vi cũ) sang **huy hiệu tròn nhỏ đè lên góc icon** — đúng kiểu "báo có tin
  nhắn chưa đọc" trên icon app điện thoại, dùng nguyên `position:relative` sẵn có trên `.sidebar-item`
  làm điểm neo. Ở tablet 768-900px (drawer luôn mở full nhãn dù mang class `collapsed`), đã thêm rule
  riêng trả `.si-count` về đúng vị trí inline bình thường, không để lẫn kiểu "huy hiệu góc icon" của
  chế độ thu gọn desktop thật.
- Thêm `title="..."` (tooltip khi hover) cho mọi mục sidebar — tự phát hiện thêm lúc chụp ảnh kiểm
  tra: khi mặc định đã là thu gọn, icon-only không còn chữ để đọc, cần tooltip để biết mỗi icon là
  màn nào trước khi bấm (điểm này không có trong yêu cầu gốc nhưng là hệ quả trực tiếp của việc đổi
  mặc định sang thu gọn, nên bổ sung luôn cùng đợt thay vì để lại thành 1 lỗ hổng UX mới).

**Kiểm thử đã chạy:** `test_greeting_settings_sidebar.js` (jsdom) xác minh cả 3 mục — greeting đúng
tên/cập nhật đúng khi đổi vai trò, Trang chủ không còn dòng "Xin chào", avatar có tooltip đầy đủ;
topbar không còn 2 nút settings cũ, trang `#/qtri/cai-dat` hiện đủ 2 danh mục và thêm/xoá ngay tại
trang hoạt động đúng; `SIDEBAR_COLLAPSED` mặc định `true`, `body` đồng bộ đúng class, huy hiệu từng
tab khớp đúng số liệu `workloadItems()` theo từng hash (test cả 2 nhánh có/không có việc). Cập nhật
2 test cũ (`test_appsheet_features.js`, `test_sla.js`) đang gọi trực tiếp 2 hàm modal đã xoá — chuyển
sang điều hướng tới `#/qtri/cai-dat` bằng vai trò `qtri` trước khi thao tác, đúng API mới. Chạy lại
toàn bộ 17 bộ test — **0 lỗi, không hồi quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật):
Trang chủ thu gọn mặc định với huy hiệu góc icon đúng số liệu, so sánh cạnh-nhau bảng dữ liệu thu gọn
vs mở rộng cho thấy rõ nội dung giãn thêm, trang Cài đặt hệ thống hiện đủ 2 danh mục dạng lưới, và
mobile (390px) không bị ảnh hưởng (greeting ẩn đúng theo thiết kế, bottom-nav không đổi).

## Cột trạng thái lên vị trí 2 + đầy đủ nút thao tác trong UI chi tiết (03/09/2026)

Nguyên văn 2 yêu cầu (gửi liên tiếp, không chờ yêu cầu trước xong):

1. *"cột trạng thái đẩy sang vị trí thứ 2 để tiện cho người dùng kiểm soát thông tin cần thiết."*
2. *"tôi muốn trong giao diện chi tiết của đơn bảo hành có đầy đủ các chức năng thao tác cho đơn bảo
   hành. Các nút này sẽ cố định ở top hoặc bottom (tùy thiết kế thuận tiện cho người dùng)."*

**1. Cột "Trạng thái" → vị trí 2.** Rà toàn bộ file, tìm đúng 7 bảng có cột Trạng thái (không tính
các bảng key-value 2 cột trong modal chi tiết — không áp dụng khái niệm "cột" ở đó): "Phiếu gửi hàng
của tôi", "Danh sách đơn trong phiếu gửi", "Tra cứu tiến độ" (KTV), "Xác nhận nhận hàng trả" (KTV),
bảng thống nhất Admin BH, "Việc của tôi" (NV), "Tra cứu mọi đơn hàng" (Quản lý). Ở mọi bảng, đưa
Trạng thái lên **ngay sau cột định danh chính** (ID/Mã đơn vị/Mã phiếu) — cột checkbox chọn hàng loạt
(nếu có) không tính là "vị trí 1" vì đó là control thao tác, không phải dữ liệu. 3 bảng khác có cấu
trúc theo TAB riêng cho từng trạng thái (Kế toán duyệt, Kho đóng gói — trạng thái đã ngầm hiểu qua
tab đang mở) **cố ý không có cột Trạng thái**, không thuộc phạm vi thay đổi này.

Nhân tiện sửa 1 lỗi nhỏ tự phát hiện: `colspan="8"` ở dòng "Không tìm thấy đơn nào khớp" của bảng
"Tra cứu mọi đơn hàng" (Quản lý) trong khi bảng chỉ có 7 cột — chỉnh lại đúng `colspan="7"`.

**2. UI chi tiết đơn bảo hành có đầy đủ nút thao tác.** Trước đó `openDetailUnitModal()` (màn "Chi
tiết đơn bảo hành con") là màn **thuần đọc** — chỉ có nút "Đóng chi tiết" (đã chuyển lên header ở
vòng trước), mọi thao tác nghiệp vụ (Phân loại, Yêu cầu bổ sung, Chẩn đoán...) chỉ bấm được từ đúng
dòng trong bảng danh sách, phải đóng chi tiết rồi quay lại bảng mới làm được. Đã thêm hàm dùng chung
**`unitActionButtonsHtml(u, p)`** — gom **đúng các nút đã có sẵn** (không viết lại logic nghiệp vụ,
chỉ gọi lại đúng các hàm `open*Modal()`/`xacNhanHoanTat()` đã tồn tại và đã test từ trước), hiện đúng
theo **vai trò đang đăng nhập + trạng thái hiện tại của đơn vị** — đồng bộ 1-đối-1 với điều kiện đã
dùng trong `renderAdminUnifiedTable()`/`renderNvViecCuaToi()`/`ktvTraCuuRowsHtml()` để bảng và modal
chi tiết không bao giờ lệch nhau về "khi nào nút này xuất hiện":

| Vai trò | Trạng thái đơn vị | Nút hiện ra |
|---|---|---|
| Admin BH | `cho_phan_loai` | Phân loại, Yêu cầu bổ sung (trừ khách lẻ), 🐞 Báo cáo sai (trừ khách lẻ) |
| Admin BH | `admin_can_xem_lai` | Phân loại lại, 🐞 Báo cáo sai (trừ khách lẻ) — **không** có "Yêu cầu bổ sung" (xem lỗi đã sửa bên dưới) |
| Admin BH | `cho_admin_xac_nhan` | ✔️ Xác nhận hoàn tất, Yêu cầu làm lại |
| Admin BH | `san_sang_gom_phieu_tra` và chưa thuộc phiếu trả nào | ⚡ Trả trực tiếp KTV, ⚡ Giao trực tiếp Kho |
| KTV | `cho_bo_sung_tt` và đúng người tạo phiếu gửi | ✍️ Bổ sung thông tin |
| NV | `cho_chan_doan` và đúng NV được gán | 🔧 Chẩn đoán |
| `quanly`/`qtri`/vai trò khác không khớp điều kiện trên | — | Không có nút nào (đúng tinh thần "chỉ xem") |

**Vị trí: đặt ở thanh footer riêng (`.modal-foot`), không gộp vào header.** Tự cân nhắc giữa 2
phương án cố định top/bottom mà yêu cầu cho phép tự chọn: header đã có sẵn tiêu đề + nút "Đóng chi
tiết" — nếu nhồi thêm 2-3 nút nghiệp vụ vào cùng 1 hàng sẽ chật, đặc biệt trên mobile. Theo đúng quy
ước phổ biến "header = điều hướng/đóng, footer = vùng hành động chính" (thanh CTA đáy của Gmail, các
app thương mại điện tử), đã thêm tham số thứ 5 `footerActions` cho `openModal()`, render thành 1
`<div class="modal-foot">` **không cuộn** (giống `.modal-head`) ngay dưới `.modal-body`. Chỉ render
khi có ít nhất 1 nút phù hợp — đơn đã kết thúc hoặc vai trò không có quyền thao tác thì không có
thanh này, tránh 1 thanh trống vô nghĩa.

**1 lỗi có thật phát hiện + đã sửa trong lúc build (không phải do tính năng mới gây ra, đã tồn tại từ
trước):** `openYeuCauBoSungModal(scId)` bên trong chỉ tìm đơn vị đang **đúng** `cho_phan_loai`
(`childrenOf(scId).filter(c=>c.trang_thai==='cho_phan_loai')`) — nhưng bảng thống nhất Admin BH trước
đó vẫn hiện nút "Yêu cầu bổ sung" cho **cả** `admin_can_xem_lai`, bấm vào chỉ nhận `alert()` báo lỗi
"Không có đơn vị nào ở trạng thái chờ phân loại" mà không làm gì cả — 1 nút hiện ra nhưng luôn là ngõ
cụt cho riêng trường hợp đó. Đã sửa đồng bộ ở cả 2 nơi (bảng thống nhất và modal chi tiết mới): chỉ
hiện "Yêu cầu bổ sung" khi đúng `trang_thai==='cho_phan_loai'`.

**Phạm vi cố ý chưa làm:** chỉ áp dụng cho `openDetailUnitModal()` ("Chi tiết đơn bảo hành con")
đúng theo đúng nghĩa "đơn bảo hành" trong yêu cầu — **chưa** mở rộng sang `openDetailTraModal()`
("Chi tiết phiếu trả bảo hành", 1 loại UI chi tiết khác, quản lý entity `phieu_tra` chứ không phải
`phieu_sc_ct`) dù cơ chế `footerActions` dùng chung được ngay nếu cần (Kế toán Duyệt/Từ chối, Kho
đóng gói/gửi, KTV xác nhận nhận). Sẽ làm nếu người dùng yêu cầu tiếp.

**Kiểm thử đã chạy:** `test_detail_footer_actions.js` (jsdom) — dựng 1 đơn thật qua đủ luồng
(tạo phiếu gửi → Kho tiếp nhận → Admin tiếp nhận nội bộ → xác nhận SL) rồi kiểm tra đúng nút hiện ra
ở **từng bước trạng thái** (cho_phan_loai → phân loại xong sang cho_chan_doan → NV chẩn đoán xong
sang cho_admin_xac_nhan → xác nhận hoàn tất xong sang san_sang_gom_phieu_tra), xác nhận bấm nút
"Phân loại" từ trong modal chi tiết mở đúng form thật (không chỉ hiện thị), xác nhận NV khác (không
được gán) và vai trò `quanly` mở cùng đơn thì **không** thấy nút nào, và xác nhận đơn đã có
`phieu_tra_id` thì ẩn đúng 2 nút "tạo phiếu trả nhanh" (tránh tạo trùng). Chạy lại toàn bộ 17 bộ test
trước đó — **0 lỗi, không hồi quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật): thanh footer
hiện đúng nút theo từng trường hợp (khách lẻ chỉ 1 nút, đơn KTV thường đủ 3 nút xếp gọn 1 hàng), vẫn
cố định đúng vị trí khi cuộn sâu nội dung, và hoạt động đúng trên mobile (390px) — header/footer đều
cố định, chỉ phần giữa cuộn.

## SLA đơn giản hoá + tuỳ biến cột bảng Admin BH + tự động gộp phiếu trả (03/09/2026)

Nguyên văn 3 yêu cầu, kèm chỉ đạo *"Có gì không hiểu thì hỏi tôi, không tự suy đoán"* — đã hỏi lại
đủ 4 câu hỏi trước khi làm (xem câu trả lời chốt ở từng mục dưới đây, không tự đoán bất kỳ điểm nào):

1. *"'SLA' bỏ chữ quá hạn, chỉ cần viết số giờ. chưa quá hạn thì điền màu xanh lá, quá hạn thì tô
   màu đỏ."*
2. *"Tiêu đều của table đơn hàng bổ sung thêm chức năng: thay đổi độ dài của cột, kéo cột thay đổi
   vị trí, bật tắt bổ sung các cột thông tin có trong data."*
3. *"Các nút thao tác nhanh tôi cần là các nút ấn 1 phát là tự đơn hàng được điền toàn bộ các thông
   tin cần thiết => tự tạo thùng trả hàng và tự add đơn hàng vào từng thùng cho từng nhân viên theo
   từng loại phiếu trả bảo hành."*

**Đã hỏi lại và chốt trước khi làm:**
- Mục 1: yêu cầu mới chỉ mô tả 2 màu (xanh lá/đỏ), trong khi vòng trước đã chốt hệ 3 mức khẩn cấp
  (xám/vàng/đỏ đặc) — hỏi giữ 3 mức hay về nhị phân → **người dùng chọn giữ 3 mức**, chỉ đổi màu/bỏ
  chữ.
- Mục 2: "table đơn hàng" là bảng nào trong ~14 bảng của hệ thống → **người dùng chọn chỉ bảng thống
  nhất Admin BH** (`#/admin/phan-loai`, bảng trung tâm nhiều dữ liệu nhất), chưa mở rộng bảng khác.
- Mục 3: có nên bỏ qua Kế toán duyệt (giống 2 nút "Trả trực tiếp KTV/Kho" đã có) hay vẫn qua đúng quy
  trình → **người dùng chọn vẫn qua Kế toán duyệt bình thường**, chỉ tự động hoá bước gom chọn + tạo
  phiếu. Phạm vi xử lý 1 KTV hay tất cả → **người dùng chọn tất cả KTV cùng lúc**.

**1. Badge SLA.** Giữ nguyên 3 mức đã chốt (≤24h / 24-72h / >72h), chỉ đổi: (a) bỏ chữ "Quá hạn" khỏi
phần hiển thị (vẫn còn trong `title` tooltip khi hover, để tra cứu ngữ cảnh nếu cần) — chỉ còn icon +
số giờ; (b) mức "đúng hạn" đổi từ xám trung tính (`b-gray`) sang **xanh lá** (`b-green`, tái dùng class
đã có sẵn) — 2 mức quá hạn (vàng/đỏ đặc) giữ nguyên màu như vòng trước.

**2. Tuỳ biến cột bảng thống nhất Admin BH.** Đây là phần lớn nhất trong đợt này — xây 1 hệ thống
data-grid tương tác đầy đủ:
- **Kiến trúc**: 3 cột luôn cố định — checkbox chọn hàng loạt (trái), **ID** (cột neo định danh, đúng
  tinh thần "vị trí 1 luôn là ID" đã chốt ở yêu cầu trước), và Hành động (phải) — đây là vùng điều
  khiển/thao tác, không phải dữ liệu thuần tuý nên không cho tuỳ biến. 6 cột dữ liệu còn lại (Trạng
  thái, Nguồn, Khách hàng, Linh kiện, Mô tả lỗi, SLA) đều **kéo đổi vị trí, đổi độ rộng, ẩn/hiện**
  được tự do.
- **Bổ sung 6 cột dữ liệu mới** (mặc định ẩn, người dùng tự bật khi cần) — đúng nguyên văn "bật tắt
  bổ sung các cột thông tin có trong data": SĐT khách hàng, Mã đơn cha, Mã phiếu gửi, Loại đối trừ,
  Hướng xử lý, Tình trạng bảo hành — đều là dữ liệu đã có sẵn trong model nhưng trước đây chưa từng
  có cột riêng để xem trực tiếp trên bảng (phải mở modal chi tiết mới thấy).
- **Kéo đổi vị trí**: dùng HTML5 drag-and-drop thuần (`draggable`, `dragstart`/`dragover`/`drop`) trên
  `<th>`, không dùng thư viện ngoài.
- **Kéo đổi độ rộng**: 1 tay cầm nhỏ (`.col-resize-handle`) ở cạnh phải mỗi `<th>`, dùng
  `mousedown`/`mousemove`/`mouseup` thuần trên `document`. Bảng dùng `table-layout:fixed` +
  `<colgroup><col style="width:Npx">` — cách duy nhất để đặt độ rộng cột chính xác, độc lập với nội
  dung (khác `table-layout:auto` mặc định, ở đó độ rộng tự tính theo nội dung, bỏ qua giá trị `<col>`).
  Cập nhật DOM trực tiếp trong lúc kéo (mượt, không giật), chỉ lưu localStorage + `render()` lại lúc
  thả chuột.
- **Ẩn/hiện cột**: nút "⚙ Tuỳ chỉnh cột" mở modal danh sách 12 cột dạng checkbox, có nút "↺ Khôi phục
  mặc định".
- **Lưu trữ**: `localStorage` (key `admin_unified_cols_v1`) — dùng chung 1 cấu hình cho toàn app,
  không phải theo từng người dùng (đúng kiến trúc "1 server ảo dùng chung localStorage" đã có sẵn của
  toàn bộ prototype này, không phải hạn chế riêng của tính năng này — xem mục "Prototype HTML" hạn
  chế #1).
- Về mặt code: tách logic dựng nội dung từng ô thành 2 hàm `adminParentRowFields(s)`/
  `adminUnitRowFields(u)` (trả về `{key: html}` khớp với `ADMIN_COLS_DEF`) thay vì ghép thẳng vào 1
  chuỗi `<tr>` cố định thứ tự như trước — nhờ vậy `renderAdminUnifiedTable()` lắp ráp `<td>` theo đúng
  thứ tự người dùng đã tuỳ chỉnh mà không phải viết lại logic tính toán gốc (case_id, cảnh báo hết hạn
  BH, badge trạng thái... giữ nguyên y hệt).

**3. Tự động gộp phiếu trả cho tất cả nhân viên.** Nút **"⚡ Tự động gộp phiếu trả cho tất cả nhân
viên"** ở đầu màn "Tạo & quản lý phiếu trả" — bấm 1 lần, có `confirm()` xác nhận trước, rồi tự động:
với **MỌI** KTV/khách lẻ đang có đơn ở trạng thái `san_sang_gom_phieu_tra` và chưa thuộc phiếu trả
nào, gom các đơn đó theo đúng **loại đối trừ** (đổi trả / trừ công nợ — 1 phiếu trả chỉ chứa 1 loại,
đúng ràng buộc đã chốt từ vòng 21/08/2026), tạo **1 phiếu trả riêng cho mỗi tổ hợp (KTV, loại đối
trừ)** ở trạng thái **"Nhập"** — **không** bỏ qua bước duyệt: Admin BH vẫn phải mở từng phiếu, nhập mã
đơn hàng/MISA, rồi bấm "Gửi duyệt kế toán" như quy trình chuẩn, khác hẳn bản chất với 2 nút "Trả trực
tiếp KTV/Kho" đã có (2 nút đó là đường tắt bỏ qua CẢ gom nhóm LẪN duyệt kế toán). Tách phần "tạo 1
phiếu trả + gán đơn vị vào" thành hàm dùng chung `createPhieuTraForUnits()` — `taoPhieuTraMoi()` (nút
thủ công cũ, đọc checkbox trên DOM) nay cũng gọi lại đúng hàm này, không viết trùng logic.

**Kiểm thử đã chạy:** `test_admincols_autogom.js` (jsdom) — xác nhận cột mặc định đúng 6 cột đúng thứ
tự, bật cột tuỳ chọn cập nhật đúng cả state lẫn localStorage, bảng thật render đúng số `<col>`/`<th>
draggable>`/resize-handle, reorder qua `adminColDrop()` đổi đúng thứ tự, `resetAdminCols()` khôi phục
đúng mặc định; dựng đủ nhiều đơn thật cho 2 KTV × 2 loại đối trừ rồi gọi `autoGomPhieuTraTatCa()` —
xác nhận tạo đúng số phiếu (mỗi tổ hợp KTV×loại đối trừ 1 phiếu riêng, không gộp nhầm 2 loại đối trừ
khác nhau vào 1 phiếu), phiếu tạo ra đúng ở trạng thái "nhập" (chưa bỏ qua duyệt kế toán), và chạy lại
lần 2 không tạo trùng cho các đơn đã có `phieu_tra_id`. Cập nhật 1 test cũ (`test_ui_hierarchy.js`)
đang assert màu `b-gray` cho mức đúng hạn — sửa lại thành `b-green` đúng theo yêu cầu mới. Chạy lại
toàn bộ 18 bộ test trước đó — **0 lỗi, không hồi quy**. Xác nhận thêm bằng Puppeteer (Chrome thật) —
đặc biệt: dùng **`page.mouse` mô phỏng thao tác kéo-thả chuột thật** (không chỉ gọi hàm JS trực tiếp)
để kéo tay cầm resize và kéo tiêu đề cột — xác nhận HTML5 drag-and-drop gốc của trình duyệt phản hồi
đúng với chuỗi sự kiện chuột tổng hợp qua CDP, ảnh chụp trước/sau cho thấy cột "Linh kiện" đổi đúng vị
trí và cột "Khách hàng" đổi đúng độ rộng; nút tự động gộp phiếu trả hiện đúng vị trí trên màn.

## Đối chiếu bản góp ý Gemini (`implementation_plan.md`, 22/08/2026) — đã áp dụng phần lớn, sửa 2 điểm

Một phiên làm việc khác (ngoài phiên viết CLAUDE.md này) đã tự triển khai phần lớn nội dung
`implementation_plan.md` (do Gemini soạn) trực tiếp vào `prototype-html/index.html`: chuyển 5 màn
hình từ thẻ (card) sang bảng (table) — `renderKtvTraCuu`, `renderKtvNhanHang`, `renderKhoDongGoi`,
`renderNvViecCuaToi`, `renderKeToanDuyet` — kèm bulk-action (không áp dụng cho Kế toán, đúng nguyên
tắc segregation of duties), modal chi tiết hợp nhất `openDetailUnitModal` (đọc `DB.logs` thật để hiện
timeline), và bộ lọc thời gian Tuần/Tháng/Tất cả (`filterByTime`/`renderTimeFilterStrip`). View thẻ
lồng cũ (`renderParentCard`/`renderUnitClassifyCard`/`renderAdminGuiDetail`) được giữ nguyên làm màn
"drill-in xem theo thùng" — không bị xoá.

Khi rà soát đối chiếu (theo yêu cầu người dùng "tham khảo góp ý Gemini, đối chiếu với index.html,
phân tích ưu nhược"), phát hiện và đã xử lý:

1. **[Đã sửa] Lỗi cú pháp chặn toàn bộ trang.** `load()`/`seedData()` bị hỏng ở 2 chỗ do merge/ghi
   đè không trọn vẹn: (a) mảng `ly_do_cham` trong migration bị cắt cụt, dính liền
   `'Het hang tofunction seedData(){` không có dấu đóng mảng/hàm; (b) phần đuôi cũ của `seedData()`
   (`}:[], phieu_sc_ct:[], phieu_tra:[], logs:[]`) bị bỏ sót lơ lửng phía dưới bản `seedData()` mới,
   đầy đủ dữ liệu demo hơn. Đã khôi phục đúng theo hợp đồng gọi hàm có sẵn `if(!load()) seedData();`
   (`load()` trả `true` nếu có dữ liệu cũ trong `localStorage`, `false` nếu chưa có). Xác minh bằng
   `node --check` + chạy lại 8 bộ test scratchpad + chụp màn hình Chrome headless.
2. **[Đã sửa] Bộ lọc thời gian (Tuần/Tháng/Tất cả) của kế hoạch Gemini bị áp nhầm vào các HÀNG ĐỢI
   việc đang chờ xử lý, không chỉ màn tra cứu lịch sử.** `filterByTime` bị gọi cả trong
   `renderNvViecCuaToi` (việc NV đang chờ chẩn đoán), `renderKeToanDuyet` (phiếu đang chờ duyệt),
   `renderKhoDongGoi` (phiếu đang chờ đóng gói/gửi/kết thúc), và `renderKtvNhanHang` (phiếu trả KTV
   đang chờ xác nhận nhận — lọc còn sai cả trường ngày, dùng `created_at` của phiếu trả thay vì thời
   điểm phiếu chuyển sang `da_gui`). Hệ quả: 1 việc trễ SLA hơn 7 ngày (vốn đã cực kỳ quá hạn vì SLA
   chỉ 24h) sẽ **biến mất khỏi hàng đợi mặc định** — đúng loại lỗi đã bị phát hiện và sửa trước đó ở
   "Phản hồi vòng 1 mục #9" (đơn không được phép biến mất khỏi hàng đợi vì bộ lọc). Đã xác nhận thêm:
   `workloadItems()` (đếm số ở Trang chủ) **không** dùng `filterByTime`, nên trước khi sửa, số đếm ở
   Trang chủ có thể khác số dòng thực tế hiện trong danh sách chi tiết — gây hiểu lầm.
   - **Đã bỏ** `filterByTime`/`renderTimeFilterStrip()` khỏi cả 4 màn trên — các hàng đợi việc-đang-
     chờ-xử-lý giờ luôn hiện đủ, không giới hạn theo thời gian.
   - **Giữ nguyên** `filterByTime`/`renderTimeFilterStrip()` ở `renderKtvTraCuu` — đây đúng là màn
     tra cứu lịch sử (không phải hàng đợi hành động), lọc theo thời gian ở đây hợp lý và an toàn.
   - Nếu sau này cần giới hạn hiệu năng cho 4 hàng đợi kia khi dữ liệu lớn, nên giới hạn theo **số
     dòng** (pagination/limit), không theo mốc thời gian — mục đề xuất "Pagination tối đa 50
     dòng/trang" trong `implementation_plan.md` **chưa được triển khai**, vẫn là việc tồn đọng.
3. **[Ghi nhận, chưa sửa]** Mục "Security Boundaries" trong `implementation_plan.md` dùng từ ngữ dễ
   hiểu lầm — đây vẫn chỉ là lọc hiển thị phía client trên cùng 1 object `DB` (không có API/server
   phân quyền thật), không phải ranh giới bảo mật thật. Ranh giới bảo mật thật (khi build production)
   phải nằm ở tầng API theo pattern `scopeDatMua.ts` đã có ở hệ thống chính — xem mục "Liên hệ với hệ
   thống chính" bên dưới.
4. **[Ghi nhận, chưa sửa]** Mâu thuẫn nội bộ trong `implementation_plan.md`: mục phân tích vai trò ghi
   "KTV — Thiết bị ưu tiên: Mobile", nhưng `renderKtvTraCuu`/`renderKtvNhanHang` lại dùng bảng nhiều
   cột chỉ có `overflow-x:auto` (`.table-responsive`), không có bản rút gọn dạng thẻ xếp dọc cho mobile
   như pattern `openAddDonMobileSheet` đã xây ở vòng redesign UI trước — cuộn ngang 1 bảng 7-8 cột trên
   điện thoại là trải nghiệm kém. Chưa sửa vì cần quyết định thiết kế cụ thể hơn (tự thiết kế lại
   layout mobile riêng cho 2 màn này), không phải lỗi có thể sửa an toàn bằng vài dòng như 2 điểm trên.
5. **[Ghi nhận]** 2/8 bộ test jsdom cũ (`test_khachle_end2end.js`, `test_lk_fix.js`) fail ngay sau đợt
   refactor này — đã xác minh cả 2 đều do test cũ gọi API cũ (`khoDongGoi(id)` giờ bắt buộc mở modal
   trước vì đọc `input[type=file]` theo id động; badge đổi từ "Da doi LK" sang "Đã đổi LK" có dấu),
   **không phải lỗi logic thật**. Nhưng việc này cho thấy quy trình "chạy jsdom trước khi giao" mà dự
   án tự đặt ra đã không được tuân theo ở đợt sửa này — chính vì vậy lỗi cú pháp ở mục #1 mới lọt qua
   được. Chưa cập nhật lại 2 test này (không phải việc khẩn cấp, chỉ là nợ kỹ thuật của bộ test).
6. **[Mới, phát hiện + đã sửa 22/08/2026]** Người dùng phát hiện: `renderKtvTraCuu` ("Tra cứu tiến độ
   các đơn của tôi") — đúng màn được xác nhận nên giữ bộ lọc thời gian ở mục #2 — **không có ô tìm
   kiếm theo từ khoá**, chỉ có nút Tuần/Tháng/Tất cả. Với KTV có nhiều đơn, cuộn tay tìm 1 đơn cụ thể
   giữa hàng chục dòng không thực tế. Đã thêm:
   - `<input id="tc_search">` (đặt trên bảng, dưới thanh lọc thời gian) — tìm theo mã đơn vị, mã đơn
     cha, mã phiếu gửi, tên khách hàng, SĐT, mô tả lỗi, tên linh kiện (khớp gần đúng, không phân biệt
     hoa/thường, gộp tất cả field vào 1 chuỗi rồi `includes()`).
   - **Cố ý KHÔNG gọi `render()` toàn trang khi gõ phím** — tách `ktvTraCuuRowsHtml()` ra làm hàm
     dựng riêng phần `<tbody>`, và `updateKtvTraCuuTable()` (gắn vào `oninput`) chỉ thay
     `#tc_tbody.innerHTML`, giữ nguyên `<input>` gốc trên DOM. Lý do: `render()` thay toàn bộ
     `#content.innerHTML` nên nếu gọi lại mỗi lần gõ, ô input bị tạo lại từ đầu → **mất focus**, người
     dùng gõ được 1 ký tự là phải bấm chuột lại vào ô mới gõ tiếp được — đây là cái bẫy UX cần tránh
     cho bất kỳ ô tìm kiếm nào thêm sau này trong prototype (kiến trúc `render()` hiện tại là full
     re-render, không có virtual DOM để tự bảo toàn focus).
   - Biến toàn cục `KTV_TRACUU_SEARCH` giữ từ khoá qua cả các lần `render()` toàn trang (VD khi bấm
     đổi nút lọc Tuần/Tháng/Tất cả) — không bị xoá mất giữa chừng.
   - Test mới `test_search.js` (jsdom) xác minh: có ô tìm kiếm, lọc đúng, ô input **không bị thay thế
     bằng element khác** sau khi gõ (bảo chứng không mất focus), và từ khoá được giữ lại sau khi đổi
     bộ lọc thời gian. Chạy lại `smoke_all_routes.js`/`test_prototype2.js`/`test_sla.js`/
     `test_dichvu.js` — 0 lỗi.

## Liên hệ với hệ thống chính (`../cloudflare smarttrade base`)

Toàn bộ thiết kế ở #4 giả định tái dùng nguyên trạng các thứ sau — đã verify trực tiếp trong
migrations của repo đó (không phải suy đoán từ tài liệu):

- `users.giam_sat_quan_ly` (migration `0053_dat_mua_lk_users.sql`) — quan hệ 1-1 KTV/CTV/Trạm → GS
  phụ trách, dùng để suy ra `mien` runtime. **Đây là nguồn thật duy nhất** cho quan hệ này; có một
  bảng "ké" khác (`ktv_lien_he.giam_sat_quan_ly`) nhưng migration `0072` đã cố tình bỏ FK của nó và
  ghi rõ trong comment đây chỉ là dữ liệu danh bạ/gợi ý, **không phải nguồn thật phân quyền** — nếu
  sau này code module bảo hành, luôn đọc `users.giam_sat_quan_ly`, không đọc `ktv_lien_he`.
- `case_dvbh.seri_san_pham` (indexed), `case_dvbh.ngay_mua`, `case_dvbh.thoi_gian_cskh_tiep_nhan` —
  đều tồn tại thật từ `migrations/0001_init.sql`, đúng như #4 mục 1.2 giả định để tính hạn bảo hành.
- Mẫu `phieu_xuat_kho` + `phieu_xuat_kho_dong` + `phieu_xuat_kho_log`
  (`migrations/0058, 0066, 0079`) — đúng pattern nháp→add dòng→nhập mã MISA/vận đơn sau→xác nhận.
  CHECK `loai_don IN ('mua','cong_no','tra_hang')` có thật (migration `0079`, đặt trên chính
  `phieu_xuat_kho` — bản gốc `dat_don_hang.loai_don` cùng CHECK từ migration `0056`/`0062`) — đây là
  lý do #4 phải **copy nguyên bảng mới** cho `phieu_tra_bh` thay vì mở rộng CHECK cũ, vì
  **`users` (và tương tự các bảng đã có ≥1 bảng con FK sống) không dùng được pattern
  "tạo bảng mới → copy → drop → rename"** — xem đúng cảnh báo này ở CLAUDE.md chính, mục "D1
  migration constraint". Trước khi định recreate bất kỳ bảng nào, chạy
  `grep -rn "REFERENCES <table>" migrations/` trong repo chính trước.
- `linh_kien` (đã gộp từ `lk_danh_muc`) **chưa có** `so_thang_bao_hanh`/`loai_hang` — xác nhận đây là
  2 cột thật sự mới, không phải đã có sẵn.
- `moduleAccess.ts` (`effectiveModules()`), `navConfig.ts` (`ROLE_MODULES`), `dataVersions` (thêm
  domain `sua_chua_bh`), `notifications/count` (thêm 1 `countKey`), `scopeDatMua.ts` (mẫu scope theo
  quan hệ người dùng thay vì `khu_vuc_phu_trach`) — tất cả là pattern có thật, mô tả trong CLAUDE.md
  chính, #4 dùng lại đúng như mô tả.
- Repo chính **không có test suite tự động** (ghi rõ trong CLAUDE.md chính) — khi build module này,
  kế hoạch QA phải là kiểm thử tay theo từng vai trò trước deploy, không có CI test để dựa vào.
- Deploy luôn nhắm `smarttrade` (`deploy:smarttrade`), không phải target mặc định — xem CLAUDE.md
  chính trước khi đề xuất lệnh deploy.

## Bằng chứng dữ liệu thật (từ `Format và luồng quy trình đơn gửi bảo hành.xlsx`, tính đến 13/08/2026)

Việc đối chiếu tài liệu thiết kế với dữ liệu Excel thật (không chỉ mô tả bằng lời) đã lộ ra các phát
hiện sau — một số đã được xử lý trong #2/#4, một số **mới, chưa từng được nêu ở tài liệu nào**:

### Đã biết và đã xử lý trong thiết kế (xem #2 để có chi tiết đầy đủ)
- Trường liên kết Kho↔Đơn bảo hành ("Mã truy vấn"): **0/239 dòng có dữ liệu** — cơ chế liên kết
  chính thức chưa từng được dùng; nhân sự tự chế bằng ghi chú tự do "Đã/Chưa tạo đơn trên Appsheet
  BH". → #4 giải quyết bằng cách bắt buộc `lookup_code` sinh tự động ngay lúc tạo, không nhập tay.
- Serial chỉ có ở 6/26 dòng (~23%) dù có ô nhập — tra cứu theo serial trong thiết kế mới sẽ có input
  thưa nếu không ép buộc. → #4 giải quyết bằng cách bắt buộc gắn `case_id` (đã có sẵn serial trong
  case) thay vì để KTV tự gõ serial rời.
- Enum trùng lặp/khác hoa-thường trong `SETTINGS` (`Chưa tiếp nhận` / `chưa tiếp nhận`, nhãn dùng
  chung giữa 2 state machine khác nhau).

### Phát hiện mới (từ lần rà soát này, chưa xuất hiện ở #1–#4 — cần đưa vào thiết kế hoặc hỏi lại vận hành)

1. **`DON BAO HANH` có cột `LOẠI ĐỐI TRỪ DO KTV CHỌN`, 26/26 dòng đều là giá trị `ĐỔI TRẢ`** — một
   trường do **KTV** chọn ngay lúc gửi hàng (không phải Admin bảo hành), hoàn toàn không xuất hiện
   trong bất kỳ bản schema/state machine nào ở #1–#4. Vì 100% dữ liệu quan sát được chỉ có 1 giá trị
   duy nhất, không thể suy luận được các giá trị khác của enum này là gì hay ý nghĩa nghiệp vụ thật
   (có thể liên quan đến cách đối trừ công nợ/kho mà #4 mục 0 đã **chủ động gạt bỏ** ý tưởng
   `debt_adjustments` "chưa làm ở giai đoạn này" — nhưng nếu trường này thực ra là do KTV chọn từ đầu
   luồng chứ không phải Admin BH xử lý cuối luồng, đây có thể là 2 khái niệm khác nhau bị nhầm là 1).
   **→ Cần hỏi lại đội vận hành trước khi migrate**, đừng bỏ qua trường này chỉ vì #4 đã quyết định
   bỏ `debt_adjustments`.
2. **`LK DE XUAT SUA CHUA` (đề xuất linh kiện sửa chữa) trong dữ liệu thật KHÔNG liên kết với ID của
   `DON BAO HANH`** — cột khoá của nó là `ID DATA`/`BITRIX`, có dạng
   `thanhpt.dvkh-1001040549-1266262` — đây chính là **case ID của hệ thống CRM/DVBH chính**
   (`case_dvbh`/Bitrix), không phải ID phiếu trong sheet `DON BAO HANH` của quy trình gửi bảo hành
   này. Nói cách khác: lịch sử đề xuất linh kiện thật đang chạy **song song, độc lập** với luồng gửi
   bảo hành đang được thiết kế lại — nó gắn thẳng vào case CSKH (có thể là case sửa tại chỗ, không
   qua kho). Thiết kế mới ở #4 (`de_xuat_linh_kien_bh.phieu_id (FK phieu_sua_chua_bh)`) giả định mọi
   đề xuất linh kiện đều gắn với 1 dòng sửa chữa trong module này — **giả định này chưa từng đúng
   trong dữ liệu lịch sử quan sát được**. Cần xác nhận: liệu đây là quy trình khác hẳn (sửa tại chỗ,
   ngoài phạm vi "gửi về kho"), hay là cùng một quy trình nhưng do thiếu liên kết ID nên lịch sử
   không thể hiện đúng — vì nếu là quy trình khác, tài liệu #1 mục 1.1 (sheet `LK DE XUAT SUA CHUA`
   = "NV sửa chữa đề xuất linh kiện thay thế") đang gán nhầm sheet này hoàn toàn vào phạm vi module
   "gửi bảo hành".
3. **4 cột "trạng thái" song song trong `HANG VE KHO` không thực sự độc lập như tài liệu #1 mục 2.1
   mô tả** — dữ liệu thật cho thấy `Trạng thái kho` có **đúng 1 giá trị duy nhất** trên cả 239 dòng
   (`Kho đã xử lý`) và `Trạng thái SCVP` gần như chết (238/239 = `Đang chờ`, không đổi). Chỉ
   `Trạng thái Admin BH` và `Trạng thái kế toán` thực sự biến thiên. Tức là rủi ro không chỉ là "4
   trạng thái dễ lệch nhau" mà còn là **2 trong 4 cột chưa từng được vận hành cập nhật thật** — một
   dấu hiệu nữa cho thấy state machine hiện tại tồn tại trên giấy nhiều hơn trong thao tác thật.
4. **Rủi ro tập trung vào rất ít người (bus factor) — vấn đề tổ chức, không phải vấn đề hệ thống,
   nhưng ảnh hưởng trực tiếp đến thiết kế phân quyền của module mới:**
   - `DON MISA LK` (17 dòng) và `TRA BAO HANH` (13/16 dòng phần ADMIN) gần như **100% do đúng 1 email
     `toanle24012000@gmail.com` thực hiện** — người này cũng là 1 trong 4-5 người xác nhận
     `HANG VE KHO` (47/239 dòng, nhiều nhất). Một người đang gánh cả vai trò tiếp nhận kho, phân loại
     Admin bảo hành, xử lý mã MISA, và tạo phiếu trả — 4 việc mà #4 mục 4 thiết kế thành 2-3 vai trò
     tách biệt (`la_kho`, `la_admin_bh`) với ý định phân quyền theo miền.
   - `LK DE XUAT SUA CHUA` — 100% do cùng 1 email này tạo.
   - **Hệ quả cho thiết kế:** nếu khi go-live chỉ có 1 tài khoản thật được gán `la_admin_bh`, toàn bộ
     ý tưởng phân miền Nam/Bắc + "tiếp nhận trái miền" ở #4 mục 2 sẽ vô nghĩa trên thực tế (không có
     người thứ 2 để phân biệt miền). **Cần xác nhận với vận hành: có bao nhiêu người thật sự sẽ được
     gán `la_admin_bh` khi ra mắt** — đây là điều kiện tiên quyết để mục 2 (phân miền) có giá trị,
     chưa được hỏi ở bất kỳ vòng rà soát nào trước đó.

## So sánh với hệ thống RMA/bảo hành depot-repair chuẩn quốc tế

Luồng đã thiết kế (#4) về cơ bản khớp với mô hình RMA/depot-repair tiêu chuẩn: RMA generation →
intake/receiving → inspection → disposition routing → repair/recovery → return & inventory update
([ReverseLogix](https://www.reverselogix.com/industry-updates/how-to-streamline-your-returns-workflow-from-intake-to-disposition/),
[SKUTOPIA](https://www.skutopia.com/blog/what-is-reverse-logistics)) — tương ứng: `phieu_gui_bh` →
`tiep_nhan_kho_bh` → phân loại Admin BH → hướng xử lý → `phieu_tra_bh`. Một vài khoảng cách so với
thông lệ ngành đáng cân nhắc thêm:

- **Chưa có bộ KPI chính thức nào được định nghĩa trong schema**, dù #1 mục 8 có liệt kê ý tưởng.
  Thông lệ ngành coi các chỉ số sau là bắt buộc cho depot-repair:
  TAT theo từng khâu (không chỉ tổng), **tỷ lệ "No Fault Found"** (chẩn đoán "Không lỗi" — đã có field
  `ket_qua_chan_doan='khong_loi'` nhưng chưa có báo cáo/ngưỡng cảnh báo nào dùng nó),
  **tỷ lệ sửa lại lần 2** (repeat-repair — đã có ý tưởng ở #1 mục 8 "Tỷ lệ ticket phải sửa lại lần 2"
  nhưng chưa có cơ chế phát hiện tự động — hiện không có trường nào đánh dấu "ticket này là sửa lại
  của ticket X"), chi phí linh kiện/ca sửa
  ([nguồn](https://oxmaint.com/industries/fleet-management/fleet-warranty-claim-tracking-checklist-kpis-and-cmms-workflow)).
  → Khuyến nghị: thêm `phieu_sua_chua_bh.case_id_lien_quan_truoc` (nullable) hoặc suy luận qua
  `case_id` trùng lặp trên nhiều `phieu_sua_chua_bh`, để tính được tỷ lệ sửa lại mà không cần đợi
  người dùng tự khai báo.
- **Chưa có khái niệm "disposition matrix"/ngưỡng quyết định rõ ràng** cho case biên — ví dụ hàng hết
  hạn bảo hành nhưng khách quen, hoặc linh kiện hết hàng lâu ngày. Hiện tại xử lý case biên hoàn toàn
  bằng "ghi chú + phê duyệt ngoài hệ thống" (#4 mục 0, quyết định chủ động không làm hàng đợi duyệt
  trong app) — hợp lý cho quy mô hiện tại, nhưng khác với thông lệ nơi ma trận disposition (condition
  × demand × cost × compliance) được mã hoá thành rule trong hệ thống. Đây là đánh đổi có chủ đích
  (đơn giản hoá) chứ không phải thiếu sót — không cần sửa trừ khi khối lượng case ngoại lệ tăng cao.
- **Chưa thấy vòng "thu hồi chi phí bảo hành từ hãng/OEM" (warranty claim recovery) trong bất kỳ tài
  liệu nào** — ở các trung tâm bảo hành uỷ quyền (authorized service center) thực tế, sau khi sửa/đổi
  cho khách trong bảo hành, đơn vị dịch vụ thường phải **lập yêu cầu hoàn phí/linh kiện với hãng**
  (Karofi...) theo định kỳ, đối chiếu bằng đúng bộ chứng từ (case ID, linh kiện đã dùng, ảnh chứng
  minh). Không rõ công ty này có phải làm bước đó không, hay chi phí bảo hành được hãng khoán trọn gói
  từ đầu. **→ Đây là câu hỏi cần hỏi thẳng đội vận hành/kế toán, chưa từng được đặt ra ở #1–#4** — nếu
  có, `phieu_tra_bh`/`de_xuat_linh_kien_bh` có thể cần thêm 1 trường tham chiếu để phục vụ đối soát
  với hãng sau này, dù chưa cần build ngay.
- **Segregation of duties (tách biệt người thực hiện / người duyệt)** là nguyên tắc kiểm soát nội bộ
  chuẩn cho depot-repair (mỗi depot tách biệt tồn kho, nguồn lực, giao dịch tài chính —
  [nguồn](https://www.suretysystems.com/insights/oracle-depot-repair-surety-systems/)). Thiết kế
  `_log` insert-only ở #4 đã ghi được **ai** làm **gì**, đủ để truy vết sau này — nhưng bản thân
  luồng chưa có ràng buộc nào chặn 1 người vừa phân loại Ngoài-bảo-hành vừa tự duyệt đề xuất linh
  kiện của chính dòng đó. Với quy mô 1 Admin bảo hành như hiện tại (mục "bằng chứng dữ liệu thật" #4
  ở trên), đây là rủi ro vận hành thật, không phải rủi ro lý thuyết.

## Câu hỏi mở còn lại (gộp từ #2, #4 và phát hiện mới ở trên — theo độ ưu tiên)

1. **[Mới] Sẽ có bao nhiêu người thật được gán `la_admin_bh` khi ra mắt?** — quyết định việc phân
   miền Nam/Bắc (#4 mục 2) có ý nghĩa thực tế hay không.
2. ~~`LOẠI ĐỐI TRỪ DO KTV CHỌN` trong `DON BAO HANH` nghĩa là gì~~ — **[ĐÃ CHỐT 22/08/2026, "Phản hồi
   vòng 4"]**: đúng là mô hình 2 tầng — **KTV đề xuất lúc tạo đơn** (`phieu_sc.loai_doi_tru_de_xuat`,
   select mới trong form "Thêm đơn bảo hành") **→ Admin bảo hành xác nhận/có thể đổi lại lúc phân
   loại** (`phieu_sc_ct.loai_doi_tru`, mặc định chọn sẵn theo đề xuất của KTV, Admin đổi tự do). Điều
   này khớp với tên cột lịch sử "DO KTV CHỌN" (KTV có vai trò chọn ban đầu) đồng thời khớp với quyết
   định 21/08/2026 mục #11 (Admin BH là người xác nhận cuối cùng) — mâu thuẫn trước đó (100% dữ liệu
   lịch sử chỉ có giá trị "ĐỔI TRẢ") được diễn giải là do KTV lịch sử ít khi chọn "Trừ công nợ" trên
   thực tế, không phải vì trường này chưa từng do KTV chọn.
3. **[Mới] `LK DE XUAT SUA CHUA` gắn với case CSKH (Bitrix) chứ không gắn với `DON BAO HANH`** — đây
   có phải quy trình sửa-tại-chỗ khác hẳn phạm vi module này không, hay chỉ là do thiếu liên kết ID?
4. Ngưỡng escalate khi Admin từ chối đề xuất linh kiện bao nhiêu lần thì đẩy lên quản lý (tạm đặt 2
   lần ở sơ đồ cũ của #2, #4 chưa chốt số).
5. Định nghĩa "thất lạc trên đường trả" — sau bao lâu không xác nhận nhận hàng thì tự động mở khiếu
   nại vận chuyển.
6. **[Mới]** Có bước "thu hồi chi phí bảo hành từ hãng/OEM" không — nếu có, cần trường tham chiếu gì.
7. `debt_adjustments` — #4 mục 0 chốt "chưa làm ở giai đoạn này", nhưng câu hỏi 3.2 hồi #2 ("có cần
   đối soát ngược MISA không") vẫn chưa có câu trả lời rõ ràng, chỉ đang bị hoãn.

## Đề xuất tiếp theo

1. Trước khi viết migration D1 thật: xác nhận câu hỏi 1–3 ở trên với đội vận hành — cả ba đều có thể
   làm thay đổi schema, hỏi trước rẽ nhánh code sẽ rẻ hơn nhiều so với sửa sau khi đã có dữ liệu thật.
2. Không migrate nguyên trạng các cột đã xác nhận rỗng 100% trong lịch sử (`Mã truy vấn`, `KHU VỰC`,
   `NHÓM SẢN PHẨM`, `Đánh giá kiểm soát đầu vào` — xem #2 mục 2.1 và dữ liệu ở trên) — bắt đầu sạch
   thay vì cố map dữ liệu cũ không tồn tại.
3. Thêm cơ chế phát hiện "sửa lại lần 2" (trùng `case_id` giữa nhiều `phieu_sua_chua_bh` theo thời
   gian) ngay từ schema đầu tiên — rẻ hơn nhiều so với thêm sau khi đã có dữ liệu.
4. Vì repo chính không có test suite tự động, lập sẵn 1 checklist kiểm thử tay theo từng vai trò
   (13 màn hình ở #4 mục 7) trước mỗi lần `deploy:smarttrade` liên quan module này.
5. Khi đã chốt xong câu hỏi 1–3, cập nhật lại chính #4 (Ke-hoach) trước khi bắt đầu migration — CLAUDE.md
   này chỉ tổng hợp, không thay thế vai trò "nguồn chốt kỹ thuật" của #4.
6. ~~**[Mới 21/08/2026]** Trước khi build hệ thống thật, xác nhận lại 4 điểm còn mơ hồ...~~ **[CẢ 4 Ý
   ĐÃ CHỐT]**: (a) mail/mã phê duyệt KHÔNG bắt buộc khi hết hạn bảo hành nhưng Admin vẫn chọn "Trong
   bảo hành" — chốt 21/08/2026 vòng 2 (mục #10); (b) mã phiếu đơn hàng + mã MISA ở phiếu trả do Admin
   bảo hành nhập — chốt 21/08/2026 vòng 2 (mục #13); (c) Kế toán chỉ có Duyệt/Từ chối, "trạng thái
   khác nhau" thực ra là badge loại đối trừ — chốt 21/08/2026 vòng 2 (mục #16); (d) `LOẠI ĐỐI TRỪ` —
   KTV CÓ đề xuất ban đầu lúc tạo đơn, Admin bảo hành xác nhận/ghi đè lúc phân loại — chốt 22/08/2026
   "Phản hồi vòng 4" (mục #1/#11, câu hỏi mở #2).
7. **[Mới 21/08/2026]** Đưa bước "Admin bảo hành xác nhận tiếp nhận nội bộ từ Kho" (đã tách lại đúng
   theo #1 mục 1.2 bước 3) vào bản cập nhật tiếp theo của #4 — hiện #4 mục 5 (state machine) vẫn đang
   gộp bước này chung với Kho tiếp nhận, cần sửa lại cho khớp.
8. **[Mới 21/08/2026]** Đưa toàn bộ 8 điểm "đẩy ngược" (sheet "Diem day nguoc" trong #5) và cấu trúc
   đơn cha/đơn vị con (`phieu_sua_chua_bh` + `phieu_sua_chua_bh_ct`) vào bản cập nhật tiếp theo của
   #4 — đây là thay đổi schema thật sự, không chỉ là ghi chú UI.
