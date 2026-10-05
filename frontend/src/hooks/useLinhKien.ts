import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LinhKien } from "../lib/types";

// Danh muc linh kien: tai TOAN BO (de tra ten moi ma, ke ca linh kien da tat); o chon dung lkOptions()
// chi lay dong duoc_dung_bao_hanh=1.
//
// 05/10/2026 muc 8: tai TOAN BO danh sach ve may 1 lan, luu cache localStorage kem "version"; moi lan
// mo app chi hoi GET /linh-kien/version (1 dong) - trung version thi dung cache, khac moi tai lai. Tim
// kiem (khong dau/co dau/tach tu) chay tren may nguoi dung (SearchableSelect), khong ton server.
// Muc 7: server tra kem top_hang (top xu ly thanh cong 30 ngay) va da xep top truoc - giu nguyen thu tu.
// Dung 1 store chung cho ca trang (nhieu component cung goi useLinhKien chi tao 1 lan goi mang).

const CACHE_KEY = "lk_cache_v3"; // v3 (05/10/2026): them don_vi = "Phan loai" linh kien tu linh-kien-app
type Cache = { version: string; items: LinhKien[] };

let store: LinhKien[] | null = null;
let inflight: Promise<LinhKien[]> | null = null;
const listeners = new Set<(items: LinhKien[]) => void>();

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

async function load(): Promise<LinhKien[]> {
  const cache = readCache();
  let serverVersion: string | null = null;
  try {
    serverVersion = (await api.get<{ version: string }>("/linh-kien/version")).version;
  } catch {
    if (cache) return cache.items; // mat mang: dung tam cache
  }
  if (cache && serverVersion !== null && cache.version === serverVersion) return cache.items;
  const r = await api.get<{ linh_kien: LinhKien[]; version: string }>("/linh-kien");
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ version: r.version, items: r.linh_kien } satisfies Cache));
  } catch {
    /* localStorage day - bo qua, van dung duoc trong phien */
  }
  return r.linh_kien;
}

function ensureLoaded(force = false): Promise<LinhKien[]> {
  if (!force && store) return Promise.resolve(store);
  if (!force && inflight) return inflight;
  inflight = load()
    .then((items) => {
      store = items;
      listeners.forEach((fn) => fn(items));
      return items;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Goi sau khi sua danh muc linh kien (man Danh muc linh kien) de cac o chon cap nhat ngay. */
export function refreshLinhKien() {
  store = null;
  return ensureLoaded(true);
}

export function useLinhKien() {
  const [items, setItems] = useState<LinhKien[]>(store ?? []);
  const [loading, setLoading] = useState(!store);
  useEffect(() => {
    const fn = (x: LinhKien[]) => setItems(x);
    listeners.add(fn);
    ensureLoaded()
      .then(setItems)
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { items, loading };
}

/** Nhan hien thi linh kien: "Ten (ma)" - 05/10/2026 muc 5/8. */
export function lkLabel(ten: string | null | undefined, ma: string | null | undefined): string {
  if (!ma) return ten || "";
  if (!ten || ten === ma) return ma;
  return `${ten} (${ma})`;
}

/** Option cho SearchableSelect: nhan "Ten (ma)", danh dau top 30 ngay. */
export function lkOptions(items: LinhKien[]) {
  return items
    .filter((lk) => !!lk.duoc_dung_bao_hanh)
    .map((lk) => {
      const hint = [lk.don_vi?.trim(), lk.top_hang ? `🔥 Top ${lk.top_hang}` : ""].filter(Boolean).join(" · ");
      return { value: lk.ma_lk, label: lkLabel(lk.ten_lk, lk.ma_lk), hint: hint || undefined };
    });
}

// Tra "Ten (ma)" tu ma - dung o cac bang danh sach. Chua co trong danh muc (vd linh kien Odoo moi) thi
// tra lai chinh ma (van co thong tin), khong render "undefined".
export function useLkName() {
  const { items, loading } = useLinhKien();
  const nameOf = (ma: string | null | undefined): string => {
    if (!ma) return "Cả sản phẩm";
    const lk = items.find((x) => x.ma_lk === ma);
    return lkLabel(lk?.ten_lk, ma);
  };
  // "Phan loai" linh kien (05/10/2026) - chinh la cot don_vi dong bo tu linh-kien-app (ben do doi nhan
  // hien thi cot nay thanh "Phan loai": Mach / May / Loi - Vat lieu loc / Tu...).
  const phanLoaiOf = (ma: string | null | undefined): string => {
    if (!ma) return "";
    return items.find((x) => x.ma_lk === ma)?.don_vi?.trim() || "";
  };
  return { nameOf, phanLoaiOf, loading };
}
