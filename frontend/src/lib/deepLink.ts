// Link truy cap truc tiep 1 phieu tra bao hanh theo ID (yeu cau 2026-09-09: "tạo đường link truy vấn
// vào ID phiếu ... tương tự #/ktv/nhan-hang/TR-000001") - mo THANG modal chi tiet phieu tra ("TR-xxx",
// bang phieu_tra_bh) trong man KtvNhanHangScreen, dung LAI dung co che routing hash tu viet cua app
// (xem router/Router.tsx) - chi can them 1 nhanh regex trong App.tsx::Routed(), khong can sua Router.
// Port dung y tuong "link truc tiep theo ID" da lam ben repo linh-kien-app (frontend/src/lib/
// pxkDeepLink.ts), chi khac co che dieu huong (hash-router tu viet o day, khong phai pathname +
// Cloudflare Workers Static Assets SPA fallback).
//
// Van de can xu ly: nguoi dam link co the CHUA dang nhap - luc do phai di qua vong Google OAuth
// (redirect sang accounts.google.com roi ve /api/auth/callback), va callback backend LUON redirect ve
// FRONTEND_URL (goc "/", KHONG giu lai hash - xem backend/src/routes/auth.ts). Dung sessionStorage lam
// cau noi: ghi lai hash ngay tu lan tai trang DAU TIEN (truoc khi nguoi dung kip bam "Đăng nhập với
// Google"), sessionStorage song sot qua dieu huong sang Google roi quay lai (cung 1 tab, chi mat khi
// dong tab) - App.tsx doc lai SAU KHI da xac thuc xong roi TU DAT LAI window.location.hash.
const STORAGE_KEY = "sc_pending_deep_link_hash";
const NHAN_HANG_ID_RE = /^#\/ktv\/nhan-hang\/(TR-\d+)$/i;

// 06/11/2026: link mo thang theo ID tren DUONG DAN (khong phai hash) - /DH-002957-1 (don vi), /DH-002957 (don),
// /BH-000458 (thung gui), /TR-000506 (phieu tra). DVBH gan link nay o tab "Bảo hành" cua chi tiet ca. Mo bang
// screens/shared/MoTheoId.tsx sau khi dang nhap (cung co che sessionStorage nhu link phieu tra ben duoi).
const OPEN_ID_KEY = "sc_pending_open_id";
const OPEN_ID_RE = /^\/((?:DH-\d+(?:-\d+)?)|(?:BH-\d+)|(?:TR-\d+))\/?$/i;
export function captureOpenIdFromPath(): void {
  const m = window.location.pathname.match(OPEN_ID_RE);
  if (m) sessionStorage.setItem(OPEN_ID_KEY, m[1].toUpperCase());
}
export function consumePendingOpenId(): string | null {
  const id = sessionStorage.getItem(OPEN_ID_KEY);
  if (!id) return null;
  sessionStorage.removeItem(OPEN_ID_KEY);
  return id;
}

// Goi 1 LAN duy nhat, cang som cang tot (dau frontend/src/main.tsx, TRUOC khi React mount) - khong
// phu thuoc trang thai dang nhap, chi doc hash hien tai va ghi nho neu khop mau.
export function captureDeepLinkFromHash(): void {
  const hash = window.location.hash;
  if (!NHAN_HANG_ID_RE.test(hash)) return;
  sessionStorage.setItem(STORAGE_KEY, hash.replace(/^#/, ""));
}

// Doc + xoa ngay (chi ap dung 1 LAN) - goi tu App.tsx sau khi da xac dinh nguoi dung DA dang nhap
// xong, dung ket qua nay gan lai window.location.hash de router hash tu viet dieu huong toi.
export function consumePendingDeepLinkHash(): string | null {
  const hash = sessionStorage.getItem(STORAGE_KEY);
  if (!hash) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  return hash;
}
