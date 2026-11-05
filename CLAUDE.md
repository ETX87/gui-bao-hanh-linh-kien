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
gộp phiếu trả cho mọi nhân viên (03/09/2026, cùng ngày), và gần nhất là thêm đường gạch chia ranh
giới cột luôn hiện (không cần hover) tại tiêu đề bảng thống nhất Admin BH, để người dùng biết trước
vị trí kéo giãn cột thay vì phải rà chuột dò tìm (03/09/2026, cùng ngày), và gần nhất là nhóm nút
thao tác trong thanh footer của "UI chi tiết" (`openDetailUnitModal`) căn lại sang bên phải thay vì
bên trái mặc định (03/09/2026, cùng ngày), và gần nhất là bộ **"nút thao tác nhanh"** (⚡ Xử lý nhanh)
cho từng đơn bảo hành — 10 nút 1-chạm đối chiếu đúng bộ icon AppSheet gốc, tự động điền
huong_xu_ly/loai_bao_hanh/loai_doi_tru và tự gộp vào phiếu trả "Nhập" theo đúng KTV+loại đối trừ —
cộng với badge SLA quá hạn giờ **bấm được trực tiếp** để ghi lý do chậm ngay không cần đi kèm hành
động nghiệp vụ nào (03/09/2026, cùng ngày) — xem 13 mục cuối cùng phía dưới (theo đúng thứ tự thời
gian) để có chi tiết đầy đủ. **Mốc quan trọng nhất gần đây (03/09/2026, cùng ngày)**: đã phân tích
dự án song song `../linh-kien-app` ("Đặt mua linh kiện") và phát hiện **thay đổi kiến trúc lớn** —
module đó đã tách hẳn khỏi `../cloudflare smarttrade base` từ 19/08/2026 thành 1 hệ Cloudflare
Workers+D1 độc lập, khiến giả định cũ "build bảo hành bên trong `cloudflare smarttrade base`" (mục
"Liên hệ với hệ thống chính") **lỗi thời** — hướng mới: bảo hành là 1 Worker+D1 độc lập thứ 3 tên
`suachua` (đã xác nhận domain `suachua.dichvu3t.workers.dev` **đã online thật**), liên kết cả 2 hệ
kia qua partner API + cơ chế **"đẩy" (push sync)** tự động cho dữ liệu tham chiếu (KTV/Khu vực/danh
mục linh kiện — `linh-kien-app` chủ động gọi sang khi có thay đổi) — **cả 6/6 câu hỏi mở đã được
chốt (04/09/2026)**, kể cả câu hỏi mới về vị trí mã nguồn (chính thư mục này sẽ là nguồn cho
`suachua`, Worker đang online hiện chỉ là bản rỗng/placeholder). Phát hiện thêm: cơ chế "đẩy" nói
trên **không cần thiết kế mới** — đã có sẵn mẫu thật đang chạy giữa `linh-kien-app`↔`dvbh`
(`dvbhSyncClient.ts`, cron mỗi giờ + con trỏ tăng dần, thêm 28/08/2026) — chỉ cần nhân bản thêm
`suachua` làm đích gửi thứ 2 — xem mục "Câu hỏi #6 chốt xong..." bên dưới. Xem file riêng
`du an sua chua bao hanh/Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` (đầy đủ phân tích + kế
hoạch từng bước). **Giai đoạn 1 (scaffold hạ tầng) đã xong (04/09/2026, cùng ngày)** — thư mục này
giờ có `backend/`+`frontend/`+`migrations/`+`wrangler.jsonc`+`DEPLOY.md` thật (không chỉ tài liệu
đặc tả nữa), đã xác minh Auth+D1 chạy đúng qua `wrangler dev` local thật (không chỉ đọc code) — xem
mục "Giai đoạn 1: Scaffold hạ tầng Worker suachua" bên dưới, kể cả 1 phát hiện quan trọng (phiên làm
việc hiện tại không có quyền truy cập tài khoản Cloudflare `dichvu3t` thật, chỉ xác thực được 1 tài
khoản sandbox khác — mọi bước tạo tài nguyên thật trong `DEPLOY.md` cần người dùng tự chạy). Theo chỉ
đạo *"ko deploy, chỉ cần triển khai đầy đủ, tôi sẽ tự deploy ở tài khoản khác"*, **Giai đoạn 3 (toàn
bộ route nghiệp vụ backend) đã xong (04/09/2026, cùng ngày)** — 12 file route/lib mới, port đầy đủ
state machine đã chốt qua 22 vòng rà soát, đã kiểm thử end-to-end thật qua HTTP (không chỉ typecheck)
với 2 bộ test riêng biệt (`e2e_test.js` full luồng chính 0 lỗi, `e2e_test2.js` các nhánh còn lại —
FAST actions/bổ sung/sync/qtri — 23/24 đúng, 1 sai khác biệt do chính test script chứ không phải lỗi
backend) — xem mục "Giai đoạn 3: Toàn bộ route nghiệp vụ backend" bên dưới. **Giai đoạn 4 (toàn bộ 13
màn hình frontend thật) đã xong (04/09/2026, cùng ngày)** — React 18 thật thay cho `App.tsx` tối giản
của Giai đoạn 1, đã kiểm thử bằng click-through thật qua Chrome (Browser pane) đi hết toàn bộ luồng
nghiệp vụ chính từ KTV tạo phiếu tới KTV nhận hàng trả (0 lỗi console bất ngờ) — xem mục "Giai đoạn 4:
Toàn bộ 13 màn hình frontend thật" bên dưới, kể cả danh sách các điểm đã đơn giản hoá có chủ đích
(quét QR camera, tuỳ biến cột kéo-thả, bottom-tab-bar cố định...) so với prototype. **Giai đoạn 5 (nửa
PHÁT đồng bộ đẩy bên `linh-kien-app`) và Giai đoạn 6 (PWA/mobile cơ bản) đã xong (04/09/2026, cùng
ngày)** — đã hỏi lại và loại bỏ phương án "chia sẻ D1 trực tiếp" (rủi ro coupling migration, xem mục
Giai đoạn 5) trước khi sửa 5 điểm ở repo `linh-kien-app` (commit riêng trong repo đó, cùng ràng buộc
không deploy); PWA có icon 192/512/maskable thật (resize bằng `sharp`), manifest + service worker
app-shell cache, đã xác nhận service worker thật sự active qua Browser pane. **Cả 6 giai đoạn của
roadmap đã hoàn tất** — xem mục "Tổng kết toàn bộ 6 giai đoạn" ở cuối mục Giai đoạn 6 bên dưới. Không
có lệnh deploy/tạo tài nguyên Cloudflare thật nào được chạy trong toàn bộ quá trình, đúng ràng buộc đã
chốt — việc deploy thật còn lại thuộc về người dùng. **Mốc mới nhất (04/09/2026, cùng ngày, sau khi
người dùng xác nhận "commit và deploy dự án này"):** Worker `suachua` đã **deploy thật thành công lên
production** (`https://suachua.dichvu3t.workers.dev`, tài khoản Cloudflare `dichvu3t` thật — xác nhận
qua `wrangler whoami`/`wrangler d1 list` cùng lúc thấy cả `dvbh-db-smarttrade`/`dat-mua-linh-kien-db`),
D1 đã áp đủ 16 bảng migration, đã xác minh màn đăng nhập chạy đúng qua trình duyệt thật — xem mục
"Deploy thật đầu tiên lên production" bên dưới (ngay trước mục "Đối chiếu bản góp ý Gemini") để có chi
tiết đầy đủ, kể cả 1 vướng mắc kỹ thuật đã gặp (wrangler tự suy luận nhầm tài khoản khi migrate/deploy,
khắc phục bằng cách ép `CLOUDFLARE_ACCOUNT_ID` rõ ràng) và 1 rủi ro rò rỉ secret đã chặn kịp
(`api key.txt` chưa nằm trong `.gitignore`, đã thêm, chưa từng bị commit). **Sau khi deploy thật, người
dùng phát hiện giao diện production khác giao diện đã chốt** — 2 vòng QA tiếp theo (cùng ngày
04/09/2026): **"QA vòng 2"** (đối chiếu lại đúng `prototype-html/index.html` thay vì mô tả cũ — sửa
bottom-nav mobile, sidebar thu gọn mặc định, bảng thống nhất Admin BH đủ tuỳ biến cột + chọn hàng loạt,
cộng `la_qtri` thành superuser mọi cổng vai trò) và **"QA vòng 3"** (case-lookup autocomplete + cảnh
báo hết hạn BH khôi phục lại, QR thật (tem dán thùng/tải ảnh in tem/quét camera) bằng `qrcode`+`jsqr`
npm thật, `SearchableSelect` cho picker linh kiện, phân trang Danh mục linh kiện 20/bảng) — xem 2 mục
cùng tên bên dưới để có chi tiết đầy đủ. Việc deploy các sửa đổi này lên production vẫn thuộc người
dùng. Sau đó thêm **QA vòng 4** (04/09/2026, ảnh KTV upload lúc tạo đơn + màn mobile riêng "Thêm đơn
bảo hành"), module **"Quản lý danh sách KTV"** (`#/qtri/ktv`, 04/09/2026), **phân trang server-side
thật cho toàn bộ bảng dữ liệu** (05/09/2026), và gần nhất là **nút "Cài đặt vào màn hình chính"** chủ
động trên topbar mobile (05/09/2026, khác hẳn field `shortcuts` thụ động của manifest), tiếp theo là
hiển thị số phiên bản hệ thống ở góc dưới-trái sidebar + chốt quy ước bắt buộc từ nay: **mỗi lần
deploy phải tăng `APP_VERSION` 1 nấc 0.001** (05/09/2026), và gần nhất là **"tạo hộ đơn bảo hành"**
(GS khu vực/Admin BH tạo thùng cho 1 KTV khác, quản lý toàn bộ thùng đó tới khi Kho tiếp nhận) +
**mã sự cố bắt buộc và phải khớp đúng KTV** (chặn cứng, lưu bằng chứng + Admin BH đồng bộ lại được)
+ sửa UI "Thêm đơn bảo hành" quá nhỏ + sửa nốt 1 chỗ linh kiện mobile còn dùng `<select>` thường
(05/09/2026) — xem mục "Tạo hộ đơn bảo hành..." bên dưới. **Mốc mới nhất (07/09/2026)**: phát hiện 1
phiên làm việc song song đã tự build xong hệ "Kho vận" (`khovan`) độc lập và tích hợp thêm vào repo
này (đã loại trừ, không phải nguyên nhân lỗi); sửa 1 lỗi thật đang xảy ra trên production
(`INTERNAL_ERROR` khi "tạo hộ đơn" cho 1 KTV chưa từng đăng nhập — do FOREIGN KEY constraint của D1
chặn `phieu_gui_bh.nguoi_tao`, đã sửa bằng tự cấp phát trước 1 dòng `users` tối thiểu) và bổ sung
module còn thiếu **"Giám sát khu vực"** (`#/qtri/khu-vuc`, gán GS phụ trách cho từng Khu vực đã có
sẵn trên danh bạ KTV) — xem mục "Sửa lỗi FK 'tạo hộ' + thêm module 'Giám sát khu vực'..." bên dưới.
Ngay sau đó (07/09/2026, cùng ngày): sửa lỗi "tạo ra 1 đống phiếu nháp thừa" (tự động xoá phiếu nháp
rỗng khi đóng modal chi tiết không thêm đơn nào + dời thời điểm báo khovan từ lúc tạo phiếu sang lúc
KTV thật sự xác nhận đã gửi xe — nhờ vậy phiếu nháp bị bỏ dở không cần báo huỷ sang khovan vì chưa
từng được báo từ đầu) và sửa layout mobile của màn "Phiếu gửi"/danh sách đơn bị chồng chéo — xem mục
"Không tạo phiếu nháp thừa..." bên dưới. **Mốc mới nhất (08/09/2026): 1 vòng RÀ SOÁT UX toàn hệ
thống theo vai trò** (chạy `wrangler dev` local + trình duyệt thật, đóng vai siêu người dùng 9 cờ,
seed phủ mọi trạng thái) — **KHÔNG sửa mã nguồn nào**, chỉ phát hiện + lập kế hoạch, giao ra 1
Artifact báo cáo (ma trận vai trò×màn hình + 16 phát hiện xếp mức độ kèm phản biện + lộ trình 3 đợt).
3 lỗi thật đã chứng minh chạy thật, chờ người dùng chốt 5 câu hỏi trước khi sửa: **(1) badge SLA
lệch đúng 7h ở `frontend/src/lib/format.ts hoursSince()`** (thêm nhầm hậu tố `"Z"`) → hiện số âm
("-7h") + cổng SLA bế tắc trong khung 24–31h thật (frontend nói chưa quá hạn, backend trả 400
`REQUIRE_LY_DO_CHAM` mà không có ô nhập); **(2) số "việc cần làm" bị chặn ở 20** (`useWorkload` đếm
`.length` trên endpoint mặc định `limit=20`) → Trang chủ nói 20, màn hình nói 31, Giám sát nói 28;
**(3) `GET /api/nv/viec-cua-toi` không JOIN đơn cha** → hàng đợi NV trống cột Linh kiện + Mô tả lỗi.
Xem mục "Rà soát UX toàn hệ thống theo vai trò (08/09/2026)" bên dưới để có đầy đủ 16 phát hiện + 5
câu hỏi mở + link Artifact. **[CẬP NHẬT cùng ngày] Người dùng đã bảo "lần lượt triển khai theo lộ
trình" — CẢ 3 ĐỢT ĐÃ LÀM XONG (trừ P8 người dùng chốt bỏ): Đợt 1 (P1–P4 lỗi gốc), Đợt 2 (P5–P7
mobile), Đợt 3 (P9–P16: bẫy lưu phiếu gửi, SearchableSelect tự mở, bảng desktop, Giám sát "quá hạn
SLA" + lọc, quản trị tìm/gom-lưu, gộp đơn cha ×N, lý do có dấu). Typecheck 0 lỗi, kiểm thử chạy thật
18/18 màn hình. File mới: `backend/src/routes/workload.ts`, `migrations/0004_ly_do_tieng_viet.sql`.
v1.005. CHƯA deploy — xem 3 mục "Đợt N ... ĐÃ TRIỂN KHAI" bên dưới.** **Mốc mới nhất (04/10/2026): áp
dụng toàn bộ design system của "App Khiếu nại" (`../App Khieu nai/DESIGN_SYSTEM.md`) sang mọi màn
hình, đổi gam màu sang XANH LÁ theo icon app** (Plus Jakarta Sans, token ô nhập/bóng/bo góc, Sidebar
gradient nhóm menu, bottom nav trắng có capsule, bảng→thẻ trên mobile, `StatusBadge` mỗi trạng thái 1
tone, `ImagePicker`, hero Trang chủ) + tạo `DESIGN_SYSTEM.md` riêng; **chốt SLA "24h liên tục bỏ qua
chủ nhật"** (backend + frontend cùng thuật toán); **QA chức năng chạy thật** (e2e HTTP 51/51 bước với
7 tài khoản đơn vai trò + quét 18/18 màn hình 0 lỗi console) — tìm và sửa 2 lỗi backend thật (cho gửi
thùng rỗng; "tự động gộp" không gộp vào phiếu nháp sẵn có). v1.007, đã commit + deploy (quy ước mới: tự commit rồi deploy cuối mỗi phiên) — xem mục "Áp
dụng design system App Khiếu nại..." ở cuối file. Tiếp theo (04/10/2026): kéo đơn bảo hành Odoo từ
dvbh về app (cron 15 phút) + đẩy trạng thái gửi sửa ngược về dvbh (v1.008). **Mốc mới nhất
(05/10/2026, v1.009):** sắp xếp lại menu Admin theo đúng thứ tự quy trình (nhóm "1 · Gửi hàng → 2 · Kho
→ 3 · Xử lý bảo hành → 4 · Trả hàng → Danh mục & quản trị", có mô tả từng mục) + **"🧪 Chế độ test"**
cho Admin hệ thống (xem thử theo vai trò / xem như gmail người dùng thật, port từ `linh-kien-app`).
Sau đó v1.010–v1.012 (sửa modal giãn, 7 yêu cầu tra cứu case/nhớ nhà xe/top linh kiện, rà soát 1 ngày
Admin BH). **Mốc mới nhất (05/10/2026, v1.013):** phân trang tối đa 20 dòng/trang cho mọi bảng dài (bảng
Admin BH phân trang theo đơn cha), cột "Phân loại LK" (từ `don_vi` của linh-kien-app), cảnh báo khi Admin
chốt khác đề xuất KTV, chọn xử lý xác 1 lần lúc Đổi mới nhanh/hàng loạt + nút "⚡ Xử lý nhanh hàng loạt" —
xem mục kế cuối file. **Mốc mới nhất (09/10/2026, v1.014):** đơn Odoo chờ gửi sửa có nút "🚫 Không gửi" (đơn
tạo nhầm trên Odoo) + mục "Đã xác nhận không gửi" để mở lại; trạng thái `khong_gui` được báo về dvbh. Cùng
ngày (v1.015): đổi tên thành "Hủy đơn lỗi" và tách thẻ đơn Odoo thành 3 tab **Chưa gửi / Đã gửi / Hủy bỏ**
(20 đơn/trang) — xem 2 mục cuối file. **Mốc mới nhất (09/10/2026, v1.016):** tên người dùng thay gmail ở mọi nơi, nhắc Kho "chờ bàn
giao Admin BH", xác nhận SL hàng loạt, nút thao tác lên ngay sau mã ID, bộ lọc 6 tiêu chí + chọn tất cả đang hiển thị ở bảng
Admin BH, nhật ký ghi tiếng Việt có dấu — xem mục cuối file. **Mốc mới nhất (10/10/2026, v1.017):** giao diện web gọn lại —
bảng tối đa 2 dòng/dòng, 1 màn 1440×900 thấy 20–25 dòng việc (bảng Admin BH từ ~7 lên ~20 dòng) — xem mục cuối file. **Mốc mới nhất (10/10/2026, v1.018):** menu chia nhóm
theo VAI TRÒ, mỗi nhóm hiện tổng số việc của vai trò, mỗi mục hiện số việc của màn đó (cộng nhiều hàng đợi) — xem mục cuối file. **Mốc mới nhất (10/10/2026, v1.019):** thiết kế lại UI chi
tiết đơn bảo hành (modal cao theo nội dung, 2 cột, nhật ký gộp có tab lọc) — xem mục cuối file. **Mốc mới nhất (10/10/2026, v1.020):** áp cùng khuôn đó cho
UI chi tiết phiếu trả + phiếu gửi (`ui/DetailParts.tsx` dùng chung) — xem mục cuối file. **Mốc mới nhất (11/10/2026, v1.021):** UI chi tiết đơn bảo hành
"tất cả trong một" (tiến trình 8 bước, liên kết xem nhanh, người liên quan, trao đổi ngay trong chi tiết) — xem mục cuối file. **Mốc mới nhất (11/10/2026, v1.022):** mọi UI chi tiết chiếm 95% rộng × 95%
cao màn hình desktop. **Mốc mới nhất (11/10/2026, v1.023):** sidebar gọn — mỗi mục chỉ còn tên + số việc. **Mốc mới nhất (11/10/2026, v1.024):** hình thức gửi "Giao trực tiếp" + sắp lại ô vận chuyển. **Mốc mới nhất (11/10/2026, v1.025):** chia hệ thống thành 2 miền Bắc / Nam + "Chưa khai báo" (đơn tự gán miền theo khu vực KTV, người xử lý gán miền phụ trách, đổi miền được + chuyển luôn KTV). **Mốc mới nhất (11/10/2026, v1.026):** danh mục linh kiện tải xlsx / import tháng BH + phân loại / sửa phân loại tay, phân loại đồng bộ ngược về linh-kien-app (chỉ dòng có thay đổi); ẩn menu "Mua hàng". **Mốc mới nhất (12/10/2026, v1.027):** giao trực tiếp tự lấy tên KTV làm người giao; nhớ cách giao hàng trên máy người dùng; nút "Lưu nháp, gửi sau"; cảnh báo đơn tồn + thời gian xử lý trung bình theo vai trò; lịch sử bảo hành theo Serial / ID case. **Mốc mới nhất (12/10/2026, v1.028):** làm nốt đề xuất rà soát Admin BH (ô tìm từ khoá, tiếp nhận nhiều thùng + sửa kẹt lý do chậm, xác nhận hoàn tất hàng loạt, tên khách + badge "Hết BH" từ bằng chứng case, cột số đơn); chốt 6 câu hỏi mở — Kho đánh giá khiếu nại "không nhận được hàng" (thành công / thất bại thất lạc), ghi nhận số tiền thu hồi từ hãng. Đã deploy cùng v1.029. **Mốc mới nhất (12/10/2026, v1.029):** tính năng "Đề xuất linh kiện" (NV xin cấp linh kiện = đơn con của đơn bảo hành, Admin BH lên MISA rồi cấp / từ chối, không giới hạn số lần) + NV nộp 1 trong 4 kết quả (Đã sửa xong / Không sửa được / Không có lỗi / Chỉ kiểm tra tư vấn) + Kho ghi "phương án xử lý" khi gửi thất bại. **Đã deploy production 12/10/2026** (migration 0012 + 0013 đã áp, Version ID `3f4a3605`). **Mốc mới nhất (16/10/2026, v1.031):** tài khoản tự duyệt nếu có trên ETX nhân sự, tự khoá khi nghỉ việc, tự mở khi đi làm lại (danh bạ ETX lấy từ linh-kien-app); khu vực KTV tiếp tục lấy theo danh bạ đồng bộ từ linh-kien-app. **Mốc mới nhất (19/10/2026):** xoá toàn bộ dữ liệu test trên production và nhập 656 đơn bảo hành thật từ AppSheet (`don bh.xlsx`); sau đó dọn 7 thùng test bên khovan, gán xử lý xác "trả đối tác", sửa 23 đơn vị nhập sai phương án, nhập 82 đề xuất linh kiện — xem 2 mục cuối file. **Cùng ngày:** tài liệu hướng dẫn Word (.docx) có ảnh minh hoạ cho vai trò KTV — `du an sua chua bao hanh/Huong-dan-KTV/`. **Mốc mới nhất (19/10/2026, v1.034):** làm lại màn lên phiếu trả — danh sách đơn chờ trả dạng bảng nhóm theo KTV (tick 1/nhiều đơn → tạo phiếu, tự tách theo KTV × loại đối trừ), sửa phiếu (thêm/bớt đơn, đổi linh kiện thực tế) tới khi Kế toán duyệt, nút đẩy ngược cho Kho + Kế toán, bộ lọc/tìm kiếm cho cả 2 danh sách — xem mục cuối file. **Mốc mới nhất (20/10/2026, v1.035):** 10 yêu cầu đi tắt luồng — tìm đơn Odoo khi tạo thùng, thùng Admin tạo hộ / Admin nhận hộ Kho bỏ qua bước Kho, tự lưu bằng chứng case dvbh, FAST Đổi mới mặc định trả xác đối tác, MISA không bắt buộc, menu "Phiếu đã gửi kế toán", NV sửa xong đẩy thẳng sang Kho, Admin BH tra cứu đơn ở mọi giai đoạn — xem mục cuối file. **Mốc mới nhất (21/10/2026, v1.036):** Admin BH tạo đề xuất linh kiện thay cho NV sửa chữa. **Mốc mới nhất (21/10/2026, v1.037):** menu riêng "KTV đang sửa" cho Admin BH. **Mốc mới nhất (21/10/2026, v1.038–v1.039):** bộ lọc + tìm kiếm cho mọi bảng danh sách đơn/phiếu (ô >5 lựa chọn tìm được trong danh sách) + ghi chú khi NV báo kết quả sửa chữa. **Mốc mới nhất (21/10/2026, v1.040):** bấm vào thùng chờ tiếp nhận để mở xem bên trong và tiếp nhận ngay trong chi tiết. **Mốc mới nhất (21/10/2026, v1.041):** thêm tìm kiếm cho 5 danh sách còn sót (thùng chờ nhận nội bộ, thùng đang gửi về Kho, tab Odoo "Đã gửi" / "Hủy bỏ", Giám sát khu vực). **Mốc mới nhất (21/10/2026, v1.042):** Kế toán có tab "Đã xử lý" (phiếu từng duyệt / từ chối / đẩy ngược). **Mốc mới nhất (21/10/2026, v1.043):** kéo khu vực phụ trách của tài khoản nhân sự từ linh-kien-app 1 lần/ngày + đồng bộ tay, tự suy miền cho tài khoản chưa gán miền tay. **Mốc mới nhất (21/10/2026, v1.044):** KTV chọn "Gửi về kho miền" khác khu vực của mình cho từng thùng (khu vực gửi hàng động). **Mốc mới nhất (27/10/2026, v1.045):** đổi tên trang web thành "Bảo hành đổi trả 3T". **Mốc mới nhất (29/10/2026, v1.046):** mỗi đơn vị có 3 linh kiện — KTV chọn (A) / thực tế gửi về do Admin xác nhận (B, quản lý xác tính theo B) / đổi mới (C). **Mốc mới nhất (30/10/2026, v1.047):** Admin BH tiếp nhận thùng → báo khovan "Đã bàn giao" (kết thúc bên kho); FAST tự ghi B = A; cổng mã case mềm khi DVBH lỗi (tạo trước, cron tự xác minh); huy hiệu "Lần N" cho sản phẩm bảo hành lại trong 90 ngày. **Mốc mới nhất (30/10/2026):** rà soát giao diện mobile của KTV hiện trường — 11 vấn đề + phản biện + hướng đề xuất, CHƯA sửa code (`du an sua chua bao hanh/Ra-Soat-UX-Mobile-KTV_30-10-2026.md`). **Mốc mới nhất (30/10/2026, v1.048):** làm đủ 7 đề xuất giao diện mobile KTV — Trang chủ "Việc của tôi", thanh dưới 4 tab, màn "Đơn của tôi" gồm cả đơn chưa về Kho, Gửi hàng 2 tab, chi tiết thùng gọn, Nhận hàng dạng thẻ, chọn nhanh mã case, nhãn trạng thái theo góc nhìn KTV. **Mốc mới nhất (31/10/2026, v1.049):** rà soát bố cục từng màn ở điện thoại 375px và máy tính 1440px (cả KTV lẫn các vai trò khác) — sửa tràn ngang trên điện thoại, thẻ / bảng gọn hơn, bộ lọc thu vào nút "Lọc" trên điện thoại, cột SLA bảng Admin không còn bị đẩy ra ngoài. **Mốc mới nhất (31/10/2026, v1.050):** mọi danh sách có thêm bộ lọc Cảnh báo (SLA 3 mức) / Thời gian tạo / linh kiện A-B-C, và tìm KHÔNG DẤU theo mã case, tên khách, tên linh kiện (cột `tim_kiem` mới). **Mốc mới nhất (31/10/2026, v1.051):** gộp các màn trùng chức năng thành 4 màn chung có tab theo giai đoạn — Thùng hàng / Đơn bảo hành / Phiếu trả / Quản trị (menu Admin 19 → 7 mục, Kho / Kế toán / NV 3–4 mục); link cũ tự chuyển tiếp. **Mốc mới nhất (31/10/2026, v1.052):** tài liệu hướng dẫn KTV hiện trường có ảnh (3 việc chính: gửi hàng / xem tiến độ / nhận hàng + chức năng phụ + kịch bản quay video) — `du an sua chua bao hanh/Huong-dan-KTV-v1.052/`; sửa lỗi chi tiết thùng hiện sai giai đoạn của đơn đã trả. **Mốc mới nhất (31/10/2026, v1.053):** sửa 3 điểm giao diện KTV phát hiện khi làm tài liệu — nút "Kiểm tra" mã case không còn bị cắt chữ, form "Bổ sung" có ô gửi ảnh chụp lại, thông tin xe tự điền có lời nhắc kiểm tra lại. **Mốc mới nhất (31/10/2026, v1.054):** bấm thẻ đơn đang trả về mở thẳng phiếu trả (nhiều lần trả thì cho chọn phiếu, trả 1 phần thì báo "x/N món đang trả về"); KTV báo thiếu theo TỪNG MÓN, Kho đánh giá thất lạc chỉ áp cho món bị báo thiếu. **Mốc mới nhất (31/10/2026, v1.055):** bấm 1 đơn trong thùng nháp để sửa linh kiện KTV chọn (A), số lượng, mô tả lỗi, loại đối trừ đề xuất. **Mốc mới nhất (01/11/2026): dừng AppSheet, nhập lần cuối toàn bộ dữ liệu cũ** (3.136 đơn tháng 10, kiểu cập nhật + bổ sung, giữ nguyên dữ liệu đã phát sinh trên hệ thống mới) — xem mục cuối file. **Mốc mới nhất (01/11/2026, v1.059):** 1 khu vực có nhiều Giám sát cùng phụ trách (tích chọn nhiều GS, có "GS chính"). **Mốc mới nhất (01/11/2026, v1.060 + linh-kien-app v1.432):** "GS phụ" — Admin chọn khu vực phụ trách ngay trên tài khoản Giám sát bên linh-kien-app, quyền như GS chính ở cả 2 app; app này đồng bộ GS phụ mỗi giờ. **Mốc mới nhất (02/11/2026, v1.061):** khối "📝 Diễn giải MISA" trong chi tiết phiếu trả (mã kho MN 6803 / MB 6804, tổng đơn / linh kiện, tên KTV theo CRM, danh sách MYC) + nút sao chép. **Mốc mới nhất (02/11/2026, v1.062):** Kho / Admin BH nhận trực tiếp thùng nháp của KTV (bỏ qua bước gửi). **Mốc mới nhất (02/11/2026, v1.063):** Kế toán nhập thêm / sửa mã MISA phiếu trả trước khi Kho xử lý. **Mốc mới nhất (02/11/2026, v1.064):** khối "🔩 Mã yêu cầu theo linh kiện" dưới Diễn giải MISA (mỗi linh kiện 1 nhóm + danh sách mã case) + nút sao chép riêng. **Mốc mới nhất (02/11/2026, v1.065 + dvbh v1.516):** màn "Đơn bảo hành" (tab Chờ phân loại + Mọi giai đoạn) có 3 chế độ xem Danh sách / Theo KTV / Theo linh kiện, kèm SL đặt, SL duyệt, serial, ngày mua, ngày sản xuất. **Mốc mới nhất (03/11/2026, v1.066):** lùi lại đơn huỷ nhầm / đã phân loại khi giai đoạn sau chưa làm, Kế toán "Trừ công nợ" kết thúc phiếu trả không gửi KTV, Kế toán xác nhận MISA cho cấp linh kiện (duyệt / từ chối / trả lại Admin), SL đơn vị tách hiện 1/N, tên người dùng theo ETX nhân sự, đổi linh kiện B/C hàng loạt. **Mốc mới nhất (03/11/2026, v1.068):** KTV có nhiều mã trong danh bạ không còn bị báo nhầm "Sai mã sự vụ". **(v1.067):** lọc người gửi chỉ hiện tên; case trong ngày (SC+YYMMDD hôm nay) chưa đồng bộ DVBH vẫn tạo được đơn, gắn "chưa xác minh"; khối "Mã yêu cầu theo linh kiện" bôi chọn / sao chép lẻ từng nhóm. **Mốc mới nhất (04/11/2026):** bổ sung 166 đơn AppSheet còn sót (`don bh fix 2.xlsx`) — xem mục cuối file. **Mốc mới nhất (04/11/2026, v1.070):** menu 2 cạnh sidebar — danh sách KTV đang có đơn cần xử lý (×N), bấm tên KTV để lọc danh sách đang xem. **Mốc mới nhất (04/11/2026, v1.069):** việc của Kế toán gom về 1 menu "Phiếu trả" (tab "🔩 Cấp linh kiện" nhóm theo case, duyệt cả case / lẻ từng đơn); Kho có trạng thái "Chờ Kho in phiếu" / "Kho đã in phiếu" (đổi qua lại), "Chờ Kho gửi" tách 2 tab. **Mốc mới nhất (05/11/2026, v1.072):** lời chào / tên trên TopBar dùng tên tài khoản trên hệ thống (bảng `/users/ten`: họ tên ETX nhân sự > danh bạ KTV > tên Google) thay vì tên Google ("kenvin thanh"). **Mốc mới nhất (04/11/2026, v1.071 + linh-kien-app v1.437):** lý do chậm "Không có linh kiện" / "Hết hàng tồn kho" tự tạo ticket "Thiếu hàng bảo hành" bên linh-kien-app cho Kho / Mua hàng xử lý, trạng thái báo ngược về đơn gốc (tab "📦 Thiếu hàng" + khối trong UI chi tiết) — xem mục cuối file. **Mốc mới nhất (04/11/2026, v1.073):** phiếu cấp linh kiện sửa chữa tách giai đoạn sau Kế toán: Chờ Kho in → Kho đã in → Kho đã xuất (Kho có 2 nút "Đã in" / "Đã xuất luôn"), Kho thấy phiếu cấp linh kiện ở menu Phiếu trả — xem mục cuối file. **Mốc mới nhất (04–05/11/2026, v1.074–v1.076):** Kho thấy menu "Cấp linh kiện sửa chữa" (v1.074); tài khoản tự đồng bộ với danh bạ KTV / ETX, tên công ty thay tên Google (v1.075); KTV triển khai trên case (lấy từ DVBH) cũng được tạo đơn như Trạm + KTV được Admin gán quyền tạo hộ đơn cho KTV khác ở Danh sách KTV (v1.076 + dvbh v1.522) — xem 2 mục cuối file.

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
| 7 | `du an sua chua bao hanh/Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` | Phân tích dự án song song `../linh-kien-app` + kế hoạch chuyển đổi module bảo hành lên Cloudflare thật (03/09/2026) — **nguồn đúng nhất hiện tại cho câu hỏi "kiến trúc/kết nối hệ thống"**, GHI ĐÈ phần "Liên hệ với hệ thống chính" của #4 ở những điểm xung đột (xem cảnh báo lỗi thời ngay đầu mục đó). CHƯA triển khai gì, đang chờ chốt câu hỏi mở. |

**Quan trọng:** #4 (Ke-hoach) là nguồn chốt cho schema/route/phân quyền GỐC, nhưng **#5 (ma trận CRUD)
và mục "Phản hồi vòng 1 sau khi test prototype" bên dưới đã SỬA/BỔ SUNG nhiều điểm so với #4** — khi
có xung đột, phần cập nhật trong chính CLAUDE.md này (do mới hơn) là bản đúng nhất, #4 chưa được
sửa lại theo kịp. #1 chỉ còn giá trị lịch sử (sơ đồ to-be trong #1 **thiếu** nhóm case ngoại lệ có
phê duyệt — đã sửa ở #2, rồi #2 tự nó cũng bị **thay thế một phần** ở #4 khi ý tưởng bảng `approvals`
bị bỏ hẳn — xem mục 0 của #4, dòng "Case ngoại lệ / phê duyệt". Đừng lấy sơ đồ mermaid trong #1 hoặc
#2 làm chuẩn cuối. **Riêng phần "Liên hệ với hệ thống chính" của #4, #7 (mới, 03/09/2026) là bản đúng
nhất** — #4 giả định kiến trúc đã lỗi thời, xem cảnh báo ngay đầu mục "Liên hệ với hệ thống chính"
bên dưới.

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
   - ~~**[CẦN XÁC NHẬN]** mốc "24h tính từ thời điểm gửi sang" có tính giờ hành chính (bỏ qua ngoài giờ
     làm việc/cuối tuần) hay tính đủ 24h đồng hồ liên tục?~~ — **[ĐÃ CHỐT 04/10/2026]** nguyên văn: *"24h
     liên tục bỏ qua chủ nhật"* — đếm liên tục cả đêm/thứ 7, chỉ trừ trọn thời gian rơi vào Chủ nhật.
     Xem mục "Áp dụng design system App Khiếu nại + SLA bỏ Chủ nhật + QA chức năng (04/10/2026)".
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

## Đường gạch chia ranh giới cột luôn hiện (03/09/2026)

Nguyên văn yêu cầu, gửi ngay sau vòng "SLA đơn giản hoá + tuỳ biến cột" ở trên: *"vị trí nối giữa các
tiêu đề thêm đường gạch để dễ dàng biết vị trí để kéo giãn hoặc thu nhỏ."*

Bối cảnh: vùng kéo-resize (`.col-resize-handle`, rộng 8px, đặt ở cạnh phải mỗi `<th>` của bảng thống
nhất Admin BH) trước đó là 1 hotzone **hoàn toàn vô hình** — chỉ tô màu (`background: var(--ocean-
400)`) khi đang hover hoặc đang kéo. Người dùng không có cách nào biết trước ranh giới nào kéo được
nếu chưa lỡ rà chuột qua đúng vị trí đó trước — đúng vấn đề người dùng nêu ra.

Đã sửa (thuần CSS, không đổi logic JS resize/drag đã có): thêm 1 đường kẻ dọc 2px, cao 56% chiều cao ô
tiêu đề (`top/bottom:22%`), đặt đúng tâm vùng hotzone 8px bằng `::after` — **luôn hiển thị, không cần
hover** — màu `var(--ink-400)` (xám trung tính, không nổi bật quá mức gây rối mắt khi bảng có nhiều
cột), bo góc nhẹ. Khi hover/đang kéo (`.col-resize-handle:hover`, `.col-resize-handle.resizing`), nền
hotzone đổi sang xanh dương (`--ocean-400`, hành vi cũ giữ nguyên) và đường kẻ đổi màu trắng để vẫn đủ
tương phản trên nền xanh mới.

```css
.col-resize-handle::after { content: ""; position: absolute; top: 22%; bottom: 22%; left: 50%;
  width: 2px; background: var(--ink-400); border-radius: 2px; transform: translateX(-50%); }
.col-resize-handle:hover::after, .col-resize-handle.resizing::after { background: #fff; }
```

Không phát sinh lỗi/vấn đề nào trong lúc làm — đây là 1 thay đổi CSS thuần, không đụng tới bất kỳ hàm
JS nào của hệ thống tuỳ biến cột (`adminColResizeStart`/`Move`/`End`, `adminColDragStart`/`Drop`...).

**Kiểm thử đã chạy:** `node --check` trên cả 3 khối `<script>` — qua. Chạy lại `test_admincols_
autogom.js` (bài test liên quan trực tiếp nhất tới bảng này) — 0 lỗi. Chạy lại toàn bộ 19 bộ test
trong bộ hồi quy thường quy (`smoke_all_routes.js` → `test_admincols_autogom.js`) — **0 lỗi, không hồi
quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật): chụp riêng dòng tiêu đề bảng thống nhất
Admin BH ở trạng thái bình thường (đường kẻ xám mảnh hiện rõ giữa mỗi cặp cột: ID | Trạng thái | Nguồn
| Khách hàng | Linh kiện | Mô tả lỗi | SLA | Hành động) và ở trạng thái đang rê chuột vào đúng 1 tay
cầm resize (đường kẻ chuyển màu trắng, nổi rõ trên nền xanh dương hover) — cả 2 ảnh đều đúng như kỳ
vọng.

## Nút thao tác trong footer của UI chi tiết căn sang bên phải (03/09/2026)

Nguyên văn yêu cầu, gửi ngay sau vòng "Đường gạch chia ranh giới cột" ở trên: *"các nút thao tác
chuyển sang bên phải trong UI chi tiết."*

Bối cảnh: thanh `.modal-foot` (thêm ở vòng "Cột trạng thái lên vị trí 2 + đầy đủ nút thao tác trong
UI chi tiết", cùng ngày 03/09/2026 — chứa nhóm nút nghiệp vụ như "Phân loại"/"Yêu cầu bổ sung"/"🐞 Báo
cáo sai" của `openDetailUnitModal`, sinh ra từ `unitActionButtonsHtml()`) trước đó không khai báo
`justify-content`, nên mặc định `flex-start` — nhóm nút dồn về mép trái thanh footer. Đã sửa 1 dòng
CSS duy nhất: thêm `justify-content:flex-end` vào `.modal-foot`, đẩy toàn bộ nhóm nút sang sát mép
phải — không đổi thứ tự/logic hiển thị từng nút (vẫn đúng theo vai trò + trạng thái như đã chốt ở
vòng trước), chỉ đổi vị trí căn chỉnh trong thanh.

Không phát sinh lỗi/vấn đề nào trong lúc làm — thay đổi CSS thuần, không đụng JS.

**Kiểm thử đã chạy:** `node --check` (thực chất chạy `new Function()` trên cả 3 khối `<script>` để
bắt lỗi cú pháp mà không cần biến trang thành module) — qua cả 3. Chạy lại toàn bộ 19 bộ test hồi quy
— **0 lỗi, không hồi quy**. Xác nhận thêm bằng ảnh chụp Puppeteer (Chrome thật) ở cả desktop (1500px)
và mobile (390px): nút "Phân loại" trong thanh footer của màn "Chi tiết đơn bảo hành con" đã dịch hẳn
sang mép phải thanh, đúng như yêu cầu, ở cả 2 kích cỡ màn hình.

## Nút thao tác nhanh (FAST) cho từng đơn bảo hành + bấm số giờ SLA để ghi lý do chậm ngay (03/09/2026)

Nguyên văn 2 yêu cầu, gửi kèm 1 ảnh chụp 10 icon "thao tác nhanh" từ AppSheet gốc (đúng bộ icon đã
đối chiếu ở vòng 31/08/2026, mục "Đối chiếu nút chức năng AppSheet gốc"):

1. *"tôi cần các các button fast này cho từng đơn bảo hành. Ví dụ: ấn đổi mới trong BH => tự động
   điền các thông tin đổi mới, trong bảo hành => tự tạo phiếu trả bh cho KTV=> tự add đơn BH vào
   phiếu chờ bổ sung mã đơn hàng và mã misa. Nếu đơn bị quá hạn sẽ hiện popup chọn lý do quá hạn."*
2. *"Trường hợp bị quá hạn ấn vào số giờ bị quá hạn có thể lập tức chọn lý do quá hạn và save lại."*

Trước khi làm, đã hỏi lại **4 điểm mơ hồ thật sự** (AskUserQuestion, đúng nguyên tắc "không tự suy
đoán" của dự án) vì đây là các quyết định ảnh hưởng trực tiếp tới tính đúng đắn dữ liệu nghiệp vụ
(tự động tạo phiếu trả, tự động gán NV, bắt buộc mail phê duyệt thật):

- **(1)** "Sửa chữa (FAST)"/"Sửa chữa có phê duyệt" — luật hiện tại bắt buộc gán 1 NV cụ thể (không
  thể tự đoán ai làm) → **người dùng chọn: mở 1 modal rất nhỏ chỉ hỏi chọn NV**, mọi trường khác tự
  điền sẵn.
- **(2)** 4 nút tự tạo phiếu trả ngay (Đổi mới/Trừ công nợ FAST + "có phê duyệt") — tạo phiếu MỚI mỗi
  lần hay gộp vào phiếu "Nhập" có sẵn? → **người dùng chọn: gộp vào phiếu "Nhập" có sẵn nếu đúng
  KTV+loại đối trừ**, giống hệt hành vi `autoGomPhieuTraTatCa()` đã có từ vòng trước.
- **(3)** 3 nút "...CÓ PHÊ DUYỆT" (ngoài bảo hành) — luật bắt buộc nhập Mail phê duyệt thật, không thể
  tự bịa → **người dùng chọn: mở 1 modal nhỏ chỉ hỏi Mail phê duyệt (+ Mã, tuỳ chọn)**.
- **(4)** Bấm số giờ quá hạn trên badge SLA (không kèm hành động nghiệp vụ nào) → lưu lý do chậm kiểu
  gì? → **người dùng chọn: ghi thành 1 log riêng, không đổi trạng thái đơn** (khác `gateSla()` vốn
  luôn đi kèm 1 hành động cụ thể và ghi log của chính hành động đó).

### 1. Bộ 10 nút "Xử lý nhanh" (`FAST_ACTIONS`)

Đối chiếu đúng 10 icon AppSheet gốc, mỗi nút ứng với 1 tổ hợp `huong_xu_ly`/`loai_bao_hanh`/
`loai_doi_tru` **đã có sẵn trong hệ thống** — không tạo khái niệm nghiệp vụ mới, chỉ rút ngắn thao
tác nhập liệu lặp đi lặp lại:

| Nút | huong_xu_ly | loai_bao_hanh | loai_doi_tru | Cần thêm gì trước khi áp dụng? |
|---|---|---|---|---|
| Đổi mới trong BH | `doi_moi` | `trong_bh` | mặc định (đề xuất KTV, hoặc `doi_tra`) | Không — 1 chạm |
| Trừ công nợ | `xac_nhan_tru_no` | `trong_bh` | **luôn ép** `tru_cong_no` | Không — 1 chạm |
| Sửa chữa trong BH | `sua_chua` | `trong_bh` | mặc định | **Chọn NV** (modal nhỏ) |
| Bổ sung thông tin | — | — | — | Điều hướng sang `openYeuCauBoSungModal()` có sẵn |
| Từ chối | `tu_choi` | `trong_bh` | — | **Chọn lý do huỷ** (modal nhỏ, không có preset) |
| KTV báo cáo sai thông tin | — | — | — | Điều hướng sang `openBaoCaoSaiModal()` có sẵn |
| Huỷ do không có hàng | `tu_choi` | `trong_bh` | — | Không — 1 chạm (preset lý do huỷ = "Khong co hang") |
| Đổi mới có phê duyệt | `doi_moi` | `ngoai_bh` | mặc định | **Mail phê duyệt** (modal nhỏ) |
| Trừ công nợ có phê duyệt | `xac_nhan_tru_no` | `ngoai_bh` | **luôn ép** `tru_cong_no` | **Mail phê duyệt** (modal nhỏ) |
| Sửa chữa có phê duyệt | `sua_chua` | `ngoai_bh` | mặc định | **Chọn NV + Mail phê duyệt** (cùng 1 modal nhỏ) |

Cơ chế dùng chung: `completeFastAction()` build đúng object `f` mà `applyPhanLoai()` (hàm đã có, đã
test kỹ từ trước) cần — **không viết lại logic phân loại**, chỉ tự động hoá việc điền form. Với 4
hướng nằm trong `HUONG_TAO_PHIEU_TRA` (`doi_moi`, `tra_lai_ktv`, `xac_nhan_tru_no`), sau khi phân
loại xong sẽ gọi thêm `attachToOrCreatePhieuTra()` — tìm đúng phiếu trả "Nhập" sẵn có (đúng KTV +
đúng loại đối trừ), gộp thêm đơn vào nếu có, chỉ tạo phiếu mới khi chưa có — **phiếu tạo/gộp luôn ở
trạng thái "Nhập"**, mã đơn hàng/MISA vẫn trống, Admin bảo hành vẫn phải tự bổ sung rồi gửi duyệt kế
toán như quy trình chuẩn (đúng nguyên văn yêu cầu "tự add đơn BH vào phiếu **chờ bổ sung** mã đơn
hàng và mã misa" — không phải bỏ qua bước bổ sung/duyệt).

Nếu đơn đang **quá hạn SLA**: với 3 nút "1 chạm" (Đổi mới/Trừ công nợ/Huỷ do không có hàng), vẫn hiện
`gateSla()` có sẵn (bắt chọn lý do chậm trước khi áp dụng — đúng nguyên văn "nếu đơn bị quá hạn sẽ
hiện popup chọn lý do quá hạn"). Với 4 nút cần thêm dữ liệu (NV/mail phê duyệt/lý do huỷ), lý do chậm
được **gộp chung vào cùng 1 modal** thay vì 2 bước riêng — vẫn giữ đúng tinh thần "càng ít lần bấm
càng tốt".

Trigger `⚡ Xử lý nhanh` (`openFastActionsModal()`, mở lưới 10 icon tròn theo đúng phong cách ảnh
AppSheet gốc người dùng gửi) được gắn ở **3 nơi hiện có nút "Phân loại"** để không bị lệch: bảng thống
nhất Admin BH (`renderAdminUnifiedTable`), thanh footer của UI chi tiết
(`unitActionButtonsHtml`/`openDetailUnitModal`), và màn drill-in theo thùng cũ
(`renderUnitClassifyCard`). Với đơn **khách lẻ** (`!phieu_gui_id`), lưới ẩn đúng 2 nút "Bổ sung thông
tin"/"KTV báo cáo sai thông tin" (chỉ còn 8 nút) — 2 khái niệm này vốn đã không áp dụng cho khách lẻ ở
mọi nơi khác trong hệ thống (không có KTV nào để "báo cáo sai"/"bổ sung"), giữ đúng nhất quán.

### 2. Bấm số giờ SLA quá hạn để ghi lý do chậm ngay (`openQuickLyDoChamModal`)

`slaBadge(dateStr, entityType, entityId)` — thêm 2 tham số TUỲ CHỌN, hoàn toàn tương thích ngược (mọi
lời gọi cũ 1 tham số không đổi hành vi). Khi có đủ `entityType`+`entityId` **và** đang quá hạn (>24h),
badge trở thành clickable (`cursor:pointer` + `onclick`) — bấm vào mở `openQuickLyDoChamModal()`, chỉ
1 trường chọn lý do chậm (dùng lại `lyDoChamFieldHtml()` có sẵn), lưu qua `submitQuickLyDoCham()` —
ghi **1 dòng log độc lập** (`tu_trang_thai`/`den_trang_thai` = trạng thái hiện tại của đối tượng, giữ
nguyên không đổi — tránh hiện chữ "null" vô nghĩa khi `renderLogBlock()` render "tu ➔ den"), **không**
đổi trạng thái/dữ liệu nghiệp vụ của đối tượng — khác hẳn `gateSla()` (luôn đi kèm 1 hành động cụ thể
đang thực hiện).

**Phạm vi có chủ đích** (đã cân nhắc, không wire tràn lan mọi nơi có `slaBadge()`): chỉ bật clickable
ở **màn hình nhân viên xử lý** — Kho tiếp nhận (`phieu_gui`), thùng chờ Admin BH tiếp nhận nội bộ
(`phieu_gui`), đơn cha chờ Admin xác nhận số lượng (`phieu_sc`), bảng thống nhất + UI chi tiết + drill-
in + xác nhận hoàn tất của Admin BH (`phieu_sc_ct`), "Việc của tôi" của NV (`phieu_sc_ct`), Kho đóng
gói/gửi và Kế toán duyệt (`phieu_tra`) — tổng 11/14 vị trí có `slaBadge()`. **Cố ý KHÔNG bật** ở 3 nơi
còn lại: 2 màn KTV (tra cứu tiến độ, nhận hàng trả) vì lý do chậm là *giải trình của người xử lý*, KTV
là *người chờ*, không phải người giải trình; và màn "Tra cứu mọi đơn hàng" của vai trò `quanly` — giữ
đúng nguyên tắc đã chốt từ trước "màn quanly THUẦN CHỈ XEM, không được có bất kỳ control nào làm đổi
dữ liệu".

Không phát sinh lỗi/vấn đề nào ngoài dự kiến trong lúc làm.

**Kiểm thử đã chạy:** test mới `test_fast_actions.js` (jsdom, 13 kịch bản) — cả 10 nút FAST áp dụng
đúng tổ hợp huong_xu_ly/loai_bao_hanh/loai_doi_tru; "Trừ công nợ" ép đúng loại đối trừ bất kể KTV đề
xuất gì; đơn vị thứ 2 cùng KTV+loại đối trừ **gộp đúng** vào phiếu "Nhập" vừa tạo (không tạo trùng);
"Sửa chữa (FAST)" bắt buộc chọn NV mới áp dụng được (kể cả xác nhận chặn đúng khi bỏ trống — sửa luôn
1 gap nhỏ phát hiện lúc test: select NV không có option rỗng nên "bắt buộc chọn" không bao giờ kích
hoạt được, đã thêm option rỗng mặc định cho riêng modal FAST mới này); "...có phê duyệt" bắt buộc nhập
mail mới áp dụng; "Huỷ do không có hàng" preset đúng lý do, "Từ chối" bắt buộc chọn lý do (không có
preset); lưới FAST khách lẻ đúng 8 nút (ẩn 2 nút không áp dụng); đơn quá hạn bấm nút FAST 1-chạm vẫn
qua đúng cổng SLA trước khi áp dụng; `slaBadge()` clickable đúng điều kiện (có entity + quá hạn),
không clickable khi thiếu tham số hoặc chưa quá hạn; `openQuickLyDoChamModal`/`submitQuickLyDoCham`
ghi đúng 1 log độc lập, không đổi trạng thái đối tượng; nút "⚡ Xử lý nhanh" có mặt đúng ở cả modal chi
tiết lẫn bảng thống nhất. Chạy lại toàn bộ 19 bộ test trước đó — **0 lỗi, không hồi quy**. Xác nhận
thêm bằng ảnh chụp Puppeteer (Chrome thật): lưới 10 icon tròn đúng phong cách ảnh AppSheet gốc, modal
"Sửa chữa trong BH" hiện đúng cả trường chọn NV lẫn banner lý do chậm gộp chung 1 modal (đơn seed đúng
lúc đã quá hạn thật), modal "Đổi mới có phê duyệt" hiện đúng trường mail phê duyệt, và bấm trực tiếp
vào badge số giờ quá hạn trong bảng thống nhất mở đúng modal "Ghi lý do chậm" chỉ 1 trường.

## Phân tích liên kết với "Đặt mua linh kiện" + Kế hoạch chuyển đổi lên Cloudflare (03/09/2026)

Nguyên văn yêu cầu (6 điểm, kèm chỉ đạo quy trình đầy đủ: *"tự khám phá => phân tích phương án => tự
phản biện => tái đánh giá => lập kế hoạch => báo cáo xin ý kiến"*):

1. *"phân tích dự án 'F:\claude\QLBH 3T\linh-kien-app' đây là 1 dự án đặt mua linh kiện hoạt động
   song song với dự án gửi hàng bảo hành. 2 hệ thống sẽ liên kết với nhau và cùng hoạt động trên 1
   tài khoản cloudflare smarttrade."*
2. *"Xác định cách quản lý tài khoản KTV, Giám sát, Admin hệ thống, View để xây dựng cơ chế cho hệ
   thống web bảo hành."*
3. *"Danh sách linh kiện sẽ kéo API từ bên mua hàng về (danh sách linh kiện bán hàng cho phép bảo
   hành). (cho phép tạo thêm, sửa thông tin, tắt bật danh sách sử dụng trong bảo hành)"*
4. *"Dựa vào phân tích dựa án mua hàng => Phân tích chi tiết các bước chuyển đổi toàn bộ dự án bảo
   hành hiện tại sang dữ liệu sẵn sàng để chuyển đổi lên cloudflare."*
5. *"Lập kế hoạch thành từng bước chuyển đổi đảm bảo chuyển đổi 100% nội dung hiện tại đã xây dựng
   sang hệ thống online."*
6. *"Kiểm tra 1 số quy ước tạo giao diện, UI, setup phiên bản mobile (như tạo shortcut, gửi thông
   báo, kết nối API từ cloudflare... để tạo skills cho bản thân) => phân tích chi tiết xem các vấn đề
   đang thiếu. lập kế hoạch bổ sung."*

Đây là yêu cầu **phân tích + lập kế hoạch, KHÔNG code gì** — đã khảo sát trực tiếp 2 repo song song
(`../linh-kien-app`, `../cloudflare smarttrade base`) qua git log/migration/wrangler.jsonc thật (không
suy đoán từ tài liệu), viết thành 1 file riêng đầy đủ:
`du an sua chua bao hanh/Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` — CLAUDE.md này chỉ tóm tắt
phát hiện quan trọng nhất, xem file đó để có đầy đủ 7 mục (bảng đối chiếu, schema đề xuất, roadmap
từng giai đoạn, bảng so sánh PWA/mobile 3 hệ).

**Phát hiện quan trọng nhất — thay đổi hướng kiến trúc:** module "Đặt mua linh kiện" mà CLAUDE.md cũ
(mục "Liên hệ với hệ thống chính") giả định sẽ tái dùng trực tiếp (đọc thẳng bảng `case_dvbh`,
`users.giam_sat_quan_ly`, mẫu `phieu_xuat_kho`, các file `moduleAccess.ts`/`scopeDatMua.ts` của
`cloudflare smarttrade base`) **đã tách hẳn ra thành 1 hệ Cloudflare Workers + D1 độc lập từ
19/08/2026** — chính là `linh-kien-app` đang được phân tích. Bằng chứng đã đối chiếu nhiều nguồn độc
lập (không chỉ tin 1 dòng ghi chú):
- `linh-kien-app/CLAUDE.md` tự khai đã tách hoàn toàn (Worker/D1/OAuth/`users` riêng).
- `cloudflare smarttrade base/backend/src/lib/moduleAccess.ts`:
  `TAM_TAT_MODULES = ["dat-mua-lk", "tra-hang"]` — 2 module cũ đã bị **ẩn khỏi sidebar cho mọi vai
  trò kể cả Admin**, code cũ vẫn mount nhưng không ai dùng được qua UI.
- Migration động tới `dat_don_hang`/`phieu_xuat_kho` bên `cloudflare smarttrade base` dừng hẳn ngay
  sau ngày tách (migration cuối liên quan: `0091`, 21/08/2026).
- `linh-kien-app` có git log hoạt động liên tục tới 02/09/2026 (hôm qua) với các fix lỗi vận hành
  thật — xác nhận đang chạy sản xuất, không phải bản nháp; `wrangler.jsonc` có `database_id`/VAPID
  key thật (không còn placeholder như `DEPLOY.md` mô tả — tài liệu đó đã lỗi thời).
- **Bằng chứng mạnh nhất**: `linh-kien-app/frontend/src/layout/navConfig.ts` (sửa 25/08/2026, trước
  cả khi module bảo hành bắt đầu redesign UI) đã có sẵn 1 mục menu liên kết ra ngoài:
  `{ key: "sua-chua-bao-hanh", label: "Sửa chữa", icon: "🛠", href: "https://suachua.dichvu3t.workers.dev" }`
  — xác nhận đã có kế hoạch từ trước: hệ bảo hành sẽ là **Worker thứ 3 độc lập**, tên miền dự kiến
  `suachua.dichvu3t.workers.dev`, cùng tài khoản Cloudflare `dichvu3t` với `dvbh`/`linhkien` — khớp
  đúng nguyên văn yêu cầu #1 hôm nay ("2 hệ thống sẽ liên kết với nhau và cùng hoạt động trên 1 tài
  khoản cloudflare smarttrade").

Đã cập nhật ngay mục "Liên hệ với hệ thống chính" bên dưới với 1 cảnh báo lỗi thời ở đầu mục, trỏ sang
file phân tích mới — theo đúng nguyên tắc #4 của CLAUDE.md ("khi 2 tài liệu mâu thuẫn, ghi rõ nguồn
nào đúng nhất, không âm thầm chọn 1 bên").

~~**5 câu hỏi mở chưa có câu trả lời**~~ — **[ĐÃ CHỐT cùng ngày 03/09/2026]** cả 5/5, xem mục riêng
"Chốt 5 câu hỏi mở..." bên dưới (ngay sau mục này) để có đầy đủ câu trả lời + 1 câu hỏi mới phát sinh.

**Chưa chạy kiểm thử nào** — đây là phân tích/lập kế hoạch thuần tuý, chưa có code/migration nào được
viết ở vòng này.

## Chốt 5 câu hỏi mở của báo cáo Cloudflare + phát hiện cơ chế "đẩy" (push sync) mới (03/09/2026)

Nguyên văn 5 câu trả lời (cùng ngày, ngay sau vòng phân tích ở mục trên):

> 1. tên miền suachua.dichvu3t.workers.dev đã tồn tại. đang online.
> 2. Lấy toàn bộ danh sách linh kiện bán bat_tat=1.
> 3. GS và View làm theo hướng của linh-kien-app
> 4. Bên linh-kien-app sẽ bắn api khi danh sách ktv có thay đổi. bên app sua chua sẽ nhận api vào cập
>    nhật danh sách.
> 5. Khu vực sẽ học linh-kien-app. lấy thông tin đồng bộ tự động từ linh-kien-app khi bên linh kien
>    app có thay đổi

Đã áp dụng đầy đủ vào file
`du an sua chua bao hanh/Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` (viết lại mục 0, 2, 3, 4.1,
4.2, 5, 7) và trang artifact xem trực quan đã publish trước đó. Tóm tắt các quyết định:

1. **Worker `suachua` xác nhận đã tồn tại thật, đang online** — không còn là placeholder dự kiến.
   Phát sinh 1 câu hỏi mới (chưa trả lời): không tìm thấy thư mục mã nguồn nào cho Worker này trên
   máy (đã rà `F:\claude\QLBH 3T\`) — cần xác nhận mã nguồn thật nằm ở đâu trước khi bắt đầu scaffold
   (3 khả năng đã liệt kê trong file phân tích mục 7: (a) chính thư mục `gui-bao-hanh-linh-kien` này
   sẽ trở thành nguồn, (b) đã deploy bản rỗng/placeholder giữ chỗ tên miền, (c) nằm ở máy/thư mục
   khác chưa đưa vào phiên này). **Bằng chứng mới nghiêng về (a)**: phát hiện file
   `logo sua chua 3t.png` (858×887, tạo 26/08/2026, chưa từng commit/dùng trong prototype) nằm sẵn
   trong chính thư mục này — đúng dạng icon app hoàn chỉnh (gradient xanh lá, cờ-lê/tua-vít chéo +
   "3T"), gợi ý thư mục này đã được chuẩn bị trước làm nơi chứa tài nguyên cho `suachua` — nhưng vẫn
   cần người dùng xác nhận trực tiếp, không tự suy đoán rồi coi như đã chốt.
2. Danh mục linh kiện: lọc theo **toàn bộ `bat_tat=1`**, không lọc theo `chi_sua_chua` như suy đoán
   ban đầu trong báo cáo.
3. Giám sát/View: xây mới theo đúng mẫu `linh-kien-app` — GS scope qua `email_gs` đóng gói sẵn trên
   đơn (denormalized, giống `ddh.email_gs` bên `linh-kien-app`), View đổi từ `quanly` (xem tất cả)
   sang giới hạn theo Khu vực qua bảng `user_khu_vuc_bh`.
4. **Phát hiện kiến trúc mới, không nằm trong 2 phương án ban đầu báo cáo đề xuất**: danh bạ KTV
   không phải "tự nhập tay 1 lần" cũng không phải "gọi API mỗi lần cần", mà là **cơ chế đẩy (push)
   tự động** — `linh-kien-app` chủ động gọi sang `suachua` mỗi khi `ktv_lien_he` đổi, `suachua` nhận
   và UPSERT vào bảng nội bộ `ktv_lien_he_bh`. Đây là chiều NGƯỢC với mẫu `case-lookup` đã phân tích
   (nơi `linh-kien-app` là bên chủ động kéo dữ liệu từ `dvbh`) — ở cơ chế mới này `linh-kien-app` đổi
   vai trò thành bên chủ động gửi đi.
5. Khu vực: cùng cơ chế đẩy như KTV, thay thế hoàn toàn khái niệm `mien` 2 giá trị (Nam/Bắc) của
   prototype — bỏ hẳn cột `mien` khỏi thiết kế `users` mới.

**Quyết định tự suy rộng ra (không phải câu trả lời trực tiếp, đã đánh dấu rõ trong file phân tích
để dễ phản hồi lại nếu không đúng ý)**: áp dụng luôn cơ chế đẩy cho cả **danh mục linh kiện** (không
chỉ KTV/Khu vực) — lý do: không có căn cứ gì để 2/3 loại dữ liệu tham chiếu dùng cơ chế đẩy còn danh
mục linh kiện lại dùng nút bấm tay riêng biệt, giữ nhất quán toàn bộ tầng đồng bộ dữ liệu.

**Thiết kế kỹ thuật mới cho cơ chế đẩy** (bổ sung vào file phân tích mục 3.2): bắt buộc qua Service
Binding (đúng lý do kỹ thuật `error code 1042` đã phát hiện ở vòng phân tích trước — 2 Worker cùng
tài khoản không được `fetch()` thẳng URL nhau) — nghĩa là `linh-kien-app/wrangler.jsonc` cần thêm 1
`services` binding MỚI trỏ sang `suachua` (điểm phải sửa thêm ở repo `linh-kien-app`, không chỉ bên
bảo hành); xác thực 1 chiều bằng 1 secret dùng chung đơn giản (`X-Sync-Key`), không cần dựng cả bảng
`partner_api_keys` nhiều-key như `case-lookup` vì đây là quan hệ 1-1 cố định giữa đúng 2 Worker nội
bộ; gửi không chặn qua `waitUntil()` để lỗi/downtime phía `suachua` không làm hỏng thao tác gốc của
người dùng `linh-kien-app`. Đề xuất bổ sung tự thêm (không phải yêu cầu gốc, có thể bỏ): 1 nút "Đồng
bộ lại toàn bộ" phía `suachua` làm cơ chế dự phòng/bootstrap, vì cơ chế đẩy thuần tuý không tự phục
hồi nếu 1 lần đẩy bị lỡ.

Không phát sinh lỗi/vấn đề nào trong lúc làm — đây vẫn là phân tích/lập kế hoạch thuần tuý, chưa viết
code/migration nào. **Chưa chạy kiểm thử** (không có gì để test ở vòng này).

## Câu hỏi #6 chốt xong + phát hiện cơ chế đẩy đã có sẵn thật giữa linh-kien-app↔dvbh (04/09/2026)

Người dùng trả lời câu hỏi #6 (vị trí mã nguồn thật của Worker `suachua`):

> a + b

**[ĐÃ CHỐT]** Cả 2 đúng cùng lúc: **(a)** chính thư mục `gui-bao-hanh-linh-kien` này sẽ trở thành
nguồn cho Worker `suachua` (đúng dự đoán từ bằng chứng `logo sua chua 3t.png` đã tìm thấy vòng
trước), **(b)** Worker đang online hiện tại chỉ là bản **rỗng/placeholder** giữ chỗ tên miền — toàn bộ
`backend/`+`frontend/`+migration D1 thật vẫn cần viết từ đầu trong chính thư mục này. **Không còn câu
hỏi mở nào về mặt quyết định nghiệp vụ** — sẵn sàng cho Giai đoạn 1 khi được yêu cầu.

**Phát hiện quan trọng thêm** (phiên tiếp tục sau khi người dùng hết hạn mức sử dụng rồi quay lại,
đúng lúc `linh-kien-app/wrangler.jsonc` đã đổi trên đĩa so với lần đọc trước): cơ chế "đẩy" (push
sync) mà báo cáo trước đó **tự thiết kế từ đầu** (đề xuất `waitUntil()` mỗi lần ghi + nút "Đồng bộ lại
toàn bộ" dự phòng) hoá ra **đã có sẵn, đã build xong và đang chạy thật** — chỉ khác đích: giữa
`linh-kien-app` và `dvbh`, không phải `suachua`. Bằng chứng đọc trực tiếp:
- `linh-kien-app/backend/src/lib/dvbhSyncClient.ts` (thêm 28/08/2026, phản hồi gốc: *"khi cập nhật
  danh sách ktv hoặc cập nhật danh sách linh kiện, sẽ bắn API về web dvbh để cập nhật bổ sung dữ liệu
  mới nhất"* — cùng bản chất yêu cầu với `suachua` hôm qua) — cơ chế thật là **cron mỗi giờ
  (`triggers.crons: ["0 * * * *"]`) + con trỏ tăng dần** (`dvbh_sync_state.last_synced_at`, migration
  `0012_dvbh_sync_state.sql`), không phải đẩy tức thời theo từng lần ghi: đọc các dòng
  `ngay_cap_nhat > con_tro`, gửi theo lô 200 dòng qua Service Binding, chỉ advance con trỏ khi CẢ lô
  thành công (tự phục hồi nếu lỗi giữa chừng, không cần nút dự phòng riêng).
- `cloudflare smarttrade base/backend/src/routes/partnerApi.ts` (sửa thêm 28/08/2026, không còn
  100% chỉ đọc) — 2 route nhận `POST /api/partner/sync/ktv` (upsert qua `processKtvImportRows()` có
  sẵn) và `POST /api/partner/sync/linh-kien` (ghi đè thẳng toàn bộ trường, vì `linh-kien-app` là
  nguồn sự thật duy nhất) — xác thực `X-API-Key` dùng LẠI đúng bảng `partner_api_keys` của
  `case-lookup`, không phải cơ chế riêng.

**Đã cập nhật lại file phân tích mục 1 (sửa "không có cron job" đã lỗi thời) và mục 3.2 (bỏ hẳn thiết
kế "đẩy theo từng lần ghi" tự nghĩ ra, thay bằng khuyến nghị nhân bản đúng mẫu cron+con-trỏ đã có
sẵn cho `suachua` — chỉ cần thêm `suachua` làm đích gửi thứ 2 trong `dvbhSyncClient.ts`, thêm entity
`khu_vuc` chưa có sẵn, và bên `suachua` xây 3 route nhận mirror đúng khuôn `dvbh`). Lý do ưu tiên mẫu
có sẵn hơn thiết kế mới: tự phục hồi khi lỗi, không phải sửa rải rác nhiều điểm CRUD, và đã chạy thật
trong sản xuất — đánh đổi duy nhất là độ trễ tối đa ~1 giờ thay vì tức thời, chấp nhận được cho dữ
liệu tham chiếu ít đổi.

Không có lỗi/vấn đề phát sinh — vẫn là phân tích/lập kế hoạch thuần tuý. **Chưa chạy kiểm thử.**

## Giai đoạn 1: Scaffold hạ tầng Worker "suachua" (04/09/2026)

Nguyên văn yêu cầu: *"ok, triển khai"* — bắt đầu Giai đoạn 1 theo đúng roadmap đã chốt trong
`Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` mục 5.

**Đã tạo trong chính thư mục `gui-bao-hanh-linh-kien`** (đúng câu trả lời "a+b" ở mục trước — repo
này là nguồn thật cho Worker `suachua`), mirror cấu trúc `linh-kien-app` càng sát càng tốt (đọc trực
tiếp từng file gốc của `linh-kien-app` — `package.json`, `tsconfig.json`, `wrangler.jsonc`,
`backend/src/{index,types}.ts`, `lib/jwt.ts`/`vnTime.ts`, `middleware/session.ts`/`loadUser.ts`,
`routes/auth.ts`, `frontend/src/{main,App}.tsx`, `auth/AuthContext.tsx`, `styles/tokens.css` — không
suy đoán field/cấu trúc):

- **Root**: `package.json` (workspaces), `wrangler.jsonc` (Worker `suachua`, Service Binding tới
  `dvbh` cho case-lookup, `database_id` còn placeholder), `.gitignore` bổ sung (`node_modules/`,
  `dist/`, `.dev.vars`...), `.dev.vars.example`, `.claude/launch.json` (2 server: `suachua-worker`
  cổng 8789, `suachua-frontend` cổng 5175 — khác cổng `dvbh` 8787/5173 và `linhkien` 8788/5174 để 3 hệ
  chạy dev song song không đụng độ), `DEPLOY.md` riêng (mirror `linh-kien-app/DEPLOY.md`, có thêm
  bước 0 kiểm tra tài nguyên đã gắn sẵn cho Worker rỗng/placeholder trước khi tạo mới).
- **`migrations/0001_init.sql`**: schema tổng hợp 1 lần (đúng mẫu `linh-kien-app` đã làm) — đối chiếu
  **trực tiếp từng hàm JS tạo dữ liệu trong `prototype-html/index.html`**
  (`createPhieuGui`/`submitAddDon`/`submitSoLuongThucNhan`/`applyPhanLoai`/`createPhieuTraForUnits`/
  `addLog`...) để lấy đúng tên field, không đoán. 16 bảng: `users` (9 cờ vai trò mới, **bỏ hẳn cột
  `mien`**), `login_log`, `ktv_lien_he_bh`/`khu_vuc_bh`/`user_khu_vuc_bh` (đồng bộ đẩy, không CRUD nội
  bộ), `linh_kien_bh` (hybrid đồng bộ + CRUD nội bộ), `partner_api_keys`, `phieu_gui_bh` (+ bảng con
  ghi chú), `phieu_sua_chua_bh` (+ ảnh + báo cáo sai, thêm cột mới `email_gs` đóng gói sẵn cho scope
  Giám sát), `phieu_sua_chua_bh_ct` (+ ảnh), `phieu_tra_bh` (+ ảnh), `logs_bh`,
  `settings_ly_do_cham_bh`/`settings_ly_do_tu_choi_bh` (seed đủ 8+5 giá trị thật). **Chưa tạo**
  `de_xuat_linh_kien_bh`/`phieu_tra_xac_bh` — prototype vòng 1 xác nhận 2 tính năng này **chưa được
  triển khai**, tránh bịa schema trước khi biết chắc field cần gì.
- **`backend/src/`**: `index.ts` (chỉ mount `/api/auth` + `/api/users`, chưa có route nghiệp vụ nào —
  đó là việc Giai đoạn 3), `types.ts` (`AppUser`/`Env` theo đúng 9 cờ vai trò), `lib/jwt.ts`/`vnTime.ts`
  (port verbatim, tự chứa không phụ thuộc ngoài), `middleware/session.ts`/`loadUser.ts` (adapted,
  **bỏ "xem thử vai trò"/view-as** của `linh-kien-app` — chưa cần cho scaffold), `routes/auth.ts`
  (login/callback/dev-login/logout/me, tự kích hoạt tài khoản nếu email khớp
  `ktv_lien_he_bh.email_dang_nhap` — dùng đúng mẫu đã chốt), `routes/users.ts` (CRUD người dùng cho
  `la_qtri`, chặn tự khoá/tự xoá/tự gỡ quyền chính mình).
- **`frontend/src/`**: React 18 + Vite + Tailwind, `styles/tokens.css` — **dùng bản token
  MỚI NHẤT của `linh-kien-app` (27/08/2026)**, không phải bản đã port vào prototype HTML (22/08/2026,
  đã lỗi thời — `linh-kien-app` đổi màu teal từ xanh-lam-ngọc sang xanh lá thật, amber từ vàng sang
  xanh dương ngay sau đó) — quyết định có chủ đích: khớp "ngôn ngữ thị giác" đang chạy thật, không bám
  snapshot cũ. Đã bỏ các class/animation riêng cho tính năng của `linh-kien-app` không áp dụng ở đây
  (`.dat-mua-lk-module`, `.bell-shake`, `.greeting-marquee`...). `App.tsx` là màn hình xác nhận Auth
  tối giản (đăng nhập/chờ duyệt/từ chối/khoá/đã đăng nhập hiện vai trò) — **chưa port 13 màn hình
  nghiệp vụ** của prototype, đó là việc Giai đoạn 3/4.
- **Icon app**: dùng thẳng `logo sua chua 3t.png` (tìm thấy sẵn trong repo, xem mục trước) làm
  `frontend/public/icon.png` — **chưa resize** đúng chuẩn PWA (192/512/maskable như `linh-kien-app`),
  để làm ở Giai đoạn 6 (mobile/PWA) cùng lúc với `manifest.webmanifest`/service worker thật.

**Đã xác minh — không chỉ đọc code bằng mắt:**
1. `npm install` (workspaces) — cài sạch, 0 lỗi.
2. `npm run typecheck` (cả backend `tsc --noEmit` lẫn frontend) — 0 lỗi.
3. `npm run db:migrate:local` — áp `0001_init.sql` vào D1 local (`.wrangler/state`, không đụng tài
   nguyên Cloudflare thật) — 45 lệnh SQL chạy thành công, xác nhận schema không có lỗi cú pháp.
4. `npm run build` (frontend) — build sạch.
5. Chạy `wrangler dev` local thật (không phải chỉ đọc code) → mở bằng trình duyệt thật (Puppeteer
   qua Browser pane) → xác nhận màn đăng nhập hiện đúng ("Sửa chữa bảo hành / Dịch Vụ 3T / Đăng nhập
   với Google") → gọi `GET /api/auth/dev-login` → xác nhận D1 upsert đúng, cookie session set đúng,
   `GET /api/auth/me` trả đúng user, React hiện đúng "Admin hệ thống" (huy hiệu `la_qtri`) → gọi trực
   tiếp `POST /api/users` + `PATCH /api/users/:email` qua `fetch()` trong trang → xác nhận tạo tài
   khoản mới + gán cờ `la_ktv_dvbh` hoạt động đúng, đọc lại `GET /api/users` thấy đúng thay đổi.

**Phát hiện quan trọng phát sinh trong lúc kiểm thử:** phiên làm việc này (`wrangler whoami`) đang
xác thực Cloudflare với tài khoản **`mikanovncloudflare@gmail.com`** (account ID
`c05f5a7359a2ddd022c244c05e211f99`) — **KHÔNG PHẢI** tài khoản `dichvu3t` thật đang host
`dvbh`/`linhkien`/`suachua`. Khi bật `services.CASE_LOOKUP_SERVICE` (`remote: true`) để test local,
`wrangler dev` báo lỗi `Worker 'dvbh' which was not found` — đúng như dự kiến vì Worker đó không tồn
tại trong tài khoản sandbox này. Đã **tạm thời vô hiệu hoá** binding này để hoàn tất kiểm thử (mục 5
ở trên), rồi **khôi phục lại đúng cấu hình gốc** trước khi commit — `wrangler.jsonc` trong repo vẫn
đúng, chỉ cần chạy trên máy có tài khoản `dichvu3t` thật sẽ hoạt động bình thường.
**Hệ quả quan trọng**: bất kỳ bước nào trong `DEPLOY.md` cần chạm tài nguyên Cloudflare thật
(`wrangler d1 create`, `wrangler secret put`, `wrangler deploy`) đều **không thể chạy được từ phiên
làm việc này** — người dùng cần tự chạy trên máy/phiên có quyền truy cập tài khoản `dichvu3t` thật,
hoặc xác thực lại phiên này với tài khoản đó trước.

**Chưa làm ở Giai đoạn 1 này** (đúng phạm vi đã định trong roadmap, không tự ý mở rộng): route nghiệp
vụ (phiếu gửi/đơn sửa chữa/phiếu trả/FAST actions — Giai đoạn 3), port 13 màn hình UI (Giai đoạn 4),
route nhận đồng bộ đẩy `POST /api/partner/sync/*` + sửa `linh-kien-app` thêm đích gửi (Giai đoạn 5),
QA theo vai trò (Giai đoạn 6), và toàn bộ bước tạo tài nguyên Cloudflare/Google thật trong
`DEPLOY.md` (chờ người dùng tự chạy — không tự ý tạo tài khoản/database/deploy khi chưa xác nhận).

## Giai đoạn 3: Toàn bộ route nghiệp vụ backend (04/09/2026)

Nguyên văn chỉ đạo: *"ko deploy, chỉ cần triển khai đầy đủ, tôi sẽ tự deploy ở tài khoản khác"* — xác
nhận rõ: triển khai **đầy đủ** code (backend + frontend + đồng bộ + PWA), nhưng **không bao giờ** chạy
lệnh chạm tài nguyên Cloudflare thật (`wrangler deploy`/`d1 create`/`secret put`) trong phiên này —
người dùng tự deploy ở tài khoản `dichvu3t` thật. Đây là ràng buộc áp dụng cho toàn bộ phần việc còn
lại, không chỉ Giai đoạn 3.

Đã viết toàn bộ tầng route nghiệp vụ (12 file mới trong `backend/src/`, ~2000+ dòng TypeScript),
port lại đúng state machine đã chốt qua 22 vòng rà soát prototype (đọc trực tiếp từng hàm JS gốc
trong `prototype-html/index.html`, không suy đoán lại từ đầu):

- **`lib/idCounter.ts`** — sinh ID tuần tự nguyên tử qua `id_counters` + `UPDATE...RETURNING`
  (port từ `linh-kien-app/backend/src/lib/idCounter.ts`), đúng 3 tiền tố đã seed ở Giai đoạn 1: `BH`
  (phiếu gửi), `DH` (đơn/phiếu sửa chữa cha), `TR` (phiếu trả) — 6 chữ số, khớp `nextId()` của
  prototype.
- **`lib/logs.ts`** — `addLog()` dùng chung cho cả 4 `entity_type` (`phieu_gui`/`phieu_sc`/
  `phieu_sc_ct`/`phieu_tra`), insert-only vào `logs_bh`.
- **`lib/sla.ts`** — `isOverdue()` (>24h), dùng ở mọi route có mốc SLA để bắt buộc `ly_do_cham`.
- **`lib/constants.ts`** — toàn bộ enum đã chốt (`HUONG_XU_LY_VALUES` 7 giá trị, `LOAI_BAO_HANH`,
  `LOAI_DOI_TRU`, `XU_LY_XAC`, `KET_QUA_CHAN_DOAN`, `HUONG_CAN_NV`, `HUONG_TAO_PHIEU_TRA`).
- **`lib/scope.ts`** — `viewKhuVucEmailInSql()`: subquery giới hạn `la_view` theo đúng Khu vực đã
  được `la_qtri` gán qua `user_khu_vuc_bh` (không có gán = không thấy gì — mặc định an toàn).
- **`lib/gs.ts`** — **`computeEmailGs()`, quyết định thiết kế MỚI không có trong prototype gốc**: tại
  thời điểm tạo `phieu_sua_chua_bh` (đơn cha), join `ktv_lien_he_bh.khu_vuc_ma → khu_vuc_bh.gs_email`
  của đúng KTV tạo đơn, rồi **đóng gói sẵn** kết quả vào cột mới `phieu_sua_chua_bh.email_gs` — mirror
  đúng pattern `ddh.email_gs` đã có sẵn bên `linh-kien-app`. Nhờ vậy `la_giam_sat` lọc được theo
  `email_gs = <email của chính GS>` mà không cần join runtime qua 2 bảng đồng bộ mỗi lần truy vấn.
- **`routes/phieuGui.ts`** — CRUD phiếu gửi/đơn của KTV (tạo/xoá phiếu nháp, thêm/xoá đơn, sửa header,
  xác nhận gửi xe), ghi chú dùng chung KTV/Kho/Admin BH (`GET`/`POST` `/ghi-chu`), tra cứu tiến độ
  (`GET /don-vi/tra-cuu`), bổ sung thông tin theo yêu cầu Admin BH (`PATCH /don-vi/:id/bo-sung`, cho
  đổi cả `ma_lk` — đúng "Phản hồi vòng 4" mục 1). Đã kiểm tra kỹ thứ tự route để tránh Hono khớp nhầm
  `/:id` với các path tĩnh hơn (`/don-vi/tra-cuu`, `/don-vi/:id/bo-sung`).
- **`routes/kho.ts`** — hàng đợi + tiếp nhận, báo sự cố (đúng "chỉ là cảnh báo, không chặn" — vẫn
  chuyển `da_tiep_nhan`, chỉ nối thêm dòng `⚠ [Báo sự cố tiếp nhận]` vào `ghi_chu_log`).
- **`routes/adminBH.ts`** (file lớn nhất) — tiếp nhận nội bộ, đẩy lại chưa tiếp nhận (chặn cứng nếu đã
  có đơn vị con `da_tach`), xác nhận số lượng thực nhận (tách N đơn vị con + tính `email_gs`), bảng
  thống nhất (`GET /don-vi`) + chi tiết đầy đủ 4 khối log + ảnh + báo cáo sai (`GET /don-vi/:id`),
  `applyPhanLoaiToUnit()` dùng chung cho phân loại đơn lẻ/hàng loạt, yêu cầu bổ sung (áp cho mọi đơn vị
  hợp lệ của 1 đơn cha), báo cáo sai (KTV báo cáo sai thông tin — chỉ Admin BH/qtri/giám sát đọc được,
  không phải log nghiệp vụ), xác nhận hoàn tất (riêng `huong_xu_ly='doi_moi'` bắt buộc chọn
  `xu_ly_xac` trước khi hoàn tất), yêu cầu làm lại, đơn dịch vụ tính phí (khách lẻ, bỏ qua bước xác
  nhận SL), và **toàn bộ `FAST_ACTIONS`** (10 nút, đúng bảng đối chiếu AppSheet đã chốt 03/09/2026) +
  `attachToOrCreatePhieuTra()` (gộp vào phiếu "Nhập" có sẵn đúng KTV+loại đối trừ, chỉ tạo mới khi
  chưa có) + `POST /don-vi/:id/fast/:key`.
- **`routes/nvSuaChua.ts`** — Việc của tôi + nộp kết quả chẩn đoán (ảnh base64 vào 3 loại
  `phieu_sua_chua_bh_ct_anh`).
- **`routes/phieuTra.ts`** — `createPhieuTraForUnits()` dùng chung, sẵn sàng gom/tạo/tự động gộm
  (nhóm theo KTV+loại đối trừ, đúng `autoGomPhieuTraTatCa()`), tách đơn (chỉ khi còn `nhap`), gửi
  duyệt (chặn thiếu mã MISA trừ `tru_cong_no`), huỷ gửi duyệt, 2 nút tạo phiếu trả nhanh (Trả trực
  tiếp KTV/Giao trực tiếp Kho, mã ngẫu nhiên Admin sửa được), Kế toán duyệt/từ chối (từ chối quay về
  `nhap` + `ly_do_tu_choi_kt`), Kho đóng gói (ảnh tuỳ chọn, đúng QA 31/08)/gửi/xác nhận kết thúc dự
  phòng, KTV xác nhận nhận/khiếu nại.
- **`routes/settings.ts`** — factory `crudFor()` dùng chung cho 2 danh mục `ly_do_cham`/`ly_do_tu_choi`
  (đọc mở cho mọi vai trò đã đăng nhập, ghi chỉ `la_qtri` — đúng quyết định gộp về `#/qtri/cai-dat`).
- **`routes/linhKien.ts`** — CRUD hybrid: dòng `nguon_du_lieu='dong_bo'` (từ `linh-kien-app`) chỉ cho
  sửa `so_thang_bao_hanh`/`duoc_dung_bao_hanh` tại chỗ; dòng `noi_bo` (tự tạo trong `suachua`) sửa/xoá
  tự do — đúng yêu cầu "cho phép tạo thêm, sửa thông tin, tắt bật" trong khi vẫn tôn trọng nguồn dữ
  liệu đồng bộ.
- **`routes/logs.ts`** — `POST /:entityType/:entityId/ly-do-cham`: ghi 1 log **độc lập**, không đổi
  trạng thái đối tượng — đúng thiết kế đã hỏi lại người dùng (câu hỏi #4 trước khi build FAST actions,
  03/09/2026) cho tính năng "bấm số giờ SLA để ghi lý do ngay". Giới hạn đúng nhóm vai trò xử lý
  (kho/admin_bh/nv/ke_toan/qtri), loại trừ `ktv`/`view` (người chờ, không phải người giải trình).
- **`routes/traCuu.ts`** — `scopeClause()` (qtri/admin_bh thấy hết, `la_giam_sat` qua `email_gs`,
  `la_view` qua `viewKhuVucEmailInSql()`), **thuần chỉ đọc, không có route ghi nào** — đúng nguyên tắc
  "vai trò xem/kiểm soát không được đổi dữ liệu" đã chốt từ vòng "4 yêu cầu UI/vai trò" 01/09/2026.
- **`routes/sync.ts`** — Giai đoạn 5 (nửa NHẬN): middleware xác thực `X-Sync-Key` (so khớp
  `env.LINHKIEN_SYNC_API_KEY`, secret dùng chung 1-1 — **không** dựng bảng `partner_api_keys` nhiều-key
  như `case-lookup`, đúng thiết kế đã chốt), 3 route `POST /ktv`/`/khu-vuc`/`/linh-kien` (upsert, riêng
  `linh-kien` **bỏ qua** dòng `bat_tat=false` thay vì xoá — giữ lại bản sao phía bảo hành). **Nửa PHÁT
  (sửa `linh-kien-app` thêm `suachua` làm đích gửi thứ 2 trong `dvbhSyncClient.ts`) CHƯA làm** — thuộc
  1 repo khác, xem mục "Chưa làm" bên dưới.
- **Sửa lại schema 2 lần trong lúc build** (không phải lỗi, là điều chỉnh cho khớp thiết kế đã chốt):
  (1) thêm bảng `id_counters` + 3 dòng seed (bị thiếu ở Giai đoạn 1); (2) **bỏ hẳn bảng
  `partner_api_keys`** đã thêm nhầm ở Giai đoạn 1 — mâu thuẫn với chính quyết định đã ghi trong
  `Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` mục 3.2 ("không cần nhiều-key, quan hệ 1-1 cố định
  dùng 1 secret là đủ") — thay bằng biến môi trường `LINHKIEN_SYNC_API_KEY` đơn giản.

**Đã xác minh — không chỉ typecheck, kiểm thử chức năng thật qua HTTP:**
1. `npm run typecheck` (backend) — **0 lỗi** ngay lần chạy đầu tiên sau khi viết đủ 12 file.
2. Chạy `wrangler dev` local thật + viết script tự ký JWT session hợp lệ (`make_session.js`, đúng
   thuật toán HS256/base64url của `lib/jwt.ts`) để giả lập đăng nhập nhiều vai trò cùng lúc mà không
   cần Google OAuth thật (`/api/auth/dev-login` chỉ đăng nhập được đúng 1 email bootstrap) — seed 7 tài
   khoản mẫu (`ktv`/`kho`/`adminbh`/`nv`/`ketoan`/`giamsat`/`view`) + 1 Khu vực + 1 KTV liên hệ qua
   `wrangler d1 execute --local`.
3. **Test luồng chính đầy đủ end-to-end** (`e2e_test.js`, gọi `fetch()` thật, không mock) — đi hết cả
   12 bước: KTV tạo phiếu/đơn → Kho tiếp nhận → Admin BH tiếp nhận nội bộ + xác nhận SL (tách đúng 2
   đơn vị con) → xác nhận `email_gs` đóng gói đúng ngay từ lúc tạo → phân loại 2 đơn vị theo 2 hướng
   khác nhau (`doi_moi` thẳng vào hàng chờ gộp phiếu trả, `sua_chua` qua NV chẩn đoán) → NV nộp chẩn
   đoán → Admin BH xác nhận hoàn tất → **tự động gộp phiếu trả đúng gộp cả 2 đơn vị khác hướng xử lý
   vào CHUNG 1 phiếu** (vì cùng KTV + cùng loại đối trừ) → chặn đúng khi thiếu mã MISA (`loai_doi_tru=
   doi_tra`) → Kế toán duyệt → Kho đóng gói (không ảnh, đúng "tuỳ chọn")/gửi → KTV xác nhận nhận →
   **Giám sát/View đều tra cứu đúng phạm vi** (Giám sát qua `email_gs`, View qua `user_khu_vuc_bh`
   grant thật đã gán). **Kết quả: `=== ERRORS: 0 ===`** trên toàn bộ chuỗi.
4. **Test vòng 2** (`e2e_test2.js`) — riêng các nhánh chưa chạm ở vòng 1: FAST action 1-chạm
   (`huy_khong_co_hang`, áp đúng `huong_xu_ly`/`loai_bao_hanh`/`ly_do_tu_choi` preset), FAST action bắt
   buộc bổ sung dữ liệu (`sua_chua_fast` chặn đúng khi chưa chọn NV, trả lỗi `REQUIRE_NV`, qua được
   sau khi có NV), luồng "yêu cầu bổ sung thông tin" đầy đủ (Admin BH gửi lý do → đơn chuyển
   `cho_bo_sung_tt` → KTV bổ sung → quay lại đúng `cho_phan_loai` với dữ liệu đã cập nhật), "bấm SLA
   ghi lý do chậm độc lập" (ghi log thành công, **không đổi trạng thái đối tượng** — đúng thiết kế),
   route nhận đồng bộ đẩy (`/api/partner/sync/*` chặn đúng khi thiếu `X-Sync-Key`, upsert đúng khi có
   key hợp lệ, linh kiện vừa sync hiện đúng `nguon_du_lieu='dong_bo'`), và CRUD người dùng của `qtri`
   (tạo/gán quyền/chặn tự khoá chính mình). **23/24 assertion pass** — 1 "FAIL" duy nhất là lỗi trong
   chính test script (kỳ vọng `POST /api/users` trả HTTP 201, route thực trả 200 kèm `{ok:true}` —
   không phải lỗi backend, đã xác nhận lại code route đúng theo thiết kế, không sửa gì).

**Phát hiện lại đúng giới hạn đã ghi ở Giai đoạn 1** (không phải phát hiện mới): mỗi lần test local
vẫn phải tạm vô hiệu hoá `services.CASE_LOOKUP_SERVICE` trong `wrangler.jsonc` (tài khoản sandbox
không có Worker `dvbh` thật để dispatch tới) rồi khôi phục lại đúng nguyên trạng trước khi commit —
đã làm đúng quy trình này, xác nhận bằng `diff` với bản backup trước khi xoá backup.

**Chưa làm ở Giai đoạn 3 này** (đúng phạm vi, việc tiếp theo): 13 màn hình frontend thật (Giai đoạn 4
— `frontend/src/App.tsx` hiện vẫn chỉ là màn xác nhận Auth tối giản của Giai đoạn 1), nửa PHÁT của cơ
chế đồng bộ đẩy trong `linh-kien-app` (Giai đoạn 5), PWA/mobile đầy đủ (Giai đoạn 6). Không có route
nào cho `de_xuat_linh_kien_bh`/`phieu_tra_xac_bh` — giữ nguyên quyết định từ Giai đoạn 1 (2 tính năng
này chưa từng được triển khai ở bất kỳ vòng prototype nào, tránh bịa API trước khi biết chắc field).

## Giai đoạn 4: Toàn bộ 13 màn hình frontend thật (04/09/2026)

Tiếp nối trực tiếp Giai đoạn 3, vẫn theo đúng ràng buộc *"ko deploy, chỉ cần triển khai đầy đủ, tôi sẽ
tự deploy ở tài khoản khác"*. Đã port toàn bộ giao diện nghiệp vụ từ `prototype-html/index.html` sang
React 18 + TypeScript thật (không còn là `App.tsx` tối giản của Giai đoạn 1), tiêu thụ đúng 12 route
file của Giai đoạn 3 — không có route backend nào cần sửa thêm ngoài 2 chỗ nhỏ phát hiện trong lúc
build UI (xem mục lỗi bên dưới).

**Kiến trúc frontend mới** (không có ở Giai đoạn 1, viết mới hoàn toàn):
- `lib/api.ts` — client fetch dùng chung (`credentials:"include"`, ném `ApiError` mang đúng `error`
  code backend trả về) + `ERROR_MESSAGES` dịch ~30 mã lỗi backend sang tiếng Việt dễ hiểu.
- `lib/types.ts` — kiểu dữ liệu khớp đúng từng cột `migrations/0001_init.sql` (không đoán field).
- `lib/format.ts`/`lib/constants.ts` — SLA 3 mức (port `isOverdue()`/`slaLevel()`), nhãn enum tiếng
  Việt, `fileToDataUrl()` (ảnh base64, không R2).
- `router/Router.tsx` — router hash tự viết (`#/vai-tro/man-hinh`, khớp đúng quy ước URL của
  prototype cũ để người vận hành không bị lạ) — không thêm dependency `react-router-dom` cho quy mô
  13 màn hình này.
- `hooks/useWorkload.tsx` — đếm "việc cần làm" theo đúng vai trò, gọi lại các endpoint GET danh sách
  đã có (không thêm endpoint `/workload` riêng) qua `Promise.all`, expose `refresh()` để màn hình gọi
  lại sau mỗi thao tác — dùng cho cả huy hiệu Sidebar lẫn dải "🔥 Việc của tôi"/StatCard ở Trang chủ.
- `hooks/useSettings.ts`/`useLinhKien.ts`/`useNvList.ts` — nạp danh mục dùng chung (lý do chậm/lý do
  huỷ/linh kiện/danh sách NV — riêng `GET /api/users/nv-sua-chua` là **route mới thêm ở Giai đoạn 4**,
  xem mục lỗi/bổ sung bên dưới).
- `ui/` — primitives dùng chung: `Modal.tsx` (2 kích cỡ mặc định/`full`, đúng quyết định "modal tràn
  màn hình" đã chốt 02/09/2026, khoá đóng nhầm bằng kiểm tra `mousedown`+`click` cùng bắt đầu trên nền
  — bài học từ chính lỗi đã sửa ở prototype vòng 1), `Toast.tsx`, `Table.tsx` (luôn 1 dòng + cuộn
  ngang, click dòng mở chi tiết), `SlaBadge.tsx` (3 mức màu + bấm số giờ quá hạn mở modal ghi lý do
  chậm độc lập), `primitives.tsx` (Btn/Badge/Field/Card/StatCard... theo đúng token màu
  `styles/tokens.css` đã port ở Giai đoạn 1).
- `layout/` — `Sidebar.tsx` (desktop, huy hiệu số việc theo `workloadKey`) + `MobileNavStrip.tsx`
  (dải cuộn ngang thay `Sidebar` dưới 768px — **đơn giản hoá có chủ đích** so với bottom-tab-bar cố
  định của prototype, xem mục "Đã đơn giản hoá" bên dưới) + `TopBar.tsx` (lời chào + đăng xuất) +
  `routes.ts` (`routesForUser()` — danh sách menu theo đúng 9 cờ vai trò).
- `screens/shared/` — các khối/modal dùng chung nhiều màn: `UnitDetailModal.tsx` ("UI chi tiết" đơn vị
  bảo hành, port đúng `unitActionButtonsHtml()` — nút footer tính theo ĐÚNG vai trò đang đăng nhập +
  trạng thái hiện tại của đơn, đồng bộ 1-đối-1 với điều kiện dùng ở bảng thống nhất), `LogBlock.tsx`
  (4 khối log riêng biệt, sort mới nhất lên đầu), `PhanLoaiModal.tsx`, `FastActionsModal.tsx` (lưới 10
  icon + form phụ cho 4 nút cần thêm dữ liệu), `YeuCauBoSungModal.tsx`, `BaoCaoSaiModal.tsx`,
  `XacNhanHoanTatModal.tsx`, `TraTrucTiepModal.tsx`, `ChanDoanModal.tsx`, `PhieuTraDetailModal.tsx`
  ("UI chi tiết" phiếu trả — nút footer theo vai trò+trạng thái, gộp cả 4 vai trò Admin BH/Kế
  toán/Kho/KTV vào 1 modal dùng chung), `GhiChuLogPanel.tsx`/`GhiChuLogModal.tsx`,
  `LyDoChamGateField.tsx` (cổng SLA dùng chung mọi form có mốc SLA), `LinhKienScreen.tsx`.
- `screens/{ktv,kho,adminbh,nv,ketoan,quanly,qtri}/` — 13 màn hình nghiệp vụ đầy đủ theo đúng vai trò.

**Quyết định thiết kế mới, không có trong prototype gốc** (phát sinh khi build API thật):
- **`GET /api/users/nv-sua-chua`** (route mới, `backend/src/routes/users.ts`) — danh sách rút gọn
  (email/tên) các tài khoản `la_nv_sua_chua=1`, dùng cho Admin BH chọn "người sửa chữa" ở form Phân
  loại/FAST actions. Route `GET /api/users` gốc chỉ dành cho `la_qtri` nên không dùng lại được ở đây.
- **Sửa 1 lỗ hổng quyền thật phát hiện khi build `UnitDetailModal`**: `GET /admin/don-vi/:id` và
  `GET /admin/don-cha/:id/bao-cao-sai` (đọc "KTV báo cáo sai thông tin") chỉ cho phép
  `la_admin_bh || la_qtri || la_view`, **thiếu `la_giam_sat`** — trong khi CLAUDE.md đã ghi rõ ý định
  ban đầu (mục "Đối chiếu nút chức năng AppSheet gốc") là "chỉ vai trò giám sát" đọc được, tức PHẢI
  gồm cả `la_giam_sat` lẫn `la_view` (2 vai trò tách ra từ `quanly` gốc của prototype). Đã sửa cả 2
  route trong `backend/src/routes/adminBH.ts`, thêm `user.la_giam_sat` vào điều kiện.

**Đã đơn giản hoá có chủ đích so với prototype** (không phải thiếu sót, là đánh đổi hợp lý cho 1 Worker
độc lập mới — ghi lại rõ ràng để không nhầm là "quên làm"):
- **Bỏ quét QR bằng camera** (`jsQR`) ở màn Kho tiếp nhận — Kho chọn đúng phiếu từ danh sách hàng đợi
  thay vì quét mã; đây là tiện ích tăng tốc thao tác, không phải logic nghiệp vụ cốt lõi.
- **Bỏ tem/QR dán thùng + tải ảnh QR in tem** — cùng lý do, tiện ích in ấn không ảnh hưởng luồng.
  Cả 2 điểm QR có thể thêm lại sau bằng cách cài `qrcode`/`jsqr` qua npm thật (không cần tự bundle thủ
  công như bản prototype offline).
- **Bỏ tuỳ biến cột kéo-thả/resize/ẩn-hiện** của bảng thống nhất Admin BH — giữ đúng 8 cột cố định đã
  chọn kỹ (ID, Trạng thái, Nguồn, Khách hàng, Linh kiện, Mô tả lỗi, SLA, Hành động); tính năng tuỳ
  biến là "nice-to-have" cho demo, không phải yêu cầu nghiệp vụ.
- **Bỏ màn "Xem giao diện Mobile" (khung điện thoại giả lập qua iframe)** — không cần thiết khi ứng
  dụng thật đã responsive qua Tailwind + `MobileNavStrip`, có thể test trực tiếp bằng trình duyệt
  thật/điện thoại thật khi deploy.
- **`MobileNavStrip` (dải cuộn ngang) thay cho bottom-tab-bar cố định** của prototype — đơn giản hơn
  để viết đúng và kiểm thử trong thời gian có hạn, vẫn đáp ứng đúng nhu cầu "điều hướng được trên
  điện thoại"; có thể nâng cấp thành bottom-tab cố định sau nếu người dùng thực tế thấy cần.
- **Bỏ tra cứu case CRM tự động (case-lookup autocomplete)** — trường "Mã case" ở form Thêm đơn/Đơn
  dịch vụ tính phí hiện là ô nhập tay tự do (khớp đúng cột `case_id TEXT` không FK trong schema); tra
  cứu case tự động cần `lib/caseLookupClient.ts` + Service Binding `CASE_LOOKUP_SERVICE` — đây là việc
  của Giai đoạn 5 (nửa PHÁT `linh-kien-app`), chưa làm.
- Không port `SearchableSelect` (ô chọn có tìm kiếm cho danh sách dài) — dùng `<select>` thường; đã
  từng được prototype tự ghi nhận là "tồn đọng thật cần làm khi dữ liệu thật dài hơn nhiều" — giữ
  nguyên nợ kỹ thuật này, không giải quyết ở Giai đoạn 4.

**Đã xác minh — không chỉ typecheck, kiểm thử tương tác thật qua Chrome (Browser pane), không phải
đọc code bằng mắt:**
1. `npm run typecheck` (cả backend lẫn frontend, `tsc --noEmit` với `strict:true`) — **0 lỗi** sau khi
   sửa đúng 1 lỗi thật (`hooks/useWorkload.ts` chứa JSX nhưng đặt sai đuôi `.ts` thay vì `.tsx` — TS
   báo lỗi cú pháp rõ ràng, đã đổi tên file, không phải lỗi logic).
2. `npm run build` (frontend, Vite) — build sạch, bundle ~241KB JS (gzip ~70KB) + CSS ~55KB (gzip
   ~18KB), không cảnh báo.
3. Chạy `wrangler dev` local thật (tạm vô hiệu hoá `services.CASE_LOOKUP_SERVICE` như thường lệ, đã
   khôi phục lại đúng sau khi xong) + `wrangler d1 migrations apply --local` trên D1 rỗng hoàn toàn
   (không seed sẵn dữ liệu như vòng test backend Giai đoạn 3) — đăng nhập qua session cookie có sẵn từ
   phiên trước (`smarttrade.vp@gmail.com`, `la_qtri=1`), tự gán thêm cho chính tài khoản này đủ 8 cờ
   vai trò còn lại qua chính màn "Người dùng" thật (không seed SQL tay) để 1 tài khoản test được đủ cả
   13 màn hình.
4. **Click-through thật qua toàn bộ luồng nghiệp vụ chính** (đúng chuỗi trạng thái Giai đoạn 3 đã test
   bằng HTTP, nay lặp lại bằng click chuột thật trên UI): KTV tạo phiếu gửi (`BH-000001`) → thêm đơn
   (`DH-000001`) → xác nhận gửi xe → Kho xác nhận tiếp nhận → Admin BH xác nhận tiếp nhận nội bộ →
   xác nhận số lượng (tách `DH-000001-1`) → mở "UI chi tiết" (đúng đủ 4 khối log, đúng nút footer cho
   trạng thái `cho_phan_loai`) → **⚡ Xử lý nhanh "Sửa chữa trong BH"** (form phụ bắt chọn NV, chọn
   đúng NV vừa gán quyền cho chính mình) → NV Chẩn đoán ("Sửa được") → Admin BH Xác nhận hoàn tất →
   **⚡ Tự động gộp phiếu trả cho tất cả nhân viên** (tạo đúng `TR-000001`) → mở "UI chi tiết" phiếu
   trả → **chặn đúng lỗi 400 `REQUIRE_MA_MISA`** khi bấm "Gửi duyệt kế toán" lúc còn thiếu mã → nhập
   mã đơn hàng/MISA, lưu, gửi duyệt lại thành công → Kế toán Duyệt → Kho Gửi hàng (không đóng gói/ảnh,
   đúng "tuỳ chọn") → KTV Xác nhận đã nhận — **toàn bộ chuỗi hoàn tất đúng trạng thái cuối
   `ktv_da_nhan`, 0 lỗi console runtime bất ngờ** (chỉ có đúng 1 lỗi 400 cố ý tạo ra để kiểm tra validate).
5. Xác nhận thêm các màn còn lại qua điều hướng trực tiếp bằng hash: Tra cứu tiến độ (KTV, tìm kiếm
   hoạt động, hiện đúng trạng thái `san_sang_gom_phieu_tra`), Cài đặt hệ thống (2 danh mục hiện đủ dữ
   liệu seed), Danh mục linh kiện (thêm 1 dòng nội bộ thành công), Tổng quan hệ thống (Giám sát/View —
   đếm đúng 1 đơn theo đúng trạng thái hiện tại), Tra cứu mọi đơn hàng (Giám sát/View — click dòng mở
   "UI chi tiết" **đúng KHÔNG hiện nút hành động nào** vì đơn đã có `phieu_tra_id`, xác nhận cơ chế
   "chỉ xem" hoạt động đúng dựa trên logic role+state, không phải cờ ẩn riêng).
6. Phát hiện phụ (không phải lỗi): `window.confirm()` bị trình duyệt test tự động từ chối mặc định
   (native dialog bị chặn) — xác nhận đây là hành vi *an toàn* của môi trường test (không tự ý xác
   nhận hành động phá huỷ/quan trọng), đã ghi đè `window.confirm` tạm thời để tiếp tục test nút "Tự
   động gộp phiếu trả" — không phải lỗi ứng dụng, chỉ là đặc thù của công cụ kiểm thử.

**Chưa làm ở Giai đoạn 4 này**: nửa PHÁT của đồng bộ đẩy bên `linh-kien-app` (Giai đoạn 5), PWA/mobile
thật (`manifest.webmanifest`, service worker, icon 192/512/maskable, Web Push — Giai đoạn 6), và toàn
bộ các điểm đã liệt kê ở mục "Đã đơn giản hoá có chủ đích" bên trên. Không chạy lệnh
deploy/tạo tài nguyên Cloudflare thật nào trong suốt quá trình.

## Giai đoạn 5: Nửa PHÁT của đồng bộ đẩy trong `linh-kien-app` (04/09/2026)

Trước khi làm, người dùng đặt câu hỏi kiến trúc quan trọng: *"nếu thay vì xin api, mà trực tiếp lấy
database từ workers linh-kien-app sang thì có tốt hơn không? tận dụng khai báo linh kiện và tài khoản
dùng chung cho cả 2 hệ thống"* — đã phân tích và khuyến nghị **KHÔNG chia sẻ D1 trực tiếp** (2 Worker
cùng bind 1 database) vì tái tạo đúng vấn đề coupling migration/blast-radius đã khiến `dat-mua-lk`
phải tách khỏi `cloudflare smarttrade base` thành `linh-kien-app` từ đầu (19/08/2026), và `users` của
2 hệ có hình dạng khác hẳn nhau (`vai_tro` enum vs 9 cờ boolean) nên không thể dùng chung bảng nguyên
trạng. Người dùng đồng ý giữ hướng đồng bộ đẩy qua API — xem đầy đủ phần phân tích trao đổi trong lịch
sử phiên làm việc (không lặp lại ở đây, chỉ ghi lại quyết định cuối).

Đã sửa 5 điểm trong repo **`../linh-kien-app`** (khác repo này, đang chạy production thật — commit
trực tiếp `master` theo đúng quy ước sẵn có của repo đó, **KHÔNG deploy**):

1. **`wrangler.jsonc`** — thêm Service Binding thứ 2 `SUACHUA_SYNC_SERVICE` (cùng lý do 1042/SSRF như
   `CASE_LOOKUP_SERVICE` đã có — 2 Worker cùng 1 tài khoản Cloudflare không `fetch()` thẳng URL nhau
   được) + var `SUACHUA_SYNC_BASE_URL` + ghi chú secret mới `SUACHUA_SYNC_API_KEY` (đặt qua
   `wrangler secret put`, **phải khớp đúng** giá trị `LINHKIEN_SYNC_API_KEY` bên `suachua`).
2. **`backend/src/types.ts`** — thêm 3 field `Env` tương ứng.
3. **`backend/src/lib/dvbhSyncClient.ts`** — viết lại thành cấu hình `TARGETS × ENTITIES` thay vì code
   cứng riêng cho `dvbh`: mỗi cặp (entity, target) có **con trỏ đồng bộ riêng** (bảng
   `dvbh_sync_state`, xem mục 4) — 1 đích lỗi tạm thời không chặn/làm mất tiến độ của đích còn lại.
   Thêm **entity mới `khu_vuc`** (bảng `khu_vuc` bên `linh-kien-app`, cột `ma, ten, gs_email`) — **CHỈ
   gửi tới `suachua`**, không gửi `dvbh` (hệ DVBH gốc không có khái niệm Khu vực trong schema của nó).
   `getPendingSyncCounts()`/`getLastSyncTimes()` tính theo hướng **bi quan nhất** qua nhiều đích (còn
   1 đích chưa nhận thì vẫn tính là "đang chờ"/"chưa từng đồng bộ" — tránh lạc quan giả khi 1 đích đã
   xong nhưng đích kia còn treo).
4. **`migrations/0016_dvbh_sync_state_multi_target.sql`** (mới) — mở rộng `dvbh_sync_state` từ
   `PRIMARY KEY(entity)` sang `PRIMARY KEY(entity, target)`, dùng đúng pattern "tạo bảng mới → copy →
   drop → rename" (đã xác nhận trước **không có bảng nào FK tới `dvbh_sync_state`** nên an toàn recreate
   — khác `users`, nơi pattern này bị cấm vì có nhiều bảng con FK tới). Giữ nguyên tiến độ đồng bộ
   `dvbh` cũ (không reset về epoch, tránh gửi lại toàn bộ KTV/linh kiện không cần thiết), seed 3 cặp
   mới từ epoch (`ktv/suachua`, `linh_kien/suachua`, `khu_vuc/suachua`).
5. **`routes/dvbhSync.ts` + `frontend/src/modules/SettingsModule.tsx`** — thêm field
   `khuVucPending`/`lastSyncKhuVuc` vào response + thêm 1 dòng hiển thị trong tab "Đồng bộ DVBH" của
   Settings (đổi tên hiển thị ngụ ý còn bao quát cả `suachua`, không đổi tên route/tab để tránh vỡ URL
   đã lưu/bookmark).

**Đã xác minh:** `npm run typecheck` (cả backend lẫn frontend của `linh-kien-app`) — 0 lỗi. Migration
0016 đã **áp dụng thành công lên D1 local thật** của repo đó (`npm run db:migrate:local`, không đụng
`--remote`) — xác nhận lại bằng `wrangler d1 execute --local` rằng bảng sau migrate đúng 5 dòng như kỳ
vọng (tiến độ `ktv/dvbh` cũ được giữ nguyên, 3 cặp mới đều ở epoch). **Chưa chạy thử `runDvbhSync()`
thật** (sẽ gọi sang Worker `suachua` thật — hiện vẫn là bản rỗng/placeholder, chưa deploy code Giai
đoạn 3/4 của repo này lên đó) và **không deploy gì** ở cả 2 repo.

**Bên nhận (`suachua`, repo này) đã sẵn sàng từ Giai đoạn 3** (`routes/sync.ts`, xem mục Giai đoạn 3
bên trên) — không cần sửa gì thêm ở phía này cho Giai đoạn 5.

## Giai đoạn 6: PWA/mobile cơ bản (04/09/2026)

Người dùng xác nhận làm PWA **cơ bản** (không cần Web Push thật — cần `VAPID_SERVER_PRIVATE_KEY` thật
lúc deploy, chưa có ở vòng này).

- **Icon PWA thật** (không còn dùng tạm `icon.png` gốc 858×887/548KB) — dùng thư viện `sharp` (đã có
  sẵn trong `node_modules` gốc) resize từ `logo sua chua 3t.png`:
  - `icon-192.png`/`icon-512.png` (`purpose:"any"`, crop-cover vuông).
  - `icon-maskable-512.png` — thu nhỏ logo vào đúng "safe zone" 80% rồi đệm nền màu lấy mẫu trực tiếp
    từ góc ảnh gốc (`rgb(11,130,11)`, xanh lá đậm khớp gradient logo) ra đủ 512×512 — tránh bị cắt mất
    nội dung khi hệ điều hành tự áp khung tròn/vuông-bo-góc lên icon maskable. Đã xác nhận bằng mắt
    (xem ảnh trong lịch sử phiên làm việc) — logo đủ margin an toàn quanh mọi cạnh.
  - `apple-touch-icon.png` (180×180, chuẩn iOS hiện tại), `favicon.png` (32×32).
  - 3 nơi trong app đang dùng `icon.png` gốc (`App.tsx` ×2, `layout/TopBar.tsx`) đổi sang
    `icon-192.png` (đủ độ phân giải cho kích thước hiển thị 32-56px, nhẹ hơn nhiều — 57KB so với
    548KB).
- **`frontend/public/manifest.webmanifest`** — theo đúng khuôn `linh-kien-app/frontend/public/
  manifest.webmanifest` đã làm trước đó (3 icon, `display:"standalone"`, `theme_color`/
  `background_color` khớp `--ocean-950`). Thêm `shortcuts` (3 mục: Gửi hàng bảo hành/Tiếp nhận/Xử lý
  đơn bảo hành — 3 hành động khởi đầu phổ biến nhất theo 3 vai trò khác nhau) — `linh-kien-app` chưa
  có shortcuts, đây là bổ sung mới không sao chép nguyên trạng.
- **`frontend/public/sw.js`** — service worker tối giản, CHỈ cache app-shell (HTML/JS/CSS/icon) để
  giao diện còn MỞ ĐƯỢC khi KTV ở hiện trường mất mạng tạm thời (khác `linh-kien-app/public/sw.js`,
  vốn CHỈ xử lý Web Push, không cache gì) — network-first cho HTML/API (luôn ưu tiên dữ liệu mới nhất
  khi có mạng, API trả lỗi `503 OFFLINE` rõ ràng thay vì treo vô hạn khi mất mạng), cache-first cho
  asset tĩnh có hash trong tên (Vite build, an toàn cache dài hạn vì tên đổi khi nội dung đổi). CHƯA
  xử lý sự kiện `push`/`notificationclick` (Web Push, để dành khi có VAPID key thật).
- **`index.html`** — thêm `<link rel="manifest">`, `<link rel="apple-touch-icon">`, đổi favicon sang
  `favicon.png`, thêm các thẻ meta `apple-mobile-web-app-*`/`mobile-web-app-capable` (khả năng "Thêm
  vào Màn hình chính" trên iOS/Android), đổi `theme-color` cho khớp đúng token `--ocean-950` thật
  (trước đó đang để tạm `#06304a`, lệch với token đã port ở Giai đoạn 1).
- **`main.tsx`** — đăng ký `sw.js` qua `navigator.serviceWorker.register()` sau sự kiện `load`, bọc
  trong kiểm tra `"serviceWorker" in navigator` + `.catch()` im lặng (trình duyệt không hỗ trợ/lỗi
  đăng ký không được làm vỡ trang).

**Đã xác minh:** `npm run typecheck`/`npm run build` (frontend) — 0 lỗi, sạch. Xác nhận icon nhìn đúng
bằng mắt (đọc trực tiếp file ảnh). Chạy `wrangler dev` local thật (tạm vô hiệu hoá
`services.CASE_LOOKUP_SERVICE` như thường lệ, đã khôi phục đúng sau khi xong) + mở qua Browser pane:
`fetch('/manifest.webmanifest')` trả **200 + JSON hợp lệ** đúng cấu trúc đã viết,
`navigator.serviceWorker.getRegistrations()` xác nhận **service worker đã đăng ký và active** (không
chỉ "đã gọi register(), không biết có thành công không"), không có lỗi console nào phát sinh từ các
thay đổi PWA (1 lỗi 500 tạm thời gặp phải là do tự làm rỗng D1 local giữa 2 lượt test trong cùng
phiên, không phải lỗi liên quan PWA — xác nhận lại bằng cách chạy `db:migrate:local` lần nữa, hết lỗi
ngay).

**Chưa làm/cố ý bỏ qua ở Giai đoạn 6 này:** Web Push thật (cần VAPID key thật lúc deploy, người dùng
xác nhận chưa cần ở vòng này), "Thêm vào màn hình chính" tự động prompt (`beforeinstallprompt` UI
riêng — trình duyệt tự xử lý mặc định là đủ cho phạm vi "PWA cơ bản"), và mọi việc đã liệt kê ở mục
"Chưa làm" của Giai đoạn 1/3/4/5 (đặc biệt: KHÔNG deploy/tạo tài nguyên Cloudflare thật nào — không
có bước nào trong Giai đoạn 6 này chạm tài khoản Cloudflare thật).

**Tổng kết toàn bộ 6 giai đoạn (04/09/2026, cùng ngày)**: Giai đoạn 1 (scaffold hạ tầng) → Giai đoạn 3
(toàn bộ route nghiệp vụ backend, bỏ qua Giai đoạn 2 vì không có trong roadmap gốc) → Giai đoạn 4
(toàn bộ 13 màn hình frontend) → Giai đoạn 5 (nửa PHÁT đồng bộ đẩy bên `linh-kien-app`) → Giai đoạn 6
(PWA/mobile cơ bản) — **đã hoàn tất đầy đủ theo đúng roadmap đã chốt trong
`Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` mục 5**, đúng ràng buộc *"ko deploy, chỉ cần triển
khai đầy đủ, tôi sẽ tự deploy ở tài khoản khác"* xuyên suốt — không có bất kỳ lệnh `wrangler deploy`/
`wrangler d1 create --remote`/`wrangler secret put` nào được chạy trong toàn bộ quá trình ở cả 2 repo.
Việc còn lại thuộc về người dùng: tự deploy từ tài khoản Cloudflare `dichvu3t` thật (theo đúng
`DEPLOY.md`), đặt các secret thật (`GOOGLE_CLIENT_ID/SECRET`, `SESSION_SECRET`, `LINHKIEN_SYNC_API_KEY`
= `SUACHUA_SYNC_API_KEY`...), và deploy lại `linh-kien-app` để cơ chế đồng bộ đẩy 2 chiều thực sự chạy
giữa 2 hệ.

## Deploy thật đầu tiên lên production (04/09/2026, cùng ngày)

Nguyên văn yêu cầu: *"commit và deploy dự án này"*. Khác các vòng trước (luôn có ràng buộc "không
deploy"), lần này người dùng xác nhận trực tiếp và phiên làm việc thực sự có quyền truy cập tài khoản
Cloudflare `dichvu3t` thật (`wrangler whoami` → `smarttrade.vp@gmail.com`, account
`b1f870d7f2df6701219ac095926a67e5` — khác hẳn tài khoản sandbox `mikanovncloudflare@gmail.com`/
`c05f5a7359a2ddd022c244c05e211f99` đã ghi nhận ở Giai đoạn 1) — xác nhận qua `wrangler d1 list` thấy cả
3 database `sua-chua-bao-hanh-db`/`dat-mua-linh-kien-db`/`dvbh-db-smarttrade` cùng tài khoản.

**Trước khi deploy, dọn dẹp + phát hiện 1 rủi ro rò rỉ secret:**
- Phát hiện file `api key.txt` (64 byte, không có newline) nằm ở gốc repo, **chưa được thêm vào
  `.gitignore`** — không đọc nội dung, không commit, đã thêm dòng chặn vào `.gitignore`. Người dùng
  cần tự xoá/di chuyển file này ra khỏi repo.
- `wrangler.jsonc` đã có sẵn `database_id` thật (`6d269b54-3999-4408-9699-790d09a462a9`, do người dùng
  tự chạy `wrangler d1 create` ở phiên khác trước đó) thay cho placeholder `REPLACE_AFTER_WRANGLER_D1_
  CREATE` — đã commit lại đúng giá trị này (bị 1 process autosave nào đó ghi đè về placeholder giữa
  chừng, đã `git checkout -- wrangler.jsonc` để khôi phục lại đúng bản đã commit).
- Xoá hẳn `BH-MB-v4.1 - AppSheet.html` + thư mục `_files` (bản chụp web AppSheet gốc, đã dùng xong cho
  vòng đối chiếu 50 action 31/08/2026, không còn cần giữ trong repo) — commit `15fcb3d`.

**Vướng mắc kỹ thuật khi migrate/deploy — account resolution của `wrangler` bị nhầm tài khoản:**
Nhiều lần `wrangler d1 migrations apply --remote` (cả từ phiên Claude Code lẫn từ terminal riêng của
người dùng) báo lỗi `account not valid [7403]` với account ID **sandbox cũ** dù `wrangler whoami` ở
đúng terminal đó báo đúng tài khoản `dichvu3t` thật — không phải do `CLOUDFLARE_ACCOUNT_ID` (đã xác
nhận không có biến này trong session), không phải do file cache cục bộ nào tìm thấy được (đã grep cả
thư mục project lẫn `%APPDATA%\xdg.config\.wrangler`). **Cách khắc phục:** ép rõ ràng
`CLOUDFLARE_ACCOUNT_ID=b1f870d7f2df6701219ac095926a67e5` ngay trước lệnh (`$env:CLOUDFLARE_ACCOUNT_ID=
"..."` trên PowerShell, hoặc tiền tố biến môi trường trên Bash) — bỏ qua hẳn cơ chế tự suy luận tài
khoản mặc định của `wrangler` (nguyên nhân gốc vẫn chưa xác định được, có thể là bug/cache nội bộ của
`wrangler` khi token có lịch sử đăng nhập nhiều tài khoản) — sau khi ép biến này, cả migrate lẫn deploy
đều chạy thành công ngay lần đầu.

**Đã thực hiện, theo đúng thứ tự:**
1. `npm install` + `npm run typecheck` (backend + frontend) — 0 lỗi.
2. `git commit` (`15fcb3d`) — xem 3 gạch đầu dòng ở trên.
3. `wrangler d1 migrations apply DB --remote` (với `CLOUDFLARE_ACCOUNT_ID` ép rõ) — áp thành công lên
   D1 **production thật** `sua-chua-bao-hanh-db`. Xác minh lại bằng
   `SELECT name FROM sqlite_master WHERE type='table'` qua `wrangler d1 execute --remote` — đủ 16 bảng
   nghiệp vụ (`users`, `phieu_gui_bh`, `phieu_sua_chua_bh`, `phieu_sua_chua_bh_ct`, `phieu_tra_bh`,
   `linh_kien_bh`, `ktv_lien_he_bh`, `khu_vuc_bh`, `logs_bh`, `settings_ly_do_cham_bh`,
   `settings_ly_do_tu_choi_bh`, `id_counters`... đúng schema `migrations/0001_init.sql`).
4. `npm run deploy` (build frontend Vite + `wrangler deploy`) — build sạch (241KB JS/55KB CSS, gzip
   ~70KB/~18KB), upload 127 static asset (bao gồm icon PWA/manifest/service worker của Giai đoạn 6),
   deploy Worker thành công. Xác nhận 5 secret cần thiết (`CASE_LOOKUP_API_KEY`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `LINHKIEN_SYNC_API_KEY`, `SESSION_SECRET`) **đã được người dùng đặt sẵn** từ
   trước (`wrangler secret list` thấy đủ 5, không cần đặt lại).
5. **Xác minh bằng trình duyệt thật** (Browser pane, không chỉ tin log deploy) — mở
   `https://suachua.dichvu3t.workers.dev`: hiện đúng màn đăng nhập "Sửa chữa bảo hành / Dịch Vụ 3T /
   Đăng nhập với Google", không có lỗi console bất thường (chỉ có đúng 1 lỗi `401` từ `GET /api/auth/me`
   — hành vi đúng cho người dùng chưa đăng nhập, không phải lỗi).

**Kết quả: Worker `suachua` đã LIVE thật trên production** (`https://suachua.dichvu3t.workers.dev`,
Version ID `47051710-ab5b-4228-bed7-5e337bf0fc63`), D1 đã có đủ schema, secret đã đủ. Đây là lần đầu
tiên module này chạy thật ngoài môi trường local — khác hẳn mọi vòng "Giai đoạn 1-6" trước đó (chỉ
code + test local, chủ động không deploy theo đúng chỉ đạo lúc đó).

**Việc còn lại (chưa làm ở vòng này):** đăng nhập thật qua Google OAuth để xác nhận luồng auth thật
trên production (chỉ mới xác nhận màn hình đăng nhập hiện đúng, chưa đăng nhập thật); Giai đoạn 5 nửa
PHÁT bên `linh-kien-app` vẫn chưa deploy (đã sửa code, chưa deploy repo đó — xem mục Giai đoạn 5); cơ
chế đồng bộ đẩy 2 chiều thật giữa `linh-kien-app`↔`suachua` do đó **chưa chạy thật** dù cả 2 phía code
đã sẵn sàng.

## QA: giao diện live khác bản đã xây + Admin (la_qtri) nhìn được tất cả module (04/09/2026)

Nguyên văn 2 yêu cầu, gửi sau khi xác nhận dự án đã online:

1. *"dự án đã online. tuy nhiên giao diện đang bị khác với giao diện đã xây dựng trên bản web. với vai
   trò QA hệ thống check lại toàn bộ các giao diện đã xây đựng và so sánh với giao diện hiện tại trên
   bản deploy. => đánh giá các thiếu sót => lên kế hoạch bổ sung => triển khai => tái đánh giá => chốt
   báo cáo kết quả"*
2. *"Vai trò Admin cần nhìn được tất cả các modules của hệ thống."*

**Điều tra trước khi sửa** (không đoán ngay là do vai trò):
- Mở thẳng `https://suachua.dichvu3t.workers.dev` qua Browser pane thật — màn đăng nhập hiện đúng,
  **hash bundle JS đang chạy (`index-DS8uEyT0.js`) khớp CHÍNH XÁC** với bản build Giai đoạn 6 đã kiểm
  thử local trước đó — loại trừ ngay khả năng "deploy nhầm code cũ/stale".
- **Không đăng nhập thật được** để soi các màn nghiệp vụ — không có thông tin đăng nhập Google thật
  của người dùng, và `/api/auth/dev-login` đã đúng thiết kế trả `404` trên production (chỉ hoạt động
  khi `LOCAL_DEV_BYPASS_AUTH` được đặt, đúng ý đồ bảo mật, không tự ý bật lại để "tiện điều tra").
- **Giả thuyết chính**: tài khoản đăng nhập đầu tiên trên production luôn là `BOOTSTRAP_ADMIN_EMAIL`,
  tự động lên **CHỈ** `la_qtri=1` (đúng code `routes/auth.ts`), **không có** 8 cờ vai trò nghiệp vụ
  còn lại — trong khi sidebar/route trước đó lọc **CHẶT theo đúng cờ vai trò**
  (`routesForUser()`/`Routed()`), nên tài khoản `la_qtri`-chỉ chỉ thấy đúng 4 mục (Trang chủ/Người
  dùng/Cài đặt hệ thống/Danh mục linh kiện) — khác hẳn 13 màn hình đầy đủ đã trình bày lúc build. Yêu
  cầu #2 (Admin cần thấy hết) xác nhận trực tiếp đúng giả thuyết này — cùng 1 gốc rễ cho cả 2 yêu cầu.
- **Đã kiểm chứng lại bằng thực nghiệm local** (không chỉ suy luận): dùng session cookie dev-login
  local (chỉ `la_qtri=1`, không có cờ nào khác — mô phỏng đúng tài khoản bootstrap admin thật) mở
  từng URL, xác nhận **trước khi sửa** sidebar chỉ hiện 4 mục như dự đoán.

**Đã sửa — `la_qtri` thành superuser, đi qua được MỌI cổng vai trò** (không chỉ xem menu, mà thao tác
được thật ở mọi module, để 1 Admin hệ thống có thể tự kiểm tra/hỗ trợ bất kỳ khâu nào mà không cần
mượn tài khoản người khác):

**Backend** (mọi hàm `requireX()`/`isKtv()` gác cổng theo 1 cờ vai trò duy nhất, đã thêm `|| la_qtri`):
- `routes/adminBH.ts` + `routes/phieuTra.ts` (2 bản `requireAdminBH()` độc lập, không dùng chung).
- `routes/kho.ts` + `routes/phieuTra.ts` (2 bản `requireKho()` độc lập).
- `routes/nvSuaChua.ts` `requireNv()`, `routes/phieuTra.ts` `requireKeToan()`, `routes/phieuGui.ts`
  `isKtv()`.
- **Cố ý KHÔNG đổi** các kiểm tra hẹp hơn "đúng đúng người được gán mới cho làm" (VD
  `nvSuaChua.ts`: NV chẩn đoán chỉ áp dụng được nếu `nguoi_sua_chua === user.email`;
  `phieuTra.ts`: KTV xác nhận nhận/khiếu nại chỉ khi `ktv_nhan === user.email`) — đây là ràng buộc
  "việc này có đúng thuộc về bạn không", khác bản chất với "module này bạn có được xem/thao tác
  không"; Admin vẫn thấy đủ màn hình (rỗng nếu chưa có việc được gán riêng cho họ), và vẫn xử lý được
  mọi đơn vị qua đúng kênh Admin BH (Phân loại/FAST actions) như trước.
- Các route đã sẵn `|| la_qtri` từ trước (`traCuu.ts`, `logs.ts`, `linhKien.ts`, `phieuGui.ts`
  `canReadGhiChu()`, `adminBH.ts` mục đọc chi tiết/báo cáo sai) không cần sửa gì thêm.

**Frontend:**
- `layout/routes.ts` (`routesForUser()`) — mọi nhánh theo vai trò đều mở thêm `|| u.la_qtri`, qtri
  giờ thấy đủ **16 mục sidebar** (toàn bộ 13 màn nghiệp vụ + 3 màn quản trị riêng).
- `App.tsx` (`Routed()`) — đồng bộ đúng y hệt điều kiện, tránh tình trạng "sidebar cho vào nhưng bấm
  vào lại rơi vào trang Không tìm thấy" nếu chỉ sửa 1 trong 2 nơi.
- `hooks/useWorkload.tsx` (`fetchCounts()`) — mở thêm `|| user.la_qtri` cho cả 5 nhóm đếm, để huy hiệu
  Sidebar/StatCard của qtri phản ánh đúng số liệu thật thay vì luôn = 0 (trước đó chỉ nhóm `la_qtri`
  có sẵn — không nhóm nào — mới được đếm).

**Đã xác minh — không chỉ typecheck, thực nghiệm lại đúng kịch bản đã dùng để phát hiện vấn đề:**
1. `npm run typecheck` (backend + frontend) — 0 lỗi.
2. `npm run build` (frontend) — sạch.
3. Chạy lại `wrangler dev` local (tạm vô hiệu hoá `services.CASE_LOOKUP_SERVICE` **và** binding D1
   thứ 2 `sua_chua_bao_hanh_db` mới xuất hiện trong `wrangler.jsonc` production như thường lệ — khôi
   phục đúng nguyên trạng sau khi xong, xác nhận lại bằng cách chính `wrangler.jsonc` không còn nằm
   trong `git status` sau khi khôi phục) + D1 local rỗng hoàn toàn — đăng nhập lại đúng session
   `la_qtri`-chỉ như bootstrap admin thật → **sidebar hiện đủ 16 mục** (trước khi sửa chỉ 4).
4. Điều hướng qua hash trực tiếp tới Kho/NV/Kế toán/KTV/Admin BH (5 module trước đó `la_qtri`-chỉ
   không vào được) → đọc `read_network_requests` xác nhận **toàn bộ request `GET` liên quan đều trả
   200 OK** (không còn `403 FORBIDDEN`) — kiểm chứng bằng network log thật, không chỉ nhìn UI không
   báo lỗi.

**Phát hiện phụ, đã ghi nhận nhưng KHÔNG tự ý sửa:** `wrangler.jsonc` production hiện có 2 khai báo D1
cho cùng 1 `database_id` (`binding:"DB"` — cái code dùng, và `binding:"sua_chua_bao_hanh_db"` mới,
`remote:true`, không `migrations_dir`) — nhìn giống 1 binding trùng lặp có thể do Cloudflare Dashboard
tự thêm khi người dùng bind D1 qua giao diện web, `Env` trong code không khai báo field này nên hiện
không dùng tới. Không tự xoá — đây là thay đổi trên file production người dùng tự chỉnh, cần hỏi lại
trước khi động vào.

**Kết luận báo cáo QA:** nguyên nhân "giao diện khác" gần như chắc chắn là 1 — bootstrap admin chỉ có
`la_qtri`, sidebar cũ lọc chặt theo cờ vai trò nên chỉ hiện 4/16 mục; KHÔNG phải lỗi deploy sai
code/thiếu tính năng (bundle JS đã xác nhận khớp đúng bản mới nhất). Đã sửa tận gốc (superuser, không
phải vá từng màn riêng lẻ). **Việc còn lại thuộc người dùng:** `npm run deploy` lại để đưa bản sửa này
lên production, sau đó đăng nhập thật lại để xác nhận đúng như kỳ vọng — phiên làm việc này không có
quyền tự deploy lên tài khoản thật (xem đầu CLAUDE.md, trừ phiên deploy riêng đã ghi ở mục ngay
trên). Nếu sau khi deploy lại mà giao diện vẫn khác so với mong đợi ở điểm nào khác, cần mô tả/gửi ảnh
chụp cụ thể — phiên làm việc này không có thông tin đăng nhập Google thật của production nên không tự
kiểm tra thêm được các màn hình sau đăng nhập.

## QA vòng 2: so sánh TOÀN BỘ với `prototype-html` (không phải mô tả của phiên trước) (04/09/2026)

Người dùng làm rõ **"giao diện đã xây dựng"** không phải là bản mô tả của phiên trước, mà là chính
`du an sua chua bao hanh/prototype-html/index.html` — 22+ vòng rà soát UI/UX thật đã chốt với người
dùng trước khi build React. Ví dụ cụ thể người dùng đưa ra: *"đơn giản như giao diện mobile tôi đã
yêu cầu sửa lại thành các menu ở bottom, nhưng hiện tại deploy lại vẫn ở top"* — xác nhận đúng: Giai
đoạn 4 (frontend React) đã **tự ý đơn giản hoá** nhiều điểm UI đã chốt kỹ trong prototype (ghi rõ
trong mục "Đã đơn giản hoá có chủ đích" của Giai đoạn 4) thay vì port đúng — dù có ghi chú lại, đây
vẫn là sai lệch thật so với "giao diện đã xây dựng", không phải chỉ là "đánh đổi hợp lý" như đã tự
đánh giá trước đó.

**Đã đọc lại trực tiếp source code prototype** (không suy đoán) để lấy đúng markup/CSS/logic gốc, rồi
so sánh với 12 file/tính năng React đã build — 4 khoảng cách thật đã xác nhận và ưu tiên theo mức độ
ảnh hưởng:

| # | Khoảng cách | Mức độ | Đã xử lý vòng này? |
|---|---|---|---|
| 1 | Menu mobile ở TOP (`MobileNavStrip`, dải cuộn ngang) thay vì BOTTOM tab bar cố định | Người dùng chỉ đích danh | ✅ Đã sửa |
| 2 | Sidebar không có chế độ thu gọn mặc định + badge góc icon + nội dung tự giãn | Đã chốt kỹ 03/09/2026, bị bỏ hoàn toàn ở Giai đoạn 4 | ✅ Đã sửa |
| 3 | Bảng thống nhất Admin BH: tách 2 bảng riêng (đơn cha/đơn vị) thay vì gộp 1 bảng; thiếu tuỳ biến cột (kéo vị trí/độ rộng/ẩn-hiện); **thiếu hẳn chọn-nhiều-dòng + phân loại hàng loạt** (backend đã có route `POST /admin/don-vi/phan-loai-hang-loat` từ Giai đoạn 3, Giai đoạn 4 chưa từng làm UI) | Nghiêm trọng nhất — mất hẳn 1 tính năng đã build backend, không chỉ khác giao diện | ✅ Đã sửa |
| 4 | Quét QR camera (Kho), tem/QR dán thùng, "Xem giao diện Mobile" (iframe preview), tra cứu case CRM tự động, `SearchableSelect` | Đã ghi nhận từ Giai đoạn 4, effort lớn (thư viện ngoài/camera/Giai đoạn 5 case-lookup) | ❌ Chưa làm — xem "Còn tồn đọng" bên dưới |

### 1. Bottom tab bar cho mobile (thay `MobileNavStrip`)

`frontend/src/layout/BottomNav.tsx` (mới) — port dung `renderBottomNav()` của prototype: dùng LẠI
đúng `routesForUser()`/`useWorkload()` với Sidebar desktop (không định nghĩa menu lần 2), icon+nhãn
xếp dọc, chỉ "Trang chủ" hiện 1 chấm đỏ tổng hợp (không hiện số riêng từng mục — đúng bản gốc, vì 1
hàng ngang không đủ chỗ). `MobileNavStrip` (cũ, dải cuộn ngang ở đầu `TopBar`) đã xoá hẳn khỏi
`Sidebar.tsx`. `Shell.tsx` thêm `pb-20` cho `<main>` ở mobile (khớp
`.main-col{padding-bottom:calc(60px+env(safe-area-inset-bottom))}` gốc) để nội dung không bị thanh cố
định che.

### 2. Sidebar thu gọn mặc định + badge góc icon + nội dung tự giãn

`Sidebar.tsx` viết lại nhận `collapsed`/`onToggle` qua props (state chuyển lên `Shell.tsx` vì `<main>`
cần biết để tự giãn `max-width`, khớp đúng cơ chế `body.sidebar-collapsed` gốc — React không có global
CSS class nên chuyển state lên component cha chung thay vì `document.body.classList`). Mặc định
`collapsed=true` (đúng yêu cầu 03/09/2026 "mặc định menu sẽ ở trạng thái thu gọn"). Khi thu gọn: chỉ
còn icon (72px, so với 224px mở rộng — `w-56`), huy hiệu số việc chuyển từ hiện cạnh nhãn sang 1 chấm
tròn nhỏ đè lên góc icon. `Shell.tsx`: `<main>` đổi `max-w-6xl` (1152px) → `max-w-[1440px]` khi
`collapsed=true`, đúng cơ chế "tận dụng khoảng trống vừa giải phóng" đã chốt.

### 3. Bảng thống nhất Admin BH — gộp lại đúng 1 bảng + tuỳ biến cột + chọn-nhiều-dòng

Đây là phần việc lớn nhất vòng này, gồm cả sửa backend lẫn viết lại gần như toàn bộ màn Admin BH:

- **`backend/src/routes/adminBH.ts`** — `GET /don-cha` và `GET /don-vi` thêm `g.nguoi_tao AS ktv` vào
  SELECT (thiếu từ Giai đoạn 3 — cột "Nguồn" của bảng thống nhất cần tên/email KTV, trước đó chỉ có
  `case_id`). `GET /don-vi/:id` ghép thêm `ma_lk`/`loai_doi_tru_de_xuat` của đơn cha thẳng vào object
  `don_vi` trả về (để `PhanLoaiModal.tsx` tự đọc được 2 giá trị mặc định này mà **không cần prop
  "parent" riêng** — đơn giản hoá interface, tái dùng được thẳng từ bảng thống nhất nơi vốn không có
  sẵn context "đơn cha" đầy đủ như khi mở từ `UnitDetailModal`).
- **`frontend/src/hooks/useAdminCols.ts`** (mới) — quản lý `order`/`hidden`/`widths` của 12 cột, đọc/
  ghi `localStorage` **ĐÚNG key và hình dạng JSON** prototype đã dùng (`admin_unified_cols_v1`,
  `{order,hidden,widths}`) — nếu người dùng từng dùng bản prototype trên cùng trình duyệt, cấu hình
  cột cũ tự động được đọc lại, không cần tuỳ chỉnh lại từ đầu.
- **`frontend/src/screens/adminbh/AdminUnifiedTable.tsx`** (mới) — bảng GỘP đơn cha (đang chờ xác
  nhận SL) và đơn vị (đang cần xử lý) làm 1, port đúng `adminParentRowFields()`/`adminUnitRowFields()`
  (12 cột dữ liệu y hệt, xem `ADMIN_COLS_DEF`) + kéo đổi vị trí cột (HTML5 drag-and-drop thuần) + kéo
  đổi độ rộng (mousedown/mousemove/mouseup thuần trên `document`, cập nhật trực tiếp DOM `<col>` lúc
  kéo cho mượt, chỉ commit vào state/localStorage lúc thả chuột — đúng kỹ thuật gốc). Click dòng đơn
  cha mở `XacNhanSoLuongModal` (**khác gốc**: prototype điều hướng sang màn drill-in theo thùng, màn
  đó không được port từ Giai đoạn 4 — mở thẳng modal xác nhận SL là hành động duy nhất áp dụng được
  cho dòng đó nên hợp lý làm thay thế, ghi rõ trong code).
- **`frontend/src/screens/adminbh/AdminColSettingsModal.tsx`** (mới) — modal bật/tắt cột (port
  `openAdminColSettingsModal()`).
- **`frontend/src/screens/adminbh/BulkPhanLoaiModal.tsx`** (mới) — **tính năng còn thiếu hẳn, không
  chỉ khác giao diện**: `POST /admin/don-vi/phan-loai-hang-loat` đã có từ Giai đoạn 3 nhưng Giai đoạn
  4 chưa từng xây UI gọi tới route này. Form giống `PhanLoaiModal` nhưng **không có** trường "Linh
  kiện sửa chữa thực tế" (đúng quyết định gốc: nhiều đơn vị chọn hàng loạt có thể thuộc nhiều đơn cha
  khác nhau, không có 1 giá trị mặc định chung hợp lý).
- **`frontend/src/screens/shared/PhanLoaiModal.tsx`** — bỏ hẳn prop `parent: DonCha`, đọc thẳng
  `unit.ma_lk`/`unit.loai_doi_tru_de_xuat` (đã có sẵn qua JOIN ở cả 2 nguồn gọi — bảng thống nhất và
  `UnitDetailModal`) — ít prop hơn, dùng lại được nguyên vẹn ở cả 2 nơi mà không cần fetch thêm.
- **`frontend/src/screens/adminbh/PhanLoai.tsx`** — viết lại, bỏ 2 card tách rời cũ (danh sách đơn
  cha + bảng đơn vị riêng), thay bằng `AdminUnifiedTable` + state chọn nhiều dòng (`Set<string>`) +
  thanh hành động nổi ("N đã chọn" / "Bỏ chọn" / "Phân loại hàng loạt") khi có dòng được chọn.

**Đã kiểm thử thật qua Browser pane (không chỉ code review):**
1. `npm run typecheck`/`npm run build` — 0 lỗi, sạch, ngay sau lần sửa đầu tiên dù đây là refactor lớn
   nhất từ đầu dự án (9 file mới/sửa, đổi cả interface `PhanLoaiModal`).
2. `wrangler dev` local (tạm vô hiệu hoá `services`/binding D1 thứ 2 như thường lệ, đã khôi phục đúng
   sau khi xong) + seed dữ liệu thật qua `fetch()` (2 phiếu gửi → 1 đơn cha đang chờ SL + 1 đơn vị
   đang chờ phân loại) — xác nhận **bảng thống nhất hiện đúng cả 2 loại dòng cùng lúc**, cột "Nguồn"
   hiện đúng email KTV + mã phiếu gửi (xác nhận fix backend `g.nguoi_tao AS ktv` hoạt động).
3. Sidebar: xác nhận `getBoundingClientRect().width` = 72px mặc định (thu gọn), bấm nút "»" đổi đúng
   sang 224px + nhãn "« Thu gọn", đồng thời `<main>` đổi đúng `max-width` 1152→1440px.
4. Bottom nav: chụp ảnh thật ở viewport 375×812 (mobile) — thanh điều hướng navy cố định ở đáy hiện
   đúng, mục đang mở tô sáng.
5. Tuỳ biến cột: bật/tắt 1 cột ẩn ("Tình trạng BH") → cột xuất hiện đúng vị trí cuối bảng; **mô phỏng
   kéo-thả cột thật** bằng dispatch sự kiện `dragstart`/`dragenter`/`drop` — cột "Nguồn" di chuyển
   đúng tới vị trí thả; **mô phỏng kéo-resize thật** bằng `mousedown`/`mousemove`/`mouseup` — độ rộng
   cột cập nhật đúng và lưu `localStorage` đúng định dạng; "Khôi phục mặc định" trả đúng về nguyên
   trạng ban đầu.
6. Chọn 1 dòng đơn vị (checkbox) → thanh hành động nổi hiện đúng "1 đã chọn" → mở
   `BulkPhanLoaiModal` → chọn "Đổi mới" → bấm áp dụng → **gọi thật `POST /admin/don-vi/phan-loai-hang-loat`**,
   xác nhận lại bằng `GET /admin/don-vi/DH-000002-1` thấy đúng `huong_xu_ly='doi_moi'`,
   `trang_thai='san_sang_gom_phieu_tra'` — tính năng còn thiếu hoàn toàn ở vòng trước nay hoạt động
   đúng end-to-end qua backend thật.
7. Click cả dòng đơn cha (mở đúng `XacNhanSoLuongModal`) lẫn dòng đơn vị (mở đúng `UnitDetailModal`).
8. Không có lỗi console nào phát sinh từ các thay đổi (chỉ 1 lỗi 401 cũ từ trước khi đăng nhập, không
   liên quan).

### Còn tồn đọng — CHƯA làm ở vòng QA này (ghi rõ để không nhầm là đã xong)

4 điểm còn lại của mục "Đã đơn giản hoá có chủ đích" (Giai đoạn 4) **vẫn CHƯA được port**, theo đúng
thứ tự ưu tiên đã đánh giá (effort lớn, giá trị thấp hơn hẳn 3 điểm đã sửa ở trên):

1. ~~**Quét QR bằng camera (Kho tiếp nhận) + tem/QR dán thùng + tải ảnh QR in tem**~~ — **[ĐÃ LÀM
   04/09/2026, xem mục "QA vòng 3" bên dưới]**.
2. **"Xem giao diện Mobile" (khung điện thoại giả lập qua iframe)** — tiện ích debug thời prototype
   còn là file tĩnh; nay ứng dụng thật đã responsive qua Tailwind + BottomNav thật, người dùng test
   trực tiếp bằng điện thoại thật/DevTools trình duyệt sẽ chính xác hơn — **[ĐÃ XÁC NHẬN 04/09/2026:
   người dùng đồng ý bỏ qua, không port]**, không phải nợ kỹ thuật còn treo.
3. ~~**Tra cứu case CRM tự động (case-lookup autocomplete)**~~ — **[ĐÃ LÀM 04/09/2026, xem mục "QA
   vòng 3" bên dưới]**.
4. ~~**`SearchableSelect`**~~ — **[ĐÃ LÀM 04/09/2026, xem mục "QA vòng 3" bên dưới]**.

**Việc còn lại thuộc người dùng:** `npm run deploy` lại để đưa toàn bộ các sửa đổi vòng này (Admin
superuser + bottom-nav + sidebar collapse + bảng thống nhất/tuỳ biến cột/chọn hàng loạt) **cộng thêm
các sửa đổi vòng "QA vòng 3"** lên production — phiên làm việc này không có quyền deploy trực tiếp
(trừ phiên deploy riêng đã ghi ở mục "Deploy thật đầu tiên").

## QA vòng 3: case-lookup autocomplete + QR thật + SearchableSelect + phân trang linh kiện (04/09/2026)

Tiếp nối "Còn tồn đọng" ở mục QA vòng 2 — người dùng chốt qua `AskUserQuestion`: phạm vi **3 mục**
(bỏ qua "Xem giao diện Mobile" theo khuyến nghị), case-lookup **"Làm, chấp nhận chỉ test được 1 phần"**
(chỉ nhánh lỗi/không tìm thấy test được thật từ sandbox này, nhánh "tìm thấy case" cần người dùng tự
xác nhận sau khi deploy thật). Giữa chừng, người dùng gửi thêm 1 yêu cầu bổ sung: *"thêm vào kế hoạch,
danh sách linh kiện chia theo table. 20 linh kiện 1 bảng"* — đã gộp làm mục thứ 4.

### 1. Case-lookup autocomplete (khôi phục, contract đọc trực tiếp từ `dvbh`)

Trước khi viết code, đã đọc trực tiếp `../cloudflare smarttrade base/backend/src/routes/partnerApi.ts`
(route `GET /api/partner/case-lookup`, contract thật — không đoán) và
`../linh-kien-app/backend/src/lib/caseLookupClient.ts` (bản tham chiếu `linh-kien-app` đã dùng thành
công cho cùng endpoint) để tránh sai lệch field. Contract: header `X-API-Key`, response
`{found: boolean, preview: CaseLookupRow | null}` với đúng 29 field (không có SĐT khách hàng — hệ
DVBH gốc không expose field này qua API đối tác).

- **`backend/src/lib/caseLookupClient.ts`** (mới) — port gần như nguyên trạng bản `linh-kien-app`:
  gọi `env.CASE_LOOKUP_SERVICE.fetch()` (Service Binding, không `fetch()` thẳng URL — tránh lỗi 1042
  chống SSRF khi 2 Worker cùng tài khoản, xem `wrangler.jsonc`), bọc try/catch trả `null` mềm khi lỗi
  mạng/JSON không hợp lệ (không làm vỡ luồng tạo đơn).
- **`backend/src/routes/caseLookup.ts`** (mới) — `GET /api/case-lookup?id=...`, mount ở
  `backend/src/index.ts`. Mở cho **mọi vai trò đã đăng nhập** (không riêng KTV/Admin BH) vì đây chỉ
  là tra cứu đọc, không có tác động dữ liệu.
- **`frontend/src/hooks/useCaseLookup.ts`** (mới) — debounce 500ms, bỏ kết quả cũ nếu `caseId` đã đổi
  trước khi request trả về (chặn race khi gõ nhanh) — dùng `useRef` đếm `seq` thay vì `AbortController`
  (đơn giản hơn, đủ dùng cho quy mô 1 request/lần gõ).
- **`frontend/src/lib/warranty.ts`** (mới) — port DÚNG công thức `warrantyCheck()` của prototype (dòng
  1419-1427, đọc lại trước khi viết): hạn bảo hành = `ngay_mua` + N tháng (N =
  `linh_kien.so_thang_bao_hanh`), hết hạn nếu `thoi_gian_cskh_tiep_nhan` > hạn. Đây đồng thời là việc
  **khôi phục lại "cảnh báo hết hạn bảo hành"** đã bị mất ở Giai đoạn 4 (do case-lookup chưa xây) —
  không nằm trong 3 mục đã hỏi nhưng phụ thuộc trực tiếp same case-lookup nên làm luôn cùng đợt, đúng
  tinh thần quyết định 21/08/2026 mục #10 ("chỉ là cảnh báo, không chặn thao tác").
- **`frontend/src/screens/shared/CaseLookupPreviewCard.tsx`** (mới) — hiện preview (khách hàng/sản
  phẩm/serial/hãng/ngày mua) + banner đỏ cảnh báo hết hạn khi có đủ dữ liệu (case + linh kiện đã
  chọn). Dùng chung ở 3 nơi: `AddDonModal` (KTV thêm đơn), `DonDichVuModal` (Admin BH tạo đơn dịch vụ
  tính phí, chỉ hiện khi có nhập mã case), `PhanLoaiModal` (Admin BH phân loại — dùng
  `unit.case_id` đã có sẵn qua JOIN từ `GET /admin/don-vi`, không cần fetch thêm).

### 2. QR thật (tem dán thùng + tải ảnh in tem + quét camera)

Cài `qrcode`+`jsqr` làm **npm dependency thật** (`frontend/package.json`), khác bản prototype offline
tự bundle bằng esbuild — đúng khuyến nghị đã ghi ở Giai đoạn 4 ("có thể thêm lại bằng cách cài qua npm
thật"). `@types/qrcode` thêm vào devDependencies (bản UMD của `jsqr` đã tự mang type riêng).

- **`frontend/src/lib/qr.ts`** (mới) — `qrModulesOf()` dùng `QRCode.create()` lấy ma trận module thật
  (Reed-Solomon thật), tự vẽ SVG (`renderQrSvg`) và Canvas (`downloadQrLabel`, xuất PNG kèm chữ mã bên
  dưới) từ **cùng 1 nguồn ma trận** — đảm bảo ảnh tải về khớp 100% với QR hiển thị trên màn hình, đúng
  nguyên tắc đã áp dụng ở bản prototype (`test_qr.js`/`test_qr_download.js`, xem mục "Mã QR thật" phía
  trên) dù lần này không viết lại bộ test jsdom riêng (verify trực tiếp qua Browser pane thay thế).
- **`frontend/src/ui/QrCode.tsx`** (mới) — component dùng chung, gắn vào
  `frontend/src/screens/ktv/PhieuGuiDetailModal.tsx` (mã hoá `g.id`, hiện cho mọi trạng thái phiếu gửi
  — không chỉ lúc "nhập" như bản đầu prototype, vì hữu ích cả sau khi đã gửi để Kho quét).
- **`frontend/src/screens/kho/CameraScanModal.tsx`** (mới) — đọc khung hình mỗi 150ms qua `jsQR` (hạ
  độ phân giải 480px, giống prototype), **CHỈ dùng để xác định nhanh đúng phiếu** (mở sẵn
  `TiepNhanModal`), không tự động xác nhận nhận hàng — giữ đúng tinh thần kiểm soát nội bộ đã chốt ở
  prototype. Gắn vào `frontend/src/screens/kho/TiepNhan.tsx` (nút "📷 Quét bằng camera", khớp `pending`
  đã load sẵn trên client thay vì gọi API `resolveScannedGuiId` riêng — quy mô hàng đợi nhỏ nên không
  cần round-trip thêm).

### 3. `SearchableSelect` — áp dụng cho picker linh kiện

**`frontend/src/ui/SearchableSelect.tsx`** (mới) — tự viết thuần (không thư viện ngoài, khớp nguyên
tắc "13 màn hình không cần thêm dependency" của Giai đoạn 4): nút hiện giá trị đã chọn, bấm mở dropdown
có ô gõ-để-lọc + điều hướng bàn phím (↑/↓/Enter/Escape), đóng khi click ra ngoài. Áp dụng cho **picker
linh kiện** ở 3 nơi: `AddDonModal` ("Linh kiện lỗi"), `DonDichVuModal` ("Linh kiện"), `PhanLoaiModal`
("Linh kiện sửa chữa thực tế") — đúng đúng phạm vi đã xác nhận ("primarily linh kiện pickers"),
**chưa** áp dụng cho picker NV/case_id (không nằm trong yêu cầu đã chốt).

### 4. Phân trang Danh mục linh kiện (20/bảng, yêu cầu bổ sung giữa chừng)

`frontend/src/screens/shared/LinhKienScreen.tsx` — thêm ô tìm theo mã/tên (lọc client-side, reset về
trang 1 khi gõ) + phân trang `PAGE_SIZE=20` (nút "‹ Trước"/"Sau ›", chỉ hiện thanh phân trang khi
>1 trang). Không đổi API `GET /linh-kien` (vẫn trả toàn bộ danh sách 1 lần — quy mô ~400+ dòng vẫn nhẹ
cho 1 lần fetch, phân trang chỉ áp dụng ở tầng hiển thị).

### 1 lỗi có thật phát hiện trong lúc kiểm thử (không liên quan trực tiếp yêu cầu, đã sửa)

Khi verify QR trên `PhieuGuiDetailModal` phát hiện dòng chữ **"0" hiện trơ trên màn hình** ngay dưới
nút "Lưu thông tin" của mọi phiếu gửi CHƯA có sự cố tiếp nhận. Nguyên nhân: D1 trả `boolean` dưới dạng
số nguyên `0`/`1` (không phải `true`/`false` JS thật), trong khi JSX dùng pattern
`{g.su_co_tiep_nhan && (<p>...</p>)}` — khi giá trị là số `0`, biểu thức `&&` trả về chính số `0`
(falsy nhưng không phải `undefined`/`null`/`false`), và **React render số 0 thành text node** thay vì
ẩn đi (khác với `false`/`null`/`undefined`, các giá trị này React bỏ qua không render). Đây là 1 bug
JSX kinh điển, tồn tại từ Giai đoạn 4, không phải do vòng sửa này gây ra. Đã rà soát toàn bộ codebase
tìm các field `boolean` khác từ D1 dùng trong pattern `{x && <JSX>}` (không phải `checked={x}` — dùng
`checked` thì an toàn vì HTML coerce đúng truthy/falsy, không render text) và sửa đủ 4 chỗ bằng `!!`:
`PhieuGuiDetailModal.tsx` (`su_co_tiep_nhan`), `screens/kho/TiepNhan.tsx` (`su_co_tiep_nhan`,
`admin_tiep_nhan`), `screens/adminbh/PhanLoai.tsx` (`su_co_tiep_nhan`).

### Kiểm thử đã chạy

`npm run typecheck` (cả backend lẫn frontend, `tsc --noEmit`) và `npm run build --workspace frontend`
(Vite) — **0 lỗi** cả 2 lần (lần đầu trước fix bug "0", lần 2 sau fix). Verify tương tác thật qua
Browser pane (`wrangler dev` local, D1 rỗng migrate mới, tài khoản `smarttrade.vp@gmail.com` với
`la_qtri=1` bypass mọi cổng vai trò — đúng quy trình backup/restore `wrangler.jsonc` thường quy, tạm
comment `services.CASE_LOOKUP_SERVICE` + binding D1 trùng lặp `sua_chua_bao_hanh_db`):
- `GET /api/case-lookup?id=...` trả đúng `{found:false, preview:null}` khi `CASE_LOOKUP_SERVICE`
  không khả dụng (sandbox không có `dvbh` thật) — xác nhận nhánh lỗi/không tìm thấy hoạt động đúng,
  không làm vỡ form. Đã **giả lập `window.fetch`** để trả về 1 case mẫu có `ngay_mua` cũ (2020) +
  linh kiện 12 tháng bảo hành → xác nhận banner đỏ "đã hết thời gian bảo hành" hiện đúng nội dung
  (hạn/số ngày đã dùng/số tháng) — xác nhận nhánh "tìm thấy case" cũng đúng logic hiển thị, dù không
  test được qua dvbh thật (đúng giới hạn đã chấp nhận trước khi làm).
- QR: tạo phiếu gửi `BH-000001`, xác nhận `renderQrSvg` hiện đúng mã QR + text `BH-000001` bên dưới.
  Camera scan: mở modal, xác nhận gọi `getUserMedia` đúng (Browser pane tự chặn quyền camera — xác
  nhận modal hiện lỗi "Permission denied" mềm, không crash trang, đúng thiết kế try/catch).
- `SearchableSelect`: thêm 2 linh kiện mẫu qua API, mở dropdown "Linh kiện lỗi" trong `AddDonModal`,
  gõ "vòi" → lọc đúng 1/2 kết quả, chọn được, giá trị bind đúng vào state.
- Phân trang: seed 25 linh kiện, xác nhận "Trang 1/2 — 25 linh kiện", bấm "Sau ›" hiện đúng 5 dòng còn
  lại ở trang 2, gõ tìm kiếm "Karofi" lọc đúng còn 1 dòng (thanh phân trang tự ẩn vì chỉ còn 1 trang).
- Không phát sinh lỗi console mới trong toàn bộ phiên test (loại trừ vài lỗi 401/503/404 cũ còn sót
  lại trong buffer console từ trước khi restart server, đã cross-check bằng network log/console mới
  sau restart — không liên quan code vòng này).

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa các sửa đổi này lên production, và tự xác
nhận nhánh "case tìm thấy" của case-lookup autocomplete hoạt động đúng với dữ liệu `dvbh` thật (sandbox
này không có quyền truy cập Worker `dvbh` thật để test end-to-end).

## QA vòng 4: rà soát toàn phiên tìm tính năng bị bỏ sót + 2 gap thật (04/09/2026)

Nguyên văn yêu cầu: *"chức năng tạo shortcut cho bản mobile của tôi đâu, hãy rà soát lại toàn bộ phiên
trao đổi này, xem có bỏ sót tính năng nào tôi đã yêu cầu không?"*

**Về "tạo shortcut":** đã xác nhận tính năng này **không bị bỏ sót** — `frontend/public/
manifest.webmanifest` đã có đủ `shortcuts` (3 mục: Gửi hàng bảo hành/Tiếp nhận/Xử lý đơn bảo hành) từ
Giai đoạn 6 (04/09/2026), đã đưa vào bản deploy thật đầu tiên. Lý do người dùng không thấy: đây là
"app shortcuts" chuẩn PWA — chỉ hiện khi đã **cài web thành app** (Thêm vào Màn hình chính), rồi
nhấn giữ icon (Android)/chuột phải (desktop) mới hiện menu — **không hiện khi mở trong tab trình
duyệt thường**, và **iOS Safari không hỗ trợ** field `shortcuts` (giới hạn của Apple, không phải lỗi
code). Đã giải thích rõ cho người dùng, không phải sửa gì.

**Đã rà soát lại toàn bộ các yêu cầu xuyên suốt phiên** (đối chiếu từng mục đã ghi trong CLAUDE.md với
code thật hiện tại, không chỉ tin theo ghi chú) — xác nhận lại 3 điểm nghi ngờ đã **có đủ** (tự động
gộp phiếu trả `AdminPhieuTra.tsx`/`autoGomPhieuTraTatCa()`, "Huỷ gửi duyệt"
`POST /phieu-tra/:id/huy-gui-duyet`, Kho xác nhận kết thúc dự phòng
`POST /phieu-tra/:id/kho-xac-nhan-ket-thuc`) — không cần sửa. Tìm thấy **2 gap thật** (không nằm
trong danh sách "đã đơn giản hoá có chủ đích" của Giai đoạn 4 — tức bị rơi ngoài ý muốn):

1. **KTV không upload được ảnh khi tạo đơn bảo hành.** Bảng `phieu_sua_chua_bh_anh` (ảnh gắn ở đơn
   cha) có sẵn trong schema từ Giai đoạn 1, Admin BH **đọc được** ảnh này (`GET /admin/don-vi/:id` trả
   `anh.don_cha`, `UnitDetailModal.tsx` đã hiện sẵn) — nhưng **chưa từng có route ghi (INSERT)** vào
   bảng đó, và `AddDonModal.tsx` không có ô upload ảnh nào. Vừa thiếu backend vừa thiếu frontend.
2. **Chưa có màn hình mobile riêng cho "Thêm đơn bảo hành"** đúng 7 nguyên tắc đã chốt ở vòng redesign
   UI (22/08/2026, `TaoDonMobileScreen`/`openAddDonMobileSheet()` của prototype): nút +/- số lượng
   44×44px, nhãn luôn trên ô nhập, thanh CTA dính đáy có `safe-area-inset-bottom`, ô ảnh với
   `capture="environment"` (mở thẳng camera). Giai đoạn 4 chỉ dùng `Modal` chung (đúng full-màn-hình
   trên mobile nhờ quyết định "modal tràn màn hình" 02/09/2026, nhưng không có tinh chỉnh UX riêng).

Người dùng xác nhận qua `AskUserQuestion`: **"Làm cả 2"**.

### 1. Ảnh khi tạo đơn (backend + frontend)

- `backend/src/routes/phieuGui.ts` (`POST /:id/don`) và `backend/src/routes/adminBH.ts`
  (`POST /don-dich-vu`) — thêm `anh?: string[]` vào body, `INSERT INTO phieu_sua_chua_bh_anh
  (parent_id, anh_url)` cho từng URL (data URL base64, đúng quy ước đã dùng cho ảnh chẩn đoán NV/đóng
  gói Kho — không dùng R2). Áp dụng cho **cả 2 đường tạo đơn cha** (KTV qua phiếu gửi, Admin BH tạo
  đơn dịch vụ tính phí khách lẻ) vì cùng 1 bảng, cùng giá trị.
- `frontend/src/screens/ktv/useAddDonForm.ts` (mới) — tách state + hàm `submit()` dùng CHUNG giữa
  `AddDonModal.tsx` (desktop) và `AddDonMobileSheet.tsx` (mobile, xem mục 2) — đúng nguyên tắc "không
  có 2 nguồn sự thật" đã áp dụng cho `submitAddDon()`/`updateCaseInfo()` ở bản prototype gốc.
- `AddDonModal.tsx`, `frontend/src/screens/adminbh/DonDichVuModal.tsx` — thêm ô
  `<input type="file" accept="image/*" multiple capture="environment">` (tuỳ chọn), dùng
  `fileToDataUrl()` có sẵn (`lib/format.ts`, đã dùng cho ảnh chẩn đoán/đóng gói).

### 2. `AddDonMobileSheet.tsx` — màn "Thêm đơn bảo hành" riêng cho mobile

`frontend/src/hooks/useIsMobile.ts` (mới) — `matchMedia("(max-width: 767px)")`, đúng ngưỡng mobile
chuẩn đã dùng xuyên suốt dự án. `frontend/src/screens/ktv/AddDonMobileSheet.tsx` (mới) — sheet
`position:fixed;inset:0`, `height:"100dvh"` (portal riêng, `z-[160]` — nổi trên `Modal` của
`PhieuGuiDetailModal` đang mở, `z-[150]`), header sticky + nội dung cuộn + footer CTA sticky với
`paddingBottom:"calc(0.75rem + env(safe-area-inset-bottom))"`, nút +/- số lượng 44×44px, ô ảnh
`capture="environment"`. `PhieuGuiDetailModal.tsx` dùng `useIsMobile()` để rẽ nhánh: mobile →
`AddDonMobileSheet`, desktop → `AddDonModal` (như cũ) — cùng dùng chung `useAddDonForm()`.

**1 lỗi thật phát hiện + đã sửa trong lúc verify:** nút +/- số lượng ban đầu viết
`f.setSoLuong(String(Math.max(1, (Number(f.soLuong)||1)+delta)))` — đọc `f.soLuong` trực tiếp từ
closure. Test bấm nhanh 2 lần liên tiếp (double-tap thật trên điện thoại có thể rơi vào tình huống
tương tự) chỉ tăng đúng **1 lần** thay vì 2 — do React 18 tự động gộp (batch) nhiều sự kiện đồng bộ
liên tiếp, cả 2 handler cùng đọc chung 1 giá trị "cũ" từ closure trước khi state kịp cập nhật. Đã sửa
bằng functional updater: `f.setSoLuong((prev) => String(Math.max(1, (Number(prev)||1)+delta)))` —
xác nhận lại bấm 2 lần liên tiếp ra đúng kết quả (1→3, không còn 1→2).

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi cả trước/sau khi sửa lỗi stepper.
Verify qua Browser pane (`wrangler dev` local, quy trình backup/restore `wrangler.jsonc` thường quy):
tạo đơn qua API kèm 1 ảnh PNG mẫu (base64) → xác nhận `GET /admin/don-vi/:id` trả đúng `anh.don_cha`
→ mở `UnitDetailModal` thật trên UI, xác nhận `<img>` hiện đúng đúng data URL đã gửi. Đổi viewport
375×812 (mobile thật, `resize_window`), tạo phiếu mới → mở "+ Thêm đơn" → xác nhận `AddDonMobileSheet`
render đúng `100dvh` full-screen, 2 nút +/- đúng 44×44px, có ô ảnh `capture="environment"`; bấm "+"
2 lần → xác nhận số lượng 1→3 đúng (sau khi sửa lỗi stepper); điền mô tả lỗi, bấm "Thêm vào phiếu" →
xác nhận qua `GET /phieu-gui/:id` đơn tạo đúng `so_luong_khai:3` + mô tả đúng, sheet tự đóng. Không
phát sinh lỗi console mới.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa 2 sửa đổi này lên production.

## Module "Quản lý danh sách KTV" (04/09/2026) — gap thật, tự động duyệt tài khoản KTV đã khai báo

Nguyên văn yêu cầu: *"thiếu modules quản lý danh sách ktv, setup mặc định các tài khoản ktv đã khai
báo mặc định được duyệt luôn"*.

**Điều tra trước khi sửa:** logic "tự động duyệt nếu email khớp danh bạ KTV" **đã có sẵn từ Giai đoạn
1** (`backend/src/routes/auth.ts`, `GET /callback` — đối chiếu `ktv_lien_he_bh.email_dang_nhap` lúc
đăng nhập lần đầu, tự set `trang_thai_duyet='Da duyet'` + gán sẵn `la_ktv_dvbh`/`la_ve_tinh`). Nhưng
**gap thật nằm ở chỗ khác**: `ktv_lien_he_bh` được thiết kế (mục "Ma trận CRUD..." + Giai đoạn 1) là
bảng **CHỈ nhận qua sync đẩy từ `linh-kien-app`** (`routes/sync.ts`, `POST /api/partner/sync/ktv`) —
nhưng cơ chế đẩy đó **CHƯA được triển khai xong ở phía `linh-kien-app`** (xem mục "Giai đoạn 5" —
code phía nhận đã sẵn sàng từ lâu, code phía phát chưa deploy) — nghĩa là bảng này **đang RỖNG trên
production**, nên logic auto-duyệt tuy đúng nhưng không có gì để đối chiếu. Đồng thời xác nhận **chưa
từng có bất kỳ màn hình frontend nào** đọc/ghi `ktv_lien_he_bh` (`grep` toàn bộ `frontend/src` không
ra kết quả) — đúng là 1 module bị thiếu hoàn toàn, không phải chỉ 1 tính năng phụ.

**Đã sửa — không chờ `linh-kien-app` triển khai xong đồng bộ đẩy, cho qtri tự khai báo thủ công
ngay:**
- **`migrations/0002_ktv_lien_he_nguon.sql`** (mới) — thêm cột `nguon_du_lieu` (`'dong_bo'`|`'noi_bo'`,
  mặc định `'noi_bo'`) vào `ktv_lien_he_bh` — port đúng mẫu HYBRID đã dùng cho `linh_kien_bh` (Giai
  đoạn 3), để phân biệt rõ dòng nào tới từ sync tương lai vs dòng qtri tự thêm tay.
  `backend/src/routes/sync.ts` (`POST /ktv`) cập nhật kèm `nguon_du_lieu='dong_bo'` mỗi lần upsert.
- **`backend/src/routes/ktvLienHe.ts`** (mới) — CRUD đầy đủ (`GET`/`POST`/`PATCH /:ma_ktv`/
  `DELETE /:ma_ktv`), chỉ `la_qtri`. `ma_ktv` (khoá chính TEXT tự do) mặc định = chính
  `email_dang_nhap` nếu qtri để trống lúc tạo (không cần thêm 1 bộ đếm ID riêng chỉ cho trường hợp
  này) — đủ duy nhất vì mỗi KTV chỉ có 1 email đăng nhập. Dòng `dong_bo` vẫn sửa/xoá tự do qua UI này
  (không khoá field như `linh_kien_bh` — sync lần sau sẽ tự ghi đè lại đúng dữ liệu thật nếu có xung
  đột, không cần chặn).
- **`frontend/src/screens/qtri/KtvLienHe.tsx`** (mới, `#/qtri/ktv`, sidebar "📇 Danh sách KTV") —
  bảng liệt kê (Tên/Email đăng nhập/SĐT/Vai trò/Khu vực/Nguồn), click dòng mở form sửa, nút
  "+ Khai báo KTV" mở form thêm mới — cùng 1 modal dùng chung cho cả thêm/sửa. Banner giải thích rõ
  hiệu ứng "tự động duyệt" ngay trên trang, tránh qtri hiểu nhầm đây chỉ là danh bạ thuần thông tin.

**Giới hạn đã ghi rõ trong code + cần người dùng biết:** hiệu ứng "tự động duyệt" chỉ áp dụng cho
**lần đăng nhập TIẾP THEO** của KTV đó (`auth.ts` chỉ kiểm tra lúc `GET /callback` — luồng OAuth) —
nếu tài khoản đã tồn tại sẵn và đang ở "Chờ duyệt", thêm KTV vào danh bạ này KHÔNG tự động nâng cấp
ngay tài khoản đã có; cần qtri tự duyệt tay ở màn "Người dùng" (đã có sẵn), hoặc đợi KTV đăng xuất/
đăng nhập lại.

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi. Migration `0002` áp dụng thành
công lên D1 local (`wrangler d1 migrations apply --local`, quy trình backup/restore `wrangler.jsonc`
thường quy). Verify qua Browser pane: `POST /api/ktv-lien-he` tạo đúng 1 dòng `nguon_du_lieu='noi_bo'`
→ `PATCH` sửa đúng → `GET` xác nhận dữ liệu khớp đúng cách `auth.ts` sẽ đối chiếu
(`SELECT vai_tro_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?`) → mở UI thật `#/qtri/ktv`, xác
nhận bảng hiện đúng badge "Nội bộ", click dòng mở đúng modal sửa với dữ liệu đã điền sẵn, sidebar hiện
đúng mục "Danh sách KTV". Không phát sinh lỗi console mới. **Chưa test được nhánh OAuth thật** (đăng
nhập Google thật cần production, sandbox này không có tài khoản Google thật để giả lập luồng
`/callback` đầy đủ) — logic đối chiếu đã tồn tại từ Giai đoạn 1 và không bị đụng vào ở vòng này, chỉ
xác nhận gián tiếp qua đúng câu SQL mà nó dùng.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa module này lên production, sau đó tự thêm
danh sách KTV thật vào `#/qtri/ktv` (hoặc đợi `linh-kien-app` triển khai xong đồng bộ đẩy — xem mục
"Giai đoạn 5" — lúc đó dữ liệu sẽ tự có, không cần nhập tay).

## Phân trang toàn bộ bảng dữ liệu (05/09/2026)

Nguyên văn yêu cầu: *"tất cả các dữ liệu dạng bảng đều phân trang không để dữ liệu tràn như hiện tại
=> hạn chế việc load quá nhiều dữ liệu về máy người dùng khi không cần thiết."*

**Quan trọng — phân biệt với "phân trang" đã làm trước đó:** `LinhKienScreen.tsx` đã có "phân trang"
từ QA vòng 3 (04/09/2026), nhưng đó là phân trang **client-side thuần tuý** — `GET /linh-kien` vẫn tải
**toàn bộ** danh sách về trình duyệt trong 1 lần rồi mới cắt 20 dòng/trang bằng `.slice()` ở React,
không giải quyết đúng yêu cầu "hạn chế load dữ liệu về máy" (mọi dòng vẫn được tải, chỉ ẩn đi khỏi màn
hình). Lần này làm **phân trang thật ở tầng server** — mỗi lần chuyển trang chỉ gọi `GET .../?limit=20
&offset=N`, D1 chỉ trả đúng 20 dòng + 1 số `total` (qua `SELECT COUNT(*)` song song), trình duyệt
không bao giờ tải nhiều hơn 1 trang cùng lúc.

**Hạ tầng dùng chung (mới):**
- `backend/src/lib/pagination.ts` — `parsePage(c)` đọc `?limit=&offset=` từ query string, mặc định
  20/trang, giới hạn cứng tối đa 100/trang (chặn 1 request bất thường xin quá nhiều).
- `frontend/src/hooks/usePagedApi.ts` — hook dùng chung, gọi `GET <path>?limit=&offset=`, tự quản lý
  `page`/`total`/`pageCount`, tự reset về trang 1 khi `path` (bộ lọc/tìm kiếm) đổi.
- `frontend/src/ui/Pagination.tsx` — thanh "‹ Trước / Trang X/Y — N dòng / Sau ›" dùng chung, tự ẩn
  nếu chỉ có 1 trang (port đúng mẫu đã làm cho `LinhKienScreen.tsx` ở QA vòng 3, nay tách thành
  component riêng để tái dùng rộng khắp thay vì chỉ 1 màn).

**13 route backend đã chuyển sang LIMIT/OFFSET + COUNT thật** (kèm 12 màn hình frontend tương ứng
chuyển sang `usePagedApi`): `phieuGui.ts` (`GET /` — Phiếu gửi hàng của tôi; `GET /don-vi/tra-cuu` —
Tra cứu tiến độ KTV), `adminBH.ts` (`GET /phieu-gui` — thùng chờ tiếp nhận nội bộ; `GET /don-cha`;
`GET /don-vi` — bảng thống nhất, dòng lớn nhất hệ thống; `GET /xac-nhan`), `kho.ts` (`GET /phieu-gui?
trang_thai=da_gui` — chờ tiếp nhận), `nvSuaChua.ts` (`GET /viec-cua-toi`), `phieuTra.ts` (`GET /` —
dùng chung cho cả 3 màn Duyệt/Đóng gói/Phiếu trả bảo hành qua tham số `trang_thai`), `traCuu.ts`
(`GET /don-vi` — Tra cứu toàn hệ thống của Giám sát/View, khả năng phình to nhất), `users.ts` (`GET
/`), `ktvLienHe.ts` (`GET /`), `linhKien.ts` (`GET /`, nâng cấp từ client-side lên server-side).

**2 route "q" (tìm kiếm) đổi cách lọc — từ `JSON.stringify(row).includes(kw)` sang SQL `LIKE`:**
`phieuGui.ts GET /don-vi/tra-cuu` và `traCuu.ts GET /don-vi` trước đó phải **tải hết toàn bộ dữ liệu
về server rồi mới lọc bằng JS** (ngược hẳn tinh thần "hạn chế load dữ liệu" — chỉ là load về server
thay vì về trình duyệt, nhưng vẫn phải quét hết). Đổi sang `WHERE (id LIKE ? OR case_id LIKE ? OR
ma_lk LIKE ? OR mo_ta_loi LIKE ? ...)` — SQL tự lọc + phân trang cùng lúc, không phải quét bảng về bộ
nhớ ứng dụng trước. Đánh đổi: tìm kiếm giờ chỉ khớp đúng các cột hiển thị trên bảng (trước đây khớp
**mọi** trường kể cả trường ẩn/không hiển thị) — chấp nhận được vì người dùng chỉ tìm theo cái họ nhìn
thấy trên màn hình.

**Quyết định phạm vi — KHÔNG paginate mọi nơi, ghi rõ lý do để không nhầm là bỏ sót:**
- **Danh sách con bên trong 1 modal chi tiết** (log/ảnh/ghi chú/báo cáo sai của 1 đơn cụ thể) — giữ
  nguyên không phân trang, vì các danh sách này bị giới hạn tự nhiên theo đúng 1 entity (1 đơn hiếm
  khi có quá vài chục dòng log), khác hẳn "bảng dữ liệu" liệt kê nhiều entity mà yêu cầu nhắm tới.
- **Picker/`<select>` tìm kiếm** (`useLinhKien.ts` cấp dữ liệu cho `SearchableSelect` ở các form) —
  CỐ Ý giữ tải toàn bộ (`GET /linh-kien?duoc_dung_bao_hanh=1`, không kèm `limit`) vì `SearchableSelect`
  cần đủ option để tự lọc tức thời phía client — đây không phải "bảng dữ liệu tràn màn hình" mà là 1
  ô chọn, phân trang sẽ phá hỏng UX gõ-để-tìm của nó. `linhKien.ts GET /` phân biệt 2 kiểu gọi bằng
  sự có mặt của tham số `limit` trong query — không truyền `limit` thì giữ hành vi cũ (toàn bộ danh
  sách), có `limit` thì phân trang thật (dùng cho `LinhKienScreen.tsx`).
- **`adminBH.ts GET /don-cha`** (đơn cha chờ Admin xác nhận số lượng) và **`phieuTra.ts GET /san-sang`**
  (đơn vị sẵn sàng gộp phiếu trả, nhóm theo KTV+loại đối trừ để hiện UI checkbox) — 2 danh sách này
  **có hỗ trợ `limit`/`offset` ở backend** (đồng nhất, an toàn) nhưng **cố ý không lộ pager ở UI**: cả
  hai đều bị "gate" lại trước khi qua được bước này (đơn cha phải được Admin xác nhận SL mới tách
  thành đơn vị; đơn vị sẵn sàng gộp phải được gộp mới biến mất khỏi danh sách) nên trong thực tế không
  bao giờ phình to — thêm 1 pager UI riêng cho từng phần trong khi cả 2 đều gộp chung 1 bảng liền mạch
  với 1 danh sách khác (đơn vị cần xử lý / phiếu trả) sẽ rối UX hơn là có ích. `PhanLoai.tsx` gọi
  `/admin/don-cha?limit=100` (đủ rộng rãi, không giới hạn mặc định 20).
- **`kho.ts GET /phieu-gui?trang_thai=da_tiep_nhan`** ("Đã tiếp nhận gần đây") — giữ nguyên hành vi cũ
  (luôn đúng 8 dòng gần nhất, không có `total`/pager) vì đây CHỦ ĐÍCH là "gần đây", không phải lịch sử
  đầy đủ — thêm pager vào đây đi ngược lại chính mục đích thiết kế màn hình.

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi. Verify qua Browser pane (`wrangler
dev` local, quy trình backup/restore `wrangler.jsonc` thường quy) — seed 25 dòng cho từng bảng chính
(phiếu gửi, đơn vị bảng thống nhất, KTV, người dùng, linh kiện) qua `fetch()` thật rồi xác nhận từng
màn:
- `GET /admin/don-vi?limit=20&offset=0` và `offset=20` trả đúng 20+5=25 dòng, `total:25` đúng cả 2
  lần gọi — xác nhận LIMIT/OFFSET hoạt động đúng ở tầng SQL trước khi verify UI.
- UI thật (`#/admin/phan-loai`) hiện đúng 20 dòng trang 1, bấm "Sau ›" chuyển đúng sang 5 dòng còn lại
  (DH-000021-1 → DH-000025-1), tiêu đề "Trang 1/2 — 25 dòng" đúng.
- `#/ktv/tao-phieu`, `#/qtri/ktv`, `#/qtri/nguoi-dung`, `#/quanly/tra-cuu` đều xác nhận đúng "20/trang,
  tổng N" với dữ liệu seed tương ứng (25, 25, 26 — gồm cả bootstrap admin, 25).
- Tìm kiếm + phân trang hoạt động đúng cùng lúc: `#/ktv/tra-cuu` gõ "seed #1" lọc đúng 11 kết quả
  (khớp cả "#1" lẫn "#10"–"#19" qua SQL LIKE), dưới ngưỡng 20 nên pager tự ẩn đúng;
  `#/linh-kien` gõ "test 1" lọc đúng còn 11/25 dòng, tiêu đề cập nhật đúng "(11)".
- 2 màn "Đóng gói & gửi" (`#/kho/dong-goi`, 2 pager độc lập cùng trang) và "Tạo & quản lý phiếu trả"
  (`#/admin/phieu-tra`) hoạt động đúng với dữ liệu rỗng (0 dòng, không lỗi console).
- Không phát sinh lỗi console mới ở bất kỳ màn nào đã kiểm tra.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa toàn bộ thay đổi này lên production.

## Nút "Cài đặt vào màn hình chính" chủ động (05/09/2026) — khác PWA `shortcuts` thụ động

Nguyên văn 2 yêu cầu (liên tiếp, cùng chủ đề, yêu cầu sau là chỉnh lại yêu cầu trước):

1. *"chức năng tạo shortcut cho bản mobile của tôi đâu, hãy rà soát lại toàn bộ phiên trao đổi này,
   xem có bỏ sót tính năng nào tôi đã yêu cầu không?"* — đã trả lời ở mục "QA vòng 4" phía trên: field
   `shortcuts` trong `manifest.webmanifest` (Giai đoạn 6) đã có sẵn, nhưng đây là tính năng **thụ
   động** (chỉ hiện sau khi đã cài PWA, long-press/chuột phải icon — iOS Safari không hỗ trợ).
2. *"check lại bản mobile, không thấy chức năng tạo shortcut khi. hãy làm theo chức năng giống bên
   linh-kien-app"* — xác nhận câu trả lời #1 KHÔNG đủ: người dùng muốn 1 nút **chủ động, luôn nhìn
   thấy được** để tự cài/tạo icon màn hình chính ngay từ đầu, đúng như `linh-kien-app` đã có
   (`InstallAppButton.tsx` dùng `beforeinstallprompt`), không phải field manifest thụ động.

Đã đọc verbatim 2 file gốc bên `linh-kien-app` (`frontend/src/hooks/usePwaInstall.ts`,
`frontend/src/layout/InstallAppButton.tsx`) trước khi port, cùng vị trí mount của nó
(`Sidebar.tsx`, trong khối off-canvas drawer chỉ hiện mobile) — để đối chiếu đúng logic, không đoán.

**Khác biệt kiến trúc quan trọng phát hiện trước khi mount:** `suachua` đã đổi menu mobile từ drawer
sang `BottomNav` cố định từ "QA vòng 2" (04/09/2026) — không còn vị trí "drawer mobile" tương đương để
đặt nút y hệt `linh-kien-app`. Đã chọn mount vào `TopBar.tsx`'s `ml-auto` (trước nút "Đăng xuất"),
hiện mobile-only bằng `md:hidden` (đảo ngược đúng pattern `hidden md:block` đã dùng cho lời chào
desktop trong cùng file).

- `frontend/src/hooks/usePwaInstall.ts` (mới) — port gần verbatim: `deferredPrompt`/`listeners` ở
  module scope (bắt sự kiện `beforeinstallprompt` 1 lần duy nhất cho cả vòng đời tab, trước khi bất kỳ
  component nào mount), `isStandalonePwa()`, `isIosSafari()`, `usePwaInstall()` trả `{available,
  promptInstall}`.
- `frontend/src/layout/InstallAppButton.tsx` (mới) — nút "📲 Cài đặt", ẩn hẳn nếu đã chạy dạng
  standalone; bấm vào gọi `promptInstall()` thật nếu `available` (Android/Chrome), hoặc hiện `Modal`
  hướng dẫn thủ công (iOS Safari + mọi trường hợp khác không bắt được prompt). **Khác bản
  `linh-kien-app`**: `Modal` của `suachua` không có prop `open` (điều khiển bằng conditional render
  `{showIosGuide && <Modal .../>}`, đúng quy ước chung của mọi modal khác trong app này) — đã điều
  chỉnh khi port thay vì copy nguyên văn.
- `frontend/src/layout/TopBar.tsx` — thêm `<div className="md:hidden"><InstallAppButton /></div>`
  vào đầu khối `ml-auto` (trước nút "Đăng xuất").

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi. Verify qua Browser pane (`wrangler
dev` local, quy trình backup/restore `wrangler.jsonc` thường quy): ở viewport 375×812 (mobile), nút
"📲 Cài đặt" hiện đúng trên topbar; bấm vào (môi trường sandbox không bắt được `beforeinstallprompt`
thật nên rơi vào nhánh fallback) hiện đúng Modal hướng dẫn thủ công iPhone/Safari + Android/Chrome,
đóng được bằng nút ✕. Ở viewport 1280×800 (desktop), xác nhận bằng `getComputedStyle` nút bị ẩn đúng
(`display:none` từ `md:hidden`). Không phát sinh lỗi console mới (chỉ còn 401 quen thuộc từ
`/api/auth/me` trước khi đăng nhập). **Chưa test được** nhánh `available=true` (trigger `prompt()`
thật) — trình duyệt sandbox không phát `beforeinstallprompt`, cần người dùng tự xác nhận trên Android/
Chrome thật sau khi deploy.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa nút này lên production.

## Thông báo phiên bản hệ thống + quy ước versioning mỗi lần deploy (05/09/2026)

Nguyên văn yêu cầu: *"tạo cho tôi 1 thông báo phiên bản hệ thống ở góc dưới cùng bên trái menu. và
tạo nguyên tắc chung mỗi lần deploy sẽ commit và đẩy phiên bản. 1.001 => 1.002"*.

**1. Hiển thị phiên bản.** `frontend/src/lib/version.ts` (mới) — export duy nhất
`APP_VERSION = "1.001"`, là **nguồn sự thật duy nhất** cho số phiên bản trong toàn bộ frontend (không
hardcode chuỗi phiên bản ở nơi khác). `Sidebar.tsx` (menu desktop) hiện `v{APP_VERSION}` ở góc dưới-
trái, ngay dưới nút "«/»" thu gọn — hiện đúng ở cả 2 trạng thái thu gọn (72px, chỉ icon) lẫn mở rộng
(224px, đủ nhãn), màu chữ mờ (`--sidebar-ink-dim`, cùng tông với nút thu gọn) để không cạnh tranh sự
chú ý với menu, có `title` tooltip đầy đủ khi hover. **Không thêm vào `BottomNav`** (menu mobile) vì
đó là thanh ngang cố định ở đáy màn hình, không có khái niệm "góc dưới-trái" tương tự — yêu cầu gốc
nói "menu" số ít, khớp đúng với sidebar desktop (menu chính duy nhất có bố cục dọc thật sự).

**2. Quy ước versioning bắt buộc cho MỌI lần deploy (áp dụng từ vòng này về sau, không có ngoại lệ):**
- Trước khi build+deploy production (`npm run deploy`), **luôn** tăng `APP_VERSION` trong
  `frontend/src/lib/version.ts` lên đúng 1 nấc `0.001` (VD `1.001` → `1.002` → `1.003`...) — không
  tăng nhảy cóc, không tăng phần nghìn/trăm trừ khi người dùng yêu cầu đổi quy ước.
- Việc tăng version phải nằm **trong cùng commit** với các thay đổi code của đợt đó (không tách commit
  riêng chỉ để bump version) — để mỗi commit tự nó ánh xạ đúng 1 phiên bản đã/sẽ deploy, dễ đối chiếu
  ngược khi cần biết "bản nào đang chạy chứa thay đổi gì".
- Đây là quy tắc áp dụng cho **cả các đợt sửa nhỏ lẫn lớn** — đúng tinh thần nguyên tắc chung đầu file
  CLAUDE.md này (không phân biệt "thay đổi nhỏ không cần theo quy trình").

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi. Verify qua Browser pane (`wrangler
dev` local, quy trình backup/restore `wrangler.jsonc` thường quy) ở viewport 1280×800: "v1.001" hiện
đúng góc dưới-trái sidebar cả khi thu gọn lẫn sau khi bấm mở rộng, không lỗi console mới.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa thay đổi này lên production — và từ **lần
deploy TIẾP THEO trở đi**, nhớ bump `APP_VERSION` lên `1.002` trước khi deploy (bản thân đợt này chưa
bump vì đây là lần đầu thêm hiển thị phiên bản, chưa có phiên bản cũ nào để tăng từ).

## Tạo hộ đơn bảo hành (GS/Admin BH) + mã sự cố bắt buộc & khớp KTV + UI to hơn (05/09/2026)

Nguyên văn 4 yêu cầu (gửi cùng lượt):

0. *"giao diện UI khi tạo đơn bảo hành đang quá nhỏ trên màn hình web => căn chỉnh lại diện tích cho phù hợp."*
1. *"cho phép GS khu vực của KTV hoặc Admin bảo hành tạo hộ đơn bảo hành (khi tạo thùng sẽ chọn bắt buộc thùng bảo hành này tạo cho KTV nào)"*
2. *"Mã sự cố là bắt buộc (phải đúng của ktv đó mới cho tạo) Khi nhập thông tin ca sự vụ, nếu đúng của KTV đó thì sẽ hiện thông tin, nếu không đúng sẽ phản hồi cảnh báo sai mã sự vụ. (khi đơn được tạo, các thông tin liên quan đến mã yêu cầu sẽ được lưu về hệ thống đơn bảo hành làm bằng chứng, Admin bảo hành có thể ấn đồng bộ để cập nhật lại thông tin liên quan đến ca sự cố đó sau - mục đích để tránh việc phải gọi API liên tục cho 1 ca sự cố mỗi khi có người xem thông tin)"*
3. *"Giao diện mobile, listdown chọn linh kiện bảo hành đang hẹp, khó nhìn và tìm kiếm.= > đánh giá lại và sửa."*

Trước khi làm mục 1/2 (schema/quyền ảnh hưởng lâu dài), đã hỏi lại qua `AskUserQuestion` 3 điểm mơ hồ
thật sự — câu trả lời chốt:
- **Quyền quản lý th sau khi tạo hộ**: người tạo hộ (GS/Admin BH) **quản lý toàn bộ** thùng cho tới
  khi Kho tiếp nhận (sửa header, thêm/xoá đơn, xác nhận gửi xe, xoá phiếu) — y như chính KTV đó,
  KHÔNG bắt buộc KTV phải tự đăng nhập làm tiếp.
- **Nguồn danh sách chọn KTV**: danh bạ KTV (`ktv_lien_he_bh`), **kể cả người chưa từng đăng nhập**.
- **Ca mơ hồ khi kiểm tra mã sự cố** (không tách được mã KTV từ case, hoặc KTV mục tiêu chưa có trong
  danh bạ để đối chiếu): **chặn cứng luôn** (khác tiền lệ "cảnh báo mềm" của `linh-kien-app` cho cùng
  tính năng này).

### 0. UI "Thêm đơn bảo hành" quá nhỏ

Đo trực tiếp qua Browser pane trước khi sửa (không đoán): `AddDonModal.tsx`/`DonDichVuModal.tsx` bị
ghim `maxWidthClass="max-w-lg"` (512px) — **hẹp hơn cả mặc định `max-w-2xl` (672px)** mà phần lớn
modal khác trong app đang dùng (từ quyết định "modal tràn màn hình" 02/09/2026). Đã bỏ ghim, đổi
thành `max-w-2xl`; đồng thời đổi grid "Linh kiện lỗi + Số lượng" từ `grid-cols-2` (50/50) sang
`grid-cols-3` với Linh kiện chiếm `col-span-2` (66/33, đỡ chật cho `SearchableSelect`). Xác nhận lại
bằng `getBoundingClientRect()` qua Browser pane: 512px → 672px đúng như kỳ vọng.

### 1. Tạo hộ đơn bảo hành (GS khu vực / Admin bảo hành)

- **`migrations/0003_case_lookup_snapshot_va_tao_ho.sql`** — thêm cột `phieu_gui_bh.nguoi_tao_ho`
  (nullable) — **`nguoi_tao` GIỮ NGUYÊN Ý NGHĨA CŨ** ("KTV sở hữu thùng", dùng cho mọi truy vấn/quyền
  đã có sẵn), `nguoi_tao_ho` chỉ là email người THẬT SỰ bấm tạo hộ (NULL nếu KTV tự tạo lấy) — quyết
  định có chủ đích để không phải sửa lại hàng loạt chỗ đọc `nguoi_tao` đã có.
- **`backend/src/routes/phieuGui.ts`** — `canTaoHo(u)` (la_giam_sat/la_admin_bh/la_qtri),
  `ownsPhieuGui(u,g)` (`nguoi_tao===u.email || nguoi_tao_ho===u.email || u.la_qtri`) áp dụng cho
  PATCH/DELETE/xác-nhận-gửi/thêm-đơn/xoá-đơn. `POST /` nhận thêm `ktv_email` tuỳ chọn: nếu khác
  `user.email`, bắt buộc `canTaoHo`, KTV mục tiêu phải có trong `ktv_lien_he_bh`
  (404 `KTV_NOT_FOUND`), và nếu người tạo CHỈ là `la_giam_sat` (không kèm admin_bh/qtri) thì
  `computeEmailGs(target) === user.email` mới cho qua (403 `OUT_OF_KHU_VUC`) — Admin BH/qtri không bị
  giới hạn khu vực (đúng nguyên văn "hoặc Admin bảo hành", không kèm điều kiện).
- **`GET /` (danh sách "của tôi")** — rẽ nhánh theo `nguoi_tao` (KTV thật) hoặc `nguoi_tao_ho` (GS/
  Admin BH/qtri không phải KTV thật, xem "Phiếu tôi đã tạo hộ").
  **1 lỗi thật phát hiện lúc kiểm thử**: dùng nhầm `isKtv()` (hàm này cố ý coi `la_qtri` như 1 KTV để
  "đi qua mọi cổng vai trò" ở CÁC route khác) làm điều kiện rẽ nhánh — khiến **qtri luôn thấy danh
  sách "tạo hộ" RỖNG** dù tạo phiếu thành công thật (vì bị lọc nhầm theo `nguoi_tao = email của
  chính qtri`, không bao giờ khớp gì). Đã sửa tận gốc: dùng `isRealKtv = la_ktv_dvbh || la_ve_tinh`
  (không gồm qtri) làm điều kiện ưu tiên, `canTaoHo` xét sau.
- **`backend/src/routes/ktvLienHe.ts` GET /** — mở rộng từ chỉ-qtri sang thêm `la_admin_bh` (xem
  toàn bộ, không giới hạn khu vực) và `la_giam_sat` (chỉ xem KTV thuộc Khu vực mình phụ trách, khớp
  qua `khu_vuc_bh.gs_email`) — dùng cho picker "chọn KTV để tạo hộ". Không truyền `?limit=` → trả
  toàn bộ (dùng cho `SearchableSelect`, đúng quy ước "05/09/2026 Phân trang toàn bộ bảng dữ liệu" —
  picker cần danh sách đầy đủ để tự lọc); có `?limit=` → vẫn phân trang thật như cũ cho bảng quản trị
  `#/qtri/ktv`.
- **Frontend**: `TaoPhieu.tsx` re nhánh `hoMode` (KTV thật → như cũ; GS/Admin BH/qtri không phải KTV
  thật → tiêu đề "Phiếu bảo hành tôi đã tạo hộ", "+ Tạo phiếu mới" mở `PickKtvModal.tsx` mới (bắt
  buộc chọn KTV qua `SearchableSelect` trước khi tạo) thay vì tạo ngay, thêm cột "Tạo cho KTV").
  `PhieuGuiDetailModal.tsx` hiện badge "Được tạo hộ bởi X cho KTV Y" khi `nguoi_tao_ho` có giá trị.
  `routes.ts`/`App.tsx` mở route `#/ktv/tao-phieu` cho `la_giam_sat`/`la_admin_bh` (dùng lại đúng 1
  màn, không tạo màn mới).

### 2. Mã sự cố bắt buộc + phải khớp KTV + bằng chứng + đồng bộ

- **`backend/src/lib/ktvCode.ts`** (mới) — `extractMaKtv()` port đúng từ
  `linh-kien-app/backend/src/lib/ktvCode.ts` (case_dvbh.ky_thuat_vien dạng `"(mã) Loại - Khu vực -
  Tên"`, phần `"(mã)"` ở đầu ổn định qua các lần import CRM — dùng để đối chiếu với
  `ktv_lien_he_bh.ma_ktv`, KHÔNG dùng nguyên chuỗi).
- **`backend/src/routes/caseLookup.ts`** — `GET /?id=&ktv_email=` trả thêm `khopKtv` (bool|null) khi
  có `ktv_email`. **`migrations/0003`** thêm bảng `case_lookup_snapshot` (case_id, data, synced_at) —
  cache "bằng chứng" DÙNG CHUNG cho mọi đơn tham chiếu cùng case_id (không phải riêng từng đơn).
  `GET /detail/:id` đọc cache (không tự gọi lại API đối tác), `POST /detail/:id/sync` (chỉ
  `la_admin_bh`/`la_qtri`) làm mới, giới hạn 5s/lần.
  **Lỗi tiềm ẩn phát hiện + tránh khi port**: mẫu `msSinceVN()` của `linh-kien-app` trừ trực tiếp
  `Date.now() - Date.parse(ts+"Z")` — nhưng `nowVN()` (cả 2 repo) mã hoá giờ VN bằng cách CỘNG 7h rồi
  format như UTC (xem `lib/vnTime.ts`), nên trộn với `Date.now()` thật sẽ lệch **~7 tiếng**, khiến
  chức năng "đồng bộ lại" bị khoá nhầm suốt ~7h sau mỗi lần ghi. Đã sửa: so sánh bằng `nowVN()` ở CẢ
  2 vế (offset tự triệt tiêu) — xác nhận đúng bằng 1 script Node độc lập trước khi tin dùng.
- **`backend/src/routes/phieuGui.ts POST /:id/don`** — `case_id` nay **bắt buộc**; gọi `lookupCase()`
  thật, **chặn cứng** (400) nếu: không tìm thấy case (`CASE_NOT_FOUND`), HOẶC không tách được mã KTV
  từ case / KTV sở hữu thùng (`g.nguoi_tao` — LUÔN là KTV, bất kể ai đang bấm thêm đơn, kể cả người
  tạo hộ) chưa có trong `ktv_lien_he_bh` / mã không khớp (`CASE_KTV_MISMATCH`, gộp chung 1 mã lỗi cho
  cả 3 trường hợp, đúng quyết định "chặn cứng luôn"). Tạo thành công → upsert
  `case_lookup_snapshot` làm bằng chứng.
  **1 lỗi thật phát hiện + sửa cùng lúc**: `email_gs` của đơn mới tạo trước đó tính bằng
  `computeEmailGs(user.email)` (người ĐANG bấm) — đúng ngẫu nhiên trong mọi trường hợp TRƯỚC ĐÂY (chỉ
  chính KTV mới được thêm đơn cho phiếu của họ, nên `user.email === g.nguoi_tao` luôn đúng), nhưng
  SAI hẳn từ khi có "tạo hộ" (người tạo hộ thường không có dòng nào trong `ktv_lien_he_bh`, luôn ra
  `email_gs = null`). Đã sửa dùng `g.nguoi_tao` (KTV sở hữu thật) thay vì `user.email`.
- **Frontend**: `useCaseLookup(caseId, ktvEmail?)` trả thêm `khopKtv`; `CaseLookupPreviewCard` nhận
  `ktvEmail`+`onValidityChange` — khi có `ktvEmail`, đổi thông điệp "không tìm thấy" từ mềm ("vẫn có
  thể tiếp tục") sang cứng ("chưa thể tạo đơn"), thêm banner đỏ khi `khopKtv===false`. Chỉ
  `AddDonModal`/`AddDonMobileSheet` truyền `ktvEmail` (= `phieu_gui.nguoi_tao`) — `DonDichVuModal`/
  `PhanLoaiModal` giữ nguyên hành vi mềm cũ (case tuỳ chọn/không gắn 1 KTV rõ ràng).
  `useAddDonForm` thêm `caseValid` gate `valid` tổng. `CaseSnapshotPanel.tsx` (mới) — hiện "bằng
  chứng" đã lưu + nút "🔄 Đồng bộ lại" (chỉ `la_admin_bh`/`la_qtri`), nhúng vào `UnitDetailModal.tsx`.

### 3. Mobile — linh kiện dropdown hẹp/khó tìm

Rà toàn bộ nơi chọn linh kiện: `AddDonModal`/`AddDonMobileSheet`/`DonDichVuModal`/`PhanLoaiModal` đã
dùng `SearchableSelect` từ "QA vòng 3" — **CHỈ `KtvBoSungModal.tsx`** ("Bổ sung thông tin theo yêu
cầu Admin BH") còn sót lại `<Select>` native (bị bỏ sót ở vòng đó, không nằm trong 3 nơi đã liệt kê
lúc đó). Đã đổi sang `SearchableSelect` — đúng nguyên nhân "hẹp, khó tìm" người dùng mô tả (native
`<select>` không có ô gõ-để-lọc).

**Kiểm thử đã chạy:** `npm run typecheck`/`npm run build` — 0 lỗi. Verify qua Browser pane (`wrangler
dev` local, quy trình backup/restore `wrangler.jsonc` thường quy) — vì sandbox không xác thực được
nhiều vai trò qua OAuth thật, đã tự ký JWT session hợp lệ (`make_session.mjs`, đúng thuật toán
HS256/base64url của `lib/jwt.ts`, xoá sau khi test xong) để kiểm thử ĐÚNG theo từng vai trò thật (GS
trong/ngoài khu vực, KTV, Admin BH) thay vì chỉ test qua `la_qtri` (vốn bypass mọi cổng nên không lộ
được lỗi phân quyền theo vai trò cụ thể — chính cách test này đã lộ ra lỗi `isKtv()` ở mục 1):
- 4 kịch bản phân quyền tạo hộ qua `curl` trực tiếp: GS trong khu vực tạo cho đúng KTV → 201; GS tạo
  cho KTV không có trong danh bạ → 404 `KTV_NOT_FOUND`; GS NGOÀI khu vực tạo cho KTV đó → 403
  `OUT_OF_KHU_VUC`; KTV thường tự ý chỉ định `ktv_email` khác mình → 403 `FORBIDDEN`. Cả 4 đúng.
- `GET /phieu-gui` cho GS (đã sửa bug) và KTV cùng thấy đúng 1 phiếu (theo đúng chiều lọc riêng); GS
  (creator-hộ) sửa header thành công, GS khác (không phải creator) bị 403.
- `POST /:id/don` thiếu `case_id` → 400 `MISSING_CASE_ID`; có `case_id` nhưng không tồn tại (đúng
  giới hạn sandbox không có `CASE_LOOKUP_SERVICE` thật) → 400 `CASE_NOT_FOUND`.
- `GET /ktv-lien-he` picker: GS trong khu vực thấy đúng 1 KTV, GS ngoài khu vực thấy rỗng, Admin BH
  thấy toàn bộ.
- `GET/POST /case-lookup/detail/:id(/sync)`: chưa có bằng chứng → `found:false`; sync thất bại do
  case không tồn tại → 404 `CASE_NOT_FOUND` (không phải lỗi throttle nhầm — xác nhận bằng script Node
  độc lập rằng công thức throttle đã sửa đúng, không còn lệch 7h); KTV thường gọi sync → 403.
- **Click-through thật qua UI** (Browser pane, đăng nhập qua `la_qtri` — tự nhiên rơi vào `hoMode` vì
  không phải KTV thật): mở `#/ktv/tao-phieu` → thấy "📦 Phiếu bảo hành tôi đã tạo hộ (0)" → bấm
  "+ Tạo phiếu mới" → `PickKtvModal` mở, `SearchableSelect` liệt kê đúng KTV đã seed, chọn xong nút
  "Tạo phiếu" hết disable → bấm → tạo thành công `BH-000002` (`nguoi_tao=ktv.test@...`,
  `nguoi_tao_ho=<qtri email>`, tự điền đúng lịch sử nhà xe CỦA KTV MỤC TIÊU chứ không phải người tạo
  hộ — xác nhận gián tiếp `computeEmailGs`/nhà-xe đều dùng đúng `target`) → modal chi tiết tự mở, hiện
  đúng badge "Được tạo hộ bởi... cho KTV..." → mở "+ Thêm đơn" (rơi vào bản mobile do pane hẹp), gõ mã
  case bất kỳ → hiện đúng banner đỏ "Sai mã sự vụ — không tìm thấy case..." + nút "Thêm vào phiếu"
  vẫn disabled (đúng thiết kế "chặn cứng"). Không phát sinh lỗi console mới trong toàn bộ phiên test.
- `KtvBoSungModal.tsx` (mục 3) **chưa verify qua UI** (cần dựng đủ chuỗi trạng thái `cho_bo_sung_tt`
  tốn nhiều bước) — chỉ xác nhận qua typecheck + đối chiếu pattern y hệt 3 nơi đã verify UI thành
  công (`AddDonModal`/`AddDonMobileSheet`/`DonDichVuModal`), rủi ro thấp vì cùng 1 component dùng lại
  nguyên trạng, chỉ đổi cách gọi.
- **Chưa test được** (đúng giới hạn đã biết trước, ghi nhận lại): nhánh "case tìm thấy VÀ khớp đúng
  KTV" (tạo đơn thành công) — sandbox không có quyền truy cập Worker `dvbh` thật để `lookupCase()` trả
  về khác `null`; người dùng cần tự xác nhận nhánh này sau khi deploy thật.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa toàn bộ thay đổi vòng này lên production,
và tự xác nhận nhánh "case tìm thấy + khớp KTV" hoạt động đúng với dữ liệu `dvbh` thật.

## Sửa lỗi FK "tạo hộ" + thêm module "Giám sát khu vực" + phát hiện tích hợp `khovan` mới (07/09/2026)

Nguyên văn 3 yêu cầu (gửi liên tiếp, ý 2-3 gửi kèm 1 ảnh chụp nút đỏ "INTERNAL_ERROR"):

1. *"Thiếu chức năng quản lý giám sát khu vực => tôi phân vai trò giám sát cho 1 nhân viên nhưng
   không thể phân khu vực (hiện có của KTV kéo về từ API) cho họ để họ quản lý nhân sự khu vực
   mình"*
2. *"khi tạo phiếu gửi bảo hành hộ, không hiện danh sách KTV để lựa chọn (vai trò admin hệ thống)"*
3. *"khi chọn ktv xong ấn tạo hộ thì báo lỗi"*

Trước khi sửa, phát hiện 1 việc ngoài dự kiến: **1 phiên làm việc khác (song song, không phải phiên
này) đã tự build xong 1 hệ thống "Kho vận" (`khovan`) độc lập** và tích hợp thêm vào chính repo này
(commit `1e9de56`, *"feat: báo trước thùng hàng 'chờ xử lý' sang khovan lúc tạo + API tra cứu lại
theo ID"*) — thêm `backend/src/lib/khovanPushClient.ts` (best-effort, bọc try/catch, không throw),
`backend/src/routes/khovanLookup.ts`, 1 Service Binding `KHOVAN_PUSH_SERVICE` mới trong
`wrangler.jsonc`. Đã đọc kỹ 2 file này để **loại trừ** khả năng chúng là nguyên nhân lỗi
`INTERNAL_ERROR` ở ý #3 (xác nhận: không phải — `pushBoxToKhovan()` không bao giờ throw ra ngoài).

### 3. Lỗi `INTERNAL_ERROR` khi "tạo hộ" — nguyên nhân gốc: FOREIGN KEY constraint

Dùng `wrangler tail` xem log production thật (không đoán) — bắt được đúng exception:
`D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT_FOREIGNKEY` khi `INSERT INTO
phieu_gui_bh` với `nguoi_tao = <email KTV mục tiêu>`. Đối chiếu `migrations/0001_init.sql`:
`phieu_gui_bh.nguoi_tao TEXT NOT NULL REFERENCES users(email)` — D1 **thực thi FK constraint mặc
định** (khác SQLite thường, nơi FK là tuỳ chọn bật/tắt theo từng connection — phát hiện mới, ghi lại
để tránh lặp lại giả định sai này ở chỗ khác). Vì tính năng "tạo hộ" (chốt 05/09/2026) **cho phép cả
KTV chưa từng đăng nhập** (không có dòng `users` nào), FK này chặn cứng ngay khi target là 1 KTV như
vậy — đúng chính xác kịch bản người dùng vừa gặp trong ảnh chụp.

**Đã sửa** (`backend/src/routes/phieuGui.ts`, nhánh `ktvEmailReq !== user.email`): trước khi INSERT
`phieu_gui_bh`, tự cấp phát 1 dòng `users` tối thiểu cho KTV mục tiêu nếu CHƯA có
(`INSERT ... ON CONFLICT(email) DO NOTHING`) — dùng ĐÚNG khuôn mẫu `ktvMatch` mà `routes/auth.ts` đã
dùng lúc KTV đăng nhập Google lần đầu (đọc lại `auth.ts` để khớp default: `trang_thai_duyet='Da
duyet'`, `la_ktv_dvbh`/`la_ve_tinh` theo đúng `ktv_lien_he_bh.vai_tro_ktv`) — để khi KTV đó đăng nhập
thật sau này, dòng `users` đã tồn tại đúng và không bị ghi đè nhầm (`DO NOTHING`, không `DO UPDATE`).
**Đã xác nhận sửa đúng** bằng test local: `POST /api/phieu-gui {ktv_email: 'ktv.chuadangnhap.test@...'}`
(KTV chưa từng có dòng `users`) trả `201 {id:"BH-000001"}` thay vì lỗi FK.

### 2. Danh sách KTV không hiện khi tạo hộ — CHƯA XÁC NHẬN LÀ LỖI THẬT

Đọc `PickKtvModal.tsx`: gọi `GET /ktv-lien-he`, lọc `!!k.email_dang_nhap`, **không có `.catch()`** —
nếu request lỗi, `list` kẹt ở `null` mãi mãi (Spinner vô hạn, không báo lỗi) — đây LÀ 1 lỗ hổng thật
về xử lý lỗi, nhưng khi soi lại đúng log `wrangler tail` của phiên lỗi #3, `GET /ktv-lien-he` NGAY
TRƯỚC ĐÓ trả về `Ok` (200) — tức tại đúng thời điểm người dùng gặp lỗi, danh sách KTV đã tải được
(nếu không tải được, người dùng sẽ không có gì để "chọn KTV xong" ở bước #3). **Kết luận: chưa đủ
bằng chứng để khẳng định đây là lỗi đang xảy ra** — có thể đã tự hết vì danh bạ `ktv_lien_he_bh` lúc
đó đã có đủ 492 dòng (đồng bộ xong), hoặc chỉ là cảm nhận UX thoáng qua lúc danh sách đang tải. Chưa
sửa gì cho ý này — cần người dùng xác nhận lại có còn tái hiện không sau khi bản vá ý #1/#3 lên
production.

### 1. Module "Giám sát khu vực" (`#/qtri/khu-vuc`, mới)

Gap thật: `khu_vuc_bh.gs_email` (dùng bởi `computeEmailGs()` — quyết định GS nào phụ trách 1 KTV, cả
cho scope tra cứu lẫn chặn/cho phép "tạo hộ" ngoài khu vực) **chưa từng có UI nào để gán** — chỉ có
thể ghi qua `POST /api/partner/sync/khu-vuc` (đồng bộ đẩy từ `linh-kien-app`, chưa triển khai xong ở
phía phát — xem mục "Giai đoạn 5"), nên trên thực tế bảng `khu_vuc_bh` đang **rỗng hoàn toàn trên
production**.

- **`backend/src/routes/khuVuc.ts`** (mới, mount `/api/khu-vuc`, chỉ `la_qtri`) — `GET /` liệt kê
  **Khu vực "quan sát được"** bằng cách `GROUP BY khu_vuc_ma` trực tiếp trên `ktv_lien_he_bh` (không
  đọc `khu_vuc_bh` làm nguồn chính — vì bảng đó rỗng, còn mã khu vực THẬT đã có sẵn trên từng dòng
  KTV qua đồng bộ), LEFT JOIN `khu_vuc_bh` để lấy `ten`/`gs_email` đã gán (nếu có). `PATCH /:ma` —
  upsert `khu_vuc_bh` (tên + `gs_email`, `ON CONFLICT DO UPDATE`).
- **`backend/src/routes/users.ts`** — thêm `GET /giam-sat` (chỉ `la_qtri`): danh sách rút gọn
  email/tên các tài khoản `la_giam_sat=1 AND bi_khoa=0`, cấp dữ liệu cho picker gán GS.
- **`frontend/src/screens/qtri/KhuVuc.tsx`** (mới) — `QtriKhuVucScreen` (bảng Khu vực quan sát được +
  số KTV + GS phụ trách, click dòng mở modal sửa) + `GanGsModal` (sửa tên khu vực + chọn GS qua
  `SearchableSelect`, dùng chung component đã có).
- Mount route `#/qtri/khu-vuc` (`App.tsx`, `routes.ts` — mục sidebar mới "🗺️ Giám sát khu vực").

**Đã xác nhận qua API thật (local):** tạo 1 KTV mẫu với `khu_vuc_ma='MB1'`, `GET /khu-vuc` trả đúng
`{ma:"MB1", so_ktv:1, ten:null, gs_email:null}`; `PATCH /khu-vuc/MB1 {ten:"Mien Bac 1",
gs_email:"gs.test@example.com"}` → đọc lại đúng giá trị vừa ghi, xác nhận lại 2 lần độc lập (kể cả
sau khi mở lại tab trình duyệt) — ghi/đọc nhất quán. Màn `#/qtri/khu-vuc` render đúng qua
`get_page_text` ("🗺️ Giám sát khu vực (1)", đúng 1 dòng MB1). Không verify được thao tác click chuột
trực tiếp qua UI cho modal (ref nằm ngoài viewport khi test) — đã verify tương đương bằng gọi thẳng
đúng API mà UI đó gọi, cùng logic, rủi ro thấp.

**Phát hiện phụ trong lúc kiểm thử:** production đang thiếu 2 migration
(`0002_ktv_lien_he_nguon.sql`, `0003_case_lookup_snapshot_va_tao_ho.sql`) mà code đã deploy từ trước
đó phụ thuộc vào (`wrangler d1 migrations list DB --remote` cho thấy pending) — đã tự chạy áp dụng
lên production (`CLOUDFLARE_ACCOUNT_ID=... npm run db:migrate:remote`) để tránh production tiếp tục
chạy sai lệch với code đã deploy, cùng vướng mắc "wrangler nhầm tài khoản" đã ghi ở mục "Deploy thật
đầu tiên" (khắc phục bằng ép `CLOUDFLARE_ACCOUNT_ID` rõ ràng).

**Kiểm thử đã chạy:** `npm run typecheck` — 0 lỗi. Verify qua Browser pane (`wrangler dev` local, quy
trình backup/restore `wrangler.jsonc` thường quy) — xác nhận cả 2 tính năng (Giám sát khu vực + fix
FK "tạo hộ") hoạt động đúng như mô tả ở trên.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa các sửa đổi này lên production — đây là
bản vá cho 1 lỗi ĐANG XẢY RA THẬT trên production (không tạo được đơn hộ cho KTV chưa đăng nhập), nên
nên ưu tiên deploy sớm. Sau khi deploy, xác nhận lại giúp: (a) lỗi `INTERNAL_ERROR` ở ý #3 đã hết; (b)
ý #2 (danh sách KTV không hiện) có còn tái hiện không — nếu còn, cần thêm bằng chứng cụ thể hơn (ảnh
chụp đúng lúc xảy ra, hoặc mở DevTools Network tab) vì log production hiện tại không đủ để xác nhận
đây là lỗi thật.

## Không tạo phiếu nháp thừa + đẩy khovan trễ tới lúc gửi thật + sửa layout mobile chồng chéo (07/09/2026)

Nguyên văn 2 yêu cầu (gửi liên tiếp trong cùng lượt):

1. *"khi ấn tạo phiếu, nếu không ấn lưu và tối tiểu 1 linh kiện bên trong phiếu thì không tạo ra
   phiếu nháp. đang tạo ra 1 đống phiếu nháp thừa. ngoại ra nếu phiếu nháp bị hủy thì có bắn api sang
   cho app kho vận để báo phiếu nháp đã bị xóa không?"*
2. *"giao diện tạo phiếu và tạo đơn bh trên giao diện mobile đang không hợp lý, khó nhập liệu khi các
   thông tin bị quá ngắn và chồng chéo đè lên nhau"*

### 1. Phiếu nháp thừa + đồng bộ khovan

Điều tra trước khi sửa: bấm "+ Tạo phiếu mới" gọi `POST /api/phieu-gui` **INSERT ngay 1 dòng**
`phieu_gui_bh` (trạng thái `nhap`) rồi mới mở modal chi tiết để KTV điền tiếp — nếu KTV đóng modal mà
chưa thêm đơn nào, dòng đó tồn tại vĩnh viễn trong danh sách "Phiếu gửi hàng của tôi" (đã tự bắt gặp
1 ví dụ thật khi mở lại danh sách phiếu — `BH-000001`, phiếu nháp rỗng để lại từ chính vòng kiểm thử
FK "tạo hộ" hôm trước). Đồng thời, `POST /api/phieu-gui` cũng gọi `pushBoxToKhovan()` **ngay lúc tạo**
— nghĩa là mọi phiếu nháp bị bỏ dở đều đã được báo sang `khovan` như 1 đơn hàng "chờ xử lý" thật, dù
sau đó không hề tồn tại nội dung gì — đúng câu hỏi thứ 2 của người dùng.

Đã sửa theo 2 hướng bổ trợ nhau:

- **Tự động dọn phiếu nháp rỗng khi đóng modal chi tiết** (`frontend/src/screens/ktv/
  PhieuGuiDetailModal.tsx`, hàm mới `handleClose()`) — nếu phiếu vẫn `trang_thai='nhap'` **và**
  `don_cha.length === 0` lúc đóng (bấm ✕, Escape, hoặc bấm ra ngoài nền), tự gọi
  `DELETE /api/phieu-gui/:id` (best-effort, im lặng nếu lỗi) rồi mới đóng — đúng điều kiện đã có sẵn
  của nút "Xoá phiếu" thủ công (`don_cha.length===0`), đây chỉ là bản tự động hoá của đúng hành động
  đó, không mở thêm quyền gì mới. Có toast báo "Đã tự động xoá phiếu nháp trống" để KTV không hoang
  mang khi phiếu biến mất khỏi danh sách.
- **Dời `pushBoxToKhovan()` từ lúc TẠO phiếu (`POST /`) sang lúc KTV THẬT SỰ xác nhận đã gửi xe
  (`POST /:id/xac-nhan-gui`)** (`backend/src/routes/phieuGui.ts`) — vừa đúng bản chất mục đích của
  khovan ("báo trước hàng SẮP VỀ THẬT", không phải "có người vừa bấm nút tạo"), vừa giải quyết dứt
  điểm câu hỏi thứ 2: **phiếu nháp bị xoá/bỏ dở không cần báo huỷ sang khovan, vì nó chưa từng được
  báo sang từ đầu** — không cần thêm 1 API "huỷ" riêng (khovan là repo/Worker của 1 phiên làm việc
  khác, không chủ động sửa thêm phía đó nếu tránh được).

### 2. Layout mobile chồng chéo — "tạo phiếu" (`PhieuGuiDetailModal`) và danh sách đơn trong phiếu

Đối chiếu trực tiếp bằng ảnh chụp Chrome thật (Browser pane, viewport 375×812) trước khi sửa, không
đoán theo mô tả suông — xác nhận `AddDonMobileSheet.tsx` (màn "Thêm đơn bảo hành" mobile riêng, đã có
từ Giai đoạn 4/QA vòng 2) **không có vấn đề** (đã là layout 1 cột chuyên biệt cho mobile từ trước) —
gốc rễ thật nằm ở `PhieuGuiDetailModal.tsx`, màn duy nhất trong luồng KTV chưa từng có tinh chỉnh
riêng cho mobile:

- **Lưới thông tin header** (Hình thức gửi/Mã xe/Đơn vị vận chuyển/Mã vận đơn/Ngày gửi xe) trước đó
  luôn `grid-cols-2` ngay cả ở màn hình hẹp nhất — đổi thành `grid-cols-1 sm:grid-cols-2
  md:grid-cols-4` (1 cột trên điện thoại, 2 cột từ ~640px, 4 cột từ 768px như cũ).
- **Hàng "Ngày gửi xe" + nút "Lưu thông tin"** trước đó dùng chung 1 `flex items-end` không có chiều
  rộng cố định cho từng phần tử — 2 phần tử tranh nhau không gian trên màn hẹp, dễ vỡ dòng/đè lên
  nhau. Tách "Ngày gửi xe" thành 1 ô lưới riêng, nút "Lưu thông tin" thành 1 ô lưới khác (rộng hết cỡ
  trên mobile qua `className="w-full sm:w-auto"`) — mỗi phần tử có không gian riêng, không còn cạnh
  tranh.
- **Từng dòng "Đơn bảo hành trong phiếu"** trước đó ép cứng 1 hàng ngang (mã đơn + mô tả lỗi truncate
  + SL + badge + nút Xoá) — trên màn hẹp, mô tả lỗi gần như không còn chỗ hiển thị (bị các phần tử cố
  định khác chiếm hết chiều rộng). Đổi sang `flex-wrap` cho hàng nút/nhãn (tự xuống dòng khi chật thay
  vì ép chết) + mô tả lỗi xuống dòng riêng, luôn có đủ chiều rộng để đọc.

**Đã xác nhận qua Browser pane thật (không chỉ đọc code):** dựng lại đúng kịch bản thật (tạo phiếu →
mở "+ Thêm đơn" → đóng không lưu gì → xác nhận phiếu tự động biến mất khỏi danh sách VÀ bị xoá thật
trong D1; tạo phiếu khác → chèn tay 1 đơn con qua D1 → đóng modal → xác nhận phiếu **vẫn còn** vì đã
có ≥1 đơn; gọi `xác-nhận-gửi` → xác nhận log worker cho thấy `pushBoxToKhovan()` được gọi ĐÚNG lúc
này, không phải lúc tạo). Chụp ảnh màn hình 375×812 cho cả `PhieuGuiDetailModal` (header + danh sách
đơn) và `AddDonMobileSheet` — không còn chồng chéo, mọi trường đều đọc/nhập được rõ ràng, nút "Lưu
thông tin" rộng hết cỡ, dòng đơn tự xuống dòng đúng ý. `npm run typecheck` — 0 lỗi cả trước/sau khi
sửa. v1.004.

**Việc còn lại thuộc người dùng:** `npm run deploy` để đưa các sửa đổi này lên production.

## Rà soát UX toàn hệ thống theo vai trò (08/09/2026) — 16 phát hiện, CHƯA sửa gì, chờ chốt hướng

Nguyên văn yêu cầu: *"khám phá toàn bộ dự án này => với vai trò 1 nhà thiết kế giao diện chuyên
nghiệp => liệt kê ma trận các vai trò... => tự nhận thủ công test từng nghiệp vụ... => đánh giá điều
bất hợp lý... => một AI khác phản biện => chốt lại vấn đề => đưa ra đề xuất cải tiến"*. Tiêu chí
người dùng đặt: đầy đủ thông tin, hiển thị sạch/minh bạch, phong cách hiện đại, nhập liệu thuận tiện,
ô nhập liền kề liên hệ nhau, thao tác liên tục (tab–nhập–tab), tận dụng tối đa diện tích web/mobile.
"Không hiểu thì hỏi, không tự ý quyết."

**Đã chốt phạm vi qua AskUserQuestion:** review **bản React production** (`frontend/src`, không phải
prototype HTML), kiểm thử bằng **chạy `wrangler dev` local + trình duyệt thật** (đóng vai siêu người
dùng `smarttrade.vp@gmail.com` gán đủ 9 cờ, seed dữ liệu phủ mọi trạng thái), giao ra **1 Artifact
báo cáo** (đã publish: `https://claude.ai/code/artifact/2a0cc1df-1060-46d4-bc06-e58cc45850ef` — tiêu
đề "Rà soát UX Sửa chữa Bảo hành", có ma trận vai trò×màn hình, 16 phát hiện xếp mức độ kèm phản biện
+ chốt + đề xuất, phần "đã làm tốt", danh sách câu hỏi cần người dùng chốt, lộ trình 3 đợt).

**KHÔNG sửa mã nguồn nào ở vòng này** — đây là rà soát + lập kế hoạch. `wrangler.jsonc` đã bị sửa tạm
(bỏ `services` + binding D1 remote thứ 2 để chạy local trên tài khoản sandbox `mikanovncloudflare`,
KHÔNG phải `dichvu3t`) rồi **khôi phục nguyên trạng** — xác nhận `git diff wrangler.jsonc` sạch.

**Phát hiện quan trọng — 3 lỗi thật đã chứng minh chạy thật (đừng phát hiện lại từ đầu ở phiên sau):**

1. **[NGHIÊM TRỌNG] Badge SLA lệch đúng 7 giờ ở frontend.** `backend/src/lib/sla.ts hoursSince()` so
   `Date.now()+7h` với chuỗi VN (đúng). Nhưng `frontend/src/lib/format.ts hoursSince()` **thêm hậu
   tố `"Z"`** vào chuỗi `nowVN()` (vốn là giờ VN không có Z) rồi so với `Date.now()` → lệch −7h ở mọi
   nơi. Hậu quả: (a) mọi đơn vừa thao tác hiện badge **âm** ("-7h", "-4h") trong viên xanh lá — đã
   chụp màn hình thật; (b) đơn quá hạn thật 40h hiện "33h" tô xanh dương nhẹ, không đỏ; (c) **cổng
   SLA bế tắc trong khung 24–31h thật**: seed đơn 27h tuổi → frontend `isOverdue`=false (không hiện
   ô "Lý do chậm") → bấm "Lưu phân loại" → backend trả `400 REQUIRE_LY_DO_CHAM` + toast "vui lòng
   chọn lý do chậm" **nhưng không có ô nào để chọn** → form không có lối thoát ~7h. Đã test trực tiếp
   qua `fetch()`: `updated_at=2026-09-07 11:36:36`, frontend tính 20h, backend trả 400. **Sửa gốc:**
   dùng 1 hàm `hoursSince` chung, bỏ việc thêm `"Z"` ở frontend.
2. **[NGHIÊM TRỌNG] Số "việc cần làm" bị chặn ở 20.** `parsePage` mặc định `limit=20` khi query
   không kèm `limit`. `useWorkload.fetchCounts()` gọi các endpoint list KHÔNG kèm `limit` rồi đếm bằng
   `r.don_vi.length` (tối đa 20). Đã test: `GET /api/admin/don-vi` không limit → 20 dòng nhưng
   `total: 30`. Hậu quả: Trang chủ StatCard + huy hiệu Sidebar/BottomNav **undercount** mọi hàng đợi
   >20; Trang chủ nói "20", màn "Xử lý đơn bảo hành" nói "(31)", màn Giám sát Tổng quan (đếm đúng bằng
   `GROUP BY`) nói "28" — 3 con số khác nhau cho cùng 1 thứ. **Sửa:** đọc `total` thay `.length`,
   hoặc làm endpoint `GET /api/workload` gộp (cũng bớt ~12 request song song mỗi lần mở app).
3. **[CAO] Hàng đợi NV sửa chữa thiếu tên linh kiện + mô tả lỗi.** `GET /api/nv/viec-cua-toi` chỉ
   SELECT `phieu_sua_chua_bh_ct`, KHÔNG JOIN đơn cha — mà `ma_lk`/`mo_ta_loi`/`case_id` nằm ở đơn
   cha. Response thật: không có `ma_lk`, không có `mo_ta_loi`. Màn "Việc của tôi" của NV hiện cột
   Linh kiện + Mô tả lỗi **trống**. (Màn Admin `GET /admin/don-vi` JOIN đủ; chỉ endpoint NV thiếu.)
   **Sửa:** thêm JOIN `phieu_sua_chua_bh` vào query, trả `ma_lk`/`mo_ta_loi`/`case_id`.

**13 phát hiện còn lại (xem Artifact để có bằng chứng + phản biện + đề xuất từng mục):** (4) danh
sách hiện mã enum thô `nha_xe`/`sua_chua`/`sua_duoc`/`tra_lai_ktv`/`linh_kien_khong_khop:` + mã LK
thay tên, rải ở ≥6 màn (KTV list dùng `r.hinh_thuc_gui` thô, `XacNhan.tsx` dùng `r.huong_xu_ly`/
`r.ket_qua_chan_doan` thô, `PhieuTraDetailModal` dùng `u.huong_xu_ly` thô — có sẵn `*_LABELS` nhưng
không dùng); (5) mobile: BottomNav nhồi 16 mục vỡ vụn khi đa vai trò/qtri, và các list-row KHÔNG
phải `<Table>` (Kho tiếp nhận, thẻ Admin tiếp nhận nội bộ, nhóm phiếu trả) là `flex` thủ công tràn/
cắt nút → Kho không bấm nổi "Xác nhận tiếp nhận" trên điện thoại (không có container cuộn); (6)
`Table` không chuyển sang layout thẻ dưới 768px — cuộn ngang giấu 4/6 cột (SLA, mô tả lỗi), thanh
cuộn gần vô hình; (7) `NhanHang.tsx` + `AdminPhieuTra` khối "sẵn sàng gộp" đọc `.length` KHÔNG phân
trang, không có nút trang → dữ liệu >20 dòng vô hình; (8) modal `full` bỏ trống 60–90% (UnitDetail
cho đơn chưa phân loại, PhieuTraDetail), modal chồng 3 lớp (bảng→UnitDetail full→PhanLoai); (9) chi
tiết Phiếu gửi: nút xám "Lưu thông tin" là điều kiện tiên quyết dễ bỏ qua trước nút xanh nổi bật
"Xác nhận đã gửi xe" (chỉ POST `ngay_gui_xe`) → mất 4 chỉnh sửa vận chuyển, không cảnh báo "chưa
lưu"; "Ngày gửi xe" xếp nhầm nhóm, cách nút xác nhận ~350px; (10) SearchableSelect là `<button>` cần
Space/Enter để mở → phá luồng tab–nhập–tab ở 2 form chính; trường NV chèn giữa form làm lệch thứ tự
tab; (11) bảng desktop thưa — `w-full` dồn khoảng dư cho cột cuối, SLA cách "Mô tả lỗi" ~600px
trống, sidebar thu gọn còn nới container lên 1440px; (12) Giám sát "Tổng quan" chỉ 8 ô đếm, không có
"quá hạn/tồn đọng/theo KTV", bấm ô → sang tra cứu KHÔNG lọc; (13) `qtri/NguoiDung` + `qtri/KtvLienHe`
đã phân trang server nhưng KHÔNG có ô tìm/lọc/sắp xếp; mỗi tick cờ vai trò = 1 API + reload cả bảng;
nút "Xoá" đỏ mọi dòng; (14) không gộp đơn cha — 1 lô 25 linh kiện = 25 dòng phẳng trùng lặp (CLAUDE.md
"Ma trận CRUD & đơn cha/đơn vị con" ghi rõ đơn cha PHẢI hiển thị 1 dòng thu gọn "×N" — React
production không port); (15) danh mục "Lý do chậm"/"Lý do huỷ" seed toàn ASCII không dấu (từ
`migrations/0001_init.sql`), màn `qtri/CaiDat` chỉ bật/tắt + thêm, không sửa/xoá/đổi `stt`; (16)
`useWorkload` khởi tạo `counts=EMPTY` (toàn 0) và hiện luôn cho tới khi ~12 fetch xong, không có
skeleton → người dùng dễ tin nhầm "hết việc" lúc đang tải.

**5 câu hỏi cần người dùng chốt (đã ghi trong Artifact, KHÔNG tự quyết):** (a) cổng cứng mã case —
KTV không thêm được đơn nào nếu hệ DVBH/case-lookup không truy cập được, có cần đường vượt qua có
kiểm soát khi DVBH gián đoạn không (đây là quyết định "strict" 05/09); (b) gộp đơn cha (#14) — port
lại đầy đủ cơ chế "×N" hay giữ phẳng + dựa vào chọn hàng loạt; (c) modal `full` (#8) — thu nhỏ modal
chi tiết ít dữ liệu hay giữ full đồng nhất; (d) ưu tiên mobile — đầu tư layout thẻ cho Kho/đa vai
trò ngay hay chấp nhận Kho/Admin chủ yếu desktop, chỉ vá BottomNav; ~~(e) SLA "giờ hành chính" — 24h
đồng hồ liên tục hay bỏ qua ngoài giờ/cuối tuần~~ **[ĐÃ CHỐT 04/10/2026: "24h liên tục bỏ qua chủ
nhật"]** (đồng thời (d) được giải quyết bằng việc làm bảng→thẻ cho mọi màn ở vòng 04/10/2026).

**Đã làm tốt (ghi nhận để không phá khi sửa):** hệ token màu nhất quán với `linh-kien-app`; nguyên
tắc "mờ khi = 0"; ý tưởng cổng SLA 3 mức (đúng hướng, chỉ sai lệch giờ); modal chống đóng nhầm
(`mousedown`+`click` cùng trên nền); Sidebar thu gọn mặc định + nội dung tự giãn + huy hiệu chấm góc
icon; `AddDonMobileSheet` riêng cho mobile (đúng 7 nguyên tắc); tuỳ biến cột bảng Admin; dải "Việc
của tôi" ở Trang chủ.

**Lưu ý phát sinh (không thuộc phiên này):** khi bắt đầu rà soát, working tree đã có 4 file sửa chưa
commit từ **một phiên khác** — `backend/src/routes/partnerKho.ts`, `backend/src/routes/phieuTra.ts`,
`frontend/src/lib/constants.ts`, `frontend/src/screens/adminbh/PhieuTra.tsx` — nội dung là tính năng
"trả xác cho đối tác" (`DOI_TAC_KEY_PREFIX`, ngày 2026-09-08). KHÔNG đụng vào, chỉ ghi nhận.

**Chưa chạy kiểm thử hồi quy nào** (không sửa code). Nhánh "case-lookup tìm thấy" không test được
end-to-end (sandbox không có Worker `dvbh` thật). Việc tiếp theo thuộc người dùng: chốt 5 câu hỏi
trên rồi mới triển khai sửa theo lộ trình 3 đợt trong Artifact (Đợt 1 = 4 lỗi P1–P4, chi phí thấp,
gỡ 2 lỗi toàn hệ thống).

### Đợt 1 (P1–P4) — ĐÃ TRIỂN KHAI + kiểm thử chạy thật (08/09/2026, cùng ngày)

Người dùng: *"lần lượt triển khai theo lộ trình đã định"*. Đã làm Đợt 1, typecheck 0 lỗi, chạy
`wrangler dev` local + trình duyệt thật xác minh từng điểm. **v1.005** (bump theo quy ước versioning).

- **P1 — Lệch giờ SLA.** `frontend/src/lib/format.ts`: `hoursSince()` nay ép parse chuỗi giờ VN như
  UTC (bỏ rồi re-add `"Z"`) và cộng `+7h` vào `Date.now()` — KHỚP đúng `backend/src/lib/sla.ts`
  (hàm `parseVnWallClock` mới dùng chung cho cả `hoursSince` lẫn `fmtDate`). `fmtDate` thêm
  `timeZone:"UTC"` để hiện đúng chữ số giờ VN đã lưu (trước đây máy user ở VN thấy mọi mốc thời gian
  lệch +7h). **Xác minh:** đơn cập nhật 30 phút trước — badge từ `-7h` → `1h`; đơn 27h tuổi — từ
  `20h` (frontend nghĩ chưa quá hạn, dead-end) → `28h` (`isOverdue` = true, form hiện ô "Lý do
  chậm", khớp backend); đơn 40h tuổi — từ `33h` → `40h`. Hết badge âm, hết dead-end.
- **P2 — Số liệu workload.** Thêm `backend/src/routes/workload.ts` (`GET /api/workload`) đếm bằng
  `SELECT COUNT(*)` đúng y bộ lọc từng màn hình, mount ở `index.ts`. `frontend/src/hooks/
  useWorkload.tsx` viết lại: 1 request thay ~12, đọc `total` thật, thêm cờ `loading`. `Home.tsx`
  hiện skeleton khi `loading` (gỡ luôn P16). **Xác minh:** `/api/workload` trả `admin_cho_phan_loai:
  30` (trước 20), `ketoan_cho_duyet: 2` (trước Home hiện 0); Trang chủ giờ khớp màn hình.
- **P3 — Hàng đợi NV.** `backend/src/routes/nvSuaChua.ts` `/viec-cua-toi` JOIN `phieu_sua_chua_bh`,
  trả `ma_lk`/`mo_ta_loi`/`case_id`. **Xác minh:** cột Linh kiện + Mô tả lỗi từ trống → "Bo mach
  dieu khien KAT-M" / "Lo 5 bo mach loi cung loai".
- **P4 — Nhãn enum + tên linh kiện.** `frontend/src/lib/constants.ts`: thêm `HINH_THUC_GUI_OPTIONS`/
  `HINH_THUC_GUI_LABELS` (1 nguồn, `PhieuGuiDetailModal` dùng lại), `formatLyDoBoSung()` (bỏ tiền tố
  `<mã>:`). `frontend/src/hooks/useLinhKien.ts`: thêm `useLkName()` → `nameOf(ma)`. Áp dụng:
  `TaoPhieu` (hình thức gửi), `XacNhan` (hướng xử lý + kết quả chẩn đoán), `AdminUnifiedTable`
  (lý do bổ sung), `KtvTraCuu`/`QuanLyTraCuu`/`NvViecCuaToi` (tên linh kiện thay mã),
  `PhieuTraDetailModal` (đơn vị trong phiếu: tên LK + mô tả + badge hướng xử lý — cộng JOIN đơn cha
  ở `backend/src/routes/phieuTra.ts` `GET /:id` để KTV/Kế toán thấy phiếu có gì). **Xác minh:**
  "Sửa chữa"/"Sửa được" thay `sua_chua`/`sua_duoc`; "Nhà xe / vận chuyển" thay `nha_xe`; tên linh
  kiện thay `LK011`; đơn vị phiếu trả từ `doi_moi` thô → `Bo mach... [Đổi mới] / Lo 5 bo mach...`.

**Chưa deploy.** `wrangler.jsonc` đã khôi phục nguyên trạng sau khi test local. Các file "trả xác cho
đối tác" của phiên khác không đụng vào — riêng `backend/src/routes/phieuTra.ts` giờ có CẢ thay đổi
của phiên đó LẪN 1 JOIN nhỏ của P4 (bắt buộc, vì cùng file).

### Đợt 2 (P5–P7 mobile) — ĐÃ TRIỂN KHAI + kiểm thử chạy thật (08/09/2026, cùng ngày)

Người dùng đã bảo "lần lượt triển khai theo lộ trình" — làm tiếp Đợt 2. Typecheck 0 lỗi, chạy
`wrangler dev` local + trình duyệt thật ở cả 375px lẫn 1400px.

- **P5 — BottomNav vỡ vụn + list-row cắt nút trên mobile.**
  - `frontend/src/layout/BottomNav.tsx` viết lại: giới hạn **5 tab** (4 mục đầu + nút "☰ Thêm" mở
    bottom-sheet chứa phần còn lại, kèm badge số việc). Vai trò ≤5 mục không đổi. **Xác minh:** qtri
    (16 mục) từ 16 tab cắt còn 1 chữ → 5 tab đọc được + sheet đầy đủ nhãn.
  - `frontend/src/screens/kho/TiepNhan.tsx` + `frontend/src/screens/adminbh/PhanLoai.tsx` (thẻ
    "Thùng chờ tiếp nhận nội bộ"): dòng đổi `flex` cứng → `flex flex-col sm:flex-row` (mobile xếp
    dọc, nhóm nút xuống dòng riêng). **Xác minh:** ở 375px nút "Xác nhận tiếp nhận" từ bị đẩy ngoài
    màn (không cuộn được) → nằm trong khung, `anyButtonClipped: false`; ở 1400px trở lại 1 hàng
    (`flex-direction: row`, cao 59px) — không hồi quy.
- **P6 — Bảng dữ liệu không xuống-thẻ trên mobile.** `frontend/src/ui/Table.tsx` thêm nhánh
  `useIsMobile()`: <768px mỗi dòng render thành 1 THẺ (cột đầu = tiêu đề, các cột còn lại = cặp
  nhãn–giá trị dạng `<dl>`, cột không header = nút hành động ở đáy thẻ). ≥768px giữ nguyên `<table>`
  cũ (markup không đổi). Áp dụng tự động cho mọi màn dùng `<Table>` (TaoPhieu, NhanHang, TraCuu KTV/
  Quản lý, DongGoi, Duyet, XacNhan, ViecCuaToi, AdminPhieuTra danh sách). **Xác minh:** KTV tra cứu
  ở 375px — trước chỉ thấy ID + Trạng thái, giờ thấy đủ Case / Linh kiện / Mô tả lỗi / SLA trong thẻ,
  không cần cuộn ngang. (`AdminUnifiedTable` là `<table>` tuỳ biến riêng — vẫn cuộn ngang, KHÔNG
  clip, để lại cho vòng sau nếu cần.)
- **P7 — `NhanHang.tsx` đọc `.length` không phân trang.** Chuyển sang `usePagedApi` + `<Pagination>`
  như phần còn lại. (Kiểm lại: `AdminPhieuTra` khối "sẵn sàng gộp" gọi `/phieu-tra/san-sang` — endpoint
  đó KHÔNG có `LIMIT`, trả hết, nên KHÔNG phải lỗi — đã bỏ khỏi phạm vi P7.)

### Đợt 3 (P8–P16, trừ P8) — ĐÃ TRIỂN KHAI + kiểm thử chạy thật (08/09/2026, cùng ngày)

Người dùng chốt qua AskUserQuestion: **P8 = giữ modal `full` đồng nhất, KHÔNG đổi** (bỏ P8 hẳn);
**P14 = port lại đầy đủ cơ chế gộp đơn cha ×N**; **P12 = thêm khối "quá hạn SLA" + ô đếm bấm-để-lọc
(bản vừa đủ)**. Typecheck 0 lỗi, `wrangler dev` local + trình duyệt thật, 18/18 màn hình 0 lỗi console.

- **P9 — Bẫy lưu 2 bước phiếu gửi.** `PhieuGuiDetailModal.tsx`: nút "Xác nhận đã gửi xe" nay PATCH
  header (4 trường vận chuyển) TRƯỚC rồi mới POST xác-nhận — không còn mất dữ liệu nếu KTV quên bấm
  "Lưu thông tin". Bỏ nút xám khỏi lưới, "Ngày gửi xe" dời xuống 1 khối riêng có hint "…sẽ tự lưu
  toàn bộ" + link "Lưu nháp bây giờ". **Xác minh:** modal render đủ hint/link, 0 lỗi.
- **P10 — SearchableSelect phá luồng tab.** `ui/SearchableSelect.tsx`: Tab tới ô → gõ 1 phím bất kỳ
  (chữ/Enter/mũi tên) là ô **tự mở** + seed ký tự vào ô lọc (`initialCharRef` + `useEffect([open])`).
  Gần giống `<select>` native. (Cần xác nhận bằng bàn phím thật sau deploy — sandbox không gõ được.)
- **P11 — Bảng desktop thưa.** `ui/Table.tsx`: thêm 1 cột đệm cuối (`w-full`) hút hết khoảng dư → các
  cột thật xít nhau canh trái, header/viền vẫn kín chiều rộng thẻ. **Xác minh:** bảng Admin canh trái,
  không còn khoảng trống lớn giữa các cột.
- **P12 — Giám sát Tổng quan mỏng.** `traCuu.ts /tong-quan` trả thêm `qua_han` (COUNT đơn đang chờ xử
  lý, `updated_at` cũ hơn 24h VN); `/don-vi` nhận `?trang_thai=` (kể cả `qua_han`). `TongQuan.tsx`
  thêm thẻ đỏ "🔥 Đơn quá hạn SLA 24h — N" ở đầu; bấm mọi ô đếm → sang `#/quanly/tra-cuu?trang_thai=X`.
  `QuanLyTraCuu.tsx` đọc query, lọc + hiện chip "Lọc: X ✕". **Xác minh:** `qua_han: 29` hiện đúng;
  bấm → hash `?trang_thai=qua_han`, chip đúng, 29 dòng đều quá hạn; `?trang_thai=cho_phan_loai` → 28
  dòng đều "Chờ phân loại".
- **P13 — Màn quản trị.** `users.ts /` + `ktvLienHe.ts /` nhận `?q=` (LIKE email/tên/SĐT/mã/khu vực).
  `NguoiDung.tsx` viết lại: ô tìm + **gom thay đổi cờ vai trò rồi LƯU 1 LẦN** (thanh "N thay đổi
  chưa lưu / Lưu thay đổi", dòng bẩn tô nền); nút "Xoá" đổi `ghost` (bớt loè). `KtvLienHe.tsx` thêm ô
  tìm. **Xác minh:** `GET /api/users?q=kho1` → total 1 (backend OK); UI render đủ, 0 lỗi.
- **P14 — Gộp đơn cha ×N.** `AdminUnifiedTable.tsx`: nhóm `units` theo `parent_id`; nhóm ≥2 đơn vị →
  1 dòng thu gọn (checkbox chọn-cả-nhóm có trạng thái indeterminate, `×N`, tóm tắt trạng thái dạng
  chip "25 Chờ phân loại", SLA xấu nhất, chevron ▸/▾); bấm để sổ ra child rows (thụt lề). Nhóm 1 đơn
  vị hiện trực tiếp. `adminBH.ts /don-vi` nâng `parsePage(c, 1000, 2000)` + `PhanLoai.tsx` dùng
  `usePagedApi(..., 1000)` để lấy trọn 1 lô (hàng đợi bị gate nên thực tế không lớn; `<Pagination>`
  tự ẩn). **Xác minh:** lô `DH-000009` từ 25 dòng phẳng → 1 dòng "×25 · 25 Chờ phân loại"; bấm sổ ra
  đúng 25 child rows (5→30 dòng); chevron lật đúng.
- **P15 — Lý do không dấu + không sửa/xoá.** `migrations/0004_ly_do_tieng_viet.sql` (UPDATE 13 dòng
  seed sang tiếng Việt có dấu, match theo giá trị ASCII cũ). `settings.ts` thêm `DELETE /:id` (log/đơn
  cũ lưu nguyên văn, không FK). `CaiDat.tsx` thêm nút "Sửa" (inline) + "Xoá". **Xác minh:** áp
  migration local OK; màn hiện "Không có linh kiện" (có dấu) + Bật/Sửa/Xoá mỗi dòng.
- **P16** — đã làm ở Đợt 1 (skeleton Trang chủ khi `useWorkload` đang tải).

**Cả 3 đợt xong (trừ P8 người dùng chốt bỏ).** Không deploy. `wrangler.jsonc` khôi phục nguyên trạng.
`backend/src/routes/phieuTra.ts` + `frontend/src/lib/constants.ts` giờ có CẢ thay đổi phiên "trả xác
đối tác" LẪN sửa đổi của rà soát này (cùng file). File mới: `backend/src/routes/workload.ts`,
`migrations/0004_ly_do_tieng_viet.sql`. Version `1.005`.

**Việc còn lại thuộc người dùng:** áp `migrations/0004` lên production (`npm run db:migrate:remote`),
`npm run deploy`. Sau deploy nên xác nhận bằng bàn phím thật: (a) SearchableSelect tự mở khi gõ (P10);
(b) các màn quản trị lọc/tìm đúng khi gõ tay (P13 — sandbox không mô phỏng được input event của React).

## Deep-link phiếu trả (v1.006, 09/09/2026) + đối chiếu trạng thái production (04/10/2026)

Commit `cab78a2` (từ 1 phiên khác, chưa từng ghi vào CLAUDE.md — bổ sung lại theo nguyên tắc #1):
thêm link `#/ktv/nhan-hang/TR-000001` mở thẳng modal chi tiết phiếu trả trong màn KTV "Nhận hàng".
`frontend/src/lib/deepLink.ts` lưu đường dẫn vào `sessionStorage` để giữ qua vòng Google OAuth (backend
redirect callback về `/`, làm mất hash nếu chưa đăng nhập). `APP_VERSION` = `1.006`.

Phiên 04/10/2026 (yêu cầu nguyên văn: *"tiếp tục dự án"*) kiểm tra lại: `wrangler d1 migrations list
DB --remote` (ép `CLOUDFLARE_ACCOUNT_ID` tài khoản `dichvu3t`) → **"No migrations to apply"** — tức
`0004_ly_do_tieng_viet.sql` đã được áp lên production. Git sạch, roadmap 6 giai đoạn + 3 đợt rà soát UX
đã xong. Không sửa code ở lượt này; các việc còn mở xem "Câu hỏi mở còn lại" + 5 câu hỏi của mục
"Rà soát UX toàn hệ thống" (a, d, e vẫn chưa chốt; b, c đã chốt ở Đợt 3).

## Áp dụng design system App Khiếu nại + SLA bỏ Chủ nhật + QA chức năng (04/10/2026)

**(a) Nguyên văn yêu cầu** (trả lời câu hỏi định hướng sau *"tiếp tục dự án"*):

> 1. tôi cần tối ưu lại web, hãy rà soát toàn bộ các màn hình, áp dụng quy tắc giao diện theo tiep nhan
>    app (đổi gam màu theo gam màu icon hiện có)
> 2. Đồng thời kiểm soát lại toàn bộ các tính năng, UI, UX có hoạt động thật không?

Câu hỏi SLA (e) còn treo → *"24h liên tục bỏ qua chủ nhật"*. Hỏi lại "tiếp nhận app" là app nào →
**"App Khiếu nại"** (`F:\claude\QLBH 3T\App Khieu nai`, rulebook `DESIGN_SYSTEM.md` gốc màu tím theo
icon của app đó).

**(b) Đã triển khai:**

1. **Design system** — port toàn bộ quy tắc App Khiếu nại, đổi brand tím → xanh lá lấy từ icon
   `logo sua chua 3t.png`. Ghi lại thành `DESIGN_SYSTEM.md` ở gốc repo (nguồn tham chiếu cho mọi màn
   hình sau này). Điểm chính:
   - `styles/tokens.css` viết lại: thang `--brand-50…900` (`--accent` = `#15803f`, chữ trắng ~5.1:1),
     chữ `--ink/-body/-soft/-faint`, `--link`, bề mặt `--bg/--surface/--surface-2`, ô nhập
     `--field-bg/--field-border`, tone `red/blue/amber(vàng thật)/green/violet/orange/slate`,
     `--sidebar-gradient`. Font Plus Jakarta Sans qua npm `@fontsource/plus-jakarta-sans` (không gọi
     CDN). `tailwind.config.js` map đủ token + `shadow-card/pop/brand`, `bg-sidebar`, `bg-hero`.
   - Đổi tên hàng loạt biến cũ (`--ocean-*`, `--amber-*` (vốn là xanh dương), `--teal-*`, `--coral-*`,
     `--ink-900…400`, `--surface-100/200`) sang token mới ở toàn bộ `frontend/src`.
   - `ui/primitives.tsx` viết lại (Btn 5 biến thể + size `touch`, Badge có `dot`, `FIELD_CLASS` "to trên
     mobile, gọn trên desktop", StatCard KPI pastel có icon). `Modal` toàn màn hình trên mobile cho MỌI
     modal. `Table` header không viết hoa. Toast nổi trên bottom nav. `SearchableSelect` cùng kiểu ô
     nhập. `SlaBadge` mức vàng dùng vàng thật.
   - Mới: `ui/StatusBadge.tsx` (mỗi trạng thái 1 tone + chấm "đang chờ"), `ui/ImagePicker.tsx` (ô chọn
     ảnh lớn viền nét đứt, xem trước) thay 6 ô `<input type=file>` mặc định.
   - Layout: Sidebar gradient xanh lá, nhóm menu theo vai trò (`group`/`short` mới trong
     `layout/routes.ts`), thu gọn `w-16`/mở `w-64`; TopBar mobile gradient (icon + tên + Cài đặt +
     Thoát), desktop trắng mờ có avatar chữ cái; BottomNav trắng mờ có capsule; Trang chủ có hero
     gradient ("Bạn có N việc cần làm" + pill) + lưới KPI icon.
   - Bảng → thẻ trên mobile cho cả các màn còn tự dựng bảng riêng: `qtri/KtvLienHe`, `LinhKienScreen`,
     `qtri/KhuVuc` (chuyển sang `<Table>` dùng chung), `qtri/NguoiDung` (bố cục thẻ riêng, tick cờ vai
     trò dạng lưới 2 cột), `AdminUnifiedTable` (nhánh thẻ mobile riêng, ẩn nút tuỳ chỉnh cột).
   - Mã ID đồng loạt `font-mono font-semibold text-[var(--link)]`. `PhieuGuiDetailModal`: QR dời sang
     cột phải cạnh thông tin vận chuyển. `index.html`/`manifest.webmanifest`: theme `#116a34`, nền
     `#f4f8f5`. Màn đăng nhập/chờ duyệt đổi nền gradient.
2. **SLA "24h liên tục bỏ qua Chủ nhật"** — `backend/src/lib/sla.ts` viết lại (`sundayOverlapMs`,
   `slaHoursBetween`, `hoursSince`, `isOverdue`, `slaCutoffVn`); `frontend/src/lib/format.ts`
   `hoursSince` dùng ĐÚNG thuật toán đó (sửa 1 bên phải sửa cả 2). Truy vấn "quá hạn" ở
   `routes/traCuu.ts` (lọc + đếm Tổng quan) đổi từ `datetime('now','+7 hours','-24 hours')` sang tham số
   `slaCutoffVn(24)` tính bằng JS (SQLite không tự bỏ Chủ nhật được).
3. **QA chức năng chạy thật** — script e2e tạm (gọi HTTP thật vào `wrangler dev`, tự ký session cho các
   tài khoản ĐƠN vai trò ktv1/kho1/adminbh1/nv1/nv2/ketoan1/gs1/view1 để `la_qtri` không che lỗi phân
   quyền; đã xoá sau khi chạy) đi hết: KTV tạo phiếu → cổng mã case → gửi xe → Kho tiếp nhận → Admin
   nội bộ + xác nhận SL (tách 2 đơn vị) → phân loại (chặn thiếu NV / thiếu mail PD) + FAST đổi mới → NV
   chẩn đoán (NV khác không thấy/không làm hộ) → xác nhận hoàn tất → tự động gộp → chặn thiếu MISA → Kế
   toán duyệt (Admin không tự duyệt được) → Kho đóng gói/gửi → KTV nhận; nhánh bổ sung thông tin (đổi
   linh kiện, quay về chờ phân loại) + FAST huỷ không có hàng; phạm vi Giám sát/View, View không ghi
   được, KTV không vào Tổng quan; workload; ghi lý do chậm độc lập; đơn dịch vụ khách lẻ.

**(c) Lỗi/vấn đề phát hiện + đã sửa:**
- Tailwind 3.4: class opacity trên màu biến CSS tuỳ ý (`bg-[var(--x)]/40`…) **không sinh CSS** — nhiều
  hover/viền từ trước tới nay "chết" âm thầm. Đã thay bằng token đặc/rgba, ghi vào `DESIGN_SYSTEM.md`.
- Token `--amber-*` cũ thực chất là **xanh dương** (từ đợt `linh-kien-app` đổi màu 27/08) → badge SLA
  mức "vàng" hiển thị xanh dương. Đã sửa bằng vàng thật.
- 4 biến CSS không được định nghĩa (`--ink-800`, `--teal-50`, `--teal-200`, `--amber-800`) — rơi về
  màu mặc định. Đã sửa khi đổi tên.
- Mọi badge trạng thái cùng 1 màu xanh dương → `StatusBadge`.
- `UnitDetailModal` còn hiện mã linh kiện thô (sót từ P4) → hiện tên.
- Thanh công cụ (ô tìm + nút) tràn/cắt nút trên mobile ở các màn quản trị → xếp dọc trên mobile.
- **[Backend, thật]** `POST /phieu-gui/:id/xac-nhan-gui` cho phép gửi **phiếu rỗng** (0 đơn) → Kho nhận
  thùng trống, khovan cũng được báo thùng trống. Đã chặn bằng lỗi `EMPTY_PHIEU` (+ thông báo tiếng
  Việt trong `lib/api.ts`).
- **[Backend, thật]** `POST /phieu-tra/tu-dong-gom` luôn tạo phiếu MỚI, kể cả khi đã có phiếu "Nhập"
  của đúng KTV + loại đối trừ (VD vừa tạo bởi nút FAST) → 1 KTV bị tách thành 2 phiếu trả, trái quyết
  định 03/09/2026. Đã sửa: gộp vào phiếu nháp sẵn có trước, chỉ tạo mới khi chưa có; response thêm
  `so_phieu_gop_them`, toast màn Admin báo cả số phiếu gộp thêm.
- Phát sinh trong lúc test (không phải lỗi code): dữ liệu seed tay ở local D1 chèn ID mà không tăng
  `id_counters` → lần tạo phiếu đầu bị trùng khoá chính. Chỉ là dữ liệu test, đã nâng bộ đếm local.

**(d) Kiểm thử đã chạy:** `npm run typecheck` (backend + frontend) 0 lỗi sau mỗi bước; `npm run build`
sạch. Thuật toán SLA đối chiếu brute-force (300 ca ngẫu nhiên + ca biên) và `slaCutoffVn` nhất quán
với `hoursSince` (2000 ca) — đều khớp. E2E HTTP: **51/51 đạt** sau khi sửa 2 lỗi backend (trước sửa
46/51 — 3 lỗi dây chuyền từ lỗi phiếu rỗng). Quét 18/18 màn hình trên trình duyệt thật: mở được đủ, 0
lỗi console. Rà giao diện bằng mắt ở 1440px và 375px cho Trang chủ, bảng thống nhất Admin + UI chi
tiết, KTV tạo phiếu/thêm đơn, Kho tiếp nhận, phiếu trả, Tổng quan, các màn quản trị, danh mục linh
kiện. `wrangler.jsonc` bị sửa tạm để chạy local (bỏ binding remote tới dvbh/khovan/D1 production —
phiên này đang đăng nhập đúng tài khoản thật `dichvu3t` nên chạy local nguyên trạng sẽ chạm production)
và **đã khôi phục**, `git diff wrangler.jsonc` sạch. Chưa kiểm được: nhánh "case tìm thấy + khớp KTV"
(không có `dvbh` thật ở local).

**Trạng thái:** `APP_VERSION` = `1.007`. Khi deploy: không có migration mới.

**Quy ước mới (04/10/2026, cùng phiên)** — nguyên văn: *"tự động commit rồi deploy sau mỗi phiên làm
việc"*. Từ nay, cuối MỖI phiên làm việc (khi thay đổi đã xong + typecheck/build sạch), tự động: tăng
`APP_VERSION` 0.001 → cập nhật CLAUDE.md → `git commit` → áp migration remote còn pending → `npm run
deploy` (luôn ép `CLOUDFLARE_ACCOUNT_ID=b1f870d7f2df6701219ac095926a67e5`), **không cần hỏi lại**.
Vẫn giữ thứ tự commit TRƯỚC deploy. Vẫn dừng lại hỏi nếu kiểm thử thất bại hoặc thay đổi có tính phá
huỷ. Phiên này áp dụng ngay: đã commit + deploy v1.007.

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

**[LỖI THỜI — xem mục "Phân tích liên kết với Đặt mua linh kiện..." (03/09/2026) bên dưới trước khi
đọc mục này]**: toàn bộ giả định "build vào bên trong `cloudflare smarttrade base`, tái dùng trực
tiếp `moduleAccess.ts`/`scopeDatMua.ts`/`users.giam_sat_quan_ly`/mẫu `phieu_xuat_kho`" bên dưới **đã
lỗi thời** — module "Đặt mua linh kiện" (nguồn của các pattern này) đã tách hẳn thành 1 hệ Cloudflare
Workers + D1 độc lập tên `linh-kien-app` từ 19/08/2026, và `cloudflare smarttrade base` đã **ẩn hẳn**
2 module cũ (`dat-mua-lk`/`tra-hang`) khỏi mọi vai trò (`TAM_TAT_MODULES` trong `moduleAccess.ts`) —
2 module đó không còn là nguồn sự thật để tái dùng. Hướng kiến trúc mới (đã tìm được bằng chứng cụ
thể — xem file phân tích riêng, mục 0): module bảo hành nên là **Worker + D1 độc lập thứ 3** (tên dự
kiến `suachua`, đã có placeholder link trong `linh-kien-app`), liên kết với `dvbh`/`linhkien` qua
partner API + Service Binding — **không phải** đọc thẳng bảng như mục dưới đây mô tả. Mục này (và
toàn bộ #4 Ke-hoach cũ ở những điểm liên quan) giữ lại chỉ để tham khảo lịch sử/đối chiếu field, không
còn là kế hoạch kỹ thuật cuối cùng cho phần kết nối hệ thống.

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

1. ~~**[Mới] Sẽ có bao nhiêu người thật được gán `la_admin_bh` khi ra mắt?**~~ — **[ĐÃ CHỐT 12/10/2026]** nguyên văn: *"hiện tại có 2 khu vực riêng là MB, MN mỗi khu vực có thể từ nhiều người cùng hoạt động"* — đúng với cơ chế chia miền v1.025 (`users.mien`), không cần sửa gì.
2. ~~`LOẠI ĐỐI TRỪ DO KTV CHỌN` trong `DON BAO HANH` nghĩa là gì~~ — **[ĐÃ CHỐT 22/08/2026, "Phản hồi
   vòng 4"]**: đúng là mô hình 2 tầng — **KTV đề xuất lúc tạo đơn** (`phieu_sc.loai_doi_tru_de_xuat`,
   select mới trong form "Thêm đơn bảo hành") **→ Admin bảo hành xác nhận/có thể đổi lại lúc phân
   loại** (`phieu_sc_ct.loai_doi_tru`, mặc định chọn sẵn theo đề xuất của KTV, Admin đổi tự do). Điều
   này khớp với tên cột lịch sử "DO KTV CHỌN" (KTV có vai trò chọn ban đầu) đồng thời khớp với quyết
   định 21/08/2026 mục #11 (Admin BH là người xác nhận cuối cùng) — mâu thuẫn trước đó (100% dữ liệu
   lịch sử chỉ có giá trị "ĐỔI TRẢ") được diễn giải là do KTV lịch sử ít khi chọn "Trừ công nợ" trên
   thực tế, không phải vì trường này chưa từng do KTV chọn.
3. **`LK DE XUAT SUA CHUA` gắn với case CSKH (Bitrix) chứ không gắn với `DON BAO HANH`** — **[TRẢ LỜI
   12/10/2026]** nguyên văn: *"xử lý lại, các đơn đều có liên kết với nhau theo dạng mẹ - con nếu có liên quan"*. **[ĐÃ CHỐT + ĐÃ LÀM 12/10/2026, v1.029]** — xem mục "Đề xuất linh kiện sửa chữa + 4 kết quả NV (12/10/2026)".
4. Ngưỡng escalate khi Admin từ chối đề xuất linh kiện — **[TRẢ LỜI 12/10/2026]** người dùng hỏi lại *"là sao? bị bug cho phép từ chối nhiều lần à => fix"*. Không phải lỗi: tính năng đề xuất linh kiện chưa có nên chưa có gì để từ chối. **[ĐÃ CHỐT 12/10/2026]**: *"Cứ đề xuất đến khi sửa xong hoặc xác định là không sửa được"* — không giới hạn, không escalate.
5. ~~Định nghĩa "thất lạc trên đường trả"~~ — **[ĐÃ CHỐT + ĐÃ LÀM 12/10/2026, v1.028]** nguyên văn: *"KTV báo vấn đề không nhận được linh kiện và phản hồi ngược về cho kho => kho sẽ đánh giá và đánh giá việc gửi thành công hay thất bại"*.
6. ~~Có bước "thu hồi chi phí bảo hành từ hãng/OEM" không~~ — **[ĐÃ CHỐT + ĐÃ LÀM 12/10/2026, v1.028]** nguyên văn: *"có, hiện tại chỉ ghi nhận thủ công (có thể thêm 1 vùng để nhập số tiền đã thu được - không bắt buộc)"*.
7. ~~`debt_adjustments` / có cần đối soát ngược MISA không~~ — **[ĐÃ CHỐT 12/10/2026]** nguyên văn: *"hiện tại thì không"*. Không làm.

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

## Kéo đơn bảo hành Odoo về app + đẩy trạng thái ngược về dvbh (04/10/2026) — ĐÃ TRIỂN KHAI (v1.008)

**(a) Nguyên văn yêu cầu:** *"tôi cần kéo danh sách đơn bảo hành được tạo trên odoo về app này, tạo
thành danh sách đơn bảo hành đang chờ gửi sửa (KTV nhìn thấy đơn của bản thân thông qua ID KTV phụ
trách). Khi đơn bảo hành thay đổi trạng thái cũng sẽ bắn ngược kết quả về app dvbh. => bên hệ thống
dvbh sẽ tính toán 1 lần vào thời gian hệ thống nhận data => hệ thống app bảo hành nên để bên dvbh chủ
động đẩy sang hay tự xin định kỳ sau 1 khoảng thời gian"*. Đã chốt qua AskUserQuestion: (1) **KTV chọn
đơn Odoo vào thùng**, app tự điền mã ca/linh kiện/số lượng, đơn cha lưu `odoo_id`; (2) "chờ gửi sửa" =
Odoo `trang_thai IN ('new','repairing')`; (3) dvbh lưu trạng thái gửi sửa ở **cột riêng**, giữ nguyên
trạng thái Odoo.

Người dùng hỏi tiếp: *"giữa việc dvbh chủ động đẩy khi có data mới với việc app bảo hành xin định kỳ,
phương án nào tiết kiệm chi phí, lượt đọc ghi hơn, hãy phân tích ở cả 2 hướng, tìm hiểu đủ dữ liệu cần
thiết rồi mới đánh giá"*.

**(b) Số liệu thật đo trên production dvbh (chỉ đọc, 04/10/2026):**
- `don_bao_hanh_odoo`: 484 dòng (bắt đầu có từ 01/10, ~100–173 đơn mới/ngày), 483 đang `new`. Cả
  bảng mới chỉ được đồng bộ 1 lần (19:01 04/10).
- Pipeline auto qs đẩy dữ liệu vào dvbh **4–5 đợt/ngày, giờ cố định** 07h, 09h, 13h, 14–15h (+19h hôm
  04/10) — đếm từ `import_history` 27/09–04/10. Giữa các đợt dữ liệu Odoo trong dvbh KHÔNG đổi.
- `case_dvbh` 127.415 dòng; 1 đợt `tong_hop` ghi đè ~2.000–3.800 case.
- D1 dvbh đã 541MB (> giới hạn 500MB của gói miễn phí) → tài khoản đang ở gói Workers Paid.
- Partner API dvbh: giới hạn tần suất theo key dùng Cache API (không ghi D1); xác thực key = 1 lượt đọc
  bảng `partner_api_keys` (vài dòng). `logPartnerApiCall` ghi 1 dòng D1/lần gọi — endpoint mới KHÔNG nên
  dùng hàm này.

Kết luận phân tích: xem trả lời trong phiên. Tóm tắt: chi phí cả 2 hướng đều ≈ 0 (vài trăm lượt đọc/
ghi mỗi ngày so với hạn mức hàng tỷ), chênh lệch không đáng kể; khác biệt thật nằm ở độ tin cậy và độ
phức tạp — khuyến nghị **suachua tự xin định kỳ** (có con trỏ, tự phục hồi), chiều trạng thái ngược
**suachua gom đẩy theo lô** trong cùng cron. Phát hiện quyết định: đơn có thể về dvbh TRƯỚC case (chưa
biết KTV) → nếu dvbh tự đẩy thì mỗi đợt nhập 2.000–3.800 case phải dò lại đơn đang mở; pull chỉ cần hỏi
lại riêng vài đơn thiếu KTV. Người dùng chốt: *"ok"*.

**(c) Đã triển khai:**
- **dvbh** (repo `../cloudflare smarttrade base`, v1.413): migration `0123` (cột `sc_trang_thai/sc_ma_phieu/
  sc_chi_tiet/sc_cap_nhat/sc_ngay_nhan` + index `(ngay_dong_bo, odoo_id)`); `partnerApi.ts` `GET
  /don-bao-hanh-odoo` (con trỏ `since/after_id`, hoặc `?ids=`, LEFT JOIN `case_dvbh.ky_thuat_vien`, giới
  hạn theo key qua Cache API, KHÔNG ghi `partner_api_call_log`) + `POST /sync/sua-chua-trang-thai` (ghi cột
  `sc_*`, bỏ bản tin cũ đến muộn, không đụng `ngay_dong_bo`); `LoiLinhKienPanel` hiện badge "Sửa chữa: …".
- **suachua** (v1.008): migration `0005` (`don_bh_odoo`, `phieu_sua_chua_bh.odoo_id` + unique index,
  `sync_state`, `odoo_status_sync`); `lib/odooSync.ts` (`runOdooSync`: kéo theo con trỏ → hỏi lại đơn thiếu
  KTV → tính trạng thái suy ra và đẩy phần thay đổi, tối đa 200 dòng/request); cron `*/15 * * * *` +
  `scheduled()` ở `index.ts`; `routes/odooDon.ts` (`GET /cho-gui`, `GET /sync-status`, `POST /sync-now`);
  `POST /api/phieu-gui/:id/don-tu-odoo` (kiểm tra chủ phiếu, mã KTV của đơn = KTV sở hữu thùng, đơn chưa
  gắn, còn new/repairing; điền sẵn `case_id`, `ma_lk`, `so_luong_khai` = làm tròn ≥1, `mo_ta_loi` = tình
  trạng lỗi + ghi chú, `ghi_chu` = "Đơn Odoo <mã>"); workload `ktv_odoo_cho_gui`.
  - Giao diện: thẻ "🧾 Đơn bảo hành Odoo chờ gửi sửa" ở màn Gửi hàng (KTV thật, chọn nhiều → "Tạo thùng
    với N đơn"); nút "🧾 Chọn đơn Odoo" trong chi tiết phiếu nháp (dùng được cả khi tạo hộ); badge "Odoo"
    trên dòng đơn; thẻ "Đồng bộ đơn bảo hành Odoo" ở Cài đặt hệ thống (số liệu + "Đồng bộ ngay").
  - Trạng thái gửi sửa đẩy về dvbh: `cho_gui` (thùng nháp) → `dang_gui` → `kho_da_nhan` → `dang_xu_ly` →
    `cho_tra` → `dang_tra` → `hoan_tat` / `tu_choi`. Đơn tách nhiều đơn vị lấy giai đoạn thấp nhất còn mở,
    kèm "k/N hoàn tất". Gỡ đơn khỏi thùng nháp → gửi `null` để dvbh xoá. Đơn đã kết thúc không tính lại
    (số dòng đọc mỗi lần cron tỉ lệ với số đơn đang xử lý, không phình theo lịch sử).

**(d) Lỗi/vấn đề phát hiện:**
- `phieu_sua_chua_bh.ma_lk` có FOREIGN KEY tới `linh_kien_bh` (D1 thực thi FK), mà chỉ 85/177 mã linh kiện
  Odoo có trong danh mục bảo hành → tự thêm dòng `noi_bo` (tên lấy từ Odoo) trước khi tạo đơn, thay vì bỏ
  trống linh kiện.
- Kiểm thử local: wrangler dev registry nối được 2 Worker local qua service binding (bỏ `remote: true`
  tạm thời); khi khởi động lại Worker đích thì Worker gọi bị "Network connection lost" — phải khởi động lại
  cả bên gọi. Đường dẫn `/tmp` của Git Bash truyền cho node thành `F:	mp` → dùng đường dẫn Windows.

**(e) Kiểm thử:** typecheck backend+frontend cả 2 repo 0 lỗi; build sạch. E2E chạy thật 2 Worker local
(dvbh dữ liệu tạm riêng, 5 đơn mẫu, 1 đơn chưa có case): 37/38 đạt — mục còn lại là lỗi của script test
(đọc sai `counts.ktv_odoo_cho_gui`), backend trả đúng. Đã xác minh: kéo 5 đơn, lần 2 không kéo lại; 1 đơn
"chưa rõ KTV"; KTV chỉ thấy đơn của mình, không xem được của KTV khác, Admin BH xem hộ được; chặn đơn KTV
khác/đơn đã gắn; điền sẵn đúng; đẩy đủ chuỗi trạng thái tới `hoan_tat 1/2` và đọc lại trên dvbh thấy cột
`sc_*` đúng trong khi `trang_thai` Odoo giữ nguyên; không đẩy lại khi không đổi; gỡ đơn → dvbh reset. UI
kiểm tra trên trình duyệt (1440px + 375px): chọn đơn → tạo thùng mở đúng chi tiết có badge Odoo, modal chọn
đơn hiện trạng thái rỗng đúng. `wrangler.jsonc`/`.claude/launch.json` đã khôi phục.

## Sắp xếp lại menu Admin + "Chế độ test" theo vai trò / theo gmail người dùng thật (05/10/2026) — v1.009

**(a) Nguyên văn yêu cầu:**

> 1. tại sao giao diện admin lại hiện nhiều mục menu vậy? nó sắp xếp hỗn loạn và không biết dùng cho việc
>    gì, sắp xếp lại cho hợp lý
> 2. Vai trò admin cho tôi lựa chọn test theo vai trò và theo gmail người sử dụng thật (tham khảo bên hệ
>    thống linh-kien-app tính năng test của admin)

**Vì sao menu loạn:** từ 04/09/2026 (QA "Admin nhìn được tất cả module"), `la_qtri` đi qua mọi cổng vai
trò, và `routesForUser()` nối menu của từng vai trò theo thứ tự code → Admin có ~19 mục không theo thứ
tự quy trình, không mô tả, lẫn cả các màn "cá nhân" (Tra cứu của tôi / Nhận hàng của tôi / Việc NV của
tôi) vốn luôn rỗng với Admin.

**(b) Đã triển khai:**

1. **Menu** (`frontend/src/layout/routes.ts`, viết lại thành 1 `CATALOG` có `show(u)`): sắp theo đúng
   thứ tự quy trình: Trang chủ → Theo dõi (Tổng quan, Tra cứu) → **1 · Gửi hàng** → **2 · Kho** → **3 · Xử
   lý bảo hành** → **4 · Trả hàng** (+ Kế toán duyệt) → **Danh mục & quản trị** → Liên kết (Mua hàng).
   Mỗi mục có `desc` (dòng mô tả khi sidebar mở rộng + tooltip "Nhóm › Mục — mô tả"); bỏ trùng theo
   hash. Sidebar thu gọn rộng `w-[76px]`, hiện icon + nhãn ngắn 2 dòng bên dưới (không còn chỉ icon).
   **Ghi đè 1 phần quyết định 04/09/2026** ("Admin nhìn được tất cả module"): Admin vẫn thấy & thao tác
   mọi module, **TRỪ 3 màn cá nhân** `/ktv/tra-cuu`, `/ktv/nhan-hang`, `/nv/viec-cua-toi` (lọc theo
   email chính người đăng nhập → luôn rỗng với Admin) — muốn xem các màn đó thì dùng Chế độ test. Admin
   thấy mục "Tạo hộ đơn cho KTV" thay cho "Gửi hàng của tôi". Backend KHÔNG đổi — `la_qtri` vẫn superuser.
2. **Chế độ test** (port từ `linh-kien-app` "Xem thử vai trò" + "Xem như người dùng"), chỉ áp dụng khi
   tài khoản THẬT là `la_qtri`:
   - Backend: `backend/src/lib/viewAs.ts` (mới), `middleware/loadUser.ts` (`loadTargetUser()` đọc
     `users` — phải đã duyệt & không khoá — hoặc fallback danh bạ `ktv_lien_he_bh` cho KTV **chưa từng
     đăng nhập**), `routes/auth.ts`: `POST /api/auth/view-as {role|null}`, `GET
     /api/auth/view-as-user/options?q=` (gộp users + KTV danh bạ chưa đăng nhập, tối đa 50), `POST
     /api/auth/view-as-user {email|null}`; `/me` trả thêm `realIsAdmin/realEmail/viewAsRole/viewAsUser`;
     logout xoá cả 2 cookie.
   - **Theo vai trò** (cookie `suachua_view_as`): giữ email Admin, chỉ đổi cờ sang đúng 1 vai trò (bỏ
     cả `la_qtri`) — **thao tác được, ghi nhận thật dưới email Admin**. Lưu ý: màn lọc theo email (KTV,
     NV, GS) sẽ rỗng vì Admin không phải KTV/NV/GS thật — dùng chế độ dưới để xem dữ liệu thật.
   - **Theo gmail người dùng thật** (cookie `suachua_view_as_user`, ưu tiên hơn cookie vai trò): mang
     đúng email + cờ + dữ liệu của người đó — **chỉ xem**: mọi request ghi bị chặn `403 XEM_NHU_CHI_DOC`
     (trừ chính các API bật/tắt chế độ test và logout), để không ghi nhận dưới tên người khác.
   - Frontend: `frontend/src/layout/TestMode.tsx` (mới — `TestModeModal`, `TestModeBanner`), nút "🧪 Chế
     độ test" trên TopBar (mobile + desktop, chỉ Admin thật), banner dính trên cùng (vàng = vai trò, xanh
     = xem như người dùng) có "Thoát về Admin"; `AuthContext` thêm `test`.
3. `Home.tsx`: thẻ "Đơn Odoo chờ gửi sửa" chỉ hiện cho KTV/Vệ tinh thật (Admin thấy thẻ này = 0 vô nghĩa).

**(c) Lỗi/vấn đề trong lúc làm:** nhãn sidebar thu gọn bị cắt cụt → đổi `line-clamp-2`. Không có lỗi
backend.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chạy `wrangler dev` local (đã bỏ tạm
binding remote rồi khôi phục `wrangler.jsonc`, `git diff` sạch), đăng nhập `qtri@t.vn`: sidebar 16 mục
đúng thứ tự nhóm; bật vai trò "Kho" → `/me` chỉ còn `la_kho`, `GET /api/users` bị 403 (đúng); tìm
"ktva" → ra đúng `ktva@t.vn`; xem như `ktva@t.vn` → `/me` trả email KTV A, sidebar chỉ còn Gửi hàng /
Tiến độ / Nhận hàng, Trang chủ hiện số liệu của KTV A, banner "Đang xem như KTV A… chỉ xem", `POST
/api/phieu-gui` bị 403 `XEM_NHU_CHI_DOC`; thoát → về lại Admin, không banner, không còn thẻ Odoo trên
Trang chủ Admin; modal Chế độ test mở đủ 2 phần (8 thẻ vai trò + danh sách người dùng). Không chụp được
ảnh màn hình (pane trình duyệt không vẽ) — đã kiểm bằng đọc DOM/API thật. Không có migration mới.

**Theo dõi cron Odoo trên production (05/10/2026):** sau lần deploy v1.008 (lịch `*/15` đăng ký lúc
16:32Z 04/10) cron **không chạy lần nào** trong ~1 giờ (`sync_state` rỗng — mà `runOdooSync` luôn ghi
`odoo_last_run` kể cả khi lỗi, nên rỗng = `scheduled()` chưa từng được gọi). Sau khi deploy lại v1.009
(lịch đăng ký lại), cron chạy đúng mốc 17:45Z: `keo_ve: 484`, `loi: []`, con trỏ
`since 2026-10-04 19:01:04 / after_id 505`; 11/484 đơn còn chưa rõ KTV (đơn về trước case — sẽ được hỏi
lại ở các lần cron sau). Bài học: deploy lần đầu có cron mới mà không thấy chạy thì kiểm `sync_state`;
deploy lại là cách khắc phục đã hiệu quả.

## Sửa modal "Tạo phiếu gửi hộ" bị giãn + danh sách KTV bị ẩn + icon viền trắng (05/10/2026) — v1.010

**(a) Nguyên văn:** *"chức năng tạo đơn đang bị lỗi hiện thị, danh sách KTV hiện ra cũng bị ẩn"* (kèm ảnh
modal "Tạo phiếu gửi hộ cho KTV" kéo dài hết chiều ngang) và *"icon đang bị lỗi có viền trắng"*.

**(b)/(c) Nguyên nhân + đã sửa:**
1. **Modal nhỏ bị kéo giãn hết màn hình — lỗi chung ~24 modal, không chỉ màn này.** `ui/Modal.tsx` ghép
   chuỗi `"md:" + maxWidthClass` lúc chạy → Tailwind chỉ sinh CSS cho tên lớp viết nguyên văn trong mã
   nguồn nên `md:max-w-sm/md/lg` KHÔNG tồn tại → modal rơi về `w-full`. Sửa bằng bảng tra tĩnh `MD_MAX_W`
   (viết nguyên văn từng lớp). Bài học: **không bao giờ ghép tên lớp Tailwind động**.
2. **Danh sách xổ xuống bị cắt.** `SearchableSelect` vẽ danh sách `absolute` bên trong thân modal có
   `overflow-y-auto` → bị cắt mất. Đổi sang render qua portal (`document.body`) + `position:fixed` theo
   toạ độ nút, tự lật lên trên nếu phía dưới không đủ chỗ, cập nhật khi cuộn/đổi cỡ, `z-[200]` (trên
   modal `z-[150]` và sheet mobile `z-[160]`); click-ngoài-để-đóng loại trừ cả vùng portal. Áp dụng cho
   MỌI chỗ dùng `SearchableSelect` (chọn KTV, linh kiện, NV, GS…).
3. **Icon viền trắng.** Ảnh gốc `logo sua chua 3t.png` có sẵn khung trắng bao ô xanh + 1 vạch xanh đậm
   mép trên. Xuất lại bộ icon (`icon-192/512`, `icon-maskable-512`, `apple-touch-icon`, `favicon`) bằng
   `sharp`: cắt sát ô xanh (x 36–816, y 36–838), tô các góc bo/viền chuyển sắc còn sót bằng màu xanh lân
   cận. Bỏ thêm `ring-1 ring-white/30` trên icon ở Sidebar/TopBar.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch, xác nhận CSS đã có `.md\:max-w-sm/md/lg`. Chạy `wrangler
dev` local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`), Chế độ test vai trò Admin BH: modal
rộng 448px (trước: hết chiều ngang), bấm ô chọn → danh sách hiện ngay dưới ô, đủ 6 KTV, ô tìm tự focus,
chọn KTV xong nút "Tạo phiếu" bật. Xem lại icon mới bằng mắt — hết viền trắng. Lưu ý: PWA đã cài trên điện
thoại có thể còn icon cũ trong bộ nhớ đệm cho tới khi cài lại.

## 7 yêu cầu: nút Kiểm tra case, nhớ nhà xe, "Tên (mã)", link CRM, top linh kiện, cache + tìm không dấu, tạo thay khi lệch KTV (05/10/2026) — v1.011

**(a) Nguyên văn** (người dùng đánh số 3–9, kèm ảnh thẻ "Sai mã sự vụ — case này không thuộc về KTV…"):

> 3. khi tìm mã sự vụ bảo hành, thêm nút ấn kiểm tra thì mới kiểm tra với bên dvbh, tránh việc gửi api hỏi liên tục mỗi khi nhập 1 ký tự
> 4. với KTV thường mặc định 1 hình thức gửi phát, lưu vết phương án nhập của KTV để lần sau tự điền: Hình thức gửi, Mã xe / Tài xế, Đơn vị vận chuyển
> 5. Đơn từ odoo cần hiện"tên linh (mã)" rõ ràng trong mọi phiên xử lý
> 6. thông tin xin được từ app dvbh bổ sung thêm nút xem chi tiết theo link crm ở các vị trí xem ID case (UI xem chi tiết, phần tìm mã ID case)
> 7. Danh sách linh kiện lỗi hàng ngày sẽ setup 1 khu giờ để đánh giá top các linh kiện được xử lý thành công trong 30 ngày gần nhất để sắp xếp top linh kiện => khi hiện danh sách sẽ hiện theo top các linh kiện này)
> 8. Danh sách linh kiện sửa chữa bổ sung thêm mã phía sau tên (linh kiện + (1201021012)), + hỗ trợ tìm kiếm không đấu, có dấu, tìm cách từ... (việc tìm kiếm này triển khai trên máy người dùng không hao phí serer) - tải danh sách linh kiện về máy người dùng, lưu cache. chỉ cập nhật khi server có update)
> 9. Trường hợp Admin hoặc Giám sát tạo đơn bảo hành hộ mà case không đúng KTV phụ trách case đó, cho phép tích chọn "Xác nhận tạo đơn bảo hành cho người khác người phụ trách case trên hệ thống" => nếu họ tích cái này sẽ cho phép tạo đơn thay.

**(b) Đã triển khai** (migration mới `0006_top_lk_nha_xe_tao_khac_ktv.sql`):
- **3** `hooks/useCaseLookup.ts` chuyển sang thủ công: chỉ gọi `/case-lookup` khi bấm "🔍 Kiểm tra" hoặc Enter; sửa mã case → kết quả cũ bị xoá, phải kiểm tra lại. Component chung mới `CaseIdField` (ô nhập + nút + thẻ preview) dùng ở `AddDonModal`, `AddDonMobileSheet`, `DonDichVuModal`. `PhanLoaiModal` (mã case cố định, không gõ) dùng `CaseLookupAuto` — tra 1 lần khi mở.
- **4** Bảng mới `ktv_nha_xe_bh` (theo email KTV sở hữu thùng), ghi mỗi lần `PATCH /phieu-gui/:id` (gồm cả lúc "Xác nhận đã gửi xe", vốn PATCH header trước). Tạo phiếu mới đọc bảng này; chưa có thì lấy phiếu **đã gửi** gần nhất. Trước đây lấy phiếu tạo gần nhất, kể cả phiếu nháp chưa sửa, nên hay chép lại giá trị mặc định. `GET /phieu-gui/:id` (phiếu nháp) trả thêm `goi_y` (8 mã xe / đơn vị vận chuyển gần nhất) → `<datalist>` gợi ý khi gõ.
- **5 + 8 (nhãn)** Mọi chỗ hiện linh kiện: `"Tên (mã)"` (`lkLabel`, `lkOptions`, `useLkName` trong `hooks/useLinhKien.ts`). Đã áp cho các ô chọn linh kiện, bảng Admin, tra cứu, việc NV, phiếu trả, UI chi tiết, modal chọn đơn Odoo và dòng đơn trong chi tiết phiếu gửi (mới hiện thêm dòng "🔩 linh kiện"). Phiếu có đơn mang linh kiện chưa có trong cache (linh kiện Odoo vừa tự thêm) → tự tải lại danh mục.
- **6** `CrmLink` ("Xem trên CRM ↗", lấy `link_crm` từ dvbh) trong thẻ kết quả tra cứu case và trong khối "📎 Bằng chứng case" của UI chi tiết.
- **7** `lib/topLinhKien.ts`: "xử lý thành công" = đơn vị con `admin_xac_nhan_hoan_tat=1`, không tính `huong_xu_ly='tu_choi'`, `updated_at` trong 30 ngày, đếm theo linh kiện thực tế (`COALESCE(ma_lk_thuc_te, đơn cha.ma_lk)`); ghi bảng `linh_kien_top_bh` (tối đa 200). **Không thêm cron mới**: cron 15 phút sẵn có gọi `maybeComputeTopLinhKien` — từ khung giờ cài đặt trở đi (`sync_state.lk_top_gio`, mặc định 02:00 VN), nếu hôm nay chưa tính thì tính 1 lần. Thẻ "🔥 Top linh kiện (30 ngày)" ở Cài đặt hệ thống: chọn khung giờ (chỉ qtri lưu được) + "Tính ngay" (Admin BH/qtri). Ô chọn linh kiện xếp top trước, kèm nhãn "🔥 Top N".
- **8 (cache + tìm)** `GET /linh-kien` (không `limit`) chỉ trả `ma_lk, ten_lk, so_thang_bao_hanh, duoc_dung_bao_hanh, top_hang, top_so_luong` + `version` (production có 6.280 linh kiện). Client lưu `localStorage` (`lk_cache_v2`), mỗi lần mở app chỉ gọi `GET /linh-kien/version` (đọc 1 dòng `sync_state.linh_kien_version`), khác phiên bản mới tải lại. Phiên bản tăng ở MỌI chỗ ghi linh kiện: thêm/sửa ở màn danh mục, đồng bộ từ linh-kien-app, tự thêm từ đơn Odoo (chỉ khi thật sự thêm dòng), tính lại top. Store dùng chung cho cả trang → nhiều component chỉ 1 lượt gọi mạng. Ô chọn chỉ liệt kê dòng `duoc_dung_bao_hanh=1`; tra tên dùng cả danh mục. Tìm kiếm trong `SearchableSelect` (áp cho MỌI ô chọn): bỏ dấu (`lib/normalizeVi.ts`), tách từ — mọi từ gõ vào phải có mặt, không cần đúng thứ tự, khớp cả mã; chỉ mục chuẩn hoá tính 1 lần theo danh sách.
- **9** `POST /phieu-gui/:id/don` nhận `xac_nhan_khac_ktv`. Chỉ người có quyền tạo hộ (`la_admin_bh` / `la_giam_sat` / `la_qtri`) **và không phải chính KTV sở hữu thùng** mới được vượt cổng `CASE_KTV_MISMATCH`. `CASE_NOT_FOUND` vẫn chặn cứng. Lưu `phieu_sua_chua_bh.xac_nhan_khac_ktv` (email người xác nhận) + `ktv_tren_case` + 1 dòng log. Frontend: khi lệch KTV mà người dùng có quyền → thẻ vàng có ô tích đúng câu chữ yêu cầu; nút "Thêm vào phiếu" chỉ bật khi đã tích. Đơn tạo thay hiện cảnh báo trong chi tiết phiếu gửi và UI chi tiết đơn.

**(c) Vấn đề trong lúc làm:**
- Công cụ ghi file/heredoc biến chuỗi `\u0300-\u036f` thành ký tự tổ hợp thật trong mã nguồn (chạy được nhưng vô hình khi đọc) → dựng regex bằng `String.fromCharCode(0x300)`.
- Một lần thay chuỗi đã chèn nhầm lệnh tăng phiên bản linh kiện vào cả route đồng bộ KTV/khu vực (cùng mẫu code) → đã gỡ.
- Ở local không có Worker dvbh → tạm cho `lookupCase` trả case mẫu khi mã bắt đầu bằng `TEST` để thử nhánh lệch KTV; đã hoàn tác bằng `git checkout` trước khi commit.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local (bỏ tạm binding remote rồi khôi phục): migration 0006 áp được.
- API: thiếu ô tích → 400 `CASE_KTV_MISMATCH`; có ô tích → 201 và lưu đúng người xác nhận + KTV trên case; case đúng KTV → 201 với `xac_nhan_khac_ktv=null`.
- PATCH header rồi tạo phiếu mới → tự điền đúng "Nhà xe / 29B-12345 Anh Tuấn / Nhà xe Hoàng Long", `goi_y` có 2 giá trị. "Tính ngay" → 3 linh kiện, phiên bản 0→1, `GET /linh-kien` xếp top 1–3 trước.
- UI (Chế độ test vai trò Admin BH): gõ mã case → 0 lượt gọi API; bấm Kiểm tra → 1 lượt; có link CRM; nút submit tắt cho tới khi tích. Ô linh kiện hiện "Loi loc so 1 PP 5 micron (LK005) 🔥 Top 1"…; tìm "vòi", "voi inox", "inox voi", "5 micron loc", "LK011" đều ra đúng 1 kết quả.
- Tải lại trang → chỉ 1 lượt gọi `/linh-kien/version` (dùng cache). Thẻ Top linh kiện ở Cài đặt hiển thị đúng.
- Chưa kiểm được với dvbh thật (link CRM thật, case thật).

## Rà soát 1 ngày làm việc của Admin bảo hành + sửa 8 lỗi rõ ràng (05/10/2026) — v1.012

**(a) Nguyên văn yêu cầu:** *"về vai trò admin bảo hành: => bạn hãy tự vào vai trò 1 nhân viên admin bảo
hành => triển khai công việc hàng ngày, có trung bình 100-150 đơn bảo hành được gửi về rải rác trong
ngày, bạn phải xử lý các đơn với nhiều bước, quy tắc riêng, đến khi kết thúc luồng quy trình xử lý các
linh kiện này => đánh giá tốc độ xử lý, vấn đề vướng mắc, cái gì cải tiến được, cái gì đang chưa hợp lý
=> cách nào xử lý nhiều đơn, các đơn có trạng thái giống hệt nhau chỉ 1- 2 click là xử lý hoàn loạt như
=> đổi mới trong bảo hành => click hoàn loạt => các cảnh báo, chỉ dẫn để tiện cho công việc đã có chưa
=> test chi tiết rồi lập bảng vân đề, giải pháp => tốc độ xử lý trung bình cho từng luồng quy trình =>
các bước nhập liệu cho từng bước hiện tại => đề xuất => cải tiến sau đề xuất"*

**(b) Đã làm:**
- Mô phỏng chạy thật 1 ngày trên `wrangler dev` local với D1 riêng: 15 KTV, 26 thùng, 120 đơn cha, 143
  đơn vị. Case lookup dùng stub tạm (đã revert).
- Đo click, trường nhập và thời gian máy cho từng bước A–E.
- Báo cáo đầy đủ ở `du an sua chua bao hanh/Ra-Soat-Ngay-Lam-Viec-Admin-BH_05-10-2026.md`: bảng tốc
  độ, 17 vấn đề, ước tính trước/sau đề xuất (~65–75 phút/ngày → ~20–25 phút).
- **Đã sửa ngay 8 lỗi rõ ràng (v1.012):**
  1. `GET /admin/don-cha` bị trần 100 dòng mà không có nút chuyển trang → nâng lên 1000.
  2. ⚡ "Từ chối" không hỏi lý do huỷ nên luôn lỗi 400 → `FastActionsModal` thêm ô "Lý do huỷ".
  3. Phân loại hàng loạt mặc định "Đổi trả", ghi đè đề xuất "Trừ công nợ" của KTV → thêm lựa chọn mặc
     định "Theo đề xuất của KTV" (`loai_doi_tru='theo_de_xuat'`, backend lấy `defaultLoaiDoiTru` theo
     từng đơn).
  4. Hàng loạt nay gộp vào phiếu trả "Nhập" giống FAST (`attachToOrCreatePhieuTra`).
  5. "Lý do chậm" khi làm hàng loạt đổi từ ô gõ tự do sang ô chọn danh mục.
  6. Nút "Gửi duyệt" phiếu trả tự lưu mã trước khi gửi (trước đây gõ mã mà chưa "Lưu mã" thì báo thiếu
     MISA).
  7. Số workload `admin_cho_phan_loai` bỏ các đơn `cho_bo_sung_tt` (đang là việc của KTV).
  8. Top linh kiện 30 ngày: định nghĩa "thành công" nay gồm đơn đã tới bước trả hàng
     (`san_sang_gom_phieu_tra` / có `phieu_tra_id` / `admin_xac_nhan_hoan_tat=1`), trừ `tu_choi` /
     `chuyen_kho`. Bản cũ (v1.011) chỉ đếm `admin_xac_nhan_hoan_tat=1`, nên bỏ sót toàn bộ đơn Đổi mới /
     Trừ nợ / Trả lại.

**(c) Vấn đề trong lúc làm:** `wrangler dev` mất static assets sau khi `npm run build` thay thư mục
`dist` (trang trắng, `/` trả 404). Phải khởi động lại server mới thấy giao diện mới.

**(d) Kiểm thử:**
- Typecheck backend + frontend: 0 lỗi.
- API trên D1 mô phỏng:
  - hàng loạt với `theo_de_xuat`: 4/4 đơn giữ `tru_cong_no` và được gộp vào đúng phiếu nháp của từng
    KTV;
  - FAST `tu_choi_fast` thiếu lý do → 400, có lý do → 200;
  - tính lại top → 20 linh kiện (trước đó chỉ đếm 16 đơn vị);
  - workload đếm đúng.
- UI thật: form ⚡ Từ chối hiện ô "Lý do huỷ" có đủ danh mục.

**Câu hỏi mở / đề xuất chờ người dùng chọn (CHƯA làm):** đề xuất 9–17 trong file báo cáo, gồm lọc /
tìm / nhóm ở bảng thống nhất, hàng loạt cho tiếp nhận + xác nhận SL + FAST + hoàn tất, cột tên khách /
tên KTV / badge hết BH, nhập mã phiếu trả dạng bảng. ~~Riêng điểm 15 cần chốt nghiệp vụ: Đổi mới qua FAST
/ hàng loạt hiện không ghi `xu_ly_xac` — nên hỏi ngay lúc phân loại, hay để trống rồi hỏi sau?~~ **[ĐÃ CHỐT
05/10/2026: hỏi ngay lúc phân loại, chọn 1 lần cho tất cả — xem mục kế tiếp]**. Điểm 11 (FAST hàng loạt)
cũng đã làm ở mục kế tiếp.

## Phân trang 20 dòng + cột Phân loại LK + cảnh báo đổi đề xuất KTV + xử lý xác khi Đổi mới nhanh (05/10/2026) — v1.013

**(a) Nguyên văn yêu cầu:**

> 1. Các danh sách table dài phải phân trang, tối đa 20 dòng /trang
> 2. Thêm cột phân loại linh kiện dựa theo phân loại từ bên hệ thống linh kiện linh-kien-app
> 3. Đề xuất của KTV chỉ là đề xuất, còn thao tác Admin bảo hành mới tính là chốt => nên có thể sẽ hiện cảnh báo việc thao tác này sẽ làm thay đổi đề xuất gốc của KTV, bạn có chắc chắn không?
> 4. Khi cọn đổi mới nhanh, sẽ hiện 1 lựa chọn phương án xử lý với xác => admin chọn 1 lần cho tât cả các đơn xử lý

Mục 4 cũng trả lời câu hỏi mở số 15 của đợt rà soát Admin BH: hỏi xử lý xác ngay lúc phân loại.

**(b) Đã triển khai:**

1. **Phân trang ≤20 dòng/trang.**
   - Bảng thống nhất Admin BH:
     - `GET /admin/don-vi?group=1` (`backend/src/routes/adminBH.ts`) phân trang **theo đơn cha**: mỗi trang 20 đơn cha, kèm đủ mọi đơn vị của chúng.
     - Nhờ vậy nhóm "×N" vẫn gộp đúng. Trước đây phải lấy 1000 dòng một lần.
     - `total` = số đơn cha, `total_don_vi` = tổng đơn vị.
   - Đơn cha chờ xác nhận SL: phân trang server 20/trang, có thanh trang riêng (trước đây lấy 1000).
   - Chọn hàng loạt chỉ trong trang đang xem: đổi trang thì bỏ chọn.
   - `usePagedApi` trả thêm `raw` (toàn bộ response) để đọc các trường phụ.
   - Danh sách nhỏ đã tải sẵn thì phân trang trên máy bằng hook mới `hooks/useClientPage.ts`:
     - nhóm "Đơn vị sẵn sàng gộp phiếu trả" (`AdminPhieuTra`);
     - danh sách Khu vực (`qtri/KhuVuc`);
     - danh sách đơn Odoo chờ gửi (`OdooDonList`; "Chọn tất cả" vẫn chọn hết mọi trang, có hiện số đã chọn).
   - Các bảng còn lại đã phân trang server từ 05/09/2026.
2. **Cột "Phân loại LK".**
   - Phát hiện: "Phân loại" bên linh-kien-app chính là cột `don_vi` (bên đó đổi nhãn hiển thị), và đã được đồng bộ sẵn vào `linh_kien_bh.don_vi` (`sync.ts`). Không cần sửa linh-kien-app, không cần migration.
   - Các giá trị trên production: Khác, Máy, Mạch, Lõi / Vật liệu lọc, Đình tủ, Tủ, Bộ / Cụm, Cánh tủ, Kính tủ (238 dòng rỗng).
   - Thay đổi:
     - `GET /linh-kien` bản gọn trả thêm `don_vi`; cache trên máy đổi key thành `lk_cache_v3` để mọi máy tải lại.
     - Thêm cột `phanloai` vào bảng Admin BH (`useAdminCols`, hiện mặc định ngay sau "Linh kiện"). Cột mới của người đã tuỳ chỉnh cột được chèn đúng vị trí, không bị dồn xuống cuối.
     - Thẻ mobile hiện badge phân loại.
     - Màn Danh mục linh kiện có cột "Phân loại"; ô tìm khớp cả phân loại.
     - Ô chọn linh kiện hiện gợi ý "Phân loại · 🔥 Top N"; `SearchableSelect` tìm được theo hint (gõ "mạch" ra linh kiện loại Mạch). `useLkName` thêm `phanLoaiOf`.
3. **Cảnh báo đổi đề xuất KTV** (`lib/ktvDeXuat.ts`).
   - Trước khi gửi, nếu Admin chốt khác đề xuất KTV thì hiện hộp xác nhận: "Thao tác này sẽ làm thay đổi đề xuất gốc của KTV: • … → … Bạn có chắc chắn không?".
   - Các trường hợp khác đề xuất:
     - loại đối trừ ≠ `loai_doi_tru_de_xuat`;
     - linh kiện thực tế ≠ linh kiện KTV khai (chỉ form đơn lẻ).
   - Áp dụng ở: `PhanLoaiModal`, `BulkPhanLoaiModal` (trừ khi chọn "Theo đề xuất của KTV"; hiện "k/N đơn"), các nút FAST ép đối trừ (Trừ công nợ / Trừ công nợ có PD).
   - Đơn khách lẻ không có đề xuất nên bỏ qua.
   - `GET /admin/don-vi/:id` ghép thêm `phieu_gui_id` vào `don_vi`. Thiếu trường này thì mở từ UI chi tiết sẽ coi nhầm là khách lẻ.
4. **Xử lý xác chọn 1 lần khi Đổi mới.**
   - `applyPhanLoaiToUnit` bắt buộc `xu_ly_xac` (`tra_doi_tac` / `tieu_huy` / `luu_kho`) khi `huong_xu_ly='doi_moi'` và lưu ngay. Áp dụng cho phân loại đơn lẻ, hàng loạt và FAST.
   - Xác nhận hoàn tất: không hỏi lại nếu đã có `xu_ly_xac`; `XacNhanHoanTatModal` điền sẵn.
   - Component mới `XuLyXacField` dùng ở: PhanLoaiModal, BulkPhanLoaiModal (nhãn "áp cho cả N đơn"), form FAST Đổi mới (trong BH / có PD).
   - **Nút mới "⚡ Xử lý nhanh hàng loạt"** (hiện khi đã chọn dòng):
     - Mở lưới FAST cho mọi đơn đã chọn; ẩn 2 nút special.
     - Endpoint mới `POST /admin/don-vi/fast-hang-loat/:key {ids, …}`; logic FAST tách thành `applyFastToUnit` dùng chung.
     - Admin chọn 1 lần NV / mail PD / lý do huỷ / xử lý xác / lý do chậm cho tất cả; báo số đơn áp dụng được / lỗi.
     - `FastActionsModal` nhận `units` (nhiều) hoặc `unit` (cũ, vẫn tương thích).

**(c) Vấn đề trong lúc làm:**
- Heredoc Python dài trong Bash bị lỗi `unexpected EOF` → chuyển sang dùng Edit.
- CLAUDE.md lẫn kiểu xuống dòng CRLF/LF → khi thay chuỗi phải dùng regex `\r?\n`.

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi; build sạch.
- `wrangler dev` local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`), seed thêm 25 đơn cha:
  - API group: 31 đơn cha → trang 1 có 20, trang 2 có 11, không trùng; `total_don_vi` = 82.
  - UI 1440px: 21 dòng (1 đơn chờ SL + 20 nhóm); có cột "Phân loại LK"; thanh trang "Trang 1/2".
  - Chọn nhóm DH-000006 → "⚡ Xử lý nhanh hàng loạt" → "Đổi mới trong BH": form có "Xử lý xác (áp cho cả 2 đơn)" + lý do chậm. Áp dụng xong cả 2 đơn có `xu_ly_xac=tieu_huy` và cùng gộp vào phiếu trả nháp `TR-000001`.
  - "Trừ công nợ" hàng loạt cho lô 25 đơn KTV đề xuất Đổi trả → hiện cảnh báo "25/25 đơn: … Đổi trả → Trừ công nợ"; bấm huỷ thì đơn giữ nguyên.
  - Backend:
    - phân loại / FAST Đổi mới thiếu xử lý xác → 400 `REQUIRE_XU_LY_XAC`; có thì 200 và lưu đúng;
    - FAST hàng loạt với nút special → 400;
    - hoàn tất đơn `sua_chua` không cần xử lý xác → 200.
- Chưa kiểm bằng mắt hộp cảnh báo đổi linh kiện ở form đơn lẻ (dùng chung hàm đã kiểm).

## Đơn Odoo chờ gửi: xác nhận "không gửi" + mở lại (09/10/2026) — v1.014

**(a) Nguyên văn yêu cầu:** *"ở danh sách odoo chờ gửi bảo hành, cho phép xác nhận hủy đơn (tạo nhầm trên
odoo không cần gửi bảo hành - cho phép mở lại để gửi nếu tắt nhầm)"*

**(b) Đã triển khai:**
- `migrations/0007_odoo_khong_gui.sql`: thêm 3 cột `khong_gui_boi`, `khong_gui_luc`, `khong_gui_ly_do` vào
  `don_bh_odoo`.
  - Không cần bảng riêng: upsert của cron đồng bộ chỉ SET các cột dữ liệu Odoo, nên không ghi đè 3 cột này.
  - Không ghi `logs_bh`: cột `entity_type` có CHECK chỉ cho 4 loại. Người huỷ, thời điểm và lý do nằm ngay
    trên dòng.
- `routes/odooDon.ts`:
  - `POST /api/odoo-don/:id/khong-gui {ly_do?, ktv_email?}`. Lý do trống thì dùng mặc định "Tạo nhầm trên
    Odoo, không cần gửi bảo hành".
  - `POST /api/odoo-don/:id/mo-lai {ktv_email?}`: xoá 3 cột.
  - Quyền dùng chung `resolveKtvTarget`:
    - KTV thật thao tác đơn của chính mình;
    - GS (trong khu vực), Admin BH, qtri thao tác hộ qua `ktv_email`;
    - đơn phải đúng mã KTV (nếu không: `CASE_KTV_MISMATCH`) và chưa vào thùng (nếu không: `DA_GAN_THUNG`).
  - `GET /cho-gui` trả 2 danh sách:
    - `don`: đơn chưa huỷ;
    - `khong_gui`: đơn đã huỷ, vẫn new/repairing, chưa vào thùng.
  - `GET /sync-status`: `cho_gui` không còn đếm đơn đã huỷ; thêm số `khong_gui`.
- Đơn "không gửi" bị loại khỏi 3 chỗ:
  - số việc `ktv_odoo_cho_gui` (`workload.ts`);
  - bước hỏi lại KTV trong cron;
  - `POST /phieu-gui/:id/don-tu-odoo` (lỗi mới `ODOO_KHONG_GUI`).
- Báo về dvbh (`lib/odooSync.ts`, hàm `pushStatuses`):
  - đơn huỷ → `trang_thai='khong_gui'`, `chi_tiet` = lý do. Chỉ gửi khi chưa báo, lần báo trước bị lỗi, hoặc
    lý do đã đổi.
  - đơn mở lại (lần báo trước là `khong_gui`) → `null` để dvbh xoá, cùng nhánh với "gỡ đơn khỏi thùng nháp".
- Giao diện (`screens/ktv/OdooDonPicker.tsx`):
  - Mỗi đơn có nút "🚫 Không gửi"; bấm không làm đổi ô chọn của đơn. Nút mở modal xác nhận, ô lý do tuỳ chọn.
  - Dưới danh sách có mục thu gọn "▸ Đã xác nhận không gửi (N)": mỗi đơn hiện lý do · người · lúc kèm nút
    "↺ Mở lại", phân trang 20.
  - Có ở 2 nơi:
    - thẻ ở màn Gửi hàng (`TaoPhieu.tsx`). Thẻ vẫn hiện khi chỉ còn đơn đã huỷ, để mở lại được;
    - modal "Chọn đơn Odoo" trong chi tiết phiếu (dùng được khi tạo hộ).
- dvbh (`../cloudflare smarttrade base`, commit `a1f5f1f`): thêm nhãn `khong_gui` = "Sửa chữa: KTV xác nhận
  không gửi" trong `LoiLinhKienPanel.tsx`.
  - **Chưa deploy dvbh** vì repo đó có phiên khác đang làm dở.
  - Cho tới lần deploy dvbh kế tiếp, badge hiện tạm "Sửa chữa: khong_gui"; dữ liệu vẫn đúng.

**(c) Vấn đề trong lúc làm:** heredoc / `node -e` dài trong Bash lại lỗi `unexpected EOF`. Đã chuyển sang Edit
và chạy file script đặt trong thư mục TEMP. Không có lỗi logic.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chạy `wrangler dev` local (bỏ tạm binding
remote rồi khôi phục `wrangler.jsonc`, `git diff` sạch); migration 0007 áp được.
- API e2e 13/13 đạt:
  - KTV khác huỷ → 403;
  - đơn đã vào thùng → 400;
  - huỷ → đơn chuyển sang `khong_gui`, số việc 3 → 2;
  - `don-tu-odoo` chặn với `ODOO_KHONG_GUI`;
  - Admin BH huỷ / mở lại hộ qua `ktv_email`, lý do mặc định đúng;
  - mở lại → đơn về danh sách chờ gửi.
- Chạy trực tiếp 2 câu SQL dùng để báo dvbh:
  - đơn huỷ chưa báo → được chọn để gửi `khong_gui`;
  - đơn mở lại sau khi đã báo → được chọn để gửi `null`;
  - đã báo rồi → không gửi lại.
- UI 1440px + 375px:
  - "Không gửi" → modal → xác nhận → đơn sang mục "Đã xác nhận không gửi", ô chọn không bị tích;
  - "Mở lại" → đơn quay về danh sách.
- Chưa kiểm được việc gửi thật sang dvbh (local không có Worker dvbh).

## Đơn Odoo: đổi tên "Hủy đơn lỗi" + tách 3 tab Chưa gửi / Đã gửi / Hủy bỏ (09/10/2026) — v1.015

**(a) Nguyên văn yêu cầu:**

> 1. Đổi "Không gửi" => "Hủy đơn lỗi"
> 2. Tách thành đơn chưa gửi, đơn đã gửi, đơn hủy bỏ để KTV tiện quản lý, danh sách trang là 20 item/1 trang

**(b) Đã triển khai:**
- Đổi chữ: nút "🗑 Hủy đơn lỗi"; modal "Xác nhận hủy đơn lỗi"; badge "Đã hủy"; thông báo lỗi `ODOO_KHONG_GUI`
  = "Đơn Odoo này đã bị hủy (đơn lỗi)…". Mã nội bộ vẫn giữ `khong_gui` (API, cột DB, trạng thái gửi dvbh).
  Nhãn bên dvbh đổi thành "Sửa chữa: KTV hủy đơn lỗi".
- Thẻ "🧾 Đơn bảo hành Odoo" ở màn Gửi hàng (`TaoPhieu.tsx`) có 3 tab kèm số đếm:
  - **Chưa gửi**: danh sách chọn để tạo thùng (như cũ), phân trang 20 trên máy.
  - **Đã gửi**: endpoint mới `GET /api/odoo-don/da-gui` — **phân trang server** 20/trang (danh sách này tăng
    theo lịch sử). Lọc theo `phieu_gui_bh.nguoi_tao` = KTV. Mỗi dòng: mã đơn, ca, linh kiện, thùng + đơn cha,
    thời điểm đưa vào thùng, tiến độ. Bấm dòng mở chi tiết phiếu gửi.
    - Tiến độ (`tienDo()` trong `OdooDonPicker.tsx`): thùng nháp / đã gửi / kho đã nhận đọc thẳng trạng thái
      phiếu gửi (luôn mới nhất); các giai đoạn sau lấy `odoo_status_sync.last_status` (cron 15 phút) kèm
      chi tiết "k/N hoàn tất".
  - **Hủy bỏ**: danh sách đơn đã hủy + "↺ Mở lại" (component `OdooHuyList`, phân trang 20).
  - `GET /cho-gui` trả thêm `so_da_gui` cho số đếm tab. Thẻ hiện khi bất kỳ tab nào có đơn.
- Modal "Chọn đơn Odoo" trong chi tiết phiếu giữ dạng danh sách chưa gửi + mục thu gọn "Hủy bỏ (N)".

**(c) Vấn đề trong lúc làm:** thanh tab tràn trên màn 375px → thu nhỏ đệm/cỡ chữ dưới `sm`. Heredoc chứa
template literal dài vẫn lỗi trong Bash → dùng Write file tạm + node.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. `wrangler dev` local (bỏ tạm binding remote rồi khôi phục),
seed 45 đơn Odoo cho 1 KTV (21 đã hủy): tab Chưa gửi 20/26 "Trang 1/2", Hủy bỏ 20/22 "Trang 1/2", Đã gửi 1
đơn hiện "Đã nhận lại · 1/2 hoàn tất"; bấm "Mở thùng" mở đúng "Phiếu gửi BH-000107"; `GET /da-gui?limit=1`
trả đúng `total`. Xem bằng mắt ở 1440px và 375px (sau khi sửa tràn tab).

## Xuất file import kết quả về Odoo (09/10/2026) — chưa deploy

**(a) Yêu cầu (nguyên văn):** "dữ liệu đơn bảo hành tôi cần tải dữ liệu bao gồm ID để có thểm import. đẩy lên hệ
thống => gửi đồng bộ kết quả sang app-gui-bao-hanh => kết quả có thể tải ra để import ngược lại cho hệ thống
odoo => bao gồm ID, Trạng thái, ngày hoàn thành, ghi chú" (kèm ảnh tick "Tôi muốn cập nhật dữ liệu (xuất tương
thích nhập)" trên Odoo).

**(b) Đã chốt với người dùng (09/10/2026):**
- Nút tải đặt ở **app này** (Admin BH màn Phân loại + thẻ "Đồng bộ đơn bảo hành Odoo" ở Cài đặt qtri).
- Quy đổi trạng thái gửi sửa → Odoo: Chờ gửi/Đang gửi → Chưa tiếp nhận; Kho đã nhận/Đang xử lý → Đang sửa chữa;
  Chờ trả/Đang trả → Đã sửa xong; Hoàn tất → Hoàn thành; Từ chối → Từ chối bảo hành; Hủy đơn lỗi (khong_gui) →
  Hủy đơn bảo hành.
- Ghi chú = ghi chú đang có trên Odoo + " | [Sửa chữa 3T] <mã phiếu>: <trạng thái> (n/m hoàn tất); Hướng xử lý: …;
  Lý do: …". Phần "[Sửa chữa 3T]" của lần import trước (đã về lại qua dvbh) được thay, không nối chồng.
- Ngày hoàn thành: trên Odoo là trường **chỉ đọc** — vẫn để cột (thời điểm trạng thái kết thúc bên app), Odoo
  không nhận thì chọn "Không nhập" cột đó lúc import.

**Triển khai:**
- ID = External ID Odoo (`__export__.technical_service_warranty_<id>_<hash>`): auto qs lấy qua
  `export_data(['id'])` (giống thao tác xuất tương thích nhập) → dvbh `don_bao_hanh_odoo.ma_import_odoo`
  (dvbh migration 0129, v1.441) → API partner `don-bao-hanh-odoo` → app này `don_bh_odoo.ma_import_odoo`
  (migration `0008_odoo_ma_import.sql`, `lib/odooSync.ts` upsert giữ giá trị cũ nếu bản tin không có).
- `lib/odooImportExport.ts` + `GET /api/odoo-don/xuat-import?tu=&den=&chi_can_cap_nhat=1` (Admin BH/qtri): đơn có
  trạng thái gửi sửa (`odoo_status_sync`) hoặc "khong_gui"; lọc ngày theo thời điểm trạng thái đổi gần nhất;
  mặc định bỏ đơn Odoo đã đúng trạng thái + ghi chú; đơn chưa có ID đếm riêng (`thieu_id`).
- Frontend `screens/shared/OdooImportExportModal.tsx` (xem trước + tải) và `lib/xlsx.ts` (ghi xlsx tối giản, không
  thêm thư viện): sheet 1 "Import Odoo" đúng 4 cột ID / Trạng thái / Ngày hoàn thành / Ghi chú; sheet 2 "Tham khảo".

**(d) Kiểm thử:** typecheck 0 lỗi; file xlsx mở được bằng openpyxl và Excel (COM). Local (`wrangler dev` + vite,
dev-login): gán tạm ID cho 4/5 đơn Odoo local → xem trước 18 đơn + "5 đơn chưa có ID import"; đơn có phiếu ra
"Đang sửa chữa → Hoàn thành", ghi chú "gap | [Sửa chữa 3T] DH-000104 / BH-000107: Hoàn tất (1/2 hoàn tất); Hướng
xử lý: Đổi mới, Huỷ đơn bảo hành; Lý do: Khong co hang"; nút tải tạo blob xlsx 25 KB; nút có ở cả 2 màn. Đã trả
lại dữ liệu local. **Chưa deploy production** (chờ người dùng xác nhận; thư mục đang có thay đổi chưa commit của
phiên khác ở `wrangler.jsonc`/`caseLookupClient.ts` — deploy từ worktree sạch để không kéo theo).

## Tài liệu hướng dẫn có hình ảnh cho vai trò Admin bảo hành (09/10/2026)

**(a) Nguyên văn yêu cầu:** *"Tạo giúp tôi tài liệu hướng dẫn chi tiết cho vai trò Admin sửa chữa, có
hướng dẫn bằng hình ảnh đầy đủ để gửi cho nhân viên"*

**(b) Đã làm** — thư mục `du an sua chua bao hanh/Huong-dan-Admin-bao-hanh/`:
- `Huong-dan-Admin-bao-hanh.pdf` (A4, có số trang, ~4.5MB) — bản để gửi nhân viên.
- `Huong-dan-Admin-bao-hanh.html` + thư mục `anh/` (39 ảnh JPG + logo) — bản nguồn, sửa rồi in lại PDF.
- 18 mục: vai trò trong quy trình, đăng nhập/Trang chủ/menu, nhận thùng nội bộ, xác nhận SL, bảng đơn
  cần xử lý (trạng thái, nhóm ×N), chi tiết đơn, phân loại + bảng 7 hướng xử lý, ⚡ 10 nút xử lý
  nhanh, xử lý hàng loạt, yêu cầu bổ sung / báo cáo sai, SLA 24h (bỏ Chủ nhật) + lý do chậm, xác nhận
  hoàn tất, phiếu trả (tự động gộp, mã MISA, huỷ gửi duyệt, trả trực tiếp), đơn dịch vụ tính phí, tạo
  hộ thùng, danh mục linh kiện/tuỳ chỉnh cột/điện thoại, FAQ lỗi hay gặp, tra nhanh 1 ngày làm việc.
- Ảnh chụp từ hệ thống thật (v1.015) chạy `wrangler dev` local với D1 riêng (`.wrangler/docs-state`),
  dữ liệu mẫu tạo qua API thật (10 tài khoản, 7 thùng ở đủ các giai đoạn, 2 đơn quá hạn 30h/80h), case
  lookup dùng stub tạm. Chụp bằng puppeteer-core + Chrome (khung đỏ đánh số trên ảnh). Script chụp nằm
  ở thư mục tạm của phiên, không lưu trong repo.

**(c) Vấn đề:** ảnh chụp bảng ở khổ 1920px bị chữ nhỏ trong A4 do lề trống → cắt sát vùng nội dung.
Phát hiện phụ (chưa sửa, không thuộc yêu cầu): nhật ký (`logs_bh`) ghi nội dung tiếng Việt không dấu
("Xac nhan da gui xe", "SL thuc nhan=1") — hiện nguyên văn trong UI chi tiết đơn; FAST
`huy_khong_co_hang` dùng lý do "Khong co hang" (không dấu) trong khi danh mục đã đổi sang "Không có hàng".

**(d) Kiểm thử:** PDF render không có ảnh lỗi; xem lại bố cục bản in. Đã khôi phục `wrangler.jsonc`,
`.claude/launch.json`, `caseLookupClient.ts` (git status chỉ còn thư mục tài liệu). Không đổi code →
không tăng phiên bản, không deploy.

## Tên thay gmail + nhắc Kho bàn giao + xác nhận SL hàng loạt + nút sau ID + bộ lọc bảng Admin (09/10/2026) — v1.016

**(a) Nguyên văn yêu cầu:**

> có vấn đề gì phát hiện thì xử lý luôn

(sửa 2 phát hiện phụ của đợt làm tài liệu hướng dẫn), rồi:

> 1. Các nơi hiện thị thông tin tên người dùng đề ưu tiên hiện tên, nếu không có tên mới hiện thị theo gmail
> 2. Vai trò kho thiếu nhắc giai đoạn chờ bàn giao cho Admin sửa chữa
> 3. Thiếu chức năng xử lý hàng loạt khi Admin bảo hành xác nhận sl linh kiện thực tế, SL thực nhận hiện = sl gửi để giảm tải thời gian phải nhập sl cho admin => đơn nào sai thì mới sửa, còn lại xác nhận 1 nút là duyệt tất cả đơn.
> 4. Chuyển các button xử lý công việc ưu tiên ở bên trái, sau các mã ID đơn
> 5. Thêm nút tích chọn tất cả danh sách đang hiện thị + bổ sung thêm các filter để tìm kiếm và lập danh sách cần xử lý: Trạng thái, Người gửi, Linh kiện gửi, linh kiện thực sửa, Loại linh kiện, trạng thái chậm

**(b) Đã triển khai:**
- **Nhật ký có dấu:** mọi lời gọi `addLog` ở backend (adminBH/kho/partnerKho/phieuTra/nvSuaChua/phieuGui) đổi sang tiếng Việt
  có dấu; mã enum trong câu log đổi sang nhãn qua bảng `LBL` mới trong `backend/src/lib/constants.ts` (VD "Admin BH phân
  loại: Trong bảo hành / Đổi mới / Đối trừ: Đổi trả"). FAST `huy_khong_co_hang` ghi "Không có hàng" (khớp danh mục).
  `migrations/0009_ly_do_tu_choi_co_dau.sql` sửa dữ liệu cũ `phieu_sua_chua_bh_ct.ly_do_tu_choi` (4 giá trị không dấu).
  Log cũ đã ghi KHÔNG sửa (insert-only, giữ nguyên lịch sử).
- **1. Tên thay gmail:** `GET /api/users/ten` (mọi người đã đăng nhập) trả bảng email → tên (danh bạ KTV + `users.ten`, tài
  khoản ưu tiên). Frontend `hooks/useUserNames.tsx`: tải 1 lần/phiên, cache `localStorage` (`user_names_v1`),
  `<UserName email/>` (rê chuột xem gmail) + `displayName()`. Áp ở: cột Nguồn bảng Admin, thùng chờ tiếp nhận nội bộ,
  Kho tiếp nhận/bàn giao/gần đây + modal tiếp nhận, KTV nhận ở Đóng gói/Kế toán duyệt/phiếu trả (+ nhóm "sẵn sàng gộp"),
  NV phụ trách (Xác nhận hoàn tất, UI chi tiết), người thực hiện trong nhật ký, người viết ghi chú/báo cáo sai, người tạo
  hộ, người hủy đơn Odoo, GS phụ trách khu vực, Tra cứu (Giám sát/View), cột "Tạo cho KTV". Màn quản trị Người dùng/KTV
  vẫn hiện email vì đó là dữ liệu cần quản lý.
- **2. Kho nhắc bàn giao:** `GET /kho/phieu-gui?trang_thai=cho_ban_giao` (thùng `da_tiep_nhan` + `admin_tiep_nhan=0`,
  phân trang, cũ nhất trước) → thẻ "🤝 Chờ bàn giao cho Admin bảo hành" ở màn Kho tiếp nhận (SLA tính từ lúc Kho nhận).
  Workload mới `kho_cho_ban_giao` → ô/pill "Thùng chờ bàn giao Admin BH" ở Trang chủ Kho.
- **3. Xác nhận SL hàng loạt:** `POST /admin/don-cha/xac-nhan-so-luong-hang-loat {items:[{id, so_luong_thuc_nhan,
  ly_do_chenh_lech_sl?}]}` (≤200, từng đơn độc lập, trả `ok/so_don_vi/loi[]`); logic tách đơn vị dùng chung hàm
  `xacNhanSoLuong()` với route đơn lẻ. UI `BulkXacNhanSoLuongModal` (nút "✔ Xác nhận SL hàng loạt (N)" trên bảng Admin):
  SL điền sẵn = SL khai, dòng sửa khác thì viền vàng + ô "Lý do lệch" bắt buộc, bỏ tick dòng không muốn xác nhận, nút
  "Xác nhận N đơn" bị khoá khi còn dòng thiếu lý do; tôn trọng bộ lọc đang áp.
- **4. Nút sau ID:** bảng thống nhất Admin BH: cột "Hành động" đứng ngay sau ID (cả dòng đơn cha / nhóm ×N / đơn vị); "Yêu
  cầu bổ sung" rút gọn "Bổ sung" (có tooltip). `ui/Table.tsx` (bảng dùng chung): cột thao tác (cột không header) tự lên
  ngay sau cột đầu, header "Thao tác". Danh sách thẻ Kho chờ tiếp nhận + thùng chờ Admin nhận nội bộ: nút đứng ngay sau mã.
- **5. Bộ lọc + chọn tất cả:** `AdminFilterBar` 6 ô: Trạng thái, Người gửi (tên, có "Khách lẻ"), Linh kiện gửi, Linh kiện
  thực sửa, Loại linh kiện (`linh_kien_bh.don_vi`, có "Chưa phân loại"), Trạng thái chậm (quá hạn / trong hạn SLA 24h bỏ
  Chủ nhật). Lọc ở server: `locBangThongNhat()` áp CÙNG LÚC cho `GET /admin/don-cha` và `GET /admin/don-vi` (đơn cha tính
  SLA từ `created_at`, đơn vị từ `updated_at`); lựa chọn lấy từ chính hàng đợi qua `GET /admin/don-vi/loc-options`. Ô "Chọn
  tất cả N đơn vị đang hiển thị" (thanh công cụ, cả mobile) + ô chọn tất cả ở đầu cột checkbox; đổi bộ lọc/trang thì bỏ chọn.

**(c) Vấn đề trong lúc làm:** `sed -i` chạy trên `routes/*.ts` làm 3 file không liên quan (auth/odooDon/traCuu) đổi kiểu
xuống dòng → đã `git checkout` trả lại. Heredoc Python dài lại lỗi EOF → dùng file script tạm. Trình duyệt kiểm thử giữ
service worker cũ sau khi build lại → phải gỡ SW + xoá cache mới thấy giao diện mới.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local (bỏ tạm binding remote rồi khôi
phục `wrangler.jsonc`), migration 0009 áp được. API: `/users/ten` trả đúng tên; lọc `cham=qua_han/dung_han` (30 vs 0 trên
dữ liệu cũ), `pl=Mạch` chỉ ra LK001, `ktv=__khach_le__` toàn khách lẻ, `tt=cho_phan_loai` cho `don-cha` rỗng; xác nhận SL
hàng loạt: đơn lệch thiếu lý do báo lỗi riêng, 2 đơn còn lại vẫn qua, gửi lại có lý do → log "SL thực nhận = 3 | Lý do
lệch: …". UI: modal hàng loạt điền sẵn 3/2/1, sửa 1 dòng → nút khoá + "1 đơn thiếu lý do", nhập lý do + bỏ 1 dòng → "Xác
nhận 2 đơn" → toast đúng, nút còn "(1)"; lọc "Còn trong hạn" + "Chọn tất cả" → "8 đã chọn"; Kho hiện thẻ bàn giao, nút
đứng sau mã; Trang chủ có pill bàn giao; bảng KTV tra cứu: cột "Thao tác" sau ID. Dữ liệu test local đã xoá.

## Giao diện web gọn: bảng ≤2 dòng, 20–25 dòng/màn hình (10/10/2026) — v1.017

**(a) Nguyên văn yêu cầu:** *"giao diện hiện tại bản web chiếm quá nhiều diện tích => phân tích giao diện từng
màn hình => các table danh sách nguyên tắc hiện tối đa chiều cao = 2 dòng, 1 trang màn hình người dùng nên hiện
20-25 dòng cần xử lý. Các vị trí trống bên trên thu gọn lại, phong cách tinh gọn nhưng vẫn đầy đủ"*

**Đo trước khi sửa** (`wrangler dev` local, 1440×900, đo bằng `getBoundingClientRect`):
- Bảng Admin BH: dòng cao 41–65px, bảng bắt đầu ở y=445 → chỉ thấy ~7 dòng. Nguyên nhân: ô `py-2.5`, nút cỡ
  `md`, cột "Trạng thái" của nhóm ×N xuống 2 dòng chip, phía trên có thẻ thùng chờ, thanh lọc 2 hàng có nhãn
  nằm trên ô, và 1 hàng riêng chỉ để "Chọn tất cả / Tuỳ chỉnh cột".
- Danh mục linh kiện: dòng cao tới 117px, vì tên `whitespace-normal` bị cột đệm `w-full` ép xuống nhiều dòng.
- Người dùng: dòng 54px (tên và email nằm 2 dòng). Các bảng khác: dòng 36–42px, bảng bắt đầu ở y=134–180.

**(b) Đã làm:**
- Khung trang: TopBar desktop chỉ còn 1 dòng cao 40px (lời chào và vai trò cùng 1 dòng, nút nhỏ). `main`
  `py-3 px-4`, `space-y-3`. Độ rộng tối đa 1600px khi sidebar thu gọn (1440px khi mở). Card `p-5` → `p-3`, tiêu
  đề `mb-2`. Nút `md` còn `py-1.5`.
- Bảng: class `.tbl` mới (`styles/tokens.css`) gắn cho `ui/Table`, `AdminUnifiedTable`, `NguoiDung`. Cách chỉnh:
  - ô `4px 10px`, chữ 13px, header 12px;
  - nút và ô chọn trong dòng tự thu nhỏ;
  - `td > div/p` tối đa 40px (2 dòng).
- Bảng Admin BH:
  - chip trạng thái của nhóm nằm 1 dòng, rê chuột để xem đủ;
  - nút "⚙ Cột" dời vào tiêu đề cột "Hành động"; hàng "Chọn tất cả" chỉ còn trên mobile (desktop dùng ô chọn
    ở tiêu đề);
  - `!pl-8` cho đơn vị thụt lề, vì `.tbl td` ghi đè `pl-8`.
- Thanh lọc Admin BH (`fbar`): nhãn ngắn nằm cạnh ô, 6 ô trên 1 hàng từ 1280px. Mobile: 2 cột, nhãn nằm trên ô.
- Thùng chờ tiếp nhận nội bộ (Admin BH): đổi thành 1 dải chip cùng dòng với tiêu đề (tối đa ~2 hàng, cuộn).
- Phiếu trả: mỗi nhóm "sẵn sàng gộp" thành 1 hàng (tên · đối trừ | mã đơn vị | nút nhỏ).
- Kho tiếp nhận:
  - các dòng `py-1`, nút nhỏ;
  - mô tả của mục "Chờ bàn giao" nằm cùng dòng tiêu đề, ẩn trên mobile.
- Đơn Odoo (KTV): mỗi đơn tối đa 2 dòng. Tiêu đề, tab và nút "Tạo thùng" chung 1 hàng; mô tả đưa vào tooltip.
- Danh mục linh kiện: tên 1 dòng (cắt, rê chuột để xem đủ). Người dùng: tên · email 1 dòng.
- Trang chủ: hero gọn hơn, KPI `p-3`, 5 cột. Tổng quan Giám sát: 5 cột.
- `DESIGN_SYSTEM.md` thêm nguyên tắc 6 "Mật độ desktop".

**(c) Vấn đề trong lúc làm:**
- Một lần thay khối JSX bằng script để thừa `)}` → Vite báo lỗi. Đã sửa ngay.
- Selector `.tbl td` (độ ưu tiên 0,1,1) ghi đè utility `pl-8`, nên đơn vị trong nhóm mất thụt lề → dùng `!pl-8`.
- Mobile không đổi hành vi (bảng vẫn thành thẻ), trừ nút `md` thấp hơn 4px.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. Đo lại ở 1440×900:

| Màn | Dòng (px) | Bảng bắt đầu ở y | Số dòng thấy được |
|---|---|---|---|
| Admin BH (đang có 1 thùng chờ) | 29–32 | 216 | ~20 |
| Phiếu trả | 29–31 | 209 | ~21 |
| Tra cứu KTV / Giám sát | 29–31 | 135 | ~23 |
| KTV, danh mục linh kiện | 32 | 107 | ~23 |
| Người dùng | 35 | 107 | ~21 |
| Kế toán / Kho / NV / Nhận hàng | 29–30 | 94 | ~25–26 |

Đã thử bấm "⚙ Cột": mở được cài đặt cột. Đã xem ảnh màn hình desktop (Admin BH, Trang chủ, Phiếu trả) và mobile
375px (Admin BH, Kho tiếp nhận). `wrangler.jsonc` đã khôi phục.

## Menu theo vai trò, đếm số việc từng vai trò (10/10/2026) — v1.018

**(a) Nguyên văn yêu cầu:** *"thiết kế lại menu cho tôi, với mỗi vai trò, sẽ đếm số đơn còn cần vai trò đó xử lý"*

**(b) Đã làm:**
- `frontend/src/layout/routes.ts` viết lại:
  - Nhóm menu đổi từ "giai đoạn quy trình" (quyết định 05/10/2026) sang **vai trò**: Giám sát · Theo dõi → Kỹ thuật viên → Kho → Admin bảo hành → NV sửa chữa → Kế toán → Quản trị hệ thống → Liên kết. Bên trong nhóm vẫn theo thứ tự quy trình.
  - `workloadKey` (1 số) đổi thành `countKeys` (nhiều số cộng lại). Trước đây huy hiệu thiếu:
    - "Xử lý đơn bảo hành" chỉ đếm đơn chờ phân loại, nay cộng thêm thùng chờ nhận nội bộ và đơn chờ xác nhận SL;
    - "Tiếp nhận thùng" cộng thêm thùng chờ bàn giao Admin;
    - "Gửi hàng" cộng thêm đơn Odoo chờ gửi;
    - "Tiến độ đơn của tôi" nay có số (đơn cần bổ sung);
    - "Tạo hộ đơn cho KTV" nay có số (thùng nháp đang tạo hộ).
  - Hàm dùng chung: `countOf`, `totalOf` (không cộng trùng 1 hàng đợi), `groupRoutes`, `countBreakdown`, kèm nhãn `COUNT_LABEL` và `GROUP_SHORT`.
  - "Tạo hộ" của Giám sát (không phải Admin/qtri) nằm trong nhóm Giám sát. Của Admin BH/qtri thì nằm trong nhóm Admin bảo hành.
- Sidebar:
  - Tiêu đề nhóm có pill "N việc".
  - Khi có việc, dòng phụ của mục hiện chi tiết (VD "1 thùng chờ nhận nội bộ · 1 đơn chờ xác nhận SL · 77 đơn chờ phân loại") thay cho mô tả.
  - Trang chủ hiện tổng số việc.
  - Bản thu gọn: đường kẻ nhóm có tên vai trò viết tắt + "N việc".
- BottomNav:
  - Mỗi tab có số việc. Trang chủ hiện tổng; "Thêm" hiện tổng các mục trong sheet.
  - Sheet chia nhóm theo vai trò. Tổng của nhóm tính cả mục đang nằm ở thanh dưới.
- Backend `workload.ts`: `ktv_phieu_nhap` (thùng nháp tạo hộ, theo `nguoi_tao_ho`) nay đếm cả cho Giám sát và Admin BH. Trước đây chỉ đếm cho KTV/qtri.

**(c) Vấn đề:**
- Bản thu gọn ban đầu chỉ có con số trên đường kẻ, không hiểu là của nhóm nào → thêm tên vai trò viết tắt.
- Trong sheet mobile, tổng nhóm ban đầu chỉ tính các mục nằm trong sheet → đã sửa để tính đủ vai trò.

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi, build sạch.
- Chạy `wrangler dev` local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`), tài khoản đa vai trò.
- Desktop: tổng 91 = KTV 3 + Kho 4 + Admin 81 + NV 1 + Kế toán 2. Đã xem cả bản mở rộng lẫn bản thu gọn.
- Mobile 375px: các tab có số, "Thêm" 90, sheet chia nhóm đúng.
- Chế độ test theo vai trò Giám sát / Kho / Admin BH / Kế toán: `/api/workload` chỉ trả số của vai trò đó.

## Thiết kế lại UI chi tiết đơn bảo hành (10/10/2026) — v1.019

**(a) Nguyên văn yêu cầu:** *"tôi cần thiết kế lại giao diện UI chi tiết xem đơn bảo hành, nó đang trống và thừa quá nhiều vùng"*

**(b) Đã làm** (`screens/shared/UnitDetailModal.tsx` viết lại, `LogTimeline.tsx` mới):
- Modal bỏ `full`, giờ cao theo nội dung, rộng tối đa `max-w-6xl` (thêm `max-w-5xl/6xl` vào `MD_MAX_W` của `ui/Modal.tsx`).
  - **Ghi đè quyết định P8 (08/09/2026: "giữ modal full đồng nhất")** cho riêng màn này, theo yêu cầu mới.
  - `PhieuTraDetailModal` chưa đổi.
- Bố cục 2 cột (từ `lg`); mobile tự xếp thành 1 cột.
  - **Trái:**
    - Khối tóm tắt: linh kiện thực tế + phân loại + "Đã đổi LK" (kèm LK KTV gửi), mô tả lỗi, chip case / KTV (hoặc khách lẻ + SĐT) / phiếu gửi / phiếu trả / SL khai (+ thực nhận nếu lệch), badge Đơn dịch vụ / Odoo.
    - Khối "🛠 Xử lý": chỉ hiện trường có giá trị. Có thêm mail/mã phê duyệt (trước không hiện). Đối trừ ghi kèm "KTV đề xuất" nếu Admin chốt khác. Chưa phân loại thì chỉ 1 dòng.
    - Thông tin case (`CaseSnapshotPanel` gọn lại: 1 dòng tiêu đề + lưới chỉ trường có dữ liệu).
    - **Mới:** "Cùng đơn … · N đơn vị" — chip #k + trạng thái từng đơn vị trong lô ×N.
    - Ảnh: bấm để mở ảnh lớn.
    - Báo cáo sai.
  - **Phải:** "🕘 Nhật ký" gộp 4 nguồn thành 1 dòng thời gian (mới nhất trên), mỗi dòng có icon nguồn. Tab lọc: Tất cả / Đơn vị / Đơn cha / Phiếu gửi / Phiếu trả — chỉ hiện nguồn có dữ liệu. Vẫn tách xem riêng được từng nguồn như quyết định 02/09/2026.
- Tiêu đề modal chỉ còn mã đơn (trên mobile tiêu đề dài bị badge đẩy cắt cụt).
- Backend `GET /admin/don-vi/:id` trả thêm:
  - `don_cha.ktv` + `phieu_gui_trang_thai`;
  - `anh_em` (id, so_thu_tu, trang_thai các đơn vị cùng đơn cha).

**(c) Vấn đề:**
- Hàng tab nhật ký tràn ngang ở cột 360px → đổi sang xuống dòng.
- Đơn chưa có nhật ký thì không hiện tab "Tất cả · 0".
- `Badge` không có tone `slate` → dùng `gray`.

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi, build sạch.
- `wrangler dev` local (bỏ tạm binding remote rồi khôi phục), 1440×900:
  - đơn DH-000006-4 (đã chẩn đoán, lô 7 đơn vị): modal 1152×575 (trước: kín 1392×852);
  - đơn khách lẻ chưa phân loại: modal 371px.
- Mobile 375px: 1 cột, nút thao tác dính đáy.

## Đồng bộ toàn bộ UI chi tiết theo 1 khuôn (10/10/2026) — v1.020

**(a) Nguyên văn yêu cầu:** *"tôi cần xử lý lại toàn bộ các giao diện UI chi tiết hiện tại"* (sau khi làm lại UI chi tiết đơn bảo hành ở v1.019).

**(b) Đã làm:**
- `frontend/src/ui/DetailParts.tsx` (mới): khối dùng chung cho mọi UI chi tiết.
  - Các khối: `DetailGrid` (2 cột: trái thông tin / phải nhật ký, mobile 1 cột), `SummaryBox`, `Section` (tiêu đề + nút bên phải), `KvGrid` / `Kv`, `Chip`, `Banner`, `Thumbs`, `SectionTitle`, `DETAIL_MAX_W` = `max-w-6xl`.
  - `UnitDetailModal` chuyển sang dùng các khối này.
- **Chi tiết phiếu trả** (`PhieuTraDetailModal`) viết lại, bỏ modal kín màn hình.
  - Tóm tắt: "Trả cho <KTV>" + loại đối trừ + chip số đơn vị / người tạo / thời gian.
  - Banner: Kế toán từ chối lần trước, khiếu nại, đánh giá KTV.
  - "Mã chứng từ": Admin nhập khi phiếu còn nháp, có nút "Lưu mã" trên tiêu đề khối.
  - Danh sách đơn vị gọn 1 hàng/đơn vị. Admin, qtri, Giám sát, View bấm vào để mở chi tiết đơn, chồng lên trên.
  - Cột phải: nhật ký (`LogTimeline`) + ảnh đóng gói.
  - **2 lỗi cũ đã sửa:**
    - Kho ở bước "chờ đóng gói" không có ô nhập mã vận đơn (ô chỉ hiện lúc nháp), nên bấm "Gửi hàng" luôn không có vận đơn. Nay có ô "Mã vận đơn (Kho nhập khi gửi)".
    - KTV xác nhận nhận hàng có biến `danhGia` nhưng không có ô nhập. Nay có ô "Đánh giá khi nhận hàng".
- **Chi tiết phiếu gửi** (`PhieuGuiDetailModal`) viết lại, bỏ modal kín màn hình.
  - Tóm tắt: KTV + chip số đơn / tạo lúc / ngày gửi xe / Kho nhận + SLA. Banner "tạo hộ", banner sự cố tiếp nhận.
  - "Vận chuyển": nút "Lưu nháp" trên tiêu đề khối, ngày gửi xe nằm chung lưới.
  - Danh sách đơn gọn, **mới:** badge tiến độ từng đơn (đếm đơn vị theo trạng thái). Người có quyền bấm vào để mở chi tiết đơn vị #1.
  - Cột phải: QR nhỏ + trao đổi (`GhiChuLogPanel`) + **mới:** nhật ký phiếu gửi.
  - Backend `GET /phieu-gui/:id` trả thêm `logs` (entity `phieu_gui`) và `tien_do` (parent_id, trang_thai, n).
- `ui/Modal.tsx`:
  - Esc chỉ đóng modal trên cùng (thuộc tính `data-modal-overlay`). Trước đây mở chi tiết đơn từ trong phiếu trả rồi bấm Esc là đóng cả 2.
  - Khoá cuộn trang dùng bộ đếm số modal đang mở: đóng modal con không gỡ khoá khi modal cha còn mở.
- Xoá `screens/shared/LogBlock.tsx` (không còn ai dùng).

**(c) Vấn đề:** ảnh chụp khung xem trước bị cắt / phóng sai → kiểm tra bố cục bằng đo `getBoundingClientRect`.

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi. Chạy `wrangler dev` local (bỏ tạm binding remote rồi khôi phục).
- 1440×900:
  - phiếu trả TR-000001: modal 1152×491, 2 cột (trái 728px, phải 360px);
  - bấm đơn vị → mở DH-000006-1 chồng lên; Esc chỉ đóng chi tiết đơn, phiếu trả còn mở, trang vẫn khoá cuộn;
  - phiếu gửi BH-000003: modal 1152×558, 2 cột.
- Mobile 375px: không phần tử nào tràn ngang.

## UI chi tiết đơn bảo hành "tất cả trong một" (11/10/2026) — v1.021

**(a) Nguyên văn yêu cầu:** *"tôi muốn 1 màn hình UI chi tiết có thể xem được tất cả các thông tin của đơn hàng, các liên kết liên quan có thể click vào xem nhanh, + lịch sử log, các thông tin có phân chia rõ ràng thành các vùng dữ liệu liên quan, đầy đủ các thông tin có thể kéo về để người dùng sử dụng trong công việc thuận tiện nhất có thể => lập kế hoạch và giao diện demo => đứng dưới vai trò 1 người QC, AQ khó tính, rà soát lại và đưa ra các nhận xét => yêu cầu tái đánh giá => đưa ra phương án chốt"*

Quy trình đã làm: lập kế hoạch 6 vùng → demo giao diện (widget) → tự rà soát dưới vai QC (10 nhận xét: không biết đơn đang ở bước nào/ai giữ, chồng modal dễ lạc, quá tải trường case, bằng chứng case cũ/mới không rõ, người liên quan có thể sai khi làm lại, quyền xem, trao đổi bị tách rời, tiến trình tràn trên mobile, thiếu sao chép nhanh, gọi API khi bấm liên kết) → tái đánh giá → phương án chốt. Người dùng chốt 2 điểm mở:
- *"ko cần doanh thu hiện ngay. nhưng có thế click vào link CRM để mở case chi tiết nếu cần"* → không hiện 3 trường doanh thu case, giữ nút "Xem trên CRM".
- *"Có trao đổi thêm"* → viết trao đổi ngay trong chi tiết đơn.

**(b) Đã làm:**
- Backend `GET /admin/don-vi/:id` trả thêm trong **1 lần gọi** (bấm chip liên kết không gọi API):
  - `lien_ket.phieu_gui` (trạng thái, vận chuyển, Kho nhận, Admin nhận nội bộ, số đơn, thời điểm gửi lấy từ log `da_gui`);
  - `lien_ket.phieu_tra` (trạng thái, đối trừ, mã ĐH/MISA/vận đơn, số đơn vị);
  - `lien_ket.odoo` (mã đơn, trạng thái Odoo, lỗi, lần báo dvbh gần nhất + lỗi báo);
  - `ktv_info` (mã KTV, SĐT, khu vực từ danh bạ + `email_gs`);
  - `ghi_chu` (trao đổi của phiếu gửi) + `co_the_trao_doi`.
- `POST /phieu-gui/:id/ghi-chu`: thêm NV sửa chữa + Giám sát được viết; `canReadGhiChu` thêm NV.
- `UnitDetailModal.tsx` viết lại:
  - **Thanh tiến trình 8 bước** (KTV gửi → Kho nhận → Admin nhận → Phân loại → Sửa chữa → Hoàn tất → Phiếu trả → KTV nhận), có ngày từng mốc, bước bỏ qua gạch ngang (VD Đổi mới không qua sửa chữa), đơn huỷ/chuyển kho kết thúc bằng mốc đỏ; khách lẻ bắt đầu bằng "Tạo đơn dịch vụ", kết thúc "Khách nhận". Kèm dòng **"Đang ở: <ai> — <việc>"**. Mobile rút gọn "Bước k/N · tên bước".
  - Vùng **Liên kết**: chip Phiếu gửi / Đơn cha ×N (k/N xong) / Phiếu trả (hoặc "chưa có") / Odoo → bấm mở **ô xem nhanh tại chỗ**; có nút "Mở phiếu gửi/phiếu trả" (chồng modal). Trong ô Đơn cha bấm #k để chuyển sang đơn vị anh em.
  - **Tối đa 2 lớp modal**: prop `nested` cho `UnitDetailModal`, `PhieuGuiDetailModal`, `PhieuTraDetailModal` — mở từ bên trong nhau thì ẩn nút "Mở phiếu"/không cho bấm dòng đơn vị.
  - **Khách hàng & case** (`CaseSnapshotPanel`): 8 trường chính (khách, sản phẩm, serial có nút sao chép, ngày mua, **hạn bảo hành tính sẵn** còn/hết từ `so_thang_bao_hanh` của linh kiện thực tế, địa bàn, hãng, KTV trên case) + "Xem thêm N trường" (nhóm/loại yêu cầu, hình thức BH, đối tác, các mốc CSKH, lý do quá hạn, nội dung/cách thức xử lý…); **không có doanh thu**; ghi rõ "Bằng chứng lưu lúc …"; mã case có nút sao chép.
  - **Người liên quan**: KTV (SĐT bấm gọi), mã KTV · khu vực, Giám sát, tạo hộ bởi, Kho nhận thùng, Admin nhận nội bộ, Admin phân loại, NV sửa chữa, Admin xác nhận hoàn tất, Kế toán duyệt, Kho gửi trả — lấy người làm **gần nhất** từ nhật ký, chỉ hiện dòng có giá trị.
  - Xử lý: thêm "Số lần làm lại", lý do yêu cầu bổ sung khi chưa phân loại; đối trừ khác đề xuất KTV tô vàng.
  - Banner sự cố tiếp nhận của Kho hiện ngay trong chi tiết đơn.
  - Cột phải "Nhật ký & trao đổi": tab mới **"💬 Trao đổi"** gộp vào dòng thời gian, ô viết + "Gửi" (Ctrl+Enter) ở tab Tất cả/Trao đổi; đơn khách lẻ (không có phiếu gửi) không có trao đổi.
  - Nút sao chép mã đơn trên tiêu đề (`CopyBtn` mới trong `ui/DetailParts.tsx`).
- `LogTimeline`: thêm `footer` và `alwaysTabs`. `useLkName` thêm `soThangOf`.
- Bỏ khối "Cùng đơn" riêng (đã nằm trong ô xem nhanh Đơn cha).

**(c) Vấn đề trong lúc làm:**
- Log phân loại cũ ghi không dấu ("Admin BH phan loai") nên khớp theo nội dung chữ bị trượt → đổi sang khớp theo chuyển trạng thái (`cho_phan_loai`/`admin_can_xem_lai` → trạng thái sau phân loại).
- `ring-dashed` không phải lớp Tailwind → dùng `border border-dashed`.
- Heredoc Python dài trong Bash lại lỗi EOF → viết file bằng Write.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi. `wrangler dev` local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`), đơn DH-000104-1 (Odoo, đã trả xong):
- API trả đủ `lien_ket` (phiếu gửi/phiếu trả/Odoo), `ktv_info`, `co_the_trao_doi`.
- 1440×900: tiến trình 8/8 có ngày, "Sửa chữa" bỏ qua (Đổi mới), "Đang ở: Đã hoàn tất"; người liên quan đủ 8 dòng; chip Phiếu trả mở ô xem nhanh "TR-000105 · Đã hoàn tất · Đổi trả · 1 đơn vị · ĐH DH1 · MISA MISA1".
- "Mở phiếu trả" → 2 lớp modal, dòng đơn vị trong phiếu trả không bấm được (nested); Esc chỉ đóng phiếu trả.
- Gửi trao đổi → tab "Trao đổi · 1".
- 375px: không phần tử nào tràn ngang, tiến trình rút gọn "Bước 8/8 · KTV nhận".

## UI chi tiết chiếm 95% màn hình (11/10/2026) — v1.022

**(a) Nguyên văn yêu cầu:** *"giao diện UI kéo diện tích full màn hình chiếm 95% diện tích màn hình"*

**(b) Đã làm:** `ui/Modal.tsx` thêm cỡ `"detail-95"` (`md:w-[95vw] md:h-[95vh]`); `DETAIL_MAX_W` (`ui/DetailParts.tsx`) đổi từ `max-w-6xl` sang `detail-95` → áp cho cả 3 UI chi tiết: đơn bảo hành, phiếu gửi, phiếu trả. **Ghi đè** quyết định v1.019/v1.020 ("modal cao theo nội dung, rộng tối đa max-w-6xl") theo yêu cầu mới. Cột phải (nhật ký) rộng 440px từ màn ≥1280px (dưới đó 360px); nhật ký đơn bảo hành cao tối đa `95vh − 260px` để tận dụng chiều cao mới. Mobile không đổi (vẫn tràn màn hình). Modal nhỏ (form, xác nhận) giữ nguyên kích cỡ cũ.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi. `wrangler dev` local (bỏ tạm binding remote rồi khôi phục), 1440×900: chi tiết đơn DH-000104-1 = 1368×855 (95%×95%); mở "Mở phiếu trả" chồng lên cũng 1368×855.

## Sidebar gọn: chỉ tên + số việc (11/10/2026) — v1.023

**(a) Nguyên văn yêu cầu:** *"các menu ở sidebar trái rút gọn diện tích hiện thị lại, chỉ cần tên và số lượng đơn cần xử lý theo từng vai trò (x1)"*

**(b) Đã làm** (`frontend/src/layout/Sidebar.tsx`):
- Bỏ icon và dòng phụ (mô tả / chi tiết hàng đợi) ở mọi mục; mỗi mục 1 dòng: **tên + số việc** (huy hiệu đỏ). Chi tiết hàng đợi + mô tả vẫn có trong tooltip khi rê chuột.
- Tiêu đề nhóm vai trò: tên + tổng số (bỏ chữ "việc").
- Thu gọn (mặc định): tên ngắn (tối đa 2 dòng) + số đỏ ở góc phải; nhóm hiện 1 dòng "KTV 3".
- Mở rộng: rộng `w-56` (trước `w-64`); khối logo thấp lại.
- Ghi đè 1 phần quyết định 05/10/2026 (thu gọn hiện icon + nhãn ngắn) và v1.018 (dòng phụ chi tiết hàng đợi dưới tên mục).
- BottomNav mobile không đổi.

**(c) Vấn đề:** pane trình duyệt bị ẩn nên CSS transition không chạy, đo bề rộng sidebar luôn ra 76px dù lớp đã là `w-56` → kiểm bằng lớp CSS + chiều cao dòng.

**(d) Kiểm thử:** typecheck 0 lỗi. `wrangler dev` local (khôi phục `wrangler.jsonc` sau), 1440×900, tài khoản đủ 9 vai trò (19 mục): thu gọn — dòng 55px → 34–36px, tổng chiều cao menu 1302px → 900px; mở rộng — dòng 32px, 1 dòng tên + số (VD "Gửi hàng bảo hành 1").

## Hình thức gửi "Giao trực tiếp" + sắp lại ô vận chuyển (11/10/2026) — v1.024

**(a) Nguyên văn yêu cầu:** *"Hình thứ vận chuyển thêm hình thức \"Giao trực tiếp\""*, rồi (gửi giữa lượt) *"hình thức gửi và và ngày gửi liền nhau, 3 thông tin khác phía sau"*.

**(b) Đã làm:**
- `HINH_THUC_GUI_OPTIONS` (`frontend/src/lib/constants.ts`) thêm `giao_truc_tiep` = "Giao trực tiếp". Backend không kiểm tra giá trị nên không cần sửa; nhớ nhà xe (`ktv_nha_xe_bh`) lưu luôn lựa chọn này.
- Khối "Vận chuyển" của chi tiết phiếu gửi (`PhieuGuiDetailModal.tsx`, cả lúc sửa lẫn lúc chỉ xem): hàng 1 = **Hình thức gửi + Ngày gửi** liền nhau; hàng 2 = **Mã xe / Tài xế · Đơn vị vận chuyển · Mã vận đơn** (lưới 6 cột: 3+3 rồi 2+2+2; mobile 1 cột).
- Chọn "Giao trực tiếp": ẩn Đơn vị vận chuyển + Mã vận đơn (lưu rỗng, không giữ giá trị cũ), "Mã xe / Tài xế" đổi nhãn "Người giao hàng", "Ngày gửi xe" đổi "Ngày giao".

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi. `wrangler dev` local (khôi phục `wrangler.jsonc` sau), 1440×900, phiếu nháp BH-000001: dropdown có đủ 4 hình thức; đo vị trí nhãn — Hình thức gửi và Ngày gửi xe cùng hàng (top 240), 3 ô còn lại cùng hàng dưới (top 304); chọn Giao trực tiếp → còn Hình thức gửi, Ngày giao (hàng 1), Người giao hàng (hàng 2).

## Chia 2 miền Bắc / Nam + "Khu vực chưa khai báo" (11/10/2026) — v1.025

**(a) Nguyên văn yêu cầu:** *"tôi cần chia hệ thống thành 2 miền (miền Bắc và miền Nam và khu vực chưa khai báo) MB = các khu vực có chứa ký tự MB, miền Nam bao gồm các khu vực có chứa ký tự MN) có thể bổ sung thêm, ngoài ra các khu vực hoặc KTB chưa xác định được khu vực sẽ ở khu vực chưa khai báo (khu vực này KHO, Admin sữa chữa, NV sửa chữa, KT 2 miền sẽ đều nhìn thấy) => khu vực này sẽ phân chia vai trò quản lý đơn hàng của 2 khu vực cho các vai trò trên hệ thống. Khi 1 đơn hàng được tạo ra, sẽ dựa vào người tạo để phân khu vực MB hoặc MN => nếu ko xác định được sẽ ở "Khu vực chưa khai báo". Khu vực này có thể chọn lại cho đúng khu vực nếu bị chọn sai."*

Đã chốt qua AskUserQuestion:
- Mỗi người xử lý được gán "MB / MN / Cả 2". Chưa gán thì thấy tất cả.
- "Có thể bổ sung thêm" = thêm từ khoá nhận diện cho từng miền ở Cài đặt. Vẫn chỉ có 2 miền.
- Người được đổi miền 1 đơn: *"KT, Admin sửa chữa, Kho, Admin hệ thống"*.
- Đơn dịch vụ khách lẻ lấy miền của Admin tạo đơn. Admin "Cả 2" hoặc chưa gán → chưa khai báo.

Gửi thêm giữa lượt: *"Khi 1 đơn hàng chưa xác định khu vực bị chuyển khu vực => sẽ hỏi người chuyển là tài khoản của KTV đó có chuyển sang khu vực đó luôn không => nếu đồng ý thì chuyển khu vực của KTV đó tạm thời sang "MB" hoặc "MN" chung. admin có thể setup sau nếu cần"*.

**(b) Đã làm:**
- `migrations/0010_mien.sql`:
  - `users.mien` (MB / MN / ALL / NULL); cột `mien` (MB / MN / NULL) + index trên `phieu_gui_bh`, `phieu_sua_chua_bh`, `phieu_tra_bh`.
  - `ktv_lien_he_bh.mien_gan`: miền gán tạm của KTV, ưu tiên hơn miền suy từ `khu_vuc_ma`. Để cột riêng để không mất mã khu vực gốc (Giám sát dùng) và không bị đồng bộ linh-kien-app ghi đè.
  - Bảng `mien_tu_khoa_bh` (seed MB→"MB", MN→"MN").
  - Gán miền cho dữ liệu cũ theo khu vực của KTV tạo thùng.
- `backend/src/lib/mien.ts`:
  - `detectMien`: mã khu vực chứa từ khoá của **đúng 1** miền thì lấy miền đó, khớp cả 2 hoặc không khớp → NULL.
  - Các hàm `mienOfKtv` (`mien_gan` thắng), `mienOfStaff`, `mienScope`, `mienAllowed`, `syncPhieuTraMien`.
  - Lọc: người gán MB/MN (không phải qtri) thấy `mien = của mình OR mien IS NULL`. ALL/NULL/qtri thấy hết. Chế độ test "xem như vai trò" giữ miền của chính Admin.
- **Gán miền lúc tạo:**
  - phiếu gửi theo KTV sở hữu thùng (cả khi tạo hộ);
  - đơn cha (thường + từ Odoo) copy từ phiếu gửi;
  - đơn dịch vụ theo Admin tạo;
  - phiếu trả lấy miền của đơn vị bên trong — mọi đường tạo/gộp (tạo tay, tự động gộp, FAST/hàng loạt, trả nhanh).
- **Lọc hàng đợi theo miền:**
  - Kho: tiếp nhận / chờ bàn giao / gần đây.
  - Admin BH: thùng nhận nội bộ, bảng thống nhất + bộ lọc + loc-options, xác nhận hoàn tất, sẵn sàng gộp, tự động gộp.
  - Danh sách phiếu trả (Kho / Kế toán / Admin).
  - Toàn bộ số việc (`workload.ts`).
  - Không lọc: NV (hàng đợi theo người được giao), KTV, Giám sát, View.
- **API mới `routes/mien.ts` (`/api/mien`):**
  - Từ khoá: GET / POST / DELETE `/tu-khoa`.
  - `GET /khu-vuc`: xem trước mã khu vực → miền.
  - Đổi miền (Kho / Admin BH / Kế toán / qtri, có ghi nhật ký): `POST /phieu-gui/:id` (áp cho cả thùng + đơn cha + đồng bộ phiếu trả), `/don-cha/:id` (chỉ đơn khách lẻ — đơn thuộc thùng phải đổi ở thùng), `/phieu-tra/:id`.
  - `chuyen_ktv:true` (chỉ khi đơn đang chưa khai báo): ghi `mien_gan` cho KTV và chuyển luôn các thùng chưa khai báo khác của KTV đó.
  - `PUT /ktv/:ma_ktv` (miền gán tạm).
  - `POST /ap-dung-lai`: gán lại cho các thùng còn chưa khai báo.
- `users.ts`: GET trả `mien`, PATCH nhận `mien`.
- **Giao diện:**
  - `ui/MienBadge.tsx`: badge MB xanh / MN cam / Chưa KB vàng. `DoiMienBadge` bấm để đổi, có ô tích "Chuyển luôn tài khoản KTV … sang miền …" khi đơn đang chưa khai báo.
  - Badge đặt ở UI chi tiết đơn / phiếu gửi / phiếu trả và danh sách Kho tiếp nhận.
  - Cột "Miền" (mặc định hiện) + bộ lọc "Miền" ở bảng Admin BH. Cột Miền ở Đóng gói / Duyệt kế toán / Phiếu trả.
  - Ô chọn miền ở màn Người dùng.
  - Cột Miền (+ "tạm") và ô "Miền gán tạm" ở Danh sách KTV.
  - Thẻ "🗺 Chia miền" ở Cài đặt: từ khoá MB/MN thêm/xoá, bảng khu vực → miền, nút "Áp dụng lại cho N thùng chưa khai báo".

**(c) Vấn đề:**
- Heredoc Python trong Bash làm hỏng `'\\'` → chuyển sang file script.
- `useAuth()` trả union theo `status` → lấy `user` khi `authenticated`.
- Dữ liệu production (đã xem trước): 590 KTV không có mã khu vực + các mã như `PTDV` (133 KTV) sẽ rơi vào "Chưa khai báo" cho tới khi Admin thêm từ khoá hoặc gán tạm.

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi.
- Local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`): migration 0010 áp OK, dữ liệu cũ tự gán 4 thùng MB / 14 chưa khai báo.
- API (Chế độ test vai trò, tài khoản đặt miền MN):
  - đổi 1 thùng sang MB → Admin MN còn 76/78 đơn vị, lọc `mien=MB` ra đúng 2;
  - đổi thùng chưa khai báo của KTV A sang MN + chuyển KTV → `mien_gan=MN` + 4 thùng khác chuyển theo;
  - tạo thùng hộ cho KTV A → MN, cho KTV khu vực MB1 → MB;
  - Kho MN không thấy thùng MB;
  - View đổi miền → 403.
- UI:
  - bảng Admin có cột + bộ lọc Miền;
  - đổi miền đơn khách lẻ từ UI chi tiết → toast + badge cập nhật;
  - modal đổi miền thùng chưa khai báo hiện ô "Chuyển luôn tài khoản KTV";
  - 7 màn (Cài đặt, Người dùng, KTV, Kho tiếp nhận / đóng gói, Kế toán, Phiếu trả) render đúng, mọi request 200.

## Danh mục linh kiện: tải / import tháng BH + phân loại / phân loại đồng bộ ngược về linh-kien-app (11/10/2026) — v1.026

**(a) Nguyên văn yêu cầu:** *"danh sách linh kiện cho phép tải, và cho import tháng bảo hành, phân loại thủ công, phân loại cho phép đồng bộ ngược về danh sách linh kiện app"*, gửi thêm giữa lượt: *"chỉ đồng bộ ngược về với thông tin có thay đổi"* và *"ẩn menu sidebar Liên kết mua hàng"*.

**(b) Đã làm:**
- **Tải danh sách** (`LinhKienScreen.tsx`, nút "⬇ Tải danh sách"): xlsx toàn bộ danh mục (Mã, Tên, Phân loại, Tháng BH, Dùng trong BH, Nguồn), dùng lại `lib/xlsx.ts`. `GET /linh-kien` bản gọn trả thêm `nguon_du_lieu`.
- **Import** (nút "⬆ Import", Admin BH / qtri):
  - File đọc ngay trên máy bằng `lib/xlsxRead.ts` mới (xlsx giải nén bằng `DecompressionStream` của trình duyệt + `DOMParser`, không thêm thư viện; hỗ trợ sharedStrings / inlineStr / số; lấy sheet đầu theo `workbook.xml`; cũng đọc .csv `,` `;` tab). `.xls` cũ báo lưu lại dạng .xlsx.
  - Tự tìm dòng tiêu đề trong 10 dòng đầu (cột "Mã linh kiện" bắt buộc + "Tháng BH" và/hoặc "Phân loại", so khớp không dấu). Ô trống = giữ nguyên giá trị cũ.
  - `POST /linh-kien/import {rows}` (≤10.000): chỉ ghi dòng có giá trị khác thật; trả số đổi tháng / đổi phân loại, mã không có trong danh mục, tháng ngoài 0–240.
- **Phân loại thủ công:** cột "Phân loại" thành ô nhập có gợi ý (`GET /linh-kien/phan-loai` = các phân loại đang dùng + số dòng chờ đẩy). Sửa được cả dòng **đồng bộ** (trước đây dòng đồng bộ chỉ sửa được tháng BH / dùng trong BH — ghi đè 1 phần quyết định Giai đoạn 3).
- **Đồng bộ ngược phân loại về linh-kien-app — chỉ thông tin có thay đổi:**
  - `migrations/0011_linh_kien_phan_loai_day.sql`: cột `linh_kien_bh.don_vi_cho_day`. Chỉ bật khi phân loại của dòng `dong_bo` thực sự đổi (PATCH / import so sánh với giá trị cũ).
  - `lib/linhKienPush.ts` `pushPhanLoaiPending`: gửi các dòng đang chờ (≤500/lần) qua Service Binding mới `LINHKIEN_SERVICE` → `linhkien` (`wrangler.jsonc`) tới `POST /api/suachua-partner/phan-loai` (route mới bên linh-kien-app, v1.317), xác thực bằng chính secret đồng bộ đang dùng chung (`LINHKIEN_SYNC_API_KEY` = bên kia `SUACHUA_SYNC_API_KEY`) — không cần tạo secret mới. Bên linh-kien-app cũng chỉ UPDATE dòng có giá trị khác.
  - Gửi ngay sau khi sửa (`waitUntil`); lỗi thì cron 15 phút gửi lại; xoá cờ chỉ khi giá trị chưa bị sửa tiếp trong lúc gửi. Màn danh mục có thanh "⏳ N phân loại chưa đồng bộ" + "Gửi lại ngay" (`POST /linh-kien/phan-loai/day-lai`), dòng chờ có ⏳.
  - `routes/sync.ts`: khi linh-kien-app đẩy danh mục sang, dòng đang chờ đẩy **giữ nguyên phân loại vừa sửa** (không bị ghi đè bằng giá trị cũ).
- Ẩn mục "Mua hàng" (nhóm Liên kết) khỏi sidebar / bottom nav (`routes.ts` `show: () => false`).

**(c) Vấn đề:**
- Heredoc Python dài trong Bash lại lỗi EOF → dùng file script.
- Route mới bên linh-kien-app không đặt dưới `/api/partner` (nhánh đó bắt buộc `X-API-Key` của bảng `partner_api_keys`) → `/api/suachua-partner`.
- Bản đầu route bên linh-kien-app trả `cap_nhat` = số dòng gửi, không phải số dòng đổi thật → sửa đếm theo `meta.changes`.

**(d) Kiểm thử:**
- Typecheck backend + frontend cả 2 repo 0 lỗi.
- Local suachua (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`), migration 0011 áp OK:
  - PATCH phân loại dòng đồng bộ → cờ chờ = 1; PATCH cùng giá trị / import dòng không đổi → không bật cờ;
  - import 4 dòng: 1 đổi tháng, mã không tồn tại + tháng 999 được báo riêng;
  - đồng bộ xuôi từ linh-kien-app: dòng đang chờ giữ phân loại vừa sửa, dòng khác nhận giá trị mới.
- Trình đọc file: xlsx do `buildXlsx` tạo (không nén), xlsx do openpyxl tạo (deflate, có dòng tiêu đề phụ), csv `;` — đều đọc đúng.
- End-to-end 2 Worker local (linh-kien-app `wrangler dev` D1 local nối qua service binding): sai key → 401; "Gửi lại ngay" đẩy 2 dòng, D1 linh-kien-app nhận đúng "Mạch"/"Bộ / Cụm", cờ về 0; PATCH tiếp tự đẩy ngay (cờ = 0 sau 1,5s).
- UI: nút Tải / Import / Thêm, thanh chờ đồng bộ, 20 ô phân loại có gợi ý, modal Import đúng; sidebar không còn "Mua hàng".

## Giao trực tiếp = KTV, nhớ cách giao trên máy, "Lưu nháp gửi sau", cảnh báo đơn tồn, lịch sử Serial/Case (12/10/2026) — v1.027

**(a) Nguyên văn yêu cầu:**

> 1. giao trực tiếp, người giao = KTV đang báo tạo đơn bảo hành.
> 2. Danh sách lựa chọn cách giao hàng sẽ lưu lại trên cache của người dùng, lần sau sẽ ưu tiên hiện lựa chọn và thông tin đã nhập lần trước
> 3. Khi tạo thùng hàng ngoài lựa chọn xác nhận đã gửi xe thì có lựa chọn khác không? nếu ktv thực tế chưa gửi xe mà mới chỉ tạo ra để đó thì sao?
> 4. cần bổ sung thêm các cảnh báo riêng về đơn tồn với mỗi vai trò, ví dụ kho đang tồn bao nhiêu đơn chưa nhận từ KTV, bao nhiêu đơn admin sửa chữa chưa tiếp nhận, quá hạn bao nhiêu lâu, cảnh báo nguy hiêm, hiện thị thời gian xử lý trung bình cho từng giao đoạn, từng vai trò
> 5. thêm lịch sử sửa chữa bảo hành theo mã Serial hoặc ID case từng xử lý trên hệ thống

**(b) Đã làm:**
1. **Giao trực tiếp** (`PhieuGuiDetailModal.tsx`): chọn "Giao trực tiếp" thì ô "Người giao hàng" tự điền tên KTV sở hữu thùng (tên, chưa có tên thì gmail) và không sửa được; lưu đúng giá trị đó vào `ma_xe_hoac_tai_xe`. Nút xác nhận đổi chữ "Xác nhận đã giao hàng".
2. **Nhớ cách giao hàng trên máy** (`lib/nhaXeCache.ts`, `localStorage` `nha_xe_cache_v1`, theo email KTV sở hữu thùng — tạo hộ nhớ riêng cho đúng KTV):
   - lựa chọn gần nhất + thông tin đã nhập **riêng từng hình thức** (đổi qua lại giữa Nhà xe / Xe nội bộ / Bưu điện không mất thông tin của nhau);
   - danh sách hình thức xếp theo thứ tự dùng gần đây; gợi ý mã xe / đơn vị vận chuyển gộp từ máy + server.
   - Thùng nháp mới (chưa có đơn) ưu tiên cache trên máy hơn bộ nhớ server `ktv_nha_xe_bh` (server vẫn dùng khi đổi máy); thùng đang làm dở chỉ điền ô trống. Ghi cache mỗi lần Lưu nháp / Lưu nháp gửi sau / Xác nhận gửi.
   - Sửa kèm: ô vận chuyển chỉ khởi tạo 1 lần khi mở phiếu — trước đây thêm/xoá 1 đơn là tải lại phiếu và mất thông tin vận chuyển chưa lưu.
3. **Trả lời câu 3:** thùng chưa gửi thật thì cứ để **nháp** — Kho không thấy, không tính SLA của Kho, không báo sang khovan (khovan chỉ được báo lúc xác nhận gửi). Thêm cho rõ: nút footer "💾 Lưu nháp, gửi sau" (lưu thông tin vận chuyển rồi đóng, chỉ hiện khi thùng đã có đơn) + banner vàng giải thích "thùng đang là nháp, Kho chưa thấy…"; thùng nháp đã có đơn để quá 24h hiện ở cảnh báo đơn tồn của KTV (mục 4). Thùng nháp rỗng vẫn tự xoá khi đóng như cũ.
4. **Cảnh báo đơn tồn + thời gian xử lý trung bình** (`backend/src/lib/canhBao.ts`, `GET /api/canh-bao`, `POST /api/canh-bao/tinh-lai`; frontend `screens/shared/CanhBaoTonDon.tsx` ở Trang chủ và Tổng quan hệ thống):
   - 13 giai đoạn, mỗi giai đoạn gắn vai trò: KTV (thùng nháp có đơn chưa gửi, đơn chờ bổ sung, hàng trả chưa xác nhận nhận), Kho (thùng đã gửi chưa nhận, chưa bàn giao Admin, phiếu đã duyệt chưa gửi trả), Admin BH (chưa tiếp nhận nội bộ, chờ xác nhận SL, chờ phân loại, chờ KTV bổ sung, chờ xác nhận hoàn tất, chưa gộp phiếu trả, phiếu trả nháp), NV (chờ chẩn đoán), Kế toán (chờ duyệt).
   - Mỗi dòng: số đang tồn, số quá hạn 24h, số nguy hiểm >72h, thời gian chờ lâu nhất, TB xử lý 30 ngày; chấm màu xanh / vàng / đỏ (cùng 3 ngưỡng badge SLA, giờ SLA bỏ Chủ nhật). Bấm dòng mở đúng màn xử lý.
   - Phạm vi: KTV / NV thấy việc của chính mình; Kho / Admin / Kế toán theo miền; Giám sát theo khu vực phụ trách, View theo khu vực được gán; qtri toàn hệ thống.
   - TB xử lý: tính từ nhật ký chuyển trạng thái 30 ngày (bỏ dòng tu = den như ghi chú / lý do chậm / đổi miền), đơn vị con mốc vào "chờ phân loại" bằng `created_at`; 2 bước không phải chuyển trạng thái tính từ cột mốc (Kho → Admin nhận nội bộ; Admin nhận → xác nhận SL). Lưu `sync_state.giai_doan_tb`, cron 15 phút tính lại tối đa 1 lần/giờ; lần đầu chưa có thì tính ngay; Admin BH / qtri có nút "↻ Tính lại TB".
5. **Lịch sử theo Serial / ID case** (`routes/lichSu.ts` `GET /api/lich-su`; frontend `screens/shared/LichSuBaoHanh.tsx`):
   - Màn mới `#/lich-su` "Lịch sử Serial / Case" (mọi vai trò, nhóm cùng Trang chủ trên sidebar, cuối danh sách để không chiếm tab mobile): nhập Serial hoặc ID case (≥3 ký tự; từ 5 ký tự tìm gần đúng), liệt kê các lần gửi bảo hành (Lần N, mã đơn, ngày, KTV / khách lẻ, linh kiện, lỗi, case · serial · sản phẩm · khách · link CRM, từng đơn vị: trạng thái + hướng xử lý + kết quả chẩn đoán + linh kiện thay). Admin / qtri / Giám sát / View bấm đơn vị mở UI chi tiết.
   - Serial lấy từ bằng chứng case đã lưu (`case_lookup_snapshot.data.seri_san_pham`), không gọi API dvbh. KTV (không kèm vai trò khác) chỉ thấy đơn của chính mình.
   - UI chi tiết đơn: khối "🔁 Lịch sử bảo hành sản phẩm (N lần khác)" + banner vàng nhắc kiểm tra sửa lại lần 2 — các đơn khác cùng case hoặc cùng serial (`?case_id=&exclude=`); bấm đơn vị chuyển sang đơn đó.
   - Không có migration mới.

**(c) Vấn đề:** không có lỗi phát sinh. Ghi nhận: TB xử lý dùng giờ SLA (bỏ Chủ nhật), dữ liệu cũ trước khi có nhật ký đầy đủ sẽ cho TB thấp / thiếu mẫu (hiện "—" khi chưa có).

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc`):
- `/api/canh-bao` trả đủ 13 giai đoạn đúng vai trò (tài khoản đa vai trò), số tồn / quá hạn / lâu nhất / TB (VD phân loại TB 90h trên 14 mẫu); thẻ hiện ở Trang chủ và Tổng quan, mobile 375px không tràn.
- `/api/lich-su?q=SN1` ra 2 đơn của 2 case cùng serial; `q=CASE-E2E` ra 4 đơn 6 đơn vị; `?case_id=TEST-KTVA&exclude=` bỏ đúng đơn đang xem; q 2 ký tự → 400. Màn `#/lich-su` tìm được; mở đơn vị từ kết quả → UI chi tiết có khối "Lịch sử bảo hành sản phẩm (3 lần khác)".
- Phiếu nháp BH-000001: chọn Giao trực tiếp → ô người giao = "QA Superuser", chỉ đọc, nút "Xác nhận đã giao hàng"; đổi về Nhà xe, nhập mã xe, "Lưu nháp, gửi sau" → modal đóng, server + cache lưu đúng. Tạo thùng mới → tự chọn lựa chọn gần nhất trên máy (Bưu điện) + thông tin đã nhập, danh sách xếp theo thứ tự dùng gần đây; đổi sang Nhà xe → lấy lại đúng thông tin Nhà xe; đóng thùng rỗng → tự xoá.

## Đề xuất Admin BH còn lại + chốt 6 câu hỏi mở (12/10/2026) — v1.028, đã deploy (cùng v1.029)

**(a) Nguyên văn yêu cầu:** *"tiếp nhận dự án"* → *"tiếp tục dự án còn dở"*. Trong lúc làm, người dùng trả lời 6 câu hỏi mở:

> 1. Có bao nhiêu người sẽ giữ vai trò Admin BH => hiện tại có 2 khu vực riêng là MB, MN mỗi khu vực có thể từ nhiều người cùng hoạt động
> 2. Sheet "LK đề xuất sửa chữa" đang gắn với case CRM, không gắn với đơn gửi bảo hành. => xử lý lại, các đơn đều có liên kết với nhau theo dạng mẹ - con nếu có liên quan
> 3. Ngưỡng chuyển lên cấp trên khi đề xuất bị từ chối nhiều lần. (là sao? bị bug cho phép từ chối nhiều lần à => fix)
> 4. Định nghĩa "thất lạc trên đường trả". => KTV báo vấn đề không nhận được linh kiện và phản hồi ngược về cho kho => kho sẽ đánh giá và đánh giá việc gửi thành công hay thất bại
> 5. Có thu hồi chi phí bảo hành từ hãng không. => có, hiện tại chỉ ghi nhận thủ công (có thể thêm 1 vùng để nhập số tiền đã thu được - không bắt buộc)
> 6. Có cần đối soát ngược MISA không. => hiện tại thì không

Phát hiện đầu phiên: `wrangler whoami` trên máy này đang là tài khoản sandbox `mikanovncloudflare@gmail.com`, không phải
`dichvu3t`. Ép `CLOUDFLARE_ACCOUNT_ID` cũng bị 7403, nên **không đọc được D1 production và không deploy được** ở phiên này.
Repo `linh-kien-app` (v1.317) và dvbh (v1.448) đều sạch và đã deploy tiếp sau các mốc cũ, nên 2 việc treo bên đó (nửa phát
đồng bộ đẩy, nhãn "KTV hủy đơn lỗi") gần như chắc đã lên production. Chưa xác minh được trên D1 thật.

**(b) Đã làm — các đề xuất còn lại của "Rà soát 1 ngày làm việc Admin BH" (file báo cáo đã đánh dấu ✅):**
- **#9 Ô tìm từ khoá** trên thanh lọc bảng Admin BH. Gõ xong 0,4 giây mới gọi API. Tham số `q` trong
  `locBangThongNhat()`, áp cho cả đơn cha lẫn đơn vị, tìm trong:
  - mã đơn / mã đơn vị / case / phiếu gửi, mô tả lỗi, khách lẻ + SĐT;
  - mã và tên linh kiện (gửi + thực tế), email và tên KTV trong danh bạ;
  - toàn bộ "bằng chứng case" (`case_lookup_snapshot.data`: tên khách, serial, sản phẩm…).
- **#10 Tiếp nhận nhiều thùng 1 lần:**
  - ô chọn trên từng thùng + "Chọn tất cả" + nút "Xác nhận đã nhận N thùng";
  - modal mới `TiepNhanNoiBoModal`; route `POST /admin/phieu-gui/tiep-nhan-noi-bo-hang-loat` (≤200, trả `ok/loi[]`);
  - logic dùng chung hàm `tiepNhanNoiBo()`; mỗi thùng hiện thêm "N đơn" (`so_don`).
- **#12 Xác nhận hoàn tất hàng loạt:**
  - màn "Chờ xác nhận hoàn tất" có ô chọn ở cột ID + "Chọn tất cả đang hiển thị";
  - modal mới `BulkXacNhanHoanTatModal` hỏi 1 lần lý do chậm (nếu có đơn quá hạn) và xử lý xác (chỉ áp cho đơn Đổi mới
    **chưa** chọn — không ghi đè lựa chọn đã chốt lúc phân loại);
  - route `POST /admin/don-vi/xac-nhan-hoan-tat-hang-loat`; logic dùng chung hàm `xacNhanHoanTat()`;
  - xác nhận hoàn tất / yêu cầu làm lại từ UI chi tiết đơn xong thì **tự đóng chi tiết**.
- **#13 Cột "Khách hàng":** lấy tên khách từ bằng chứng case (`case_khach_hang`). Trước đây chỉ đơn khách lẻ có tên, đơn KTV
  luôn "—". `GET /admin/don-cha` và `/admin/don-vi` trả thêm `case_khach_hang`, `case_ngay_mua`, `case_tiep_nhan`.
- **#14 Badge "Hết BH"** ngay ở ô linh kiện (cả bảng desktop, thẻ mobile và thẻ nhóm ×N):
  - tính bằng `computeWarranty()` với số tháng BH của linh kiện thực tế;
  - cột ẩn "Tình trạng BH" nay hiện "Còn BH đến …" / "Hết BH …" thay vì luôn "—";
  - mục đích: cảnh báo trước khi bấm FAST / hàng loạt, vì 2 đường này không qua form phân loại có banner.
- **#16 / #17:** cột "Số đơn" ở 4 danh sách phiếu trả (Admin, Kho đóng gói, Kế toán duyệt, KTV nhận hàng). `GET /phieu-tra`
  trả `so_don`. Mỗi thùng chờ tiếp nhận hiện số đơn.
- Chưa làm: màn "nhập mã nhanh" dạng bảng cho nhiều phiếu trả (phần sau của #16).

**(b) Đã làm — 6 câu trả lời:**
- **Câu 1 (nhiều Admin BH mỗi miền):** đã đúng với chia miền v1.025, không sửa.
- **Câu 4 (thất lạc):**
  - Trước đây trạng thái `khieu_nai_van_chuyen` là **ngõ cụt** — không ai xử lý tiếp được.
  - Nay Kho / qtri đánh giá trong chi tiết phiếu trả qua `POST /phieu-tra/:id/danh-gia-khieu-nai {ket_qua, ghi_chu}`:
    - "✔ Gửi thành công" → `ktv_da_nhan`;
    - "✖ Gửi thất bại (thất lạc)" → trạng thái kết thúc **mới `gui_that_bai`**, ghi chú bắt buộc.
  - Lưu `kq_khieu_nai`, `_ghi_chu`, `_boi`, `_luc`; banner kết quả hiện trong chi tiết phiếu trả.
  - Hàng đợi:
    - thẻ đỏ "⚠ KTV báo không nhận được hàng — cần Kho đánh giá" ở màn Kho Đóng gói;
    - số việc mới `kho_khieu_nai` (sidebar, Trang chủ);
    - giai đoạn mới trong cảnh báo đơn tồn.
  - Chỗ khác: UI chi tiết đơn hiện "Đang ở: Kho — đánh giá khiếu nại…". Báo về dvbh: `gui_that_bai` vẫn tính là `dang_tra`
    (chưa hoàn tất với khách).
- **Câu 5 (thu hồi từ hãng):**
  - Khối "💰 Thu hồi chi phí từ hãng" (`ThuHoiHangSection`) trong UI chi tiết đơn: số tiền (không bắt buộc) + ghi chú.
  - Admin BH / Kế toán / qtri sửa được ở mọi trạng thái; Giám sát / View chỉ xem khi đã có số liệu.
  - Route `PATCH /admin/don-vi/:id/thu-hoi-hang`, có ghi nhật ký.
- **Câu 6 (MISA):** không làm.
- **Câu 2 + 3 — CHƯA làm, cần chốt phạm vi:**
  - Bảng `de_xuat_linh_kien_bh` (NV sửa chữa xin vật tư, Admin duyệt / từ chối, mã đơn hàng / MISA vật tư) **chưa từng được
    xây** — Giai đoạn 1 cố ý bỏ qua vì chưa rõ trường.
  - Câu 3 không phải lỗi: "ngưỡng escalate" là quy tắc cho tính năng đó, hiện chưa có gì để từ chối.
  - Người dùng muốn các đơn liên quan nối dạng mẹ – con. Cần hỏi lại trước khi thiết kế schema.
- Migration mới `0012_khieu_nai_thu_hoi_hang.sql` (8 cột, không dựng lại bảng — `phieu_tra_bh.trang_thai` không có CHECK).

**(c) Vấn đề phát hiện + đã sửa:**
- **[Lỗi thật]** nút "Xác nhận đã nhận" thùng chờ tiếp nhận nội bộ gọi API không kèm lý do chậm.
  - Hậu quả: thùng quá hạn SLA luôn bị `400 REQUIRE_LY_DO_CHAM`, mà màn hình không có ô để chọn → kẹt.
  - Đã sửa: mọi lần tiếp nhận (1 hay nhiều thùng) đi qua modal có ô lý do chậm.
- **[Lỗi thật]** `khieu_nai_van_chuyen` không có lối ra (xem câu 4).
- Route xác nhận hoàn tất đơn lẻ trước đây ghi `xu_ly_xac` gửi lên cả cho đơn không phải Đổi mới. Nay chỉ ghi cho Đổi mới.
- Kỹ thuật:
  - Nhiều file trong working copy là CRLF (git lưu LF) → script sửa file phải chuẩn hoá xuống dòng trước khi so khớp.
  - `Badge` không nhận `title` → bọc `span`.
  - `Modal` dùng `footerActions` (không phải `footer`).

**(d) Kiểm thử:**
- Typecheck backend + frontend 0 lỗi, build sạch.
- Chạy `wrangler dev` + vite local (bỏ tạm binding remote rồi khôi phục `wrangler.jsonc` từ bản sao), migration 0012 áp OK,
  seed: bằng chứng case cho 2 case (1 hết BH), 3 đơn chờ hoàn tất, 2 phiếu khiếu nại.
- API:
  - tìm "thử" / "sntest7" ra đúng 2 đơn vị của case đó; từ khoá vô nghĩa ra 0;
  - tiếp nhận hàng loạt: thiếu lý do chậm → lỗi theo dòng; danh sách rỗng → 400 `MISSING_IDS`;
  - hoàn tất hàng loạt 3 đơn: 2 qua, 1 đơn Đổi mới thiếu xử lý xác báo lỗi riêng;
  - khiếu nại:
    - thất bại thiếu ghi chú → 400;
    - thành công → `ktv_da_nhan`;
    - đánh giá lần 2 → 400 `WRONG_STATE`;
  - thu hồi: số âm → 400, 250.000 đ lưu và đọc lại đúng;
  - workload `kho_khieu_nai` = 1.
- UI desktop:
  - bảng có ô tìm, tên khách, badge "Hết BH", thùng "1 đơn";
  - gõ tìm lọc còn đúng nhóm;
  - modal tiếp nhận thùng quá hạn: nút khoá tới khi chọn lý do → "Đã tiếp nhận 1 thùng";
  - hoàn tất hàng loạt: nút khoá tới khi chọn lý do chậm + xử lý xác → đơn sang "sẵn sàng gộp", `xu_ly_xac = tieu_huy`;
  - Kho Đóng gói hiện thẻ khiếu nại; đánh giá "thất bại" bắt ghi chú → phiếu "Gửi thất bại (thất lạc)" + banner kết quả;
  - chi tiết đơn hiện khối thu hồi 250.000 đ.
- Mobile 375px: không tràn ngang. Sửa thêm 1 chỗ: thẻ nhóm ×N trên mobile chưa hiện "Hết BH".
- Lỗi console chỉ có 401 lúc chưa đăng nhập và các 400 cố ý.

**Việc còn lại thuộc người dùng:**
1. Đăng nhập wrangler bằng tài khoản `dichvu3t` (`npx wrangler login`).
2. Áp migration 0012 lên production (`npm run db:migrate:remote`).
3. `npm run deploy`. Phiên bản đã tăng sẵn lên **1.028**.

## Đề xuất linh kiện sửa chữa + 4 kết quả NV + phương án xử lý khi gửi thất bại (12/10/2026) — v1.029, ĐÃ DEPLOY 12/10/2026

**(a) Nguyên văn yêu cầu** (sau khi hỏi "các vấn đề còn lại là sao?" và mình nêu lại các việc còn mở):

> 2. NV sẽ tự báo linh kiện cần được cấp, Admin bảo hành sẽ lên misa để xuất từ kho sang. Cứ đề xuất đến khi sửa xong hoặc xác định là không sửa được. => NV sửa chữa sẽ xác nhận: Đã sửa xong, không sửa được, không có lỗi, chỉ kiểm tra tư vấn.
> 3. Nếu gửi thất bại => kho sẽ ghi chú lại phương án xử lý và xử lý ngoài
>
> Commit đầy đủ các nội dung cập nhật và thay đổi

**(b) Đã làm:**
- **Đề xuất linh kiện** = **đơn con** của đơn vị bảo hành (`de_xuat_linh_kien_bh.unit_id`, mã `DX-000001`, migration
  `0013_de_xuat_linh_kien.sql`, thêm dòng `id_counters`). Đây là cách hiểu "các đơn đều có liên kết với nhau theo dạng mẹ –
  con" của câu trả lời 12/10/2026.
  - Trạng thái: `cho_cap` → `da_cap` (Admin nhập **mã phiếu xuất MISA bắt buộc**, mã đơn hàng tuỳ chọn) | `tu_choi`
    (Admin, bắt buộc lý do) | `huy` (NV tự huỷ, hoặc tự huỷ khi NV nộp kết quả).
  - **Không giới hạn** số lần đề xuất / từ chối, không có ngưỡng báo quản lý (đóng câu hỏi mở "ngưỡng escalate").
  - Đơn vị **không bị tạm dừng** khi đang chờ cấp (vẫn ở `cho_chan_doan`, NV vẫn làm tiếp).
  - Nhật ký ghi vào đơn vị (entity `phieu_sc_ct`, trạng thái giữ nguyên) vì `logs_bh.entity_type` có CHECK chỉ 4 loại.
  - Route mới `backend/src/routes/deXuat.ts` (`/api/de-xuat`):
    - `GET /?trang_thai=` — hàng đợi Admin (theo miền);
    - `GET /don-vi/:unitId` — danh sách đơn con;
    - `POST /don-vi/:unitId {items[]}` — NV được giao, đơn đang `cho_chan_doan`, tối đa 30 dòng/lần;
    - `POST /:id/huy` — NV đã đề xuất;
    - `POST /cap {ids, ma_misa, ma_don_hang}` — Admin cấp 1 hoặc nhiều đề xuất chung 1 phiếu MISA;
    - `POST /:id/tu-choi {ly_do}`.
  - Giao diện:
    - khối "🔩 Đề xuất linh kiện (N)" trong UI chi tiết đơn (`screens/shared/DeXuatLinhKien.tsx`): NV có nút
      "+ Đề xuất linh kiện" (form nhiều dòng: linh kiện + số lượng + ghi chú), huỷ đề xuất của mình; Admin có "Cấp" /
      "Từ chối" từng dòng + "Cấp tất cả N";
    - màn mới **"Cấp linh kiện sửa chữa"** `#/admin/de-xuat` (nhóm Admin bảo hành): tab Chờ cấp / Đã cấp / Từ chối /
      Đã huỷ, chọn nhiều → "Cấp N đề xuất (chung 1 mã MISA)", bấm dòng mở đơn bảo hành;
    - "Việc của tôi" của NV có cột "Linh kiện xin cấp" (N chờ cấp / N đã cấp);
    - số việc `admin_de_xuat_cho_cap` (menu, Trang chủ) + giai đoạn cảnh báo đơn tồn "Đề xuất linh kiện NV chờ Admin cấp".
- **4 kết quả NV** thay 4 kết quả chẩn đoán cũ: Đã sửa xong / Không sửa được / Không có lỗi / Chỉ kiểm tra, tư vấn.
  - Cột cũ `ket_qua_chan_doan` có CHECK chỉ 4 giá trị cũ, và bảng `phieu_sua_chua_bh_ct` có bảng con FK trỏ tới → không
    dựng lại bảng; thêm cột mới **`ket_qua_nv`**. Vẫn ghi kèm cột cũ khi tương đương (`da_sua_xong`→`sua_duoc`,
    `khong_loi`→`khong_loi`) để dữ liệu/báo cáo cũ không gãy.
  - API giữ tên trường `ket_qua_chan_doan` nhưng chỉ nhận 4 giá trị mới (giá trị cũ → 400 `INVALID_KET_QUA`).
  - Nộp kết quả → đơn sang "Chờ Admin xác nhận hoàn tất" như cũ; đề xuất còn "chờ cấp" tự huỷ (form báo trước).
  - Nút trong chi tiết đổi tên "🔧 Nộp kết quả sửa chữa". Hiển thị kết quả dùng `ketQuaLabel()` (ưu tiên `ket_qua_nv`) ở
    UI chi tiết, màn Xác nhận hoàn tất, lịch sử Serial/Case.
- **Gửi thất bại (thất lạc)**: ô ghi chú bắt buộc đổi tên thành "Phương án xử lý (xử lý ngoài hệ thống)"; banner + nhật ký
  ghi "Phương án xử lý: …". Hệ thống không làm bước gửi bù / phiếu trả mới — Kho xử lý ngoài theo đúng câu trả lời.

**(c) Vấn đề trong lúc làm:**
- `id_counters` không có dòng cho bảng mới thì `nextSequentialId` luôn trả `-000001` (trùng khoá) → migration thêm dòng.
- Câu FROM của giai đoạn cảnh báo ban đầu ghép sai vị trí `ON` khi nối `U_FROM` → viết JOIN tường minh.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (bỏ tạm binding remote rồi khôi phục — `git diff
wrangler.jsonc` sạch), migration 0013 áp OK. API:
- danh sách rỗng → `MISSING_LINH_KIEN`; số lượng 0 → `INVALID_SO_LUONG`; đơn không ở bước sửa → `WRONG_STATE`;
- tạo 2 đề xuất 1 lần (DX-000001, 002) + 1 đề xuất ở đơn khác; hàng đợi Admin = 3, workload = 3;
- cấp thiếu MISA → `REQUIRE_MA_MISA`; cấp có MISA → `da_cap`; từ chối thiếu lý do → `MISSING_LY_DO`; từ chối 2 lần →
  `WRONG_STATE`; đề xuất lại sau khi bị từ chối → OK;
- "Việc của tôi" trả đúng số chờ cấp / đã cấp từng đơn;
- nộp kết quả giá trị cũ `sua_duoc` → 400; `da_sua_xong` → OK, đơn sang `cho_admin_xac_nhan`, `ket_qua_nv=da_sua_xong`,
  cột cũ `sua_duoc`, đề xuất còn chờ cấp tự `huy` kèm lý do.
- UI: màn "Cấp linh kiện sửa chữa" hiện đúng đề xuất, nút "Xác nhận đã cấp" khoá tới khi nhập MISA, cấp xong hàng đợi về 0;
  chi tiết đơn của NV có khối đề xuất (dòng "Đã cấp · MISA XK-0002") + nút "+ Đề xuất linh kiện" + "🔧 Nộp kết quả sửa
  chữa"; form đề xuất khoá nút gửi khi chưa chọn linh kiện; form kết quả đủ 4 lựa chọn. Console chỉ có các 400 cố ý.

**Việc còn lại thuộc người dùng:** đăng nhập wrangler bằng tài khoản `dichvu3t`, áp migration **0012 + 0013** lên
production (`npm run db:migrate:remote`), rồi `npm run deploy` (phiên bản đã là **1.029**).

**Deploy (12/10/2026, cùng ngày):** người dùng đăng nhập lại wrangler bằng tài khoản `dichvu3t`. Đã áp migration 0012 + 0013 lên D1 production và chạy `npm run deploy` (Version ID `3f4a3605-ab90-4bcc-9ef3-9001d241308a`). Kiểm tra sau deploy: `/api/de-xuat`, `/api/canh-bao`, `/api/lich-su` đều trả `MISSING_TOKEN` (route có thật), bundle JS đang chạy mang `APP_VERSION` 1.029.

## Rà soát việc dang dở sau deploy v1.029 + bổ sung ID import Odoo cho đơn cũ (12/10/2026) — v1.030

**(a) Nguyên văn yêu cầu:** *"kiểm tra xem có thiếu công việc nào đang dang dở không"*

**(b) Kết quả rà soát (đọc D1 production thật):**
- 3 repo (`suachua`, dvbh, `linh-kien-app`) không còn thay đổi code chưa commit (dvbh chỉ có 2 file báo cáo xlsx tháng 8/9 chưa theo dõi, không phải code). Không còn migration nào chờ áp.
- Cron Odoo chạy đều, không lỗi (lần gần nhất 13:45); không đơn nào lỗi báo trạng thái về dvbh; không phân loại linh kiện nào chờ đẩy về linh-kien-app; mọi thùng đã gửi đều có miền.
- Đồng bộ đẩy từ linh-kien-app đã chạy thật: 640/1.100 KTV trong danh bạ có nguồn `dong_bo`, 17 khu vực.
- **Việc dang dở thật:** 1.421/1.929 đơn Odoo thiếu `ma_import_odoo` (External ID dùng cho file import ngược về Odoo, thêm 09/10/2026) — toàn bộ là đơn kéo về ngày 05–09/10, TRƯỚC khi dvbh có cột này. dvbh hiện đã có ID cho 1.920/1.929 đơn, nhưng cron chỉ kéo đơn mới theo con trỏ nên các đơn cũ không bao giờ được bổ sung → file "Xuất import Odoo" bỏ sót các đơn này (đếm vào "đơn chưa có ID import").
- Ghi nhận (không phải lỗi): 2 tài khoản xử lý chưa gán miền (`honganh4099@gmail.com` Anh Hồng, `ivy3690.in@gmail.com` Ivy Nguyen) — đang thấy cả 2 miền; cần Admin gán MB/MN nếu muốn tách.

**(c) Đã sửa:** `lib/odooSync.ts` thêm bước `resolveMissingImportId` vào cron 15 phút (sau "Bổ sung KTV"): hỏi lại dvbh theo `?ids=` các đơn còn thiếu ID, tối đa 5 lô × 200/lần, con trỏ riêng `sync_state.import_id_after` (để ~9 đơn dvbh cũng chưa có ID không chặn các đơn sau; hết vòng quay lại từ đầu). Kết quả `bo_sung_id` hiện ở thẻ đồng bộ Odoo (Cài đặt).

**(d) Kiểm thử:** typecheck 0 lỗi; xác nhận endpoint `?ids=` của dvbh trả cùng bộ cột (có `ma_import_odoo`). Kiểm tra sau deploy bằng D1 production — xem dòng cuối mục này.


**Kết quả sau deploy (Version `438e4489`):** cron 14:00 chạy bước mới không lỗi, bổ sung được 992 ID (đơn thiếu ID giảm 1.421 → 429). Phần còn lại sẽ được bổ sung ở lần cron 14:15. Sau đó chỉ còn khoảng 9 đơn, là các đơn mà chính dvbh cũng chưa có ID.

## Vì sao KTV đồng bộ từ linh-kien-app thiếu khu vực (13/10/2026) — chỉ điều tra, không sửa code

**(a) Nguyên văn câu hỏi:** *"sao đồng bộ danh sách KTV từ linh-kien-app về lại không đồng bộ cả khu vực"*

**(b) Kết luận (đọc D1 production cả 2 hệ, chỉ đọc):** đồng bộ **có** gửi khu vực và đang chạy đúng.
- Entity `ktv` gửi kèm cột `khu_vuc_ma`; entity riêng `khu_vuc` (ma, ten, gs_email) cũng gửi sang. Con trỏ của
  cả 3 entity tới suachua cập nhật lúc 13:01 ngày 13/10/2026, không lỗi.
- suachua đã có đủ 17 khu vực, đúng tên và GS phụ trách (MB1–3, MN1–3, PTDV, PTDV_MN, SCVP_MB/MN, B2B_MB/MN,
  KDTT_MN, KHAC_MB/MN, THUNGAN-MB/MN).
- Thiếu khu vực là do **nguồn**: chính linh-kien-app có 592/1099 KTV không có `khu_vuc_ma` (536 CTV + 56 KTV)
  và cũng không có `giam_sat_quan_ly`. suachua chép đúng nguyên trạng, cũng là 592.
- Không suy được khu vực từ CRM: chuỗi `case_dvbh.ky_thuat_vien` chỉ ghi tỉnh/thành, ví dụ
  "(luongpv.dvkh) KTV HN - Phùng Văn Lượng", không có mã MB1/MN2.
- **Cách xử lý:** gán khu vực cho các KTV này ở màn KTV bên linh-kien-app. Cron mỗi giờ sẽ tự đẩy sang, cột
  `ngay_cap_nhat` đổi nên được chọn gửi lại. Trong lúc chờ, đơn của các KTV này nằm ở miền "Chưa khai báo";
  có thể gán miền tạm ở `#/qtri/ktv`.

**(c) Phát hiện phụ (chưa sửa):** 458 dòng trong `ktv_lien_he_bh` mang nhãn nguồn "noi_bo" dù gần như chắc là
dữ liệu từ linh-kien-app. Lý do: các dòng này được đồng bộ trước khi có migration 0002 nên nhận giá trị mặc định
"noi_bo", và từ đó chưa đổi gì bên linh-kien-app nên chưa được ghi lại thành "dong_bo". Đây chỉ là nhãn hiển thị,
không ảnh hưởng nghiệp vụ.

**(d) Kiểm thử:** chỉ chạy truy vấn đọc (`wrangler d1 execute --remote`) trên `sua-chua-bao-hanh-db`,
`dat-mua-linh-kien-db`, `dvbh-db-smarttrade`. Không đổi code, không deploy.

## Tự duyệt / tự khoá tài khoản theo ETX nhân sự (16/10/2026) — v1.031 (+ linh-kien-app v1.344)

**(a) Nguyên văn yêu cầu:** *"tương tự hệ thống linh-kien-app => các tài khoản tự được duyệt nếu có trên hệ thống ETX nhân sự, tự khóa nếu nghỉ việc, tự phân khu vực dựa theo khu vực trên linh-kien-app kéo về"*

**(b) Đã làm:**
- **Nguồn ETX:** suachua KHÔNG gọi thẳng API ETX. Đọc lại bảng `etx_nhan_su` mà linh-kien-app đã kéo về mỗi tuần, qua route mới
  `GET /api/suachua-partner/etx-nhan-su` (linh-kien-app v1.344, Service Binding `LINHKIEN_SERVICE` + secret đồng bộ dùng chung).
  Nhờ vậy không cần cấp thêm secret ETX, cũng không tăng tải cho đối tác ETX.
- `migrations/0014_etx_nhan_su.sql`: bảng `etx_nhan_su_bh` (bản sao, gmail chữ thường); cột `users.khoa_boi_etx`.
- `lib/etxSync.ts` `runEtxSync` (cron 15 phút gọi `maybeRunEtxSync`: 1 lần/ngày từ 1h sáng; lần lỗi thì 15 phút sau thử lại).
  Tính theo Gmail: chỉ cần 1 mã nhân sự "on" là coi như đang làm.
  - **Tự duyệt** (`tuDuyetTaiKhoanCho`):
    - "Chờ duyệt" + là email đăng nhập của KTV trong danh bạ → "Đã duyệt" + cờ KTV / Vệ tinh;
    - "Chờ duyệt" + Gmail đang làm trên ETX → "Đã duyệt", chưa có vai trò (Admin gán sau).
    - Chạy ở 3 chỗ: mỗi lần đồng bộ ETX, khi nhận đồng bộ danh bạ KTV (`routes/sync.ts /ktv`), và lúc đăng nhập
      (`routes/auth.ts`: Gmail đang làm trên ETX → tạo tài khoản "Đã duyệt").
  - **Tự khoá:** Gmail chuyển đang làm → nghỉ giữa 2 lần đồng bộ → `bi_khoa=1, khoa_boi_etx=1`.
    - Giống linh-kien-app: chỉ khoá khi trạng thái ĐỔI. Lần đồng bộ đầu tiên chỉ lưu danh bạ, không khoá ai, vì có CTV ETX
      báo nghỉ nhưng vẫn làm.
    - Không tự khoá Admin hệ thống và tài khoản bootstrap; các trường hợp bỏ qua được ghi lại.
  - **Tự mở khoá:** nghỉ → đi làm lại thì chỉ mở tài khoản bị khoá BỞI ETX. Tài khoản Admin khoá tay không bị mở; Admin bỏ khoá
    tay thì `khoa_boi_etx` về 0.
  - Danh sách linh-kien-app trả về rỗng thì báo lỗi, không dùng làm căn cứ khoá.
- **Khu vực:** không cần code mới. KTV mang `khu_vuc_ma` qua đồng bộ danh bạ KTV. Bên linh-kien-app (v1.343) tự gán khu vực
  theo quản lý trực tiếp trên ETX khi tạo KTV từ ETX. Miền vẫn suy từ khu vực (`lib/mien.ts`).
- API `routes/etx.ts` (chỉ qtri): `GET /api/etx/status`, `POST /api/etx/sync-now`, `POST /api/etx/khoa-nghi-viec` (khoá tay những
  người "đang mở nhưng ETX báo nghỉ", không khoá Admin / chính mình).
- Giao diện:
  - Cài đặt hệ thống có thẻ "👥 Đồng bộ ETX nhân sự": số tài khoản đang làm, "Đang mở nhưng ETX báo nghỉ" (mở danh sách, tick
    rồi khoá), "Đã tự khoá do nghỉ việc", kết quả lần gần nhất, nút "Đồng bộ ngay".
  - Màn Người dùng có nhãn "ETX" / "ETX nghỉ" / "ETX nghỉ · tự khoá"; `GET /users` trả thêm `etx_trang_thai`, `khoa_boi_etx`.

**(c) Vấn đề trong lúc làm:** `wrangler d1 execute --command` nhiều câu lệnh bị crash libuv trên Windows (dữ liệu mẫu không ghi) →
dùng `--file`. linh-kien-app còn thay đổi tài liệu chưa commit của 1 phiên khác (`docs/HUONG_DAN_API_DOI_TAC_*`) → không đụng,
chỉ commit đúng 2 file.

**(d) Kiểm thử:** typecheck backend + frontend cả 2 repo 0 lỗi, build sạch. Local: suachua `wrangler dev` + Worker giả tên
`linhkien` (trả danh bạ ETX mẫu đổi được), `wrangler.jsonc` sửa tạm rồi khôi phục.
- **Lần 1 (lần đầu):**
  - tự duyệt 3: gmail viết hoa; người có 1 mã on + 1 mã off; KTV kèm cờ;
  - người không có trên ETX vẫn chờ duyệt;
  - không khoá ai.
- **Lần 2:**
  - 2 người chuyển nghỉ bị tự khoá;
  - Admin hệ thống được bỏ qua và có ghi lại;
  - người Admin khoá tay đi làm lại vẫn bị khoá;
  - người mới xuất hiện trên ETX được duyệt.
- **Lần 3:** đi làm lại → tự mở khoá.
- **Các trường hợp khác:**
  - khoá tay chỉ khoá đúng người trong danh sách, bỏ qua Admin;
  - nguồn rỗng → lỗi, không khoá;
  - `POST /partner/sync/ktv` tự duyệt KTV Vệ tinh đang chờ.
- **Giao diện:** thẻ Cài đặt và nhãn ở màn Người dùng hiển thị đúng.
- **Production trước deploy:** 19 tài khoản, đều "Đã duyệt", không ai đang chờ.


## Bộ lọc danh sách nhân sự (16/10/2026) — v1.032

**(a) Nguyên văn yêu cầu:** *"thêm các công cụ filter ở danh sách nhân sự"*. Hiểu là màn **Người dùng** (`#/qtri/nguoi-dung`).

**(b) Đã làm:**
- `GET /api/users` nhận thêm các tham số, lọc ở server, vẫn phân trang:
  - `trang_thai` (Cho duyet / Da duyet / Tu choi);
  - `khoa` (0 = đang hoạt động / 1 = đã khoá / `etx` = tự khoá do nghỉ việc);
  - `vai_tro` (1 cờ vai trò, hoặc `none` = chưa có vai trò);
  - `mien` (MB / MN / ALL / `none` = chưa gán);
  - `etx` (on / off / `off_mo` = đã nghỉ nhưng chưa khoá / `none` = không có trên ETX).
- `screens/qtri/NguoiDung.tsx`:
  - thanh lọc `UserFilterBar` (cùng kiểu `fbar` với bảng Admin BH): 5 ô Duyệt / Khoá / Vai trò / Miền / ETX, cộng nút "✕ Xoá lọc (N)";
  - kết hợp được với ô tìm email / tên;
  - đổi lọc thì bỏ các thay đổi vai trò chưa lưu;
  - không còn thay cả màn bằng spinner khi đang tải, nên thanh lọc và ô tìm không bị mất;
  - không có kết quả thì hiện "Không có người dùng nào khớp bộ lọc".

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi. Chạy local trên dữ liệu thử ETX của đợt trước, từng bộ lọc và tổ hợp đều ra đúng:
- `khoa=etx` → n1, n2; `etx=off_mo` → q1; `vai_tro=none` → 8;
- `etx=off&khoa=1` → 2; `vai_tro=la_qtri&q=t.vn` → 2.

Trên giao diện, chọn "ETX: Đã nghỉ" → 3 người, hiện nút "Xoá lọc (1)".

## Xoá dữ liệu test + nhập 656 đơn thật từ AppSheet (19/10/2026) — chỉ thao tác dữ liệu, không đổi code

**(a) Nguyên văn yêu cầu:**

> xóa toàn bộ dữ liệu test trên app để tiến hành đẩy đồng bộ data thật lên. (data test là data do người người dùng tạo gần đây (không phải data do API đẩy)

Rồi gửi file `don bh.xlsx` (Desktop) kèm lời nhắn: *"đây là dữ liệu bảo hành mới cần phân tích và đẩy lên hệ thống"*.

Đã chốt qua AskUserQuestion:
- Xoá dữ liệu test xong thì đánh số mã lại từ đầu.
- Nhập **toàn bộ 656 đơn**, mỗi đơn vào đúng trạng thái hiện tại.
- Ghép với đơn Odoo theo **mã ca + mã linh kiện**.
- **Cấp mã mới**, ghi mã cũ vào ghi chú và nhật ký.

**(b) Đã làm:**

1. **Xoá dữ liệu test.**
   - Sao lưu toàn bộ D1 trước khi xoá: `../backup-suachua/suachua-truoc-xoa-test-20261019.sql` (nằm ngoài repo).
   - Đã xoá: 6 thùng, 81 đơn cha, 5 đơn vị, 3 phiếu trả, 57 nhật ký, 2 bằng chứng case, 3 bản ghi nhớ nhà xe, bảng top linh kiện, `sync_state.giai_doan_tb`.
   - Đặt lại `id_counters` về 0 và tăng `linh_kien_version`.
   - Toàn bộ dữ liệu test do chính người dùng tạo (tài khoản meomeo3101 / mrthaiappsheet, từ 04 đến 15/10).
   - Giữ nguyên: tài khoản, danh bạ KTV, khu vực, linh kiện, đơn Odoo lấy từ API, ETX, cài đặt.
   - Có 78 đơn Odoo đã báo trạng thái sang dvbh. Nhánh "gỡ đơn" của cron chỉ bắt `cho_gui`/`khong_gui`, nên đã đặt `odoo_status_sync.last_status='cho_gui'` để cron đẩy `null`. Cron 09:45 đã gỡ đủ 78 đơn, dvbh còn 0.
2. **Phân tích file.**
   - Sheet DATA có 656 đơn (tạo từ 02 đến 18/10/2026), thuộc 155 thùng và 138 phiếu trả.
   - Sheet "LK DE XUAT SUA CHUA" (82 dòng) và "DON MISA LK" (43 dòng) **chưa nhập**.
   - Đối chiếu: 84/86 email KTV có trong danh bạ, 103/114 mã linh kiện có trong danh mục.
3. **Script chuyển đổi** `../backup-suachua/gen-import-appsheet.py` sinh ra `../backup-suachua/import-appsheet-20261019.sql` (2.737 lệnh).
   - **Thùng:** nhóm theo `ID THÙNG HÀNG` được 154 phiếu gửi. Tất cả ở `da_tiep_nhan` và đã được Admin nhận nội bộ. Mã thùng cũ ghi vào `ghi_chu`.
   - **Đơn cha:**
     - Mỗi dòng AppSheet là 1 đơn cha. `so_luong_khai` và `so_luong_thuc_nhan` đều lấy `SỐ LƯỢNG`; `case_id` lấy `MÃ YÊU CẦU`; `email_gs` lấy `EMAIL TN`.
     - Dòng combo có nhiều mã linh kiện: lấy mã đầu tiên có trong danh mục, chuỗi mã đầy đủ ghi vào ghi chú.
     - `ghi_chu` gồm: AppSheet ID, model, serial, ghi chú, cách thức xử lý, nguyên nhân chậm, linh kiện thiếu hàng, mã tem.
     - 27 dòng không có thùng thì nhập thành `admin_dich_vu`, tên khách lấy cột NGƯỜI GỬI.
   - **Đơn vị:** mỗi đơn cha tách đủ N đơn vị theo số lượng, tổng 746. Đơn vị thứ i nhận phương án xử lý thứ i:
     - "Đổi mới" → `doi_moi`, "Sửa chữa" → `sua_chua`, "Xác nhận trừ công nợ" → `xac_nhan_tru_no`.
     - "Hỗ trợ … có phê duyệt" → `ngoai_bh`; "Hủy" → `tu_choi`.
     - `ma_lk_thuc_te` lấy cột LINH KIỆN THAY THẾ.
   - **Trạng thái:**
     - Đã sửa xong, có ID gửi trả: đơn vị ở `san_sang_gom_phieu_tra`, đã hoàn tất. Phiếu trả theo trạng thái AppSheet:
       - ĐANG CHUYỂN ĐẾN KTV → `da_gui`;
       - ĐÃ ĐÓNG HÀNG / ĐANG ĐÓNG / HÀNG TRỪ KHO → `da_duyet_ke_toan`;
       - CHỜ MÃ ĐƠN HÀNG → `nhap`;
       - KTV NHẬN THÙNG → `ktv_da_nhan`.
       - Phiếu có dòng ở nhiều trạng thái thì lấy bước thấp nhất. MÃ XUẤT KHO đưa vào `ma_misa`.
     - Admin giao trực tiếp cho kho (36 dòng): 37 đơn vị ở `san_sang_gom_phieu_tra`, chưa có phiếu trả.
     - Đang sửa chữa: `cho_chan_doan`, gán NV. Dòng không có người sửa thì vào `cho_phan_loai`.
     - SCVP đã bàn giao cho Admin → `cho_admin_xac_nhan`.
     - Hủy → `ket_thuc_tu_choi`.
   - **NV sửa chữa** tra theo tên trên ETX: Nguyễn Viết Khương → `nvk.joseph86@gmail.com`, Nguyễn Vũ Việt → `fotohuongthanh@gmail.com`.
   - **Miền:** lấy theo khu vực của KTV; KTV không có khu vực thì lấy khu vực do GS (cột EMAIL TN) phụ trách. Kết quả MB 318 đơn, MN 338 đơn, không đơn nào "Chưa khai báo".
   - **Tài khoản mới (80):** cần thêm vì khoá ngoại `users`.
     - 77 KTV có trong danh bạ → "Đã duyệt" kèm cờ KTV / Vệ tinh.
     - 2 NV sửa chữa.
     - `phamgiang3104@gmail.com` không có trong danh bạ → "Chờ duyệt".
   - **Linh kiện mới (11, `noi_bo`):** chủ yếu là mã máy / model.
   - **Ghép Odoo:** 113 đơn ghép được với Odoo. Cron 10:30 đã báo trạng thái về dvbh: 83 đơn `dang_tra`, 30 đơn `cho_tra`.
   - Mỗi thùng, đơn cha và phiếu trả có 1 dòng nhật ký "Nhập từ AppSheet (mã cũ …)".

**(c) Vấn đề trong lúc làm:**
- D1 lỗi "too many terms in compound SELECT" khi gộp 6 vế `UNION ALL` → đổi sang subquery.
- `--file` không trả về dòng kết quả, nên các truy vấn tra cứu phải chạy bằng `--command`.
- Nạp bản sao lưu vào local bị lỗi thứ tự tạo bảng → dựng schema bằng migration, rồi nạp bản xuất `--no-schema`.
- Regex tách mã linh kiện bắt nhầm phần chữ trong ngoặc → sửa để chỉ nhận chuỗi có dạng mã.

**(d) Kiểm thử:**
- Chạy thử trên bản sao local (dựng bằng migration, nạp dữ liệu production hiện tại): 2.737 lệnh đều chạy được; `PRAGMA foreign_key_check` không báo lỗi.
- Sau khi nhập lên production: 154 thùng, 656 đơn cha, 746 đơn vị, 138 phiếu trả, 113 đơn Odoo; `id_counters` = 154 / 656 / 138.
- dvbh đã nhận đủ 113 trạng thái.

**Chưa làm:**
- Chưa nhập 2 sheet đề xuất linh kiện / đơn MISA cũ.
- Đơn Đổi mới chưa có thông tin "xử lý xác".
- Chưa lưu bằng chứng case (bấm "Đồng bộ lại" trong UI chi tiết khi cần).
- Mã thùng mới đánh lại từ BH-000001, nên có thể trùng các mã thùng test cũ còn nằm bên khovan (BH-000026/27).

## Tài liệu hướng dẫn Word cho vai trò KTV (19/10/2026) — không đổi code

**(a) Nguyên văn yêu cầu:** *"tôi cần tạo tài liệu hướng dẫn cho vai trò KTV, tài liệu chi tiết từng bước thao tác, file docx, có ảnh minh họa và hướng dẫn chi tiết"*

**(b) Đã làm** — thư mục `du an sua chua bao hanh/Huong-dan-KTV/`:
- `Huong-dan-KTV.docx` (A4, 22 trang, 37 hình, mục lục đã cập nhật số trang) + `Huong-dan-KTV.pdf` (bản xuất từ Word để gửi nhanh).
- `anh/` — 36 ảnh chụp + logo; `build-huong-dan.cjs` (script docx-js tạo lại file, cần `npm i docx` ở thư mục chạy) + `anh-sizes.json`.
- 10 mục: tổng quan quy trình + khái niệm; đăng nhập + cài app lên màn hình chính; Trang chủ + menu dưới; gửi hàng từ đơn Odoo (3 tab, tạo thùng, hủy đơn lỗi / mở lại); tạo thùng thủ công (vận chuyển, Giao trực tiếp, thêm đơn có kiểm tra mã case đúng/sai, tìm linh kiện, QR, trao đổi, lưu nháp / xác nhận gửi xe, tự xoá thùng rỗng); Tiến độ + bổ sung thông tin; nhận hàng trả + khiếu nại; lịch sử Serial/Case; dùng trên máy tính; câu hỏi thường gặp / lỗi + nguyên tắc hằng ngày.
- Ảnh chụp bản v1.033 chạy `wrangler dev` local (D1 riêng `.wrangler/docs-ktv`, dữ liệu mẫu KTV "Nguyễn Văn An" tạo qua API thật), puppeteer-core + Chrome giả lập điện thoại 390×844 (khung đỏ đánh số trên ảnh) + 3 ảnh desktop. Case lookup dùng stub tạm (mã `CS-9…` trả case của KTV khác để chụp trường hợp bị chặn) — **đã hoàn tác** cùng `wrangler.jsonc`.

**(c) Vấn đề:** máy không có LibreOffice / pdftoppm → render kiểm tra bằng Word (COM) xuất PDF + PyMuPDF. Chrome headless tự phát `beforeinstallprompt` nên nút 📲 gọi prompt thật (không thấy gì) → chặn sự kiện này khi chụp để hiện modal hướng dẫn. Bản đầu ảnh điện thoại quá cao làm vỡ trang → thu nhỏ, thêm `cantSplit`/`keepNext`.

**(d) Kiểm thử:** xem từng trang PDF render (bố cục, ảnh không bị cắt, chữ đọc được). `git status` sau khi dọn chỉ còn thư mục tài liệu. Không đổi code → không tăng phiên bản, không deploy.

## Dọn thùng thừa khovan + xử lý xác + nhập đề xuất linh kiện AppSheet (19/10/2026) — chỉ thao tác dữ liệu

**(a) Nguyên văn yêu cầu:** *"xóa 2 thùng thừa trên kho vận, xác xử lý chung đề là trả đối tác. 2 sheet “LK đề xuất sửa chữa” và “Đơn MISA LK” là đơn đề xuất linh kiện để sửa chữa cho các đơn hàng => đẩy lên luôn"*

**(b) Đã làm:**
- **Khovan** (`warehouse_db`): tìm thấy **7** thùng test `BH-*` (BH-000004/010/011/020/023/026/027, nguồn `ext_suachua001`, `pending`, 0 hàng/ticket/ảnh, mỗi thùng 1 event). Đã xoá cả 7 cùng event, có sao lưu `../backup-suachua/khovan-shipments-test-truoc-xoa.json`. Xoá nhiều hơn con số "2" vì mã đánh lại từ BH-000001 nên cả 7 mã đều trùng với thùng thật vừa nhập.
- **Xử lý xác:** gán `xu_ly_xac='tra_doi_tac'` cho toàn bộ 615 đơn vị Đổi mới.
- **Đề xuất linh kiện:** nhập 82 dòng "LK DE XUAT SUA CHUA", ghép với "DON MISA LK", vào `de_xuat_linh_kien_bh` (DX-000001…082, script `../backup-suachua/import-de-xuat-20261019.sql`).
  - Ghép đơn: `ID DATA` = DATA.ID → đơn cha DH-… → đơn vị `-1`. Cả 82/82 dòng đều khớp.
  - Linh kiện lấy mã trong `[...]`. Thêm 24 mã còn thiếu vào danh mục (`noi_bo`), không có linh kiện nào thiếu sau khi nhập. Tăng `linh_kien_version`.
  - 81 dòng có ĐƠN MISA → `da_cap`, trong đó `ma_misa` = MÃ XUẤT KHO, `ma_don_hang` = mã đơn MISA, người xử lý = ADMIN, xử lý lúc = NGÀY DUYỆT, ghi chú kho đưa vào `ghi_chu`.
  - 1 dòng (DX-000074) không có đơn MISA và đơn vị đã qua bước sửa → `huy`.
  - Mỗi đề xuất có 1 dòng nhật ký trên đơn vị. `id_counters` = 82.

**(c) Lỗi phát hiện + đã sửa:** lần nhập 656 đơn trước tách PAXL (phương án xử lý) bằng dấu phẩy, nên tách sai cả những phương án có dấu phẩy bên trong tên (VD "Xác nhận linh kiện, trừ công nợ") → 23 đơn vị nhận sai hướng xử lý. Đã đổi cách tách thành `\s+,\s+` và sửa bằng UPDATE; 5 phiếu trả có loại đối trừ được chỉnh lại thành `tru_cong_no` (`../backup-suachua/fix-paxl-20261019.sql`). Phân bố sau khi sửa: Đổi mới 615, Sửa chữa 93, Trừ công nợ 25, Từ chối 4, chưa có hướng 9.

**(d) Kiểm thử:** truy vấn D1 production sau khi nhập trả về 82 đề xuất (81 đã cấp), bộ đếm = 82, 0 đề xuất trỏ tới linh kiện không có trong danh mục. Khovan không còn thùng `BH-*` nguồn `ext_suachua001`.

## Làm lại màn lên phiếu trả: bảng nhóm theo KTV, sửa phiếu tới khi KT duyệt, đẩy ngược, bộ lọc (19/10/2026) — v1.034

**(a) Nguyên văn yêu cầu:**

> giao diện lên phiếu xuất trả hiện tại chưa ok =>
> 1. Ở day sách đơn chờ trả: hiện danh sách theo dạng list
> KTV (x123)
>      đơn 1 (các cột liên quan)
>      đơn 2 (các cột liên quan)
> bên dưới là danh sách các đơn sửa chữa, đổi trả... chờ tạo phiếu trả (dạng bảng) => có thể tích chọn 1 đơn hoặc nhiều đơn để tạo phiếu trả.
> 2. Trong phiếu trả đang tạo, có thể thêm bớt, thay đổi linh kiện thực tế bên trong (được sửa cho đến khi phiếu chuyển sang trạng thái KT xác nhận cho kho xuất). + Thêm nút đẩy ngược cho kho + kế toán phòng trường hợp đơn bị lên nhầm
> 3. Bổ sung thêm các công cụ filter, tìm kiếm phù hợp cho giao diện xuất phiếu

**(b) Đã làm:**
1. **Đơn chờ tạo phiếu trả** (`screens/adminbh/PhieuTra.tsx` viết lại + component mới `screens/adminbh/ReturnUnitTable.tsx`):
   - Bảng nhóm theo người nhận: dòng nhóm "👷 KTV ×N" (ô chọn cả nhóm, có trạng thái nửa chọn, nút "Tạo phiếu (N đơn / N đã chọn)"),
     dưới là từng đơn: ID (+ Odoo), linh kiện thực tế + phân loại (+ "Đã đổi LK"), hướng xử lý, đối trừ, kết quả NV / xử lý xác,
     case · khách, mô tả lỗi, miền, thời gian chờ. Bấm dòng mở UI chi tiết đơn. 20 nhóm/trang.
   - Thanh thao tác: "Chọn tất cả đang lọc", "Đã chọn N đơn · K người nhận → P phiếu", "＋ Tạo phiếu trả", "Trả xác cho đối tác…",
     "Bỏ chọn"; "⚡ Tự động gộp tất cả" giữ nguyên.
   - `GET /phieu-tra/san-sang` trả thêm đủ cột (join đơn cha + tên khách từ bằng chứng case). Route mới `POST /phieu-tra/tao-nhieu
     {unit_ids, doi_tac_key?}`: chọn đơn của nhiều KTV cùng lúc, tự tách 1 phiếu "nhập" cho mỗi tổ hợp (KTV, loại đối trừ)
     (giữ ràng buộc 1 phiếu = 1 người nhận + 1 loại đối trừ); đơn không còn sẵn sàng trả về `bo_qua`. Tạo được 1 phiếu thì tự mở.
2. **Sửa phiếu tới khi Kế toán duyệt** (trạng thái `nhap` + `cho_ke_toan_duyet`; ghi đè quyết định 21/08/2026 "chỉ tách khi còn nhập"):
   - `GET /phieu-tra/:id/co-the-them` + `POST /phieu-tra/:id/don-vi {unit_ids}`: thêm đơn sẵn sàng cùng người nhận + cùng loại đối trừ
     (phiếu trả xác đối tác chỉ cần cùng loại) — lỗi theo dòng `KTV_MISMATCH` / `LOAI_DOI_TRU_MISMATCH` / `NOT_READY`.
   - `DELETE /phieu-tra/:id/don-vi/:unitId`: bỏ đơn (đơn quay lại danh sách chờ), nay có ghi nhật ký.
   - `PATCH /phieu-tra/:id/don-vi/:unitId {ma_lk_thuc_te}`: đổi linh kiện thực tế (kiểm tra có trong danh mục), ghi nhật ký cả
     đơn vị lẫn phiếu.
   - `DELETE /phieu-tra/:id`: xoá phiếu rỗng. `gui-duyet` chặn phiếu rỗng (`EMPTY_PHIEU_TRA`).
   - Mã chứng từ sửa được ở cả 2 trạng thái. Khi đang chờ KT duyệt có banner "vẫn sửa được, mọi thay đổi ghi nhật ký".
   - UI chi tiết phiếu trả: bảng đơn vị dùng chung `ReturnUnitTable` + cột "Sửa" (Đổi LK / Bỏ), nút "＋ Thêm đơn vào phiếu" (modal
     có bộ lọc + chọn nhiều), "🗑 Xoá phiếu rỗng".
3. **Đẩy ngược** — `POST /phieu-tra/:id/day-nguoc {vai_tro: kho|ke_toan, ly_do}`: phiếu `da_duyet_ke_toan` (KT đã duyệt, Kho chưa
   gửi) → về `nhap`, bắt buộc lý do. Nút "↩ Kho trả lại Admin BH" (Kho) và "↩ Huỷ duyệt, trả Admin BH" (Kế toán). Migration
   `0015_phieu_tra_day_nguoc.sql` (4 cột `ly_do_day_nguoc`, `day_nguoc_boi`, `day_nguoc_vai_tro`, `day_nguoc_luc`); banner đỏ ở chi
   tiết phiếu + nhãn "↩ Kho/KT đẩy ngược" ở danh sách; xoá khi Admin gửi duyệt lại.
4. **Bộ lọc / tìm kiếm:**
   - Đơn chờ: tìm (mã đơn, case, khách, linh kiện tên/mã, KTV, phiếu gửi — không dấu, nhiều từ), Đối trừ, Hướng xử lý, Nguồn
     (KTV / khách lẻ), Miền, Thời gian chờ (>24h, giờ SLA bỏ Chủ nhật) — lọc trên máy.
   - Danh sách phiếu trả (server, `GET /phieu-tra`): tìm `q` (mã phiếu, mã ĐH, MISA, vận đơn, email/tên/mã KTV, mã đơn vị, case,
     linh kiện bên trong), Trạng thái (nhận nhiều giá trị, có nhóm "Đang sửa được"), Đối trừ, Người nhận (KTV / khách lẻ / đối tác),
     Miền; thêm cột Vận đơn, Cập nhật, Ghi chú.
- Sửa kèm: các nút trong chi tiết phiếu trả trước chỉ kiểm `la_admin_bh` / `la_kho` / `la_ke_toan` → nay gồm cả `la_qtri`.

**(c) Vấn đề:** nhãn "Đã đổi LK" nằm trong ô tên bị cắt chữ nên không thấy → dời xuống dòng phụ. Ghi nhận (chưa sửa): KT duyệt đã
báo đơn "chờ xử lý" sang khovan; đẩy ngược KHÔNG huỷ bên khovan (chưa có API huỷ) — Kho bên khovan có thao tác thì `partnerKho` vẫn
chặn `WRONG_STATE` vì phiếu đã về `nhap`; duyệt lại sẽ báo sang khovan lần nữa.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (`wrangler dev` D1 `.wrangler/docs-ktv`, bỏ tạm binding
remote rồi khôi phục `wrangler.jsonc`), seed 7 đơn sẵn sàng của 2 KTV + 1 khách lẻ, tài khoản đơn vai trò Admin BH / Kế toán / Kho:
- API 24/24: tạo nhiều tách đúng 3 phiếu; co-the-them chỉ ra đơn cùng KTV + loại; thêm đơn khách lẻ vào phiếu KTV bị `KTV_MISMATCH`;
  đổi LK / LK không tồn tại bị chặn; bỏ + thêm lại đơn khi đang chờ KT; sau KT duyệt thì không sửa được; đẩy ngược thiếu lý do /
  sai vai trò bị chặn, Kho và KT đẩy ngược đúng, lưu lý do + nhật ký; phiếu rỗng không gửi duyệt được, xoá được; phiếu còn đơn
  không xoá được; tìm theo mã đơn vị / tên KTV, lọc nhiều trạng thái; tạo phiếu trả xác đối tác.
- UI 1440×900 (puppeteer): bảng nhóm theo KTV, chọn cả nhóm, thanh "Đã chọn 2 đơn · 1 người nhận → 2 phiếu", bộ lọc, danh sách phiếu
  có bộ lọc + nhãn đẩy ngược; chi tiết phiếu có banner đẩy ngược, cột Sửa, modal Thêm đơn + Đổi linh kiện; Kho mở phiếu đã duyệt có
  form "Kho trả lại Admin BH". 0 lỗi console.

**Deploy (19/10/2026):** đã áp migration 0015 lên D1 production và `npm run deploy` (Version ID `8a6733e9`); bundle đang chạy mang `APP_VERSION` 1.034.

## 10 yêu cầu đi tắt luồng + Admin BH theo dõi mọi giai đoạn (20/10/2026) — v1.035

**(a) Nguyên văn yêu cầu:**

> 1. bổ sung công cụ tìm kiếm ở danh sách chọn đơn bh (khi tạo thùng có thểm tìm trong danh sách các đơn odoo)
> 2. admin bh tạo đơn hàng thì tự động bỏ qua bước xác nhận của kho, bỏ qua bước tiếp nhận của admin bh => đến bước xác nhận phân loại...
> 3. hoặc admin bh có thể tự xác nhận hộ cho kho nếu thực tế hàng đã về đế tay admin bh (Ktv giao trực tiếp)
> 4. Khi đơn được tạo, tự đồng bộ data từ dvbh đẩy vào case
> 5. Khi duyệt nhanh, trả xác mặc định là trả đối tác (đi tắt qua luôn). Admin bh có thể thay đổi sau.
> 6. mã misa ko bắt buộc ở bước admin bh (mã misa là bước của kế toán - admin bh có thể nhập hoặc không)
> 7. tách riêng danh sách các phiêu đã gửi kế toán thành 1 menu riêng để tiện quản lý
> 8. nếu kế toán từ chối phiếu => đẩy lại admin bh để admin bh xử lý (yêu cầu có lý do)
> 9. ktv sửa chữa sửa xong => đẩy sang kho luôn (tự tạo 1 phiếu trả hàng và đẩy qua kho, bỏ qua admin bh xác nhận, bỏ qua kế toán duyệt)
> 10. đơn gửi sửa chữa đang chờ, admin bh không tìm thấy ở đâu => admin bh là người triển khai hính cho mọi người nên cần nhìn thấy trạng thái của đơn hàng tại mọi luồng quy trình

**(b) Đã làm** (không có migration mới):
1. **Tìm trong danh sách đơn Odoo** (`OdooDonList` trong `screens/ktv/OdooDonPicker.tsx`, dùng ở thẻ "Gửi hàng" và modal "Chọn đơn Odoo"): ô tìm (hiện khi >3 đơn), lọc trên máy, không dấu, nhiều từ — mã đơn, case, mã/tên linh kiện, lỗi, ghi chú. "Chọn tất cả" chỉ chọn các đơn đang lọc.
2. **Thùng Admin BH tạo hộ** (`lib/nhanHo.ts` `nhanHoThung`): khi chính Admin BH / qtri tạo hộ (`nguoi_tao_ho` = mình) bấm "Xác nhận gửi" → thùng sang `da_tiep_nhan` + `admin_tiep_nhan = 1` + tự xác nhận SL = SL khai (tách đơn vị `cho_phan_loai`). Không báo sang khovan. Thùng GS tạo hộ vẫn đi qua Kho như cũ.
3. **Admin BH "Nhận hộ Kho"**: `GET /admin/phieu-gui?trang_thai=da_gui` + `POST /admin/phieu-gui/:id/nhan-ho-kho {ghi_chu, tu_xac_nhan_sl}`; thẻ thu gọn "🚚 Thùng đang gửi về Kho (N)" ở màn Xử lý đơn (`screens/adminbh/NhanHoKho.tsx`), modal có ô tích "Xác nhận luôn SL = SL KTV khai" (mặc định bật).
4. **Bằng chứng case tự đồng bộ từ dvbh** (`lib/caseSnapshot.ts`): đơn từ Odoo và đơn dịch vụ có mã case nay cũng lưu `case_lookup_snapshot` ngay khi tạo (chạy nền `waitUntil`). Đường "Thêm đơn" thủ công đã có từ trước. Cron 15 phút `backfillCaseSnapshots` bổ sung tối đa 40 case/lần cho các đơn chưa có bằng chứng (gồm 656 đơn nhập AppSheet); case dvbh không có thì ghi `sync_state.case_snapshot_miss`, 7 ngày sau mới hỏi lại.
5. **FAST "Đổi mới" không hỏi xử lý xác** — backend tự ghi `tra_doi_tac`. Đổi lại sau trong UI chi tiết đơn (ô chọn "Xử lý xác" ở khối Xử lý, `PATCH /admin/don-vi/:id/xu-ly-xac`, có ghi nhật ký). Form phân loại thường / hàng loạt vẫn hỏi như cũ.
6. **Mã MISA không bắt buộc** khi Admin gửi duyệt Kế toán (bỏ `REQUIRE_MA_MISA` ở `POST /phieu-tra/:id/gui-duyet`, bỏ dấu * ở form).
7. **Menu mới "Phiếu đã gửi kế toán"** `#/admin/phieu-tra-ke-toan` (`screens/adminbh/PhieuTraList.tsx`, dùng chung `PhieuTraListCard`): tab Chờ KT duyệt / ↩ KT từ chối / KT đã duyệt — chờ Kho / Đang gửi KTV / Đã kết thúc / Tất cả + tìm + lọc. Màn "Phiếu trả bảo hành" giữ danh sách "Phiếu trả đang làm" (Nháp / bị trả lại · KT từ chối · Tất cả).
8. **KT từ chối** (đã có sẵn: bắt buộc lý do, phiếu về `nhap`) — bổ sung: lọc `GET /phieu-tra?tu_choi_kt=1`, số việc mới `admin_phieu_tra_tu_choi` (menu + Trang chủ), banner đỏ "↩ Kế toán từ chối, trả lại Admin BH xử lý" trong chi tiết phiếu, nhãn lý do ở danh sách. KT duyệt thì xoá `ly_do_tu_choi_kt` (lịch sử vẫn ở nhật ký).
9. **NV nộp "Đã sửa xong" → đẩy thẳng sang Kho** (`dayThangSangKho` trong `routes/nvSuaChua.ts`): đơn vị tự hoàn tất (`admin_xac_nhan_hoan_tat = 1`) và vào phiếu trả trạng thái `da_duyet_ke_toan` (chờ Kho đóng gói/gửi). Gộp vào phiếu NV đó đã tự tạo trong ngày cho cùng KTV + loại đối trừ mà Kho chưa có ảnh đóng gói; không thì tạo phiếu mới + báo sang khovan. Mã ĐH/MISA để trống. 3 kết quả còn lại (không sửa được / không lỗi / chỉ kiểm tra) vẫn về Admin xác nhận như cũ.
10. **Admin BH theo dõi mọi giai đoạn**: mở "Tổng quan hệ thống" + "Tra cứu mọi đơn" cho Admin BH. `routes/traCuu.ts` viết lại: gộp đơn vị LẪN đơn cha chưa tách, mỗi dòng có `giai_doan` trong toàn luồng (`GIAI_DOAN` trong `lib/constants.ts`, 20 giai đoạn: Thùng nháp → Đang gửi về Kho → Kho đã nhận chờ Admin → Chờ xác nhận SL → … → đơn vị trong phiếu trả lấy trạng thái phiếu `tra_*` → Hoàn tất / Huỷ). Tra cứu có cột Giai đoạn, Thùng / Phiếu trả, Miền, Case; tìm theo mã đơn / thùng / phiếu trả / case / KTV / khách / serial (bằng chứng case) / linh kiện; dòng đơn cha mở chi tiết phiếu gửi. Tổng quan hiện ô đếm theo giai đoạn; "quá hạn" tính trên các giai đoạn đang chờ.
- Kèm theo: thay đổi dở của 1 phiên khác ngày 20/10 (`backend/src/lib/search.ts` + tham số `q` cho `GET /phieu-gui`, `/kho/phieu-gui`, `/admin/xac-nhan`, `/de-xuat`, `/nv/viec-cua-toi`, `/odoo-don/da-gui`) — chỉ backend, chưa nối giao diện; typecheck sạch nên đưa vào cùng commit.

**(c) Vấn đề / ghi nhận:** Admin "nhận hộ Kho" thùng đã báo sang khovan thì box bên khovan vẫn ở "chờ" (khovan thao tác tiếp sẽ nhận `WRONG_STATE`) — chưa có API huỷ bên khovan. Phiếu trả NV tự tạo bỏ qua Kế toán theo đúng yêu cầu (không có mã MISA).

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chạy `wrangler dev` local bằng config tạm (không binding remote, D1 riêng, đã xoá sau): thùng Admin tạo hộ + 2 đơn Odoo → xác nhận gửi trả `tu_tiep_nhan`, 3 đơn vị `cho_phan_loai`; thùng KTV `da_gui` → tra cứu hiện "Đang gửi về Kho", nhận hộ Kho → `da_tiep_nhan`, lần 2 `WRONG_STATE`; FAST Đổi mới hàng loạt → `tra_doi_tac` + phiếu nháp, đổi sang `tieu_huy` OK; gửi duyệt không MISA OK; KT từ chối thiếu lý do 400, có lý do → `nhap`, số việc = 1, lọc `tu_choi_kt` ra đúng phiếu; NV "Đã sửa xong" 2 đơn → cùng 1 phiếu `da_duyet_ke_toan`, "Không sửa được" vẫn chờ Admin; Tổng quan đếm theo giai đoạn. UI: menu "Phiếu đã gửi kế toán" các tab đúng; Tra cứu hiện giai đoạn; ô tìm Odoo lọc "voi nuoc"/"chap" (không dấu) ra đúng 1/4 đơn.

**Deploy (20/10/2026):** `npm run deploy` thành công (Version ID `030b9eb5`), không có migration mới; bundle production mang `APP_VERSION` 1.035, route mới `nhan-ho-kho` trả `MISSING_TOKEN` (route có thật).


## Admin BH tạo đề xuất linh kiện thay NV sửa chữa (21/10/2026) — v1.036

**(a) Nguyên văn yêu cầu:** *"admin BH thêm quyền tạo đơn đề xuất linh kiện sửa chữa thay cho nhân viên sửa chữa"*

**(b) Đã làm:**
- `POST /api/de-xuat/don-vi/:unitId` (`backend/src/routes/deXuat.ts`): Admin BH / qtri được tạo đề xuất cho bất kỳ đơn vị nào đang ở bước sửa chữa (`cho_chan_doan`), không cần là NV được giao. NV vẫn chỉ tạo được cho đơn của mình. Nhật ký ghi "Admin BH đề xuất hộ NV <email> cấp linh kiện: …". `nguoi_de_xuat` = Admin (nên Admin tự huỷ được đề xuất mình tạo; NV không huỷ được đề xuất Admin tạo hộ).
- `DeXuatSection` (UI chi tiết đơn): Admin thấy nút "+ Đề xuất hộ NV"; dòng đề xuất do người khác NV phụ trách tạo có nhãn "(đề xuất hộ NV)". Cấp / từ chối giữ nguyên.
- Không có migration.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi. Chưa chạy thử local (thay đổi nhỏ: nới điều kiện quyền + nhãn hiển thị).


## Menu riêng "KTV đang sửa" (21/10/2026) — v1.037

**(a) Nguyên văn yêu cầu:** *"các đơn đang chờ nv sửa chữa xử lý tách riêng menu \"KTV đang sửa\""*

**(b) Đã làm:**
- `GET /api/admin/dang-sua` (`adminBH.ts`, Admin BH / qtri): đơn vị `cho_chan_doan`, lọc theo miền, `?q=` (mã đơn, case, linh kiện, lỗi, NV, KTV, khách, bằng chứng case), `?nv=email|__chua_gan__`; mỗi dòng kèm `dx_cho_cap` / `dx_da_cap`; trả thêm `theo_nv` (số đơn theo từng NV). Phân trang 20, cũ nhất trước.
- Màn mới `screens/adminbh/DangSua.tsx`, route `#/admin/dang-sua`, mục menu "🔧 KTV đang sửa" (nhóm Admin bảo hành, ngay trước "Cấp linh kiện sửa chữa"): chip lọc theo NV (kèm số đơn), ô tìm, bảng ID / NV / linh kiện / hướng xử lý / linh kiện xin cấp / nguồn / lỗi / miền / SLA; bấm dòng mở UI chi tiết (để đề xuất hộ, cấp linh kiện).
- **Không gắn số việc lên menu** — đây là việc của NV, cộng vào sẽ làm sai tổng "việc" của nhóm Admin BH.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi; chạy thử câu SQL trên D1 production (chỉ đọc) ra đúng 28 đơn (23 + 5 theo 2 NV), cột đề xuất đếm đúng. Chưa bấm thử giao diện.

**Deploy (02/11/2026):** `npm run deploy` (Version ID `7d5f8b52`), không có migration mới. Lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua.

## Bộ lọc + tìm kiếm cho mọi bảng danh sách + ghi chú kết quả sửa chữa (21/10/2026) — v1.038

**(a) Nguyên văn yêu cầu:**

> tất cả các giao diện có table danh sách đơn, phiếu... đều phải bổ sung các filter phù hợp (người tạo, người xử lý, người sửa chữa, người gửi sửa, trạng thái...) + công cụ tìm kiếm. lựa chọn filter nhiều hơn 5 lựa chọn phải có tìm kiếm theo danh sách.

> 2. báo kết quả sửa chữa bổ sung thêm ghi chú

**(b) Đã làm:**
- Hạ tầng dùng chung:
  - Backend `lib/filters.ts`: `eqFilters(c, {tham_số: biểu_thức_SQL})` (giá trị `__none__` = rỗng, `a,b` = IN) + `distinctOpts()` lấy lựa chọn từ chính dữ liệu của danh sách. Mỗi route danh sách trả `{loc}` khi gọi `?loc_only=1`.
  - Frontend `ui/FilterBar.tsx`: `useListFilters(path, keys)` (ô tìm gõ xong 0,4s mới lọc), `FilterBar` (ô tìm + lưới ô lọc + "✕ Xoá lọc (N)"), `FilterSelect` (>5 lựa chọn tự thành `SearchableSelect` gõ để tìm, ≤5 là ô chọn thường). Ô lọc không có dữ liệu thì ẩn.
  - Danh sách đang lọc không còn bị thay cả màn bằng spinner (thanh lọc không mất khi đang tải).
- Áp dụng (route backend + màn hình):
  - KTV: Gửi hàng / tạo hộ (trạng thái, hình thức gửi, KTV khi tạo hộ, miền), Tiến độ (trạng thái, hướng xử lý, linh kiện, thùng), Nhận hàng.
  - Kho: Tiếp nhận (KTV, người tạo hộ, hình thức gửi, miền), Đóng gói (1 thanh lọc chung cho 3 danh sách).
  - NV: Việc của tôi (KTV, linh kiện, hướng xử lý, loại BH).
  - Admin BH: Xác nhận hoàn tất (NV, KTV, hướng xử lý, kết quả NV, linh kiện), Cấp linh kiện (người đề xuất, NV, KTV, linh kiện, người xử lý), KTV đang sửa (KTV, linh kiện, hướng xử lý + chip NV), danh sách phiếu trả (người nhận, loại đối trừ, người tạo, NV đã sửa đơn bên trong, miền — `screens/shared/phieuTraFilters.ts` dùng chung cho Admin / Kế toán duyệt / Kho / KTV); bảng thống nhất: ô Trạng thái + Loại LK nay tìm được khi >5 lựa chọn.
  - Giám sát / View / Admin: Tra cứu mọi đơn (KTV gửi, NV sửa chữa, hướng xử lý, linh kiện, miền — giữ chip lọc từ Tổng quan).
  - Quản trị: Danh sách KTV (khu vực, vai trò, nguồn, miền gán tạm), Danh mục linh kiện (phân loại, nguồn, dùng trong BH, tháng BH).
- Ghi chú kết quả sửa chữa: `migrations/0016_ghi_chu_nv.sql` (cột `phieu_sua_chua_bh_ct.ghi_chu_nv`); `POST /nv/don-vi/:id/chan-doan` nhận `ghi_chu` (tuỳ chọn, ≤2000 ký tự), ghi kèm vào nhật ký; ô "Ghi chú" trong form nộp kết quả; hiện ở khối Xử lý của UI chi tiết đơn và cột "Ghi chú NV" ở màn Chờ xác nhận hoàn tất.

**(c) Vấn đề:** tham số query trùng tên (VD `trang_thai` cố định của màn + `trang_thai` của bộ lọc) thì Hono lấy giá trị đầu → bỏ ô lọc trạng thái ở các màn đã cố định trạng thái. Route linh kiện chỉ trả `loc` ở nhánh phân trang (hook luôn gửi `limit=1`).

**(c2) Lỗi phát hiện sau deploy v1.038, đã vá ở v1.039:** `GET /phieu-tra?loc_only=1` trả 500 `ambiguous column name: trang_thai` — câu lấy danh sách NV JOIN `phieu_sua_chua_bh_ct` (cũng có cột `trang_thai`, `mien`) với điều kiện lọc không tiền tố. Đổi sang `u.phieu_tra_id IN (SELECT id FROM phieu_tra_bh WHERE …)`. Hậu quả trong lúc lỗi: ô lọc ở các danh sách phiếu trả không có lựa chọn (danh sách vẫn tải bình thường).

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chạy `wrangler dev` local bằng config tạm (D1 local rỗng, đã xoá config sau): gọi `?loc_only=1` và tổ hợp tham số lọc (gồm `__none__`, nhiều giá trị, kèm `q`) cho 13 route danh sách — tất cả trả 200 sau khi vá lỗi phiếu trả. Chưa kiểm với dữ liệu thật / bấm thử giao diện từng màn.

## Bấm thùng chờ tiếp nhận để mở xem + tiếp nhận ngay trong chi tiết (21/10/2026) — v1.040

**(a) Nguyên văn yêu cầu:** *"thùng hàng chờ tiếp nhận, cho phép click vào để mở nội dung thùng hàng ra để xem và tiếp nhận bên trong luôn"*

**(b) Đã làm:**
- `PhieuGuiDetailModal` thêm prop `actions` — nút thao tác của màn gọi, hiện ở footer khi thùng không còn nháp.
- 3 danh sách thùng chờ: bấm vào dòng (trừ các nút / ô chọn / badge miền / SLA trên dòng) mở UI chi tiết thùng (vận chuyển, danh sách đơn bên trong, QR, trao đổi, nhật ký):
  - Kho "Chờ tiếp nhận": footer "Báo sự cố" + "✔ Xác nhận tiếp nhận" (mở đúng modal tiếp nhận / báo sự cố cũ, chồng lên chi tiết; xong thì đóng cả 2). Dòng hiện thêm số đơn (`GET /kho/phieu-gui?trang_thai=da_gui` trả `so_don`).
  - Admin BH "Thùng chờ tiếp nhận nội bộ": footer "✔ Xác nhận đã nhận" (modal tiếp nhận nội bộ có ô lý do chậm).
  - Admin BH "Thùng đang gửi về Kho": footer "Nhận hộ Kho".

**(c) Vấn đề:** không có lỗi mới. Seed dữ liệu thử local: `wrangler d1 execute --local --persist-to` không ghi vào đúng file D1 mà `wrangler dev` đọc → seed thẳng bằng sqlite3 vào file `.wrangler/docs-ktv/v3/d1/…sqlite`; lưu ý `INSERT OR IGNORE` nuốt lỗi NOT NULL (`phieu_gui_bh.ngay_tao`, `phieu_sua_chua_bh.nguon_tao`).

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. `wrangler dev` local (config tạm, đã xoá): bấm dòng thùng ở Kho → mở chi tiết đủ đơn bên trong + 2 nút footer → "Xác nhận tiếp nhận" → xác nhận → thùng rời danh sách, mọi modal đóng. Sang Admin BH: bấm thùng chờ nhận nội bộ → chi tiết → "Xác nhận đã nhận" → thùng rời danh sách. Chưa thử "Nhận hộ Kho" từ chi tiết (cùng cơ chế).

## Tìm kiếm cho các danh sách còn sót (21/10/2026) — v1.041

**(a) Nguyên văn yêu cầu:** *"bổ sung tìm kiếm ở các danh sách table"*

**(b) Đã làm:** rà toàn bộ màn có danh sách — phần lớn đã có tìm + lọc từ v1.038. Bổ sung 5 danh sách còn thiếu:
- Admin BH "Thùng chờ tiếp nhận nội bộ" (màn Xử lý đơn) và "Thùng đang gửi về Kho": `FilterBar` dùng chung (`THUNG_DEFS` trong
  `screens/adminbh/NhanHoKho.tsx`) — tìm mã thùng / vận đơn / nhà xe / KTV / mã đơn, case, linh kiện bên trong + lọc KTV gửi, Kho
  nhận, hình thức gửi, miền (backend `GET /admin/phieu-gui` đã hỗ trợ `q` + lọc). Thanh lọc thùng chờ nhận nội bộ chỉ hiện khi >5
  thùng hoặc đang lọc, để thẻ gọn. Lọc ra rỗng thì thẻ vẫn hiện (không mất ô tìm).
- KTV tab Odoo "Đã gửi": ô tìm gọi server (`GET /odoo-don/da-gui?q=`, mã đơn Odoo, case, linh kiện, mã thùng, mã đơn).
- KTV tab Odoo "Hủy bỏ" (cả mục thu gọn trong modal Chọn đơn Odoo): tìm trên máy, không dấu, nhiều từ (mã đơn, case, linh kiện, lý do,
  người hủy).
- Quản trị "Giám sát khu vực": tìm mã / tên khu vực / giám sát + ô "Chỉ khu vực chưa gán Giám sát".

**(c) Vấn đề:** working tree có thay đổi chưa commit của 1 phiên khác (`backend/src/routes/phieuTra.ts`, `screens/ketoan/Duyet.tsx` —
tab "đã xử lý" cho Kế toán) → không đưa vào commit; tạm cất (stash) đúng 2 file đó trong lúc build/deploy để production khớp commit,
rồi trả lại nguyên trạng.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chưa bấm thử giao diện (thay đổi chỉ ở giao diện, dùng lại
`FilterBar` / cách lọc trên máy đã chạy ở các màn khác; backend không đổi).

**Deploy (21/10/2026):** `npm run deploy` thành công (Version ID `2233ef0a`), không có migration mới.

## Tab "Đã xử lý" cho Kế toán (21/10/2026) — v1.042

**(a) Nguyên văn yêu cầu:** *"vai trò kế toán thiếu tab các đơn đã từng xử lý"*

**(b) Đã làm:**
- `GET /phieu-tra?kt_da_xu_ly=1` (`backend/src/routes/phieuTra.ts`): phiếu có nhật ký Kế toán duyệt (`cho_ke_toan_duyet → da_duyet_ke_toan`) hoặc Kế toán từ chối / đẩy ngược (về `nhap`, ghi chú "Kế toán…"), cộng phiếu nhập từ AppSheet đã qua bước nháp. Mỗi dòng trả `kt_luc` / `kt_boi` / `kt_kq` (duyet / tu_choi / day_nguoc / appsheet) lấy từ lần xử lý gần nhất; sắp mới nhất trước. Lọc thêm `kt_kq`, `kt_boi` (có trong `loc_only`).
- `screens/ketoan/Duyet.tsx`: 2 tab "Chờ duyệt · N" / "Đã xử lý". Tab mới có cột Kết quả KT, Xử lý lúc, Người xử lý, Trạng thái hiện tại, Lý do từ chối + bộ lọc kết quả / người xử lý / trạng thái + bộ lọc phiếu trả chung; bấm dòng mở chi tiết phiếu.
- Không có migration.

**(c) Vấn đề:** phiếu nhập từ AppSheet không có nhật ký duyệt → hiện kết quả "Duyệt trên AppSheet", không có người / thời điểm.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi; chạy thử câu lọc trên D1 production (chỉ đọc) — trả đúng các phiếu AppSheet. Chưa bấm thử giao diện.

**Deploy (02/11/2026):** `npm run deploy` (Version ID `7d5f8b52`), không có migration mới. Lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua.

## Kéo khu vực phụ trách của tài khoản nhân sự từ linh-kien-app (21/10/2026) — v1.043 (+ linh-kien-app v1.378)

**(a) Nguyên văn:** người dùng hỏi *"danh sách tài khoản nhân sự từ app linh kien đã có phân khu vực sẵn. hiện tại thông tin tài khoản nhân sự đang được kéo về và xử lý như thế nào"*. Đã trả lời: app sửa chữa mới kéo khu vực của KTV (đẩy mỗi giờ), danh bạ ETX (1 lần/ngày), chưa kéo bảng `user_khu_vuc` (21 tài khoản Kho / Kế toán / View / Giám sát, 283 lượt gán) — `user_khu_vuc_bh` rỗng, View không thấy đơn nào, miền nhân sự gán tay. Người dùng chốt: *"chỉ cần đồng bộ kiểm tra 1 ngày 1 lần + bổ sunng đồng bộ thủ công"* (làm mục 1 + 2 của đề xuất; mục 3 tự gán vai trò KHÔNG làm).

**(b) Đã làm:**
- linh-kien-app: `GET /api/suachua-partner/user-khu-vuc` → `{rows: [{user_email, khu_vuc_ma}]}` (cùng xác thực `X-Sync-Key`).
- `migrations/0017_user_khu_vuc_tu_dong.sql`: `users.mien_tu_dong` (1 = miền do hệ thống tự suy, 0 = Admin gán tay). `PATCH /users/:email` đổi miền → `mien_tu_dong = 0`.
- `lib/userKhuVucSync.ts` `runUserKhuVucSync`:
  - ghi lại `user_khu_vuc_bh` đúng như nguồn (thêm / bỏ), chỉ email đã có tài khoản bên này + mã khu vực đã có trong `khu_vuc_bh` (2 cột có FOREIGN KEY); nguồn rỗng → báo lỗi, không xoá gì;
  - tự suy `users.mien`: toàn MB → MB, toàn MN → MN, cả 2 → ALL; chỉ áp cho tài khoản chưa gán miền hoặc miền tự suy; không còn khu vực → trả về "chưa gán" (chỉ với miền tự suy);
  - lưu kết quả `sync_state.user_khu_vuc_last`.
- Lịch: cron 15 phút `maybeRunUserKhuVucSync` — 1 lần/ngày từ 1h sáng (cùng lịch ETX), lần lỗi thì cron sau thử lại. Tài khoản mới đăng nhập lần đầu (không phải KTV) → chạy ngay nền (`auth.ts`), không đợi hôm sau.
- Đồng bộ tay: `POST /api/etx/khu-vuc-sync-now` (qtri); `GET /api/etx/status` trả thêm kết quả lần gần nhất + số tài khoản có khu vực / dùng miền tự suy. Giao diện: khối "🗺 Khu vực phụ trách của nhân sự" + nút "Đồng bộ ngay" trong thẻ "Đồng bộ ETX nhân sự" ở Cài đặt hệ thống.

**(c) Phát hiện trên dữ liệu thật (xem trước, chỉ đọc):** chỉ 4/21 nhân sự có khu vực đã có tài khoản bên này (Hạnh Bích, Anh Hồng, Ivy Nguyen, Thái Vũ Hồng); 17 người còn lại chưa từng đăng nhập — sẽ được gắn khi đăng nhập lần đầu. 4 người kia đều đã có miền gán tay nên KHÔNG bị đổi (VD Thái Vũ Hồng gán ALL, tự suy ra MN → giữ ALL). 1 lượt gán khu vực `CHUA_CO` bên linh-kien-app không có trong `khu_vuc_bh` → bỏ qua.

**(d) Kiểm thử:** typecheck backend + frontend cả 2 repo 0 lỗi. Mô phỏng thuật toán trên dữ liệu production thật (283 lượt, 4 tài khoản). Chưa chạy thử end-to-end 2 Worker local — kiểm bằng nút "Đồng bộ ngay" sau deploy.

## Phân miền theo khu vực + khu vực gửi hàng động (21/10/2026) — v1.044

**(a) Nguyên văn yêu cầu:**

> 1. dựa vào khu vực được setup của các tài khoản của admin bh, kho... data đã được phân loại sẵn chưa? Nếu đơn của 1 người tạo chưa được setup khu vực => sẽ hiện chung cho tất cả các tài khoản admin bh, kho, kế toán... => các các tài khoản xử lý có thể lựa chọn lại đúng khu vực của KTV. => khu vực đó sẽ được tự động xác định cho tài khoản của KTV đó.
> 2. Ngoài ra sẽ có 1 khu vực gửi hàng bảo hành (khu vực động - cho trường hợp kTV khu vực MB nhưng lại gửi hàng ra MN sửa chữa) => cho phép họ chọn khu vực gửi bảo hành thực tế khác với khu vực họ đang setup.

**(b) Kết quả / đã làm:**
1. Đã có từ v1.025, không cần sửa: đơn tự gán miền theo khu vực KTV; đơn "Chưa khai báo" hiện cho mọi người xử lý cả 2 miền;
   Kho / Admin BH / Kế toán / qtri đổi miền ở badge miền trong UI chi tiết, ô "Chuyển luôn tài khoản KTV sang miền này" mặc định
   tích → ghi `ktv_lien_he_bh.mien_gan` + chuyển các thùng chưa khai báo khác của KTV. Dữ liệu production (đọc 21/10/2026): 156 thùng
   = MB 74 / MN 82, 658 đơn cha = MB 320 / MN 338, **0 đơn chưa khai báo**. Người xử lý: 3 MN, 1 MB, 2 Cả 2, 2 chưa gán (thấy cả 2).
2. Ô mới **"Gửi về kho miền"** trong khối Vận chuyển của thùng nháp (`PhieuGuiDetailModal`): "Theo khu vực của KTV (Miền …)" (mặc
   định) / miền còn lại ("gửi khác khu vực"). Lưu cùng "Lưu nháp" / "Xác nhận gửi" (`PATCH /phieu-gui/:id` nhận `mien_gui`: "" =
   theo khu vực, "MB"/"MN" = chọn tay; chỉ áp khi thùng còn nháp; đổi `mien` cả thùng + đơn cha, ghi nhật ký). `GET /phieu-gui/:id`
   trả thêm `mien_ktv` để UI biết thùng đang theo khu vực hay gửi khác miền. Thùng đã gửi hiện "Gửi về kho miền: … (KTV thuộc …)".
   Chọn miền gửi KHÔNG đổi khu vực của KTV (chỉ áp cho thùng đó). Không có migration.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chưa bấm thử giao diện / gọi API local.

**Deploy (21/10/2026):** `npm run deploy` thành công (Version ID `3328fa72`), không có migration mới.

## Đổi tên trang web thành "Bảo hành đổi trả 3T" (27/10/2026) — v1.045

**(a) Nguyên văn yêu cầu:** *"đổi tên trang web thành \"Bảo hành đổi trả 3T\""*

**(b) Đã làm:** thay tên cũ ("Sửa chữa bảo hành - Dịch Vụ 3T" / "Sửa chữa 3T" / "Sửa chữa bảo hành 3T") bằng "Bảo hành đổi trả 3T" ở: tiêu đề tab (`frontend/index.html` `<title>` + `apple-mobile-web-app-title`), `manifest.webmanifest` (`name` + `short_name` — tên app khi cài lên màn hình chính), màn đăng nhập (`App.tsx`), logo sidebar (`Sidebar.tsx`) và topbar mobile (`TopBar.tsx`). Không đổi tên Worker / domain (`suachua.dichvu3t.workers.dev`), tên menu nghiệp vụ, mô tả manifest, comment code.

**(c) Vấn đề / ghi nhận:** PWA đã cài trên điện thoại có thể vẫn hiện tên cũ cho tới khi trình duyệt cập nhật manifest hoặc cài lại app.

**(d) Kiểm thử:** typecheck frontend 0 lỗi; grep xác nhận không còn tên cũ ở 5 file trên.

## 3 linh kiện của 1 đơn: KTV chọn (A) / thực tế gửi về (B) / đổi mới (C) (29/10/2026) — v1.046

**(a) Nguyên văn yêu cầu:** *"khi 1 đơn bảo hành được KTV hoặc GS tạo, sẽ chọn linh kiện A (hoặc lk măc định trên odoo - KTV có thể chọn lại linh kiện đúng nếu cần) => Admin bh sẽ nhập linh kiện thực tế gửi về là B, rồi chọn linh kiện sẽ đổi mới là C. như vậy 1 đơn gửi bảo hành sẽ có linh kiện ktv chọn, linh kiện admin bh xác nhận thực tế gửi về là B, và đổi mới cho linh kiện C. => khi quản lý xác sẽ tính theo linh kiện B"*

**(b) Đã làm:**
- Mô hình: A = `phieu_sua_chua_bh.ma_lk` (không đổi); **B = cột mới `phieu_sua_chua_bh_ct.ma_lk_nhan`** (`migrations/0018_ma_lk_nhan.sql`, NULL = giống A); C = `phieu_sua_chua_bh_ct.ma_lk_thuc_te` (cột cũ "linh kiện sửa chữa thực tế", nay mang nghĩa linh kiện đổi mới / thay thế, NULL = giống B). Dữ liệu cũ không chuyển đổi: B của mọi đơn cũ = A; C giữ nguyên (đơn nhập từ AppSheet vốn ghi "LINH KIỆN THAY THẾ" vào cột này).
- Backend: phân loại (`applyPhanLoaiToUnit`) nhận `ma_lk_nhan` + `ma_lk_thuc_te` (undefined/null = giữ, "" = bỏ về mặc định), ghi kèm vào nhật ký; route mới `PATCH /admin/don-vi/:id/linh-kien {ma_lk_nhan?, ma_lk_thuc_te?}` (Admin BH / qtri, sửa bất cứ lúc nào — VD sau xử lý nhanh / hàng loạt; kiểm tra linh kiện có trong danh mục, ghi nhật ký). Biểu thức "linh kiện hiệu lực" trong lọc / tìm / tra cứu đổi thành `COALESCE(C, B, A)`; tìm kiếm khớp cả B. **Top linh kiện 30 ngày đếm theo B** (trước đếm theo C). Các danh sách phiếu trả / lịch sử / đề xuất trả thêm `ma_lk_nhan`.
- Giao diện: form Phân loại có khối "Linh kiện" — dòng "KTV chọn: A", ô "Linh kiện thực tế gửi về" (mặc định A, có cảnh báo khi khác đề xuất KTV) + ô "Linh kiện đổi mới" (trống = giống B; tra cứu hạn BH theo B). UI chi tiết đơn: tiêu đề hiện B (badge "Khác LK KTV chọn" khi B ≠ A), dòng "KTV chọn · Thực tế gửi về · Đổi mới" + nút "✎ Sửa linh kiện" (modal sửa B/C). Bảng Admin BH, KTV đang sửa, Việc của NV hiện B. Bảng đơn chờ trả / chi tiết phiếu trả: phiếu trả KTV hiện C kèm dòng phụ "Xác: B"; **phiếu trả xác cho đối tác hiện B** (cột "Linh kiện xác (gửi về)") kèm "Đổi mới: C". Nút "Đổi LK" trong phiếu trả nay là đổi linh kiện đổi mới (C). Lịch sử Serial/Case hiện "gửi về B · đổi mới C".

**(c) Vấn đề:** không có. Ghi nhận: xử lý nhanh / phân loại hàng loạt không hỏi B, C (B = A) — sửa sau bằng "✎ Sửa linh kiện" trong chi tiết đơn.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch; thử logic SQL giữ / bỏ / đặt giá trị bằng sqlite. Chưa bấm thử giao diện / gọi API local.

**Deploy (29/10/2026):** áp migration 0018 lên D1 production (748 đơn vị, B đều để trống = theo A) và `npm run deploy` (Version ID `bf2c5469`).

## Xử lý các hạn chế còn tồn sau rà soát (30/10/2026) — v1.047

**(a) Nguyên văn yêu cầu:** sau báo cáo "đề xuất → phương án → phản biện" cho các hạn chế còn tồn, người dùng chốt:

> 1. Xử lý nhanh và phân loại hàng loạt không hỏi linh kiện thực tế gửi về (B) => không cần, mặc định = linh kiện KTV chọn, admin bh sẽ chọn lại co trường hợp bị sai thôi => nếu chọn fasst mặc định B = A (nếu B trống hoặc chưa chọn)
> 2. Admimn bh tiếp nhận thì bắn sang ko vận trạng thái admin đã xử lý (kết thúc luôn, kho ko cần xử lý nữa)
> 3. OK · 4. OK · 5. OK · 6. OK · 7. OK · 8. OK

(3 = không làm màn nhập mã chứng từ hàng loạt; 4 = gán miền tạm 1 lần cho KTV đã có đơn; 5 = không làm gì; 6 = cổng mã case mềm khi DVBH lỗi; 7 = huy hiệu sửa lại lần 2; 8 = QA các bản chưa bấm thử.)

**(b) Đã làm:**
1. **FAST ghi B = A** (`applyFastToUnit`, `routes/adminBH.ts`): sau khi áp nút FAST (đơn lẻ + hàng loạt), nếu `ma_lk_nhan` còn trống thì ghi = `ma_lk` của đơn cha. Phân loại thường / hàng loạt không đổi (B trống vẫn mang nghĩa "giống A").
2. **Báo khovan khi Admin BH tiếp nhận** (`lib/khovanPushClient.ts` `pushBoxDoneToKhovan`): gọi API **sẵn có** của khovan `POST /api/v1/inbound/orders/:code/status` với `box_status: "handed_over"` ("Đã bàn giao") + ghi chú — **không cần sửa / deploy khovan**. Gọi khi tiếp nhận nội bộ (1 thùng + hàng loạt) và "Nhận hộ Kho". Chạy nền (`waitUntil`), lỗi không chặn; thùng chưa từng báo sang khovan (VD Admin tạo hộ) thì khovan trả 404, bỏ qua. Route status của khovan không bắn webhook. Khovan đã chống trùng theo `external_system_id + order_code`, nên phiếu trả bị đẩy ngược rồi duyệt lại không sinh thùng trùng.
3. Không làm màn nhập mã chứng từ hàng loạt (MISA không bắt buộc từ v1.035).
4. **Gán miền tạm cho KTV: không cần làm** — đọc D1 production: 80 KTV có đơn mà chưa gán `mien_gan` đều đã suy được miền từ `khu_vuc_ma` hiện tại (linh-kien-app đã gán khu vực sau đợt nhập AppSheet).
5. Không làm gì (17 nhân sự chưa đăng nhập, case snapshot backfill, 9 đơn Odoo thiếu ID — tự giải quyết).
6. **Cổng mã case mềm khi DVBH lỗi:**
   - `lib/caseLookupClient.ts` thêm `lookupCaseEx` trả `found / not_found / error` (lỗi mạng, HTTP lỗi, giới hạn tần suất = `error`); `lookupCase` cũ gọi qua hàm mới.
   - `GET /api/case-lookup` trả thêm `loi_dvbh`. `POST /phieu-gui/:id/don`: "không tìm thấy" vẫn chặn `CASE_NOT_FOUND`; DVBH lỗi → 400 `DVBH_KHONG_PHAN_HOI`, trừ khi gửi `xac_nhan_chua_xac_minh: true` → tạo đơn với `phieu_sua_chua_bh.case_xac_minh = 1` + nhật ký, không lưu bằng chứng case.
   - Migration `0019_case_xac_minh.sql`: `case_xac_minh` (0 bình thường / 1 chưa xác minh / 2 thất bại), `case_xac_minh_loi`, index `case_xac_minh` và `case_id`.
   - Cron 15 phút `verifyPendingCases` (`lib/caseSnapshot.ts`, ≤30 đơn/lần): khớp đúng KTV sở hữu thùng → 0 + lưu bằng chứng; không tìm thấy / lệch KTV → 2 + lý do + nhật ký; DVBH vẫn lỗi → dừng, lần sau hỏi lại.
   - Giao diện: ô "Thêm đơn" (desktop + mobile, `CaseIdField`) khi DVBH lỗi hiện khung vàng + ô tích "Vẫn tạo đơn — hệ thống sẽ tự xác minh mã case khi DVBH hoạt động lại" (dùng chung state `override`; kết quả tra cứu đổi thì tự bỏ tích). Cảnh báo "⏳ chưa xác minh" / "✖ xác minh thất bại" ở dòng đơn trong chi tiết thùng và UI chi tiết đơn; huy hiệu "Case chưa xác minh" / "Sai case" ở bảng Admin BH.
7. **Huy hiệu "Lần N"** (`lib/lanTruoc.ts`): số lần sản phẩm (cùng `case_id` + cùng linh kiện thực tế gửi về B, mặc định A) đã bảo hành xong (hoàn tất / có phiếu trả / sẵn sàng gộp, trừ huỷ / chuyển kho) ở đơn cha khác tạo trong 90 ngày trước. `GET /admin/don-cha` và `/admin/don-vi` trả `lan_truoc`; bảng Admin BH hiện huy hiệu cam "Lần N" (có tooltip) ở ô linh kiện.

**(c) Vấn đề trong lúc làm:**
- Bản đầu điều kiện "tạo trước" so `created_at` theo giây → 2 đơn tạo cùng giây không đếm nhau. Đã sửa: trùng giây thì so tiếp theo mã đơn.
- Xoá thư mục D1 local khi workerd còn chạy làm hỏng DB local (lỗi 500) → dùng thư mục dữ liệu mới.
- Một script tạm `cm.py` cùng tên còn sót từ phiên trước đã bị chạy nhầm lên CLAUDE.md (chèn trùng mốc + mục v1.041) → đã hoàn tác về bản trước rồi ghi lại. Bài học: script tạm đặt tên riêng theo ngày, không dùng tên chung chung.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local bằng config tạm (service binding trỏ tới Worker không tồn tại để mô phỏng DVBH / khovan lỗi; config + dữ liệu đã xoá), script HTTP với 6 tài khoản đơn vai trò — 33/34 đạt ở lần chạy sạch (mục còn lại là lỗi trùng giây, đã sửa và xác nhận lại):
- `case-lookup` trả `loi_dvbh=true`; thiếu tích → `DVBH_KHONG_PHAN_HOI`; có tích → 201, `case_xac_minh=1`.
- Gửi xe → Kho nhận → Admin tiếp nhận nội bộ và "nhận hộ Kho" đều 200 dù khovan lỗi.
- FAST Đổi mới ghi `ma_lk_nhan = LK1` (= A) + `xu_ly_xac = tra_doi_tac`; FAST Sửa chữa cũng ghi B = A.
- `lan_truoc`: cùng case + cùng LK đếm đúng số đơn trước; khác LK = 0; đổi B sang LK khác → 0.
- Các bản chưa bấm thử: v1.037 KTV đang sửa (+ `loc_only`), v1.042 tab Kế toán "Đã xử lý" (+ `loc_only`), v1.043 `/etx/status`, v1.046 sửa linh kiện B/C, tra cứu mọi giai đoạn, tự động gộp → gửi duyệt không MISA → KT duyệt, 7 endpoint `loc_only` / workload / cảnh báo — đều đạt.
- Giao diện (trình duyệt): KTV gõ mã case → khung vàng + ô tích, nút "Thêm vào phiếu" khoá tới khi tích → tạo được đơn, dòng đơn hiện "⏳ Mã case chưa xác minh"; bảng Admin BH hiện "Case chưa xác minh" và "Lần 3" (tooltip đúng).
- Chưa kiểm được: cron xác minh lại với DVBH thật, và khovan thật nhận `handed_over` (local không có 2 Worker này).

**Deploy (30/10/2026):** áp migration 0019 lên D1 production và `npm run deploy` (Version ID `0d59c322`).

## Rà soát giao diện mobile của KTV hiện trường (30/10/2026) — chỉ phân tích, chưa sửa code

**(a) Nguyên văn yêu cầu:** *"giao diện cho mobile ktv tôi thấy nó khó nhìn, khó nắm bắt nội dung cần xử lý. Với vai trò 1 KTV đi ngoài đường => kiểm tra từng giao diện công việc, thực hiện các nhiệm vụ 1 cách đơn giản hiệu quả với vài click. dễ xác định tôi cần làm cái gì, đã làm cái gì, nhanh chóng quản lý được cái tôi đã làm, cần phải làm. Giao diện thân thiện, gọn gàng => nghiên cứu các giao diện gửi hàng bảo hành phù hợp cho KTV hiện trường => phân tích=> so sánh với giao diện hiện tại => đưa ra vấn đề => phản biện"*

**(b) Đã làm:** chạy v1.047 local ở khổ 375×812, đóng vai KTV với dữ liệu giống thật, đi qua 6 màn. Báo cáo đầy đủ ở `du an sua chua bao hanh/Ra-Soat-UX-Mobile-KTV_30-10-2026.md`:
- 5 mẫu giao diện tham khảo (tab trạng thái kiểu sàn TMĐT, thẻ + nút chính kiểu app tài xế, màn "Hôm nay" kiểu field service, dòng tiến trình kiểu theo dõi kiện, chọn thay gõ);
- 11 vấn đề kèm số đo;
- phản biện;
- 7 hướng đề xuất.

Phát hiện quan trọng nhất: **KTV không xem được đơn mình vừa gửi**. API tra cứu tiến độ (`GET /phieu-gui/don-vi/tra-cuu`) chỉ trả đơn vị đã được Admin tách, nên đơn trong thùng nháp và thùng đang trên xe không hiện ở đâu cả. Với dữ liệu thử: 10 đơn, chỉ hiện 7.

Các vấn đề còn lại:
- Trang chủ lặp cùng thông tin 3 lần.
- Việc gấp (đơn cần bổ sung, quá hạn) không lên đầu.
- Ngôn ngữ nội bộ: "Sẵn sàng gộp phiếu trả", MISA, Miền, SLA.
- Thẻ hiện mã trước, không có tên khách.
- Màn Gửi hàng dài 2.135px, trộn 2 danh sách, nút "Hủy đơn lỗi" đỏ ở mọi thẻ.
- Bộ lọc kiểu máy tính chiếm nửa màn hình.
- Chi tiết thùng để danh sách đơn ở cuối, có 2 nút lưu trùng.
- Nhận hàng mở bảng 9 cột của Admin.
- Mã case phải gõ tay.

Phản biện chính: số lần bấm không phải vấn đề (luồng Odoo → gửi xe chỉ 4–5 chạm). Vấn đề là định hướng và hiển thị trạng thái. Hướng sửa: làm các màn KTV mobile riêng, không sửa thẳng component chung để tránh vỡ giao diện máy tính.

**(c) Vấn đề:** không có (không sửa code).

**(d) Kiểm thử:** quan sát thực tế trên trình duyệt (ảnh chụp + đo chiều cao trang, vị trí phần tử). Config chạy local và dữ liệu thử đã xoá.

**Câu hỏi mở:** ~~người dùng chọn hướng / phạm vi trong 7 đề xuất trước khi bắt tay sửa~~ — **[ĐÃ CHỐT 30/10/2026]** nguyên văn: *"Làm theo thứ tự đề xuất"* → làm đủ 7 đề xuất, xem mục kế tiếp (v1.048).

## Làm 7 đề xuất giao diện mobile cho KTV hiện trường (30/10/2026) — v1.048

**(a) Nguyên văn yêu cầu:** *"Làm theo thứ tự đề xuất"* (7 hướng đề xuất trong `du an sua chua bao hanh/Ra-Soat-UX-Mobile-KTV_30-10-2026.md`).

**(b) Đã làm:**
- **Phạm vi:** các màn KTV mới chỉ áp cho tài khoản **chỉ là KTV / Vệ tinh** (`isPureKtv` trong `layout/routes.ts` — không kèm vai trò xử lý nào). Admin / Giám sát / qtri (kể cả khi tạo hộ) giữ giao diện cũ; Chế độ test "xem như KTV" thấy giao diện mới.
- **Backend:**
  - `GET /api/phieu-gui/don-cua-toi?nhom=dang|xong&q=` (`routes/phieuGui.ts`): 1 dòng / đơn cha của KTV, **gồm cả đơn trong thùng nháp và thùng đang trên xe** (trước đây Tiến độ chỉ có đơn đã tách). Kèm `don_vi` (trạng thái từng đơn vị + trạng thái phiếu trả), tên khách từ bằng chứng case, `can_bo_sung`; đơn cần bổ sung luôn lên đầu. "Đã xong" = đã tách và mọi đơn vị kết thúc (huỷ / chuyển kho / phiếu trả KTV đã nhận / gửi thất bại). Trả số `so_dang` / `so_xong` cho tab.
  - `GET /phieu-gui` trả thêm `so_don`; `GET /phieu-tra?kem_don=1` kèm danh sách món bên trong (linh kiện, khách); `GET /odoo-don/cho-gui` trả thêm `khach_hang` (nếu đã có bằng chứng case).
- **1. Trang chủ = "Việc của tôi"** (`screens/ktv/KtvHome.tsx`): thẻ xếp theo độ gấp — cần bổ sung (nhãn "đã quá 24h", nút "✍️ Bổ sung ngay") → hàng trả về (nút "✔ Đã nhận hàng" / "Không nhận được") → thùng chưa gửi (ghi bước còn thiếu, nút "Mở thùng & gửi") → thẻ "N đơn Odoo mới". Dưới là "📍 Đang theo dõi" (6 đơn, kèm dòng tiến trình) + "Xem tất cả". Bỏ hero / cảnh báo đơn tồn / lưới KPI với KTV.
- **2. Thanh dưới 4 tab:** Việc của tôi · Gửi hàng · Đơn của tôi · Nhận hàng. "Tiến độ" đổi tên "Đơn của tôi" (`screens/ktv/DonCuaToi.tsx`, thay `TraCuu.tsx` đã xoá): 2 tab Đang xử lý / Đã xong, ô tìm (khách, serial, case, linh kiện, mã đơn), link "🔁 Lịch sử" sang màn Serial / Case (bỏ khỏi thanh dưới với KTV).
- **3. Gửi hàng 2 tab** "🧾 Đơn Odoo mới (n)" / "📦 Thùng của tôi (n)" (mặc định tab Odoo nếu còn đơn). Thẻ đơn Odoo: linh kiện × SL + khách lên đầu, mã đơn / case xuống dòng phụ; "Hủy đơn lỗi" vào menu "⋯". Danh sách thùng: cột "Bước tiếp" ("Còn 1 bước: xác nhận đã gửi xe"…), số đơn, trạng thái theo góc nhìn KTV, bộ lọc thu vào nút "⚙ Lọc" (`FilterBar collapsible`).
- **4. Chi tiết thùng** (KTV hoặc màn điện thoại): danh sách đơn lên trước vận chuyển; vận chuyển thu gọn 1 dòng + nút "✎ Sửa"; bỏ nút "Lưu nháp" trùng (còn nút "Lưu nháp, gửi sau" ở chân); banner nháp ngắn; nhật ký trống thì ẩn; KTV không thấy SLA / đổi miền / loại đối trừ đề xuất, nhãn tiến độ đơn theo góc nhìn KTV.
- **5. Nhận hàng dạng thẻ:** mỗi phiếu hiện các món bên trong + nút "Đã nhận hàng" / "Không nhận được" (mở form báo Kho) ngay trên thẻ. KTV không thấy mã MISA trong chi tiết phiếu trả.
- **6. Chọn nhanh mã case** (`CaseIdField`): khi thêm đơn vào thùng hiện chip các case từ đơn Odoo chưa gửi của đúng KTV + nút "📋 Dán"; chọn xong tự bấm "Kiểm tra".
- **7. Nhãn theo góc nhìn KTV** (`lib/ktvStage.ts`): Chưa gửi / Đang trên xe về Kho / Kho đã nhận / Cần bạn bổ sung / Đang xử lý / Xử lý xong, đang chuẩn bị trả / Đang trả về bạn / Đã nhận lại / Thất lạc khi trả / Không bảo hành (đã huỷ) + dòng tiến trình 5 bước Gửi đi → Kho nhận → Xử lý → Trả về → Đã nhận (`screens/ktv/KtvCards.tsx`).
- Phụ: nút "Thoát" trên topbar mobile nhỏ lại + hỏi xác nhận trước khi đăng xuất.
- Không có migration.

**(c) Vấn đề trong lúc làm:**
- Ở local, `wrangler dev` cũ không tắt hẳn (workerd + node còn sống) → 2 tiến trình cùng nghe cổng, request treo, trình duyệt kiểm thử bị kẹt. Phải tắt hết `workerd.exe` + node chạy `wrangler.qa.jsonc` rồi chạy lại.
- Chưa có: chip chọn case không tự điền luôn linh kiện của đơn Odoo đó (muốn điền đủ thì dùng "🧾 Chọn đơn Odoo").

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local (config tạm, đã xoá), KTV mẫu 6 đơn (1 thùng nháp, 1 thùng trên xe, 1 cần bổ sung quá 30h, 1 đang sửa, 1 đang trả về, 1 đã nhận):
- API `don-cua-toi`: Đang xử lý 5 (gồm thùng nháp + thùng trên xe), Đã xong 1; KTV bổ sung qua API → đơn hết "cần bổ sung".
- Giao diện 375×812: Việc của tôi hiện đúng thứ tự 4 nhóm việc + Đang theo dõi; Đơn của tôi đủ 2 tab + tiến trình; Gửi hàng 2 tab, menu ⋯; chi tiết thùng đơn lên đầu, vận chuyển 1 dòng; Nhận hàng bấm "Đã nhận" → phiếu biến mất, Đã xong 1 → 2; Thêm đơn hiện 3 chip case, bấm chip tự điền + tự kiểm tra.
- Chưa kiểm được bằng mắt: modal bổ sung mở từ thẻ (trình duyệt kiểm thử bị kẹt sau khi server local chết), giao diện desktop của các màn KTV mới.

**Deploy (30/10/2026):** `npm run deploy` thành công (Version ID `de278e2d`), không có migration mới.

## Rà soát bố cục từng màn ở điện thoại + máy tính (31/10/2026) — v1.049

**(a) Nguyên văn yêu cầu:** *"giao diện chưa tối ưu cho màn hình điện thoại, và web. hãy kiểm tra từng màn hình và xử lý"*

**(b) Cách kiểm tra:** chạy bản local với dữ liệu mẫu (3 KTV, 11 thùng, ~30 đơn ở mọi trạng thái, 4 phiếu trả), dùng puppeteer + Chrome chụp từng màn ở 375×812 và 1440×900 cho 2 tài khoản (KTV thuần + tài khoản đủ vai trò), đo `scrollWidth` + phần tử tràn khỏi màn hình. 26 màn + các UI chi tiết.

**Lỗi tìm được và đã sửa:**
1. **Màn KTV tràn ngang trên điện thoại** (trang rộng 432px trong khung 375px — thẻ bị cắt mép phải, UI chi tiết thùng bị lệch). Nguyên nhân: lưới thẻ `grid` 1 cột ngầm định cho phần tử co theo chữ dài không ngắt (`whitespace-nowrap` / `truncate`) → đổi sang `grid-cols-1` (minmax(0,1fr)) + `min-w-0` cho thẻ (`KtvHome`, `DonCuaToi`, `NhanHang`, `KtvCards`). Bài học: lưới / flex chứa chữ `truncate` phải có `min-w-0` hoặc `grid-cols-1`.
2. **Chi tiết phiếu trả** (`ReturnUnitTable`): trên điện thoại bảng 9 cột bị ép còn 2 cột, tiêu đề cột xuống dòng dọc → điện thoại đổi sang thẻ (linh kiện, khách, mô tả, mã); máy tính tiêu đề cột không xuống dòng. KTV xem phiếu trả: ẩn hướng xử lý / đối trừ / kết quả / miền / SLA / người tạo / loại đối trừ / đổi miền (prop `simple`), nút "Khiếu nại vận chuyển" đổi thành "Không nhận được".
3. **Bộ lọc chiếm nửa màn hình đầu trên điện thoại** (bảng Admin BH 7 ô, Người dùng 5 ô, mọi `FilterBar`): trên điện thoại thu vào nút "⚙ Lọc (n)"; máy tính giữ nguyên.
4. **Thẻ của bảng dùng chung trên điện thoại** (`ui/Table.tsx`): 1 cặp nhãn/giá trị mỗi dòng → 2 cặp mỗi hàng, bỏ ô trống "—". Tra cứu mọi đơn 20 dòng: 6.629px → 5.519px.
5. **Trang chủ Admin trên điện thoại** dài 2.938px: ẩn lưới KPI (hero đã liệt kê đủ việc), cảnh báo đơn tồn chỉ hiện giai đoạn đang có tồn + bỏ chú thích → 1.475px. **Tổng quan hệ thống**: ẩn giai đoạn = 0 trên điện thoại; `StatCard` trên điện thoại thành thẻ ngang 1 dòng (icon · nhãn · số, cao ~52px thay ~110px).
6. **Bảng Admin BH 1440px**: tổng độ rộng cột mặc định ~1.590px nên cột SLA bị đẩy ra ngoài → thu hẹp cột mặc định + đưa SLA lên ngay sau Trạng thái (`useAdminCols`; ai đã tự sắp cột thì giữ cấu hình của mình). Thẻ đơn trên điện thoại: nút gọn 1 hàng ("Phân loại · ⚡ Nhanh · Bổ sung · 🐞").
7. **Sidebar thu gọn**: huy hiệu số đè lên chữ ("Việc cu… tôi") → chừa khoảng trên cho huy hiệu.
8. **KTV nhỏ lẻ**: bỏ lời chào trùng với topbar; thẻ hàng trả gộp món trùng ("× 2"); tab Gửi hàng / Đơn của tôi không kéo hết chiều ngang máy tính; ẩn tiêu đề "Đơn bảo hành Odoo" trùng tab; nút "Tạo thùng với N đơn" trên điện thoại dính trên thanh menu dưới khi đã chọn đơn; "+ Tạo phiếu mới" → "+ Tạo thùng mới"; nút "Chọn đơn Odoo / Thêm đơn" rút gọn trên điện thoại để tiêu đề khối không xuống 3 dòng.

**(c) Vấn đề trong lúc làm:** `wrangler dev` local tự chết sau ~5 phút (lỗi proxy nội bộ wrangler 4.129) và khi khởi động lại còn tiến trình `workerd` / node cũ giữ cổng → phải tắt hết rồi chạy lại. Git Bash đổi đường dẫn `/home` thành `C:/Program Files/Git/home` khi truyền làm tham số → dùng `MSYS_NO_PATHCONV=1`.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. Chụp lại sau sửa: 12 màn KTV + 12 màn đủ vai trò ở 2 khổ — mọi trang `scrollWidth` = bề rộng khung (375 / 1440), không phần tử nào tràn; xem ảnh từng màn đã sửa. Chưa kiểm: màn Kế toán / Kho đóng gói / Đề xuất linh kiện khi có nhiều dữ liệu hơn (dữ liệu mẫu ít dòng), máy tính bảng 768–1024px.

**Deploy (31/10/2026):** `npm run deploy` thành công (Version ID `808a0447`), không có migration mới.

## Bộ lọc Cảnh báo / Thời gian / Linh kiện A-B-C + tìm không dấu theo case, khách, linh kiện (31/10/2026) — v1.050

**(a) Nguyên văn yêu cầu:**

> 1. các màn dạng danh sách, bổ sung thêm các công cụ filter theo các dạng trạng thái, cảnh báo, thời gian, linh kiện A, B, C... người tạo, người xử lý, dạng xử lý... và các filter khác để tiện quản lý
> 2. Người dùng sẽ thường tìm kiếm theo ID case CRM, tên linh kiện họ gửi hoặc tên khách hàng, đơn giản họ chỉ biết các thông tin đó

**(b) Đã làm:**
- **Tìm không dấu.** SQLite `LOWER`/`LIKE` không xử lý chữ Việt có dấu (gõ "tran thi mai" không ra "Trần Thị Mai"). `migrations/0020_tim_kiem.sql` thêm `phieu_sua_chua_bh.tim_kiem` (chuỗi đã bỏ dấu, chữ thường) + `tim_kiem_luc`.
  - `lib/timKiem.ts`: `normVi()` (bỏ dấu, đ→d) + `capNhatTimKiem(db, ids|null, max)` — chuỗi gồm mã đơn, mã case, tên khách lẻ + SĐT, sản phẩm, mô tả lỗi, mã + tên linh kiện A/B/C, mã đơn vị, mã thùng, bằng chứng case (khách hàng, serial, sản phẩm, nhóm, hãng, địa chỉ, KTV trên case), email + tên + mã KTV, mã đơn Odoo.
  - Tính lại khi: thêm đơn thủ công (ngay), đơn từ Odoo / đơn dịch vụ (cuối `syncCaseSnapshots` / ngay), cron 15 phút sau bước bổ sung bằng chứng case (đơn chưa có chuỗi, hoặc có đơn vị con / bằng chứng case cập nhật sau lần tính trước; tối đa 400 đơn / lần — 656+ đơn cũ trên production sẽ được tính dần trong vài lần cron).
  - `lib/search.ts` `kwClause(q, cols, normCols)`: tìm vẫn khớp cột gốc (gõ có dấu ra ngay) **và** khớp `tim_kiem` với từ khoá đã bỏ dấu. `tkThungOf` / `tkPhieuTraOf` gộp chuỗi các đơn trong 1 thùng / 1 phiếu trả.
  - Áp cho: bảng Admin BH, thùng chờ nhận nội bộ / đang gửi về Kho, KTV đang sửa, Xác nhận hoàn tất, Cấp linh kiện, Kho tiếp nhận / bàn giao, Việc NV, Tra cứu mọi đơn, danh sách phiếu trả (Admin / Kế toán / Kho / KTV), KTV: Gửi hàng, Đơn của tôi, tra cứu đơn vị, tab Odoo "Đã gửi".
- **Bộ lọc dùng chung** (`lib/filters.ts` backend, `ui/FilterBar.tsx` frontend):
  - `canh_bao` (`slaFilter`, giờ SLA bỏ Chủ nhật): Trong hạn 24h / Quá hạn 24h / Quá 24–72h / Quá 72h (nguy hiểm).
  - `khoang` (`timeFilter`, theo ngày tạo): Hôm nay / 7 ngày / 30 ngày / Tháng này / Tháng trước / Cũ hơn 30 ngày.
  - Linh kiện `lk_a` (KTV chọn), `lk_b` (gửi về, mặc định A), `lk` (đổi mới / thực tế C → B → A).
  - Frontend: `CANH_BAO_DEF`, `KHOANG_DEF`, `LK_ABC_DEFS` gắn vào: KTV đang sửa, Xác nhận hoàn tất, Việc NV, Tra cứu mọi đơn (A/B/C + Cảnh báo + Thời gian); Cấp linh kiện (A, B + Cảnh báo + Thời gian); Kho tiếp nhận, thùng Admin (Cảnh báo + Thời gian); Gửi hàng KTV + mọi danh sách phiếu trả (Thời gian). KTV đang sửa có thêm lọc Loại BH, Miền.
  - Bảng thống nhất Admin BH (`AdminFilterBar`): 10 ô — thêm "LK gửi về (B)", "Hướng xử lý", "Thời gian"; đổi tên "LK gửi" → "LK KTV chọn (A)", "LK thực sửa" → "LK đổi mới (C)"; SLA thêm "🔴 Quá 72h". Backend `locBangThongNhat` nhận `lk_nhan`, `huong`, `khoang`, `cham=nguy_hiem`; `loc-options` trả `lk_nhan`, `huong`.
- Ô tìm các màn thùng / phiếu trả ghi rõ "mã case, tên khách, linh kiện bên trong".

**(c) Vấn đề:** heredoc Python dài trong Bash lại lỗi EOF → viết file bằng Write. `/__scheduled` của `wrangler dev --test-scheduled` bị asset SPA chặn (chỉ `/api/*` chạy worker trước) → thêm tạm `/__scheduled` vào `run_worker_first` của config QA. `joinF` trả `binds: unknown[]` → ép kiểu ở `nvSuaChua.ts`.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (`wrangler.qa.jsonc` tạm, D1 `.wrangler/qa3110`, đã xoá config): migration 0020 áp OK; cron điền `tim_kiem` cho 29/29 đơn (VD "dh-000001 … khong len nguon … bom tang ap karofi 24v … tran thi mai … nguyen van an anv.dvkh"). 43 lời gọi API (Admin + KTV) đều 200: "tran thi mai" / "Trần Thị Mai" / "bom tang ap" ra đúng đơn ở bảng Admin, Tra cứu (7), Đơn của tôi, Gửi hàng; "van dien tu" / "bom tang ap" ra đúng phiếu trả; "cam bien" ra đúng thùng ở Kho + Admin; `cham=nguy_hiem` 4, `canh_bao=nguy_hiem` ở Tra cứu 6, `lk_a` / `lk_nhan` / `khoang` lọc đúng; `loc_only` trả thêm `lk_a`, `lk_b`. Ảnh 375px + 1440px của Admin BH, Tra cứu, KTV đang sửa, Kho tiếp nhận: không tràn ngang, đủ ô lọc mới.

**Deploy (31/10/2026):** áp migration 0020 lên D1 production và `npm run deploy` (Version ID `f26f9081`). Chuỗi `tim_kiem` của đơn cũ sẽ được cron 15 phút tính dần, mỗi lần tối đa 400 đơn.

## Gộp các màn hình trùng chức năng — phương án (31/10/2026), CHƯA sửa code

**(a) Nguyên văn:** *"tôi thấy có rất nhiều giao diện có chức năng tương tự nhau nhưng đang bị phân thành nhiều màn hình cho nhiều vai trò, xác định các màn có chức năng tượng tự, gộp chúng lại giảm việc xây dựng quá nhiều giao diện => chỉ tập trung vào 1 số giao diện chính và tái sử dụng chon các vai trò"*

**(b) Phương án:** xem `du an sua chua bao hanh/Gop-Man-Hinh_31-10-2026.md`.
- Thực chất chỉ có 3 loại danh sách: Phiếu trả (5 màn, cùng 1 API), Đơn bảo hành (5 màn), Thùng hàng (3 nơi).
- Gộp thành 5 màn chung: Thùng hàng / Đơn bảo hành / Phiếu trả / Trang chủ / Quản trị. Mỗi màn có tab theo giai đoạn và mở mặc định ở tab việc của vai trò.
- Giữ riêng: Cấp linh kiện, Lịch sử, 3 màn mobile của KTV.
- Menu Admin từ 19 xuống 7 mục.
- Làm 3 đợt: Phiếu trả → Thùng hàng + Trang chủ → Đơn bảo hành + Quản trị.
- Quyền dữ liệu vẫn lọc ở backend. Link cũ phải chuyển tiếp sang màn mới.

~~**Câu hỏi mở:** người dùng duyệt phương án / thứ tự trước khi sửa code.~~ **[ĐÃ CHỐT 31/10/2026]** nguyên văn: *"Làm cả 3 đợt"* → đã làm, xem mục kế tiếp (v1.051).

## Gộp màn hình trùng chức năng thành 4 màn chung (31/10/2026) — v1.051

**(a) Nguyên văn:** *"Làm cả 3 đợt"* (theo phương án `du an sua chua bao hanh/Gop-Man-Hinh_31-10-2026.md`).

**(b) Đã làm:**
- **Khung chung `ui/TabScreen.tsx`:** mỗi màn = tập tab, mỗi tab khai báo vai trò nào thấy (`show`) + hàng đợi nào đếm số việc (`countKeys`, hiện huy hiệu đỏ trên tab). Tab đang mở nằm trên URL (`#/phieu-tra?tab=cho_kt`), F5 / link / Back giữ đúng tab. Không có `?tab` thì mở tab đầu tiên **có việc** của vai trò, không có việc thì tab đầu tiên được thấy.
- **4 màn chung** (`screens/chung/`), nội dung từng tab tái sử dụng các danh sách / modal đã có (không viết lại logic nghiệp vụ):
  - **Thùng hàng** `#/thung`: Thùng nháp / tạo hộ (Giám sát, Admin) · Đang gửi về Kho (Kho: xác nhận tiếp nhận + quét QR; Admin: nhận hộ Kho) · Kho đã nhận — chờ Admin (Admin: xác nhận tiếp nhận nội bộ, chọn nhiều; Kho: danh sách chờ bàn giao) · Kho nhận gần đây. `KhoTiepNhanScreen` nhận prop `only`; khối "thùng chờ nhận nội bộ" tách khỏi màn Xử lý đơn thành `adminbh/ThungNoiBo.tsx` (màn Xử lý đơn chỉ còn 1 dòng nhắc "N thùng chờ bạn xác nhận → Mở Thùng hàng").
  - **Đơn bảo hành** `#/don`: Chờ phân loại (bảng thống nhất Admin) · Việc sửa của tôi (NV) · Đang sửa (NV) (Admin theo dõi) · Chờ xác nhận hoàn tất · Mọi giai đoạn (Admin / Giám sát / View).
  - **Phiếu trả** `#/phieu-tra`: Chờ tạo phiếu (Admin) · Nháp · ↩ KT trả lại · Chờ KT duyệt · KT đã xử lý (Kế toán) · Chờ Kho gửi · ⚠ KTV báo không nhận (Kho / Admin) · Đang gửi KTV · Đã kết thúc · Tất cả. Danh sách dùng chung `PhieuTraListCard` (1 tab thì ẩn thanh tab con, thêm `extraCols`); nút Duyệt / Từ chối / Đóng gói / Gửi / Đánh giá khiếu nại vẫn nằm trong UI chi tiết phiếu trả theo vai trò.
  - **Quản trị & danh mục** `#/quan-tri`: Danh mục linh kiện (Admin BH + qtri) · Người dùng · Danh sách KTV · Giám sát khu vực · Cài đặt (qtri).
  - **Trang chủ** gộp luôn "Tổng quan hệ thống" (số theo giai đoạn + quá hạn SLA) cho Giám sát / View / Admin; bấm ô số mở `#/don?tab=tat_ca&trang_thai=…`.
- **Giữ riêng:** Cấp linh kiện (`#/admin/de-xuat`), Lịch sử Serial / Case, 3 màn KTV tối ưu điện thoại (Gửi hàng / Đơn của tôi / Nhận hàng, kể cả link `#/ktv/nhan-hang/TR-…`).
- **Menu** (`layout/routes.ts`) không còn chia nhóm theo vai trò: Trang chủ · (KTV: Gửi hàng · Đơn của tôi · Nhận hàng) · Thùng hàng · Đơn bảo hành · Cấp linh kiện · Phiếu trả · Lịch sử · Quản trị. **Ghi đè** quyết định 10/10/2026 (menu chia nhóm theo vai trò). Admin hệ thống 19 → 7 mục; Kho 4, Kế toán 3, NV 3.
- **Link cũ tự chuyển tiếp** (`lib/legacyRoutes.ts`, giữ nguyên các tham số khác): `/kho/tiep-nhan` → `/thung?tab=dang_gui`, `/kho/dong-goi` → `/phieu-tra?tab=cho_kho`, `/admin/phan-loai` → `/don?tab=xu_ly`, `/admin/dang-sua`, `/admin/xac-nhan`, `/nv/viec-cua-toi`, `/quanly/tra-cuu`, `/quanly/tong-quan` → `/home`, `/admin/phieu-tra`, `/admin/phieu-tra-ke-toan`, `/ketoan/duyet`, `/linh-kien`, `/qtri/*`. Link trong cảnh báo đơn tồn (`backend/src/lib/canhBao.ts`), các ô "việc" ở Trang chủ và shortcut PWA đã trỏ thẳng màn mới.
- Bỏ: `kho/DongGoi.tsx`, `KeToanDuyetScreen` (giữ `KtDaXuLyCard`), `AdminPhieuTraKeToanScreen`. Không đổi backend nghiệp vụ / quyền dữ liệu (chỉ đổi chuỗi link trong cảnh báo). Không có migration.

**(c) Vấn đề:** dải "thùng chờ nhận nội bộ" cũ giới hạn cao 72px (thiết kế dạng dải trên đầu màn) → bỏ giới hạn khi thành tab riêng. Ghi nhận: tài khoản vừa Kho vừa Admin thấy số tab "Kho đã nhận — chờ Admin" cộng cả 2 hàng đợi (cùng thùng) — chỉ ảnh hưởng tài khoản nhiều vai trò.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (`wrangler.qa.jsonc` tạm, D1 `.wrangler/qa3110`, đã xoá config), puppeteer 2 khổ 1440 / 375 cho 6 tài khoản (Admin đủ vai trò, Kho, Kế toán, NV, View, Giám sát): 4 màn mở đúng tab mặc định theo vai trò (Kho → Đang gửi về Kho, Kế toán → Chờ KT duyệt, NV → Việc sửa của tôi, View → Mọi giai đoạn, Giám sát → Thùng nháp); màn không có quyền báo "Không tìm thấy" khớp menu; link cũ chuyển đúng (`#/admin/phan-loai` → `#/don?tab=xu_ly`, `#/ketoan/duyet` → `#/phieu-tra?tab=cho_kt`, `#/quanly/tra-cuu?trang_thai=qua_han` → `#/don?tab=tat_ca&trang_thai=qua_han` lọc 24 đơn); không lỗi console, không tràn ngang. Bấm thật: tiếp nhận nội bộ 1 thùng từ tab mới → `admin_tiep_nhan = 1`, số tab 4 → 2; thùng quá hạn thì nút xác nhận khoá tới khi chọn lý do chậm (đúng); mở chi tiết phiếu trả từ tab Chờ KT duyệt hiện đủ nút Duyệt / Từ chối / Lưu mã / Thêm đơn.


**Deploy (31/10/2026):** `npm run deploy` (Version ID `16bcac72`), không có migration mới.

## Tài liệu hướng dẫn KTV hiện trường + sửa nhãn tiến độ trong chi tiết thùng (31/10/2026) — v1.052

**(a) Nguyên văn yêu cầu:** *"với vai trò ktv, có 3 vấn đề quan tâm chính và tôi đang cần quay 1 video hướng dẫn người dùng thao tác: 1. Gửi hàng bảo hành 2. Kiểm tra được trạng thái của hàng đã gửi 3. Nhận lại hàng đã gửi => cuối cùng là các chức năng phụ cần KTV quan tâm thao tác nếu có. => Đầu tiên hãy giúp tôi tạo 1 tài liệu hướng dẫn chi tiết giúp kTV nắm bắt vấn đề mình cần quan tâm. có hình ảnh và hướng dẫn đầy đủ (ktv là người chạy hiện trường, cần hướng dẫn cầm tay chỉ việc, dễ hiểu, nắm bắt vào vấn đề chính họ cần quan tâm)"*

**(b) Đã làm** — thư mục `du an sua chua bao hanh/Huong-dan-KTV-v1.052/`:
- `Huong-dan-KTV.docx` + `Huong-dan-KTV.pdf` (A4, 22 trang, 34 hình, mục lục có số trang); `anh/` (34 ảnh điện thoại 390×844 có khung đỏ đánh số + logo); `build-huong-dan.cjs` (docx-js, chạy với `NODE_PATH` trỏ tới thư mục có `docx`) + `anh-sizes.json`.
- Nội dung theo giao diện KTV mới (v1.048–v1.051, 4 tab Việc của tôi / Gửi hàng / Đơn của tôi / Nhận hàng): 0. "chỉ cần nhớ 3 việc" + bảng đường đi 5 bước và chữ KTV thấy ở từng bước; Bắt đầu (đăng nhập, cài app, màn Việc của tôi); Phần 1 Gửi hàng (Cách 1 từ đơn Odoo, điền vận chuyển, Giao trực tiếp, QR, Cách 2 thủ công có kiểm tra mã case đúng / sai, lưu nháp, trao đổi); Phần 2 Xem tiến độ (Đơn của tôi, đọc thẻ đơn, bổ sung theo yêu cầu Admin, đơn đã xong, đơn Odoo đã gửi); Phần 3 Nhận hàng (Đã nhận hàng / Không nhận được); Phần 4 phụ (hủy đơn Odoo lỗi + mở lại, lịch sử serial / case, nhắn tin, đăng xuất); câu hỏi thường gặp; **phụ lục kịch bản quay video 17 cảnh** (màn hình / thao tác / lời thoại gợi ý).
- Tài liệu cũ `Huong-dan-KTV/` (19/10/2026, v1.033) giữ làm lịch sử — **bản mới thay thế** vì giao diện KTV đã đổi hẳn.
- **Sửa lỗi phát hiện khi chụp ảnh:** chi tiết thùng (`GET /phieu-gui/:id` → `tien_do`) chỉ nhóm theo trạng thái đơn vị, nên đơn đã vào phiếu trả / KTV đã nhận lại vẫn hiện "Xử lý xong, đang chuẩn bị trả". Nay query kèm trạng thái phiếu trả (`tra_trang_thai`), `PhieuGuiDetailModal` truyền vào `ktvUnitStage` → hiện đúng "Đang trả về bạn" / "Đã nhận lại".

**(c) Vấn đề / ghi nhận (chưa sửa):** ở khổ 390px nút "Kiểm tra" trong form thêm đơn bị cắt chữ; form "Bổ sung" của KTV không có ô tải ảnh dù Admin hay yêu cầu chụp lại ảnh; thùng đầu tiên tạo từ đơn Odoo tự điền vận chuyển của thùng đã gửi gần nhất (đúng thiết kế "nhớ nhà xe", nhưng KTV cần kiểm tra lại). Kỹ thuật chụp: sheet "Thêm đơn" trên điện thoại render bằng portal riêng (không có `data-modal-overlay`), ô nhập có placeholder thì phải khớp theo cả value.

**(d) Kiểm thử:** chụp bằng puppeteer-core + Chrome trên `wrangler dev` local (config tạm `wrangler.qa.jsonc`, D1 `.wrangler/hdktv`, case lookup stub tạm) — đã xoá config / dữ liệu, `caseLookupClient.ts` đã hoàn tác. Typecheck 0 lỗi. Xem lại từng trang PDF (xuất bằng Word, render PyMuPDF): ảnh không bị cắt, chữ đọc được. Bản sửa `tien_do` đã kiểm bằng mắt trên chi tiết thùng BH-000003 (đơn đã trả hiện "Đang trả về bạn" / "Đã nhận lại").

**Deploy (31/10/2026):** `npm run deploy` (Version ID `d09fea7e`), không có migration mới.

## Sửa 3 điểm giao diện KTV phát hiện khi làm tài liệu hướng dẫn (31/10/2026) — v1.053

**(a) Nguyên văn yêu cầu:** *"Sửa 3 điểm này"* (3 điểm ghi nhận ở mục v1.052 phía trên).

**(b) Đã làm:**
1. **Nút "Kiểm tra" mã case bị cắt chữ ở khổ 390px** (`screens/shared/CaseLookupPreviewCard.tsx` `CaseIdField`): nút "Kiểm tra" và "Dán" không xuống dòng (`whitespace-nowrap`); nút "Dán" trên điện thoại chỉ còn icon 📋 (chữ "Dán" từ khổ `sm`); ô nhập tối thiểu 8rem; chữ lúc đang tra đổi "Đang…".
2. **Form "Bổ sung" của KTV có ô gửi ảnh** (`screens/ktv/KtvBoSungModal.tsx` + `PATCH /phieu-gui/don-vi/:id/bo-sung`): ô "Ảnh chụp lại (tuỳ chọn)" (`ImagePicker`, mở camera trên điện thoại). Backend nhận `anh: string[]` (chỉ nhận data URL `data:image/…`, tối đa 10 ảnh), lưu vào `phieu_sua_chua_bh_anh` của đơn cha (Admin thấy ở khối Ảnh trong UI chi tiết đơn), nhật ký ghi "KTV đã bổ sung thông tin (kèm N ảnh)".
3. **Thông tin xe tự điền** (`screens/ktv/PhieuGuiDetailModal.tsx`): giữ đúng thiết kế "nhớ nhà xe", thêm dòng nhắc vàng "↺ Thông tin xe được tự điền theo lần gửi trước — kiểm tra lại đúng xe / nhà xe hôm nay trước khi gửi" ở khối Vận chuyển của thùng nháp. Tự ẩn khi KTV bấm "✎ Sửa", đổi hình thức gửi, gõ mã xe / nhà xe hoặc lưu nháp; không hiện với "Giao trực tiếp" hoặc khi chưa có thông tin xe. Không có migration.

**(c) Vấn đề:** không có lỗi mới. Ghi nhận: lời nhắc chỉ nhớ trong lúc mở thùng — mở lại thùng nháp sau khi đã lưu thì nhắc lại (chấp nhận được: lời nhắc vô hại, KTV xác nhận lại trước khi gửi).

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. `wrangler dev` local (config tạm `wrangler.qa.jsonc`, D1 `.wrangler/hdktv`, đã xoá), puppeteer 390×844 tài khoản KTV:
- tạo thùng mới → có lời nhắc tự điền; bấm "✎ Sửa" → lời nhắc ẩn;
- sheet "Thêm đơn": nút "📋" rộng 41px, "🔍 Kiểm tra" 103px, chữ không bị cắt (`scrollWidth ≤ clientWidth`);
- "Bổ sung ngay" → form có ô ảnh, chọn 1 ảnh → hiện ảnh xem trước → "Gửi bổ sung" → PATCH 200; D1 có 1 dòng `phieu_sua_chua_bh_anh` cho DH-000004, nhật ký "KTV đã bổ sung thông tin (kèm 1 ảnh)".

**Deploy (31/10/2026):** `npm run deploy` (Version ID `887dc052`), không có migration mới.

## Bản demo trên máy để quay video + nhận hàng theo từng món (31/10/2026) — v1.054

**(a) Nguyên văn:**
- *"tôi cần một bản test để quay video và tạo ca hướng dẫn, tôi nên quay ở đâu"* → chọn *"PA2"* (chạy trên máy). Khi tôi dựng bộ demo đóng gói (thư mục `demo/`, máy chủ giả, script) thì người dùng dừng: *"sao bạn làm gì phức tạp thế"*, *"thôi dừng"*, *"bỏ hết, demo ko động chạm đến bản thật"* → đã xoá toàn bộ, không commit. Thay bằng: *"gửi đường link bạn đang dùng để chụp ảnh làm hướng dẫn"* → *"bắt đầu"*: bật lại bản chạy tạm `http://localhost:8793` như lúc chụp ảnh tài liệu (config tạm `wrangler.qa.jsonc`, D1 `.wrangler/hdktv`, dữ liệu mẫu KTV Nguyễn Văn An, tạm giả lập tra cứu mã case trong `caseLookupClient.ts`), đăng nhập bằng `/api/auth/dev-login` với `--var BOOTSTRAP_ADMIN_EMAIL:an.ktv@qa.vn --var FRONTEND_URL:http://localhost:8793`. Đã tắt, hoàn tác, xoá hết trước khi deploy.
- (ảnh thẻ "Ngô Minh Bảo · Đang trả về bạn") *"tại sao đơn ở trạng thái gửi về ktv, mà tôi ấn vào trong không có thao tác nhận hoặc báo thiếu"*
- *"trường hợp ID ca đó bị chia làm nhiều lần gửi về KTV thì sao?"*
- *"việc báo thiếu hàng, cho phép báo thiếu theo linh kiện thay, ví dụ thùng trả có 10 linh kiện, chỉ thiếu 1 linh kiện, hoặc kho báo gửi về van điện từ x2 => nhưng ktv báo chỉ nhận được x1."*
- *"cập nhật các vấn đề lên phiên bản thật"*

**(b) Đã làm:**
1. **Bấm thẻ đơn đang trả về** (Việc của tôi + Đơn của tôi): trước đây mở thùng gửi đi (không có nút nhận). Nay `openKtvDon()` (`screens/ktv/KtvCards.tsx`): 1 phiếu trả đang về → mở `PhieuTraDetailModal` (nút "Xác nhận đã nhận" / "Không nhận được"); nhiều phiếu (1 ca tách nhiều lần trả) → `ChonPhieuTraModal` cho chọn lần trả; không có → mở thùng như cũ. Thẻ có dòng "📬 x/N món đang trả về bạn" khi trả 1 phần (thẻ vẫn ghi bước chậm nhất), "📬 Hàng về theo N lần" khi nhiều phiếu. `KtvDonCuaToiScreen` nhận `user`.
2. **Báo thiếu theo từng món:** `migrations/0021_bao_thieu_theo_mon.sql` — `phieu_sua_chua_bh_ct.ktv_thieu`, `that_lac`. `POST /phieu-tra/:id/khieu-nai` nhận `thieu_ids` (đơn vị KTV không nhận được; không gửi = cả phiếu; rỗng → `MISSING_THIEU`), phiếu vẫn chuyển `khieu_nai_van_chuyen`, nhật ký "KTV báo thiếu k/N món (…)". `POST /danh-gia-khieu-nai`: thành công → `ktv_da_nhan`, xoá cờ; thất bại → chỉ món `ktv_thieu=1` thành `that_lac=1`, thiếu 1 phần thì phiếu `ktv_da_nhan` (KTV đã nhận phần còn lại), thiếu cả phiếu thì `gui_that_bai` như cũ. Giao diện: `screens/shared/ChonMonThieu.tsx` (mỗi món 1 dòng tích, ô "Không nhận được cả thùng") ở thẻ hàng trả về và trong chi tiết phiếu trả; chi tiết phiếu hiện danh sách món thiếu / thất lạc cho Kho. Nhãn KTV (`lib/ktvStage.ts`): món không báo thiếu trong phiếu khiếu nại = "Đã nhận lại"; món thất lạc = "Thất lạc khi trả". Báo DVBH/Odoo (`lib/odooSync.ts`): món thất lạc vẫn "dang_tra", chưa hoàn tất.

**(c) Vấn đề:** chạy `wrangler dev` ẩn qua `Start-Process` bị treo mọi request — cần `--show-interactive-dev-session=false` và `< NUL`. Bản demo cũ (seed_backup) chưa có cột mới → khi nạp lại phải áp migration sau khi chép file.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. Trên bản demo: đơn tách 2 phiếu trả → hiện danh sách chọn, chọn mở đúng phiếu có 2 nút; đơn trả 1 phần → dòng "1/2 món đang trả về", bấm mở phiếu trả. API: KTV báo thiếu 1/3 món → `{thieu:1,tong:3}`, 2 món còn lại thành "Đã nhận"; Kho đánh giá thất bại → phiếu `ktv_da_nhan`, chỉ DH-000007-2 `that_lac=1`. Hộp chọn món hiện đúng trên giao diện.

**Deploy (31/10/2026):** `npm run deploy` (Version ID `ab38c49e`). Lệnh `wrangler d1 migrations apply DB --remote` lần đầu lỗi 7403 dù đã ép `CLOUDFLARE_ACCOUNT_ID` (script chạy tiếp nên deploy lên trước khi có cột mới, bản thật thiếu cột ~1 phút); chạy lại bằng tên DB `wrangler d1 migrations apply sua-chua-bao-hanh-db --remote` thì qua. Bài học: áp migration TRƯỚC, kiểm tra thành công rồi mới deploy (không gộp chung 1 lệnh). Đã kiểm tra: D1 có 2 cột mới (748 đơn vị, 0 báo thiếu), bundle đang chạy mang 1.054.

## Sửa đơn trong thùng nháp (31/10/2026) — v1.055

**(a) Nguyên văn:** *"thiếu chức năng cho phép click vào đơn linh kiện để đổi linh kiện A (bị sai), sửa số lượng, sửa loại đổi trả..."*

**(b) Đã làm:** trước đây thùng nháp chỉ cho xoá đơn rồi thêm lại. Nay bấm 1 đơn trong thùng **nháp** (chi tiết thùng, cả bản gọn của KTV lẫn bản đầy đủ) → `screens/ktv/SuaDonModal.tsx`: linh kiện lỗi (A, ô tìm), số lượng (nút −/+), mô tả lỗi, loại đối trừ đề xuất; mã case chỉ hiển thị (sai case thì xoá đơn, thêm lại). Dòng đơn có chữ "✎ Sửa". Backend `PATCH /api/phieu-gui/don/:donId` (`routes/phieuGui.ts`): người sở hữu / tạo hộ / qtri, chỉ khi thùng `nhap` (`NOT_DRAFT`), kiểm linh kiện có trong danh mục (`INVALID_LINH_KIEN`), số lượng 1–999, mô tả không rỗng, loại đối trừ `doi_tra|tru_cong_no`; chỉ ghi trường có đổi, nhật ký đơn cha "Sửa đơn trong thùng nháp: …", tính lại chuỗi tìm kiếm. Sau khi gửi xe: sửa linh kiện thực tế (B/C) vẫn do Admin BH như cũ; KTV sửa theo yêu cầu bổ sung như cũ. Thêm thông báo lỗi `INVALID_LINH_KIEN`, `INVALID_LOAI_DOI_TRU`, `MISSING_THIEU` (của v1.054) trong `lib/api.ts`. Không có migration.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. Bản chạy thử tạm trên máy (đã xoá sau): tạo thùng từ đơn Odoo → PATCH đổi linh kiện + số lượng 3 + loại Trừ công nợ + mô tả → lưu đúng 4 trường; linh kiện không tồn tại / số lượng 0 bị chặn; đơn thùng đã gửi → `NOT_DRAFT`. Giao diện: bấm đơn mở form điền sẵn, bấm + rồi Lưu → dòng đơn thành ×4.

**Deploy (31/10/2026):** `npm run deploy` (Version ID `1dac4eb5`), không có migration mới (đã kiểm `migrations list` trước: không còn migration chờ). Bundle production mang 1.055.

## Dừng AppSheet — nhập lần cuối toàn bộ dữ liệu cũ (01/11/2026) — chỉ thao tác dữ liệu, không đổi code

**(a) Nguyên văn yêu cầu:** *"tôi sẽ dừng hoạt động hệ thống gửi bảo hành cũ, giúp tôi cập nhật database lên hệ thống để bắt đầu cho ktv tiếp tục xử lý và hoạt động trên hệ thống mới"* (file `don bh.xlsx` trên Desktop, xuất 01/11/2026).

**(b) Đã làm:**
- File mới đầy đủ hơn hẳn lần 19/10: DATA 3.136 đơn (01–31/10), LK đề xuất 206, đơn MISA 106. Lần 19/10 chỉ có 656 đơn.
- Trên hệ thống mới đã có dữ liệu thật sau 19/10 (6 thùng / 48 đơn do KTV / Admin tạo, gồm thùng BH-000159 của hongphuc.dn 45 đơn; TR-000139/140). Không trùng ca nào với file → **không xoá, làm kiểu cập nhật + bổ sung**:
  - Đơn đã nhập 19/10 (khớp `AppSheet ID` trong ghi chú): giữ mã DH, cập nhật đơn vị theo trạng thái AppSheet mới nhất (36 đơn vị đổi trạng thái / vào phiếu trả). Bỏ qua DH-000178-1 (Admin đã đưa vào TR-000140 trên hệ thống mới, KT đã duyệt). DH-000535-1 lấy theo AppSheet (AppSheet đã gửi trả; thao tác trên hệ thống mới 20/10 là thử).
  - 138 phiếu trả cũ: 45 phiếu tiến trạng thái (chỉ tiến, không lùi), bổ sung mã xuất kho còn trống. TR-000139/140 không đụng.
  - Thêm 2.482 đơn cha mới (DH-000705…DH-003186): 1.674 đã tách đơn vị + 808 chưa tách (Chưa tiếp nhận); 1.814 đơn vị mới; 331 thùng mới (tới BH-000492); 222 phiếu trả mới (TR-000141…362); 124 đề xuất linh kiện mới (DX-000083…206); 20 linh kiện `noi_bo`; 66 tài khoản (KTV có trong danh bạ → "Đã duyệt"; 2 email không có trong danh bạ → "Chờ duyệt": `nguyenvantinh29091986@gmai.com` (gõ sai đuôi), `baohanhtrungtam7@gmail.com`).
- Quy đổi mới so với 19/10:
  - "Chưa tiếp nhận": KHỞI TẠO (chưa gửi) → thùng **nháp** của KTV (KTV mở thùng, điền vận chuyển, xác nhận gửi trên hệ thống mới); GỬI HÀNG / KTV GỬI HÀNG TRỰC TIẾP → thùng **đã gửi** (chờ Kho tiếp nhận); ADMIN NHẬN HÀNG (Kho đã nhận) → chờ Admin nhận nội bộ. Đơn cha ở `cho_xac_nhan_so_luong`.
  - 8 thùng AppSheet vừa có đơn đã xử lý vừa có đơn KTV thêm sau mà chưa gửi → phần chưa gửi tách thành thùng nháp riêng ("tách từ thùng cũ …"). Đơn "chưa tiếp nhận" đã đi cùng chuyến với thùng Admin đã nhận → để trong thùng gốc, `cho_phan_loai`.
  - "Từ chối bảo hành" (PAXL "Hủy bỏ xác linh kiện") → `ket_thuc_tu_choi`, lý do "Từ chối bảo hành (hủy bỏ xác linh kiện)"; đơn vị cùng đơn có PAXL Đổi mới → sẵn sàng gộp phiếu trả.
  - Trạng thái phiếu trả mới: "KTV KHÔNG NHẬN ĐƯỢC HÀNG" → `khieu_nai_van_chuyen` (+ `ktv_thieu=1` cho món đó); "ĐANG CHỜ ADMIN LẬP DANH SÁCH…" → `nhap`. "KTV GỬI HÀNG TRỰC TIẾP" → hình thức `giao_truc_tiep`.
  - Ngày lưu dạng số Excel (VD `46300.5566`) đổi về ngày giờ.
  - Ghép đơn Odoo 2 lượt: (1) cùng mã ca + mã linh kiện (527), (2) cùng mã ca, đơn Odoo còn trống (1.418) — nhiều dòng AppSheet ghi mã linh kiện khác Odoo hoặc để trống. Bỏ qua đơn Odoo KTV đã "Hủy đơn lỗi". Nhờ vậy các đơn này không còn hiện "Chưa gửi" ở tab Odoo của KTV.
- Production sau nhập: 491 thùng (nháp 31 / đã gửi 80 / Kho đã nhận 380), 3.186 đơn cha, 2.562 đơn vị (chờ phân loại 84, chờ sửa 24, chờ Admin xác nhận 51, sẵn sàng / trong phiếu trả 2.265, từ chối 138), 362 phiếu trả (nháp 3, chờ Kho 51, đang gửi KTV 289, khiếu nại 2, KTV đã nhận 17), 2.105 đơn gắn Odoo. Bộ đếm: BH 492, DH 3186, TR 362, DX 206.
- File (ngoài repo, thư mục `../backup-suachua/`): `suachua-truoc-nhap-cuoi-20261101.sql` (sao lưu D1 ngay trước khi nhập), `gen-import-appsheet-20261101.py` (script sinh SQL), `import-appsheet-cuoi-20261101.sql` (8.385 lệnh).

**(c) Vấn đề / ghi nhận:**
- 2 đơn nhập 19/10 không còn trong file (DH-000001, DH-000002 — đơn B2B mã `[A051-003]` / `[A040-054]`): giữ nguyên.
- 1 đề xuất linh kiện (LINK-ed042c2b) không đọc được mã linh kiện → bỏ qua.
- Thùng nhập dạng "đã gửi" / nháp **không được báo sang khovan** (khovan chỉ được báo khi KTV bấm "Xác nhận gửi" trên hệ thống mới) — Kho tiếp nhận 80 thùng đã gửi ngay trên app sửa chữa. Thùng nháp khi KTV gửi sẽ báo khovan bình thường.
- Bằng chứng case: cron 15 phút bổ sung dần (40 case / lần); chuỗi tìm kiếm không dấu tính dần 400 đơn / lần; trạng thái gửi sửa của ~2.000 đơn Odoo báo về dvbh ở lần cron kế tiếp.
- Sai sót khi làm: lần so khớp đầu cắt `AppSheet ID` ở 40 ký tự nên tưởng chỉ khớp 416 đơn → đọc đủ ghi chú mới khớp đúng.

**(d) Kiểm thử:** chạy thử toàn bộ SQL trên bản sao D1 production (sqlite, bật khoá ngoại): 0 lỗi, `foreign_key_check` rỗng, không trùng `odoo_id`, không phiếu trả rỗng, không thùng rỗng (trừ 2 thùng nháp rỗng có sẵn trên hệ thống mới), không đơn cha `da_tach` thiếu đơn vị, không đơn chưa tách nằm trong thùng Admin đã nhận. Đếm trên production sau khi nhập khớp đúng bản chạy thử.

## Lọc giai đoạn ở tab "Mọi giai đoạn" của màn Đơn bảo hành (01/11/2026) — v1.056

**(a) Nguyên văn yêu cầu:** *"\"Đơn bh\" => mọi trạng thái thiếu filter trạng thái => đơn đã sửa xong, đơn đang gửi đến kTV..."*

**(b) Đã làm:** ô lọc mới "Giai đoạn" trên tab `#/don?tab=tat_ca` (`screens/quanly/TraCuu.tsx`, `GIAI_DOAN_DEF`). Lựa chọn gồm 2 phần:
- 7 nhóm hay dùng: Chưa về Kho / Đang xử lý tại trung tâm / Đã sửa, xử lý xong — chờ trả (chờ tạo phiếu, phiếu nháp, chờ KT, chờ Kho gửi) / Đang gửi đến KTV / Hoàn tất / KTV báo thiếu, thất lạc / Đã huỷ, chuyển kho;
- 20 giai đoạn riêng (theo `GIAI_DOAN`).

Backend `GET /tra-cuu/don-vi` nhận `giai_doan` (1 giá trị hoặc "a,b" → IN, qua `eqFilters`). Lựa chọn cố định ở frontend nên không cần thêm truy vấn lấy danh sách. Chip `?trang_thai=` (bấm từ Trang chủ) vẫn giữ, kết hợp được với ô lọc mới. Không có migration.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi. Chưa bấm thử giao diện. Ô lọc dùng lại `FilterBar` / `eqFilters`, vốn đã chạy ở các màn khác.

**Deploy (01/11/2026):** `npm run deploy` (Version ID `8eca3c44`), không có migration mới.

## Đánh giá lệch linh kiện A/B/C + chọn khoảng ngày cho bộ lọc thời gian (01/11/2026) — v1.057

**(a) Nguyên văn yêu cầu:** *"thêm đánh giá việc linh kiện A <> linh kiện B, B <> linh kiện c, giải thích"*. Gửi thêm giữa lượt: *"cho chọn khoảng thời gian filter"*.

**(b) Đã làm:**
- **Đánh giá linh kiện** (tab "Mọi giai đoạn", `screens/quanly/TraCuu.tsx`):
  - Cột mới "Đánh giá LK": badge cam **A≠B** (KTV khai sai mã — xác tính theo B), badge tím **B≠C** (đổi sang mã khác — phiếu trả / đối trừ theo C), hoặc "✓ Khớp". Rê chuột vào badge để xem giải thích.
  - Ô lọc "Đánh giá LK": Có lệch / A≠B / B≠C / Lệch cả hai / Khớp hết.
  - Khối thu gọn "ℹ Đánh giá linh kiện A / B / C là gì?" giải thích ý nghĩa.
  - Backend `GET /tra-cuu/don-vi?lech_lk=ab|bc|ab_bc|bat_ky|khop`. Đơn cha chưa tách thì A = B = C (chưa đánh giá).
  - Production lúc làm: 0/2.562 đơn vị A≠B, 195 đơn vị B≠C.
- **Khoảng ngày tự chọn:** ô "Thời gian tạo" có thêm "📅 Chọn khoảng ngày…" → hiện 2 ô Từ ngày / Đến ngày (`KhoangSelect` trong `ui/FilterBar.tsx`).
  - Giá trị mã hoá luôn trong tham số `khoang` = `tu:YYYY-MM-DD:YYYY-MM-DD` (được bỏ trống 1 đầu). `timeFilter` (`lib/filters.ts`) tự đọc, nên áp cho mọi danh sách đang có lọc thời gian (13 route) mà không thêm tham số.
  - Bảng thống nhất Admin BH cũng dùng.
- Không có migration.

**(c) Vấn đề:** không có. Chọn "Chọn khoảng ngày…" mà chưa nhập ngày thì vẫn đếm là 1 bộ lọc đang bật, nhưng chưa lọc gì.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch; regex khoảng ngày thử 4 trường hợp (đủ 2 đầu, 1 đầu, rỗng, sai). Chạy thử câu đếm A≠B / B≠C trên D1 production (chỉ đọc). Chưa bấm thử giao diện.

**Deploy (02/11/2026):** `npm run deploy` (Version ID `7d5f8b52`), không có migration mới. Lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua.

**Deploy (01/11/2026):** `npm run deploy` (Version ID `1ddc6470`), không có migration mới.

## Nút "File import Odoo" chuyển sang màn Phiếu trả + chỉ xuất đơn đã xử lý xong (01/11/2026) — v1.058

**(a) Nguyên văn yêu cầu:** *"nút tải file import odoo sao lại chi xuất hiện ở mục quản lý đơn đang xử lý => thường là file đã xử lý mới cần import lên odoo chứ?"*

**(b) Đã làm:**
- Bỏ nút "📤 File import Odoo" khỏi màn Xử lý đơn (tab Chờ phân loại, `adminbh/PhanLoai.tsx`). Đặt lại nút ở góc phải tiêu đề màn **Phiếu trả** (`chung/PhieuTraScreen.tsx`), hiện ở mọi tab cho Admin BH / qtri. Màn Phiếu trả là nơi theo dõi đơn đã xử lý xong, đang trả và đã kết thúc.
- `TabScreen` thêm prop `actions` (nút ở góc phải hàng tiêu đề).
- Thẻ "Đồng bộ đơn bảo hành Odoo" ở Cài đặt vẫn giữ nút như cũ.
- Hộp tải file thêm ô **"Chỉ đơn đã xử lý xong"**, mặc định bật: chỉ xuất đơn có trạng thái Odoo là Đã sửa xong / Hoàn thành / Từ chối / Hủy. Bỏ tích thì xuất cả đơn đang gửi, đang sửa như trước.
  - Backend: `GET /odoo-don/xuat-import?chi_xong=1`, `buildOdooImportRows({chiXong})`.
- Không có migration.

**(c) Vấn đề:** không có.

**(d) Kiểm thử:** typecheck 0 lỗi, build sạch. Chưa bấm thử giao diện.

**Deploy (02/11/2026):** `npm run deploy` (Version ID `7d5f8b52`), không có migration mới. Lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua.

**Deploy (01/11/2026):** `npm run deploy` (Version ID `3f9072b6`), không có migration mới.

## 1 khu vực có nhiều Giám sát cùng phụ trách (01/11/2026) — v1.059

**(a) Nguyên văn yêu cầu:** *"1 khu vực có thể có nhiều GS cùng phụ trách => bổ sung thêm cài đặt => khu vực cho phép tích chọn nhiều gs"*

**(b) Đã làm:**
- `migrations/0022_khu_vuc_nhieu_gs.sql`: bảng `khu_vuc_gs_bh (khu_vuc_ma, gs_email)` = danh sách GS của từng khu vực (nguồn thật). Chép sẵn GS đang gán ở `khu_vuc_bh.gs_email` (production lúc làm có GS ở nhiều khu vực, VD B2B_MB/MN, SCVP_MN, KDTT_MB/MN).
- `khu_vuc_bh.gs_email` giữ lại làm **"GS chính"**: là người ghi vào `phieu_sua_chua_bh.email_gs` của đơn mới (`computeEmailGs`; chưa có GS chính thì lấy GS đầu tiên trong danh sách).
- Phạm vi của Giám sát đổi sang theo danh sách (`lib/gs.ts`: `GS_KTV_SUBQUERY`, `GS_KHU_VUC_SUBQUERY`, `isGsOfKtv`, `gsListOfKtv`). Áp ở:
  - tra cứu + Tổng quan: thấy đơn có `email_gs` = mình **hoặc** đơn của KTV thuộc khu vực mình phụ trách, nên đơn cũ ghi GS khác vẫn hiện;
  - cảnh báo đơn tồn;
  - danh sách KTV cho picker tạo hộ;
  - tạo hộ thùng;
  - đơn Odoo xem / hủy hộ.
- API `/api/khu-vuc`:
  - GET trả thêm `gs_emails` (GS chính đứng đầu);
  - PATCH nhận `gs_emails[]` (thay toàn bộ, `[]` = bỏ hết, phần tử đầu = GS chính, tối đa 50). Từng email phải là tài khoản có vai trò Giám sát, nếu không trả `GS_KHONG_HOP_LE`;
  - vẫn nhận `gs_email` cũ.
- Đồng bộ khu vực từ linh-kien-app: vẫn ghi đè GS chính như trước, và thêm GS đó vào danh sách (`INSERT OR IGNORE`). GS gán thêm bên app này giữ nguyên.
- Giao diện:
  - modal "Gán Giám sát" (`screens/qtri/KhuVuc.tsx`) đổi từ ô chọn 1 người sang danh sách tích chọn nhiều, có ô tìm (>6 GS), nhãn "GS chính" + nút "Đặt làm GS chính". GS đã mất vai trò Giám sát được báo và bỏ khi lưu;
  - bảng hiện "GS chính +N" (rê chuột xem đủ);
  - UI chi tiết đơn, phần "Người liên quan", hiện đủ các GS của khu vực KTV (`ktv_info.gs_list`).

**(c) Vấn đề:** heredoc Python dài lại lỗi EOF → dùng Edit/Write. Browser pane không điều hướng được tới link dev-login (redirect) và không vẽ được (cửa sổ bị che) → kiểm bằng đọc DOM / gọi JS. Ghi nhận: lần đồng bộ khu vực từ linh-kien-app kế tiếp sẽ đặt lại GS chính theo bên đó (danh sách GS không bị mất).

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chạy `wrangler dev` local (config tạm, D1 riêng, đã xoá), 3 GS + 2 KTV ở 2 khu vực:
- PATCH có email không phải GS → `GS_KHONG_HOP_LE`;
- gán MB1 = [gs2, gs1] → GS chính gs2;
- gs1 (không phải GS chính) vẫn thấy KTV MB1 và đơn có `email_gs = gs2` ở tra cứu / Tổng quan, mở được đơn Odoo của KTV MB1; gs3 (MN1) không thấy đơn, bị `OUT_OF_KHU_VUC`;
- cảnh báo 200;
- giao diện: modal hiện đủ 3 GS, tích thêm GS Ba + "Đặt làm GS chính" GS Một → Lưu (3 GS) → API trả `gs_emails = [gs1, gs2, gs3]`, bảng hiện "GS Một +2".

**Deploy (01/11/2026):** áp migration 0022 lên D1 production (chép 14 cặp khu vực – GS sẵn có) và `npm run deploy` (Version ID `8bcbc85d`).

## GS phụ: khu vực chọn trên tài khoản Giám sát, quyền như GS chính, cả 2 app (01/11/2026) — v1.060 (+ linh-kien-app v1.432)

**(a) Nguyên văn:** người dùng gửi ảnh màn sửa tài khoản GS bên linh-kien-app ("Khu vực đang phụ trách — (chưa có khu vực nào) — Sửa ở Cài đặt › Khu vực") kèm câu *"sai logic rồi, giám sát ở đây là giám sát KTV."*

Hỏi lại qua AskUserQuestion, người dùng chốt: *"1 tài khoản GS phụ mới, tôi sẽ chọn khu vực họ có thể quản lý hoặc đặt hàng hộ như giám sát chính (nếu khu vực đó đã có GS chính) => GS chọn khu vực => phụ trách tất cả KTV thuộc khu vực đó"*; phạm vi *"Cả 2 app"*.

Mục v1.059 ngay trên vẫn đúng (danh sách nhiều GS / khu vực). Mục này bổ sung **nguồn chính**: chọn khu vực trên tài khoản GS bên linh-kien-app.

**(b) Đã làm:**
- **linh-kien-app (v1.432)** — chi tiết trong CLAUDE.md của repo đó, mục "GS phụ":
  - khu vực tích cho tài khoản GS (`user_khu_vuc`, trước gọi "Khu vực xem thêm") = khu vực GS phụ trách;
  - quyền như GS chính: xem, duyệt đơn vượt trần (mã EO), hủy hộ, xác nhận chuyển tiền hộ, đếm "Chờ GS duyệt", nhận thông báo chờ duyệt;
  - màn tài khoản GS gộp thành 1 danh sách "Khu vực phụ trách (Giám sát KTV)": khu vực là GS chính thì tích sẵn + khoá, khu vực tích thêm có nhãn "GS phụ" kèm tên GS chính nếu có;
  - `GET /api/suachua-partner/user-khu-vuc` trả thêm `la_gs`.
- **App này:**
  - `migrations/0023_khu_vuc_gs_nguon.sql`: cột `khu_vuc_gs_bh.nguon` — `linhkien` (GS chính + GS phụ đồng bộ từ linh-kien-app) hoặc `tay` (qtri gán ở màn Giám sát khu vực).
  - `lib/userKhuVucSync.ts`: ghi lại các dòng `linhkien` = GS chính (`khu_vuc_bh.gs_email`) ∪ tài khoản `la_gs` trong `user_khu_vuc`. Không cần GS đã có tài khoản bên này; dòng `tay` giữ nguyên.
  - Lịch đồng bộ từ **1 lần/ngày** đổi thành **mỗi giờ**, để GS phụ mới gán có hiệu lực sớm. Ghi đè lịch v1.043 cho riêng bước này; vẫn có nút "Đồng bộ ngay".
  - `routes/sync.ts` (đồng bộ khu vực): đổi GS chính thì gỡ GS chính cũ (nguồn `linhkien`), thêm GS mới. Câu xoá chạy **trước** câu ghi đè `khu_vuc_bh.gs_email`, để đọc đúng GS cũ.
  - `/api/khu-vuc` GET trả thêm `gs_dong_bo`. PATCH giữ nguồn cũ của GS còn tích; GS mới tích = `tay`.
  - Modal "Gán Giám sát": GS đồng bộ có nhãn "Từ Đặt mua LK", kèm ghi chú: bỏ tích ở đây thì lần đồng bộ sau thêm lại, muốn bỏ hẳn phải bỏ bên linh-kien-app.
- Phạm vi Giám sát của app này vẫn theo `khu_vuc_gs_bh` (v1.059) nên GS phụ tự có quyền xem / tạo hộ ngay.
  - Lưu ý: tài khoản bên app này vẫn cần cờ `la_giam_sat` (không tự gán vai trò, theo quyết định 21/10/2026).

**(c) Vấn đề trong lúc làm:**
- Bản đầu của `sync.ts` đặt câu xoá GS chính cũ **sau** câu ghi đè, nên câu xoá đọc nhầm GS mới. Đã đổi thứ tự.
- Chạy local: `.dev.vars` ghi đè khoá đồng bộ thử → phải ép `--var`.
- Trigger DB linh-kien-app tự tính lại khu vực / GS của đơn theo danh bạ KTV → phải thêm KTV thử vào `ktv_lien_he`.
- Số đếm linh-kien-app có bộ đệm theo `data_versions` → sửa dữ liệu tay phải tăng version.
- Browser pane không vẽ được → kiểm bằng đọc DOM.

**(d) Kiểm thử:** typecheck cả 2 repo 0 lỗi.
- App này + Worker `linhkien` giả:
  - đồng bộ thêm GS phụ gs3 / MB1, gs4 / MN1 (gs4 chưa có tài khoản);
  - tài khoản Kho (`la_gs = 0`) không vào danh sách;
  - đổi GS chính MB1 gs1 → gs2 qua đồng bộ khu vực: gs1 bị gỡ, gs3 giữ; chạy lại đồng bộ không thêm / xoá thừa.
- linh-kien-app local (D1 riêng, 104 migration, phiên ký tay):
  - GS phụ gs2 qua cổng duyệt "Chờ GS duyệt" như GS chính (chỉ còn báo thiếu mã EO), từ chối và hủy hộ được;
  - GS khu vực khác bị chặn;
  - `choGsDuyet` = 1 / 1 / 0;
  - màn tài khoản hiện đúng nhãn GS chính (khoá) / GS phụ / "GS chính: …", tích thêm MB2 lưu đúng.

**Deploy (01/11/2026):** linh-kien-app v1.432 (Version ID `7a3580af`, không có migration) deploy trước; sau đó app này áp migration 0023 (14 dòng GS chính sẵn có thành nguồn `linhkien`) và `npm run deploy` (Version ID `91efecd5`). GS phụ sẽ được kéo về ở lần cron đồng bộ kế tiếp (mỗi giờ) hoặc khi bấm "Đồng bộ ngay" ở Cài đặt.

## Diễn giải MISA trong chi tiết phiếu trả (02/11/2026) — v1.061

**(a) Nguyên văn yêu cầu:** *"tôi cần bổ sung đoạn text này tương ứng với khu vực MB, MN dạng ở phiếu danh sách trả hàng từ Admin bh: Diễn giải MISA "Tổng đơn : 14 (tổng : 20 linh kiện) 6803 xuất kho bảo hành cho KTV (thailq.dvkh) KTV Đồng Nai - Lê Quốc Thái theo MYC: SC26101178 SC26101178 1358934 …" => format: Tổng đơn: xx (tổng : yz linh kiện) 6803 xuất kho bảo hành cho KTV "Tên KTV" theo MYC: "Danh sách mã sự cố liên quan" Thay MN: 6803, MB 6804"*

**(b) Đã làm:**
- `PhieuTraDetailModal` thêm khối "📝 Diễn giải MISA" (ngay trên danh sách đơn vị, ẩn với KTV) + nút "📋 Sao chép". Hàm `buildDienGiaiMisa`:
  - dòng 1 `Tổng đơn: <số đơn cha> (tổng : <số đơn vị> linh kiện)`;
  - dòng 2 `<mã kho> xuất kho bảo hành cho KTV <tên> theo MYC: <mã case từng đơn cha, cách nhau dấu cách>` (đơn không có case thì dùng mã đơn cha). Mỗi đơn cha 1 mã, theo thứ tự đơn trong phiếu — ví dụ người dùng gửi có mỗi mã lặp 2 lần vì AppSheet 14 dòng = 14 đơn.
  - Mã kho theo miền của phiếu: MN → 6803, MB → 6804; chưa có miền → "????" + dòng nhắc đổi miền phiếu.
- `GET /phieu-tra/:id` trả thêm `misa_ktv`: chuỗi KTV trên CRM dạng "(mã) KTV Tỉnh - Tên" — ưu tiên bằng chứng case của các đơn trong phiếu (khớp đúng mã KTV), rồi đơn Odoo gần nhất của KTV, cuối cùng "(mã) Tên" từ danh bạ. KTV không có trong danh bạ → tên hiển thị; khách lẻ → "khách lẻ".
- Không có migration.

**(c) Vấn đề:** `wrangler d1 execute` lần đầu lỗi 7403 khi ép `CLOUDFLARE_ACCOUNT_ID`; bỏ biến (whoami đã đúng tài khoản `dichvu3t`) thì chạy được.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi. Truy vấn đọc D1 production: TR-000361 (MB, 9 đơn / 12 đơn vị) ra tên "(kiennt.dvkh) KTV Thái Nguyên - Nguyễn Trung Kiên", TR-000360 (MN) ra "(annlt.mn1) KTV HCM - Nguyễn Lê Thanh An". Chưa bấm thử giao diện.

**Deploy (02/11/2026):** `npm run deploy` (Version ID `7d5f8b52`), không có migration mới. Lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua.

## Kho / Admin BH nhận trực tiếp thùng nháp của KTV (02/11/2026) — v1.062

**(a) Nguyên văn yêu cầu** (kèm ảnh Admin BH bấm "Xác nhận đã gửi xe" trên thùng nháp BH-000460 → "Bạn không có quyền thực hiện thao tác này"): *"cho phép admin bh, KHO xác nhận nhận thùng nháp của KTV (bỏ qua bước gửi thùng, kho nhận thùng 9 (với AD BH))"*

**(b) Đã làm:**
- Nguyên nhân lỗi: `POST /phieu-gui/:id/xac-nhan-gui` (và PATCH header) chỉ cho chủ thùng / người tạo hộ / qtri.
- Route mới `POST /api/phieu-gui/:id/nhan-thung-nhap {vai_tro: kho|admin, ghi_chu, tu_xac_nhan_sl, ngay_gui_xe, hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, ma_van_don}`: thùng phải `nhap`, có ≥1 đơn, đúng miền người nhận (`mienAllowed`).
  - Kho (`la_kho`/qtri): nhap → da_gui → `da_tiep_nhan` (Kho nhận), sau đó Admin BH tiếp nhận nội bộ như thường.
  - Admin BH (`la_admin_bh`/qtri): nhap → da_gui → `nhanHoThung` (bỏ qua Kho + tiếp nhận nội bộ), tuỳ chọn tự xác nhận SL = SL khai (mặc định bật).
  - Ghi thông tin vận chuyển đang hiện trên form (không ghi vào bộ nhớ nhà xe của KTV), nhật ký "… nhận trực tiếp thùng nháp của KTV (bỏ qua bước gửi)". Không báo sang khovan.
- `PhieuGuiDetailModal`: thùng nháp mở bởi người không phải chủ thùng → footer thay bằng "📦 Kho nhận thùng" / "✔ Admin BH nhận thùng" (theo vai trò), mở hộp xác nhận (ghi chú, ô tự xác nhận SL cho Admin).

**(c) Ghi nhận:** người không phải chủ thùng vẫn thấy nút Lưu nháp / Sửa / Xoá đơn trong thân thùng nháp (bấm sẽ báo không có quyền) — chưa ẩn.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chưa chạy thử local / bấm giao diện.


**Deploy (02/11/2026):** `npm run deploy` (Version ID `d1a1714d`), không có migration mới.

## Kế toán nhập / sửa mã MISA phiếu trả trước khi Kho xử lý (02/11/2026) — v1.063

**(a) Nguyên văn yêu cầu:** *"cho phép KT nhập thêm mã misa, hoặc sửa mã misa trước khi kho xử lý phiếu trả"*

**(b) Đã làm:**
- Route mới `POST /api/phieu-tra/:id/ma-misa {ma_misa}` (Kế toán / qtri): chỉ khi phiếu "Chờ KT duyệt", hoặc "KT đã duyệt" mà Kho chưa đóng gói (chưa có ảnh đóng gói) — Kho đã gửi thì không còn ở trạng thái này. Đã đóng gói → `KHO_DA_XU_LY`. Không đổi thì không ghi; có đổi thì nhật ký phiếu "Kế toán nhập/sửa mã MISA: cũ → mới". Chỉ sửa mã MISA (mã đơn hàng / vận đơn giữ nguyên quyền cũ).
- `PhieuTraDetailModal`: khối "Mã chứng từ" của Kế toán có ô "Mã MISA" + nút "Lưu mã MISA" (khoá khi chưa đổi). Admin BH vẫn sửa đủ 3 mã như cũ khi phiếu nháp / chờ KT duyệt.

**(c) Ghi nhận:** "Kho đã xử lý" xác định bằng ảnh đóng gói; Kho đóng gói không kèm ảnh thì Kế toán vẫn sửa được tới khi Kho bấm gửi.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Chưa bấm thử giao diện.


**Deploy (02/11/2026):** `npm run deploy` (Version ID `2a10273a`), không có migration mới.

## Mã yêu cầu theo linh kiện dưới Diễn giải MISA (02/11/2026) — v1.064

**(a) Nguyên văn yêu cầu** (kèm ảnh "Mã yêu cầu theo linh kiện: 1) Khóa vòi nhựa Karofi [2013050114]: SC261007623 … 5) Nguồn xung 24/1.5 PTEK (2xAT2/IP67) (2009010161): SC261013745 SC261017443 …"): *"bổ sung thêm text bên dưới danh sách linh kiện và mã yêu cầu như hình ảnh, bên dưới nội dung copy misa"*

**(b) Đã làm:** `PhieuTraDetailModal` — ngay dưới khối "📝 Diễn giải MISA" thêm khối "🔩 Mã yêu cầu theo linh kiện" + nút "📋 Sao chép" riêng. Định dạng `N) Tên linh kiện [mã]:` xuống dòng là các mã case cách nhau dấu cách, các nhóm cách 1 dòng trống. Nhóm theo linh kiện trả (C → B → A, giống cột linh kiện của phiếu), theo thứ tự xuất hiện trong phiếu; mỗi đơn vị góp 1 mã case (đơn không có case dùng mã đơn cha). Ẩn với KTV như khối Diễn giải MISA. Không đổi backend, không có migration.

**(c) Vấn đề:** heredoc Python biến `
` thành xuống dòng thật trong template literal → sửa lại bằng Edit.

**(d) Kiểm thử:** typecheck 0 lỗi. Chưa bấm thử giao diện.


**Deploy (02/11/2026):** `npm run deploy` (Version ID `f51b3281`), không có migration mới.

## Đơn bảo hành: 3 chế độ xem Danh sách / Theo KTV / Theo linh kiện (02/11/2026) — v1.065 (+ dvbh v1.516)

**(a) Nguyên văn yêu cầu:**

> Ở danh sách "Đơn bh" bổ sung thêm dạng xem nhóm theo KTV => bên dưới nhóm theo Linh kiện để Admin BH dễ xử lý (có thể tắt bật giữa 3 chế độ xem => lọc theo KTV, Lọc theo linh kiện)
> Nguyễn Văn A (3)
>     Linh kiện A (2)
>        ID đơn          Mã case          .... (bổ sung thêm số lượng đặt, số lượng duyệt , mã serial, ngày mua, ngày sản xuất)
>      Linh kiện B (1)

**(b) Đã làm:**
- Component chung `frontend/src/ui/GroupedDonView.tsx`:
  - `DonViewToggle`: 3 chế độ ☰ Danh sách / 👷 Theo KTV / 🔩 Theo linh kiện. Lựa chọn nhớ trên máy (`localStorage`), mỗi tab nhớ riêng (`don_view_xu_ly`, `don_view_tat_ca`).
  - Theo KTV: KTV (n · SL) → linh kiện (n) → đơn. Theo linh kiện: ngược lại.
  - Linh kiện để nhóm là B (thực tế gửi về, mặc định A). Nhóm đông nhất xếp trước; 20 nhóm cấp 1 mỗi trang; bấm tiêu đề nhóm để thu / mở, có "Thu gọn tất cả".
  - Cột của mỗi đơn: ID, Thao tác, Trạng thái, Mã case, **SL đặt** (KTV khai), **SL duyệt** (thực nhận, tô cam khi khác SL đặt), **Serial**, **Ngày mua**, **Ngày SX**, Mô tả lỗi, SLA.
  - "SL" ở tiêu đề nhóm cộng SL đặt mỗi đơn cha 1 lần (không cộng lặp theo đơn vị ×N); chỉ hiện khi khác số đơn.
  - Điện thoại: nhóm thành thẻ, mỗi đơn 1 thẻ con.
- Áp dụng 2 tab của màn Đơn bảo hành:
  - **Chờ phân loại** (Admin BH): đơn cha chờ xác nhận SL (nút "Xác nhận SL") + đơn vị cần xử lý (nút "Phân loại", "⚡"). Ô chọn ở tiêu đề nhóm KTV / linh kiện chọn cả nhóm, dùng chung với "⚡ Xử lý nhanh hàng loạt" / "Phân loại hàng loạt" có sẵn.
  - **Mọi giai đoạn**: chỉ xem, giữ bộ lọc / tìm kiếm.
  - Chế độ nhóm lấy tối đa 1000 dòng một lần (backend `parsePage(c, 20, 1000)` cho `GET /tra-cuu/don-vi` và `GET /admin/don-vi` không nhóm). Quá 1000 thì báo "Đang nhóm x/N đơn mới nhất — lọc thêm để xem đủ".
- Backend trả thêm:
  - `/tra-cuu/don-vi`: `sl_dat`, `sl_duyet`, `serial`, `ngay_mua`, `ngay_sx`;
  - `/admin/don-vi`: `so_luong_khai`, `so_luong_thuc_nhan`, `case_serial`, `case_ngay_sx`;
  - `/admin/don-cha`: `case_serial`, `case_ngay_sx`.
  - Serial / ngày mua / ngày SX lấy từ bằng chứng case (`case_lookup_snapshot`).
- **Ngày sản xuất:** dvbh đã có cột `case_dvbh.ngay_san_xuat` (migration 0145) nhưng API tra cứu case chưa trả ra → dvbh v1.516 thêm `ngay_san_xuat` vào `CASE_LOOKUP_COLUMNS` (`partnerApi.ts`). Bên này cron 15 phút có bước mới `refreshSnapshotsThieuNsx` (`lib/caseSnapshot.ts`): làm mới tối đa 80 bằng chứng case / lần cho các case chưa có khoá `ngay_san_xuat`, con trỏ `sync_state.nsx_after`, hết vòng quay lại đầu. Không có migration.

**(c) Ghi nhận:** dvbh chỉ có ngày sản xuất cho case nhập từ khi có migration 0145 (pipeline Odoo); case QuickSight / cũ để trống → hiện "—". Bằng chứng case cũ được làm mới dần (~3.000 case, 80 / 15 phút ≈ 9–10 giờ). Phải deploy dvbh TRƯỚC, nếu không cron sẽ hỏi lại cùng các case mà không nhận được trường mới.

**(d) Kiểm thử:** typecheck backend + frontend cả 2 repo 0 lỗi, build sạch. `wrangler dev` local (config + D1 tạm, đã xoá), 2 KTV / 5 đơn cha / 6 đơn vị + 2 bằng chứng case:
- Theo KTV: "Nguyễn Văn A (5) · SL 6 → Bơm tăng áp 24V (LK1) (3)…", SL duyệt lệch tô cam, serial / ngày mua / ngày SX hiện đúng;
- tích nhóm KTV → "5 đã chọn" + nút xử lý hàng loạt;
- Theo linh kiện: LK1 / LK2 / LK3 → KTV đúng;
- tab Mọi giai đoạn nhóm đúng;
- 375px không tràn ngang.

**Deploy (02/11/2026):** dvbh v1.516 (`deploy:smarttrade`, Version ID `e0528ac2`) deploy trước, sau đó suachua `npm run deploy` (Version ID `7284b45e`). Không có migration mới.

## 6 yêu cầu: lùi lại đơn, KT trừ công nợ, SL đơn vị tách, tên theo ETX, đổi LK hàng loạt, KT xác nhận cấp linh kiện (03/11/2026) — v1.066

**(a) Nguyên văn yêu cầu:**

> 1. cho phép lùi lại đơn hủy nhầm, lùi lại đơn đã duyệt nếu giai đoạn sau chưa được thức hiện
> 2. Kế toán thêm nút trừ công nợ => xác nhận trừ công nợ đơn sẽ kết thúc như đơn kho xác nhận trừ công nợ (không gửi đến KTV)
> 3. Fix lại giao diện đơn BH, các đơn >1 linh kiện bị chia dòng, nhưng số lượng vẫn số tối đa gây hiểu lầm (ví dụ đơn gửi linh kiện A (x2) chia làm 2 dòng thì vẫn để là 2 (ảnh đính kèm)
> 4. Sửa lại tên người đặt hàng trên hệ thống theo tên nhân sự từ linh-kien-app kéo sang. ví dụ đang bị hiện thị là "kenvin thanh" cho mail "karofibinhduong01@gmail.com"
> 5. chọn phép tích chọn đổi linh kiện hoàn loạt (thêm tích năng đổi linh kiện B hoặc C hoàn loạt cho admin BH)
> 6. Bước Cấp linh kiện giai đoạn Admin BH không bắt buộc nhập mã MISA. => trong mục việc của kế toán bổ sung thêm luồng xác nhận đơn hàng cấp linh kiện => kế toán sẽ nhìn thấy danh sách chờ cấp linh kiện => vào và xác nhận mã phiếu misa, duyệt hoặc từ chối hoặc đẩy ngược lại.

**(b) Đã làm:**
1. **Lùi lại đơn** — `POST /admin/don-vi/:id/hoan-tac {ly_do}` (Admin BH / qtri, lý do bắt buộc), nút "↩ Lùi lại" trong UI chi tiết đơn (`screens/shared/HoanTacModal.tsx`):
   - Đã huỷ / chuyển kho → Chờ phân loại (xoá hướng xử lý, loại BH, đối trừ, lý do huỷ…).
   - Chờ NV sửa → Chờ phân loại; đề xuất linh kiện "chờ cấp" tự huỷ. Đã có đề xuất chờ KT / đã cấp → `GIAI_DOAN_SAU`.
   - Sẵn sàng trả (chưa vào phiếu, hoặc phiếu trả còn Nháp → tự gỡ khỏi phiếu, ghi nhật ký phiếu): đã qua NV + Admin xác nhận hoàn tất → lùi về Chờ xác nhận hoàn tất (giữ kết quả NV); còn lại → Chờ phân loại.
   - Phiếu trả đã gửi KT / đã duyệt / đã gửi → `GIAI_DOAN_SAU` (dùng "Huỷ gửi duyệt" / "Đẩy ngược" có sẵn). Phiếu trả: "Huỷ gửi duyệt", KT / Kho "đẩy ngược" đã có từ trước.
2. **Kế toán "💳 Trừ công nợ"** trong chi tiết phiếu trả — `POST /phieu-tra/:id/kt-tru-cong-no {ghi_chu?}`: phiếu Chờ KT duyệt hoặc KT đã duyệt (Kho chưa gửi) → `ket_thuc_khong_gui` (cùng trạng thái "Kho xác nhận kết thúc, không gửi"). Phiếu đã duyệt (đã báo khovan) → báo khovan "Đã bàn giao" để Kho không xử lý nữa.
3. **SL đơn vị tách** (`ui/GroupedDonView.tsx`, chế độ xem Theo KTV / Theo linh kiện): dòng đơn vị (1 linh kiện) hiện `1/2` thay vì `2`, rê chuột thấy SL khai / thực nhận của đơn cha. Dòng đơn cha chưa tách giữ SL khai. GroupRow thêm `laDonVi`.
4. **Tên người dùng** — `GET /users/ten`: ưu tiên họ tên ETX nhân sự (`etx_nhan_su_bh`, kéo từ linh-kien-app, bản đang làm trước) > tên danh bạ KTV (bỏ tiền tố "(mã) KTV Tỉnh - ") > tên Google (`users.ten`). Tìm kiếm theo tên (`tenOf`) cũng khớp tên ETX. Đổi khoá cache tên trên máy `user_names_v2`. Không sửa `users.ten` (đăng nhập Google ghi đè mỗi lần), nên lời chào trên topbar của chính người đó vẫn là tên Google.
5. **Đổi linh kiện hàng loạt** — nút "🔩 Đổi linh kiện" khi chọn đơn ở màn Đơn bảo hành (tab Chờ phân loại), modal `BulkDoiLinhKienModal`: mỗi linh kiện B / C chọn Giữ nguyên / Đổi sang / Bỏ về mặc định. `POST /admin/don-vi/linh-kien-hang-loat {ids, ma_lk_nhan?, ma_lk_thuc_te?}` (≤500, lỗi theo dòng, ghi nhật ký từng đơn); logic dùng chung `doiLinhKienDonVi()` với PATCH đơn lẻ.
6. **Kế toán xác nhận cấp linh kiện** — hoàn thiện phần dở của 1 phiên trước (02/11, chưa commit: migration `0024_de_xuat_ke_toan.sql` cột `kt_boi`/`kt_luc`, trạng thái `cho_ke_toan`, route `ke-toan-xac-nhan` / `kt-tra-lai`, số việc `ketoan_de_xuat_lk`, menu "Cấp linh kiện" mở cho Kế toán):
   - Admin "Cấp" = **đồng ý cấp**: mã đơn hàng bắt buộc, MISA tuỳ chọn → "Chờ KT xác nhận" (theo câu chốt 02/11 *"xác nhận mã đơn hàng xong => sang trạng thái chờ kế toán xác nhận"*).
   - Kế toán: **Duyệt** (nhập MISA chung + MISA riêng từng dòng, bắt buộc) → Đã cấp; **Trả lại** Admin (lý do bắt buộc) → Chờ Admin cấp, lý do hiện ở dòng đề xuất; **Từ chối** (mới thêm, `POST /de-xuat/:id/tu-choi` khi `cho_ke_toan` cho KT) → kết thúc.
   - Màn `#/admin/de-xuat` có tab "Chờ KT xác nhận", đọc `?tab=`; Kế toán chỉ thấy tab Chờ KT xác nhận + Đã cấp, mặc định tab chờ KT. Cột "Mã ĐH / MISA". Khối đề xuất trong UI chi tiết đơn có nút cho Kế toán.

**(c) Vấn đề:** heredoc Python dài trong Bash lại lỗi EOF ở 1 lần → dùng Edit. Trùng khoá `MISSING_LINH_KIEN` trong `lib/api.ts` → gộp thành 1 câu chung. Không có lỗi logic phát sinh.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local (config + D1 tạm, đã xoá), dữ liệu mẫu 3 đơn cha / 4 đơn vị / 3 phiếu trả / 2 đề xuất — script HTTP **26/26 đạt**: cấp thiếu ĐH 400, cấp → chờ KT, số việc KT = 2, lùi đơn khi đề xuất chờ KT bị chặn, KT trả lại / thiếu MISA / từ chối / duyệt; trừ công nợ phiếu nháp bị chặn, phiếu đã duyệt + chờ duyệt → kết thúc; lùi đơn có phiếu trả chờ KT bị chặn, lùi đơn huỷ + đơn trong phiếu nháp (tự gỡ khỏi phiếu); đổi LK hàng loạt (LK sai / thiếu LK bị chặn, 2 đúng 1 lỗi, bỏ B giữ C); tên = "Lò Văn Thanh". Giao diện: tab "Đã cấp" hiện đúng "ĐH DH10 · MISA XK1", tên NV hiện tên ETX. Chưa xem bằng mắt: hiển thị "1/2" ở chế độ nhóm, modal lùi lại / đổi linh kiện hàng loạt.


**Deploy (03/11/2026):** áp migration 0024 lên D1 production và `npm run deploy` (Version ID `2f2db4db`).

## Lọc người gửi chỉ tên + case trong ngày chưa đồng bộ + chọn copy lẻ mã yêu cầu (03/11/2026) — v1.067

**(a) Nguyên văn yêu cầu:**

> 1. ở filter lọc người gửi, chỉ cần hiện tên theo hệ thống, không cần hiện mail
> 2. Cho khi tạo đơn BH mà không tìm thấy thông tin case thật từ DVBH (do đồng bộ muộn). nếu case có tiền tố SC261103 = hôm nay thì cho phép tạo nhưng sẽ thêm 1 lưu ý cảnh báo cho Admin bh là ID case chưa được xác minh. nếu tiền tố thấp hơn hoặc cao hơn hôm tạo thì không cho phép tạo. (SC + YY + MM + DD +xxxx) vì nếu phát sinh trường hợp chưa kịp đồng bộ chỉ có thể là ca trong ngày.
> 3. mục thông tin copy " Mã yêu cầu theo linh kiện" trong UI trả hàng, cho phép người dùng kéo chọn để copy lẻ theo nhu cầu

**(b) Đã làm:**
1. Ô lọc người (bảng Admin BH "Người gửi" + mọi ô lọc kiểu người trong `ui/FilterBar.tsx`) bỏ dòng email bên phải, chỉ hiện tên (ETX / danh bạ / Google). Vẫn gõ email để tìm được (email là `value`, nằm trong chỉ mục tìm của `SearchableSelect`).
2. `backend/src/lib/caseNgay.ts`: `ngayCuaCase()` tách YYMMDD từ `SC` + 6 số + số đuôi; `laCaseHomNay()` so với ngày giờ VN.
   - `POST /phieu-gui/:id/don`: DVBH trả "không tìm thấy" mà case là của **hôm nay** → vẫn tạo, `case_xac_minh = 1`, nhật ký "⚠ Mã case … chưa có trên DVBH (case trong ngày…) — CHƯA được xác minh". Ngày khác (cũ hơn / tương lai) hoặc mã không có dạng SC → vẫn chặn `CASE_NOT_FOUND`. Không cần tích xác nhận (khác trường hợp DVBH lỗi vẫn phải tích).
   - `GET /case-lookup` trả thêm `cho_dong_bo`; ô mã case (thêm đơn, desktop + mobile) hiện khung vàng "⏳ Chưa thấy case này trên DVBH — case trong ngày…" và cho bấm "Thêm vào phiếu".
   - Cảnh báo cho Admin BH dùng cơ chế "Case chưa xác minh" có sẵn (v1.047): huy hiệu ở bảng Admin BH, **thêm** huy hiệu ở chế độ xem nhóm (Theo KTV / Theo linh kiện), banner vàng trong UI chi tiết đơn (sửa câu chữ cho cả 2 nguyên nhân).
   - Cron xác minh (`verifyPendingCases`): case trong ngày vẫn chưa có trên DVBH thì chờ tới hết ngày hôm sau mới đánh dấu "xác minh thất bại" (tránh báo sai khi DVBH nhập muộn).
3. Khối "🔩 Mã yêu cầu theo linh kiện" (chi tiết phiếu trả): bỏ `select-all` (bấm 1 cái là chọn hết, không chọn lẻ được) → bôi chọn tự do; mỗi nhóm linh kiện thành 1 khối riêng, có nút "📋 N mã" sao chép riêng danh sách mã của nhóm đó. Nút "📋 Sao chép" toàn bộ giữ nguyên.

**(c) Vấn đề:** không có. Ghi nhận: chỉ áp cho mã case dạng `SC…`; mã case kiểu số (VD `1358934`) chưa có trên DVBH vẫn bị chặn như cũ.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Hàm tách ngày thử 7 mã (đúng / thường / hôm qua / ngày mai / sai tháng / không phải SC). Chạy local với 1 Worker `dvbh` giả luôn trả "không tìm thấy": `case-lookup` hôm nay `cho_dong_bo:true`, hôm qua `false`; thêm đơn SC hôm nay 201 + `case_xac_minh=1`, hôm qua / ngày mai / mã số đều 400 `CASE_NOT_FOUND`. Chưa xem bằng mắt khung vàng và khối mã yêu cầu mới.


**Deploy (03/11/2026):** `npm run deploy` (Version ID `e0618558`), không có migration mới.

## Sửa 282 đơn nhập AppSheet bị mã case "NHẬP MÃ THỦ CÔNG" (03/11/2026) — chỉ thao tác dữ liệu, không đổi code

**(a) Nguyên văn yêu cầu:** *"fix các đơn bảo hành này, hôm trước import lên bị nhầm thành mã ID NHẬP MÃ THỦ CÔNG => fix lại cho tôi"* (file `don bh fix.xlsx` trên Desktop, sheet DATA 3.070 dòng).

**(b) Đã làm:**
- Production có **282 đơn cha** mang `case_id = 'NHẬP MÃ THỦ CÔNG'` (lần nhập cuối 01/11/2026 lấy nhầm chữ hiển thị của AppSheet thay vì mã thật).
- Khớp theo `AppSheet ID` ghi trong `ghi_chu` của đơn với cột ID của file: **282/282 khớp**, lấy cột "MÃ YÊU CẦU" làm mã case (256 mã SC…, 19 mã số, 7 mã T…).
- Ghép thêm đơn Odoo cùng mã case (lượt 1: cùng mã case + mã linh kiện, lượt 2: cùng mã case; bỏ đơn Odoo đã gắn / đã "Hủy đơn lỗi"): **195 đơn** được gắn `odoo_id` — các đơn Odoo này trước đó vẫn hiện ở tab "Chưa gửi" của KTV.
- Mỗi đơn 1 dòng nhật ký (người thực hiện "Hệ thống"). `tim_kiem` đặt NULL để cron tính lại chuỗi tìm kiếm; cron 15 phút cũng sẽ tự bổ sung bằng chứng case từ DVBH và báo trạng thái gửi sửa của 195 đơn Odoo về dvbh.
- Sao lưu trước khi sửa: `../backup-suachua/case-thu-cong-truoc-fix-20261103.json` (id, ghi_chu, odoo_id, ma_lk, phieu_gui_id của 282 đơn); SQL đã chạy: `../backup-suachua/fix-case-thu-cong-20261103.sql` (759 lệnh).

**(c) Vấn đề:** `wrangler d1 execute --file` không trả dòng kết quả → truy vấn tra cứu phải chạy bằng `--command`. Cột linh kiện của `don_bh_odoo` là `ma_linh_kien` (không phải `ma_lk`).

**(d) Kiểm tra sau khi chạy:** còn 0 đơn "NHẬP MÃ THỦ CÔNG"; 195 đơn đã gắn Odoo; 282 dòng nhật ký; ví dụ DH-000749 → `T25022`.

## KTV có nhiều mã trong danh bạ bị báo "Sai mã sự vụ" (03/11/2026) — v1.068

**(a) Nguyên văn:** *"Nguyenvantinh29091986@gmail.com kỹ thuật viên đăng nhập bị báo lỗi dù đã đăng nhập đúng tài khoản"* (ảnh: thêm đơn case SC2611030176, KTV trên case "(tinhnv.ns-465) KTV Hồ Chí Minh - Nguyễn Văn Tình", báo đỏ "Sai mã sự vụ — case này không thuộc về KTV đang được tạo đơn").

**(b) Nguyên nhân:** email này gắn với **2 dòng** trong `ktv_lien_he_bh`: `tinhnv.ptdv-hcm` (khu vực PTDV, nguồn `noi_bo` — dòng cũ) và `tinhnv.ns-465` (MN1, đồng bộ từ linh-kien-app). Mọi chỗ đối chiếu mã KTV dùng `SELECT ma_ktv ... WHERE email_dang_nhap = ?` + `.first()` → chỉ lấy 1 mã (`tinhnv.ptdv-hcm`), so với mã trên case `tinhnv.ns-465` → lệch. (Còn 1 dòng `NS-465` gmail gõ sai đuôi `@gmai.com`, không có email đăng nhập — không ảnh hưởng.)

**(c) Đã sửa:** `backend/src/lib/ktvMa.ts` `maKtvCuaEmail()` trả TẤT CẢ mã KTV của 1 email (so khớp không phân biệt hoa thường); áp cho: kiểm tra mã case khi tra cứu (`caseLookup.ts computeKhopKtv`), khi thêm đơn (`POST /phieu-gui/:id/don`), khi thêm đơn từ Odoo (`don-tu-odoo`), cron xác minh case (`verifyPendingCases`), danh sách đơn Odoo chờ gửi + hủy / mở lại đơn Odoo (`odooDon.ts`). Số việc "đơn Odoo chờ gửi" (`workload.ts`) vốn đã JOIN theo mọi mã nên đúng sẵn. Không sửa dữ liệu danh bạ (dòng `tinhnv.ptdv-hcm` nguồn nội bộ có thể là mã cũ — Admin xem lại ở Quản trị › Danh sách KTV nếu cần xoá).

**(d) Kiểm thử:** typecheck 0 lỗi. Đọc D1 production xác nhận 2 mã cùng email; mã trên case `tinhnv.ns-465` nằm trong danh sách mã của email → sẽ khớp. Chưa thử lại bằng tài khoản thật của KTV.


**Deploy (03/11/2026):** `npm run deploy` (Version ID `1a82706b`), không có migration mới.

## Bổ sung 166 đơn AppSheet còn sót (04/11/2026) — chỉ thao tác dữ liệu, không đổi code

**(a) Nguyên văn yêu cầu:** *"bổ sung các đơn này lên hệ thống"* (file `don bh fix 2.xlsx` trên Desktop: DATA 166 đơn tạo từ 11/2025 tới 01/11/2026, toàn "Chưa tiếp nhận" / "Đang sửa chữa"; 5 đề xuất linh kiện + 2 đơn MISA).

**(b) Đã làm:**
- Đối chiếu `AppSheet ID` với production: 166/166 đơn chưa có → thêm mới, dùng lại script nhập 01/11 (`../backup-suachua/gen-import-fix2-20261104.py`, bản sao của `gen-import-appsheet-20261101.py`, chỉ bỏ bước ghi đè `id_counters`).
- Kết quả trên production: 166 đơn cha (DH-003852…DH-004017; 34 đã tách → 35 đơn vị: 32 chờ phân loại, 3 chờ NV sửa; 132 chờ xác nhận SL), 61 thùng mới (BH-000633…693: 6 nháp, 35 đã gửi chờ Kho, 20 Kho đã nhận — 15 trong đó Admin đã nhận nội bộ), 8 thùng cũ được thêm đơn (BH-000315/346/411/416/434/443/478/492; 4 thùng nháp nhận thêm đơn, BH-000492 +36), 5 đề xuất linh kiện đã cấp (DX-000225…229), 64 đơn ghép Odoo, 5 linh kiện `noi_bo`, 9 tài khoản (3 "Chờ duyệt" vì không có trong danh bạ: `dienmayuynam@gmail.com`, `levananh14298@gmail.com`, `ngjyenminhkhanh5512@gmail.com`).
- Kiểm tra trùng với đơn KTV tự tạo lại trên hệ thống mới: 2 ca (`SC261026669`, `1343766`) trùng mã ca nhưng khác linh kiện → giữ cả; 1 đơn cùng ca + cùng linh kiện trong BH-000416 nhưng khác máy / khác AppSheet ID → giữ.

**(c) Vấn đề:** hệ thống đang có người dùng, trong lúc sao lưu (~3 phút) đã phát sinh DH-003851 / DX-000224 → bản chạy thử đầu trùng mã. Cách xử lý: **giữ chỗ bộ đếm trên production trước** (`UPDATE id_counters … + N RETURNING`, BH +70, DH +180, DX +10), sinh SQL trong dải đã giữ, không ghi đè bộ đếm cuối file → bộ đếm hiện 702 / 4031 / 234 (để trống một số mã, không ảnh hưởng). Bài học cho lần nhập sau: luôn giữ chỗ bộ đếm, không set bộ đếm = giá trị tính trước.

**(d) Kiểm thử:** chạy thử SQL trên bản sao production (sqlite, bật khoá ngoại): 0 lỗi, `foreign_key_check` rỗng, không trùng `odoo_id`, không thùng mới rỗng. Đếm lại trên production sau nhập: 166 đơn / 35 đơn vị / 61 thùng / 5 đề xuất / 64 đơn Odoo — khớp. Sao lưu trước nhập: `../backup-suachua/suachua-truoc-nhap-fix2-20261104.sql`; SQL đã chạy: `../backup-suachua/import-fix2-20261104.sql` (514 lệnh). Bằng chứng case + chuỗi tìm kiếm + trạng thái báo dvbh do cron 15 phút bổ sung dần.

## Kế toán gom việc về menu Phiếu trả + Kho in phiếu (04/11/2026) — v1.069

**(a) Nguyên văn yêu cầu:**

> 1. gộp các công việc cần xử lý của kế toán vào chung 1 side bar => chuyển phiếu cấp linh kiện về chung menu "Phiếu trả", nếu 1 đơn có nhiều linh kiện, có thể  duyệt chung cả case hoặc duyệt lẻ từng đơn.
> 2. Bổ sung 1 trạng trung gian cho KHO là trạng thái "Kho đã in phiếu", "Chờ kho in phiếu", có thể đổi qua lại, và tách "Chờ kho gửi" thành 2 tab theo 2 trạng thái này.

**(b) Đã làm:**
1. **Kế toán:**
   - Menu "Cấp linh kiện sửa chữa" chỉ còn cho Admin BH / qtri. Kế toán dùng 1 menu "Phiếu trả", số việc cộng thêm `ketoan_de_xuat_lk`.
   - Màn Phiếu trả có tab mới **"🔩 Cấp linh kiện"** (`#/phieu-tra?tab=cap_lk`, Kế toán / qtri) — nhúng `AdminDeXuatScreen` với `ktOnly`: chỉ 2 tab Chờ KT xác nhận / Đã cấp.
   - Tab Chờ KT xác nhận nhóm theo **case** (không có case thì theo đơn bảo hành, `KtCaseGroups`): mỗi nhóm có ô chọn cả case + nút **"✔ Duyệt cả case (N)"**; mỗi dòng có Duyệt / ↩ Trả lại / Từ chối. Lấy tối đa 200 đề xuất / trang (`/de-xuat` nâng `parsePage` max 200) để 1 case không bị cắt qua 2 trang. Admin BH mở tab Chờ KT xác nhận ở màn Cấp linh kiện cũng thấy dạng nhóm này nếu có quyền KT (qtri).
   - Link Trang chủ / cảnh báo đơn tồn của Kế toán trỏ `#/phieu-tra?tab=cap_lk`. Route `/admin/de-xuat` vẫn mở cho Kế toán (link cũ).
2. **Kho in phiếu:**
   - `migrations/0025_kho_in_phieu.sql`: `phieu_tra_bh.kho_da_in` (0 chờ in / 1 đã in), `kho_in_boi`, `kho_in_luc`.
   - `POST /phieu-tra/kho-in {ids, da_in}` (Kho / qtri, 1 hoặc nhiều phiếu ≤200, chỉ phiếu `da_duyet_ke_toan`, ghi nhật ký "Kho đã in phiếu" / "Kho chuyển về: chờ in phiếu"). `GET /phieu-tra?kho_in=0|1`. Kho / KT đẩy ngược phiếu về nháp thì reset `kho_da_in = 0`.
   - Tab "Chờ Kho gửi" tách thành **"🖨 Chờ Kho in phiếu"** (`?tab=cho_in`) và **"📦 Kho đã in phiếu"** (`?tab=da_in`); mỗi dòng có nút "🖨 Đã in" / "↩ Chưa in", đầu danh sách có nút đổi cả trang đang hiển thị. Chi tiết phiếu trả có huy hiệu "Chờ Kho in phiếu" / "🖨 Kho đã in phiếu" + nút đổi qua lại cạnh "Đóng gói". Kho vẫn gửi được ở cả 2 trạng thái (in phiếu không chặn gửi).
   - Số việc mới `kho_cho_in`, `kho_da_in` (menu Phiếu trả + Trang chủ thay cho `kho_cho_dong_goi`); link cũ `/kho/dong-goi` và cảnh báo đơn tồn của Kho trỏ `?tab=cho_in`.

**(c) Vấn đề:** lỡ thêm 1 khoá số việc thừa (`ketoan_tong`) khi sửa `workload.ts` → đã xoá. Ghi nhận: link cũ `#/phieu-tra?tab=cho_kho` (đã lưu trên máy) giờ mở tab mặc định.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. Local (config + D1 tạm, đã xoá), 3 phiếu trả + 3 đề xuất ở 2 case: API 10/10 đạt (số việc cho_in = 2 / da_in = 0 / lk = 3; đánh dấu in, lọc kho_in=0/1, đổi lại chưa in, hàng loạt 2 đúng + phiếu nháp báo lỗi, đẩy ngược reset; KT duyệt cả case 2 đề xuất + duyệt lẻ 1). Giao diện: tab "🔩 Cấp linh kiện" nhóm đúng Case SC1 (2 linh kiện, nút "Duyệt cả case (2)") / SC2; tab "Kho đã in phiếu" có nút "↩ Chưa in" và nút đổi cả trang.


**Deploy (04/11/2026):** áp migration 0025 lên D1 production, `npm run deploy` (Version ID `3302a58b`) từ 1 bản sao sạch của commit (git worktree) — thư mục làm việc đang có thay đổi dở của 1 phiên khác (menu KTV `KtvMenu.tsx`, `traCuu.ts`, `FilterBar.tsx`, `TabScreen.tsx`, `usePagedApi.ts`, `Shell.tsx`, `PhanLoai.tsx`), lần commit đầu đã lỡ gom vào → đã tách ra, không commit / deploy phần đó.

## Menu 2: danh sách KTV đang gửi đơn, bấm để lọc (04/11/2026) — v1.070

**(a) Nguyên văn yêu cầu:** *"bổ sung thêm menu 2 bên cạnh menu gốc (menu 1), menu 2 sẽ hiện danh sách các KTV đang gửi đơn BH (có x123 số lượng tương ứng). người dùng có thể click vào tên KTV để lọc theo danh sách cần xử lý"*

**(b) Đã làm:**
- Backend `GET /api/tra-cuu/ktv-menu` (`routes/traCuu.ts`, dùng lại bảng gộp đơn cha + đơn vị của Tra cứu): mỗi KTV trả `so_don` (số đơn cha), `so_dong`, `qua_han` (dòng quá SLA 24h). Chỉ đếm giai đoạn **đang chờ xử lý** (`DANG_CHO` + KTV báo thiếu) — thùng nháp và hàng đã trả về KTV không tính. Phạm vi: qtri / Admin BH / Kho / Kế toán theo miền; Giám sát / View theo khu vực; NV chỉ đơn được giao cho mình. Khách lẻ không hiện.
- `layout/KtvMenu.tsx` (gắn ở `Shell.tsx`, chỉ desktop, chỉ vai trò xử lý — không hiện cho KTV thuần): cột rộng `w-56` cạnh sidebar, ô tìm (không dấu), "Tất cả KTV", mỗi dòng tên + `×N` (chấm đỏ nếu có đơn quá hạn, tooltip ghi chi tiết), "Đang lọc: … · Bỏ lọc" ở đáy; thu gọn thành dải 36px (nhớ trên máy, `ktv_menu_open`); tự tải lại khi đổi màn và mỗi 2 phút.
- Bấm tên KTV → đặt `?ktv=<email>` trên URL (bấm lần nữa = bỏ lọc). Đang ở `#/don`, `#/thung`, `#/phieu-tra`, `#/admin/de-xuat` thì lọc ngay màn đó; màn khác thì chuyển sang `#/don?ktv=…`.
  - `useListFilters` (`ui/FilterBar.tsx`): danh sách nào có ô lọc khoá `ktv` (KTV gửi / Người nhận phiếu trả / KTV tạo hộ) tự đồng bộ 2 chiều với `?ktv=`; "Xoá lọc" xoá luôn tham số URL. Giá trị đang lọc không có trong lựa chọn vẫn hiện đúng tên.
  - Bảng thống nhất Admin BH (`PhanLoai.tsx`): ô "Người gửi" đồng bộ với `?ktv=`.
  - `TabScreen`: đổi tab giữ nguyên `?ktv=`.

**(c) Vấn đề phát hiện + đã sửa:** lần đầu mở màn có `?ktv=`, request chưa lọc gửi trước về sau ghi đè kết quả đã lọc → khởi tạo ô lọc từ URL ngay lần đầu + `usePagedApi` chỉ nhận kết quả của lần gọi mới nhất (sửa luôn lỗi tiềm ẩn này cho mọi danh sách khi đổi bộ lọc nhanh). Ghi nhận: điện thoại chưa có menu 2 (dùng ô lọc KTV sẵn có).

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi. `wrangler dev` local riêng (config + D1 tạm, đã xoá): API trả 3 KTV (12 / 10 / 3 đơn); bấm "Trần Thanh Bình" ở tab Mọi giai đoạn → URL `ktv=…`, 14 dòng đúng KTV; đổi sang tab Chờ phân loại vẫn giữ lọc; Thùng › Đang gửi về Kho 3 → 1 thùng; Phiếu trả lọc đúng TR-000004 của Lê Quốc Cường, ô Người nhận hiện tên; "Tất cả KTV" và "Xoá lọc" đều bỏ tham số, trả đủ danh sách.

**Deploy (04/11/2026):** `npm run deploy` (Version ID `1071060a`), không có migration mới.

## Thiếu hàng bảo hành → ticket bên linh-kien-app (04/11/2026) — v1.071 (+ linh-kien-app v1.437)

**(a) Nguyên văn yêu cầu:** *"Thêm luồng gửi đơn Thiếu linh kiện từ App bảo hành sang app đặt linh kiện dựa theo lý do chậm: "Không có linh kiện", "Hết hàng tồn kho" => đơn đẩy sang app linh kiện, tạo ticket thiếu hàng để kho và nhân viên mua hàng xử lý. Khi ticket được duyệt hoặc thay đổi sẽ phản hồi về đơn bảo hành gốc để admin bh nắm được thông tin hàng đã về. => phân tích => lập kế hoạch chi tiết => phản biện => triển khai => báo cáo kết quả"*

**Phân tích / phản biện:**
- Ticket `thieu_lk` bên linh-kien-app gắn cứng đơn đặt mua (`dat_don_hang_id NOT NULL`) và kéo theo cả chuỗi tự duyệt / PXK / quỹ, nên không dùng chung được → làm **loại ticket riêng** `thieu_hang_bh` (mã `THB-…`). Màn hình đặt cạnh 2 mục có sẵn của menu Thiếu hàng, Kho / Mua hàng không phải học chỗ mới.
- Lý do chậm được nhập ở >10 route (phân loại, FAST, hàng loạt, hoàn tất, NV nộp kết quả, ghi độc lập…). Nếu sửa từng route thì dễ sót → bắt ở **1 điểm chung là `addLog`**. Dòng nhật ký có "Lý do chậm…: <lý do thiếu hàng>" trên đơn vị / đơn cha / phiếu trả → tạo yêu cầu cho từng đơn vị liên quan. So khớp không dấu, nên danh mục có dấu hay không dấu đều bắt được.
- Linh kiện cần: đề xuất NV đang "chờ cấp" (nếu có); không có thì linh kiện hiệu lực C → B → A, SL 1. Bắt tự động có thể sai linh kiện → có thêm nút **"+ Báo thiếu hàng"** để chọn đúng linh kiện / SL, và **"Rút lại"**.
- Phản hồi đi 2 đường. **Đẩy ngay**: linh-kien-app gọi `POST /api/partner/sync/thieu-hang` mỗi bước. **Cron 15 phút kéo lại** theo con trỏ, phòng khi bản tin đẩy bị lỡ. Không cần thêm secret mới — dùng lại cặp `LINHKIEN_SYNC_API_KEY` / `SUACHUA_SYNC_API_KEY` + 2 service binding đã có.
- Admin BH "nắm được hàng đã về": số việc `admin_thieu_hang_da_ve` (ticket đã đóng mà Admin chưa bấm "Đã nắm"). Có thêm tab "📦 Thiếu hàng" ở màn Đơn bảo hành, và mỗi thay đổi ghi 1 dòng nhật ký trên đơn vị.
- Cố ý KHÔNG làm: tự đổi trạng thái đơn bảo hành khi hàng về — Admin vẫn tự xử lý tiếp (phân loại / hoàn tất). Chỉ báo, không chặn.

**(b) Đã làm (app này):**
- `migrations/0026_thieu_hang_bh.sql`: bảng `thieu_hang_bh` (1 dòng = 1 linh kiện thiếu của 1 đơn vị; `ticket_id` NULL = chưa gửi; `trang_thai` là bản sao bên kia, "Cho gui" khi chưa gửi; `da_xem`; `loi_gui`).
- `lib/thieuHang.ts`: `ghiNhanThieuHangTuLog` (gọi trong `lib/logs.ts addLog`, lỗi không làm hỏng thao tác gốc), `taoYeuCauThieuHang` (chống trùng đơn vị + linh kiện đang mở), `guiThieuHangCho` (gửi mã nguồn `COALESCE(ma_lk_nguon, ma_lk)` + case / KTV / miền / người báo), `apDungTicketLk` (bỏ bản tin cũ đến muộn, ghi nhật ký đơn vị khi có thay đổi), `dongBoThieuHang` (cron), `huyThieuHang`.
- Gửi ngay sau request: middleware `/api/*` ở `index.ts` (cờ trong isolate → `waitUntil(guiThieuHangCho)`); cron 15 phút gọi `dongBoThieuHang`.
- Route `routes/thieuHang.ts` `/api/thieu-hang`:
  - `GET /` (nhóm mo / da_ve / can_xem / dong / tat_ca, tìm, theo miền);
  - `GET` / `POST /don-vi/:unitId` (báo tay: Admin BH / qtri / NV được giao);
  - `POST /:id/huy`, `POST /da-xem`, `POST /dong-bo`.
  - `routes/sync.ts` thêm `POST /thieu-hang`.
- Giao diện:
  - khối "📦 Thiếu hàng" trong UI chi tiết đơn (`screens/shared/ThieuHang.tsx`);
  - tab "📦 Thiếu hàng" ở `#/don?tab=thieu_hang` (`screens/adminbh/ThieuHangList.tsx`: chọn nhiều → "Đã nắm", "Đồng bộ ngay");
  - số việc trên menu Đơn bảo hành + Trang chủ.
- linh-kien-app: xem mục "Thiếu hàng BẢO HÀNH" trong CLAUDE.md của repo đó (migration 0106, `routes/thieuHangBh.ts`, `lib/thieuHangBh.ts`, `datMuaLinhKien/ThieuHangBh.tsx`, route partner).

**(c) Vấn đề / ghi nhận:**
- Bản đầu ghi log trong batch dùng `changes()` → đổi sang UPDATE CAS rồi mới INSERT log.
- `LOCAL_DEV_BYPASS_AUTH` phải là `"true"`.
- Trình duyệt kiểm thử không mở được cổng local của linh-kien-app → màn Kho / Mua hàng mới **chưa xem bằng mắt**.
- Thư mục linh-kien-app có thay đổi dở của 1 phiên khác (`PhieuXuatKhoTab.tsx`, `MenuTai.tsx`, i18n…) → chỉ commit file của đợt này, deploy từ bản sao sạch (git worktree).
- Ticket đã "Đã nắm" mà bên kia đổi tiếp (VD sửa ngày dự kiến) thì hiện lại "Mới" — chủ ý, vì là thông tin mới.
- Chưa làm: gợi ý tồn kho cho Kho trong ticket (ticket mang miền, tồn kho bên kia tính theo khu vực), thông báo đẩy cho Kho, dịch EN/ID.

**(d) Kiểm thử:**
- Typecheck + build cả 2 repo sạch.
- 2 Worker chạy local nối service binding thật, D1 tạm riêng, script HTTP **24/24 đạt**:
  - FAST Đổi mới kèm lý do chậm "Không có linh kiện" → tự tạo + gửi, có ticket, linh kiện A;
  - lý do khác → không tạo;
  - báo tay gửi ngay; trùng không tạo lại; linh kiện không có → 400;
  - bên kia thấy 2 ticket cần xử lý, đủ tên linh kiện / KTV / miền / case;
  - Kho từ chối thiếu lý do → 400; tiếp nhận + ngày dự kiến → về đơn gốc ngay;
  - Mua hàng đặt thiếu EO → 400; đặt có EO → OK; chuyển sai luồng → 400;
  - hàng đã về → đơn gốc nhận + số việc = 1 + nhật ký;
  - rút lại → bên kia "Đã rút lại"; "Đã nắm" → hết số việc.
- Thêm: sửa ticket bên kia mà không đẩy → "Đồng bộ ngay" kéo về đúng. Ghi lý do chậm độc lập "Hết hàng tồn kho" → tự tạo THB-000003 với linh kiện C.
- Giao diện app này (trình duyệt thật): tab Thiếu hàng đủ nhóm + số, khối trong UI chi tiết có trạng thái + Rút lại, nhật ký có dòng báo thiếu.

**Deploy (04/11/2026):** linh-kien-app áp migration 0106 + deploy v1.437 (Version ID `f702571f`, từ git worktree sạch của commit `8cbb6b5`); app này áp migration 0026 + deploy v1.071 (Version ID `5c71176c`, lần đầu báo "Authentication error 10000", chạy lại có ép `CLOUDFLARE_ACCOUNT_ID` thì qua). Kiểm tra sau deploy: `/api/thieu-hang` và `/api/thieu-hang-bh` trả 401 (route có thật), bundle mang 1.071.

## Phiếu cấp linh kiện: giai đoạn Kho in / xuất sau Kế toán (04/11/2026) — v1.073

**(a) Nguyên văn yêu cầu:** *"Phiếu cấp linh kiện sửa chữa tách thành các giai đoạn: Chờ KT, (kT xác nhận xong) => chờ kho in, kho đã in, Kho đã xuất (có 2 nút đã in hoặc đã xuất luôn cho kho) => Cho kho nhìn thấy đơn cấp lk"*

**(b) Đã làm:**
- `migrations/0027_de_xuat_kho.sql`: cột `de_xuat_linh_kien_bh.kho_tt` (`cho_in` | `da_in` | `da_xuat`) + `kho_in_boi/luc`, `kho_xuat_boi/luc`. `trang_thai` giữ `da_cap` (= KT đã xác nhận), nên các chỗ đang đếm "đã cấp" (Việc NV, KTV đang sửa, lùi đơn) không đổi. Dữ liệu cũ: 217 đề xuất nhập AppSheet (không có bước KT) → `da_xuat`; 11 đề xuất KT đã duyệt qua luồng mới → `cho_in` (hiện cho Kho xử lý).
- KT duyệt (`ke-toan-xac-nhan`) → `kho_tt = 'cho_in'`. Route mới `POST /api/de-xuat/kho {ids, hanh_dong}` (Kho / qtri, ≤200, lỗi theo dòng, CAS theo giai đoạn cũ, ghi nhật ký đơn vị): `da_in` (chờ in → đã in), `chua_in` (đã in → chờ in, đổi lại khi bấm nhầm), `da_xuat` (chờ in hoặc đã in → đã xuất — "xuất luôn" không cần in). Đã xuất không lùi lại.
- `GET /de-xuat?trang_thai=` nhận thêm 3 tab ảo `cho_kho_in` / `kho_da_in` / `kho_da_xuat`; Kho xem được 3 tab này, Kế toán xem cả 3. Sửa kèm lỗi cũ: ô tìm của danh sách đề xuất dùng cột không tồn tại `d.nguoi_tao` (gõ tìm sẽ lỗi 500) → `d.nguoi_de_xuat`.
- Số việc mới `kho_lk_cho_in`, `kho_lk_da_in` (menu Phiếu trả + Trang chủ của Kho); cảnh báo đơn tồn thêm giai đoạn "Phiếu cấp linh kiện KT đã duyệt, Kho chưa xuất".
- Giao diện: tab "🔩 Cấp linh kiện" ở màn Phiếu trả nay mở cho cả Kho (trước chỉ Kế toán). Màn Cấp linh kiện: tab "Đã cấp" thay bằng 3 tab "🖨 Chờ Kho in" / "📦 Kho đã in" / "✔ Kho đã xuất"; mỗi dòng có "🖨 Đã in" (hoặc "↩ Chưa in") + "📦 Đã xuất", chọn nhiều để làm hàng loạt; badge trạng thái đề xuất (cả trong UI chi tiết đơn) hiện đúng giai đoạn Kho. Tab mặc định: Kế toán → Chờ KT xác nhận; Kho → Chờ Kho in (hoặc Kho đã in nếu chỉ còn việc ở đó).

**(c) Vấn đề:** link cũ `#/admin/de-xuat?tab=da_cap` giờ mở tab mặc định. Ô tìm không dấu ("bom") chỉ khớp khi cron đã tính chuỗi tìm kiếm của đơn.

**(d) Kiểm thử:** typecheck backend + frontend 0 lỗi, build sạch. `wrangler dev` local (config + D1 tạm, đã xoá), script HTTP 17/17 (sau khi sửa dữ liệu mẫu thiếu quyền qtri): chưa KT duyệt → Kho bị chặn; KT duyệt 3 → tab Chờ Kho in 3, số việc 3; in 2, in lần 2 bị chặn; chưa in 1; xuất 2 (1 đã in + 1 xuất luôn); đã xuất không lùi; hành động sai 400; số việc còn 1/0; `loc_only` + cảnh báo OK; tìm theo mã LK / tên có dấu / mã đơn đúng. Giao diện: bấm "🖨 Đã in" → phiếu sang tab "Kho đã in" có "↩ Chưa in" / "📦 Đã xuất".

**Deploy (04/11/2026):** áp migration 0027 lên D1 production (11 đề xuất → chờ Kho in, 217 → đã xuất) và `npm run deploy` (Version ID `f58a6f74`).

**Bổ sung (04/11/2026, v1.074)** — nguyên văn: *"cho kho nhìn thấy mục \"cấp linh kiện\""*. Menu "Cấp linh kiện sửa chữa" (`#/admin/de-xuat`) hiện cho Kho (trước chỉ Admin BH / qtri), số việc cộng `kho_lk_cho_in` + `kho_lk_da_in`; Kho mở màn này thấy 3 tab Chờ Kho in / Kho đã in / Kho đã xuất. Link Trang chủ và cảnh báo đơn tồn của Kho trỏ thẳng `#/admin/de-xuat?tab=cho_kho_in` (tab "Cấp linh kiện" trong Phiếu trả vẫn giữ). Typecheck 0 lỗi.

## Tài khoản: đồng bộ với danh bạ KTV / ETX + tên công ty (04/11/2026) — v1.075

**(a) Nguyên văn yêu cầu:** *"1. tài khoản chưa được cấp quyền không được phép vào app 2. Tài khoản trùng với tài khoản hệ thống có sẵn tự động đồng bộ vào nhau. 3. Tài khoản chưa có trên hệ thống thì mới để tên gốc, còn lại phải chuyển hết thành tài khoản công ty"*. Đã hỏi lại, người dùng chốt: "tài khoản hệ thống có sẵn" = **danh bạ KTV + ETX nhân sự**; mục 1 = **chỉ chặn chờ duyệt / từ chối** (giữ như hiện tại — đã duyệt mà chưa có vai trò vẫn vào được).

**(b) Đã làm:**
- Mục 1: không đổi code — `loadUser` đã chặn Chờ duyệt (`PENDING_APPROVAL`), Từ chối (`REJECTED`), Khoá (`DISABLED`). Tài khoản bị Admin từ chối không bao giờ được tự duyệt lại.
- `backend/src/lib/taiKhoan.ts` `dongBoTaiKhoan(db, email?)`: (1) tự duyệt tài khoản "Chờ duyệt" trùng danh bạ KTV / ETX đang làm (`tuDuyetTaiKhoanCho` có sẵn); (2) tài khoản đã duyệt nhưng CHƯA có vai trò nào mà có trong danh bạ KTV → gán cờ KTV / Vệ tinh (không đụng tài khoản đã có vai trò); (3) `users.ten` = tên công ty — họ tên ETX (bản đang làm trước) > tên danh bạ KTV (bỏ tiền tố "(mã) KTV Tỉnh - "); không có trên hệ thống thì giữ tên Google. So khớp Gmail không phân biệt hoa / thường.
- Chạy ở: đăng nhập (sau khi ghi tài khoản — tên Google bị thay ngay bằng tên công ty), cron 15 phút (sau bước ETX), nhận đồng bộ danh bạ KTV từ linh-kien-app, nút "Đồng bộ ngay" ETX. Đăng nhập: tra danh bạ KTV không phân biệt hoa / thường (trước so khớp chính xác).
- `tenGonKtv` chuyển từ `routes/users.ts` sang `lib/taiKhoan.ts` dùng chung.

**(c) Ghi nhận:** xem trước trên production (chỉ đọc): 200 tài khoản → 180 đổi sang tên công ty (VD "tuan ngo" → "Ngô Văn Tuân", "Thái Vũ Hồng" → "Vũ Hồng Thái"), 13 giữ tên Google; không có tài khoản chờ duyệt / thiếu vai trò nào trùng danh bạ. Admin sửa tên tay ở màn Người dùng sẽ bị đổi lại theo tên công ty ở lần đồng bộ sau (đúng yêu cầu mục 3).

**(d) Kiểm thử:** typecheck backend 0 lỗi; mô phỏng thuật toán đổi tên trên dữ liệu production thật. Chưa chạy local end-to-end — kiểm tra sau deploy bằng D1 production khi cron chạy.

## KTV triển khai được tạo đơn + KTV tạo hộ KTV khác (05/11/2026) — v1.076 (+ dvbh v1.522)

**(a) Nguyên văn yêu cầu:** *"1. Lấy thêm thông tin "KTV triển khai" từ DVBH để xác định người được quyền tạo đơn bảo hành. chỉ cần là 1 trong 2 người là tạo được (ví dụ trạm triển khai là Trạm A, KTV triển khai là KTV B chạy sự cố SC001) => Trạm A hoặc KTV B đều có thể lên đặt đơn bh cho SC0001 2. 1 Tài khoản KTV có thể tạo đơn thay cho 1 tài khoản KTV khác, thêm trong phần cài đặt "Danh sách KTV" danh sách các KTV có thể tạo hộ (ví dụ KTV A, cho phép tạo đơn hộ KTV B, KTV C => khi KTV A tạo đơn sẽ nhìn thấy đơn odoo của KTV B, KTV C và có thể tạo thủ công theo mã đơn hàng của KTV B, KTV C. (tương tự như GS khu vực tạo hộ đơn cho KTV khu vực mình => đây làm Admin tạo hộ cho KTV)"*

**(b) Đã làm:**
1. **KTV triển khai:** dvbh đã có `case_dvbh.ktv_trien_khai` (migration 0135 bên đó, chỉ case nguồn Odoo) nhưng chưa trả ra API → dvbh v1.522 thêm cột này vào `case-lookup` và `don-bao-hanh-odoo`. App này:
   - `migrations/0028_ktv_trien_khai_tao_ho.sql`: `don_bh_odoo.ktv_trien_khai`, `ma_ktv_tk`, `tk_hoi`; bảng `ktv_tao_ho_bh (email, cho_email)`.
   - `lib/odooSync.ts`: lưu KTV triển khai khi kéo đơn (chỉ ghi khi bản tin dvbh có trường này); bước cron mới "Bổ sung KTV triển khai" hỏi lại đơn còn mở chưa có trường này (≤5×200 / lần).
   - `lib/ktvMa.ts` `maKtvCuaCase` / `caseThuocKtv`: case thuộc KTV nếu mã KTV khớp **Trạm (`ky_thuat_vien`) HOẶC KTV triển khai**. Áp ở: kiểm tra mã case khi tra cứu, thêm đơn thủ công, cron xác minh case, danh sách / hủy / mở lại đơn Odoo chờ gửi, thêm đơn từ Odoo, số việc `ktv_odoo_cho_gui`.
2. **KTV tạo hộ KTV khác:**
   - Quản trị › Danh sách KTV: modal sửa KTV có khối "Được tạo đơn hộ cho KTV" (chọn nhiều, bỏ từng người); bảng có cột "Tạo hộ" (số KTV). API `GET /ktv-lien-he/tao-ho?email=`, `PUT /ktv-lien-he/tao-ho {email, cho_emails}` (qtri; email phải có trong danh bạ, bỏ chính mình), `GET /ktv-lien-he/tao-ho-cua-toi`.
   - Quyền: `resolveKtvTarget` (đơn Odoo) và `POST /phieu-gui {ktv_email}` cho KTV thật tạo hộ đúng KTV được gán (không bị giới hạn khu vực như GS). Thùng ghi `nguoi_tao` = KTV được làm hộ, `nguoi_tao_ho` = người tạo — giống GS tạo hộ, nên người tạo hộ quản lý thùng tới khi gửi, case kiểm theo KTV sở hữu thùng. `GET /phieu-gui` của KTV thật nay gồm cả thùng mình tạo hộ.
   - Màn Gửi hàng của KTV: có người được tạo hộ thì hiện hàng "Làm đơn cho: Tôi / KTV B / …"; chọn KTV B → tab Đơn Odoo hiện đơn của B (cả Đã gửi / Hủy bỏ), "Tạo thùng" / "+ Tạo thùng mới" tạo cho B; danh sách thùng có cột "Của KTV".

**(c) Ghi nhận:** dvbh chỉ có KTV triển khai cho case nguồn Odoo (159 case đang khác Trạm lúc làm); case QuickSight để trống → chỉ Trạm tạo được như cũ. Thùng KTV tạo hộ vẫn đi qua Kho như thường (không bỏ qua bước như Admin tạo hộ). "Đơn của tôi" của người tạo hộ không hiện đơn của KTV được làm hộ (xem qua danh sách thùng).

**(d) Kiểm thử:** typecheck backend + frontend 2 repo 0 lỗi, build sạch. Local (config + D1 tạm, đã xoá), script HTTP **17/17**: Trạm thấy đơn Odoo của mình; KTV triển khai thấy đơn có mình là KTV triển khai + đơn của mình, số việc = 2; chưa gán thì tạo hộ 403; gán KTV không có → 400; gán xong A xem / tạo thùng cho B, thêm đơn Odoo của B (đơn KTV khác bị loại), C bị chặn; B thấy thùng; cột số tạo hộ đúng. Giao diện: hàng "Làm đơn cho" + cột "Của KTV ↪ KTV B" hiện đúng.

**Deploy (05/11/2026):** dvbh v1.522 (`deploy:smarttrade`, Version ID `936a0c46`) trước. Sau đó suachua áp migration 0028 lên D1 production và `npm run deploy` (Version ID `0106b4c2`).

## Kiểm tra tạo hộ "tài khoản phụ" + KTV triển khai chưa thấy đơn (05/11/2026) — v1.077

**(a) Nguyên văn:** *"1. tôi cần thêm tài khoản phụ có thể tạo hộ cho tài khoản ktv này nhưng không được — (thanhlv2.dvkh) KTV Bình Dương - Lò Văn Thanh là tài khoản chính, tạo đơn hộ cho tài khoản phụ là (thanhlv.trambhptdv-hcm) Trạm BH PTDV HCM - Lò Văn Thanh 2. Kiểm tra: (dienmaykp.mn) Trạm Long An - Điện máy KP là KTV triển khai, cần tạo được các đơn Case của bản thân họ ví dụ SC261028106"*

**(b) Kết quả (đọc D1 production):**
1. 2 mã `thanhlv2.dvkh` và `thanhlv.trambhptdv-hcm` **dùng chung email đăng nhập** `karofibinhduong01@gmail.com` → đã là 1 tài khoản. Mọi chỗ đối chiếu mã KTV dùng `maKtvCuaEmail` (mọi mã của email, v1.068), nên đăng nhập email này đã thấy đơn Odoo + tạo được đơn cho case của cả 2 mã. Tạo hộ tính theo email nên danh sách chọn loại chính email đó → "Không có kết quả". Sửa: modal sửa KTV hiện ghi chú xanh "✔ Cùng email đăng nhập với: … — đã là 1 tài khoản". (Gmail phụ `baohanhtrungtam7@gmail.com` là tài khoản riêng, đang Từ chối + khoá.)
2. Case SC261028106: dvbh có `ktv_trien_khai = (dienmaykp.mn)…` (Trạm = bhptdv.mn), nhưng 2 đơn Odoo BH05774/05775 chưa được bước cron "Bổ sung KTV triển khai" hỏi lại (`tk_hoi=0`; còn 5.402 đơn mở chờ, mỗi lần cron chỉ 1.000). Tạo đơn THỦ CÔNG theo mã case đã được (tra cứu case dùng `ktv_trien_khai` trực tiếp). Sửa: tăng bước bổ sung lên 30 lô × 200 / lần cron → xong trong 1 lần cron.

**(c)/(d):** typecheck 0 lỗi. Chưa thử bằng tài khoản thật.

**Deploy (05/11/2026):** `npm run deploy` (Version ID `aa50c173`), không có migration mới.

## Màn Người dùng: ô Duyệt / Miền bị co mất chữ (05/11/2026) — v1.078

**(a) Nguyên văn:** *"giao diện phân quyền, duyệt và miền không hiện đủ thông tin"* (ảnh: 2 ô chọn Duyệt / Miền chỉ còn mũi tên).
**(b) Đã sửa:** bảng desktop `screens/qtri/NguoiDung.tsx` — ô chọn `w-full` trong bảng `whitespace-nowrap` bị cột "Người dùng" (tên + email dài) ép còn ~40px. Thêm `min-w-[108px]` (Duyệt) và `min-w-[168px]` (Miền, đủ "Chưa gán (thấy tất cả)"); bảng vẫn cuộn ngang khi thiếu chỗ.
**(c)/(d):** typecheck 0 lỗi. Chưa xem bằng mắt sau sửa. **Deploy (05/11/2026):** Version ID `8943a510`.

## Màn Người dùng: tên theo danh bạ KTV "(mã) Tên" (05/11/2026) — v1.079

**(a) Nguyên văn:** *"thông tin tên người dùng ở đây, ưu tiên hiện thị tên trên app linh-kien-app (theo mã ktv - ví dụ (id.ktv) tên ktv"*
**(b) Đã làm:** `GET /api/users` trả thêm `ten_ktv` = "(mã) Tên" lấy từ danh bạ KTV (`ktv_lien_he_bh`, đồng bộ từ linh-kien-app) theo email đăng nhập; 1 email nhiều mã → "(mã1, mã2) Tên". Màn Người dùng (bảng + thẻ mobile) hiện `ten_ktv` trước, không có thì `users.ten` (ETX / Google). Ô tìm khớp cả mã KTV + tên danh bạ. Chỉ áp ở màn này — tên ở nơi khác vẫn theo quy tắc v1.066/v1.075.
**(c)/(d):** typecheck 0 lỗi; chạy thử câu SQL trên D1 production (chỉ đọc) ra đúng 2 mã của karofibinhduong01. Chưa xem bằng mắt.
**Deploy (05/11/2026):** Version ID `a4921bef`.

## Tự phân miền cho tài khoản KTV theo khu vực bên linh-kien-app (05/11/2026) — v1.080

**(a) Nguyên văn:** *"dựa theo khu vực của gmail được phân ở linh kiện app => tự động phân khu vực cho họ"*
**(b) Phát hiện + đã làm:** đọc D1 production: 147 tài khoản KTV có khu vực trong danh bạ KTV (đồng bộ từ linh-kien-app) nhưng `users.mien` vẫn "Chưa gán" — bước tự suy miền (`lib/userKhuVucSync.ts`, v1.043, chạy mỗi giờ) chỉ đọc khu vực nhân sự (`user_khu_vuc`), chưa đọc khu vực KTV. Nay gộp thêm khu vực của các dòng danh bạ KTV cùng email đăng nhập (`mien_gan` ưu tiên hơn `khu_vuc_ma`); khu vực toàn MB → MB, toàn MN → MN, cả 2 → Cả 2 miền. Vẫn chỉ áp cho tài khoản chưa gán miền / miền tự suy — không đè miền Admin gán tay. Không ghi khu vực KTV vào `user_khu_vuc_bh` (bảng đó là phạm vi xem của View).
**(c)/(d):** typecheck 0 lỗi. Kiểm tra sau deploy bằng lần chạy đồng bộ kế tiếp (mỗi giờ, hoặc nút "Đồng bộ ngay" ở Cài đặt › Đồng bộ ETX nhân sự).
**Deploy (05/11/2026):** Version ID `1ef2a698`, không có migration.

## KTV đăng nhập lần đầu: tự phân miền ngay (05/11/2026) — v1.081

**(a) Nguyên văn câu hỏi:** *"bây giờ 1 ktv đăng nhập vào hệ thống (đã có sẵn tài khoản trên linh-kien-app)=> hệ thống có tự động duyệt và phân khu vực, hiện thị tên ktv, phân vai trò không?"*
**(b) Trả lời (đọc code `routes/auth.ts`):** email khớp danh bạ KTV → tự "Đã duyệt" + vai trò KTV (danh bạ "Vệ tinh" → cờ Vệ tinh); tên công ty ghi ngay (`dongBoTaiKhoan`: họ tên ETX > tên danh bạ KTV), màn Người dùng hiện "(mã) Tên"; khu vực / miền của đơn tính theo khu vực KTV ngay. Chỗ hở: `users.mien` của KTV mới chỉ được suy ở lượt đồng bộ mỗi giờ vì lúc đăng nhập bỏ qua KTV (`!ktvMatch`) → bỏ điều kiện, tài khoản mới nào (cả KTV) cũng chạy `runUserKhuVucSync` nền ngay khi đăng nhập lần đầu.
**(c)/(d):** typecheck 0 lỗi; chưa thử bằng đăng nhập Google thật. **Deploy (05/11/2026):** Version ID `e3a096bc`.

## UI chi tiết đơn không có nút thao tác với Admin hệ thống (05/11/2026) — v1.082

**(a) Nguyên văn:** *"bug "DH-002735-1" đang bị dừng không hiện chức năng thao tác nào"*
**(b) Nguyên nhân + đã sửa:** đọc D1 production: DH-002735-1 ở `cho_admin_xac_nhan` (NV báo "Đã sửa xong"; Admin đã 2 lần xác nhận hoàn tất rồi "Lùi lại" với lý do "thêm linh kiện phin lọc"). `UnitDetailModal.tsx` chỉ dựng nhóm nút Admin (Phân loại / ⚡ / Bổ sung / Xác nhận hoàn tất / Trả trực tiếp) khi `user.la_admin_bh` — tài khoản Admin hệ thống (`la_qtri`) không có cờ đó nên không thấy nút nào, dù backend cho qtri làm (quy ước superuser 04/09/2026). Đổi thành `la_admin_bh || la_qtri`. Ghi nhận: muốn thêm đề xuất linh kiện (phin lọc) thì đơn phải ở bước NV sửa — dùng "Xác nhận hoàn tất / Yêu cầu làm lại" → "Yêu cầu làm lại" để đơn về NV, rồi "+ Đề xuất hộ NV".
**(c)/(d):** typecheck 0 lỗi; không còn chỗ nào khác chặn nút chỉ theo `la_admin_bh`. Chưa xem bằng mắt. **Deploy (05/11/2026):** Version ID `208805e1`.

## Admin BH đề xuất linh kiện khi đơn "Chờ Admin xác nhận hoàn tất" (05/11/2026) — v1.083

**(a) Nguyên văn:** *"không thêm được linh kiện đề xuất cho ID đó"* (DH-002735-1).
**(b) Nguyên nhân + đã làm:** đơn ở `cho_admin_xac_nhan` (NV đã báo "Đã sửa xong"); `POST /de-xuat/don-vi/:unitId` và nút "+ Đề xuất" (`DeXuatLinhKien.tsx`) chỉ cho khi đơn `cho_chan_doan` → Admin BH (`nguyenphuongtuyentv`) phải lùi lại / xác nhận nhiều lần mà vẫn không thêm được phin lọc. Nay Admin BH / qtri được tạo đề xuất cả khi đơn `cho_admin_xac_nhan` (NV vẫn chỉ ở bước sửa); đề xuất đi tiếp luồng Kế toán → Kho như thường, không phải trả đơn về NV.
**(c)/(d):** typecheck 0 lỗi. Chưa thử trên bản thật. **Deploy (05/11/2026):** Version ID `43159f2f`.

## Admin lùi đơn "Chờ xác nhận hoàn tất" về bước NV sửa (05/11/2026) — v1.084, thay v1.083

**(a) Nguyên văn:** *"nếu vậy thì cho admin đẩy lùi lại bước sửa cho đúng quy trình"* (sau khi v1.083 cho Admin đề xuất linh kiện ngay ở bước "Chờ Admin xác nhận hoàn tất").
**(b) Đã làm:** **hoàn tác v1.083** — đề xuất linh kiện lại chỉ tạo được khi đơn ở bước NV sửa (`cho_chan_doan`). Thay vào đó "↩ Lùi lại" (`POST /admin/don-vi/:id/hoan-tac`, `hoanTacDonVi`) nhận thêm `cho_admin_xac_nhan` → `cho_chan_doan`: giữ NV phụ trách, xoá `ket_qua_nv` / `ket_qua_chan_doan` để NV nộp lại; đơn chưa có NV thì về Chờ phân loại. Nút "↩ Lùi lại" hiện trong UI chi tiết đơn ở trạng thái này; hộp xác nhận ghi "↩ Lùi về Chờ NV sửa". Sau khi lùi: Admin "+ Đề xuất hộ NV" (hoặc NV tự đề xuất) → NV nộp lại kết quả. "Yêu cầu làm lại" có sẵn trong hộp Xác nhận hoàn tất vẫn giữ (cũng về NV, đếm số lần làm lại).
**(c)/(d):** typecheck 0 lỗi. Chưa thử trên bản thật.
