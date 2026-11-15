// Service worker toi gian cho PWA co ban (Giai doan 6, 04/09/2026) - CHUA lam Web Push (can
// VAPID_SERVER_PRIVATE_KEY that luc deploy that, nguoi dung xac nhan chua can o vong nay, xem
// CLAUDE.md) - CHI cache app-shell (HTML/JS/CSS/icon) de app con MO DUOC (giao dien, khong phai
// du lieu) khi KTV o hien truong mat mang tam thoi - dung network-first cho HTML/API (luon uu tien du
// lieu moi nhat khi co mang), cache-first cho asset tinh (JS/CSS/font co hash trong ten file, khong
// bao gio doi noi dung duoi cung 1 ten - an toan cache dai han).

const CACHE_NAME = "suachua-shell-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // khong cache POST/PATCH/DELETE - luon phai qua mang that.
  const url = new URL(req.url);

  // API luon di thang qua mang (khong bao gio phuc vu du lieu nghiep vu tu cache - se sai/cu) - CHI
  // fallback rong khi mat mang hoan toan, de UI tu hien thong bao loi thay vi treo vo han.
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req).catch(() => new Response(JSON.stringify({ error: "OFFLINE" }), { status: 503, headers: { "Content-Type": "application/json" } })));
    return;
  }

  // Asset tinh co hash trong ten file (Vite build) - cache-first, khong het han (ten doi khi noi dung
  // doi nen an toan).
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req).then((res) => { const clone = res.clone(); caches.open(CACHE_NAME).then((c) => c.put(req, clone)); return res; })));
    return;
  }

  // Navigate/HTML (app shell) - network-first, cache la du phong khi mat mang (van mo duoc giao dien,
  // du du lieu se rong/loi cho toi khi co mang lai).
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
  );
});

// 15/11/2026: Web Push - thong bao tong hop viec ton 12h (backend lib/thongBao.ts). Payload JSON { title, body, url }.
self.addEventListener("push", (event) => {
  let p = { title: "Bảo hành đổi trả 3T", body: "", url: "/#/home" };
  try {
    if (event.data) p = { ...p, ...event.data.json() };
  } catch {
    /* khong phai JSON */
  }
  event.waitUntil(
    self.registration.showNotification(p.title, { body: p.body, icon: "/icon-192.png", badge: "/icon-192.png", tag: "tong-hop-ngay", renotify: true, data: { url: p.url || "/#/home" } }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/#/home";
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of list) {
        if ("focus" in client) {
          try {
            await client.navigate(url);
          } catch {
            /* tab khac origin / khong dieu huong duoc */
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
