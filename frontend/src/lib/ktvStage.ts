// 30/10/2026 (ra soat UX mobile KTV, de xuat 7): trang thai "theo goc nhin KTV" - quy ~20 trang thai noi
// bo (thung / don vi / phieu tra) ve vai cau de hieu, dung chung o moi man KTV. KHONG dung o man Admin.

export type KtvStageKey =
  | "chua_gui"
  | "tren_xe"
  | "kho_nhan"
  | "bo_sung"
  | "dang_xu_ly"
  | "chuan_bi_tra"
  | "dang_tra"
  | "khieu_nai"
  | "da_nhan"
  | "that_lac"
  | "huy";

export interface KtvStage {
  key: KtvStageKey;
  label: string;
  tone: "gray" | "blue" | "amber" | "violet" | "green" | "red" | "orange";
  // Buoc tren dong tien trinh 5 buoc (0 = chua gui ... 4 = da nhan).
  step: number;
}

export const KTV_STEPS = ["Gửi đi", "Kho nhận", "Xử lý", "Trả về", "Đã nhận"];

const S: Record<KtvStageKey, KtvStage> = {
  chua_gui: { key: "chua_gui", label: "Chưa gửi", tone: "gray", step: 0 },
  tren_xe: { key: "tren_xe", label: "Đang trên xe về Kho", tone: "blue", step: 1 },
  kho_nhan: { key: "kho_nhan", label: "Kho đã nhận", tone: "blue", step: 2 },
  bo_sung: { key: "bo_sung", label: "Cần bạn bổ sung", tone: "red", step: 2 },
  dang_xu_ly: { key: "dang_xu_ly", label: "Đang xử lý", tone: "amber", step: 2 },
  chuan_bi_tra: { key: "chuan_bi_tra", label: "Xử lý xong, đang chuẩn bị trả", tone: "violet", step: 3 },
  dang_tra: { key: "dang_tra", label: "Đang trả về bạn", tone: "orange", step: 4 },
  khieu_nai: { key: "khieu_nai", label: "Đang xử lý khiếu nại", tone: "red", step: 4 },
  da_nhan: { key: "da_nhan", label: "Đã nhận lại", tone: "green", step: 5 },
  that_lac: { key: "that_lac", label: "Thất lạc khi trả", tone: "red", step: 5 },
  huy: { key: "huy", label: "Không bảo hành (đã huỷ)", tone: "gray", step: 5 },
};

const ORDER: KtvStageKey[] = ["bo_sung", "chua_gui", "tren_xe", "kho_nhan", "dang_xu_ly", "chuan_bi_tra", "khieu_nai", "dang_tra", "that_lac", "da_nhan", "huy"];

export interface KtvUnitLite {
  id: string;
  trang_thai: string;
  tra_trang_thai?: string | null;
  ktv_thieu?: number;
  that_lac?: number;
}

export function ktvUnitStage(u: KtvUnitLite): KtvStage {
  if (u.trang_thai === "cho_bo_sung_tt") return S.bo_sung;
  if (u.trang_thai === "ket_thuc_tu_choi" || u.trang_thai === "ket_thuc_chuyen_kho") return S.huy;
  switch (u.tra_trang_thai) {
    case "da_gui":
      return S.dang_tra;
    case "ktv_da_nhan":
      return u.that_lac ? S.that_lac : S.da_nhan;
    case "gui_that_bai":
      return S.that_lac;
    case "khieu_nai_van_chuyen":
      // 31/10/2026: bao thieu theo mon - mon KTV khong bao thieu la da nhan.
      return u.ktv_thieu === 0 ? S.da_nhan : S.khieu_nai;
    case "nhap":
    case "cho_ke_toan_duyet":
    case "da_duyet_ke_toan":
      return S.chuan_bi_tra;
  }
  if (u.trang_thai === "san_sang_gom_phieu_tra" || u.trang_thai === "cho_admin_xac_nhan") return S.chuan_bi_tra;
  return S.dang_xu_ly;
}

// Trang thai 1 don cha: thung chua gui / tren xe / Kho nhan (chua tach) hoac buoc "can chu y nhat" cua
// cac don vi (can bo sung > ... > da nhan).
export function ktvDonStage(guiTrangThai: string | null | undefined, units: KtvUnitLite[]): KtvStage {
  if (!units.length) {
    if (guiTrangThai === "nhap") return S.chua_gui;
    if (guiTrangThai === "da_gui") return S.tren_xe;
    return S.kho_nhan;
  }
  const keys = units.map((u) => ktvUnitStage(u).key);
  for (const k of ORDER) if (keys.includes(k)) return S[k];
  return S.dang_xu_ly;
}

export function ktvGuiStage(guiTrangThai: string): KtvStage {
  return guiTrangThai === "nhap" ? S.chua_gui : guiTrangThai === "da_gui" ? S.tren_xe : S.kho_nhan;
}
