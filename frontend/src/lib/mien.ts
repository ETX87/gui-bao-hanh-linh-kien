// Chia 2 mien (11/10/2026) - xem backend/src/lib/mien.ts + migrations/0010_mien.sql.
import type { Mien } from "./types";

export const MIEN_LABELS: Record<string, string> = { MB: "Miền Bắc", MN: "Miền Nam", ALL: "Cả 2 miền" };
export const MIEN_SHORT: Record<string, string> = { MB: "MB", MN: "MN" };

export function mienLabel(m: Mien | null | undefined): string {
  return m ? MIEN_LABELS[m] : "Chưa khai báo";
}

// Lua chon mien phu trach cua nguoi xu ly (man Nguoi dung).
export const MIEN_USER_OPTIONS = [
  { value: "", label: "Chưa gán (thấy tất cả)" },
  { value: "MB", label: "Miền Bắc" },
  { value: "MN", label: "Miền Nam" },
  { value: "ALL", label: "Cả 2 miền" },
];

// Lua chon mien cua 1 don.
export const MIEN_DON_OPTIONS = [
  { value: "", label: "Chưa khai báo" },
  { value: "MB", label: "Miền Bắc" },
  { value: "MN", label: "Miền Nam" },
];

// Ai duoc doi mien 1 don: nguyen van "KT, Admin sua chua, Kho, Admin he thong".
export function canDoiMien(u: { la_kho: boolean; la_admin_bh: boolean; la_ke_toan: boolean; la_qtri: boolean } | null | undefined): boolean {
  return !!u && (u.la_kho || u.la_admin_bh || u.la_ke_toan || u.la_qtri);
}

// Tu khoa nhan dien mien tu ma khu vuc (khop chuoi con, khong phan biet hoa thuong; chi khop DUNG 1
// mien moi tinh) - cung thuat toan detectMien() ben backend.
export interface TuKhoa {
  id: number;
  mien: Mien;
  tu_khoa: string;
}
export function detectMien(khuVucMa: string | null | undefined, tk: TuKhoa[]): Mien | null {
  const ma = (khuVucMa || "").toUpperCase().trim();
  if (!ma) return null;
  const hits = (["MB", "MN"] as Mien[]).filter((m) => tk.some((k) => k.mien === m && ma.includes(k.tu_khoa.toUpperCase())));
  return hits.length === 1 ? hits[0] : null;
}
