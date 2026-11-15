import { useEffect, useState } from "react";
import { api } from "./api";

// 15/11/2026 - quan tri theo BUOC (xem backend/src/lib/buoc.ts - nguon duy nhat cua danh muc buoc + SLA).
// Frontend tai danh muc 1 lan (GET /api/buoc), luu o module de format.ts (isOverdue / slaLevel) doc dong bo.

export type ChuBuoc = "ktv" | "kho" | "admin" | "nv" | "ketoan" | "he_thong";
export interface BuocDef {
  gd: string;
  so: string;
  ten: string;
  chu: ChuBuoc;
  sla: number;
  sla_mac_dinh: number;
  giai_trinh: "ktv" | "bo" | "khong";
  viec: string;
  tu_pass: string[];
  loi: string[];
  ket_thuc?: boolean;
}

export const CHU_BUOC_LABEL: Record<ChuBuoc, string> = { ktv: "KTV", kho: "Kho", admin: "Admin BH", nv: "NV sửa chữa", ketoan: "Kế toán", he_thong: "—" };
export const BEN_LABEL: Record<string, string> = {
  ktv: "Lỗi KTV",
  gs: "Giám sát",
  kho: "Kho",
  admin_bh: "Admin BH",
  nv: "NV sửa chữa",
  ke_toan: "Kế toán",
  van_chuyen: "Vận chuyển",
  ngoai_canh: "Ngoại cảnh",
};
export const VAI_GT_LABEL: Record<string, string> = { ktv: "KTV", gs: "Giám sát (TNGS)", bo: "BO" };

let BUOC_LIST: BuocDef[] = [];
let SLA: Record<string, number> = {};
let LEN_GS = 24;
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadBuoc(force = false): Promise<void> {
  if (loaded && !force) return loaded;
  loaded = api
    .get<{ buoc: BuocDef[]; len_gs: number }>("/buoc")
    .then((r) => {
      BUOC_LIST = r.buoc;
      SLA = Object.fromEntries(r.buoc.map((b) => [b.gd, b.sla]));
      LEN_GS = r.len_gs;
      listeners.forEach((f) => f());
    })
    .catch(() => {
      loaded = null;
    });
  return loaded;
}

/** SLA (gio) cua buoc; chua tai xong / buoc la -> 24. */
export function slaGio(gd?: string | null): number {
  if (!gd) return 24;
  return SLA[gd] || 24;
}
export function buocOf(gd?: string | null): BuocDef | undefined {
  return gd ? BUOC_LIST.find((b) => b.gd === gd) : undefined;
}

export function useBuoc(): { buoc: BuocDef[]; lenGs: number; ready: boolean } {
  const [, set] = useState(0);
  useEffect(() => {
    const f = () => set((x) => x + 1);
    listeners.add(f);
    loadBuoc();
    return () => {
      listeners.delete(f);
    };
  }, []);
  return { buoc: BUOC_LIST, lenGs: LEN_GS, ready: BUOC_LIST.length > 0 };
}

/** gd tuong ung trang thai don vi + trang thai phieu tra (giong allRowsSql backend). */
export function gdDonVi(trangThai: string, ptTrangThai?: string | null): string {
  return ptTrangThai ? "tra_" + ptTrangThai : trangThai;
}

export function fmtGio(h: number): string {
  const a = Math.abs(h);
  if (a < 1) return `${Math.max(1, Math.round(a * 60))} phút`;
  if (a < 48) {
    const g = Math.floor(a);
    const p = Math.round((a - g) * 60);
    return p ? `${g} giờ ${p} phút` : `${g} giờ`;
  }
  const d = Math.floor(a / 24);
  const g = Math.round(a - d * 24);
  return g ? `${d} ngày ${g} giờ` : `${d} ngày`;
}
