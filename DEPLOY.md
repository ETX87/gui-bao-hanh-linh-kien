# DEPLOY.md — Checklist triển khai lần đầu (Worker "suachua")

Repo này (`gui-bao-hanh-linh-kien`) là nguồn mã thật cho Worker `suachua` — xem CLAUDE.md mục "Câu
hỏi #6 chốt xong...". **Khác `linh-kien-app` lúc mới tách**: domain
`suachua.dichvu3t.workers.dev` **đã tồn tại và đang online** (người dùng xác nhận 04/09/2026), nhưng
là bản rỗng/placeholder — chưa rõ D1/OAuth Client đã được tạo kèm theo hay chưa. **Bước 0 dưới đây
bắt buộc làm trước tiên** để xác định đang ở tình huống nào.

**Cập nhật 04/09/2026: cả 6 giai đoạn (backend, 13 màn hình frontend, đồng bộ đẩy 2 chiều với
`linh-kien-app`, PWA cơ bản) đã code xong và commit — checklist dưới đây giờ là bước triển khai
THẬT SỰ cuối cùng, không còn là "scaffold rỗng" như lúc file này viết lần đầu.

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
npx wrangler secret put LINHKIEN_SYNC_API_KEY   # tu bia 1 chuoi ngau nhien dai (vd openssl rand -hex 32)
```

**`LINHKIEN_SYNC_API_KEY` giờ CẦN đặt ngay từ đầu** (Giai đoạn 5 đã code xong, không còn là việc
"để sau" như dòng này viết ban đầu) — đây là secret `suachua` dùng để xác thực dữ liệu KTV/Khu vực/
linh kiện `linh-kien-app` đẩy sang (header `X-Sync-Key`, xem `backend/src/routes/sync.ts`). **Giá trị
phải khớp 100%** với secret `SUACHUA_SYNC_API_KEY` sẽ đặt ở repo `linh-kien-app` (bước riêng, xem mục
"Đồng bộ dữ liệu tham chiếu" bên dưới) — tự bịa 1 chuỗi ngẫu nhiên dài, dùng lại đúng giá trị đó ở cả
2 nơi.

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
2. Xác nhận màn hình hiện đúng tên/email/vai trò "Admin hệ thống" — vào thẳng màn "Người dùng"
   (`#/qtri/nguoi-dung`, có UI thật từ Giai đoạn 4) để gán vai trò cho những người dùng khác (KTV/
   Kho/Admin BH/NV/Kế toán/Giám sát/View), không cần `curl`/Postman nữa.

## 7. Bật đồng bộ dữ liệu tham chiếu (KTV/Khu vực/linh kiện) từ `linh-kien-app`

Code cả 2 phía đã xong (Giai đoạn 5, xem CLAUDE.md) — bước này chỉ còn deploy + đặt secret khớp
nhau, KHÔNG cần sửa code thêm:

1. **Deploy `suachua` xong trước** (bước 4 ở trên) — Service Binding mới bên `linh-kien-app` cần
   script `suachua` đã tồn tại thật trên tài khoản mới bind được.
2. Ở repo `linh-kien-app`: đặt secret `npx wrangler secret put SUACHUA_SYNC_API_KEY` — dán **đúng**
   giá trị đã đặt cho `LINHKIEN_SYNC_API_KEY` ở bước 3 trên (1 secret dùng chung, không phải 2 giá
   trị khác nhau).
3. Deploy lại `linh-kien-app` (`npm run deploy`, từ repo đó) — để Service Binding
   `SUACHUA_SYNC_SERVICE` (đã thêm sẵn trong `wrangler.jsonc` của repo đó) thực sự có hiệu lực.
4. Đợi cron chạy (mỗi giờ, phút 0) hoặc vào `linh-kien-app` → Settings → tab "Đồng bộ DVBH" → bấm
   "🔄 Đồng bộ ngay" để đẩy thử ngay lập tức — kiểm tra bằng cách xem `suachua` đã có dữ liệu
   `ktv_lien_he_bh`/`khu_vuc_bh`/`linh_kien_bh` (nguồn `dong_bo`) chưa (VD qua màn "Danh mục linh
   kiện" trong `suachua`, hoặc `wrangler d1 execute --remote`).

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
