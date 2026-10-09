import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Hien ten nguoi dung thay vi gmail (09/10/2026: "Cac noi hien thi thong tin ten nguoi dung deu uu
// tien hien ten, neu khong co ten moi hien thi theo gmail"). Bang email -> ten lay tu GET /users/ten
// (danh ba KTV + tai khoan), tai 1 lan moi phien, luu localStorage de lan mo sau hien ngay khong
// phai doi mang. Store dung chung ca trang: nhieu component chi 1 luot goi.

const CACHE_KEY = "user_names_v1";
let names: Record<string, string> = (() => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
})();
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || inflight) return;
  inflight = api
    .get<{ names: Record<string, string> }>("/users/ten")
    .then((r) => {
      names = r.names || {};
      loaded = true;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(names));
      } catch {
        /* bo qua */
      }
      listeners.forEach((l) => l());
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
}

// Ten hien thi cho 1 email: ten neu co, khong thi chinh email (rong -> "—").
export function displayName(email: string | null | undefined): string {
  if (!email) return "—";
  return names[email.toLowerCase()] || email;
}

export function useUserNames() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.add(l);
    ensureLoaded();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { nameOf: displayName };
}

// <UserName email=... /> - hien ten, re chuot xem gmail.
export function UserName({ email, className }: { email: string | null | undefined; className?: string }) {
  useUserNames();
  const name = displayName(email);
  return (
    <span className={className} title={email && name !== email ? email : undefined}>
      {name}
    </span>
  );
}
