# Phân tích liên kết với "Đặt mua linh kiện" + Kế hoạch chuyển đổi module Bảo hành lên Cloudflare

**Ngày viết:** 03/09/2026 (cập nhật cùng ngày sau khi chốt 5/5 câu hỏi mở). **Trạng thái:** báo cáo
phân tích + kế hoạch, **CHƯA triển khai gì** — kiến trúc đã chốt đầy đủ, còn 1 việc cần xác nhận trước
khi bắt đầu Giai đoạn 1 (vị trí mã nguồn thật của Worker `suachua` — xem mục 7).

## Yêu cầu gốc (nguyên văn, 03/09/2026)

> 1. phân tích dự án "F:\claude\QLBH 3T\linh-kien-app" đây là 1 dự án đặt mua linh kiện hoạt động
>    song song với dự án gửi hàng bảo hành. 2 hệ thống sẽ liên kết với nhau và cùng hoạt động trên 1
>    tài khoản cloudflare smarttrade.
> 2. Xác định cách quản lý tài khoản KTV, Giám sát, Admin hệ thống, View để xây dựng cơ chế cho hệ
>    thống web bảo hành.
> 3. Danh sách linh kiện sẽ kéo API từ bên mua hàng về (danh sách linh kiện bán hàng cho phép bảo
>    hành). (cho phép tạo thêm, sửa thông tin, tắt bật danh sách sử dụng trong bảo hành)
> 4. Dựa vào phân tích dựa án mua hàng => Phân tích chi tiết các bước chuyển đổi toàn bộ dự án bảo
>    hành hiện tại sang dữ liệu sẵn sàng để chuyển đổi lên cloudflare.
> 5. Lập kế hoạch thành từng bước chuyển đổi đảm bảo chuyển đổi 100% nội dung hiện tại đã xây dựng
>    sang hệ thống online.
> 6. Kiểm tra 1 số quy ước tạo giao diện, UI, setup phiên bản mobile (như tạo shortcut, gửi thông
>    báo, kết nối API từ cloudflare... để tạo skills cho bản thân) => phân tích chi tiết xem các vấn
>    đề đang thiếu. lập kế hoạch bổ sung.

Phương pháp yêu cầu: tự khám phá → phân tích phương án → tự phản biện → tái đánh giá → lập kế hoạch →
báo cáo xin ý kiến. Toàn bộ mục dưới đây bám theo đúng quy trình này — kết luận đều có bằng chứng cụ
thể (file, dòng code, ngày commit), không suy đoán.

## Phản hồi — trả lời 5 câu hỏi mở (nguyên văn, 03/09/2026, cùng ngày)

> 1. tên miền suachua.dichvu3t.workers.dev đã tồn tại. đang online.
> 2. Lấy toàn bộ danh sách linh kiện bán bat_tat=1.
> 3. GS và View làm theo hướng của linh-kien-app
> 4. Bên linh-kien-app sẽ bắn api khi danh sách ktv có thay đổi. bên app sua chua sẽ nhận api vào cập
>    nhật danh sách.
> 5. Khu vực sẽ học linh-kien-app. lấy thông tin đồng bộ tự động từ linh-kien-app khi bên linh kien
>    app có thay đổi

**Đã áp dụng cả 5 câu trả lời vào toàn bộ tài liệu bên dưới** (thay thế phần "câu hỏi mở" bằng thiết
kế đã chốt). Điểm đáng chú ý nhất: câu trả lời #4/#5 đưa ra **1 cơ chế thứ 3** mà báo cáo lần đầu chưa
đề xuất — **đồng bộ kiểu "đẩy" (push)**: `linh-kien-app` chủ động gọi sang `suachua` mỗi khi dữ liệu
KTV/Khu vực đổi, thay vì `suachua` tự kéo (pull) theo lịch hoặc theo yêu cầu tay. Để nhất quán (không
có lý do gì chỉ 2/3 loại dữ liệu tham chiếu dùng cơ chế đẩy còn danh mục linh kiện thì lại dùng nút
bấm tay), báo cáo này **áp dụng luôn cơ chế đẩy cho cả danh mục linh kiện** — đây là phần **tự suy
rộng ra cho nhất quán, không phải câu trả lời trực tiếp của người dùng**, đánh dấu rõ ở mục 3 để dễ
phản hồi lại nếu không đúng ý.

---

## 0. Phát hiện quan trọng nhất — thay đổi hướng kiến trúc so với CLAUDE.md hiện tại

CLAUDE.md của dự án bảo hành (mục "Liên hệ với hệ thống chính") hiện giả định: module bảo hành sẽ
**build vào bên trong** `cloudflare smarttrade base`, tái dùng trực tiếp `moduleAccess.ts`,
`navConfig.ts`, `scopeDatMua.ts`, `users.giam_sat_quan_ly`, mẫu bảng `phieu_xuat_kho`... của repo đó.

**Bằng chứng thu thập được trong đợt khảo sát này cho thấy giả định đó đã lỗi thời**, vì đúng module
"Đặt mua linh kiện" mà giả định đó định tái dùng **đã được tách hẳn ra khỏi `cloudflare smarttrade
base` từ 19/08/2026** thành 1 hệ Cloudflare Workers + D1 hoàn toàn độc lập — chính là
`linh-kien-app` đang được phân tích ở đây:

1. **`linh-kien-app/CLAUDE.md`** ghi rõ: *"Hệ này được tách ra... vào 2026-08-19... một hệ thống
   Cloudflare Workers + D1 hoàn toàn độc lập: tự có Worker, D1, Google OAuth app, bảng `users`
   riêng... 2 repo hoàn toàn tách biệt kể từ 2026-08-19."*
2. Trong `cloudflare smarttrade base/backend/src/lib/moduleAccess.ts`, biến
   `TAM_TAT_MODULES = ["dat-mua-lk", "tra-hang"]` — **2 module này đã bị ẩn khỏi sidebar cho MỌI vai
   trò, kể cả Admin**, kể từ khi tách hệ. Code cũ (`datMuaLinhKien.ts`, `phieuXuatKho.ts`,
   `traHang.ts`) vẫn còn mount trong `index.ts` (chưa xoá, giữ lại để không mất dữ liệu lịch sử) nhưng
   **không còn ai dùng được qua UI** — đây là module "xác" (frozen), không phải nguồn sự thật hiện
   tại.
3. Đối chiếu migration: các migration động tới `dat_don_hang`/`phieu_xuat_kho`/`linh_kien` bên
   `cloudflare smarttrade base` dừng lại ngay sau ngày tách (migration cuối `0091`, ngày
   21/08/2026) — không có thay đổi schema mua hàng nào mới kể từ đó.
4. Ngược lại, `linh-kien-app` có **git log hoạt động liên tục tới 02/09/2026** (hôm qua), với các
   commit sửa lỗi/thêm tính năng mang tính vận hành thật (VD "Fix 'Đang tồn' trông rỗng: GET
   /home-summary vượt giới hạn bind D1 khi TN/Kho/Kế toán gán nhiều Khu vực") — đây là dấu hiệu hệ
   thống đang được **dùng thật trong sản xuất**, không phải bản nháp.
5. `wrangler.jsonc` của `linh-kien-app` có `database_id` thật (không còn placeholder
   `REPLACE_AFTER_WRANGLER_D1_CREATE` như `DEPLOY.md` mô tả) và VAPID public key thật cho Web Push —
   xác nhận **đã deploy thật**, dù `DEPLOY.md`/`CLAUDE.md` của chính repo đó chưa cập nhật lại dòng
   "chưa deploy" (tài liệu bị lag so với thực tế, không phải hệ thống chưa chạy).
6. **Bằng chứng mạnh nhất**: `linh-kien-app/frontend/src/layout/navConfig.ts` (sửa ngày 25/08/2026,
   *trước cả khi module bảo hành bắt đầu redesign UI*) đã có sẵn 1 mục menu:
   ```ts
   { key: "sua-chua-bao-hanh", label: "Sửa chữa", icon: "🛠", href: "https://suachua.dichvu3t.workers.dev" }
   ```
   Đây là 1 liên kết ra ngoài (`href`, không phải view nội bộ) — tức đã có kế hoạch từ trước rằng hệ
   bảo hành sẽ là **Worker thứ 3 độc lập**, tên miền dự kiến **`suachua.dichvu3t.workers.dev`**, cùng
   tài khoản Cloudflare `dichvu3t` với `dvbh` (hệ gốc CRM/CSKH) và `linhkien` (đặt mua linh kiện).

**Kết luận (khớp đúng nguyên văn yêu cầu #1 hôm nay — "2 hệ thống sẽ liên kết với nhau và cùng hoạt
động trên 1 tài khoản cloudflare smarttrade"):** module bảo hành nên được xây thành **1 Worker + D1
độc lập thứ 3** (đặt tên `suachua`, đúng theo placeholder đã có sẵn), **không nhúng vào**
`cloudflare smarttrade base`, và liên kết với 2 hệ kia qua **API đối tác (partner API) + Service
Binding** — đúng y hệt mô hình `linh-kien-app` đã áp dụng với `cloudflare smarttrade base`. Toàn bộ
mục "Liên hệ với hệ thống chính" trong CLAUDE.md bảo hành cần viết lại theo hướng này (chi tiết ở mục
4).

**[ĐÃ CHỐT 03/09/2026]** Người dùng xác nhận: *"tên miền suachua.dichvu3t.workers.dev đã tồn tại.
đang online."* — Worker `suachua` đã được deploy thật, không còn là placeholder dự kiến. **Điểm cần
làm rõ tiếp** (chưa có câu trả lời, xem mục 7 mới): không tìm thấy thư mục mã nguồn nào cho
`suachua` trên máy này (đã rà toàn bộ `F:\claude\QLBH 3T\` — chỉ có `gui-bao-hanh-linh-kien`,
`linh-kien-app`, `cloudflare smarttrade base`) — cần xác nhận mã nguồn thật của Worker đang online
nằm ở đâu (máy khác? đã deploy 1 bản rỗng/placeholder chờ code thật? hay chính thư mục
`gui-bao-hanh-linh-kien` này sẽ là nguồn cho Worker đó, tương tự cách thư mục `linh-kien-app` khác
tên với Worker `linhkien` của nó) trước khi bắt đầu Giai đoạn 1 (scaffold hạ tầng, mục 5).

---

## 1. Phân tích dự án `linh-kien-app`

### Kiến trúc & hạ tầng
- Cloudflare Workers (Hono) phục vụ cả API lẫn frontend build tĩnh từ **1 Worker duy nhất**
  (`assets.run_worker_first: ["/api/*"]` — bắt buộc, thiếu sẽ bị Static Assets chặn request
  navigate thật trước khi tới Worker).
- D1 (SQLite) là database duy nhất, **không dùng R2**, **không có cron job** (báo cáo tính
  trực tiếp/cache-on-miss qua `reportCache.ts`, không cần lưới an toàn dạng cron như hệ gốc).
- React + Vite + Tailwind ở frontend — port gần nguyên bản UI của hệ gốc rồi chỉnh sửa riêng dần.
- Domain: `linhkien.dichvu3t.workers.dev` — cùng account subdomain `dichvu3t` với hệ gốc `dvbh`.

### Quản lý tài khoản & vai trò (trả lời trực tiếp yêu cầu #2)
- **Auth độc lập hoàn toàn**: Google OAuth 2.0 riêng (Client ID/Secret riêng), session JWT cookie
  riêng (`dvbh_session`, cùng cơ chế `lib/jwt.ts` port từ hệ gốc nhưng secret khác), bảng `users`
  riêng. `BOOTSTRAP_ADMIN_EMAIL` tự động promote thành Admin ở lần đăng nhập đầu tiên.
- Chỉ còn 3 giá trị `vai_tro` (`Admin | QC | Giam sat`, có thể NULL) — phần lớn phân quyền thực tế
  đến từ **7 cờ boolean nghiệp vụ**: `la_ktv_dvbh, la_ve_tinh, la_kho, la_ke_toan, la_tac_nghiep,
  la_tp_dvbh, la_view` + 2 cờ danh mục (`quan_ly_danh_muc_lk`, `xem_danh_muc_lk`) — **không còn**
  `users.modules` JSON tuỳ biến như hệ gốc (đơn giản hoá có chủ đích cho 1 hệ chỉ phục vụ 1 miền
  nghiệp vụ).
- **`la_view`** (thêm 26/08/2026) — vai trò **chỉ đọc, giới hạn theo Khu vực** (quyết định đã chốt:
  "view thấy theo khu vực được set", không phải xem tất cả). Cơ chế: bảng `user_khu_vuc` (gán N khu
  vực cho 1 tài khoản View) + `khuVucViewEmailInSql()` (subquery lọc email KTV/Vệ tinh thuộc các khu
  vực đó) — **chưa gán khu vực nào thì không thấy đơn nào** (an toàn mặc định, không phải mặc định
  thấy hết).
- **Khu vực** (`khu_vuc`, thêm 26/08/2026): danh sách khu vực tổ chức linh động (VD MB1/MB2/.../B2B
  MN), mỗi khu vực có tối đa 1 GS phụ trách (`khu_vuc.gs_email`). `ktv_lien_he.khu_vuc_ma` gán trực
  tiếp cho mọi KTV; `ktv_cap1_phu_trach` chỉ có nghĩa khi là Vệ tinh (trỏ tới KTV cấp 1 phụ trách
  trực tiếp). `giam_sat_quan_ly`/`tram_cha` trên `users` giờ là **derived/read-only**, tự tính lại từ
  Khu vực mỗi khi dữ liệu nguồn đổi — Admin không sửa tay 2 cột này nữa.
- **`scopeDatMua.ts`** (tự viết lại hoàn toàn riêng cho hệ này, không import từ hệ gốc) — mẫu SQL
  scope theo **quan hệ người dùng** (KTV/Trạm/Vệ tinh/GS/TN/Kho/Kế toán), không theo khu vực địa lý
  thuần: KTV/CTV thường thấy đơn mình tạo + đơn tạo hộ mình; Trạm thấy thêm đơn của mọi Vệ tinh trực
  thuộc; GS thấy đơn có `email_gs = mình` (chỉ theo dõi, không duyệt); TN/Kho/Kế toán/TBP xem toàn
  bộ (lọc riêng theo bước xử lý ở từng route).
- **Quản lý tài khoản** tách 2 màn: "KTV hiện trường" (CRUD/tìm kiếm/lọc cấp 1-2/khu vực/bulk-import/
  công nợ) và "Nhân viên văn phòng" (gán nhiều Khu vực cho TN/Kho/Kế toán qua `user_khu_vuc` — CHỈ để
  lọc/thống kê, KHÔNG phải cơ chế phân quyền thật cho 3 vai trò đó).
- Cơ chế tự kích hoạt tài khoản: khi Admin gán `email_dang_nhap` cho 1 KTV trong danh bạ
  (`ktv_lien_he`), `provisionPlaceholderUser()` tự tạo 1 dòng `users` placeholder
  (`trang_thai_duyet='Cho duyet'`) — cần thiết vì nhiều cột (`nguoi_nhan_hang`...) là FK thật tới
  `users(email)`. Khi KTV đăng nhập Google lần đầu bằng đúng email đó, tài khoản tự kích hoạt, bỏ qua
  bước Admin duyệt thủ công.

### Danh mục linh kiện (trả lời trực tiếp yêu cầu #3)
Bảng `linh_kien` (migration `0001_init.sql`) — **bản sao độc lập**, không dùng chung schema với
module "giải trình" như hệ gốc:

```sql
CREATE TABLE linh_kien (
    ma_linh_kien    TEXT PRIMARY KEY,
    ten_linh_kien   TEXT NOT NULL,
    gia_ban         REAL,
    gia_tham_chieu  REAL,
    don_vi          TEXT,
    ghi_chu         TEXT,
    anh_demo        TEXT,
    nguoi_cap_nhat  TEXT REFERENCES users(email),
    ngay_cap_nhat   TEXT NOT NULL DEFAULT (datetime('now')),
    bat_tat         INTEGER NOT NULL DEFAULT 1,
    dac_thu         INTEGER NOT NULL DEFAULT 0,
    chi_sua_chua    INTEGER NOT NULL DEFAULT 0
);
```

- `bat_tat` — bật/tắt hiển thị trong toàn hệ `linh-kien-app` (giống hệt khái niệm "tắt bật danh sách
  sử dụng" mà yêu cầu #3 muốn có **riêng cho bảo hành** — nhưng đây là cờ *của bên mua hàng*, không
  nên dùng chung 1 cờ cho 2 hệ, xem thiết kế đề xuất ở mục 3 bên dưới).
- `dac_thu` — linh kiện đặc thù (cần TBP xác nhận trước khi đặt, không liên quan bảo hành).
- **`chi_sua_chua`** ("Only sửa chữa") — cờ đánh dấu linh kiện này **bị loại khỏi picker tạo đơn MUA
  HÀNG** (`filter(r => r.bat_tat && !r.chi_sua_chua)` trong `helpers.ts`), tức đây vốn là các linh
  kiện **dùng để sửa chữa, không bán rời cho khách**. **[ĐÃ CHỐT 03/09/2026]** Không dùng cờ này để
  lọc — người dùng xác nhận: *"Lấy toàn bộ danh sách linh kiện bán bat_tat=1"* — tức bảo hành lấy
  **mọi** linh kiện đang `bat_tat=1`, không phân biệt `chi_sua_chua` (xem thiết kế cập nhật ở mục 3).
- **Chưa có API nào để hệ khác kéo danh mục này về** — `GET /api/settings/linh-kien` chỉ dùng session
  cookie nội bộ của `linh-kien-app` (chặn Cloudflare Worker khác gọi vào vì không có API key). Cần
  **xây mới 1 route dạng partner API** (xem mục 3).

### Kết nối với hệ gốc — mẫu chuẩn cần tái dùng cho bảo hành
`linh-kien-app` gọi **đúng một** endpoint bên `dvbh`: `GET /api/partner/case-lookup?id=<case_id>`
(`cloudflare smarttrade base/backend/src/routes/partnerApi.ts`), xác thực bằng header `X-API-Key`
(hash SHA-256 lưu trong `partner_api_keys`, kiểm qua `findActivePartnerKey()`), trả về đúng 1 tập
field đã chọn lọc (`ky_thuat_vien, khach_hang, seri_san_pham, khu_vuc, tinh, hang, san_pham_bao_hanh,
tien_do_hoan_thanh, mo_ta_loi...` — **29 cột**, không có dữ liệu tài chính/nhạy cảm).

**Chi tiết kỹ thuật quan trọng phải áp dụng lại y hệt khi bảo hành build API tương tự:**
- **PHẢI dùng `services` binding (Service Binding) trong `wrangler.jsonc`, KHÔNG `fetch()` thẳng
  URL `*.workers.dev`** — Cloudflare chặn với `error code: 1042` (chống SSRF) khi bên gọi CŨNG là 1
  Worker cùng tài khoản. `curl` không tái hiện được lỗi này (dễ test tay tưởng đúng nhưng app thật bị
  chặn) — điều kiện áp dụng: 2 Worker phải nằm CHUNG 1 tài khoản Cloudflare (đúng trường hợp
  `suachua`/`linhkien`/`dvbh` cùng account `dichvu3t`).
  ```jsonc
  "services": [{ "binding": "CASE_LOOKUP_SERVICE", "service": "dvbh", "remote": true }]
  ```
- Rate-limit riêng theo API key (200 req/phút, cache qua Cache API, không ghi D1) cho endpoint tra
  cứu tương tác tần suất cao (khác hẳn endpoint export hàng loạt `/cases` có rate-limit
  30 lần/ngày+60s/lần).
- `X-API-Key` xác thực qua bảng `partner_api_keys` có sẵn ở `dvbh` — bảo hành cần **1 API key riêng**
  (tạo qua Admin `dvbh` → Settings → "API đối tác"), và (nếu cần lấy được danh mục linh kiện)
  **1 API key thứ 2** phía `linh-kien-app` — vì `linh-kien-app` hiện **chưa có** bảng
  `partner_api_keys`/cơ chế X-API-Key nào cả (phải xây mới hoàn toàn, không có sẵn để tái dùng).

### PWA / Mobile (chi tiết đầy đủ ở mục 6)
Đã có: `manifest.webmanifest`, `sw.js` (chỉ xử lý Web Push, không cache offline), `usePwaInstall.ts`
(bắt `beforeinstallprompt`), route `/api/push/*` (subscribe/unsubscribe/vapid-public-key) +
`lib/webPush.ts` (gửi thông báo thật khi có dữ liệu mới). **Thiếu**: `shortcuts` trong manifest,
offline cache.

### Tự phản biện về độ tin cậy của bản phân tích này
- Đã đối chiếu **nhiều nguồn độc lập** cho kết luận "đã tách + đã deploy" (CLAUDE.md tự khai + cấu
  hình `wrangler.jsonc` thật + git log + nội dung migration) thay vì chỉ tin 1 dòng ghi chú — tránh
  lặp lại đúng bài học mà CLAUDE.md của bảo hành đã tự nhắc ("đối chiếu dữ liệu thật, không suy đoán
  từ 1 tài liệu").
- Điểm trước đó còn chưa chắc chắn — **đã được người dùng xác nhận**: Worker `suachua` đã tồn tại
  thật, đang online (không còn là URL dự kiến/placeholder). Điểm chưa chắc chắn còn lại chuyển sang
  câu hỏi mới ở mục 7 (vị trí mã nguồn thật của Worker này).

---

## 2. Cơ chế quản lý tài khoản đề xuất cho hệ thống bảo hành

Đối chiếu 4 vai trò người dùng nêu trong yêu cầu #2 với mô hình đã có ở `linh-kien-app` (khuyến nghị
**đi theo mẫu `linh-kien-app`**, không theo mẫu cũ/đã đóng băng của `dvbh`, vì `linh-kien-app` mới
đúng là "hệ độc lập song song" cùng loại hình mà bảo hành sẽ trở thành):

| Vai trò yêu cầu | Mô hình `linh-kien-app` tương ứng | Quyết định cho bảo hành |
|---|---|---|
| **KTV** | `la_ktv_dvbh` / `la_ve_tinh` (cờ boolean) + `ktv_lien_he` (danh bạ, `khu_vuc_ma`) | Đã có `la_ktv_dvbh`/`la_ve_tinh` y hệt (kế thừa từ #4 Ke-hoach cũ) — **khớp sẵn**, không cần đổi. |
| **Giám sát** | `vai_tro='Giam sat'` — GS phụ trách theo `khu_vuc.gs_email`, chỉ theo dõi (không duyệt), scope qua field `email_gs` đã đóng gói sẵn trên từng đơn hàng | **[ĐÃ CHỐT]** *"GS và View làm theo hướng của linh-kien-app"* — xây mới `la_giam_sat`, scope y hệt cơ chế `scopeDatMuaNguoiTao()`. |
| **Admin hệ thống** | `vai_tro='Admin'` (luôn xem/sửa được mọi thứ, tự động full quyền) | Đã có `qtri` (thêm 01/09/2026) — **khớp đúng**, chỉ cần đổi tên cờ cho nhất quán. |
| **View** | `la_view` — chỉ đọc, **giới hạn cứng theo Khu vực** qua `user_khu_vuc` | **[ĐÃ CHỐT]** Đổi `quanly` hiện tại (xem toàn hệ thống) sang đúng mô hình `la_view` — giới hạn theo Khu vực, chưa gán khu vực nào thì không thấy đơn nào. |

### Thiết kế `users` của bảo hành (Worker `suachua` độc lập)

```
users (
  email               TEXT PRIMARY KEY,
  ten                 TEXT,
  bi_khoa             INTEGER DEFAULT 0,
  la_ktv_dvbh         INTEGER DEFAULT 0,   -- giữ nguyên tên cờ (đồng bộ khái niệm với 2 hệ kia)
  la_ve_tinh          INTEGER DEFAULT 0,
  la_kho              INTEGER DEFAULT 0,
  la_admin_bh         INTEGER DEFAULT 0,   -- tương đương "Admin nghiệp vụ" trong Ke-hoach cũ
  la_nv_sua_chua      INTEGER DEFAULT 0,
  la_ke_toan          INTEGER DEFAULT 0,
  la_giam_sat         INTEGER DEFAULT 0,   -- MỚI — vai trò "Giám sát" (chỉ theo dõi, không duyệt)
  la_view             INTEGER DEFAULT 0,   -- đổi tên "quanly" hiện tại, scope theo Khu vực
  vai_tro_qtri        INTEGER DEFAULT 0,   -- = "qtri" hiện tại (Admin hệ thống, luôn full quyền)
  created_at, updated_at
  -- KHONG con cot "mien" — thay bang Khu vuc dong bo tu linh-kien-app, xem bang khu_vuc_bh o muc 3
)
```

- **Auth**: Google OAuth 2.0 **riêng** (Client ID/Secret riêng, không dùng chung với `dvbh`/
  `linhkien`) — đúng nguyên tắc "mỗi hệ độc lập tự có OAuth app" mà `linh-kien-app` đã thiết lập.
  `BOOTSTRAP_ADMIN_EMAIL` tự promote Admin lần đầu, giống hệt mẫu.
- **Danh bạ KTV — [ĐÃ CHỐT, khác cả 2 phương án ban đầu]**: không phải "tự nhập tay 1 lần" cũng không
  phải "gọi API mỗi lần cần" — mà là **đồng bộ kiểu đẩy tự động** (`linh-kien-app` chủ động gửi mỗi
  khi danh bạ đổi, `suachua` nhận và cập nhật bảng nội bộ `ktv_lien_he_bh`). Thiết kế đầy đủ ở mục 3
  (áp dụng chung 1 cơ chế cho cả KTV/Khu vực/danh mục linh kiện).
- **`la_giam_sat`** (Giám sát, MỚI): theo đúng mẫu `scopeDatMuaNguoiTao()` của `linh-kien-app` — GS
  chỉ xem đơn có `email_gs = mình`, **không có quyền duyệt/đổi trạng thái**. `email_gs` là 1 cột
  **đóng gói sẵn (denormalized)** ngay trên `phieu_gui_bh` lúc tạo đơn (tra từ
  `ktv_lien_he_bh.khu_vuc_ma → khu_vuc_bh.gs_email` của chính KTV tạo đơn đó), không phải join động
  mỗi lần truy vấn — đúng cách `linh-kien-app` đã làm (`ddh.email_gs`, tự tính lại qua
  `khuVucSync.ts` mỗi khi dữ liệu nguồn đổi).
- **`la_view`** (đổi tên từ `quanly` hiện tại) — **[ĐÃ CHỐT]** giới hạn theo Khu vực, áp dụng đúng
  pattern `user_khu_vuc`/`khuVucViewEmailInSql()`: bảng `user_khu_vuc_bh` (gán N khu vực cho 1 tài
  khoản View), scope = tập KTV có `khu_vuc_ma` nằm trong danh sách đó — "chưa gán khu vực nào thì
  không thấy đơn nào" (an toàn mặc định), không phải mặc định thấy hết như `quanly` hiện tại.

---

## 3. Đồng bộ dữ liệu tham chiếu qua API — danh mục linh kiện, KTV, Khu vực (trả lời yêu cầu #3, #2, #5)

### 3.1 Quyết định đã chốt

| # | Câu hỏi | Trả lời (nguyên văn 03/09/2026) |
|---|---|---|
| 2 | Lọc linh kiện theo gì? | *"Lấy toàn bộ danh sách linh kiện bán bat_tat=1."* — không lọc theo `chi_sua_chua`. |
| 4 | Danh bạ KTV đồng bộ kiểu gì? | *"Bên linh-kien-app sẽ bắn api khi danh sách ktv có thay đổi. bên app sua chua sẽ nhận api vào cập nhật danh sách."* — **cơ chế đẩy (push)**, không phải copy 1 lần cũng không phải gọi API mỗi lần cần. |
| 5 | Khu vực đồng bộ kiểu gì? | *"Khu vực sẽ học linh-kien-app. lấy thông tin đồng bộ tự động từ linh-kien-app khi bên linh kien app có thay đổi"* — cùng cơ chế đẩy như KTV. |

Câu trả lời #4/#5 xác lập 1 **kiểu kiến trúc mới**: thay vì `suachua` chủ động kéo (pull) dữ liệu —
qua nút bấm tay hoặc gọi API mỗi lần cần — thì **`linh-kien-app` chủ động đẩy (push)** dữ liệu sang
`suachua` ngay khi có thay đổi. Đây là hướng ngược chiều so với mẫu `case-lookup` đã phân tích ở mục
1 (nơi `linh-kien-app` là bên chủ động GỌI SANG `dvbh` để kéo dữ liệu) — ở đây `linh-kien-app` đổi vai
trò thành **bên chủ động gửi đi**. Để nhất quán, thiết kế bên dưới áp dụng **cùng 1 cơ chế đẩy cho cả
3 loại dữ liệu tham chiếu** (linh kiện, KTV, Khu vực) — phần linh kiện dùng cơ chế đẩy là suy rộng ra
cho nhất quán, không phải câu trả lời trực tiếp của người dùng (chỉ có KTV/Khu vực được nói rõ).

### 3.2 Thiết kế cơ chế "đẩy" (push sync)

```
linh-kien-app (bên PHÁT)                         suachua (bên NHẬN)
─────────────────────────                         ──────────────────
ktv_lien_he đổi (CREATE/UPDATE/                    POST /api/sync/ktv
  bulk-import/backfill)          ──────push──────▶   UPSERT ktv_lien_he_bh
khu_vuc đổi (CREATE/UPDATE/                        POST /api/sync/khu-vuc
  gán GS)                        ──────push──────▶   UPSERT khu_vuc_bh
linh_kien đổi (CREATE/UPDATE/                      POST /api/sync/linh-kien
  bulk-import)                   ──────push──────▶   UPSERT linh_kien_bh (nếu nguon_du_lieu='dong_bo')
```

- **Kênh truyền**: bắt buộc qua **Service Binding** (`linh-kien-app/wrangler.jsonc` thêm 1
  `services` binding mới trỏ sang Worker `suachua`) — đúng lý do kỹ thuật đã xác nhận ở mục 1
  (`fetch()` thẳng URL bị Cloudflare chặn lỗi 1042 khi 2 Worker cùng tài khoản gọi nhau). Đây là
  điểm **bắt buộc phải sửa thêm bên repo `linh-kien-app`**, không chỉ bên bảo hành.
- **Xác thực chiều ngược** (`linhkien` → `suachua`, ngược hướng với `case-lookup`): dùng 1 secret
  dùng chung đơn giản (`X-Sync-Key` header, lưu qua `wrangler secret put` ở cả 2 phía) — **không cần**
  dựng cả bảng `partner_api_keys` nhiều-key như `case-lookup` (thiết kế cho nhiều đối tác bên ngoài
  khác nhau), vì đây là quan hệ 1-1 cố định giữa đúng 2 Worker nội bộ cùng 1 tổ chức.
  ```jsonc
  // linh-kien-app/wrangler.jsonc — thêm mới
  "services": [
    { "binding": "CASE_LOOKUP_SERVICE", "service": "dvbh", "remote": true },
    { "binding": "SUACHUA_SYNC_SERVICE", "service": "suachua", "remote": true }
  ]
  ```
- **Gửi không chặn** (fire-and-forget): gọi qua `c.executionCtx.waitUntil()` ngay trong route
  CRUD của `settingsKtv.ts`/`settingsDatMua.ts`/`lkSettings.ts` bên `linh-kien-app` — nếu `suachua`
  đang tạm ngưng, thao tác gốc của người dùng `linh-kien-app` vẫn thành công bình thường, không bị
  treo/lỗi theo.
- **Payload**: gửi đúng 1 bản ghi vừa đổi (không cần gửi cả danh sách) — `suachua` UPSERT theo khoá tự
  nhiên (`ma_ktv`/`ma_khu_vuc`/`ma_linh_kien`).

**Đề xuất bổ sung (tự thêm để an toàn dữ liệu, không phải yêu cầu gốc — có thể bỏ nếu không cần):**
cơ chế đẩy thuần tuý **không tự phục hồi** nếu 1 lần đẩy bị lỡ (`suachua` đang down đúng lúc đó, hoặc
dữ liệu có từ trước khi cơ chế này được nối). Đề xuất thêm 1 nút **"🔄 Đồng bộ lại toàn bộ"** phía
`suachua` (Admin bấm tay, hiếm khi cần) — gọi 1 endpoint kéo hàng loạt riêng bên `linh-kien-app`
(`GET /api/partner/ktv-list`, `/khu-vuc-list`, `/linh-kien-list`, dùng lại đúng `X-Sync-Key`) để đồng
bộ lại từ đầu, dùng cho lần khởi tạo đầu tiên (bootstrap) và khi nghi ngờ dữ liệu bị lệch.

### 3.3 Bảng D1 phía `suachua`

```sql
-- Ban sao noi bo, cap nhat qua co che day (KHONG phai nguon that, luon di theo linh-kien-app)
CREATE TABLE ktv_lien_he_bh (
  ma_ktv            TEXT PRIMARY KEY,
  ten_hien_thi, sdt, gmail, email_dang_nhap  TEXT,
  vai_tro_ktv       TEXT CHECK (vai_tro_ktv IN ('KTV','CTV','Tram','Ve tinh')),
  khu_vuc_ma        TEXT REFERENCES khu_vuc_bh(ma),
  ktv_cap1_phu_trach TEXT,
  dong_bo_luc       TEXT NOT NULL
);
CREATE TABLE khu_vuc_bh (
  ma          TEXT PRIMARY KEY,
  ten         TEXT NOT NULL,
  gs_email    TEXT,
  dong_bo_luc TEXT NOT NULL
);

-- Danh muc linh kien - CO the tao them/sua/tat-bat NOI BO (khac 2 bang tren, vi day la du lieu
-- nghiep vu bao hanh tu quan ly, khong chi la ban sao thuan tuy)
CREATE TABLE linh_kien_bh (
  ma_lk                TEXT PRIMARY KEY,
  ten_lk               TEXT NOT NULL,
  don_vi, ghi_chu, anh_demo   TEXT,
  nguon_du_lieu         TEXT CHECK(nguon_du_lieu IN ('dong_bo','noi_bo')) DEFAULT 'noi_bo',
  ma_lk_nguon           TEXT,     -- map nguoc "ma_linh_kien" ben linh-kien-app (NULL neu nguon noi bo)
  so_thang_bao_hanh     INTEGER,  -- MOI, chi bao hanh can
  duoc_dung_bao_hanh    INTEGER NOT NULL DEFAULT 1,  -- bat/tat RIENG cua bao hanh, KHONG lien quan bat_tat ben linh-kien-app
  dong_bo_luc           TEXT,
  nguoi_cap_nhat, ngay_cap_nhat
);
```

Tách `nguon_du_lieu`/`duoc_dung_bao_hanh` khỏi cờ `bat_tat` gốc là **có chủ đích**: đúng nguyên văn
yêu cầu "**tắt bật danh sách sử dụng trong bảo hành**" — Admin bảo hành tắt được 1 linh kiện *chỉ
trong phạm vi bảo hành* mà không ảnh hưởng việc nó vẫn đang bán bình thường bên `linh-kien-app`, và
ngược lại. `ktv_lien_he_bh`/`khu_vuc_bh` **không có CRUD nội bộ** (chỉ đọc, luôn theo đúng
`linh-kien-app` — sửa phải sửa ở `linh-kien-app`, tự động đẩy sang), còn `linh_kien_bh` **có CRUD nội
bộ đầy đủ** (tạo thêm/sửa thông tin/tắt-bật) cho các dòng `nguon_du_lieu='noi_bo'` — đúng yêu cầu gốc
"cho phép tạo thêm, sửa thông tin, tắt bật danh sách sử dụng trong bảo hành".

---

## 4. Phân tích chi tiết các bước chuyển đổi dữ liệu prototype → sẵn sàng lên Cloudflare

### 4.1 Đối chiếu mô hình dữ liệu prototype (`DB.*` trong `index.html`) với schema D1 cần viết

| Entity trong prototype | Bảng D1 tương ứng cần tạo | Ghi chú chuyển đổi |
|---|---|---|
| `DB.users` | `users` | Áp cờ vai trò mới theo mục 2 (đổi `qtri`→`vai_tro_qtri`, `quanly`→`la_view`, thêm `la_giam_sat`), bỏ hẳn cột `mien`. |
| `DB.cases` | **KHÔNG tạo bảng riêng** | Đây chỉ là dữ liệu mock case CSKH trong prototype — thật ra phải gọi `case-lookup` API sang `dvbh` (xem mục 4.2), không lưu bản sao. |
| — (mới, không có trong prototype) | `ktv_lien_he_bh`, `khu_vuc_bh` | Nhận qua cơ chế đẩy từ `linh-kien-app` (mục 3.3) — thay thế hoàn toàn khái niệm `mien` 2 giá trị của prototype. |
| `DB.linh_kien` | `linh_kien_bh` | Theo thiết kế mục 3 (thêm `nguon_du_lieu`, `so_thang_bao_hanh`, `duoc_dung_bao_hanh`), lọc nguồn `bat_tat=1` (không lọc `chi_sua_chua`). |
| `DB.phieu_gui` (+ `ghi_chu_log[]`) | `phieu_gui_bh` + `phieu_gui_bh_ghi_chu` (tách mảng lồng thành bảng con — D1/SQL không lưu được mảng JSON tự nhiên như object JS) | Giữ đúng state machine đã chốt qua các vòng CLAUDE.md (`nhap→da_gui→da_tiep_nhan→...`). |
| `DB.phieu_sc` (đơn cha) | `phieu_sua_chua_bh` | Bao gồm `so_luong_khai`, `so_luong_thuc_nhan`, `loai_doi_tru_de_xuat`, `nguon_tao`, `bao_cao_sai_thong_tin[]` (→ bảng con `phieu_sua_chua_bh_baocaosai`). |
| `DB.phieu_sc_ct` (đơn vị con) | `phieu_sua_chua_bh_ct` | Đầy đủ `huong_xu_ly` (7 giá trị đã chốt), `loai_bao_hanh`, `loai_doi_tru`, `ma_lk_thuc_te`, `xu_ly_xac`, `ly_do_tu_choi`. |
| `DB.phieu_tra` | `phieu_tra_bh` | State machine `nhap→cho_ke_toan_duyet→da_duyet_ke_toan→da_gui→ktv_da_nhan` (đã chốt thứ tự Kế toán duyệt TRƯỚC Kho đóng gói, khác #4 gốc). |
| `DB.logs` (insert-only, dùng chung 4 `entity_type`) | `logs_bh` (`entity_type`, `entity_id`, `tu_trang_thai`, `den_trang_thai`, `nguoi_thuc_hien`, `thoi_gian`, `ghi_chu`) | Port gần như nguyên bản — đúng đúng pattern "log insert-only" mà CLAUDE.md gốc (`dvbh`) cũng dùng. |
| `DB.settings.ly_do_cham` / `ly_do_tu_choi` | `settings_ly_do_cham_bh`, `settings_ly_do_tu_choi_bh` | Port nguyên seed data (8 + 5 giá trị đã seed trong prototype). |
| `ADMIN_COL_*` (localStorage, tuỳ biến cột bảng Admin BH) | **Giữ nguyên `localStorage`** (client-side), không cần bảng D1 | Đây là preference hiển thị cá nhân, không phải dữ liệu nghiệp vụ — đúng nguyên tắc "chỉ lưu D1 những gì cần chia sẻ/tồn tại lâu dài giữa nhiều người dùng". |

### 4.2 Thay thế các giả định "tái dùng trực tiếp" bằng API đối tác

CLAUDE.md bảo hành hiện giả định tái dùng trực tiếp (đọc thẳng bảng SQL) các nguồn sau bên
`cloudflare smarttrade base` — **tất cả phải đổi sang gọi qua API đối tác** vì giờ là 2 Worker/2 D1
tách biệt hoàn toàn, không share database:

| Giả định cũ (đọc thẳng bảng) | Thực tế cần làm (API đối tác) |
|---|---|
| `case_dvbh.seri_san_pham`, `ngay_mua`, `thoi_gian_cskh_tiep_nhan` | Gọi `GET /api/partner/case-lookup?id=...` (đã có sẵn ở `dvbh`, đã có 29 field — cần đối chiếu xem đủ field cho tính hạn bảo hành chưa; nếu thiếu field nào, phải **xin bổ sung vào `CASE_LOOKUP_COLUMNS`** ở `dvbh`, không tự ý query thẳng). |
| `users.giam_sat_quan_ly` (suy ra `mien`) | **[ĐÃ CHỐT]** Không phụ thuộc `dvbh` nữa — GS/Khu vực giờ đồng bộ từ `linh-kien-app` qua cơ chế đẩy (mục 3), `email_gs` đóng gói sẵn trên `phieu_gui_bh` lúc tạo đơn (mục 2), không suy ra `mien` kiểu cũ nữa. |
| `linh_kien` (đã gộp `lk_danh_muc`, có `so_thang_bao_hanh`/`loai_hang`) | **Không dùng bảng này của `dvbh` nữa** — bảng đó đang gắn với module `dat-mua-lk` đã bị ẩn (mục 0). Nguồn đúng cần dùng là `linh_kien` của **`linh-kien-app`** (mục 3), KHÔNG PHẢI của `dvbh`. |
| Mẫu `phieu_xuat_kho` (+ CHECK `loai_don`) | **Không mở rộng bảng này của `dvbh`** (đang thuộc module đã ẩn, và migration cũ đã cảnh báo không nên mở rộng CHECK bảng có FK sống). Bảo hành tự định nghĩa `phieu_tra_bh` từ đầu — đúng cách `linh-kien-app` đã tự định nghĩa `dat_don_hang`/`phieu_xuat_kho` riêng thay vì tiếp tục phụ thuộc bảng gốc. |
| `moduleAccess.ts`, `navConfig.ts`, `dataVersions`, `scopeDatMua.ts` | **Viết bản sao độc lập** cho bảo hành (như `linh-kien-app` đã tự viết `scopeDatMua.ts` riêng, không import từ `dvbh`) — các pattern này là *kỹ thuật* dùng lại được (copy code), không phải *dữ liệu* dùng chung được. |

### 4.3 Rà soát 100% nội dung nghiệp vụ đã chốt qua CLAUDE.md — checklist không được bỏ sót

CLAUDE.md bảo hành hiện có **22 mục quyết định theo vòng thời gian** (từ "Phản hồi vòng 1" tới "Nút
thao tác nhanh FAST" mới nhất 03/09/2026) — khi viết migration/route thật, cần đối chiếu **từng mục**
để không bỏ sót, đặc biệt các quy tắc dễ quên vì nằm rải rác:

- 7 giá trị `huong_xu_ly` (`sua_chua, doi_moi, tra_lai_ktv, xac_nhan_tru_no, dich_vu_tinh_phi,
  tu_choi, chuyen_kho`) + đúng bảng ánh xạ trạng thái tiếp theo (`HUONG_CAN_NV`/`HUONG_TAO_PHIEU_TRA`
  trong prototype).
- Cổng SLA 24h (`isOverdue`) + 3 mức badge (24h/72h) — **là 2 khái niệm khác nhau**, không được gộp
  logic khi port sang backend thật.
- Bắt buộc mail phê duyệt CHỈ khi `loai_bao_hanh='ngoai_bh'` (không phải bắt buộc dù chọn gì như bản
  chốt đầu tiên 17/08 đã bị thay thế).
- Đơn dịch vụ tính phí (`nguon_tao='admin_dich_vu'`, `phieu_gui_id` nullable, `case_id` tuỳ chọn).
- 8 điểm "đẩy ngược" trong ma trận CRUD Excel #5 — đã áp dụng đủ ở prototype, cần port đủ khi có
  backend thật (không phải chỉ 3 điểm ưu tiên cao ban đầu).
- Bộ 10 nút FAST + cơ chế bấm số giờ SLA ghi lý do chậm độc lập (tính năng mới nhất, dễ bị quên khi
  đối chiếu ngược từ tài liệu cũ hơn).

**Đề xuất công cụ kiểm tra chéo**: viết 1 script đối chiếu tự động (đọc lại toàn bộ CLAUDE.md, trích
các đoạn có từ khoá quyết định "ĐÃ CHỐT"/"chốt") lập thành checklist Excel/Markdown riêng trước khi
bắt đầu viết migration đầu tiên — đảm bảo "chuyển đổi 100% nội dung" đúng nghĩa đen như yêu cầu #5,
không dựa vào trí nhớ khi đọc lại 1 file dài ~1800 dòng.

---

## 5. Kế hoạch từng bước

| Giai đoạn | Nội dung | Phụ thuộc |
|---|---|---|
| **0. Chốt quyết định** | ✅ **Xong** — 5/5 câu hỏi mở đã trả lời (xem đầu tài liệu). Còn 1 việc cần xác nhận trước khi qua Giai đoạn 1: vị trí mã nguồn thật của Worker `suachua` đang online (mục 7) | — |
| **1. Scaffold hạ tầng** | Xác nhận repo nguồn cho `suachua` (thư mục này, hay 1 thư mục mới — xem mục 7) → `wrangler.jsonc`, `backend/src/{index,routes,middleware,lib}`, `frontend/` (mirror cấu trúc `linh-kien-app`), `wrangler d1 create` (nếu D1 thật chưa có), Google OAuth Client mới, Service Binding tới CẢ `dvbh` (case-lookup) LẪN `linhkien` (nhận đẩy KTV/Khu vực/linh kiện, mục 3) | Giai đoạn 0 |
| **2. Migration D1 tổng hợp 1 lần** | Viết `0001_init.sql` gộp toàn bộ bảng đã liệt kê ở mục 4.1 — theo đúng mẫu `linh-kien-app` đã làm ("schema tổng hợp 1 lần từ hình dạng CUỐI CÙNG", không replay từng bước thiết kế nhỏ đã đổi qua các vòng) | Giai đoạn 1 |
| **3. Port backend** | Viết route theo nhóm màn hình (13 màn hình đã liệt kê ở Ke-hoach-Trien-khai cũ) — ưu tiên **luồng chính trước** (đúng cách vòng 1 prototype đã làm: tạo phiếu→gửi→Kho tiếp nhận→Admin phân loại→NV chẩn đoán→xác nhận hoàn tất→phiếu trả→Kế toán duyệt→Kho gửi→KTV nhận), sau đó mới tới 8 điểm đẩy ngược + FAST actions | Giai đoạn 2 |
| **4. Port frontend** | **Không port thẳng HTML prototype** — viết lại thành component React/Tailwind (stack chung với `dvbh`/`linhkien`). **Lợi thế có sẵn**: bản redesign UI 22/08/2026 của prototype đã port 1:1 token màu/font từ `linh-kien-app` — chỉ cần chuyển đổi cấu trúc component, không cần thiết kế lại từ đầu | Giai đoạn 3 (có thể song song 1 phần) |
| **5. API đối tác 2 chiều** | (a) Xin cấp `X-API-Key` từ `dvbh` cho `case-lookup`; (b) Sửa `linh-kien-app` (repo khác) thêm Service Binding + `X-Sync-Key` + 3 điểm gọi đẩy (KTV/Khu vực/linh kiện đổi → gọi `suachua`); (c) `suachua` xây 3 route nhận đẩy `POST /api/sync/{ktv,khu-vuc,linh-kien}` + 3 route pull dự phòng (nút "Đồng bộ lại toàn bộ") | Giai đoạn 1, có thể làm song song 2-4 |
| **6. QA thủ công** | Không có test suite tự động ở cả `dvbh`/`linh-kien-app` (đúng quy ước chung) — checklist kiểm thử tay theo từng vai trò (đã có sẵn phần khung ở CLAUDE.md mục "Đề xuất tiếp theo" #4) + Puppeteer smoke test tương tự đã áp dụng cho prototype | Giai đoạn 3-4 |
| **7. Deploy thật** | Viết `DEPLOY.md` riêng theo đúng mẫu `linh-kien-app/DEPLOY.md` (đã có checklist 7 bước rất chi tiết để copy khung) | Giai đoạn 6 |

---

## 6. Rà soát quy ước UI/mobile — bảng so sánh 3 hệ + gap cần bổ sung

| Hạng mục | `dvbh` (hệ gốc CRM) | `linh-kien-app` (đặt mua LK) | Bảo hành hiện tại (prototype) |
|---|---|---|---|
| PWA manifest | ❌ Không có | ✅ `manifest.webmanifest` đầy đủ icon 3 cỡ | ❌ Chỉ là HTML tĩnh `file://`, chưa phải PWA |
| Service Worker | ❌ Không có | ✅ Có, nhưng **chỉ xử lý Web Push**, không cache offline | ❌ Chưa có |
| Web Push | ❌ Không có | ✅ Đầy đủ (`push.ts` + `webPush.ts` + VAPID key thật) | ❌ Chưa có |
| `shortcuts` trong manifest | — | ❌ **Thiếu** (mảng `shortcuts` không tồn tại) | ❌ Chưa có manifest nên cũng chưa có |
| Install prompt chủ động | — | ✅ `usePwaInstall.ts` bắt `beforeinstallprompt` (Android/Desktop Chrome); iOS Safari phải hướng dẫn thủ công riêng (không có API) | ❌ Chưa có |
| Offline cache | — | ❌ Không có (SW chỉ lo push) | ❌ Chưa có |
| Responsive/mobile-first UI | Có (không đầy đủ bằng bảo hành) | Có | ✅ **Đã rất đầy đủ** — mobile sheet riêng cho form dài, bottom tab bar cố định, viền input phân biệt được/không sửa, click-vào-dòng-mở-chi-tiết toàn hệ, xem-trước-mobile ngay trong trang |
| Design token/màu | Gốc, nhiều tông | Port 1 phần từ gốc | ✅ Đã port **1:1** từ `linh-kien-app` (cùng bảng màu tone, cùng font Manrope/Inter/IBM Plex Mono) — điểm mạnh có sẵn, không cần làm lại |
| Kết nối API Cloudflare (Service Binding) | (bên nhận) | ✅ Có mẫu chuẩn đầy đủ (case-lookup) | ❌ Chưa có (chỉ là ghi chú trong CLAUDE.md, chưa code) |

### Kế hoạch bổ sung khi build hệ thống thật

1. **Kế thừa nguyên bộ PWA/Push/install-prompt của `linh-kien-app`** — copy y hệt cấu trúc file
   (`manifest.webmanifest`, `sw.js`, `usePwaInstall.ts`, `push.ts`, `webPush.ts`), chỉ đổi: tên app,
   icon riêng, `theme_color`, VAPID key mới (tạo riêng cho `suachua`, không dùng chung key với
   `linhkien`).
2. **Bổ sung `shortcuts` vào manifest** — đây là gap thật ở **cả 2 hệ hiện có** (không có sẵn để
   copy, phải tự thiết kế mới hoàn toàn). Đề xuất theo vai trò, tối đa 4 shortcut (giới hạn thực tế
   của hầu hết trình duyệt/OS):
   - KTV: "➕ Tạo phiếu gửi mới" → `/#/ktv/tao-phieu`
   - Admin BH: "⚡ Hàng đợi phân loại" → `/#/admin/phan-loai`
   - Kho: "📷 Quét mã tiếp nhận" → `/#/kho/tiep-nhan`
   - Kế toán: "✔️ Duyệt phiếu trả" → `/#/ketoan/duyet`
   ```json
   "shortcuts": [
     { "name": "Tạo phiếu gửi mới", "url": "/#/ktv/tao-phieu", "icons": [{"src": "/icon-192.png", "sizes": "192x192"}] }
   ]
   ```
3. **Offline cache** — chỉ nên làm mức tối thiểu (cache app-shell: HTML/CSS/JS tĩnh) cho V1, **chưa
   cần offline data** (đồng bộ ngoại tuyến rồi push lại là bài toán phức tạp hơn nhiều, không có tiền
   lệ ở 2 hệ kia — không nên tự mở rộng phạm vi khi chưa được yêu cầu).
4. **Service Binding + partner API** — build theo đúng mẫu mục 1 (đã có sẵn code thật để tham khảo
   1:1 từ `linh-kien-app/backend/src/lib/caseLookupClient.ts` + `cloudflare smarttrade
   base/backend/src/routes/partnerApi.ts`).

---

## 7. Câu hỏi đã chốt + 1 câu hỏi mới còn mở

### Đã chốt (03/09/2026, xem "Phản hồi" đầu tài liệu để có nguyên văn)

1. ~~Xác nhận hướng kiến trúc Worker độc lập tên `suachua`~~ — **[ĐÃ CHỐT]** đúng, domain
   `suachua.dichvu3t.workers.dev` đã tồn tại thật, đang online.
2. ~~Lọc linh kiện theo `chi_sua_chua` hay `bat_tat`~~ — **[ĐÃ CHỐT]** lấy toàn bộ `bat_tat=1`.
3. ~~Vai trò Giám sát/View~~ — **[ĐÃ CHỐT]** xây mới theo đúng mẫu `linh-kien-app` (GS theo quan hệ/
   `email_gs`, View giới hạn theo Khu vực qua `user_khu_vuc_bh`).
4. ~~Danh bạ KTV đồng bộ kiểu gì~~ — **[ĐÃ CHỐT]** cơ chế đẩy (push) tự động từ `linh-kien-app`.
5. ~~`khu_vuc` hay `mien`~~ — **[ĐÃ CHỐT]** dùng `khu_vuc`, đồng bộ tự động (đẩy) từ `linh-kien-app`,
   bỏ hẳn khái niệm `mien` 2 giá trị của prototype.

### Câu hỏi mới còn mở

6. **[Cần trả lời trước khi qua Giai đoạn 1]** Không tìm thấy thư mục mã nguồn nào cho Worker
   `suachua` trên máy này (đã rà `F:\claude\QLBH 3T\` — chỉ có `gui-bao-hanh-linh-kien`,
   `linh-kien-app`, `cloudflare smarttrade base`), nhưng người dùng xác nhận domain đã online. Mã
   nguồn thật đang nằm ở đâu?
   - (a) Chính thư mục `gui-bao-hanh-linh-kien` này sẽ **trở thành** nguồn cho Worker `suachua` (đúng
     cách thư mục `linh-kien-app` có tên khác với Worker `linhkien` của nó) — thư mục hiện tại thêm
     `backend/`+`frontend/` mới, D1 thật đã có sẵn (chỉ cần điền `database_id` vào `wrangler.jsonc`
     mới)?
   - (b) Đã deploy 1 bản Worker "rỗng"/placeholder (chỉ để giữ chỗ tên miền), toàn bộ code/D1 thật vẫn
     cần tạo từ đầu?
   - (c) Mã nguồn nằm ở máy/thư mục khác chưa được đưa vào phiên làm việc này?

   **Bằng chứng mới nghiêng về (a)**: phát hiện file `logo sua chua 3t.png` (858×887, tạo
   26/08/2026 — 1 icon app hoàn chỉnh dạng vuông bo góc, gradient xanh lá, biểu tượng cờ-lê/tua-vít
   chéo + chữ "3T") nằm sẵn trong chính thư mục `gui-bao-hanh-linh-kien` này, chưa từng được commit
   hay dùng ở đâu trong prototype — đúng kích cỡ/phong cách 1 icon PWA (so sánh với `icon-512.png` của
   `linh-kien-app`). Đây là dấu hiệu cho thấy thư mục này đã được chuẩn bị trước làm nơi chứa tài
   nguyên cho `suachua`, nhưng **vẫn cần người dùng xác nhận trực tiếp**, không tự suy đoán rồi coi
   như đã chốt.

**Đề xuất tiếp theo sau khi có câu trả lời cho #6**: cập nhật lại mục "Liên hệ với hệ thống chính"
trong CLAUDE.md của bảo hành theo đúng kết luận đã chốt ở đây, rồi bắt đầu Giai đoạn 1 (scaffold hạ
tầng, mục 5).
