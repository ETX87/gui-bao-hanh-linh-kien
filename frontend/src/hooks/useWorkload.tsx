import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AppUser } from "../lib/types";

// Dem "viec can lam" theo tung vai tro - dung cho StatCard/dai pill "Viec cua toi" o Trang chu VA huy
// hieu tren Sidebar. Goi lai danh dung cac endpoint GET danh sach da co (khong them endpoint /workload
// rieng - tranh trung logic dem 2 noi). refresh() cho man hinh goi lai sau khi thao tac xong de cap
// nhat so lieu ngay (khop hanh vi "render() lai toan trang" cua prototype, khong can websocket).

export interface WorkloadCounts {
  ktv_phieu_nhap: number;
  ktv_cho_bo_sung: number;
  ktv_nhan_hang: number;
  kho_cho_tiep_nhan: number;
  kho_cho_dong_goi: number;
  admin_cho_tiep_nhan_noi_bo: number;
  admin_cho_xac_nhan_sl: number;
  admin_cho_phan_loai: number;
  admin_cho_xac_nhan_hoan_tat: number;
  admin_san_sang_gom: number;
  nv_cho_chan_doan: number;
  ketoan_cho_duyet: number;
}

const EMPTY: WorkloadCounts = {
  ktv_phieu_nhap: 0,
  ktv_cho_bo_sung: 0,
  ktv_nhan_hang: 0,
  kho_cho_tiep_nhan: 0,
  kho_cho_dong_goi: 0,
  admin_cho_tiep_nhan_noi_bo: 0,
  admin_cho_xac_nhan_sl: 0,
  admin_cho_phan_loai: 0,
  admin_cho_xac_nhan_hoan_tat: 0,
  admin_san_sang_gom: 0,
  nv_cho_chan_doan: 0,
  ketoan_cho_duyet: 0,
};

async function fetchCounts(user: AppUser): Promise<WorkloadCounts> {
  const counts = { ...EMPTY };
  const jobs: Promise<void>[] = [];
  if (user.la_ktv_dvbh || user.la_ve_tinh) {
    jobs.push(
      api.get<{ phieu_gui: { trang_thai: string }[] }>("/phieu-gui").then((r) => {
        counts.ktv_phieu_nhap = r.phieu_gui.filter((g) => g.trang_thai === "nhap").length;
      }),
      api.get<{ don_vi: { trang_thai: string }[] }>("/phieu-gui/don-vi/tra-cuu").then((r) => {
        counts.ktv_cho_bo_sung = r.don_vi.filter((u) => u.trang_thai === "cho_bo_sung_tt").length;
      }),
      api.get<{ phieu_tra: unknown[] }>("/phieu-tra?trang_thai=da_gui").then((r) => {
        counts.ktv_nhan_hang = r.phieu_tra.length;
      }),
    );
  }
  if (user.la_kho) {
    jobs.push(
      api.get<{ phieu_gui: unknown[] }>("/kho/phieu-gui?trang_thai=da_gui").then((r) => {
        counts.kho_cho_tiep_nhan = r.phieu_gui.length;
      }),
      api.get<{ phieu_tra: unknown[] }>("/phieu-tra?trang_thai=da_duyet_ke_toan").then((r) => {
        counts.kho_cho_dong_goi = r.phieu_tra.length;
      }),
    );
  }
  if (user.la_admin_bh) {
    jobs.push(
      api.get<{ phieu_gui: unknown[] }>("/admin/phieu-gui").then((r) => {
        counts.admin_cho_tiep_nhan_noi_bo = r.phieu_gui.length;
      }),
      api.get<{ don_cha: unknown[] }>("/admin/don-cha").then((r) => {
        counts.admin_cho_xac_nhan_sl = r.don_cha.length;
      }),
      api.get<{ don_vi: unknown[] }>("/admin/don-vi").then((r) => {
        counts.admin_cho_phan_loai = r.don_vi.length;
      }),
      api.get<{ don_vi: unknown[] }>("/admin/xac-nhan").then((r) => {
        counts.admin_cho_xac_nhan_hoan_tat = r.don_vi.length;
      }),
      api.get<{ don_vi: unknown[] }>("/phieu-tra/san-sang").then((r) => {
        counts.admin_san_sang_gom = r.don_vi.length;
      }),
    );
  }
  if (user.la_nv_sua_chua) {
    jobs.push(
      api.get<{ don_vi: unknown[] }>("/nv/viec-cua-toi").then((r) => {
        counts.nv_cho_chan_doan = r.don_vi.length;
      }),
    );
  }
  if (user.la_ke_toan) {
    jobs.push(
      api.get<{ phieu_tra: unknown[] }>("/phieu-tra?trang_thai=cho_ke_toan_duyet").then((r) => {
        counts.ketoan_cho_duyet = r.phieu_tra.length;
      }),
    );
  }
  await Promise.all(jobs.map((j) => j.catch(() => undefined)));
  return counts;
}

const WorkloadContext = createContext<{ counts: WorkloadCounts; refresh: () => void }>({ counts: EMPTY, refresh: () => {} });

export function WorkloadProvider({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const [counts, setCounts] = useState<WorkloadCounts>(EMPTY);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetchCounts(user).then((c) => {
      if (!cancelled) setCounts(c);
    });
    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  return <WorkloadContext.Provider value={{ counts, refresh }}>{children}</WorkloadContext.Provider>;
}

export function useWorkload() {
  return useContext(WorkloadContext);
}
