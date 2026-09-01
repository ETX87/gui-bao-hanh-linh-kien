# Kế hoạch triển khai — Module "Quản lý sửa chữa bảo hành"

**Trạng thái:** Đang lập kế hoạch — **chưa đụng vào code gốc**. Bản này gộp toàn bộ 2 vòng góp ý
(2026-08-16 và 2026-08-17) sau khi đối chiếu 2 file phân tích gốc
(`He-thong-quy-trinh-bao-hanh_Phan-tich-va-De-xuat.md`, `Danh-gia-va-Hoan-thien-Quy-trinh-Bao-hanh.md`)
và tài liệu rà soát quy trình (`Ra-Soat_Luong-Quy-Trinh-Va-Nhap-Lieu.md`) với kiến trúc thực tế của hệ
thống DVBH đang chạy. Toàn bộ câu hỏi mở ở vòng rà soát trước đã được chốt — xem mục 0.

## 0. Quyết định đã chốt

| Câu hỏi | Quyết định |
|---|---|
| Lưu ảnh | **Google Drive**, nhưng **upload trực tiếp trong app** (không dán link tay) — hệ thống tự đẩy lên Drive qua tài khoản Admin đã cấp quyền OAuth (Drive-scope, khác OAuth đăng nhập hiện có). |
| Vai trò "Admin bảo hành" / "NV sửa chữa (SCVP)" | 2 cờ mới `la_admin_bh`, `la_nv_sua_chua` trên `users`, cấp qua Settings/Users — theo pattern `la_kho`/`la_ke_toan`. |
| Vị trí module | Độc lập hoàn toàn trong sidebar. |
| `debt_adjustments` | Chưa làm ở giai đoạn này. |
| Nguồn linh kiện | Dùng chung `linh_kien` với Đặt mua linh kiện + cờ `chi_danh_cho_bao_hanh` — mục 1.1. |
| **Phân miền Nam/Bắc** | KTV thừa hưởng miền theo GS phụ trách (`users.giam_sat_quan_ly`); Kho/Admin BH/NV sửa chữa có miền riêng. Xem toàn quốc là 1 filter tuỳ chọn, KHÔNG phải mặc định — mục 2. |
| **Case ngoại lệ / phê duyệt "ngoài bảo hành"** | **Bỏ hẳn ý tưởng hàng đợi duyệt trong app** (bảng `approvals`/`phe_duyet_ngoai_le_bh` ở bản trước — **KHÔNG làm nữa**). Thay bằng 2 trường ghi chú ngay trên dòng LK khi Admin bảo hành đánh dấu "Ngoài bảo hành": thông tin mail phê duyệt + mã phê duyệt (nếu có). Phê duyệt thật diễn ra ngoài hệ thống. |
| **Phiếu trả bảo hành** | Không còn tự động theo phiếu gửi. Admin bảo hành **chủ động tạo**, theo từng KTV, gom nhiều dòng đã xong (từ nhiều phiếu gửi khác nhau); 1 KTV có thể có nhiều phiếu trả song song. Mô hình giống hệt `phieu_xuat_kho` (nháp → add dòng → nhập mã MISA sau → xác nhận gửi kho) nhưng **là bảng riêng**, không tái dùng thẳng `phieu_xuat_kho` — xem mục 3 lý do kỹ thuật. |
| **Mã ID sự cố (case)** | **Bắt buộc tuyệt đối.** Không chọn được case thì không tạo được dòng LK trong phiếu gửi. |
| **Trả xác** | Tự động phát sinh 1 phiếu trả xác riêng mỗi khi 1 dòng LK đi vào Đổi mới / Sửa có thay linh kiện / kết quả chẩn đoán "Trả xác" — không cần Admin bảo hành tạo tay. |
| Deploy | Demo/mockup trước, build thật sau khi duyệt UI. |

## 1. Tái sử dụng hạ tầng có sẵn (không xây lại)

| Cần | Đã có sẵn | Dùng lại như thế nào |
|---|---|---|
| Người gửi (KTV/CTV/Trạm) | `users` + `la_ktv_dvbh`, `la_ve_tinh`, `tram_cha` | Không tạo bảng `partners` riêng |
| **Quan hệ GS phụ trách (dùng để suy ra miền)** | `users.giam_sat_quan_ly` (migration 0053, email GS 1-1 cho KTV/Trạm/Vệ tinh) | Không cần bảng mới cho việc gán miền theo GS — chỉ thêm 1 cột `mien` trên `users` |
| Tra Serial/Model | `case_dvbh.seri_san_pham`, `case_dvbh.id` (đã index) | Mỗi dòng LK **bắt buộc** liên kết 1 case có sẵn, tự lấy toàn bộ thông tin phụ |
| Danh mục linh kiện | `linh_kien` (gộp từ `lk_danh_muc` ở migration 0060) | Dùng thẳng, thêm cờ lọc — mục 1.1 |
| **Mẫu "PXK gộp nhiều dòng + MISA sau"** | `phieu_xuat_kho` + `phieu_xuat_kho_dong` + `phieu_xuat_kho_log` (migration 0058, 0066, 0077, 0079) — đã có sẵn đúng luồng "tạo nháp → add dòng → nhập `ma_misa`/`ma_van_don` sau → xác nhận" | **Phiếu trả bảo hành copy nguyên mẫu này** (không sửa bảng gốc — xem mục 3) |
| State machine + lịch sử | Pattern `dat_don_hang_log` / `tra_hang_log` / `phieu_xuat_kho_log` | Copy nguyên pattern: 1 cột `trang_thai` + 1 bảng `*_log` insert-only |
| Cache báo cáo | `data_versions` + `cachedReport()` | Thêm 1 domain mới `sua_chua_bh` |
| Badge sidebar | `notifications/count` | Thêm 1 `countKey` mới, **đếm theo miền của người xem** (mục 2) |

## 1.1. Linh kiện "chỉ dùng bảo hành" — cờ mới trên bảng `linh_kien` dùng chung

- Thêm cột boolean `linh_kien.chi_danh_cho_bao_hanh` (mặc định `0`).
- Không tách API — `GET /api/settings/linh-kien` vẫn trả toàn bộ, lọc ở tầng client (đúng pattern
  `loaiDeXuatCache.ts`): picker trong `DatMuaLinhKienModule.tsx` ẩn dòng `chi_danh_cho_bao_hanh=1`;
  picker trong module Sửa chữa bảo hành hiện toàn bộ.
- Thêm checkbox "Chỉ dùng cho bảo hành (ẩn khỏi Đặt mua linh kiện)" vào form CRUD linh kiện có sẵn ở
  Settings module.

## 1.2. Kiểm tra hết hạn bảo hành theo linh kiện (mới, 2026-08-17)

Thêm 2 cột mới lên `linh_kien` (dùng chung, không tách bảng):
- `so_thang_bao_hanh` INTEGER — số tháng bảo hành tối đa của mã này (VD 12/24/36), NULL nếu không áp
  dụng (mã không dùng cho bảo hành).
- `loai_hang` TEXT CHECK (`'may'`|`'linh_kien_le'`) — phân biệt nguyên máy hay linh kiện rời.

**Logic cảnh báo:** hiện cảnh báo ở **2 chỗ** — (a) ngay lúc KTV thêm dòng LK vào phiếu gửi (mang tính
thông báo sớm, không chặn tạo phiếu), và (b) lúc Admin bảo hành phân loại (ở đây mới thực sự **bắt
buộc** nhập thông tin/mã duyệt nếu muốn xử lý tiếp — quyết định UX của tôi, ưu tiên báo sớm cho KTV
thay vì chỉ để tới bước cuối mới biết). Hệ thống tính:

```
so_ngay_da_dung = thoi_gian_tiep_nhan_su_co - case_dvbh.ngay_mua
   -- CHOT 2026-08-17: "thoi_gian_tiep_nhan_su_co" = case_dvbh.thoi_gian_cskh_tiep_nhan
   -- (moc CSKH nhan yeu cau tu khach ban dau), KHONG PHAI luc Kho nhan thung hang o module nay.

Neu so_ngay_da_dung > linh_kien.so_thang_bao_hanh (quy doi thang → ngay)
   → hien canh bao "Linh kien/San pham nay da het thoi gian bao hanh"
```

**Khi vượt hạn mà Admin bảo hành vẫn muốn xử lý:** bắt buộc nhập **thông tin duyệt + mã duyệt** —
CHỐT 2026-08-17: **tái dùng đúng 2 trường** đã có sẵn cho nhánh "Ngoài bảo hành" (`thong_tin_mail_pd`,
`ma_phe_duyet` trên `phieu_sua_chua_bh`, mục 3) — hết hạn bảo hành tự động đòi hỏi 2 trường này bất kể
Admin chọn `loai_bao_hanh` là gì, không có cặp trường riêng cho lý do hết hạn.

## 2. Phân miền Nam / Bắc

**Cột mới:** `users.mien` TEXT CHECK (`'nam'`|`'bac'`), nullable.
- Gán trực tiếp cho: Giám sát, Kho, Admin bảo hành, NV sửa chữa.
- KTV/CTV/Trạm **không có cột này** — miền suy ra runtime bằng join tới `users.giam_sat_quan_ly` rồi
  lấy `mien` của GS đó.

**Cột mới trên đối tượng nghiệp vụ:** `phieu_gui_bh.mien` và `phieu_sua_chua_bh.mien` (mỗi dòng có
miền riêng, vì Admin bảo hành/NV sửa chữa xử lý ở mức DÒNG, còn Kho tiếp nhận ở mức PHIẾU).

**Quy tắc:**
1. Khởi tạo `phieu_gui_bh.mien` = miền của KTV tạo phiếu (qua GS). Mỗi dòng LK thêm vào kế thừa miền
   này khi tạo.
2. Giao diện của Kho/Admin BH/NV sửa chữa **mặc định lọc theo `users.mien` của chính họ**.
3. Có 1 **filter "Xem toàn quốc"** (tắt mặc định) — bật lên để thấy phiếu/dòng của mọi miền, dùng khi
   cần hỗ trợ chéo (ví dụ KTV gửi nhầm hàng ra miền khác).
4. **Badge/số đếm "cần xử lý" luôn đếm theo miền hiện tại của đối tượng** — không phụ thuộc người đang
   xem có bật "Xem toàn quốc" hay không.
5. **Khi 1 nhân sự khác miền THỰC SỰ xử lý** một phiếu/dòng (qua filter toàn quốc) — ví dụ Kho miền Bắc
   tiếp nhận 1 phiếu gốc miền Nam — thì **`mien` của đối tượng đó đổi sang miền của người vừa xử lý**,
   từ đó nó "chạy theo luồng" của miền mới. **CHỐT 2026-08-17: chỉ 2 vai trò được quyền "tiếp nhận trái
   miền"** — **Kho** (đổi `phieu_gui_bh.mien` lúc tiếp nhận thùng hàng, kéo theo mọi dòng con) và
   **Admin bảo hành** (đổi `phieu_sua_chua_bh.mien` của riêng dòng đó lúc phân loại). **NV sửa chữa
   KHÔNG có quyền này** — luôn làm việc trong đúng miền đã được gán, không tự chuyển miền được.

## 3. Mô hình dữ liệu D1

```
lookup_codes                  -- ma tra cuu (QR/ghi tay), entity_type ('phieu_gui'|'phieu_tra')
  id, code (unique), entity_type, entity_id, created_at, created_by

phieu_gui_bh                  -- HEADER 1 lan gui hang
  id, lookup_code_id (FK), nguoi_tao (email), ngay_tao,
  ngay_gui_xe, hinh_thuc_gui ('xe_noi_bo'|'giao_van'),
  ma_xe_hoac_tai_xe, don_vi_van_chuyen, ma_van_don, ghi_chu,
  trang_thai ('nhap'|'da_gui'), mien ('nam'|'bac' - xem muc 2, doi duoc khi Kho tiep nhan khac mien),
  created_at, updated_at

tiep_nhan_kho_bh              -- Kho tiep nhan CA THUNG HANG, KHONG mo kiem tung linh kien
  id, phieu_gui_id (FK), so_kien_khai, so_kien_thuc_nhan, trang_thai_doi_chieu,
  nguoi_nhan (email, mien cua nguoi nay se ghi de phieu_gui_bh.mien neu khac),
  thoi_gian_nhan, ghi_chu

phieu_sua_chua_bh             -- 1 DONG = 1 linh kien/san pham loi, BAT BUOC gan case
  id, phieu_gui_id (FK), case_id (FK case_dvbh, NOT NULL - khong cho tao neu thieu),
  ma_lk (FK linh_kien.ma_linh_kien, NULL neu "ca san pham"),
  mo_ta_loi, ghi_chu, tiep_nhan_kho_id (FK, gan sau khi kho xac nhan),
  mien ('nam'|'bac', ke thua tu phieu_gui luc tiep nhan - xem muc 2),

  -- Phan loai (Admin bao hanh) - THAY THE hoan toan y tuong "approvals" o ban truoc:
  loai_bao_hanh ('trong_bh'|'ngoai_bh'),
  thong_tin_mail_pd TEXT,               -- chi nhap khi loai_bao_hanh='ngoai_bh'
  ma_phe_duyet TEXT,                    -- tuy chon, chi khi 'ngoai_bh'
  huong_xu_ly ('sua_chua'|'doi_moi'|'tu_choi'|'chuyen_kho'),
  nguoi_sua_chua (email NV, gan khi huong_xu_ly='sua_chua'),

  -- Chan doan (NV sua chua):
  ket_qua_chan_doan ('khong_loi'|'sua_duoc'|'de_xuat_doi_moi'|'tra_xac'),
  admin_xac_nhan_hoan_tat INTEGER NOT NULL DEFAULT 0,   -- NV KHONG tu dong ticket

  phieu_tra_id (FK phieu_tra_bh, NULL cho toi khi Admin BH gom vao 1 phieu tra),
  trang_thai (state machine tong hop tu cac truong tren, xem muc 4),
  trang_thai_cho ('khong_cho'|'cho_linh_kien'),
  created_at, updated_at

phieu_sua_chua_bh_anh         -- moi: thay the 1 cot anh_url don le
  id, phieu_id (FK phieu_sua_chua_bh),
  nhom ('loi_ban_dau'|'truoc_sua'|'sau_sua'|'linh_kien_loi'),
  drive_url, thu_tu, uploaded_by, uploaded_at
  -- loi_ban_dau: KTV upload luc tao dong (khong gioi han cung 5)
  -- truoc_sua / sau_sua / linh_kien_loi: NV sua chua upload, MOI NHOM toi da 5 anh

phieu_sua_chua_bh_log         -- event log, insert-only
  id, phieu_id (FK), tu_trang_thai, den_trang_thai, thoi_gian, nguoi_thuc_hien, ghi_chu

de_xuat_linh_kien_bh          -- TICKET DOC LAP xuat linh kien vat tu sua chua (day dien, cut noi...)
                                  -- KHONG phai linh kien loi can thay cua dong chinh - day la vat tu
                                  -- tieu hao NV can de THAO TAC sua chua, xin xuat kho rieng
  id, phieu_id (FK phieu_sua_chua_bh), ma_lk (FK linh_kien.ma_linh_kien), so_luong,
  nguoi_khoi_tao ('nv_de_xuat'|'admin_tu_tao'), nguoi_tao (email - NV hoac chinh Admin BH),
  ngay_de_xuat, trang_thai ('cho_xu_ly'|'huy'|'da_duyet'),
  ma_don_hang, ma_misa,        -- CHI co khi trang_thai='da_duyet', do Admin BH nhap luc duyet
  ngay_xu_ly, nguoi_xu_ly (Admin BH)
  -- Khi 1 dong co >=1 de_xuat_linh_kien_bh dang 'cho_xu_ly': dong cha
  -- (phieu_sua_chua_bh.trang_thai_cho) TU DONG = 'cho_linh_kien', khoa lai cho toi khi ticket nay
  -- duoc xu ly xong (huy hoac duyet)

phieu_tra_xac_bh              -- TU DONG phat sinh khi Doi moi / Sua co thay LK / chan doan "Tra xac"
  id, phieu_id (FK phieu_sua_chua_bh), ly_do ('doi_moi'|'thay_lk'|'chan_doan_tra_xac'),
  trang_thai ('cho_xu_ly'|'thanh_cong'|'huy_bo'|'tieu_huy'|'tra_xac_ktv'),
  thoi_gian_xu_ly, ma_duyet_tra_xac, ghi_chu, nguoi_xu_ly (Kho hoac Admin BH), created_at

phieu_tra_bh                  -- HEADER phieu tra, giong het mau phieu_xuat_kho nhung BANG RIENG
  id, lookup_code_id (FK), ktv_nhan (email - 1 phieu tra CHI 1 KTV), nguoi_tao (Admin BH),
  trang_thai ('nhap'|'da_xac_nhan_gui_kho'|'da_dong_goi'|'ke_toan_da_duyet'|'da_gui'|'ktv_da_nhan'),
  ma_misa, ma_van_don, anh_bien_ban_url,
  created_at, updated_at

phieu_tra_bh_dong             -- junction, giong het phieu_xuat_kho_dong
  phieu_tra_bh_id (FK), phieu_sua_chua_bh_id (FK),
  PRIMARY KEY (phieu_tra_bh_id, phieu_sua_chua_bh_id)

phieu_tra_bh_log
  id, phieu_tra_bh_id (FK), tu_trang_thai, den_trang_thai, thoi_gian, nguoi_thuc_hien, ghi_chu
```

**Vì sao `phieu_tra_bh` là bảng RIÊNG, không tái dùng thẳng `phieu_xuat_kho`:** `phieu_xuat_kho.loai_don`
đã có `CHECK (loai_don IN ('mua','cong_no','tra_hang'))` (migration 0079). D1 wrap mỗi migration trong
transaction ngầm nên không sửa được CHECK bằng cách thêm giá trị — chỉ có pattern "tạo bảng mới → copy
dữ liệu → drop → rename", và pattern đó **không dùng được cho `phieu_xuat_kho`** vì nó đã có 2 bảng con
(`phieu_xuat_kho_dong`, `phieu_xuat_kho_log`) đang giữ dòng tham chiếu FK sống — xem đúng cảnh báo này
trong `CLAUDE.md` mục "D1 migration constraint". Vì vậy tôi copy nguyên hình dạng đã chứng minh hiệu
quả của `phieu_xuat_kho` sang 1 bảng mới thay vì mở rộng CHECK của bảng cũ.

**CHỐT LẠI 2026-08-17 — có 2 mã MISA RIÊNG BIỆT, không trùng nhau:**
1. `de_xuat_linh_kien_bh.ma_misa` — mã MISA cho **vật tư tiêu hao NV xin xuất để thao tác sửa chữa**
   (dây điện, cút nối...), nhập bởi Admin bảo hành ngay lúc duyệt ticket đề xuất đó. Đây là 1 ticket
   **độc lập với dòng chính** — trong lúc ticket này còn `cho_xu_ly`, dòng sửa chữa cha bị **dừng lại**
   (`trang_thai_cho='cho_linh_kien'`) cho tới khi ticket được huỷ hoặc duyệt.
2. `phieu_tra_bh.ma_misa` — mã MISA cho **cả lô hàng trả về KTV** (nhiều dòng đã xử lý xong gộp lại),
   nhập bởi Admin bảo hành sau khi làm việc với MISA ngoài hệ thống, ở mức phiếu trả — không liên quan
   gì đến mã MISA của vật tư sửa chữa ở trên.

(Bản trước tôi từng hiểu nhầm là chỉ có 1 mã MISA dùng chung — đã sửa lại đúng theo góp ý.)

**Không có bảng** `products`/`serials`/`partners`/`debt_adjustments`/`approvals`/`phe_duyet_ngoai_le_bh`.

## 4. Vai trò & phân quyền

| Vai trò | Cờ | Thấy gì trong module |
|---|---|---|
| KTV/CTV/Trạm | `la_ktv_dvbh` / `la_ve_tinh` (đã có) | Tạo phiếu gửi, tra cứu tiến độ, xác nhận nhận hàng trả |
| Kho | `la_kho` (đã có) + `mien` (mới) | Tiếp nhận thùng hàng theo miền mình (+ toàn quốc nếu bật filter), đóng gói phiếu trả, xử lý trả xác |
| **Admin bảo hành** | `la_admin_bh` (mới) + `mien` (mới) | Phân loại từng dòng theo miền mình, tạo/quản lý phiếu trả theo KTV, xử lý trả xác |
| **NV sửa chữa (SCVP)** | `la_nv_sua_chua` (mới) + `mien` (mới) | Nhận việc theo miền mình, chẩn đoán, đề xuất linh kiện, upload ảnh báo cáo |
| Kế toán | `la_ke_toan` (đã có) | Duyệt đối soát phiếu trả trước khi gửi |
| Admin (hệ thống) | `vai_tro = Admin` | Toàn quyền + cấu hình danh mục + gán `mien` cho Kho/Admin BH/NV sửa chữa/GS |

Migration cần thêm: `la_admin_bh`, `la_nv_sua_chua`, `mien` trên `users` (3 cột, theo pattern migration
0053). `effectiveModules()` tự cấp module mới khi `la_admin_bh` hoặc `la_nv_sua_chua` = true.

## 5. State machine rút gọn (từng dòng `phieu_sua_chua_bh`)

```
[phieu_gui_bh] Nhap → them dong LK (bat buoc case_id) → Xac nhan da gui → Da gui
   → Kho tiep nhan (muc thung hang, co the doi mien) → tung dong LK bat dau chay rieng:

[dong LK] Cho phan loai
   → Admin BH: chon Trong/Ngoai bao hanh (+ mail/ma PD neu Ngoai) + huong_xu_ly
   ├─ Sua chua  → gan NV → Cho chan doan
   │     → Khong loi        → San sang gom vao phieu tra
   │     → Sua duoc         → (neu can vat tu) mo ticket de_xuat_linh_kien_bh doc lap → dong nay
   │                          TAM DUNG (cho_linh_kien) → ticket duoc Admin BH duyet (ma don hang +
   │                          ma misa) hoac huy → dong tiep tuc → (co thay LK loi chinh → mo Phieu tra
   │                          xac) → Sua xong
   │     → De xuat doi moi  → Admin duyet rieng → (Duyet: chuyen sang nhanh Doi moi | Tu choi: Tra xac)
   │     → Tra xac          → mo Phieu tra xac ngay
   │     NV cap nhat ket qua → cho Admin BH "Xac nhan hoan tat" → San sang gom vao phieu tra
   ├─ Doi moi     → mo Phieu tra xac ngay → San sang gom vao phieu tra
   ├─ Tu choi     → Ket thuc (huy/tra nguyen trang)
   └─ Chuyen kho  → Ket thuc (nhap kho lai)

[Phieu tra xac] (song song, khong chan luong chinh) Cho xu ly → Kho/Admin BH xac nhan 1 trong
   4 trang thai: Thanh cong | Huy bo | Tieu huy | Tra xac KTV

[phieu_tra_bh] Admin BH tao (Nhap) → add nhieu dong da "San sang gom vao phieu tra" (nhieu lan,
   nhieu phieu tra cung luc cho 1 KTV, TUY Y Admin BH) → nhap ma_misa/ma_van_don sau khi xu ly MISA
   ngoai he thong → Xac nhan gui kho → Kho dong goi → Ke toan duyet doi soat → Da gui → KTV xac nhan
   nhan (hoac Khong nhan duoc → khieu nai van chuyen)
```

Ngưỡng escalate (từ chối đề xuất linh kiện quá N lần) và định nghĩa "thất lạc vận chuyển" vẫn để trống,
chốt với đội vận hành trước khi build thật.

## 6. Route backend dự kiến (`backend/src/routes/suaChuaBaoHanh.ts`, chưa tạo)

```
-- Phieu gui + dong LK
POST   /api/sua-chua-bh/phieu-gui                    Tao phieu gui (Nhap), sinh lookup_code
PATCH  /api/sua-chua-bh/phieu-gui/:id                 Sua thong tin van chuyen (den khi Kho tiep nhan)
POST   /api/sua-chua-bh/phieu-gui/:id/dong-lk         Them 1 dong (bat buoc case_id)
DELETE /api/sua-chua-bh/dong-lk/:id                   Xoa 1 dong (khi phieu con Nhap)
POST   /api/sua-chua-bh/phieu-gui/:id/xac-nhan-gui    Nhap → Da gui (hoi lai ngay gui xe, mac dinh = luc bam)
GET    /api/sua-chua-bh/phieu-gui/:code               Tra cuu theo ma
GET    /api/sua-chua-bh/phieu                         Danh sach dong LK (mac dinh loc theo mien nguoi
                                                        xem, ?xem=toan_quoc de bo loc)
GET    /api/sua-chua-bh/phieu/:id                     Chi tiet 1 dong + lich su + anh

-- Kho tiep nhan (muc thung hang)
POST   /api/sua-chua-bh/tiep-nhan-kho/:code           Xac nhan so kien khai/thuc nhan (co the doi mien)

-- Admin bao hanh xu ly dong
POST   /api/sua-chua-bh/phieu/:id/phan-loai           loai_bao_hanh + mail/ma PD + huong_xu_ly (+ gan NV)
POST   /api/sua-chua-bh/phieu/:id/xac-nhan-hoan-tat   Admin BH xac nhan sau khi NV cap nhat ket qua

-- NV sua chua
POST   /api/sua-chua-bh/phieu/:id/chan-doan           Ghi ket qua chan doan
POST   /api/sua-chua-bh/phieu/:id/anh                 Upload anh (nhom + file) → day len Drive Admin

-- De xuat linh kien (vat tu sua chua) - ticket doc lap, NV hoac chinh Admin BH tao
POST   /api/sua-chua-bh/phieu/:id/de-xuat-lk          Tao ticket xin xuat LK (NV de xuat hoac Admin tu tao)
                                                        → dong cha tu dong trang_thai_cho='cho_linh_kien'
POST   /api/sua-chua-bh/de-xuat-lk/:id/duyet          Admin BH duyet: nhap ma_don_hang + ma_misa → mo khoa dong cha
POST   /api/sua-chua-bh/de-xuat-lk/:id/huy            Admin BH huy ticket → mo khoa dong cha

-- Tra xac
POST   /api/sua-chua-bh/tra-xac/:id/xu-ly             Kho/Admin BH cap nhat trang thai + ma duyet

-- Phieu tra bao hanh (PXK-like)
POST   /api/sua-chua-bh/phieu-tra                     Admin BH tao phieu tra moi cho 1 KTV (Nhap)
POST   /api/sua-chua-bh/phieu-tra/:id/dong            Them 1 dong da xong vao phieu tra
DELETE /api/sua-chua-bh/phieu-tra/:id/dong/:dongId    Bo 1 dong (khi con Nhap)
PATCH  /api/sua-chua-bh/phieu-tra/:id                 Cap nhat ma_misa / ma_van_don
POST   /api/sua-chua-bh/phieu-tra/:id/xac-nhan-gui-kho Admin BH xac nhan, chuyen cho Kho
POST   /api/sua-chua-bh/phieu-tra/:id/dong-goi        Kho dong goi
POST   /api/sua-chua-bh/phieu-tra/:id/duyet-ke-toan   Ke toan duyet
POST   /api/sua-chua-bh/phieu-tra/:id/xac-nhan-nhan   KTV xac nhan nhan
```

Scope riêng `scopeSuaChuaBh.ts` (giống `scopeDatMua.ts`), cộng thêm lọc theo `mien` (mục 2) — KTV theo
quan hệ tạo/Trạm, Kho/Admin BH/NV sửa chữa theo `users.mien` + filter `?xem=toan_quoc` tuỳ chọn.

## 7. Danh sách màn hình (theo vai trò) — sẽ mock trước ở bước demo

| # | Màn hình | Vai trò | Ghi chú UX |
|---|---|---|---|
| 1 | Tạo phiếu gửi hàng + thêm dòng LK | KTV/CTV/Trạm | Header vận chuyển + danh sách dòng, mỗi dòng bắt buộc chọn case trước; ngày gửi xe hỏi lại lúc xác nhận gửi |
| 2 | Tra cứu đơn của tôi | KTV/CTV/Trạm | Theo phiếu, mỗi dòng tiến độ riêng |
| 3 | Điểm tiếp nhận kho | Kho | Chỉ đối chiếu số kiện/thùng, không liệt kê từng LK để kiểm; toggle "Xem toàn quốc" |
| 4 | Hàng đợi phân loại | Admin bảo hành | Theo miền mình mặc định; hiện cảnh báo nếu linh kiện/sản phẩm đã hết hạn bảo hành (mục 1.2); chọn Trong/Ngoài bảo hành (hiện thêm 2 ô mail/mã PD nếu Ngoài, hoặc bắt buộc nếu hết hạn bảo hành) + hướng xử lý + gán NV |
| 5 | Việc của tôi (sửa chữa) | NV sửa chữa | Chẩn đoán 4 lựa chọn + 3 khối upload ảnh (trước sửa/sau sửa/linh kiện lỗi, mỗi khối tối đa 5 ảnh); nộp kết quả — không có nút "Đóng" |
| 6 | Xác nhận hoàn tất | Admin bảo hành | Danh sách dòng NV đã nộp kết quả, xác nhận hoàn tất từng dòng |
| 7 | Duyệt đề xuất linh kiện (vật tư sửa chữa) | Admin bảo hành | Ticket độc lập — duyệt (nhập mã đơn hàng + mã MISA) hoặc huỷ; dòng sửa chữa cha bị khoá cho tới khi xử lý xong; Admin cũng có thể tự tạo ticket này (không cần chờ NV đề xuất) |
| 8 | Xử lý trả xác | Kho / Admin bảo hành | Danh sách phiếu trả xác tự phát sinh, chọn 1 trong 4 trạng thái + mã duyệt |
| 9 | Tạo & quản lý phiếu trả bảo hành | Admin bảo hành | Chọn 1 KTV → tick các dòng đã xong → tạo phiếu (Nháp) → có thể tạo nhiều phiếu song song → quay lại nhập mã MISA/vận đơn → xác nhận gửi kho |
| 10 | Đóng gói & duyệt kế toán | Kho / Kế toán | Theo từng phiếu trả Admin BH đã tạo |
| 11 | Xác nhận nhận hàng trả | KTV | 1-chạm + đánh giá nhanh |
| 12 | Gán vai trò + miền | Admin hệ thống (Settings/Users) | Checkbox `la_admin_bh`/`la_nv_sua_chua` + chọn miền Nam/Bắc |
| 13 | Dashboard tổng quan | Admin BH / TBP DVBH | Lọc được theo miền, SLA theo khâu, top linh kiện lỗi |

## 8. Lộ trình

1. **Demo/mockup UI** (đang làm) — duyệt từng màn trước khi code thật.
2. Migration D1 (mục 3 + 3 cột `users`), route backend (mục 6), scope module theo miền.
3. Build frontend theo UI đã duyệt, dùng chung component `ui/` hiện có.
4. Đăng ký module vào `navConfig.ts` + `moduleAccess.ts`, thêm badge `countKey` mới (đếm theo miền).
5. Dựng OAuth Drive-scope cho upload ảnh (mục 0), riêng với OAuth đăng nhập hiện có.
6. Chốt với đội vận hành: ngưỡng escalate, định nghĩa thất lạc vận chuyển.
7. Deploy `smarttrade` theo quy trình chuẩn (bump `APP_VERSION`, `deploy:smarttrade`).
