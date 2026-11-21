# Nhật ký làm việc — App Gửi bảo hành linh kiện / Bảo hành đổi trả 3T

> Mỗi đợt làm việc 1 mục, **mới nhất ở trên**: ngày, phiên bản, yêu cầu, đã làm gì, kiểm thử gì, việc còn dở. Chỉ ghi thêm, không xoá mục cũ.
> Không ghi tài khoản, mật khẩu, khoá hay mô tả lỗ hổng bảo mật vào file này (repo có thể công khai).

## 21/11/2026 — v1.153: Giải trình có phân loại lỗi + bằng chứng

- Yêu cầu: "khi giải trình sẽ thêm lựa chọn: Sau khi giải trình bắt lỗi: lỗi nội bộ, lỗi đối tác, lỗi của tôi, khác. Bằng chứng của việc
  giải trình nếu không phải lỗi của bản thân".
- Đã làm: migration `0046` thêm `giai_trinh_bh.loai_loi` (noi_bo / doi_tac / ban_than / khac), `bang_chung`, `bang_chung_anh` (JSON link Drive).
  `POST /api/buoc/giai-trinh` bắt buộc `loai_loi` (`MISSING_LOAI_LOI`); khác `ban_than` mà không có mô tả lẫn ảnh → `REQUIRE_BANG_CHUNG`; ảnh qua
  `chuanHoaAnh` lên Google Drive trước khi ghi. Nhật ký ghi "[Lỗi đối tác] … | Bằng chứng: … (kèm N ảnh)". Hộp giải trình: 4 nút phân loại,
  khung "📎 Bằng chứng" (mô tả + chụp / chọn ảnh) khi không phải lỗi của mình, dòng nhắc thiếu gì; khối "📝 Giải trình" hiện nhãn phân loại +
  bằng chứng + ảnh thu nhỏ. Hộp giải trình bắt buộc (cổng `REQUIRE_GIAI_TRINH`) dùng chung nên cũng có.
- Kiểm thử: typecheck 0 lỗi; chạy local: thiếu phân loại / thiếu bằng chứng bị chặn, ảnh đi đường tải Drive, mô tả → ghi được, "Lỗi của tôi"
  không cần bằng chứng; giao diện ghi giải trình "Lỗi đối tác" + bằng chứng → hiện đúng ở khối Giải trình. Chưa thử tải ảnh lên Drive thật.
- Ghi nhận: migration 0046 đã được lệnh áp migration của phiên song song (deploy v1.152) áp luôn lên production lúc 10:03.
- Còn dở: báo cáo "Điểm nghẽn & trách nhiệm" chưa thống kê theo phân loại lỗi.

## 21/11/2026 — v1.152: Cảnh báo lần cấp LK chọn "Khác loại gợi ý" (+ linh-kien-app v1.547)

- Yêu cầu: "sẽ cho ktv chọn lại, nhưng trên app đổi trả và app linh kiện, sẽ hiện cảnh báo rất rõ ràng cho các đơn vị, bộ phận liên quan biết
  linh kiện này đang được chọn loại đề xuất khác với đề xuất thực tế phải chọn. (vì trong thực tế, sp hết bảo hành nhưng lk bên trong sp có thể
  vẫn còn bảo hành)".
- Đã làm: migration `0045` thêm `de_xuat_linh_kien_bh.lk_loai_goi_y` + `lk_loai_goi_y_ly_do`, đồng bộ từ `/suachua-partner/don-sc` (`donScLinhKien.ts`).
  `LoaiKhacGoiY` (`TruCongNo.tsx`) hiện chip đỏ ở Cấp linh kiện, Linh kiện của tôi, hộp xác nhận tiêu hao; khối giải thích ở chi tiết đơn BH.
  Việc tạo đơn trừ công nợ vẫn theo loại ĐANG CHỌN (`lk_loai`).
- Kiểm thử: typecheck 0 lỗi. Chưa bấm thử trên giao diện.

## 21/11/2026 — v1.151: Tạo đơn theo mã Lada (chung ô Mã yêu cầu) + tài liệu 5W1H (+ linh-kien-app v1.544)

- Yêu cầu: "Đặt đơn sửa chữa có cho phép tạo từ mã lada không? bổ sung thêm cột nhập mã lada và kéo API theo mã Lada về. nếu không tìm được
  báo không thấy và cảnh báo người dùng tự chịu trách nhiệm (mã lada sẽ không có ký tự SC ở đầu) - tốt nhất là gộp chung trong cùng 1 cột mã
  yc" + "tạo tài liệu html hướng dẫn riêng cho tính năng ưu tiên hiện thị theo mã ID đã đặt hàng và tìm đơn theo mã ID lada ... theo nguyên
  tắc 5W 1H".
- Đã làm: linh-kien-app `GET /api/suachua-partner/lada?id=` (dùng lại `lookupLada` + cache 10 phút, token chỉ nằm bên đó); `lk-theo-case`
  khớp thêm `dat_don_hang.ma_lada`. App này `lib/lada.ts` (`laMaLada` = 1 chữ + ≥5 số, `traLada`, `ladaSnapshot`); `kiemTraCase`: DVBH không
  thấy (hoặc lỗi) mà mã có dạng Lada → tra Lada: thấy → tạo được, lưu bằng chứng; không thấy / lỗi → chặn `LADA_NOT_FOUND` /
  `LADA_KHONG_PHAN_HOI` trừ khi gửi `xac_nhan_lada`. Migration 0044: `phieu_sua_chua_bh.loai_ma`, `lada_tim_thay`. `GET /case-lookup` trả
  `loai: "lada"` + `lada`; "Đồng bộ lại" bằng chứng cũng tra Lada. Giao diện: ô "Mã yêu cầu (case SC… hoặc mã Lada)", khung xanh thông tin
  Lada, khung đỏ + ô tích "tự chịu trách nhiệm"; nhãn "Mã Lada" / "Lada không thấy" ở bảng Admin, dòng ghi chú trong thùng, banner chi tiết đơn.
- Tài liệu `du an sua chua bao hanh/Huong-dan-Uu-tien-LK-va-Ma-Lada_21-11-2026.html` (5W1H, 6 ảnh chụp app chạy thử). Nguyên tắc 5W1H ghi vào
  CLAUDE.md chung (mọi dự án).
- Kiểm thử: typecheck 2 repo sạch; chạy local với Worker giả app Đặt LK: Lada thấy / không thấy (chặn rồi tích thì tạo) / lỗi / mã SC vẫn qua
  DVBH đều đúng, DB lưu `loai_ma` + bằng chứng + nhật ký. Chưa thử với hệ Lada thật (cần deploy linh-kien-app).

## 20/11/2026 — v1.150: Ưu tiên linh kiện đã đặt bên app Đặt LK khi chọn mã case (+ linh-kien-app v1.539)

- Yêu cầu: "khi họ chọn 1 mã ID => ưu tiên hiện top danh sách các mã họ đã đặt hàng bên linh kiện app liên quan đến mã ID đó - chỉ tính mã
  chưa bị hủy hoặc từ chối" (VD app LK đặt A, B, C theo SC123 → KTV gửi BH chọn SC123 → A, B, C lên đầu danh sách linh kiện).
- Đã làm: linh-kien-app `GET /api/suachua-partner/lk-theo-case?case_id=` (khớp `dat_don_hang.ma_yeu_cau_su_co` có index + `dat_don_case`, nhận
  SC / Sc / sc; bỏ đơn trả hàng + đơn 'TN tu choi' / 'Tu choi' / 'Da huy'; gom theo mã LK, cộng SL). App này `GET /api/case-lookup/lk-da-dat?id=`
  chuyển tiếp qua Service Binding `LINHKIEN_SERVICE`. Frontend `useLkDaDat` (trễ 400ms, nhớ theo case trong phiên) + `lkOptionsUuTien`: linh
  kiện đã đặt (có trong danh mục) lên đầu, nhãn "📦 Đã đặt ×SL", dòng nhắc dưới ô chọn. Áp ở: Thêm đơn (desktop + mobile, sau khi mã case
  kiểm tra hợp lệ), Sửa đơn thùng nháp, Tạo đơn dịch vụ / khách lẻ. Không tính theo người đặt (đơn đặt cho case nào cũng tính). Không có migration.
- Kiểm thử: typecheck 2 repo sạch; câu truy vấn chạy trên D1 linh-kien-app thật (case SC261012203 ra 6 linh kiện, 26 dòng đọc). Chưa bấm thử
  giao diện trên bản thật.

## 18/11/2026 — v1.148: Sửa lỗi đẩy tóm tắt theo ca

- Lần cron 11:45 sau deploy v1.147 lỗi "too many SQL variables": câu tính tóm tắt bind danh sách mã ca 2 lần (lô 90 → 180 tham số, D1 tối đa
  100). Giảm lô còn 45 mã ca.

## 18/11/2026 — v1.147: Đẩy tóm tắt gửi bảo hành THEO CA sang DVBH (migration 0043)

- Yêu cầu (bên DVBH, "Quản lý tồn" > Danh sách chi tiết): "Số lk thực tế đã gửi về (dựa theo api bảo hành đã tạo ở tất cả các trạng thái - trừ
  đơn bị từ chối, bị hủy)", "Trạng thái đổi trả BH: trạng thái của đơn gửi đổi trả thấp nhất ... + 1 cột diễn giải", "Tốc độ tồn đổi trả";
  "tận dụng tối đa các API đã có sẵn ... dữ liệu kéo về không dàn trải mỗi 1 báo cáo lại kéo 1 lần".
- Đã làm: `lib/tomTatCa.ts` — bước mới "Đẩy tóm tắt theo ca" trong cron 15 phút (`lib/odooSync.ts runOdooSync`), gửi kèm field `ca` trong
  `POST /api/partner/sync/sua-chua-trang-thai` SẴN CÓ của DVBH (không thêm API/luồng kéo). Mỗi ca: số LK (bỏ thùng huỷ / đơn vị huỷ-từ chối;
  đơn chưa tách = SL khai), số LK theo từng giai đoạn, giai đoạn thấp nhất, lần gửi xe cuối (`ngay_gui_xe`), cờ hoàn tất và thời gian xử lý
  lâu nhất (gửi xe → kết thúc) khi mọi LK đã xong. Chỉ gửi ca có thay đổi (hash trong `ca_tom_tat_sync`), chỉ xét đơn 120 ngày gần đây, ca đã
  xong hết không xét lại trừ khi có đơn mới. Màn Cài đặt hiện thêm số "tóm tắt ca" đã đẩy.
- Kiểm thử: typecheck sạch; chạy hàm tính trên D1 local (38 ca): giai đoạn thấp nhất / số LK đúng; endpoint DVBH local nhận + bỏ bản tin cũ.

## 18/11/2026 — v1.146: Cảnh báo thời gian tồn của thùng hàng

- Yêu cầu: "danh sách các thùng hàng, thêm cảnh báo thời gian tồn cho các vai trò xác định được thùng đang tồn bao lâu rồi mà kho chưa xử lý".
- Đã làm: `GET /api/kho/thung-ton?tt=da_gui|cho_admin` (Kho / Admin BH / qtri, theo miền) đếm 4 mức tồn + thùng lâu nhất; bộ lọc `?ton=` cho danh sách thùng Kho + Admin; xếp thùng cũ nhất lên đầu (trước là mới nhất lên đầu). Giao diện: thanh "⏱ Tồn" (bấm mức để lọc, bấm mã thùng lâu nhất để mở) ở Kho › Đang gửi về Kho, Kho › Chờ bàn giao, Admin › Thùng đang gửi về Kho / chờ tiếp nhận nội bộ; huy hiệu "Tồn x ngày y giờ" theo SLA bước (sửa: trước đây Kho dùng mốc 24h, bước 2 thực tế 48h); ô lọc "Thời gian tồn"; KTV: cột "Bước tiếp" ghi "Chờ Kho nhận · đã gửi x", đỏ khi quá SLA.
- Kiểm thử: typecheck sạch; local: 3 thùng chia đúng 3 mức, thứ tự cũ nhất trước, lọc từng mức đúng, KTV 403; giao diện thanh tồn + bấm "Trên 3 ngày" lọc đúng 1 thùng.

## 18/11/2026 — v1.145: Kho từ chối thùng chưa nhận được hàng + cảnh báo KTV

- Yêu cầu: "ở giai đoạn thùng hàng, KTV gửi hàng, kho có quyền từ chối vì có thể thùng đó chưa gửi về thực tế, hiện trong danh sách chờ làm rối thông tin của kho. Nếu kho từ chối sẽ đẩy cảnh báo nghiêm trọng về cho KTV để KTV nắm được thông tin".
- Đã làm: migration 0042 (`phieu_gui_bh.kho_tc_ly_do/boi/luc/lan`); `POST /api/kho/phieu-gui/:id/tu-choi` (Kho / Admin BH / qtri, đúng miền, lý do bắt buộc): thùng `da_gui` → `nhap`, dòng trao đổi + nhật ký, Web Push ngay cho KTV + người tạo hộ. Số việc `ktv_kho_tu_choi` (menu Gửi hàng, Trang chủ, thông báo 12h mục gấp). Nút "⛔ Chưa nhận được" ở Kho › Đang gửi về Kho (dòng + chi tiết thùng) và Admin "Thùng đang gửi về Kho"; hộp lý do có gợi ý. KTV: thẻ đỏ trên cùng Trang chủ, banner đỏ trong chi tiết thùng, cột "Bước tiếp". Kho thấy nhãn "Từng bị từ chối N lần".
- Kiểm thử: typecheck sạch; local 9/9 API (KTV bị 403, thiếu lý do 400, từ chối 2 lần 400, rời danh sách + số việc Kho giảm, KTV số việc = 1, thùng về nháp kèm lý do, thông báo 12h có mục, gửi lại yêu cầu giải trình bước 1). Giao diện: thẻ đỏ KTV (375px), banner chi tiết thùng, hộp từ chối của Kho → thùng rời danh sách.
- Còn dở: chưa báo huỷ sang khovan (thùng bên đó vẫn "chờ xử lý"); chưa thử push trên điện thoại thật.

## 17/11/2026 — Tạo bộ tài liệu tổng hợp

- Yêu cầu: "dựa theo nguyên tắc tạo 3 file bắt buộc, rà soát toàn bộ các repo và tạo 3 file rồi đẩy lên repo etx87".
- Tạo `nhat_ky_lam_viec.md` (file này), `TONG_HOP_LOGIC.md`, `SRS_tong_hop.md`.
- Phần "Lịch sử dựng lại từ Git" bên dưới sinh tự động từ commit (bỏ commit gộp nhánh + commit tự động Workflow Mây). Từ nay ghi tay mục mới ở trên.

## Lịch sử dựng lại từ Git (290 commit, 2026-09-02 → 2026-11-17)

### 2026-11-17
- docs: ghi nhan deploy v1.144 (`3ade3fa`)
- v1.144: Dien giai MISA phieu tra lay ten KTV gan nhat theo ma (doi ten tram Odoo lam 39/200 ma co nhieu ten) (`743bc7b`)

### 2026-11-16
- docs: ghi nhan deploy v1.143 (`c0eaad4`)
- v1.143: HO TRO SUA CHUA 0 DONG van xac nhan xac (khong tru cong no), gui kem loai de xuat khi tao don cap LK (khong phu thuoc tra nguoc), hop de xuat ghi dung loai, tai lieu huong dan cap LK sua chua / duyet xac / tra xac / tru cong no (`21f8636`)
- docs: ghi nhan deploy v1.142 (`60db4fe`)
- v1.142: Hang + Doi tac don BH (danh muc doi tac, lay tu CRM, bat buoc khi giao NV sua chua), loai cap linh kien theo doi tac/bao hanh, chi CONG NO SUA CHUA xac nhan tieu hao, sua/huy xac nhan tieu hao truoc khi KT chot, vai tro Tra xac theo doi tac (`6918b97`)
- docs: ghi nhan deploy v1.141 (`24d935c`)
- v1.141: Chan tao trung don cung ma case + cung linh kien (tru don cu bi tu choi / huy) - canh bao do tren form them don, ap ca don tu Odoo va sua don (`2acd87c`)
- docs: ghi nhan deploy v1.140 (`2603371`)
- v1.140: NV bat buoc xac nhan Da nhan linh kien truoc khi dong don sua chua (dong don chua xac nhan -> canh bao, tu xac nhan da nhan du), Cap LK tach tab NV dang giu / Cho Admin xac nhan (don sua xong), so viec chi dem don sua xong (`35bacfb`)
- docs: ghi nhan deploy v1.139 (`819db88`)
- v1.139: Tru cong no sua chua cho NV - Admin BH xac nhan tieu hao tung lan cap (dung / tra kho / xac), tu tao don TRU CONG NO - SUA CHUA + TRA HANG CONG NO - SUA CHUA ben app Dat LK, man Linh kien cua toi, dung thao tac KT cap linh kien o app doi tra (migration 0040) (`b351a5c`)
- docs: phan tich luong tru cong no sua chua cho NV sua chua (chua sua code) (`9f18477`)
- docs: ghi nhan deploy v1.138 (`ed7559b`)
- v1.138: Import ket qua xac hang loat bang Excel (file mau 3 sheet Nhap lieu / Huong dan / Thung dang mo, xem truoc + ap dung) + nut Tai Excel theo bo loc o Don BH, Tra xac, Cap linh kien (`77d480a`)
- docs: ghi nhan deploy v1.137 (`2bba183`)
- v1.137: Tra xac - them xac linh kien sau sua chua (de xuat cap LK da xuat), nut hang loat Xac da tieu huy / That lac / Khong co xac, loc ngay xu ly tu-den, nhom theo ma SC, o tim gon (migration 0039) (`194dc1d`)
- docs: ghi nhan deploy v1.136 (`54c1e29`)
- v1.136: Tra xac - 3 che do xem Danh sach / Theo KTV / Theo linh kien (chon ca nhom de tao thung) + loc kieu Excel (LK A/B/C, KTV, mien, case, mo ta, thoi gian, sap xep) (`cc811b7`)
- v1.135: nang so phien ban (trung so v1.134 voi phien song song) + ghi nhan CLAUDE.md (`4502a27`)
- v1.134: sua index dem 'Don cua toi' (615k -> 2,2k rows/lan), tu dong xac nhan phieu tra KTV sau 14 ngay + dong phieu AppSheet, bo bat buoc giai trinh khi KTV bam Da nhan, 'Buoc dang dung' mac dinh an - chi tai khi mo (`daa72a2`)
- docs: ghi nhan deploy v1.134 (`8cda335`)
- v1.134: Don bao hanh - loc kieu Excel cho moi tab (ca che do Theo KTV / Theo linh kien), thanh loc cu an sau 'Bo loc nhanh', them 3 tab Don xong trong ngay / Don xong / Don huy-tu choi (khong dem, 20 dong/trang) (`9ce2aac`)
- v1.133: Cap linh kien sua chua chuyen han sang app Dat linh kien - de xuat moi tao ngay don CONG NO SUA CHUA ben do qua API, sua LK/SL va huy khi Ke toan chua xu ly, dong bo trang thai 2 chieu (ca don dat ben linh-kien-app), dong luong cap cu cho don moi (migration 0038) (`8271fb1`)
- v1.132: API goi y don bao hanh tra them ten san pham + ten khach (tu bang chung case / danh ba khach hang) (`6f39b86`)
- docs: ghi nhan deploy v1.131 (`af15873`)
- feat: API goi y don bao hanh cho linh-kien-app (CONG NO SUA CHUA) - GET /api/partner/sync/don-vi-sua-chua (v1.131) (`26b961d`)

### 2026-11-15
- docs: ghi nhan deploy v1.130 (`692ee24`)
- feat: quan tri theo buoc vong 2 - loc buoc dang dung moi danh sach, ly do cham theo buoc, bat buoc giai trinh buoc KTV, tam dung/gia han dong ho (v1.130) (`e89bea8`)
- docs: ghi nhan deploy v1.129 (`a29beab`)
- feat: thong bao tong hop 12h theo vai tro (Web Push + chuong) + bao cao Diem nghen & trach nhiem (v1.129) (`72212e6`)
- docs: ghi nhan deploy v1.128 (`5c2098d`)
- feat: quan tri theo buoc - 11 buoc co SLA rieng, giai trinh theo trach nhiem (KTV/TNGS/BO), loc buoc dang dung, tai lieu HTML (v1.128) (`72ed4a5`)

### 2026-11-14
- docs: ghi nhan deploy v1.127 (`fcbaef3`)
- feat: gom giai doan don BH thanh 9 nhom theo luong, bang Moi giai doan loc kieu Excel + tai Excel (v1.127) (`56ed840`)
- perf(d1): menu KTV / loc giai doan loc truoc bang index, o loc cot 1 cau json_group_array, menu KTV dung tu tai khi tab an; kem bang kieu Excel + kiemTraCase da chay tu v1.125 (v1.126) (`206876f`)

### 2026-11-13
- docs: ghi nhan deploy v1.125 (`5f468f0`)
- feat: giao dien Tao don thu cong 95% man hinh, 2 cot, chon KTV / khach bang danh sach (v1.125) (`e706916`)
- docs: ghi nhan deploy v1.124 (`a85745a`)
- feat: tao don thu cong - tao ho KTV hoac khach le / NPP + danh ba khach hang (v1.124) (`244121c`)
- docs: ghi nhan deploy v1.123 (`4e6fbe9`)
- feat: bao cao BO dem ca NV sua xong ben AppSheet vao cot Tu AppSheet (v1.123) (`79de827`)
- docs: ghi nhan deploy v1.122 (`c9bc81e`)
- feat: Admin BH tu choi tiep nhan thung - Kho / KTV phan hoi, 7 ngay tu huy, rut lai (v1.122) (`743cb01`)
- docs: ghi nhan deploy v1.121 (`8923433`)
- feat: ten hien thi uu tien ma CRM danh ba KTV > ETX > Admin khai bao (v1.121) (`163b6c9`)
- docs: ghi nhan deploy v1.120 (`88faec2`)
- feat: bao cao BO tu tinh 1 lan / ngay, luu sync_state + nut Tinh lai (v1.120) (`8964b02`)
- docs: ghi nhan deploy v1.119 (`1fa06ca`)
- chore: tang phien ban v1.119 (bao cao BO bang chung, trung so voi v1.118 tra xac) (`6d4709f`)
- feat: bao cao BO 1 bang chung, gop theo phong ban / tach theo nhan vien (v1.118) (`95e19ed`)
- docs: ghi nhan deploy v1.118 (`eaf6fe6`)
- feat: module tra xac linh kien - thung tra xac cho nha may, ma EO, Ke toan duyet (v1.118) (`c878dcf`)
- docs: ghi nhan deploy v1.117 (`be491e5`)
- fix: bao cao BO tinh viec sua chua cho NV duoc giao (v1.117) (`ed37cf6`)
- docs: ghi nhan deploy v1.116 (`a0a19c0`)
- fix: menu 2 (danh sach KTV) chi hien o man xu ly danh sach don (v1.116) (`104d4dd`)
- docs: ghi nhan deploy v1.115 (`6600e17`)
- feat: bao cao ket qua lam viec BO theo thang (v1.115) (`4eebe6d`)

### 2026-11-12
- docs: ghi nhan chuyen xong anh cu sang Google Drive, D1 con 29.9 MB (`7cf4d47`)
- feat: anh luu tren Google Drive (qua linh-kien-app), chuyen dan anh cu khoi D1 (v1.114) (`a248b86`)
- docs: ghi nhan deploy v1.113 (`4e4e198`)
- feat: Don cua toi tach tab Huy / tu choi khoi Da xong (v1.113) (`7543a2d`)
- feat: day phieu cap linh kien sang linh-kien-app thanh don SUA CHUA TAI KHO chi xem (v1.112) (`d4e1f23`)
- docs: ghi nhan deploy v1.111 (`7bd55db`)
- feat: GS bo sung thong tin thay KTV khi don cho KTV bo sung (v1.111) (`ced3267`)

### 2026-11-11
- docs: ghi nhan deploy v1.110 (`5011797`)
- fix: gui don co anh khong chan 60s, hien % tai anh len, nen anh nho hon (v1.110) (`abff87d`)
- docs: ghi nhan deploy v1.109 (`04a1375`)
- fix: phieu thung ma linh kien dai khong xuong dong (v1.109) (`42e472f`)
- docs: ghi nhan deploy v1.108 (`debcb83`)
- feat: tab Thung nhap cua KTV cho Admin / Kho / GS + nut tai PDF phieu thung (v1.108) (`2e63ffa`)
- docs: ghi nhan deploy v1.107 (`6eca146`)
- fix: phieu in thung giu nguyen bo cuc ban xem web (v1.107) (`bf6ad4f`)
- docs: ghi nhan deploy v1.106 (`fefe0cc`)
- fix: phieu in thung vo kho khi in / luu PDF (v1.106) (`4fd09b1`)
- docs: ghi nhan deploy v1.104 + v1.105 (`e035629`)
- feat: Ke toan sua / bo sung ma PXK cap linh kien khi Kho chua xu ly (v1.105) (`fbc93d1`)
- feat: in phieu danh sach don gui kem thung hang (v1.104) (`03d1660`)
- docs: ghi nhan deploy v1.103 (`b63270f`)
- feat: man Logic he thong cho vai tro BO (v1.103) (`0ea39a0`)
- docs: muc 12 logic van hanh & lich chay tu dong cho vai tro BO (`f5666c0`)
- docs: trang HTML mo ta luong quy trinh tong bao hanh doi tra (`c6ecba3`)
- docs: trang HTML mo ta luong cap linh kien bao hanh (`a756ca7`)
- docs: ghi nhan deploy v1.102 (`bf3da6b`)
- fix: xoa don co anh trong thung nhap bi INTERNAL_ERROR (v1.102) (`632b76f`)

### 2026-11-10
- docs: ghi nhan deploy v1.101 (`e38c317`)
- feat: NV nop ket qua - nut Da ban giao may (ket thuc luon) + sua o anh chong nhau (v1.101) (`aeb06b2`)
- docs: ghi nhan deploy v1.100 (`9a1adb5`)
- feat: Admin BH nop ket qua sua chua ho NV (v1.100) (`0e589d9`)

### 2026-11-09
- docs: ghi nhan deploy v1.099 (`14bc8c3`)
- feat: huy/tu choi don - ly do bat buoc ca nut Huy do khong co hang + ghi chu tuy chon (v1.099) (`51f6218`)

### 2026-11-08
- docs: ghi nhan deploy v1.098 (`da4ebc4`)
- fix: bam don trong thung/phieu tra mo long chuyen chi tiet sang don do (v1.098) (`995ed08`)
- docs: ghi nhan deploy v1.097 (`ab461e2`)
- feat: bam don trong phieu mo UI chi tiet (ca KTV) + tra DVBH chuan hoa ma case chu hoa (v1.097) (`524e4f8`)
- docs: ghi nhan deploy v1.096 (`31770ca`)
- fix: 'Them vao phieu' treo tren dien thoai - gioi han thoi gian doc anh/gui don/tra case DVBH, bao loi ro, mo lai nut (v1.096) (`0a72d06`)

### 2026-11-06
- feat: mo thang theo ID tren duong dan /DH-..(-n) /BH-.. /TR-.. (v1.095) (`9550388`)
- docs: ghi nhan deploy v1.094 (`2d1e8b0`)
- ui: ma case noi bat trong khoi Khach hang & case (v1.094) (`4a47617`)
- fix: Kho/Ke toan mo duoc chi tiet don + bao loi thay vi quay vo han (v1.093) (`4e42fba`)
- docs: ghi nhan deploy v1.092 (`339adec`)
- perf: Cap LK chi dem cac tab con viec (v1.092) (`6e8d2c4`)
- docs: ghi nhan deploy v1.091 (`8335875`)
- feat: Cap LK dem theo ca, Kho gom theo phieu PXK, ma case khong phan biet hoa/thuong (v1.091) (`ab3d8cd`)
- fix: case-timeline loc log phieu dung chung + luong quy trinh tung don vi (v1.090) (`975d293`)
- feat: API doi tac case-timeline cho dvbh (luong gui bao hanh cua 1 ca) (v1.089) (`389b62b`)

### 2026-11-05
- docs: ghi nhan deploy v1.088 (`c5fa8af`)
- fix: chuan hoa anh truoc khi tai + hien ly do khoa nut them don (v1.088) (`d33c184`)
- docs: ghi nhan deploy v1.087 (`893bb88`)
- fix: o anh tach Chup anh / Chon anh co san tren dien thoai (v1.087) (`a381e25`)
- docs: ghi nhan deploy v1.086 (`4fd8a07`)
- feat: menu KTV dem theo tab Cap linh kien + ma DH phieu tra mac dinh = ma phieu (v1.086) (`51f4f93`)
- docs: ghi nhan deploy v1.085 (`0a4fd68`)
- feat: menu KTV dem theo tab dang mo (v1.085) (`87824d0`)
- docs: ghi nhan deploy v1.084 (`a1c6bfa`)
- feat: Admin lui don cho xac nhan hoan tat ve buoc NV sua, bo de xuat tat (v1.084) (`12175e7`)
- docs: ghi nhan deploy v1.083 (`d868b9e`)
- feat: Admin BH de xuat linh kien khi don cho xac nhan hoan tat (v1.083) (`85f1561`)
- docs: ghi nhan deploy v1.082 (`a61ab40`)
- fix: Admin he thong thay nut thao tac trong UI chi tiet don (v1.082) (`5c59836`)
- docs: ghi nhan deploy v1.081 (`ab5dc21`)
- fix: KTV dang nhap lan dau tu phan mien ngay (v1.081) (`9689d2d`)
- docs: ghi nhan deploy v1.080 (`1b27f8a`)
- feat: tu phan mien tai khoan KTV theo khu vuc danh ba linh-kien-app (v1.080) (`919b747`)
- docs: ghi nhan deploy v1.079 (`2f220b1`)
- feat: man Nguoi dung hien ten theo danh ba KTV (ma) Ten (v1.079) (`4ee0b87`)
- docs: ghi nhan deploy v1.078 (`7f121b9`)
- fix: o Duyet / Mien man Nguoi dung khong bi co mat chu (v1.078) (`8e13c44`)
- docs: ghi nhan deploy v1.077 (`31bab8a`)
- fix: ghi chu ma KTV chung email + tang toc bo sung KTV trien khai (v1.077) (`3b13baf`)
- docs: ghi nhan deploy v1.076 (`0134d2e`)
- feat: KTV trien khai duoc tao don + KTV tao ho KTV khac (v1.076) (`997ae22`)

### 2026-11-04
- feat: dong bo tai khoan voi danh ba KTV / ETX, ten cong ty thay ten Google (v1.075) (`be71637`)
- feat: Kho thay menu Cap linh kien sua chua (v1.074) (`3c41eb4`)
- docs: ghi nhan deploy v1.073 (`da3cfaf`)
- feat: phieu cap linh kien - giai doan Kho cho in / da in / da xuat sau KT, Kho thay phieu cap LK (v1.073) (`213b1d4`)
- v1.072: TopBar - loi chao / ten dung ten tai khoan tren he thong (ETX nhan su > danh ba KTV > ten Google) thay vi ten Google (`e41a2eb`)
- docs: ghi nhan deploy v1.071 + linh-kien-app v1.437 (`9e6ce01`)
- feat: thieu hang bao hanh - ly do cham 'Khong co linh kien'/'Het hang ton kho' tu tao ticket ben linh-kien-app, trang thai bao nguoc ve don goc (v1.071) (`0936524`)
- docs: ghi nhan deploy v1.070 (`e6b137e`)
- feat: menu 2 danh sach KTV dang gui don, bam ten de loc (v1.070) (`2ab6123`)
- docs: ghi nhan deploy v1.069 (`101a52a`)
- feat: KT gom viec ve menu Phieu tra (cap linh kien theo case), Kho trang thai in phieu + tach 2 tab (v1.069) (`9c6ac62`)
- docs: bo sung 166 don AppSheet con sot (don bh fix 2) (`a3216e2`)

### 2026-11-03
- docs: ghi nhan deploy v1.068 (`fe1c978`)
- fix: KTV co nhieu ma trong danh ba bi bao nham Sai ma su vu (v1.068) (`7484152`)
- docs: sua 282 don AppSheet ma case NHAP MA THU CONG (`b9eb098`)
- docs: ghi nhan deploy v1.067 (`28a39c3`)
- feat: loc nguoi chi hien ten, case trong ngay chua dong bo DVBH van tao (chua xac minh), chon copy le ma yeu cau (v1.067) (`e6a936d`)
- docs: ghi nhan deploy v1.066 (`8480f41`)
- feat: lui lai don, KT tru cong no, KT xac nhan cap linh kien, SL don vi 1/N, ten theo ETX, doi LK B/C hang loat (v1.066) (`9241fc9`)

### 2026-11-02
- docs: ghi nhan deploy v1.065 (`95672f5`)
- feat: Don bao hanh xem nhom theo KTV / linh kien + SL dat, SL duyet, serial, ngay mua, ngay SX (v1.065) (`aad509b`)
- docs: ghi nhan deploy v1.064 (`07266ba`)
- feat: Ma yeu cau theo linh kien duoi Dien giai MISA trong chi tiet phieu tra (v1.064) (`891a4d3`)
- docs: ghi nhan deploy v1.063 (`5bdc209`)
- feat: Ke toan nhap / sua ma MISA phieu tra truoc khi Kho xu ly (v1.063) (`9799334`)
- docs: ghi nhan deploy v1.062 (`8d0e641`)
- feat: Kho / Admin BH nhan truc tiep thung nhap cua KTV, bo qua buoc gui (v1.062) (`c372319`)
- docs: ghi nhan deploy v1.061 (`6c71b0e`)
- feat: Dien giai MISA trong chi tiet phieu tra (ma kho MN 6803 / MB 6804, ten KTV theo CRM, danh sach MYC) (v1.061) (`8c8619b`)

### 2026-11-01
- docs: ghi nhan deploy v1.060 + linh-kien-app v1.432 (`995254b`)
- feat: GS phu dong bo tu linh-kien-app (khu vuc chon tren tai khoan GS), nguon khu_vuc_gs_bh, dong bo moi gio (v1.060) (`e65d4f0`)
- docs: ghi nhan deploy v1.059 (`a7b3e13`)
- feat: 1 khu vuc nhieu Giam sat cung phu trach - tich chon nhieu GS, GS chinh (v1.059) (`c7a84f2`)
- docs: ghi nhan deploy v1.058 (`66f6e76`)
- feat: nut File import Odoo chuyen sang man Phieu tra, mac dinh chi xuat don da xu ly xong (v1.058) (`bd962c8`)
- docs: ghi nhan deploy v1.057 (`b5c8c2e`)
- feat: danh gia lech linh kien A/B/C + chon khoang ngay cho bo loc thoi gian (v1.057) (`bcfebe5`)
- docs: ghi nhan deploy v1.056 (`a915e53`)
- feat: loc giai doan (co nhom da sua xong / dang gui KTV...) o tab Moi giai doan man Don bao hanh (v1.056) (`2a88b20`)
- docs: ghi nhan nhap lan cuoi du lieu AppSheet (01/11/2026) (`43b36a0`)

### 2026-10-31
- docs: ghi nhan deploy v1.055 (`1f89372`)
- feat: bam don trong thung nhap de sua linh kien A, so luong, mo ta loi, loai doi tru (v1.055) (`8ca95b8`)
- docs: ghi nhan deploy v1.054 (`67aea83`)
- feat: KTV mo thang phieu tra tu the don dang tra ve (nhieu lan tra cho chon), bao thieu theo tung mon, Kho danh gia that lac theo mon (v1.054) (`82cc416`)
- docs: ghi nhan deploy v1.053 (`1bbb246`)
- fix: 3 diem giao dien KTV - nut Kiem tra khong cat chu, form Bo sung gui kem anh, nhac kiem tra thong tin xe tu dien (v1.053) (`b4342f9`)
- docs: ghi nhan deploy v1.052 (`1ec4eef`)
- docs: tai lieu huong dan KTV hien truong co anh + kich ban quay video; fix: chi tiet thung hien dung giai doan don da tra (v1.052) (`acee82c`)
- docs: ghi nhan deploy v1.051 (`f9ddc6d`)
- feat: gop man hinh trung chuc nang thanh 4 man chung co tab theo giai doan - Thung hang / Don bao hanh / Phieu tra / Quan tri, link cu tu chuyen tiep (v1.051) (`60b2484`)
- docs: ghi nhan deploy v1.050 + phuong an gop man hinh trung chuc nang (`aa301e6`)
- feat: bo loc Canh bao / Thoi gian / LK A-B-C cho moi danh sach + tim khong dau theo case, ten khach, linh kien (v1.050) (`4f824b7`)
- docs: ghi nhan deploy v1.049 (`c6a5433`)
- fix: bo cuc dien thoai + may tinh - het tran ngang, the/bang gon, loc thu gon tren dien thoai, cot SLA bang Admin (v1.049) (`6361bb9`)

### 2026-10-30
- docs: ghi nhan deploy v1.048 (`a318a2c`)
- feat: giao dien mobile KTV - Viec cua toi, Don cua toi (gom don chua ve Kho), Gui hang 2 tab, nhan hang dang the, chon nhanh ma case (v1.048) (`eb6a777`)
- docs: ra soat giao dien mobile KTV hien truong (11 van de + phan bien + de xuat) (`33a22b1`)
- docs: ghi nhan deploy v1.047 (`e0a1301`)
- feat: bao khovan khi Admin BH tiep nhan, FAST ghi B=A, cong case mem khi DVBH loi, huy hieu "Lan N" (v1.047) (`da0ecfc`)

### 2026-10-29
- docs: ghi nhan deploy v1.046 (`3d7c035`)
- feat: 3 linh kien cua don - KTV chon (A) / thuc te gui ve (B, quan ly xac) / doi moi (C) (v1.046) (`f7b1225`)

### 2026-10-27
- feat: doi ten trang web thanh 'Bao hanh doi tra 3T' (v1.045) (`f4948a9`)

### 2026-10-21
- docs: ghi nhan deploy v1.044 (`fb8b12e`)
- feat: KTV chon mien kho nhan thung (gui khac khu vuc) (v1.044) (`6250e7d`)
- feat: keo khu vuc phu trach cua tai khoan nhan su tu linh-kien-app 1 lan/ngay + dong bo tay, tu suy mien (v1.043) (`85a2b99`)
- feat: tab Da xu ly cho Ke toan (phieu tung duyet/tu choi/day nguoc) (v1.042) (`5dbe2ac`)
- docs: ghi nhan deploy v1.041 (`0d68d17`)
- feat: tim kiem cho cac danh sach con sot (thung cho nhan noi bo, thung dang gui ve Kho, tab Odoo Da gui/Huy bo, Giam sat khu vuc) (v1.041) (`3dd921a`)
- feat: bam thung cho tiep nhan de mo xem ben trong va tiep nhan ngay trong chi tiet (v1.040) (`8d2eafd`)
- fix: loc phieu tra loi ambiguous column trang_thai (v1.039) (`4de1a2f`)
- feat: bo loc + tim kiem cho moi bang danh sach don/phieu, ghi chu khi NV bao ket qua sua chua (v1.038) (`4cf9b68`)
- feat: menu rieng KTV dang sua cho Admin BH (v1.037) (`a1b3129`)
- feat: Admin BH tao de xuat linh kien thay NV sua chua (v1.036) (`7ae6278`)
- docs: ghi nhan deploy v1.035 (`674c484`)
- feat: 10 yeu cau di tat luong - tim don Odoo, Admin tao ho/nhan ho Kho bo qua Kho, tu luu bang chung case dvbh, FAST doi moi mac dinh tra xac doi tac, MISA khong bat buoc, menu Phieu da gui ke toan, NV sua xong day thang sang Kho, tra cuu moi giai doan (v1.035) (`f9b8377`)

### 2026-10-19
- docs: ghi nhan deploy v1.034 (`824bae4`)
- feat: man len phieu tra - bang nhom theo KTV + tao nhieu phieu, sua phieu (them/bot don, doi linh kien) toi khi KT duyet, Kho/KT day nguoc, bo loc tim kiem (migration 0015, v1.034) (`7a93279`)
- docs: don 7 thung test khovan, xu ly xac tra doi tac, sua PAXL, nhap 82 de xuat linh kien AppSheet (khong doi code) (`27c274b`)
- docs: tai lieu huong dan Word co anh minh hoa cho vai tro KTV (khong doi code) (`3bfe9ab`)
- docs: xoa du lieu test production + nhap 656 don bao hanh that tu AppSheet (khong doi code) (`1ce1dce`)
- feat: file import Odoo mac dinh khoang ngay -3 .. +1 (v1.033) (`7533966`)

### 2026-10-16
- feat: bo loc danh sach nguoi dung (duyet / khoa / vai tro / mien / ETX), loc o server (v1.032) (`bef5377`)
- feat: tu duyet tai khoan co tren ETX nhan su, tu khoa khi nghi viec / tu mo khi di lam lai (danh ba ETX lay tu linh-kien-app), the dong bo ETX o Cai dat + nhan ETX o Nguoi dung (migration 0014, v1.031) (`b79afb1`)

### 2026-10-13
- docs: dieu tra dong bo khu vuc KTV tu linh-kien-app (nguon thieu khu_vuc_ma, khong phai loi dong bo) (`de11bc0`)

### 2026-10-12
- docs: ket qua bo sung ID import Odoo sau deploy v1.030 (`6a7b7fc`)
- fix: cron Odoo bo sung External ID (ma_import_odoo) cho don keo ve truoc 10/10 - hoi lai dvbh theo ?ids=, con tro rieng (v1.030) (`049c17d`)
- docs: ghi nhan da deploy v1.028-v1.029 len production (migration 0012 + 0013) (`3b93543`)
- feat: de xuat linh kien sua chua (NV xin cap = don con cua don bao hanh, Admin BH len MISA roi cap / tu choi, khong gioi han so lan, man Cap linh kien sua chua) + NV nop 4 ket qua (Da sua xong / Khong sua duoc / Khong co loi / Chi kiem tra tu van, cot moi ket_qua_nv) + Kho ghi phuong an xu ly khi gui that bai (migration 0013, v1.029) (`607af79`)
- feat: lam not de xuat ra soat Admin BH (o tim tu khoa, tiep nhan nhieu thung + sua ket ly do cham, xac nhan hoan tat hang loat, ten khach + badge Het BH tu bang chung case, cot so don) + Kho danh gia khieu nai khong nhan duoc hang (gui thanh cong / that bai - trang thai gui_that_bai) + ghi nhan so tien thu hoi tu hang (migration 0012, v1.028) (`fd08deb`)
- feat: giao truc tiep tu lay ten KTV, nho cach giao hang tren may, nut Luu nhap gui sau, canh bao don ton + thoi gian xu ly TB theo vai tro, lich su bao hanh theo Serial / ID case (v1.027) (`a17ca20`)

### 2026-10-11
- feat: danh muc linh kien tai xlsx / import thang BH + phan loai / sua phan loai tay ca dong dong bo, phan loai day nguoc ve linh-kien-app chi dong co thay doi (service binding LINHKIEN_SERVICE, cron gui lai), an menu Mua hang (v1.026) (`f0e3c76`)
- feat: chia 2 mien Bac/Nam + chua khai bao - don tu gan mien theo khu vuc KTV, nguoi xu ly gan mien phu trach, loc hang doi, doi mien + chuyen luon KTV, tu khoa o Cai dat (v1.025) (`bd70d3d`)
- feat: hinh thuc gui 'Giao truc tiep' (an DVVC/van don, nhan Nguoi giao hang/Ngay giao), khoi van chuyen: hinh thuc + ngay gui hang 1, 3 o con lai hang 2 (v1.024) (`e6a0e7c`)
- feat: sidebar gon - moi muc chi con ten + so viec (bo icon, dong mo ta), nhom vai tro ten + tong, thu gon dong 34px (v1.023) (`47b23c9`)
- feat: moi UI chi tiet (don/phieu gui/phieu tra) chiem 95% rong x 95% cao man hinh desktop, cot nhat ky 440px tu xl (v1.022) (`426c35d`)
- feat: UI chi tiet don bao hanh tat ca trong mot - tien trinh 8 buoc + dang o, lien ket xem nhanh tai cho (phieu gui/don cha/phieu tra/Odoo), toi da 2 lop modal, khach hang & case co han BH + xem them, nguoi lien quan, trao doi ngay trong chi tiet, nut sao chep (v1.021) (`112fa7f`)

### 2026-10-10
- feat: dong bo toan bo UI chi tiet (phieu tra, phieu gui) theo khuon 2 cot, DetailParts dung chung, nhat ky + tien do phieu gui, Kho nhap van don, Esc chi dong modal tren cung (v1.020) (`c70d492`)
- feat: thiet ke lai UI chi tiet don bao hanh - modal cao theo noi dung, 2 cot, khoi tom tat + xu ly chi truong co gia tri, don vi cung lo, nhat ky gop co tab loc (v1.019) (`c0fffeb`)
- feat: menu chia nhom theo vai tro, dem so viec tung vai tro + tung muc (cong nhieu hang doi), huy hieu so tren BottomNav (v1.018) (`37b52a9`)
- feat: giao dien web gon - bang toi da 2 dong (~30px), 20-25 dong/man hinh, topbar 1 dong, card/thanh loc/khoi phia tren thu gon (v1.017) (`356483b`)

### 2026-10-09
- feat: ten thay gmail, nhac Kho cho ban giao Admin BH, xac nhan SL hang loat, nut thao tac sau ma ID, bo loc 6 tieu chi + chon tat ca o bang Admin BH, nhat ky co dau (migration 0009) (v1.016) (`291f755`)
- docs: tai lieu huong dan co hinh anh cho vai tro Admin bao hanh (PDF + HTML) (`37a8fdc`)
- feat: tai file import ket qua ve Odoo (ID/Trang thai/Ngay hoan thanh/Ghi chu), dong bo ma_import_odoo (migration 0008) (`3359a2c`)
- feat: don Odoo - doi ten 'Huy don loi', tach 3 tab Chua gui / Da gui (phan trang server) / Huy bo, 20 don/trang (v1.015) (`f95d5e2`)
- feat: don Odoo cho gui - xac nhan 'khong gui' (tao nham tren Odoo) + mo lai, bao trang thai khong_gui ve dvbh (v1.014) (`83d60b8`)

### 2026-10-05
- feat: phan trang 20 dong (bang Admin theo don cha), cot Phan loai LK tu linh-kien-app, canh bao doi de xuat KTV, chon xu ly xac 1 lan khi Doi moi nhanh + FAST hang loat (v1.013) (`95c2f47`)
- fix: ra soat Admin BH - tran 100 don cha, FAST Tu choi hoi ly do huy, hang loat theo de xuat doi tru + gop phieu tra, gui duyet tu luu ma, top linh kien tinh ca don doi moi (v1.012) (`f27191c`)
- feat: nut Kiem tra ma case, nho nha xe theo KTV, ten (ma) linh kien, link CRM, top linh kien 30 ngay, cache danh muc + tim khong dau, tao thay khi case lech KTV (v1.011) (`01245a4`)
- fix(ui): modal nho bi gian het man hinh (lop Tailwind ghep dong), danh sach SearchableSelect bi cat trong modal (portal), icon vien trang (v1.010) (`1b259ce`)
- docs: ghi nhan cron Odoo production da chay sau khi deploy lai (`ae7ff21`)
- feat: sap xep lai menu Admin theo quy trinh + Che do test (xem thu vai tro / xem nhu gmail nguoi dung that) (v1.009) (`d44d2bd`)

### 2026-10-04
- feat: keo don bao hanh Odoo tu dvbh (cron 15 phut), KTV chon don vao thung, day trang thai gui sua nguoc ve dvbh (v1.008) (`0a74bbc`)
- feat(ui): ap dung design system App Khieu nai (xanh la) + SLA bo Chu nhat + sua gui phieu rong/tu dong gop (v1.007) (`b070771`)

### 2026-09-09
- feat: link truy cap truc tiep 1 phieu tra theo ID (v1.006) (`cab78a2`)

### 2026-09-08
- fix(ux): ra soat UX toan he thong theo vai tro - sua 14/16 phat hien (v1.005) (`ee2ae6e`)
- feat: bo sung "Xac nhan ket thuc" + "Kho xac nhan ho" cho don TR-, tra xac cho doi tac (`a34b43d`)
- chore: cap nhat icon PWA (apple-touch-icon, icon-maskable-512) (`9ae1d31`)
- feat: partner routes cho khovan goi vao thay Kho thao tac (nguyen tac Kho chi qua app kho van) (`a06f9b9`)

### 2026-09-07
- fix: khong tao phieu nhap thua + day khovan tre + sua layout mobile de chong (`cde1579`)
- fix: sua loi FK "tao ho don" cho KTV chua dang nhap + them module Giam sat khu vuc (`f95a73b`)
- feat: báo trước thùng hàng "chờ xử lý" sang khovan lúc tạo + API tra cứu lại theo ID (`1e9de56`)

### 2026-09-06
- Them muc menu "Mua hàng" tro sang linhkien.dichvu3t.workers.dev (`244c250`)

### 2026-09-05
- v1.002 - Tao ho don bao hanh + ma su co bat buoc/khop KTV + UI to hon + fix linh kien mobile (`acfe9a1`)
- Hien thong bao phien ban he thong o goc duoi-trai sidebar + chot quy uoc versioning (`ff6ad4b`)
- Nut Cai dat vao man hinh chinh chu dong (khac shortcuts thu dong cua manifest) (`610e417`)
- Phan trang that (server LIMIT/OFFSET) cho toan bo bang du lieu (`49859c7`)

### 2026-09-04
- Module quan ly danh sach KTV (#/qtri/ktv) - vá gap tu dong duyet tai khoan (`a147d61`)
- QA vong 4: anh khi KTV tao don + man mobile rieng cho Them don bao hanh (`ab89636`)
- QA vong 3: case-lookup autocomplete + QR that + SearchableSelect + phan trang linh kien (`ed56843`)
- QA vong 2: port dung 3 khoang cach thuc su voi prototype-html (`426ea61`)
- Admin (la_qtri) thanh superuser - nhin/thao tac duoc moi module (`c2b5850`)
- CLAUDE.md: ghi lai deploy that dau tien len production (Worker suachua) (`18f8c92`)
- Don dep AppSheet export cu, cap nhat wrangler.jsonc voi D1 database_id that (`15fcb3d`)
- DEPLOY.md: cap nhat checklist khop voi trang thai that (Giai doan 3-6 da xong) (`aa859f4`)
- Giai doan 6: PWA/mobile co ban (icon that, manifest, service worker) (`d76ce46`)
- Giai doan 4: Toan bo 13 man hinh frontend that (React) cho Worker suachua (`841bde2`)
- Giai doan 3: Toan bo route nghiep vu backend cho Worker suachua (`aef5642`)
- Giai doan 1: scaffold ha tang Worker "suachua" doc lap (`fe26c21`)
- Chot cau hoi #6 (vi tri ma nguon suachua) + phat hien mau dong bo that co san (`98aa82a`)

### 2026-09-03
- Chot 5 cau hoi mo bao cao Cloudflare + phat hien co che dong bo day (push) (`e505134`)
- Phan tich lien ket voi Dat mua linh kien + ke hoach chuyen doi len Cloudflare (`8720282`)
- Them 10 nut Xu ly nhanh (FAST) cho don bao hanh + bam so gio SLA de ghi ly do cham ngay (`905e921`)
- Can nut thao tac trong footer cua UI chi tiet sang phai (`9137a28`)
- Them duong gach chia ranh gioi cot luon hien o bang thong nhat Admin BH (`44c6fa2`)
- SLA don gian hoa + tuy bien cot bang Admin BH + tu dong gop phieu tra (`94d4b7f`)
- Cot trang thai len vi tri 2 + day du nut thao tac trong UI chi tiet (`dc81c41`)
- Loi chao len topbar, gop settings admin, sidebar mac dinh thu gon (`879e92d`)

### 2026-09-02
- Chuyen nut thao tac cua UI chi tiet len top tieu de modal (`e809ecb`)
- Sort log moi nhat len dau + danh gia lai visual hierarchy toan he thong (`adbf5ee`)
- Mobile: chuyen menu tu drawer sang bottom tab bar co dinh (`be51bd6`)
- UI overhaul: bang 1 dong, modal tran man hinh, log day du, gam mau ro rang (`d5280c7`)
- Them nguyen tac bat buoc: CLAUDE.md la nhat ky lich su song cua du an (`8d1c893`)
- Init repo: chot toan bo dac ta + prototype module Sua chua bao hanh (`02a0684`)
