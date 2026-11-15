import { useEffect, useState } from "react";
import { api } from "../lib/api";

// 16/11/2026 - so don dang dung o tung buoc (GET /api/buoc/dang-dung, theo pham vi nguoi xem). Dung chung cho sidebar
// "Bước đang dừng", nhan buoc tren tab cac man chung, chip loc buoc. Tai toi da 1 lan / 5 phut (cau truy van quet bang).
export interface DangDungRow {
  gd: string;
  tong: number;
  qua_han: number;
  chua_gt: number;
  tam_dung: number;
}
let cache: { at: number; items: DangDungRow[] } | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const TTL = 5 * 60_000;

function tai(force = false): Promise<void> {
  if (!force && cache && Date.now() - cache.at < TTL) return Promise.resolve();
  if (inflight) return inflight;
  inflight = api
    .get<{ items: DangDungRow[] }>("/buoc/dang-dung")
    .then((r) => {
      cache = { at: Date.now(), items: r.items ?? [] };
      listeners.forEach((l) => l());
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
export function reloadDangDung() {
  return tai(true);
}

export function useDangDung(enabled = true): { items: DangDungRow[]; of: (gds: string[]) => { tong: number; qua_han: number; chua_gt: number; tam_dung: number } } {
  const [, setV] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const l = () => setV((v) => v + 1);
    listeners.add(l);
    tai();
    const onVis = () => document.visibilityState === "visible" && tai();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      listeners.delete(l);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled]);
  const items = enabled ? cache?.items ?? [] : [];
  const of = (gds: string[]) =>
    items.filter((r) => gds.includes(r.gd)).reduce((s, r) => ({ tong: s.tong + r.tong, qua_han: s.qua_han + r.qua_han, chua_gt: s.chua_gt + r.chua_gt, tam_dung: s.tam_dung + (r.tam_dung ?? 0) }), { tong: 0, qua_han: 0, chua_gt: 0, tam_dung: 0 });
  return { items, of };
}
