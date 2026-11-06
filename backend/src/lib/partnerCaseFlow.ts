// Luong quy trinh (cac moc tu luc tao don toi khi KTV nhan lai) cho API doi tac case-timeline (routes/partnerCase.ts).
// 06/11/2026 vong 2: dvbh hien tab "Bao hanh" dang 1 luong tu dau den cuoi - tinh o day vi chi suachua co du nhat ky +
// thu tu giai doan. Moc "xong" = co nhat ky hoac giai doan hien tai da vuot qua moc do (du lieu cu thieu log van dung).
import { HUONG_CAN_NV } from "./constants";

export interface RawLog {
  id: number;
  entity_type: string;
  entity_id: string;
  tu_trang_thai: string | null;
  den_trang_thai: string | null;
  thoi_gian: string | null;
  ghi_chu: string | null;
  nguoi: string | null;
}

export interface Moc {
  key: string;
  label: string;
  trang_thai: "xong" | "dang" | "chua" | "loi";
  at: string | null;
  nguoi: string | null;
  ghi_chu: string | null;
}

// Thu tu giai doan trong toan luong (= GIAI_DOAN cua frontend suachua, bo cac nhanh ket thuc).
const THU_TU = [
  "thung_nhap",
  "thung_dang_gui",
  "thung_cho_admin_nhan",
  "cho_xac_nhan_so_luong",
  "cho_phan_loai",
  "admin_can_xem_lai",
  "cho_bo_sung_tt",
  "cho_chan_doan",
  "cho_admin_xac_nhan",
  "san_sang_gom_phieu_tra",
  "tra_nhap",
  "tra_cho_ke_toan_duyet",
  "tra_da_duyet_ke_toan",
  "tra_da_gui",
  "tra_khieu_nai_van_chuyen",
  "tra_gui_that_bai",
  "tra_ktv_da_nhan",
];
const idx = (gd: string | null) => (gd ? THU_TU.indexOf(gd) : -1);

function tim(logs: RawLog[], type: string, ids: string[], pred: (l: RawLog) => boolean, last = false): RawLog | null {
  const m = logs.filter((l) => l.entity_type === type && ids.includes(l.entity_id) && pred(l));
  if (m.length === 0) return null;
  return last ? m[m.length - 1] : m[0];
}

interface Input {
  parent: { id: string; created_at: string | null; trang_thai_cha: string };
  gui: {
    id: string;
    trang_thai: string;
    ngay_gui_xe: string | null;
    thoi_gian_nhan_kho: string | null;
    admin_thoi_gian_nhan: string | null;
    ktv_ten: string | null;
    kho_nhan_ten: string | null;
    admin_nhan_ten: string | null;
    van_chuyen: string | null;
  } | null;
  unit: {
    id: string;
    trang_thai: string;
    giai_doan: string;
    created_at: string | null;
    huong_xu_ly: string | null;
    huong_label: string | null;
    nv_sua_chua: string | null;
    ket_qua: string | null;
    ly_do_tu_choi: string | null;
  } | null;
  tra: { id: string; trang_thai: string; created_at: string | null; ma_van_don: string | null; khong_nhan_duoc_ghi_chu: string | null } | null;
  giaiDoanCha: string | null;
  logs: RawLog[]; // da sap xep tang dan theo thoi gian
}

export function tinhLuong(x: Input): Moc[] {
  const { parent: p, gui: g, unit: u, tra: t, logs } = x;
  const gd = u ? u.giai_doan : x.giaiDoanCha;
  const i = idx(gd);
  const out: Moc[] = [];
  const add = (key: string, label: string, done: boolean, log: RawLog | null, fallbackAt: string | null, nguoi: string | null, ghiChu: string | null) =>
    out.push({ key, label, trang_thai: done ? "xong" : "chua", at: done ? (log?.thoi_gian ?? fallbackAt) : null, nguoi: done ? (log?.nguoi ?? nguoi) : null, ghi_chu: ghiChu });

  const gIds = g ? [g.id] : [];
  // Gio tao = created_at cua don (log dau cua phieu_sc co the la luc Admin xac nhan, khong phai luc tao).
  out.push({ key: "tao_don", label: "KTV tạo đơn", trang_thai: "xong", at: p.created_at, nguoi: g?.ktv_ten ?? null, ghi_chu: null });
  // Da tach don vi = Admin BH da nhan thung -> cac moc thung chac chan xong (ke ca don vi da huy, giai doan ket_thuc_*).
  const quaThung = !!u;
  if (g) {
    add("gui_xe", "KTV gửi xe về Kho", quaThung || i >= idx("thung_dang_gui"), tim(logs, "phieu_gui", gIds, (l) => l.den_trang_thai === "da_gui"), g.ngay_gui_xe, g.ktv_ten, g.van_chuyen);
    add("kho_nhan", "Kho nhận hàng", quaThung || i >= idx("thung_cho_admin_nhan"), tim(logs, "phieu_gui", gIds, (l) => l.den_trang_thai === "da_tiep_nhan"), g.thoi_gian_nhan_kho, g.kho_nhan_ten, null);
    add("admin_nhan", "Admin BH nhận", quaThung || i >= idx("cho_xac_nhan_so_luong"), null, g.admin_thoi_gian_nhan, g.admin_nhan_ten, null);
  }
  add(
    "xac_nhan_sl",
    "Xác nhận số lượng",
    !!u || p.trang_thai_cha !== "cho_xac_nhan_so_luong",
    tim(logs, "phieu_sc", [p.id], (l) => l.tu_trang_thai === "cho_xac_nhan_so_luong" && l.den_trang_thai !== "cho_xac_nhan_so_luong"),
    u?.created_at ?? null, // don vi duoc tao dung luc xac nhan so luong
    null,
    null,
  );
  if (!u) return danhDauDang(out);

  const uIds = [u.id];
  const ketThuc = u.trang_thai === "ket_thuc_tu_choi" || u.trang_thai === "ket_thuc_chuyen_kho";
  const phanLoaiLog = tim(logs, "phieu_sc_ct", uIds, (l) => l.tu_trang_thai === "cho_phan_loai" && l.den_trang_thai !== "cho_phan_loai");
  add("phan_loai", "Admin BH phân loại", ketThuc || i >= idx("cho_chan_doan"), phanLoaiLog, null, null, u.huong_label ? `Hướng xử lý: ${u.huong_label}` : null);
  if (ketThuc) {
    const l = tim(logs, "phieu_sc_ct", uIds, (x2) => x2.den_trang_thai === u.trang_thai);
    add("ket_thuc", u.trang_thai === "ket_thuc_tu_choi" ? "Đã huỷ đơn bảo hành" : "Đã chuyển kho", true, l, null, null, u.ly_do_tu_choi);
    return danhDauDang(out);
  }
  const tIds = t ? [t.id] : [];
  const canNv = !u.huong_xu_ly || (HUONG_CAN_NV as readonly string[]).includes(u.huong_xu_ly);
  if (canNv) {
    add(
      "sua_chua",
      "NV sửa chữa / chẩn đoán",
      i >= idx("cho_admin_xac_nhan"),
      tim(logs, "phieu_sc_ct", uIds, (l) => l.tu_trang_thai === "cho_chan_doan" && l.den_trang_thai === "cho_admin_xac_nhan", true),
      null,
      u.nv_sua_chua,
      u.ket_qua ? `Kết quả: ${u.ket_qua}` : null,
    );
    add("admin_xac_nhan", "Admin BH xác nhận hoàn tất", i >= idx("san_sang_gom_phieu_tra"), tim(logs, "phieu_sc_ct", uIds, (l) => l.den_trang_thai === "san_sang_gom_phieu_tra", true), null, null, null);
  }
  // Don vi co the duoc GOP vao phieu tra da co tu truoc -> lay dong nhat ky nhac dung ma don vi; khong co thi la luc tao phieu.
  const reId = new RegExp(`${u.id.replace(/-/g, "\-")}(?![0-9])`);
  const gopLog = t ? tim(logs, "phieu_tra", tIds, (l) => reId.test(l.ghi_chu ?? "")) : null;
  const taoTraLog = t ? tim(logs, "phieu_tra", tIds, (l) => l.tu_trang_thai == null) : null;
  add("phieu_tra", "Tạo phiếu trả", i >= idx("tra_nhap"), gopLog ?? taoTraLog, t?.created_at ?? null, null, t ? `Phiếu ${t.id}` : null);
  if (t?.trang_thai === "ket_thuc_khong_gui") {
    add("ket_thuc", "Kết thúc, không gửi hàng về KTV", true, tim(logs, "phieu_tra", tIds, (l) => l.den_trang_thai === "ket_thuc_khong_gui", true), null, null, null);
    return danhDauDang(out);
  }
  add("ke_toan", "Kế toán duyệt", i >= idx("tra_da_duyet_ke_toan"), tim(logs, "phieu_tra", tIds, (l) => l.den_trang_thai === "da_duyet_ke_toan", true), null, null, null);
  add("kho_gui", "Kho gửi trả KTV", i >= idx("tra_da_gui"), tim(logs, "phieu_tra", tIds, (l) => l.den_trang_thai === "da_gui", true), null, null, t?.ma_van_don ? `Vận đơn ${t.ma_van_don}` : null);
  const nhan = tim(logs, "phieu_tra", tIds, (l) => l.den_trang_thai === "ktv_da_nhan", true);
  add("ktv_nhan", "KTV nhận lại hàng", gd === "tra_ktv_da_nhan", nhan, null, null, null);
  const res = danhDauDang(out);
  if (gd === "tra_khieu_nai_van_chuyen" || gd === "tra_gui_that_bai") {
    const last = res[res.length - 1];
    last.trang_thai = "loi";
    last.label = gd === "tra_gui_that_bai" ? "Gửi thất bại (thất lạc)" : "KTV báo không nhận được hàng";
    last.ghi_chu = t?.khong_nhan_duoc_ghi_chu ?? null;
  }
  return res;
}

// Moc chua xong dau tien = "dang" (buoc dang cho).
function danhDauDang(out: Moc[]): Moc[] {
  const first = out.find((m) => m.trang_thai === "chua");
  if (first) first.trang_thai = "dang";
  return out;
}

/** Nhat ky cap THUNG / PHIEU TRA dung chung cho nhieu don (nhieu ca). Giu dong doi trang thai (ap cho ca phieu)
 * hoac dong co nhac dung ma don / don vi cua don nay; bo cac dong "gop them / bo / doi linh kien" cua don khac. */
export function logThuocDon(l: RawLog, ids: string[]): boolean {
  if (l.entity_type === "phieu_sc" || l.entity_type === "phieu_sc_ct") return true;
  if ((l.tu_trang_thai ?? null) !== (l.den_trang_thai ?? null)) return true;
  const gc = l.ghi_chu ?? "";
  return ids.some((id) => new RegExp(`${id.replace(/[-]/g, "\\-")}(?![0-9])`).test(gc));
}
