import { useEffect, useState } from "react";

// Tuy bien cot cua "Bang thong nhat" Admin BH - port dung ADMIN_COLS_DEF/loadAdminColState() cua
// prototype-html (yeu cau 03/09/2026: "keo doi vi tri cot, keo giai do rong, bat/tat bo sung cac cot
// thong tin co trong data"). Luu localStorage DUNG key cu (`admin_unified_cols_v1`) va DUNG hinh
// dang JSON ({order, hidden, widths}) - de neu nguoi dung tung dung ban prototype tren cung trinh
// duyet, cau hinh cot ho da tuy chinh truoc do tu dong duoc doc lai, khong phai lam lai tu dau.

export type AdminColKey = "trangthai" | "nguon" | "khachhang" | "linhkien" | "phanloai" | "mota" | "sla" | "sdt" | "donchacode" | "phieuguicode" | "doitru" | "huongxuly" | "baohanh";

export const ADMIN_COLS_DEF: Record<AdminColKey, { label: string; width: number }> = {
  trangthai: { label: "Trạng thái", width: 150 },
  nguon: { label: "Nguồn", width: 190 },
  khachhang: { label: "Khách hàng", width: 150 },
  linhkien: { label: "Linh kiện", width: 190 },
  // 05/10/2026: "Phan loai" linh kien lay tu linh-kien-app (cot don_vi da dong bo san).
  phanloai: { label: "Phân loại LK", width: 130 },
  mota: { label: "Mô tả lỗi", width: 200 },
  sla: { label: "SLA", width: 90 },
  sdt: { label: "SĐT khách hàng", width: 120 },
  donchacode: { label: "Mã đơn cha", width: 110 },
  phieuguicode: { label: "Mã phiếu gửi", width: 110 },
  doitru: { label: "Loại đối trừ", width: 120 },
  huongxuly: { label: "Hướng xử lý", width: 150 },
  baohanh: { label: "Tình trạng BH", width: 120 },
};
const ALL_KEYS = Object.keys(ADMIN_COLS_DEF) as AdminColKey[];
const DEFAULT_ORDER: AdminColKey[] = ["trangthai", "nguon", "khachhang", "linhkien", "phanloai", "mota", "sla"];
const DEFAULT_HIDDEN: AdminColKey[] = ["sdt", "donchacode", "phieuguicode", "doitru", "huongxuly", "baohanh"];
const STORAGE_KEY = "admin_unified_cols_v1";

interface StoredState {
  order: AdminColKey[];
  hidden: AdminColKey[];
  widths: Partial<Record<AdminColKey, number>>;
}

function loadState(): StoredState {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<StoredState> | null;
    let order = Array.isArray(raw?.order) ? raw!.order.filter((k): k is AdminColKey => ALL_KEYS.includes(k as AdminColKey)) : DEFAULT_ORDER.slice();
    // Cot moi them sau nay: chen ngay sau cot dung truoc no trong thu tu mac dinh (khong day xuong cuoi).
    const defaultFull = DEFAULT_ORDER.concat(DEFAULT_HIDDEN);
    ALL_KEYS.forEach((k) => {
      if (order.includes(k)) return;
      const prev = defaultFull[defaultFull.indexOf(k) - 1];
      const at = prev ? order.indexOf(prev) : -1;
      if (at >= 0) order.splice(at + 1, 0, k);
      else order.push(k);
    });
    const hidden = Array.isArray(raw?.hidden) ? raw!.hidden.filter((k): k is AdminColKey => ALL_KEYS.includes(k as AdminColKey)) : DEFAULT_HIDDEN.slice();
    const widths = raw?.widths && typeof raw.widths === "object" ? raw.widths : {};
    return { order, hidden, widths };
  } catch {
    return { order: DEFAULT_ORDER.concat(DEFAULT_HIDDEN), hidden: DEFAULT_HIDDEN.slice(), widths: {} };
  }
}

function saveState(s: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* localStorage khong kha dung (private mode/quota) - bo qua, khong lam vo trang */
  }
}

export function useAdminCols() {
  const [order, setOrder] = useState<AdminColKey[]>(() => loadState().order);
  const [hidden, setHidden] = useState<Set<AdminColKey>>(() => new Set(loadState().hidden));
  const [widths, setWidths] = useState<Partial<Record<AdminColKey, number>>>(() => loadState().widths);

  useEffect(() => {
    saveState({ order, hidden: Array.from(hidden), widths });
  }, [order, hidden, widths]);

  const visibleCols = order.filter((k) => !hidden.has(k));
  const colWidth = (k: AdminColKey) => widths[k] || ADMIN_COLS_DEF[k].width;

  const reorder = (fromKey: AdminColKey, toKey: AdminColKey) => {
    if (fromKey === toKey) return;
    setOrder((prev) => {
      const arr = prev.slice();
      const from = arr.indexOf(fromKey);
      const to = arr.indexOf(toKey);
      if (from < 0 || to < 0) return prev;
      arr.splice(from, 1);
      arr.splice(to, 0, fromKey);
      return arr;
    });
  };

  const toggleHidden = (k: AdminColKey, visible: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const commitWidth = (k: AdminColKey, w: number) => {
    setWidths((prev) => ({ ...prev, [k]: w }));
  };

  const reset = () => {
    setOrder(DEFAULT_ORDER.concat(DEFAULT_HIDDEN));
    setHidden(new Set(DEFAULT_HIDDEN));
    setWidths({});
  };

  return { order, hidden, widths, visibleCols, colWidth, reorder, toggleHidden, commitWidth, reset };
}
