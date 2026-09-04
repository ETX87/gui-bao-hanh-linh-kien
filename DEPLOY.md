# DEPLOY.md — Checklist triển khai lần đầu (Worker "suachua")

Repo này (`gui-bao-hanh-linh-kien`) là nguồn mã thật cho Worker `suachua` — xem CLAUDE.md mục "Câu
hỏi #6 chốt xong...". **Khác `linh-kien-app` lúc mới tách**: domain
`suachua.dichvu3t.workers.dev` **đã tồn tại và đang online** (người dùng xác nhận 04/09/2026), nhưng
là bản rỗng/placeholder — chưa rõ D1/OAuth Client đã được tạo kèm theo hay chưa. **Bước 0 dưới đây
bắt buộc làm trước tiên** để xác định đang ở tình huống nào.

**Xác nhận với người yêu cầu trước khi chạy bất kỳ lệnh nào ở đây** nếu bạn là 1 phiên AI mới không
chắc đã được uỷ quyền — đây đều là hành động tạo/sửa tài nguyên thật.

## 0. Kiểm tra tài nguyên đã có sẵn cho Worker rỗng/placeholder

```bash
npx wrangler deployments list --name suachua
npx wrangler d1 list
```

Nếu Worker `suachua` đã có D1 binding thật (kiểm qua Cloudflare Dashboard → Workers → suachua →
Settings → Bindings), dùng lại đúng `database_id` đó ở bước 2 thay vì tạo mới — **không tạo D1 thứ 2
trùng lặp**.

## 1. Tạo Google Cloud OAuth Client mới

1. [Google Cloud Console](https://console.cloud.google.com/) → tạo project mới (KHÔNG dùng chung
   project của `dvbh`/`linh-kien-app`).
2. OAuth consent screen → tên app "Sửa chữa bảo hành", email hỗ trợ.
3. Credentials → Create Credentials → OAuth client ID → Web application.
   - Authorized redirect URI: `https://suachua.dichvu3t.workers.dev/api/auth/callback` (đã điền sẵn
     trong `wrangler.jsonc`) — thêm tạm `http://localhost:8789/api/auth/callback` để test local.
4. Lưu `Client ID` + `Client Secret` — dùng ở bước 3.

## 2. Tạo/xác nhận D1 database

```bash
# Chay tu thu muc goc repo nay
npx wrangler d1 create sua-chua-bao-hanh-db
```

Dán `database_id` in ra vào `wrangler.jsonc` (`d1_databases[0].database_id`), thay
`REPLACE_AFTER_WRANGLER_D1_CREATE`. Nếu bước 0 đã tìm thấy D1 có sẵn, bỏ qua lệnh trên, dán thẳng
`database_id` đó vào.

## 3. Đặt secrets (KHÔNG đặt trong `wrangler.jsonc`)

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET          # chuoi ngau nhien dai, vd: openssl rand -hex 32
npx wrangler secret put CASE_LOOKUP_API_KEY     # xem buoc 5
```

`LINHKIEN_SYNC_API_KEY` (xác thực dữ liệu đẩy từ `linh-kien-app`) chỉ cần đặt khi làm Giai đoạn 5
(đồng bộ KTV/Khu vực/danh mục linh kiện) — chưa cần ở lần deploy đầu tiên này.

## 4. Chạy migration + deploy lần đầu

```bash
npm install
npm run db:migrate:remote
npm run deploy
```

## 5. Xin API key từ hệ `dvbh` cho `CASE_LOOKUP_API_KEY`

Endpoint `GET /api/partner/case-lookup` đã có sẵn ở `dvbh` (repo `cloudflare smarttrade base`).
Đăng nhập `dvbh` bằng Admin → Settings → "API đối tác" → tạo key mới, đặt tên "Sửa chữa bảo hành" →
`npx wrangler secret put CASE_LOOKUP_API_KEY` dán giá trị vừa tạo. **Service Binding
`CASE_LOOKUP_SERVICE` trong `wrangler.jsonc` (đã cấu hình sẵn, trỏ script `dvbh`) là BẮT BUỘC** —
không được xoá (lý do kỹ thuật 1042, xem `wrangler.jsonc`).

## 6. Đăng nhập lần đầu + gán vai trò

1. Mở `https://suachua.dichvu3t.workers.dev` → đăng nhập Google bằng đúng email đặt trong
   `BOOTSTRAP_ADMIN_EMAIL` (mặc định `smarttrade.vp@gmail.com`) → tự động lên Admin hệ thống
   (`la_qtri`).
2. Xác nhận màn hình hiện đúng tên/email/vai trò "Admin hệ thống" (Giai đoạn 1 chỉ có màn hình xác
   nhận Auth — chưa có UI quản lý người dùng, dùng tạm `PATCH /api/users/:email` qua curl/Postman
   nếu cần gán vai trò cho người khác trước khi Giai đoạn 3/4 có UI thật).

## Giai đoạn 5 (chưa làm ở đợt scaffold này) — Đồng bộ dữ liệu tham chiếu

Xem `du an sua chua bao hanh/Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md` mục 3 — cần sửa thêm
bên repo `linh-kien-app` (Service Binding mới + nhân bản `dvbhSyncClient.ts`) trước khi `suachua`
nhận được dữ liệu KTV/Khu vực/danh mục linh kiện thật.

## Kiểm thử local trước khi deploy thật (khuyến nghị)

```bash
cp .dev.vars.example .dev.vars     # dien gia tri that hoac de placeholder cho GOOGLE_CLIENT_ID/SECRET
npm run db:migrate:local
npm run dev:worker      # port 8789
npm run dev:frontend    # port 5175, proxy /api sang 8789
```

Mở `http://localhost:5175` → gọi `GET /api/auth/dev-login` (chỉ hoạt động khi
`LOCAL_DEV_BYPASS_AUTH=true` trong `.dev.vars`) để vào thẳng vai trò Admin hệ thống, không cần Google
OAuth thật.
