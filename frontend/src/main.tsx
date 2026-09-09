import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import { App } from "./App";
import { captureDeepLinkFromHash } from "./lib/deepLink";
import "./styles/tokens.css";

// Ghi nho link truy cap truc tiep 1 phieu tra (vd "#/ktv/nhan-hang/TR-000001") CANG SOM CANG TOT,
// truoc ca khi React mount - xem giai thich day du trong lib/deepLink.ts (can bat duoc hash truoc khi
// nguoi dung dieu huong sang Google OAuth neu chua dang nhap, luc do hash goc se mat).
captureDeepLinkFromHash();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Giai doan 6 (04/09/2026): dang ky service worker PWA co ban (app-shell cache, xem public/sw.js) -
// CHUA dang ky Web Push subscription o day (can VAPID_SERVER_PRIVATE_KEY that luc deploy, chua lam o
// vong nay theo dung pham vi da chot). Bo qua neu trinh duyet khong ho tro (Safari cu/desktop khong
// PWA) - khong lam vo trang.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* khong ho tro/loi dang ky - app van chay binh thuong, chi mat loi ich offline-shell */
    });
  });
}
