import { buildXlsx, downloadBlob, type XlsxCell } from "./xlsx";

// 26/11/2026 (v1.162) - Bien ban ban giao (BBBG) tra xac sinh TU thung TX- (thay BBBG lap tay).
// Nguyen van: "Làm cả 3" - phuong an (1) "Nút Tải BBBG trong chi tiết thùng TX: sheet 1 đúng mẫu công ty (tổng hợp theo mã B, 1 mã 1 dòng,
// đối tác / miền / Mã EO / mã TX / chữ ký); sheet 2 mỗi xác 1 dòng (mã xác, case, mã B, kiện)".
// Mau theo BBBG nhan vien gui 18/11/2026 (STT · Mã hàng · Tên vật tư · SL · Số thùng · MYC) nhung: 1 ma hang 1 dong (khong gop o),
// cot Kien lay tu so kien tung xac, cot MYC liet ke ma case (lap lai thi ghi ×n). Thung chua duoc Ke toan duyet -> tieu de ghi BAN NHAP.

export interface BbbgThung {
  id: string;
  trang_thai: string;
  doi_tac: string | null;
  ma_eo: string | null;
  ghi_chu: string | null;
  mien: string | null;
  kt_luc: string | null;
}
export interface BbbgXac {
  id: string;
  loai: string;
  unit_id: string;
  so_luong: number;
  ma_lk_xac: string | null;
  case_id: string | null;
  kien?: string | null;
  khach_hang?: string | null;
}

const soTuNhien = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });

function gomKien(ks: string[]): string {
  const u = [...new Set(ks.filter(Boolean))].sort(soTuNhien);
  return u.length ? u.join(", ") : "";
}

function gomCase(cs: string[]): string {
  const m = new Map<string, number>();
  for (const c of cs) if (c) m.set(c, (m.get(c) || 0) + 1);
  return [...m.entries()].map(([c, n]) => (n > 1 ? `${c} ×${n}` : c)).join("  ");
}

export function taiBbbg(t: BbbgThung, xac: BbbgXac[], nameOf: (m: string | null) => string, nguoiLap: string) {
  const ngay = (t.kt_luc ? t.kt_luc.slice(0, 10) : new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)).split("-");
  const mienTxt = t.mien === "MB" ? "Miền Bắc" : t.mien === "MN" ? "Miền Nam" : "";
  const nhap = t.trang_thai !== "da_duyet";
  const sl = (x: BbbgXac) => Number(x.so_luong) || 1;

  // ---- Sheet 1: BBBG tong hop theo ma B ----
  const nhom = new Map<string, BbbgXac[]>();
  for (const x of xac) {
    const k = x.ma_lk_xac || "";
    nhom.set(k, [...(nhom.get(k) || []), x]);
  }
  const dong = [...nhom.entries()]
    .map(([ma, xs]) => ({ ma, ten: ma ? nameOf(ma) : "(chưa có mã linh kiện)", sl: xs.reduce((a, x) => a + sl(x), 0), kien: gomKien(xs.map((x) => x.kien || "")), myc: gomCase(xs.map((x) => x.case_id || "")), thieuKien: xs.some((x) => !x.kien) }))
    .sort((a, b) => soTuNhien(a.kien || "~", b.kien || "~") || soTuNhien(a.ma, b.ma));
  const tong = dong.reduce((a, d) => a + d.sl, 0);
  const W = 6; // A..F
  const rows: XlsxCell[][] = [
    ["CÔNG TY CỔ PHẦN CÔNG NGHỆ VÀ DỊCH VỤ 3T"],
    [nhap ? "BIÊN BẢN BÀN GIAO LINH KIỆN (BẢN NHÁP — thùng chưa được Kế toán duyệt)" : "BIÊN BẢN BÀN GIAO LINH KIỆN"],
    [`Ngày ${ngay[2]} tháng ${ngay[1]} năm ${ngay[0]}`],
    [`Bộ phận bàn giao: Phòng bảo hành ${mienTxt}`.trim()],
    [`Bên nhận: ${t.doi_tac || "—"}`],
    [`Thùng trả xác: ${t.id}   ·   Mã EO: ${t.ma_eo || "—"}   ·   Tổng: ${tong} xác, ${dong.length} mã hàng`],
    [`Diễn giải hàng hoá: Xác linh kiện bảo hành trả ${t.doi_tac || "đối tác"}${t.ghi_chu ? ` — ${t.ghi_chu.replace(/\s+/g, " ")}` : ""}`],
    [],
    ["STT", "Mã hàng", "Tên vật tư / linh kiện", "SL", "Kiện", "Mã case / Lada (MYC)"],
  ];
  const head = rows.length - 1;
  dong.forEach((d, i) => rows.push([i + 1, d.ma, d.ten, d.sl, d.kien || "Chưa ghi kiện", d.myc]));
  const tongRow = rows.length;
  rows.push(["", "", "Tổng cộng", tong, "", ""]);
  rows.push([]);
  const ky = rows.length;
  rows.push(["Người lập", "", "Giao vận", "", "Bên nhận hàng", ""]);
  rows.push(["(Ký, ghi rõ họ tên)", "", "(Ký, ghi rõ họ tên)", "", "(Ký, ghi rõ họ tên)", ""]);
  rows.push([], [], []);
  rows.push([nguoiLap, "", "", "", "", ""]);
  const ten = rows.length - 1;
  const merges = [0, 1, 2, 3, 4, 5, 6].map((r) => `A${r + 1}:F${r + 1}`);
  for (const r of [ky, ky + 1, ten]) merges.push(`A${r + 1}:B${r + 1}`, `C${r + 1}:D${r + 1}`, `E${r + 1}:F${r + 1}`);
  const style = (r: number, c: number) => {
    if (r === 0) return 1;
    if (r === 1) return 4;
    if (r === 2) return 5;
    if (r === head) return 2;
    if (r > head && r < tongRow) return c === 0 || c === 3 || c === 4 ? 6 : 3;
    if (r === tongRow) return c === 3 ? 6 : 8;
    if (r === ky || r === ten) return 7;
    if (r === ky + 1) return 5;
    return 0;
  };

  // ---- Sheet 2: chi tiet tung xac ----
  const ct: XlsxCell[][] = [["STT", "Mã xác", "Đơn vị BH", "Loại", "Mã case / Lada", "Mã hàng (B)", "Tên linh kiện", "SL", "Kiện", "Khách hàng"]];
  [...xac]
    .sort((a, b) => soTuNhien(a.kien || "~", b.kien || "~") || soTuNhien(a.ma_lk_xac || "", b.ma_lk_xac || "") || a.id.localeCompare(b.id))
    .forEach((x, i) => ct.push([i + 1, x.id, x.unit_id, x.loai === "sua_chua" ? "Sau sửa chữa" : "Đổi mới", x.case_id || "", x.ma_lk_xac || "", nameOf(x.ma_lk_xac), sl(x), x.kien || "", x.khach_hang || ""]));

  // ---- Sheet 3: theo kien (dong goi / kiem dem) ----
  const tk = new Map<string, Map<string, number>>();
  for (const x of xac) {
    const k = x.kien || "Chưa ghi kiện";
    const m = tk.get(k) || new Map<string, number>();
    m.set(x.ma_lk_xac || "", (m.get(x.ma_lk_xac || "") || 0) + sl(x));
    tk.set(k, m);
  }
  const kr: XlsxCell[][] = [["Kiện", "Mã hàng", "Tên linh kiện", "SL"]];
  for (const k of [...tk.keys()].sort(soTuNhien)) for (const [ma, n] of tk.get(k)!) kr.push([k, ma, nameOf(ma), n]);

  downloadBlob(
    buildXlsx([
      { name: "BBBG", rows, widths: [6, 14, 44, 7, 14, 70], merges, style, heights: { 1: 24 } },
      { name: "Chi tiet xac", rows: ct, widths: [6, 16, 16, 12, 16, 14, 40, 6, 12, 24] },
      { name: "Theo kien", rows: kr, widths: [14, 14, 44, 8] },
    ]),
    `BBBG_${t.id}${t.doi_tac ? `_${t.doi_tac.replace(/[^\p{L}\p{N}]+/gu, "-")}` : ""}_${ngay[2]}-${ngay[1]}-${ngay[0]}.xlsx`,
  );
  return { tong, maHang: dong.length, thieuKien: xac.filter((x) => !x.kien).length };
}
