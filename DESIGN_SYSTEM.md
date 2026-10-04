# DESIGN_SYSTEM.md — Sửa chữa bảo hành 3T (`suachua`)

Bộ quy tắc giao diện của app. **Port từ `../App Khieu nai/DESIGN_SYSTEM.md`** (chốt 04/10/2026, nguyên
văn: *"áp dụng quy tắc giao diện theo tiep nhan app (đổi gam màu theo gam màu icon hiện có)"*) — giữ
nguyên cấu trúc/nguyên tắc của App Khiếu nại, chỉ đổi **gam màu thương hiệu** từ tím (icon App Khiếu
nại) sang **xanh lá** (icon `logo sua chua 3t.png`: gradient xanh lá, cờ-lê + tua-vít + "3T").

Nguồn sự thật kỹ thuật: `frontend/src/styles/tokens.css` (biến CSS) + `frontend/tailwind.config.js`
(map sang class Tailwind) + `frontend/src/ui/*` (component dùng chung). **Không tự đặt mã màu hex rời
trong màn hình** — luôn dùng token.

## 1. Nguyên tắc cốt lõi

1. **To trên mobile, gọn trên desktop.** Viết class mobile trước, thu gọn bằng `lg:` (ví dụ ô nhập
   `py-2.5 text-base lg:py-1.5 lg:text-sm`). Người dùng hiện trường (KTV, Kho) thao tác bằng điện
   thoại, ngón tay — vùng bấm tối thiểu ~44px.
2. **Mờ khi = 0.** Số liệu bằng 0 hiện xám/mờ; chỉ tô màu khi thật sự có việc.
3. **Màu mạnh chỉ dành cho cảnh báo thật** (quá hạn SLA > 72h = đỏ đặc). Không cầu vồng.
4. **Mỗi trạng thái 1 tone cố định** (xem §2.5) — quét bằng mắt là phân biệt được.
5. **Bảng → thẻ trên mobile** (< 768px) — không bắt người dùng cuộn ngang trên điện thoại.

## 2. Màu

### 2.1 Thương hiệu (từ icon)

| Token | Hex | Dùng cho |
|---|---|---|
| `--brand-50` | `#eefbf3` | nền rất nhạt |
| `--brand-100` | `#d7f5e3` | |
| `--brand-200` | `#b2eac9` | viền nhẹ |
| `--brand-300` | `#7fd9a8` | viền nét đứt ô chọn ảnh |
| `--brand-400` | `#3fc487` | |
| `--brand-500` | `#21b16d` | |
| `--brand-600` / `--accent` | `#15803f` | **nút chính, link nhấn, focus** (chữ trắng ~5.1:1, đạt AA) |
| `--brand-700` / `--accent-ink` | `#116a34` | chữ nhấn trên nền nhạt, `theme-color` |
| `--brand-800` / `--accent-dark` | `#0e5a2c` | hover nút chính |
| `--brand-900` | `#0a4321` | |
| `--accent-soft` | nền nhạt brand | hover menu, capsule bottom-nav, ô chọn ảnh |

Gradient: `--sidebar-gradient` (sidebar + header mobile), `bg-hero` (khối chào Trang chủ).

### 2.2 Chữ & bề mặt

`--ink #0f172a` (tiêu đề) · `--ink-body #334155` (nội dung) · `--ink-soft #5b6477` (phụ) ·
`--ink-faint #94a3b8` (rất mờ) · `--link #0284c7` (mã ID bấm được).
`--bg #f4f8f5` (nền trang) · `--surface #fff` (card) · `--surface-2 #f1f6f3` (vùng lồng) ·
`--line #e3ebe6` / `--line-strong #cddad2` (viền).

### 2.3 Ô nhập

`--field-bg #f7faf8` + `--field-border #b9cbc0` — ô nhập được luôn có nền + viền rõ, phân biệt với chữ
chỉ-xem (`ReadField`, không viền). Focus: viền `--accent` + vòng `rgba(21,128,63,0.15)`.

### 2.4 Tone ngữ nghĩa

`red` (lỗi/quá hạn/việc của tôi) · `amber` (vàng thật — đang chờ) · `blue` (đang xử lý ở khâu khác) ·
`green` (xong) · `violet` (chờ KTV bổ sung — đã chốt từ vòng 1) · `orange` · `slate/gray` (trung tính).

### 2.5 Trạng thái (`ui/StatusBadge.tsx`, `kind="unit"|"gui"|"tra"`)

Dấu chấm `•` = đang chờ một người xử lý.

- Đơn vị: chờ phân loại amber• · Admin cần xem lại red• · chờ KTV bổ sung violet• · chờ chẩn đoán blue• ·
  chờ Admin xác nhận amber• · sẵn sàng gộp phiếu trả brand · kết thúc gray.
- Phiếu gửi: nháp gray · đã gửi amber• · đã tiếp nhận green.
- Phiếu trả: nháp gray · chờ kế toán amber• · đã duyệt blue• · đã gửi blue• · KTV đã nhận green ·
  khiếu nại red•.

### 2.6 SLA (`ui/SlaBadge.tsx`)

≤ 24h xanh lá · 24–72h vàng · > 72h đỏ đặc + ⚠. Chỉ hiện số giờ (không chữ "Quá hạn"). Giờ SLA = 24h
liên tục **bỏ qua Chủ nhật** (xem `backend/src/lib/sla.ts`).

### 2.7 Bẫy kỹ thuật Tailwind 3.4

`bg-[var(--x)]/40`, `ring-[var(--accent)]/15`… (opacity trên màu biến CSS tuỳ ý) **không sinh CSS** —
dùng token đặc hoặc `rgba(...)` viết thẳng.

## 3. Chữ

Font **Plus Jakarta Sans** (`@fontsource/plus-jakarta-sans`, 400–800, đóng gói cùng app — không gọi
Google Fonts). Tiêu đề card `text-[15px] lg:text-sm font-bold`. Header bảng **không viết hoa toàn bộ**.
Mã ID: `font-mono text-xs font-semibold text-[var(--link)]`.

## 4. Bố cục

- **Desktop**: Sidebar gradient xanh lá (nhóm menu theo vai trò, mặc định thu gọn `w-16`, mở `w-64`,
  huy hiệu đỏ) + TopBar trắng mờ (avatar chữ cái đầu, lời chào, vai trò, Đăng xuất). Nội dung max
  1440px khi sidebar thu gọn.
- **Mobile**: header gradient (icon, tên app, Cài đặt, Thoát) + **bottom nav trắng mờ** cố định, tối đa
  5 tab (4 mục + "☰ Thêm"), mục đang mở có capsule `--accent-soft`, nhãn ngắn (`short` trong
  `layout/routes.ts`).
- Bo góc: card `rounded-xl`, nút/ô nhập `rounded-lg`. Bóng: `shadow-card` (card), `shadow-pop`
  (dropdown/modal/toast), `shadow-brand` (header màu).

## 5. Component (`frontend/src/ui`)

| Component | Ghi chú |
|---|---|
| `Btn` | `primary` (brand) · `secondary` · `danger` · `success` · `ghost`; size `sm` / `md` / `touch` |
| `Badge` | tone + `dot` |
| `StatusBadge` | §2.5 |
| `Input/Select/Textarea` (`FIELD_CLASS`) | §2.3 |
| `Field` / `ReadField` / `SectionLabel` | nhãn luôn TRÊN ô nhập |
| `Card` | `title` + `actions` tuỳ chọn |
| `StatCard` | thẻ KPI pastel, icon + watermark, = 0 thì xám |
| `Table` | ≥ 768px bảng 1 dòng; < 768px thẻ (cột đầu = tiêu đề) |
| `Modal` | mobile: toàn màn hình mọi modal; desktop: `max-w-2xl` mặc định, `full` cho "UI chi tiết" |
| `SearchableSelect` | danh sách dài (linh kiện, KTV) — gõ để lọc, tự mở khi gõ phím |
| `ImagePicker` | ô bấm lớn viền nét đứt, đếm + xem trước ảnh |
| `Toast` | mobile nổi trên bottom nav |
| `Pagination` | tự ẩn khi chỉ 1 trang |

## 6. Khi thêm màn hình mới

1. Dùng component trên, không viết lại nút/ô nhập/badge riêng.
2. Trạng thái → `StatusBadge`; mã enum → nhãn tiếng Việt (`lib/constants.ts`); mã linh kiện → tên
   (`useLkName`).
3. Thử ở 375px và 1440px trước khi coi là xong.
