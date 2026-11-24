# CLAUDE.md — App Bảo hành đổi trả 3T (Worker `suachua`), bản RÚT GỌN

> File này chỉ giữ luật chính + chỉ đường (giữ **dưới 10 KB** — app chủ trên đám mây đọc mọi kho).
> **Chi tiết đầy đủ** (lịch sử từng đợt, nguyên văn yêu cầu, quyết định đã chốt, kiểm thử): [`CLAUDE-full.md`](CLAUDE-full.md) —
> mở khi cần đụng tới mảng tương ứng (tìm theo từ khóa: tên route, tên bảng, mã lỗi, `v1.xxx`).
> **Quy ước ghi**: mỗi đợt thay đổi / quyết định mới → ghi chi tiết vào `CLAUDE-full.md` (nguyên văn yêu cầu, đã chốt gì, lỗi phát hiện,
> kiểm thử — đúng phong cách cũ); ở đây chỉ thêm khi là LUẬT CHUNG mới.

## Hệ thống là gì

Quy trình gửi linh kiện / máy lỗi từ KTV / CTV / Trạm về kho trung tâm để sửa chữa hoặc đổi mới trong bảo hành rồi trả lại; kèm cấp linh
kiện cho NV sửa chữa, trả xác cho đối tác, trừ công nợ sửa chữa. App độc lập: Worker `suachua` (Hono) + D1 + React PWA, Google OAuth riêng,
ảnh lưu Google Drive. Đơn cha = thùng `DH-…`; mỗi dòng linh kiện = đơn vị `DH-…-n` chạy trạng thái riêng, bắt buộc gắn mã case (CRM) hoặc mã Lada.

**Logic nghiệp vụ đang chạy thật (tóm tắt, đọc trước): [`TONG_HOP_LOGIC.md`](TONG_HOP_LOGIC.md)** — vai trò, luồng chính, cấp LK, trừ công nợ,
trả xác, lịch cron, kết nối hệ khác.

## Lệnh

```bash
npm run dev:worker          # wrangler dev (backend)
npm run dev:frontend        # vite (frontend)
npm run build               # build frontend
npm run typecheck           # backend + frontend
npm run db:migrate:local    # migration vào D1 local
npm run db:migrate:remote   # migration vào D1 THẬT
npm run deploy              # build + wrangler deploy (Worker THẬT)
```
Deploy / migrate remote: wrangler từng tự suy nhầm tài khoản → đặt `CLOUDFLARE_ACCOUNT_ID` của tài khoản `dichvu3t` trước lệnh (chi tiết `CLAUDE-full.md`, mục "Deploy thật đầu tiên").

## Luật bắt buộc

1. **Tăng `APP_VERSION`** (`frontend/src/lib/version.ts`, +0.001) trước mỗi lần deploy — nguồn duy nhất của số phiên bản.
2. **Commit trước, deploy sau.** `git add` đúng file đã sửa; commit xong đẩy `origin` (nếu có) + `etx87` (không force-push; `etx87` có commit tự động
   → `git fetch etx87` + `git merge`, không rebase).
3. Mỗi lần đổi code, trong CÙNG commit: ghi `nhat_ky_lam_viec.md` (mục mới ở ĐẦU file), sửa đè mục liên quan của `TONG_HOP_LOGIC.md`
   (+ `SRS_tong_hop.md` nếu yêu cầu đổi) và thêm mục chi tiết vào `CLAUDE-full.md`.
4. Ghi yêu cầu người dùng bằng **nguyên văn**; câu hỏi chưa được trả lời ghi là "mở", không tự suy rồi ghi như đã chốt; 2 tài liệu mâu thuẫn → ghi rõ bên nào đúng.
5. **Không đẩy bí mật lên repo** (`api key.txt`, `.dev.vars`, `secrets.md` trong `.gitignore`); không ghi tài khoản / mật khẩu / khoá / lỗ hổng vào tài liệu.
6. **Giờ Việt Nam (+7)** — dùng `backend/src/lib/vnTime.ts` / `frontend/src/lib/format.ts`, không tự cộng hậu tố `Z`. SLA bước tính bỏ Chủ nhật (`lib/sla.ts`).
7. Logic có **bản sao FE ↔ BE (↔ app Đặt LK)** — đổi 1 nơi đổi cả các nơi: nhóm giai đoạn `NHOM_GD` (FE `lib/constants.ts` = BE `routes/traCuu.ts`),
   loại cấp LK `loaiDeXuatSuaChua()` (BE + FE + `linh-kien-app`).
8. Cấp linh kiện sửa chữa / Kế toán / Kho xử lý hoàn toàn ở app Đặt linh kiện (`../linh-kien-app`); đơn tạo ở hệ nào chỉ sửa ở hệ đó, khi Kế toán chưa xử lý.
9. Không tự tạo tài nguyên Cloudflare / Google mới, không chạy lệnh trên D1 thật khi chưa được người dùng đồng ý.

## Vai trò (tóm tắt — chi tiết `TONG_HOP_LOGIC.md` §2)

KTV / CTV / Trạm (`la_ktv_dvbh`, `la_ve_tinh`), Kho (`la_kho` + miền), Admin BH (`la_admin_bh` + miền), NV sửa chữa (`la_nv_sua_chua`),
Kế toán (`la_ke_toan`), Trả xác, Giám sát (chính / phụ theo khu vực), View, Admin hệ thống (`la_qtri` — vượt mọi cổng vai trò, có "Chế độ test" xem như người khác).

## Bản đồ mã

- `backend/src/routes/*` — mỗi màn / nghiệp vụ 1 file (`phieuGui`, `kho`, `adminBH`, `nvSuaChua`, `phieuTra`, `xac`, `deXuat`, `thieuHang`, `partnerCase`,
  `sync`, `odooDon`, `baoCaoBo`, `baoCaoNghen`, `buoc`…); `backend/src/lib/*` — logic dùng chung (`sla`, `scope`, `tuChoiThung`, `truCongNo`,
  `odooSync`, `linhKienPush`, `viecGiaiTrinhCong`…). Cron 15 phút điều phối ở `backend/src/index.ts`.
- `frontend/src` — React; giao diện theo [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) (gam xanh lá theo icon app, Plus Jakarta Sans, bảng → thẻ trên mobile).
- `migrations/` — D1.

## Giao diện (luật chung)

- Bảng 1 dòng không xuống dòng, lọc + sắp xếp kiểu Excel trên tiêu đề cột (lọc phía server khi phân trang server), bộ lọc mặc định chọn nhiều.
- Màn chi tiết: luồng quy trình ngang + "▾ Xem chi tiết"; nút thao tác chính luôn nhìn thấy.
- Mỗi tính năng báo cáo đủ 5W1H.

## Tài liệu

| File | Nội dung |
|---|---|
| `CLAUDE-full.md` | Lịch sử chi tiết toàn dự án (mọi đợt, nguyên văn, quyết định, kiểm thử) |
| `TONG_HOP_LOGIC.md` | Logic nghiệp vụ đang chạy thật |
| `nhat_ky_lam_viec.md` | Nhật ký từng đợt (mới nhất ở đầu) |
| `SRS_tong_hop.md` | Đặc tả yêu cầu |
| `DEPLOY.md`, `DESIGN_SYSTEM.md` | Deploy, giao diện |
| `du an sua chua bao hanh/` | Phân tích, kế hoạch, `Luong-Quy-Trinh-Tong-Bao-Hanh.html`, hướng dẫn KTV / Admin BH / cấp LK & trả xác |

## Nhận việc từ Trợ lý Mây

- Nhãn `may:phan-tich` = chỉ ĐỌC mã soạn BRD, không sửa. Nhãn `may:tu-sua` = sửa ĐÚNG phạm vi issue `MAY-xxxxx`
  (BRD đã duyệt lưu vào `docs/yeu-cau/MAY-xxxxx.md`).
- Trước PR: `npm run build` phải xanh. Nhánh `may/may-xxxxx`, PR vào `main`, tiêu đề bắt đầu bằng mã, mô tả tiếng Việt
  (nguyên nhân · cách sửa · cách thử), ghi `Closes #<issue>`.
- KHÔNG: sửa secrets / luật bảo mật, deploy trần, đổi tính năng ngoài issue, xoá dữ liệu. Không chắc → bình luận `MÂY: CẦN NGƯỜI` + lý do rồi dừng.
  Deploy do workflow `may-deploy` làm sau khi duyệt — không tự deploy trong lúc sửa.
- Làm trong phiên thường mà giải quyết issue Mây đang mở (`gh issue list --label may:cho-duyet,may:tu-sua`) → ghi mã `MAY-xxxxx` ở dòng đầu commit.
- **Ba làn** (Giám đốc chốt 18/11/2026; dòng đầu ý tưởng / BRD ghi `**Làn:** nhanh | thường | đầy đủ — <lý do>`; Mây xếp sai thì app ghi đúng làn):
  - *Nhanh* (không qua duyệt): lệnh Giám đốc, cấp / thu quyền cá nhân, dữ liệu sai / trùng / kẹt, danh mục / cấu hình, lỗi rõ sửa nhỏ không đổi luật,
    hỏi cách dùng, lấy số liệu → tra dữ liệu thật, ghi qua khối `may-thao-tac`, sửa nguyên nhân nếu là lỗi mã, báo `## BÁO CÁO KẾT QUẢ`
    (Đã làm · Vì sao bị · Đã sửa · Không đụng tới). Cấp quyền: khai `cap_quyen` { nguoi, vai, vai_cao }.
  - *Thường*: cải tiến nhỏ (cột, bộ lọc, nút, hiển thị, sắp xếp) — 1 bản cách làm cụ thể, duyệt 1 lần là làm.
  - *Đầy đủ*: đổi luật / cách tính, tính năng lớn, tiền / lương / thưởng / công nợ, phân quyền nhóm, xoá thật, hồ sơ nhân sự, Upload Lada
    → ý tưởng → BRD → thẩm định → duyệt.
  - Phân vân → chọn làn cao hơn.
- **Máy chạy sai luật đã chốt = LỖI → làn nhanh** (chốt 22/11/2026): sửa đúng luật, chạy lại hoặc đếm số bản ghi bị sai, báo ngắn
  (lỗi gì · vì sao · đã sửa · bao nhiêu bản ghi). Không đụng dữ liệu đã đẩy sang hệ ngoài (Lada…) — chỉ liệt kê. Không biến lỗi thành đề xuất
  đổi luật, không hỏi lại luật đã chốt. Việc khác trong cùng báo cáo → 1 dòng "Tách việc riêng: …".
