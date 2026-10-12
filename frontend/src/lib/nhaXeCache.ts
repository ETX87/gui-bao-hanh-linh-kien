// Bo nho "cach giao hang" tren MAY nguoi dung (12/10/2026, yeu cau "Danh sách lựa chọn cách giao hàng sẽ
// lưu lại trên cache của người dùng, lần sau sẽ ưu tiên hiện lựa chọn và thông tin đã nhập lần trước").
//
// Luu theo tung KTV so huu thung (tao ho cung nho rieng cho dung KTV do): lua chon gan nhat, thong tin da
// nhap RIENG cho tung hinh thuc (doi qua lai giua "Nha xe" va "Xe noi bo" khong mat thong tin cua nhau),
// thu tu hinh thuc dung gan day (lua chon hay dung len dau danh sach) va cac gia tri da go gan day (goi y).
// Server van giu ktv_nha_xe_bh (dung khi doi may) - cache nay uu tien hon tren cung 1 may.

const KEY = "nha_xe_cache_v1";

export interface NhaXeEntry {
  last: string;
  order: string[];
  by: Record<string, { maXe: string; dvvc: string }>;
  recentMaXe: string[];
  recentDvvc: string[];
}

function readAll(): Record<string, NhaXeEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function readNhaXe(ktvEmail: string | null | undefined): NhaXeEntry | null {
  if (!ktvEmail) return null;
  return readAll()[ktvEmail.toLowerCase()] ?? null;
}

const pushFront = (arr: string[], v: string, max: number) => (v ? [v, ...arr.filter((x) => x !== v)].slice(0, max) : arr);

export function saveNhaXe(ktvEmail: string | null | undefined, hinhThuc: string, maXe: string, dvvc: string) {
  if (!ktvEmail || !hinhThuc) return;
  const all = readAll();
  const k = ktvEmail.toLowerCase();
  const cur: NhaXeEntry = all[k] ?? { last: hinhThuc, order: [], by: {}, recentMaXe: [], recentDvvc: [] };
  cur.last = hinhThuc;
  cur.order = pushFront(cur.order, hinhThuc, 10);
  cur.by[hinhThuc] = { maXe: maXe.trim(), dvvc: dvvc.trim() };
  if (hinhThuc !== "giao_truc_tiep") cur.recentMaXe = pushFront(cur.recentMaXe, maXe.trim(), 8);
  cur.recentDvvc = pushFront(cur.recentDvvc, dvvc.trim(), 8);
  all[k] = cur;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* het dung luong - bo qua */
  }
}

// Sap xep lua chon: hinh thuc dung gan day len dau, con lai giu thu tu goc.
export function sortHinhThuc<T extends { value: string }>(opts: T[], entry: NhaXeEntry | null): T[] {
  if (!entry?.order.length) return opts;
  const rank = (v: string) => {
    const i = entry.order.indexOf(v);
    return i < 0 ? 100 + opts.findIndex((o) => o.value === v) : i;
  };
  return [...opts].sort((a, b) => rank(a.value) - rank(b.value));
}
