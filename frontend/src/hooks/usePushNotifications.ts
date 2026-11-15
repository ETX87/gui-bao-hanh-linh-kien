import { useEffect, useState } from "react";
import { api } from "../lib/api";

// 15/11/2026: bat / tat Web Push tren THIET BI NAY (port tu linh-kien-app). Service worker /sw.js da dang ky o main.tsx
// (cache app-shell) - them xu ly su kien "push" / "notificationclick" trong chinh file do.
// Gioi han nen tang: iOS chi tu 16.4 va phai "Them vao Man hinh chinh"; Android khong hien so tren icon (chi hien thong bao).
export const PUSH_SUPPORTED = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function b64ToBytes(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const raw = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!PUSH_SUPPORTED) {
      setChecked(true);
      return;
    }
    // SW chua dang ky xong / dang ky loi thi ready khong bao gio resolve -> sau 5s van hien nut (bam se bao loi ro).
    const het = setTimeout(() => setChecked(true), 5000);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => setSubscribed(false))
      .finally(() => {
        clearTimeout(het);
        setChecked(true);
      });
    return () => clearTimeout(het);
  }, []);

  async function subscribe() {
    if (!PUSH_SUPPORTED || busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Bạn chưa cho phép thông báo trên trình duyệt / thiết bị này (mở cài đặt trang web để bật lại).");
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.get<{ publicKey: string }>("/thong-bao/push/vapid-public-key");
      if (!publicKey) throw new Error("Hệ thống chưa cấu hình khoá thông báo.");
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) as BufferSource }));
      const json = sub.toJSON();
      await api.post("/thong-bao/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
      setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (!PUSH_SUPPORTED || busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post("/thong-bao/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  return { supported: PUSH_SUPPORTED, checked, subscribed, busy, subscribe, unsubscribe };
}
