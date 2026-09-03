# Phân tích liên kết với "Đặt mua linh kiện" + Kế hoạch chuyển đổi module Bảo hành lên Cloudflare

**Ngày viết:** 03/09/2026. **Trạng thái:** báo cáo phân tích + kế hoạch, **CHƯA triển khai gì** — chờ
người dùng chốt các câu hỏi mở ở mục 7 trước khi viết code/migration thật.

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
4). Đây là thay đổi kiến trúc lớn nhất so với tài liệu cũ — **cần người dùng xác nhận trước khi làm**
(xem câu hỏi mở #1).

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
  kiện **dùng để sửa chữa, không bán rời cho khách**. Đây là ứng viên tự nhiên nhất cho khái niệm
  "linh kiện được phép dùng trong bảo hành" mà yêu cầu #3 nhắc tới — **nhưng cần xác nhận lại với
  người dùng** vì đây là suy luận từ tên/cách dùng cờ, không phải tài liệu nghiệp vụ nói thẳng
  (xem câu hỏi mở #2).
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
- Điểm còn CHƯA chắc chắn 100%: **chưa xác nhận Worker `suachua.dichvu3t.workers.dev` đã tồn tại thật
  hay chỉ là URL dự kiến/placeholder trong code** (không có quyền truy cập Cloudflare Dashboard từ
  phiên làm việc này để kiểm tra trực tiếp) — cần người dùng xác nhận trạng thái thật của domain này
  trước khi đưa vào `DEPLOY.md` của bảo hành như 1 giá trị đã chốt.

---

## 2. Cơ chế quản lý tài khoản đề xuất cho hệ thống bảo hành

Đối chiếu 4 vai trò người dùng nêu trong yêu cầu #2 với mô hình đã có ở `linh-kien-app` (khuyến nghị
**đi theo mẫu `linh-kien-app`**, không theo mẫu cũ/đã đóng băng của `dvbh`, vì `linh-kien-app` mới
đúng là "hệ độc lập song song" cùng loại hình mà bảo hành sẽ trở thành):

| Vai trò yêu cầu | Mô hình `linh-kien-app` tương ứng | Đối chiếu với bảo hành hiện tại (prototype) |
|---|---|---|
| **KTV** | `la_ktv_dvbh` / `la_ve_tinh` (cờ boolean) + `ktv_lien_he` (danh bạ, `khu_vuc_ma`) | Đã có `la_ktv_dvbh`/`la_ve_tinh` y hệt (kế thừa từ #4 Ke-hoach cũ) — **khớp sẵn**, không cần đổi. |
| **Giám sát** | `vai_tro='Giam sat'` — GS phụ trách theo `khu_vuc.gs_email`, chỉ theo dõi (không duyệt) | **CHƯA có khái niệm này trong bảo hành** — hiện chỉ có `qtri` (Admin hệ thống) và `quanly` (view toàn hệ thống, không giới hạn theo phạm vi) — **đây là khoảng trống thật cần lấp**, xem câu hỏi mở #3. |
| **Admin hệ thống** | `vai_tro='Admin'` (luôn xem/sửa được mọi thứ, tự động full quyền) | Đã có `qtri` (thêm 01/09/2026: `#/qtri/nguoi-dung` CRUD user, `#/qtri/cai-dat` settings) — **khớp đúng**, chỉ cần đổi tên cờ cho nhất quán. |
| **View** | `la_view` — chỉ đọc, **giới hạn cứng theo Khu vực** qua `user_khu_vuc` | Đã có `quanly` — chỉ đọc nhưng **xem TOÀN HỆ THỐNG, không giới hạn phạm vi** — khác bản chất với `la_view` (là 1 khoảng cách thật, không phải chỉ khác tên gọi), xem câu hỏi mở #3. |

### Thiết kế đề xuất cho `users` của bảo hành (Worker `suachua` độc lập)

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
  la_view             INTEGER DEFAULT 0,   -- MỚI — đổi tên "quanly" hiện tại, thêm scope theo miền
  vai_tro_qtri        INTEGER DEFAULT 0,   -- = "qtri" hiện tại (Admin hệ thống, luôn full quyền)
  mien                TEXT,                -- giữ 'nam'/'bac' đơn giản HOẶC nâng cấp theo khu_vuc (câu hỏi mở #4)
  created_at, updated_at
)
```

- **Auth**: Google OAuth 2.0 **riêng** (Client ID/Secret riêng, không dùng chung với `dvbh`/
  `linhkien`) — đúng nguyên tắc "mỗi hệ độc lập tự có OAuth app" mà `linh-kien-app` đã thiết lập.
  `BOOTSTRAP_ADMIN_EMAIL` tự promote Admin lần đầu, giống hệt mẫu.
- **Danh bạ KTV**: bảo hành có cần tự có bảng `ktv_lien_he` riêng (nhập tay/copy 1 lần từ
  `linh-kien-app`), hay gọi API sang `linh-kien-app` mỗi lần cần tra cứu (không lưu bản sao)? — đây
  là quyết định đánh đổi giữa "luôn đồng bộ, phụ thuộc uptime của `linhkien`" và "độc lập nhưng có thể
  lệch dữ liệu nếu không đồng bộ lại" — xem câu hỏi mở #4.
- **`la_giam_sat`** (Giám sát, MỚI): chỉ xem các đơn bảo hành do KTV mình phụ trách gửi (dùng đúng cơ
  chế scope theo quan hệ, giống `scopeDatMuaNguoiTao()` của `linh-kien-app` — lọc theo
  `phieu_gui.nguoi_tao IN (SELECT email FROM users WHERE giam_sat_quan_ly = mình)`), **không có
  quyền duyệt/đổi trạng thái** — chỉ theo dõi.
- **`la_view`** (đổi tên từ `quanly` hiện tại): nếu chốt cần giới hạn theo miền/khu vực (câu hỏi mở
  #3), áp dụng đúng pattern `user_khu_vuc`/`khuVucViewEmailInSql()` — "chưa gán phạm vi nào thì không
  thấy đơn nào", không phải mặc định thấy hết.

---

## 3. Đồng bộ danh mục linh kiện qua API (trả lời chi tiết yêu cầu #3)

### Thiết kế đề xuất

1. **Xây route MỚI bên `linh-kien-app`** (repo đó cần sửa thêm, không chỉ bên bảo hành):
   `GET /api/partner/linh-kien-list` — mirror đúng cơ chế `case-lookup` (X-API-Key qua bảng
   `partner_api_keys` mới — **`linh-kien-app` hiện chưa có bảng này, phải tạo mới**, không sẵn có),
   trả về toàn bộ `linh_kien` đang `bat_tat=1` (hoặc theo tham số `since=` để đồng bộ tăng dần dựa
   trên `ngay_cap_nhat`).
2. **Bảng `linh_kien` của bảo hành — bản sao ĐỘC LẬP** (không dùng chung schema, đúng nguyên tắc mọi
   hệ trong nhóm này đang áp dụng), có thêm các cột **chỉ bảo hành mới cần**:
   ```
   linh_kien_bh (
     ma_lk               TEXT PRIMARY KEY,
     ten_lk              TEXT NOT NULL,
     don_vi, ghi_chu, anh_demo   TEXT,
     nguon_du_lieu        TEXT CHECK(nguon_du_lieu IN ('dong_bo','noi_bo')) DEFAULT 'noi_bo',
     ma_lk_nguon          TEXT,     -- map ngược "ma_linh_kien" bên linh-kien-app (NULL nếu nguồn nội bộ)
     so_thang_bao_hanh    INTEGER,  -- MỚI, chỉ bảo hành cần (đã ghi nhận là cột thiếu ở #4 Ke-hoach cũ)
     duoc_dung_bao_hanh   INTEGER NOT NULL DEFAULT 1,  -- bật/tắt RIÊNG của bảo hành, KHÔNG liên quan bat_tat bên linh-kien-app
     ngay_dong_bo_gan_nhat TEXT,
     nguoi_cap_nhat, ngay_cap_nhat
   )
   ```
   Tách `nguon_du_lieu`/`duoc_dung_bao_hanh` khỏi cờ `bat_tat` gốc là **có chủ đích**: đúng nguyên
   văn yêu cầu "**tắt bật danh sách sử dụng trong bảo hành**" — nghĩa là Admin bảo hành phải tắt được
   1 linh kiện *chỉ trong phạm vi bảo hành* mà không ảnh hưởng tới việc nó vẫn đang bán bình thường
   bên `linh-kien-app`, và ngược lại.
3. **Nút "🔄 Đồng bộ danh mục từ Đặt mua linh kiện"** (Admin bảo hành bấm tay — không cần cron, đúng
   quy ước "không có cron" mà cả 2 hệ kia đang theo) — UPSERT theo `ma_lk_nguon`, **không đụng** tới
   các dòng `nguon_du_lieu='noi_bo'` (Admin bảo hành tự thêm, không tồn tại bên `linh-kien-app`) —
   đúng yêu cầu "cho phép tạo thêm" độc lập.
4. **CRUD nội bộ đầy đủ** (tạo thêm/sửa thông tin/tắt-bật) — giữ nguyên như phần lớn tài liệu cũ đã
   thiết kế, chỉ thêm 2 cột mới `nguon_du_lieu`/`ma_lk_nguon` để phân biệt dòng nào đến từ đồng bộ.

### Điểm cần xác nhận trước khi build
Lọc theo đúng cờ `chi_sua_chua=1` (chỉ lấy nhóm "chỉ dùng để sửa chữa") hay lấy **toàn bộ**
`bat_tat=1` (mọi linh kiện đang bán, không phân biệt chỉ-sửa-chữa hay bán-lẻ)? — xem câu hỏi mở #2.

---

## 4. Phân tích chi tiết các bước chuyển đổi dữ liệu prototype → sẵn sàng lên Cloudflare

### 4.1 Đối chiếu mô hình dữ liệu prototype (`DB.*` trong `index.html`) với schema D1 cần viết

| Entity trong prototype | Bảng D1 tương ứng cần tạo | Ghi chú chuyển đổi |
|---|---|---|
| `DB.users` | `users` | Áp cờ vai trò mới theo mục 2 (đổi `qtri`→`vai_tro_qtri`, `quanly`→`la_view`, thêm `la_giam_sat`). |
| `DB.cases` | **KHÔNG tạo bảng riêng** | Đây chỉ là dữ liệu mock case CSKH trong prototype — thật ra phải gọi `case-lookup` API sang `dvbh` (xem mục 4.2), không lưu bản sao. |
| `DB.linh_kien` | `linh_kien_bh` | Theo thiết kế mục 3 (thêm `nguon_du_lieu`, `so_thang_bao_hanh`, `duoc_dung_bao_hanh`). |
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
| `users.giam_sat_quan_ly` (suy ra `mien`) | **`case-lookup` hiện KHÔNG trả field này** (đây là field nội bộ hệ thống người dùng, không phải dữ liệu case) — cần 1 trong 2 hướng: (a) bảo hành tự có khái niệm GS/miền riêng (không phụ thuộc `dvbh`, xem mục 2), hoặc (b) xin mở thêm 1 endpoint đối tác mới bên `dvbh` chuyên trả quan hệ GS↔KTV. Khuyến nghị (a) — đơn giản hơn, đúng tinh thần "độc lập" mà `linh-kien-app` đã chọn. |
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
| **0. Chốt quyết định** | Trả lời đủ 4 câu hỏi mở (mục 7) — đặc biệt kiến trúc Worker độc lập (mục 0) | — |
| **1. Scaffold hạ tầng** | Tạo repo mới `suachua` (mirror cấu trúc `linh-kien-app`: `wrangler.jsonc`, `backend/src/{index,routes,middleware,lib}`, `frontend/`), `wrangler d1 create`, Google OAuth Client mới, Service Binding tới CẢ `dvbh` (case-lookup) LẪN `linhkien` (cần route mới, mục 3) | Giai đoạn 0 |
| **2. Migration D1 tổng hợp 1 lần** | Viết `0001_init.sql` gộp toàn bộ bảng đã liệt kê ở mục 4.1 — theo đúng mẫu `linh-kien-app` đã làm ("schema tổng hợp 1 lần từ hình dạng CUỐI CÙNG", không replay từng bước thiết kế nhỏ đã đổi qua các vòng) | Giai đoạn 1 |
| **3. Port backend** | Viết route theo nhóm màn hình (13 màn hình đã liệt kê ở Ke-hoach-Trien-khai cũ) — ưu tiên **luồng chính trước** (đúng cách vòng 1 prototype đã làm: tạo phiếu→gửi→Kho tiếp nhận→Admin phân loại→NV chẩn đoán→xác nhận hoàn tất→phiếu trả→Kế toán duyệt→Kho gửi→KTV nhận), sau đó mới tới 8 điểm đẩy ngược + FAST actions | Giai đoạn 2 |
| **4. Port frontend** | **Không port thẳng HTML prototype** — viết lại thành component React/Tailwind (stack chung với `dvbh`/`linhkien`). **Lợi thế có sẵn**: bản redesign UI 22/08/2026 của prototype đã port 1:1 token màu/font từ `linh-kien-app` — chỉ cần chuyển đổi cấu trúc component, không cần thiết kế lại từ đầu | Giai đoạn 3 (có thể song song 1 phần) |
| **5. API đối tác 2 chiều** | (a) Xin cấp `X-API-Key` từ `dvbh` cho `case-lookup`; (b) Xây route `linh-kien-list` mới bên `linh-kien-app` (repo khác — cần xin phép/tự làm ở repo đó) + tạo bảng `partner_api_keys` bên `linh-kien-app` (chưa có sẵn); (c) nút đồng bộ danh mục linh kiện | Giai đoạn 1, có thể làm song song 2-4 |
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

## 7. Câu hỏi mở — cần người dùng quyết định trước khi triển khai

1. **[Quan trọng nhất]** Xác nhận hướng kiến trúc: xây module bảo hành thành **1 Worker + D1 độc lập
   thứ 3** tên `suachua` (theo đúng placeholder đã có sẵn trong `linh-kien-app`, khớp đúng nguyên văn
   yêu cầu hôm nay), **thay vì** nhúng vào `cloudflare smarttrade base` như CLAUDE.md cũ giả định?
   Nếu đồng ý, cần thêm: domain `suachua.dichvu3t.workers.dev` đã tồn tại thật chưa hay còn phải tạo
   mới?
2. Cờ `chi_sua_chua` (linh kiện "Only sửa chữa", không bán rời) bên `linh-kien-app` có đúng là tập
   linh kiện "được phép dùng trong bảo hành" hay không — hay bảo hành cần lấy **toàn bộ** linh kiện
   `bat_tat=1` (không phân biệt bán-lẻ hay chỉ-sửa-chữa)?
3. Vai trò "Giám sát" trong bảo hành: xây mới theo đúng mẫu `linh-kien-app` (GS phụ trách theo
   quan hệ/khu vực, chỉ theo dõi không duyệt), hay dùng luôn vai trò `quanly` hiện có (xem toàn hệ
   thống, không giới hạn phạm vi)? Và vai trò `quanly`/View có cần giới hạn theo miền/khu vực như
   `la_view` bên `linh-kien-app`, hay giữ nguyên "xem tất cả" như hiện tại?
4. Danh bạ KTV cho bảo hành: tự có bảng riêng (nhập tay hoặc copy 1 lần từ `linh-kien-app`, sau đó
   không đồng bộ tiếp — đúng mẫu `linh-kien-app` đã làm với `dvbh`), hay luôn gọi API sang
   `linh-kien-app` mỗi lần cần (không lưu bản sao, nhưng phụ thuộc uptime của `linhkien`)?
5. `khu_vuc` (linh động, mở rộng qua Settings) hay giữ `mien` (2 giá trị Nam/Bắc đơn giản như hiện
   tại trong prototype)? Ảnh hưởng trực tiếp tới thiết kế `users`/scope ở mục 2.

**Đề xuất tiếp theo sau khi có câu trả lời**: cập nhật lại mục "Liên hệ với hệ thống chính" trong
CLAUDE.md của bảo hành theo đúng kết luận đã chốt ở đây, trước khi bắt đầu Giai đoạn 1 (scaffold hạ
tầng) — tránh lặp lại tình huống 1 giả định kiến trúc cũ (build trong `dvbh`) bị lỗi thời mà không ai
phát hiện cho tới khi đã viết dở migration/route.
