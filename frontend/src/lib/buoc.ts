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

// 16/11/2026: ly do cham hop le theo chu buoc (giong het backend lib/giaiTrinh.ts BEN_THEO_CHU). Ly do chua gan ben -> luon hien.
export const BEN_THEO_CHU: Record<string, string[]> = {
  ktv: ["ktv", "gs", "van_chuyen", "ngoai_canh"],
  kho: ["kho", "van_chuyen", "ktv", "ngoai_canh"],
  admin: ["admin_bh", "kho", "ktv", "ngoai_canh"],
  nv: ["nv", "admin_bh", "kho", "ngoai_canh"],
  ketoan: ["ke_toan", "admin_bh", "ngoai_canh"],
};
export function lyDoHopBuoc<T extends { ben?: string | null }>(items: T[], gd?: string | null): T[] {
  const b = buocOf(gd);
  const ok = b ? BEN_THEO_CHU[b.chu] : null;
  return ok ? items.filter((l) => !l.ben || ok.includes(l.ben)) : items;
}

// 16/11/2026: buoc -> tab man chung de bam "bước đang dừng" mo dung noi xu ly (nguoi khong xem duoc "Mọi giai đoạn").
export const GD_TAB: Record<string, string> = {
  thung_nhap: "/thung?tab=nhap_ktv",
  thung_dang_gui: "/thung?tab=dang_gui",
  thung_cho_admin_nhan: "/thung?tab=cho_admin",
  thung_tu_choi: "/thung?tab=tu_choi",
  cho_xac_nhan_so_luong: "/don?tab=xu_ly",
  cho_phan_loai: "/don?tab=xu_ly",
  admin_can_xem_lai: "/don?tab=xu_ly",
  cho_bo_sung_tt: "/don?tab=xu_ly",
  cho_chan_doan: "/don?tab=dang_sua",
  cho_admin_xac_nhan: "/don?tab=hoan_tat",
  san_sang_gom_phieu_tra: "/phieu-tra?tab=cho_tao",
  tra_nhap: "/phieu-tra?tab=nhap",
  tra_cho_ke_toan_duyet: "/phieu-tra?tab=cho_kt",
  tra_da_duyet_ke_toan: "/phieu-tra?tab=cho_in",
  tra_da_gui: "/phieu-tra?tab=dang_gui",
  tra_khieu_nai_van_chuyen: "/phieu-tra?tab=khieu_nai",
};
