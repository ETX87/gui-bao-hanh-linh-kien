import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AppUser } from "../lib/types";

// Dem "viec can lam" theo tung vai tro - dung cho StatCard/dai pill "Viec cua toi" o Trang chu VA huy
// hieu tren Sidebar/BottomNav. refresh() cho man hinh goi lai sau khi thao tac xong.
//
// Sua 08/09/2026 (Phat hien 2 vong ra soat UX): truoc day goi ~12 endpoint list KHONG kem ?limit roi
// dem bang r.xxx.length - moi so bi chan o 20 (parsePage mac dinh limit=20) => Trang chu undercount.
// Nay goi 1 endpoint GET /api/workload dem bang SELECT COUNT(*) dung y het bo loc tung man hinh
// (xem backend/src/routes/workload.ts) - dung so, 1 request thay vi 12, va co trang thai `loading` de
// khong hien "0" gia lap luc dang tai (Phat hien 16).

export interface WorkloadCounts {
  ktv_phieu_nhap: number;
  ktv_odoo_cho_gui: number;
  ktv_cho_bo_sung: number;
  ktv_nhan_hang: number;
  kho_cho_tiep_nhan: number;
  kho_cho_dong_goi: number;
  kho_cho_in: number; // 04/11/2026: phieu KT da duyet, Kho chua in
  kho_da_in: number; // Kho da in phieu, chua gui
  kho_cho_ban_giao: number;
  kho_khieu_nai: number;
  admin_cho_tiep_nhan_noi_bo: number;
  admin_cho_xac_nhan_sl: number;
  admin_cho_phan_loai: number;
  admin_cho_xac_nhan_hoan_tat: number;
  admin_san_sang_gom: number;
  admin_de_xuat_cho_cap: number;
  admin_thieu_hang_da_ve: number;
  admin_phieu_tra_tu_choi: number;
  nv_cho_chan_doan: number;
  ketoan_cho_duyet: number;
  ketoan_de_xuat_lk: number;
}

const EMPTY: WorkloadCounts = {
  ktv_phieu_nhap: 0,
  ktv_odoo_cho_gui: 0,
  ktv_cho_bo_sung: 0,
  ktv_nhan_hang: 0,
  kho_cho_tiep_nhan: 0,
  kho_cho_dong_goi: 0,
  kho_cho_in: 0,
  kho_da_in: 0,
  kho_cho_ban_giao: 0,
  kho_khieu_nai: 0,
  admin_cho_tiep_nhan_noi_bo: 0,
  admin_cho_xac_nhan_sl: 0,
  admin_cho_phan_loai: 0,
  admin_cho_xac_nhan_hoan_tat: 0,
  admin_san_sang_gom: 0,
  admin_de_xuat_cho_cap: 0,
  admin_thieu_hang_da_ve: 0,
  admin_phieu_tra_tu_choi: 0,
  nv_cho_chan_doan: 0,
  ketoan_cho_duyet: 0,
  ketoan_de_xuat_lk: 0,
};

const WorkloadContext = createContext<{ counts: WorkloadCounts; loading: boolean; refresh: () => void }>({
  counts: EMPTY,
  loading: true,
  refresh: () => {},
});

export function WorkloadProvider({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const [counts, setCounts] = useState<WorkloadCounts>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    // Lan dau: hien loading. Cac lan refresh() sau: giu so cu, khong nhap nhay ve 0.
    if (tick === 0) setLoading(true);
    api
      .get<{ counts: WorkloadCounts }>("/workload")
      .then((r) => {
        if (!cancelled) setCounts({ ...EMPTY, ...r.counts });
      })
      .catch(() => {
        /* giu so cu neu loi mang */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tick]);

  return <WorkloadContext.Provider value={{ counts, loading, refresh }}>{children}</WorkloadContext.Provider>;
}

export function useWorkload() {
  return useContext(WorkloadContext);
}
