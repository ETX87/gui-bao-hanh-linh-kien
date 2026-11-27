// 26/11/2026 (v1.162) - Ghep Bien ban ban giao (BBBG) tra xac lap tay voi xac trong app.
// Nguyen van: "tách các mã "MYC" thành từng ID rồi gắn với linh kiện trả tại cột B rồi đối chiếu với data thật để đánh giá";
// "tôi cần logic và cách xử lý sau này"; "Làm cả 3" (import BBBG theo ma case + ma hang).
// Logic (tai lieu `du an sua chua bao hanh/Quy-trinh-doi-chieu-BBBG-tra-xac_26-11-2026.md` §2): moi dong BBBG = 1 xac (ma case / Lada
// + ma hang). Moi xac app chi ghep 1 lan. Ghep 3 luot de dong khop dung khong bi dong lech "cuop" mat xac:
//   luot 1: ma hang = ma B (LK thuc te gui ve; don vi co the ghi nhieu ma noi dau phay)
//   luot 2: ma hang = ma A (LK khai luc gui) hoac C (LK doi moi)
//   luot 3: con xac bat ky cua case -> "Lech ma LK"; het xac -> "Thua"; case khong co -> "Khong co trong app".
// Trong moi luot uu tien xac dang CHO GOM. Ket luan cuoi theo trang thai xac duoc ghep (thung, ket qua, huong xu ly).

export interface BbbgDong {
  dong: number;
  ma: string; // ma case / Lada (da chuan hoa in hoa, bo khoang trang)
  ma_hang: string;
  kien: string | null;
}

export interface XacUngVien {
  id: string; // DH-...-n hoac DX-...
  case_id: string;
  lk_b: string | null;
  lk_a: string | null;
  lk_c: string | null;
  huong_xu_ly: string | null; // don vi; de xuat = 'sua_chua_cap_lk'
  xu_ly_xac: string | null;
  trang_thai: string | null;
  xac_tt: string | null;
  thung_xac_id: string | null;
  cho_gom: number;
  mien: string | null;
  doi_tac_id: number | null;
}

export type KetLuan =
  | "khop"
  | "khop_ac"
  | "lech_ma"
  | "trong_thung"
  | "da_tra"
  | "da_ket_qua"
  | "khong_tra"
  | "chua_du_dk"
  | "thua"
  | "khong_co";

export const KL_NHAN: Record<KetLuan, string> = {
  khop: "Khớp – chờ gom",
  khop_ac: "Khớp theo mã A/C (mã B khác)",
  lech_ma: "Lệch mã LK",
  trong_thung: "Đang trong thùng khác",
  da_tra: "Đã trả (thùng đã duyệt)",
  da_ket_qua: "Đã có kết quả ngoài thùng",
  khong_tra: "Không phải xác trả đối tác",
  chua_du_dk: "Đơn chưa đủ điều kiện gom",
  thua: "Thừa – case không còn xác",
  khong_co: "Không có trong app",
};

export interface DongGhep extends BbbgDong {
  kl: KetLuan;
  xac: XacUngVien | null;
}

const maList = (v: string | null) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
const XL: Record<string, string> = { tra_doi_tac: "Trả đối tác", tieu_huy: "Tiêu huỷ", luu_kho: "Lưu kho" };
const HUONG: Record<string, string> = { doi_moi: "Đổi mới", tu_choi: "Từ chối", xac_nhan_tru_no: "Xác nhận trừ nợ", sua_chua: "Sửa chữa", tra_lai_ktv: "Trả lại KTV", dich_vu_tinh_phi: "Dịch vụ tính phí", chuyen_kho: "Chuyển kho" };

// v1.166: xac don vi = huong Doi moi hoac Xac nhan tru cong no, xu ly xac "Tra doi tac".
const laXacTraDoiTac = (x: XacUngVien) => x.id.startsWith("DX-") || ((x.huong_xu_ly === "doi_moi" || x.huong_xu_ly === "xac_nhan_tru_no") && x.xu_ly_xac === "tra_doi_tac");

export function ketLuan(x: XacUngVien, theoAc: boolean): KetLuan {
  const laXacTra = laXacTraDoiTac(x);
  if (x.thung_xac_id) return x.xac_tt === "da_tra" ? "da_tra" : "trong_thung";
  if (!laXacTra) return "khong_tra";
  if (x.xac_tt) return "da_ket_qua";
  if (!x.cho_gom) return "chua_du_dk";
  return theoAc ? "khop_ac" : "khop";
}

export function moTaXac(x: XacUngVien): string {
  if (x.thung_xac_id) return `Thùng ${x.thung_xac_id}`;
  if (!laXacTraDoiTac(x))
    return x.huong_xu_ly === "doi_moi" || x.huong_xu_ly === "xac_nhan_tru_no" ? `${HUONG[x.huong_xu_ly] || "Đổi mới"}, xử lý xác: ${XL[x.xu_ly_xac || ""] || x.xu_ly_xac || "chưa chọn"}` : `Hướng xử lý: ${HUONG[x.huong_xu_ly || ""] || x.huong_xu_ly || "chưa phân loại"}`;
  if (x.xac_tt) return `Kết quả: ${x.xac_tt}`;
  if (!x.cho_gom) return `Trạng thái: ${x.trang_thai || ""}`;
  return "";
}

export function ghepBbbg(dongs: BbbgDong[], ungVien: XacUngVien[]): { rows: DongGhep[]; conLai: XacUngVien[] } {
  const theoCase = new Map<string, XacUngVien[]>();
  for (const x of ungVien) {
    const k = x.case_id.toUpperCase();
    theoCase.set(k, [...(theoCase.get(k) || []), x]);
  }
  // Uu tien xac cho gom, roi xac tra doi tac khac (ke ca dang trong thung -> bao "Dang trong thung khac" thay vi ghep nham vao don vi
  // khong phai xac), roi con lai; on dinh theo ma.
  const laXacTra = (x: XacUngVien) => (laXacTraDoiTac(x) ? 1 : 0);
  for (const l of theoCase.values()) l.sort((a, b) => b.cho_gom - a.cho_gom || laXacTra(b) - laXacTra(a) || Number(!!a.thung_xac_id) - Number(!!b.thung_xac_id) || a.id.localeCompare(b.id));
  const dung = new Set<string>();
  const kq = new Map<number, { x: XacUngVien | null; ac: boolean; lech: boolean }>();
  const luot = (khop: (x: XacUngVien, d: BbbgDong) => boolean, ac: boolean, lech: boolean) => {
    dongs.forEach((d, i) => {
      if (kq.has(i)) return;
      const x = (theoCase.get(d.ma) || []).find((u) => !dung.has(u.id) && khop(u, d));
      if (!x) return;
      dung.add(x.id);
      kq.set(i, { x, ac, lech });
    });
  };
  luot((u, d) => maList(u.lk_b).includes(d.ma_hang), false, false);
  luot((u, d) => maList(u.lk_a).includes(d.ma_hang) || maList(u.lk_c).includes(d.ma_hang), true, false);
  luot(() => true, false, true);
  const rows: DongGhep[] = dongs.map((d, i) => {
    const m = kq.get(i);
    if (!m) return { ...d, kl: theoCase.has(d.ma) ? "thua" : "khong_co", xac: null };
    const kl = ketLuan(m.x!, m.ac);
    return { ...d, kl: m.lech && (kl === "khop" || kl === "khop_ac") ? "lech_ma" : kl, xac: m.x };
  });
  const conLai = ungVien.filter((x) => !dung.has(x.id) && x.cho_gom);
  return { rows, conLai };
}
