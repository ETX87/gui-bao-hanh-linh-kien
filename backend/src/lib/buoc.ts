import { nowVN } from "./vnTime";
import { hoursSince, slaCutoffVn } from "./sla";

// 15/11/2026 - quan tri theo BUOC (yeu cau doi tac: "Define rõ từng bước. Bước nào tự động pass theo các trường hợp.
// Ở từng bước sẽ có các lỗi nào, khi nào KTV phải giải trình, khi nào TNGS phải giải trình").
//
// "Buoc dang dung" = giai_doan cua man Tra cuu (routes/traCuu.ts allRowsSql). Moi buoc co: so thu tu (kieu 1, 2, 5B...),
// chu buoc (vai tro dang giu viec), SLA rieng (gio SLA bo Chu nhat; qtri sua o Cai dat), ai giai trinh khi qua SLA, cac
// truong hop tu pass, cac loi hay gap. Frontend lay danh muc nay qua GET /api/buoc (1 nguon duy nhat).
//
// Quy tac giai trinh:
//   - Buoc do BO giu (Kho / Admin BH / NV / Ke toan): nguoi xu ly chon ly do cham ngay khi thao tac (cong SLA cu) hoac
//     bam "Giai trinh" bat ky luc nao.
//   - Buoc do KTV giu (thung nhap, bo sung thong tin, nhan hang tra): KTV phai giai trinh khi qua SLA.
//   - KTV qua SLA them `len_gs` gio (mac dinh 24h) van chua giai trinh -> chuyen Giam sat khu vuc (TNGS) giai trinh.

export type ChuBuoc = "ktv" | "kho" | "admin" | "nv" | "ketoan" | "he_thong";
export type GiaiTrinh = "ktv" | "bo" | "khong";

export interface BuocDef {
  gd: string;
  so: string; // so buoc hien thi
  ten: string;
  chu: ChuBuoc;
  sla: number; // gio mac dinh
  giai_trinh: GiaiTrinh;
  viec: string; // viec chu buoc can lam de qua buoc
  tu_pass: string[];
  loi: string[];
  ket_thuc?: boolean;
}

export const BUOC: BuocDef[] = [
  {
    gd: "thung_nhap", so: "1", ten: "KTV đóng thùng & gửi xe", chu: "ktv", sla: 24, giai_trinh: "ktv",
    viec: "Thêm đủ đơn vào thùng, điền vận chuyển, bấm Xác nhận gửi",
    tu_pass: ["Admin BH tạo hộ thùng → bỏ qua bước 2, 3, 4 khi bấm gửi", "Kho / Admin BH nhận thẳng thùng nháp (KTV giao tận tay)"],
    loi: ["Thùng có đơn nhưng để nháp quá SLA", "Mã case không thuộc KTV (bị chặn khi thêm đơn)", "Thiếu thông tin vận chuyển"],
  },
  {
    gd: "thung_dang_gui", so: "2", ten: "Vận chuyển về Kho — Kho tiếp nhận", chu: "kho", sla: 48, giai_trinh: "bo",
    viec: "Kho quét / bấm Xác nhận tiếp nhận thùng",
    tu_pass: ["Admin BH nhận hộ Kho (hàng giao thẳng Admin)", "Thùng Admin BH tạo hộ"],
    loi: ["Hàng chưa về (nhà xe / bưu điện chậm)", "Hàng về nhưng Kho chưa bấm nhận", "Thùng hư hỏng, thiếu hàng (Kho báo sự cố, không chặn)"],
  },
  {
    gd: "thung_cho_admin_nhan", so: "3", ten: "Admin BH tiếp nhận nội bộ", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH bấm Xác nhận đã nhận (hoặc Từ chối thùng)",
    tu_pass: ["Admin BH nhận hộ Kho / tạo hộ thùng"],
    loi: ["Kho chưa bàn giao vật lý cho Admin", "Thùng sai, cần từ chối"],
  },
  {
    gd: "thung_tu_choi", so: "3B", ten: "Thùng bị từ chối — chờ Kho / KTV phản hồi", chu: "kho", sla: 24, giai_trinh: "khong",
    viec: "Kho đồng ý / không đồng ý, sau đó KTV đồng ý / không đồng ý",
    tu_pass: ["KTV không phản hồi trong 7 ngày → hệ thống tự huỷ thùng", "Admin BH rút lại từ chối"],
    loi: ["Kho / KTV chậm phản hồi"],
  },
  {
    gd: "cho_xac_nhan_so_luong", so: "4", ten: "Xác nhận số lượng thực nhận", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH xác nhận SL thực nhận (tách đơn vị)",
    tu_pass: ["Admin BH tạo hộ / nhận hộ Kho → tự xác nhận SL = SL khai", "Đơn dịch vụ khách lẻ"],
    loi: ["SL thực nhận khác SL khai (bắt buộc ghi lý do lệch)"],
  },
  {
    gd: "cho_phan_loai", so: "5", ten: "Phân loại & chọn hướng xử lý", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH phân loại Trong / Ngoài BH, chọn hướng xử lý, đối trừ",
    tu_pass: ["Nút xử lý nhanh (FAST) — 1 chạm, Đổi mới / Trừ nợ đi thẳng tới bước 8"],
    loi: ["Hết hạn bảo hành (cảnh báo, không chặn)", "Ngoài BH thiếu mail phê duyệt (bị chặn)", "KTV khai sai linh kiện / thông tin"],
  },
  {
    gd: "admin_can_xem_lai", so: "5", ten: "Phân loại lại (NV trả về)", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH phân loại lại", tu_pass: [], loi: ["NV không sửa được theo hướng đã chọn"],
  },
  {
    gd: "cho_bo_sung_tt", so: "5B", ten: "KTV bổ sung thông tin", chu: "ktv", sla: 24, giai_trinh: "ktv",
    viec: "KTV (hoặc GS thay) bổ sung linh kiện / mô tả / ảnh theo yêu cầu",
    tu_pass: ["Giám sát / người tạo hộ bổ sung thay KTV"],
    loi: ["KTV khai sai mã linh kiện", "Thiếu ảnh, mô tả lỗi không rõ"],
  },
  {
    gd: "cho_chan_doan", so: "6", ten: "NV sửa chữa (6B: xin cấp linh kiện song song)", chu: "nv", sla: 48, giai_trinh: "bo",
    viec: "NV sửa / chẩn đoán và nộp 1 trong 4 kết quả",
    tu_pass: ["Đã sửa xong → tự hoàn tất + phiếu trả đi thẳng Kho (bỏ bước 7, 8, 9)", "Đã bàn giao máy → kết thúc luôn"],
    loi: ["Thiếu linh kiện (tự tạo ticket thiếu hàng bên Đặt mua LK)", "Sửa chậm", "Không sửa được → Admin xem lại"],
  },
  {
    gd: "cho_admin_xac_nhan", so: "7", ten: "Admin BH xác nhận hoàn tất", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH xác nhận hoàn tất hoặc yêu cầu làm lại",
    tu_pass: ["NV nộp 'Đã sửa xong' (bỏ qua bước này)"],
    loi: ["Kết quả NV chưa đạt → yêu cầu làm lại"],
  },
  {
    gd: "san_sang_gom_phieu_tra", so: "8", ten: "Lập phiếu trả", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH tạo / gộp phiếu trả theo KTV",
    tu_pass: ["Tự động gộp tất cả", "Trả trực tiếp KTV / giao trực tiếp Kho (bỏ bước 9)"],
    loi: ["Đơn chờ gom lâu"],
  },
  {
    gd: "tra_nhap", so: "8", ten: "Phiếu trả nháp — gửi Kế toán", chu: "admin", sla: 24, giai_trinh: "bo",
    viec: "Admin BH kiểm tra phiếu, gửi Kế toán duyệt", tu_pass: [],
    loi: ["Kế toán / Kho đẩy ngược phiếu"],
  },
  {
    gd: "tra_cho_ke_toan_duyet", so: "9", ten: "Kế toán duyệt phiếu trả", chu: "ketoan", sla: 24, giai_trinh: "bo",
    viec: "Kế toán duyệt / từ chối / trừ công nợ",
    tu_pass: ["Kế toán Trừ công nợ → kết thúc không gửi KTV"],
    loi: ["Sai mã MISA / đối trừ → từ chối, trả Admin"],
  },
  {
    gd: "tra_da_duyet_ke_toan", so: "10", ten: "Kho in phiếu, đóng gói & gửi trả", chu: "kho", sla: 24, giai_trinh: "bo",
    viec: "Kho in phiếu, đóng gói, bấm Gửi hàng", tu_pass: [],
    loi: ["Thiếu hàng để đóng gói", "Kho đẩy ngược phiếu lên nhầm"],
  },
  {
    gd: "tra_da_gui", so: "11", ten: "KTV nhận hàng trả", chu: "ktv", sla: 72, giai_trinh: "ktv",
    viec: "KTV xác nhận đã nhận hoặc báo không nhận được (theo từng món)",
    tu_pass: ["Kho xác nhận kết thúc thay KTV (đã biết hàng tới nơi)"],
    loi: ["KTV quên xác nhận", "Thiếu món → báo không nhận được"],
  },
  {
    gd: "tra_khieu_nai_van_chuyen", so: "11B", ten: "Kho đánh giá khiếu nại không nhận được", chu: "kho", sla: 24, giai_trinh: "bo",
    viec: "Kho đánh giá gửi thành công / thất bại (thất lạc)", tu_pass: [], loi: ["Thất lạc trên đường trả"],
  },
  { gd: "tra_ktv_da_nhan", so: "✓", ten: "Hoàn tất", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
  { gd: "tra_ket_thuc_khong_gui", so: "✓", ten: "Kết thúc không gửi (trừ công nợ)", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
  { gd: "tra_gui_that_bai", so: "✓", ten: "Gửi thất bại (thất lạc)", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
  { gd: "ket_thuc_tu_choi", so: "✓", ten: "Từ chối / huỷ bảo hành", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
  { gd: "ket_thuc_chuyen_kho", so: "✓", ten: "Chuyển kho", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
  { gd: "thung_da_huy", so: "✓", ten: "Thùng bị huỷ", chu: "he_thong", sla: 0, giai_trinh: "khong", viec: "", tu_pass: [], loi: [], ket_thuc: true },
];
export const BUOC_MAP: Record<string, BuocDef> = Object.fromEntries(BUOC.map((b) => [b.gd, b]));
/** Cac buoc dang dung (con viec phai lam) - co SLA. */
export const BUOC_DUNG = BUOC.filter((b) => !b.ket_thuc).map((b) => b.gd);
export const BUOC_KTV = BUOC.filter((b) => b.giai_trinh === "ktv").map((b) => b.gd);

export const LEN_GS_MAC_DINH = 24;
const KEY = "buoc_sla";

export interface BuocCauHinh {
  sla: Record<string, number>;
  len_gs: number;
}

let cache: { at: number; v: BuocCauHinh } | null = null;
export function xoaCacheBuoc() {
  cache = null;
}

export async function cauHinhBuoc(db: D1Database): Promise<BuocCauHinh> {
  if (cache && Date.now() - cache.at < 60_000) return cache.v;
  const row = await db.prepare("SELECT value FROM sync_state WHERE key = ?").bind(KEY).first<{ value: string }>().catch(() => null);
  let ghi: Partial<BuocCauHinh> = {};
  try {
    ghi = row?.value ? JSON.parse(row.value) : {};
  } catch {
    ghi = {};
  }
  const sla: Record<string, number> = {};
  for (const b of BUOC) {
    const g = ghi.sla?.[b.gd];
    sla[b.gd] = typeof g === "number" && g > 0 && g <= 720 ? g : b.sla;
  }
  const len_gs = typeof ghi.len_gs === "number" && ghi.len_gs >= 0 && ghi.len_gs <= 720 ? ghi.len_gs : LEN_GS_MAC_DINH;
  const v = { sla, len_gs };
  cache = { at: Date.now(), v };
  return v;
}

export async function luuCauHinhBuoc(db: D1Database, v: BuocCauHinh): Promise<void> {
  await db
    .prepare("INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(KEY, JSON.stringify(v), nowVN())
    .run();
  xoaCacheBuoc();
}

/** Cong ly do cham theo SLA cua buoc (thay cho moc co dinh 24h). */
export async function quaHanBuoc(db: D1Database, gd: string, since: string | null | undefined): Promise<boolean> {
  const ch = await cauHinhBuoc(db);
  const sla = ch.sla[gd] ?? 24;
  return hoursSince(since) > sla;
}

/** Dieu kien SQL "dang qua SLA cua buoc" tren cot giai_doan + moc. extraGio: cong them (VD len GS). */
export function sqlQuaHan(ch: BuocCauHinh, gdExpr: string, sinceExpr: string, gds: readonly string[] = BUOC_DUNG, extraGio = 0): { sql: string; binds: unknown[] } {
  const parts: string[] = [];
  const binds: unknown[] = [];
  for (const gd of gds) {
    const sla = ch.sla[gd];
    if (!sla) continue;
    parts.push(`(${gdExpr} = ? AND ${sinceExpr} < ?)`);
    binds.push(gd, slaCutoffVn(sla + extraGio));
  }
  return { sql: parts.length ? `(${parts.join(" OR ")})` : "0", binds };
}

/** Giai doan tuong ung trang thai cu ("tu_trang_thai" cua nhat ky) - dung khi ghi giai trinh tu cong ly do cham. */
export function gdTuTrangThai(entityType: string, tt: string | null): string | null {
  if (!tt) return null;
  if (entityType === "phieu_gui") return tt === "nhap" ? "thung_nhap" : tt === "da_gui" ? "thung_dang_gui" : tt === "da_tiep_nhan" ? "thung_cho_admin_nhan" : null;
  if (entityType === "phieu_tra") return "tra_" + tt;
  if (entityType === "phieu_sc") return tt === "cho_xac_nhan_so_luong" ? "cho_xac_nhan_so_luong" : null;
  return BUOC_MAP[tt] ? tt : null;
}
