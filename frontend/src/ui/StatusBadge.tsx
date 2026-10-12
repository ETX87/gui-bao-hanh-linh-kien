import { Badge } from "./primitives";
import { TRANG_THAI_PHIEU_GUI_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, TRANG_THAI_UNIT_LABELS } from "../lib/constants";

// Badge trang thai thong nhat (DESIGN_SYSTEM.md §2.5): moi trang thai 1 tone co dinh, cham tron "•" cho
// trang thai DANG CHO nguoi xu ly. Truoc 04/10/2026 moi trang thai deu to chung 1 mau xanh duong -
// khong phan biet duoc bang mat khi quet nhanh. Rieng "Cho KTV bo sung" giu TIM (da chot tu vong 1).

type Tone = "amber" | "red" | "violet" | "blue" | "brand" | "green" | "gray";
type Spec = { tone: Tone; dot?: boolean };

export const UNIT_STATUS: Record<string, Spec> = {
  cho_phan_loai: { tone: "amber", dot: true },
  admin_can_xem_lai: { tone: "red", dot: true },
  cho_bo_sung_tt: { tone: "violet", dot: true },
  cho_chan_doan: { tone: "blue", dot: true },
  cho_admin_xac_nhan: { tone: "amber", dot: true },
  san_sang_gom_phieu_tra: { tone: "brand" },
  ket_thuc_tu_choi: { tone: "gray" },
  ket_thuc_chuyen_kho: { tone: "gray" },
};
const GUI_STATUS: Record<string, Spec> = {
  nhap: { tone: "gray" },
  da_gui: { tone: "amber", dot: true },
  da_tiep_nhan: { tone: "green" },
};
const TRA_STATUS: Record<string, Spec> = {
  nhap: { tone: "gray" },
  cho_ke_toan_duyet: { tone: "amber", dot: true },
  da_duyet_ke_toan: { tone: "blue", dot: true },
  da_gui: { tone: "blue", dot: true },
  ktv_da_nhan: { tone: "green" },
  khieu_nai_van_chuyen: { tone: "red", dot: true },
  gui_that_bai: { tone: "red" },
};

const MAPS = {
  unit: { spec: UNIT_STATUS, labels: TRANG_THAI_UNIT_LABELS },
  gui: { spec: GUI_STATUS, labels: TRANG_THAI_PHIEU_GUI_LABELS },
  tra: { spec: TRA_STATUS, labels: TRANG_THAI_PHIEU_TRA_LABELS },
};

export function StatusBadge({ kind, value }: { kind: keyof typeof MAPS; value: string | null | undefined }) {
  const v = value || "";
  const m = MAPS[kind];
  const s = m.spec[v] || { tone: "gray" as Tone };
  return (
    <Badge tone={s.tone} dot={s.dot}>
      {m.labels[v] || v || "—"}
    </Badge>
  );
}
