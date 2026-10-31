import type { AppUser } from "../types";
import { hoursSince, parseVn, slaHoursBetween } from "./sla";
import { mienScope } from "./mien";
import { viewKhuVucEmailInSql } from "./scope";
import { nowVN } from "./vnTime";

// Canh bao don ton theo tung vai tro + thoi gian xu ly trung binh tung giai doan (12/10/2026, yeu cau
// "cần bổ sung thêm các cảnh báo riêng về đơn tồn với mỗi vai trò, ví dụ kho đang tồn bao nhiêu đơn chưa
// nhận từ KTV, bao nhiêu đơn admin sửa chữa chưa tiếp nhận, quá hạn bao nhiêu lâu, cảnh báo nguy hiêm,
// hiện thị thời gian xử lý trung bình cho từng giao đoạn, từng vai trò").
//
// Muc canh bao dung DUNG 3 nguong cua badge SLA: <=24h binh thuong, >24h qua han, >72h nguy hiem (gio SLA
// bo Chu nhat - lib/sla.ts). Thoi gian trung binh tinh tu nhat ky chuyen trang thai 30 ngay gan nhat,
// tinh lai toi da 1 lan/gio (cron 15 phut) va luu sync_state.giai_doan_tb - man hinh chi doc 1 dong.

export type VaiTro = "ktv" | "kho" | "admin" | "nv" | "ketoan";

interface StageDef {
  key: string;
  label: string;
  vai_tro: VaiTro[];
  don_vi: "thùng" | "đơn" | "phiếu";
  from: string; // FROM ... WHERE dieu kien hang doi (chua gom pham vi)
  since: string; // bieu thuc moc bat dau cho
  ktvCol: string; // email KTV cua dong (pham vi GS / View)
  mienAlias: string;
  own?: { vai_tro: VaiTro; col: string }; // "cua toi": KTV / NV chi thay viec cua chinh minh
  hash: Partial<Record<VaiTro | "theo_doi", string>>;
}

const U_FROM = `phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id`;

export const STAGES: StageDef[] = [
  {
    key: "ktv_nhap",
    label: "Thùng nháp đã có đơn nhưng chưa gửi",
    vai_tro: ["ktv"],
    don_vi: "thùng",
    from: `phieu_gui_bh g WHERE g.trang_thai = 'nhap' AND EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = g.id)`,
    since: "g.created_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "g",
    own: { vai_tro: "ktv", col: "g.nguoi_tao" },
    hash: { ktv: "/ktv/tao-phieu" },
  },
  {
    key: "kho_tiep_nhan",
    label: "Thùng KTV đã gửi, Kho chưa nhận",
    vai_tro: ["kho"],
    don_vi: "thùng",
    from: `phieu_gui_bh g WHERE g.trang_thai = 'da_gui'`,
    since: `COALESCE((SELECT MAX(l.thoi_gian) FROM logs_bh l WHERE l.entity_type = 'phieu_gui' AND l.entity_id = g.id AND l.den_trang_thai = 'da_gui'), g.updated_at)`,
    ktvCol: "g.nguoi_tao",
    mienAlias: "g",
    hash: { kho: "/thung?tab=dang_gui", theo_doi: "/don?tab=tat_ca" },
  },
  {
    key: "ban_giao",
    label: "Kho đã nhận, Admin bảo hành chưa tiếp nhận",
    vai_tro: ["kho", "admin"],
    don_vi: "thùng",
    from: `phieu_gui_bh g WHERE g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0`,
    since: "COALESCE(g.thoi_gian_nhan_kho, g.updated_at)",
    ktvCol: "g.nguoi_tao",
    mienAlias: "g",
    hash: { admin: "/thung?tab=cho_admin", kho: "/thung?tab=cho_admin" },
  },
  {
    key: "xac_nhan_sl",
    label: "Đơn chờ Admin xác nhận số lượng",
    vai_tro: ["admin"],
    don_vi: "đơn",
    from: `phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.trang_thai_cha = 'cho_xac_nhan_so_luong' AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`,
    since: "COALESCE(g.admin_thoi_gian_nhan, p.created_at)",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    hash: { admin: "/don?tab=xu_ly" },
  },
  {
    key: "phan_loai",
    label: "Đơn chờ Admin phân loại",
    vai_tro: ["admin"],
    don_vi: "đơn",
    from: `${U_FROM} WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai') AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`,
    since: "u.updated_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    hash: { admin: "/don?tab=xu_ly" },
  },
  {
    key: "bo_sung",
    label: "Đơn chờ KTV bổ sung thông tin",
    vai_tro: ["ktv", "admin"],
    don_vi: "đơn",
    from: `${U_FROM} WHERE u.trang_thai = 'cho_bo_sung_tt'`,
    since: "u.updated_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    own: { vai_tro: "ktv", col: "g.nguoi_tao" },
    hash: { ktv: "/ktv/tra-cuu", admin: "/don?tab=xu_ly" },
  },
  {
    key: "chan_doan",
    label: "Đơn chờ NV sửa chữa chẩn đoán",
    vai_tro: ["nv", "admin"],
    don_vi: "đơn",
    from: `${U_FROM} WHERE u.trang_thai = 'cho_chan_doan'`,
    since: "u.updated_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    own: { vai_tro: "nv", col: "u.nguoi_sua_chua" },
    hash: { nv: "/don?tab=nv" },
  },
  {
    // 12/10/2026: NV de xuat cap linh kien, Admin BH chua len MISA xuat kho.
    key: "de_xuat_lk",
    label: "Đề xuất linh kiện NV chờ Admin cấp",
    vai_tro: ["admin", "nv"],
    don_vi: "phiếu",
    from: `de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE d.trang_thai = 'cho_cap'`,
    since: "d.created_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    own: { vai_tro: "nv", col: "d.nguoi_de_xuat" },
    hash: { admin: "/admin/de-xuat", nv: "/don?tab=nv" },
  },
  {
    key: "xac_nhan_ht",
    label: "Đơn chờ Admin xác nhận hoàn tất",
    vai_tro: ["admin"],
    don_vi: "đơn",
    from: `${U_FROM} WHERE u.trang_thai = 'cho_admin_xac_nhan'`,
    since: "u.updated_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    hash: { admin: "/don?tab=hoan_tat" },
  },
  {
    key: "gom_phieu_tra",
    label: "Đơn xong, chưa gộp phiếu trả",
    vai_tro: ["admin"],
    don_vi: "đơn",
    from: `${U_FROM} WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL`,
    since: "u.updated_at",
    ktvCol: "g.nguoi_tao",
    mienAlias: "p",
    hash: { admin: "/phieu-tra?tab=cho_tao" },
  },
  {
    key: "phieu_tra_nhap",
    label: "Phiếu trả nháp chưa gửi duyệt",
    vai_tro: ["admin"],
    don_vi: "phiếu",
    from: `phieu_tra_bh t WHERE t.trang_thai = 'nhap'`,
    since: "t.created_at",
    ktvCol: "t.ktv_nhan",
    mienAlias: "t",
    hash: { admin: "/phieu-tra?tab=nhap" },
  },
  {
    key: "ke_toan",
    label: "Phiếu trả chờ Kế toán duyệt",
    vai_tro: ["ketoan"],
    don_vi: "phiếu",
    from: `phieu_tra_bh t WHERE t.trang_thai = 'cho_ke_toan_duyet'`,
    since: "t.updated_at",
    ktvCol: "t.ktv_nhan",
    mienAlias: "t",
    hash: { ketoan: "/phieu-tra?tab=cho_kt" },
  },
  {
    key: "kho_dong_goi",
    label: "Phiếu đã duyệt, Kho chưa gửi trả",
    vai_tro: ["kho"],
    don_vi: "phiếu",
    from: `phieu_tra_bh t WHERE t.trang_thai = 'da_duyet_ke_toan'`,
    since: "t.updated_at",
    ktvCol: "t.ktv_nhan",
    mienAlias: "t",
    hash: { kho: "/phieu-tra?tab=cho_kho" },
  },
  {
    key: "ktv_nhan",
    label: "Hàng trả đã gửi, KTV chưa xác nhận nhận",
    vai_tro: ["ktv", "kho"],
    don_vi: "phiếu",
    from: `phieu_tra_bh t WHERE t.trang_thai = 'da_gui'`,
    since: "t.updated_at",
    ktvCol: "t.ktv_nhan",
    mienAlias: "t",
    own: { vai_tro: "ktv", col: "t.ktv_nhan" },
    hash: { ktv: "/ktv/nhan-hang", kho: "/phieu-tra?tab=dang_gui" },
  },
  {
    // 12/10/2026: KTV bao khong nhan duoc hang, Kho chua danh gia gui thanh cong / that bai.
    key: "kho_khieu_nai",
    label: "KTV báo không nhận được hàng, Kho chưa đánh giá",
    vai_tro: ["kho"],
    don_vi: "phiếu",
    from: `phieu_tra_bh t WHERE t.trang_thai = 'khieu_nai_van_chuyen'`,
    since: "t.updated_at",
    ktvCol: "t.ktv_nhan",
    mienAlias: "t",
    hash: { kho: "/phieu-tra?tab=khieu_nai" },
  },
];

export const VAI_TRO_LABEL: Record<VaiTro, string> = { ktv: "Kỹ thuật viên", kho: "Kho", admin: "Admin bảo hành", nv: "NV sửa chữa", ketoan: "Kế toán" };

function hasRole(u: AppUser, r: VaiTro): boolean {
  if (r === "ktv") return u.la_ktv_dvbh || u.la_ve_tinh;
  if (r === "kho") return u.la_kho;
  if (r === "admin") return u.la_admin_bh;
  if (r === "nv") return u.la_nv_sua_chua;
  return u.la_ke_toan;
}

type Mode = { kind: "all" | "mien" | "gs" | "view" | "own"; vai_tro: VaiTro | "theo_doi"; col?: string };

// Chon pham vi xem cho 1 giai doan: qtri thay toan he thong; dung vai tro thi KTV/NV thay viec cua chinh
// minh, Kho/Admin/Ke toan thay theo mien; Giam sat / View (khong co vai tro do) thay theo khu vuc.
function modeFor(u: AppUser, s: StageDef): Mode | null {
  if (u.la_qtri) return { kind: "all", vai_tro: s.vai_tro[0] };
  for (const r of s.vai_tro) {
    if (!hasRole(u, r)) continue;
    if (s.own && s.own.vai_tro === r) return { kind: "own", vai_tro: r, col: s.own.col };
    if (r === "kho" || r === "admin" || r === "ketoan") return { kind: "mien", vai_tro: r };
  }
  if (u.la_giam_sat) return { kind: "gs", vai_tro: "theo_doi" };
  if (u.la_view) return { kind: "view", vai_tro: "theo_doi" };
  return null;
}

function scopeSql(u: AppUser, s: StageDef, m: Mode): { sql: string; binds: string[] } {
  if (m.kind === "own") return { sql: ` AND ${m.col} = ?`, binds: [u.email] };
  if (m.kind === "mien") return mienScope(u, s.mienAlias);
  if (m.kind === "gs")
    return {
      sql: ` AND ${s.ktvCol} IN (SELECT k.email_dang_nhap FROM ktv_lien_he_bh k JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma WHERE kv.gs_email = ?)`,
      binds: [u.email],
    };
  if (m.kind === "view") return { sql: ` AND ${s.ktvCol} IN ${viewKhuVucEmailInSql()}`, binds: [u.email] };
  return { sql: "", binds: [] };
}

export interface CanhBaoRow {
  key: string;
  label: string;
  vai_tro: VaiTro | "theo_doi";
  vai_tro_label: string;
  don_vi: string;
  pham_vi: string;
  so_luong: number;
  qua_han: number; // > 24h SLA
  nguy_hiem: number; // > 72h SLA
  lau_nhat_gio: number;
  muc: "ok" | "qua_han" | "nguy_hiem";
  hash: string | null;
  tb_gio: number | null;
  tb_mau: number;
}

const PHAM_VI_LABEL: Record<Mode["kind"], string> = { all: "Toàn hệ thống", mien: "Theo miền", gs: "Khu vực phụ trách", view: "Khu vực được xem", own: "Của tôi" };

export async function tinhCanhBao(db: D1Database, u: AppUser): Promise<{ rows: CanhBaoRow[]; tb_cap_nhat: string | null }> {
  const tb = await docGiaiDoanTb(db);
  const out = await Promise.all(
    STAGES.map(async (s): Promise<CanhBaoRow | null> => {
      const m = modeFor(u, s);
      if (!m) return null;
      const sc = scopeSql(u, s, m);
      const { results } = await db.prepare(`SELECT ${s.since} AS since FROM ${s.from}${sc.sql}`).bind(...sc.binds).all<{ since: string | null }>();
      let qua = 0;
      let nguy = 0;
      let max = 0;
      for (const r of results) {
        const h = hoursSince(r.since);
        if (h > 24) qua++;
        if (h > 72) nguy++;
        if (h > max) max = h;
      }
      const t = tb.data[s.key];
      const vt = m.vai_tro;
      return {
        key: s.key,
        label: s.label,
        vai_tro: vt,
        vai_tro_label: vt === "theo_doi" ? "Theo dõi" : VAI_TRO_LABEL[vt],
        don_vi: s.don_vi,
        pham_vi: PHAM_VI_LABEL[m.kind],
        so_luong: results.length,
        qua_han: qua,
        nguy_hiem: nguy,
        lau_nhat_gio: Math.round(max * 10) / 10,
        muc: nguy > 0 ? "nguy_hiem" : qua > 0 ? "qua_han" : "ok",
        hash: s.hash[vt] ?? (u.la_qtri ? (Object.values(s.hash)[0] ?? null) : null),
        tb_gio: t ? t.tb : null,
        tb_mau: t ? t.n : 0,
      };
    }),
  );
  return { rows: out.filter((x): x is CanhBaoRow => !!x), tb_cap_nhat: tb.updated_at };
}

// ---------- Thoi gian xu ly trung binh tung giai doan (30 ngay) ----------

const TB_KEY = "giai_doan_tb";
const NGAY = 24 * 3600_000;

async function docGiaiDoanTb(db: D1Database): Promise<{ data: Record<string, { tb: number; n: number }>; updated_at: string | null }> {
  const row = await db.prepare("SELECT value, updated_at FROM sync_state WHERE key = ?").bind(TB_KEY).first<{ value: string; updated_at: string }>();
  if (!row) return { data: {}, updated_at: null };
  try {
    return { data: JSON.parse(row.value), updated_at: row.updated_at };
  } catch {
    return { data: {}, updated_at: row.updated_at };
  }
}

// Giai doan dua tren trang thai (entity_type, trang thai) -> key giai doan.
const STATE_STAGE: Record<string, string> = {
  "phieu_gui:nhap": "ktv_nhap",
  "phieu_gui:da_gui": "kho_tiep_nhan",
  "phieu_sc_ct:cho_phan_loai": "phan_loai",
  "phieu_sc_ct:admin_can_xem_lai": "phan_loai",
  "phieu_sc_ct:cho_bo_sung_tt": "bo_sung",
  "phieu_sc_ct:cho_chan_doan": "chan_doan",
  "phieu_sc_ct:cho_admin_xac_nhan": "xac_nhan_ht",
  "phieu_tra:nhap": "phieu_tra_nhap",
  "phieu_tra:cho_ke_toan_duyet": "ke_toan",
  "phieu_tra:da_duyet_ke_toan": "kho_dong_goi",
  "phieu_tra:da_gui": "ktv_nhan",
};

function vnCutoff(days: number): string {
  return new Date(Date.now() + 7 * 3600_000 - days * NGAY).toISOString().slice(0, 19).replace("T", " ");
}

export async function computeGiaiDoanTb(db: D1Database): Promise<Record<string, { tb: number; n: number }>> {
  const cut30 = vnCutoff(30);
  const cut60 = vnCutoff(60);
  const acc: Record<string, { sum: number; n: number }> = {};
  const add = (key: string, from: string | null, to: string | null) => {
    if (!from || !to || to < cut30) return;
    const a = parseVn(from);
    const b = parseVn(to);
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return;
    const h = slaHoursBetween(a, b);
    (acc[key] ??= { sum: 0, n: 0 }).sum += h;
    acc[key].n++;
  };

  // 1) Nhat ky chuyen trang thai (bo dong ghi chu / ly do cham co tu = den).
  const { results: logs } = await db
    .prepare(
      `SELECT entity_type, entity_id, tu_trang_thai AS tu, den_trang_thai AS den, thoi_gian FROM logs_bh
       WHERE thoi_gian >= ? AND entity_type IN ('phieu_gui','phieu_sc_ct','phieu_tra')
         AND (tu_trang_thai IS NULL OR den_trang_thai IS NULL OR tu_trang_thai <> den_trang_thai)
       ORDER BY entity_type, entity_id, thoi_gian, id`,
    )
    .bind(cut60)
    .all<{ entity_type: string; entity_id: string; tu: string | null; den: string | null; thoi_gian: string }>();
  // Don vi khong co dong nhat ky luc tao -> moc vao "cho_phan_loai" = created_at.
  const { results: units } = await db
    .prepare("SELECT id, created_at FROM phieu_sua_chua_bh_ct WHERE created_at >= ?")
    .bind(cut60)
    .all<{ id: string; created_at: string }>();
  const unitStart = new Map(units.map((x) => [x.id, x.created_at]));

  let curKey = "";
  let state: string | null = null;
  let since: string | null = null;
  for (const l of logs) {
    const k = `${l.entity_type}:${l.entity_id}`;
    if (k !== curKey) {
      curKey = k;
      state = null;
      since = null;
      if (l.entity_type === "phieu_sc_ct" && unitStart.has(l.entity_id)) {
        state = "cho_phan_loai";
        since = unitStart.get(l.entity_id)!;
      }
    }
    if (state && since && l.tu === state) {
      const st = STATE_STAGE[`${l.entity_type}:${state}`];
      if (st) add(st, since, l.thoi_gian);
    }
    state = l.den;
    since = l.thoi_gian;
  }

  // 2) Kho -> Admin ban giao noi bo (khong phai chuyen trang thai, doc thang 2 cot moc).
  const { results: bg } = await db
    .prepare("SELECT thoi_gian_nhan_kho AS a, admin_thoi_gian_nhan AS b FROM phieu_gui_bh WHERE admin_tiep_nhan = 1 AND admin_thoi_gian_nhan >= ?")
    .bind(cut30)
    .all<{ a: string | null; b: string | null }>();
  for (const r of bg) add("ban_giao", r.a, r.b);

  // 3) Admin nhan noi bo -> xac nhan so luong (log phieu_sc cho_xac_nhan_so_luong -> da_tach).
  const { results: sl } = await db
    .prepare(
      `SELECT g.admin_thoi_gian_nhan AS a, l.thoi_gian AS b FROM logs_bh l
       JOIN phieu_sua_chua_bh p ON p.id = l.entity_id JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE l.entity_type = 'phieu_sc' AND l.tu_trang_thai = 'cho_xac_nhan_so_luong' AND l.den_trang_thai = 'da_tach' AND l.thoi_gian >= ?`,
    )
    .bind(cut30)
    .all<{ a: string | null; b: string | null }>();
  for (const r of sl) add("xac_nhan_sl", r.a, r.b);

  const out: Record<string, { tb: number; n: number }> = {};
  for (const [k, v] of Object.entries(acc)) out[k] = { tb: Math.round((v.sum / v.n) * 10) / 10, n: v.n };
  await db
    .prepare("INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(TB_KEY, JSON.stringify(out), nowVN())
    .run();
  return out;
}

// Cron 15 phut: tinh lai toi da 1 lan / gio.
export async function maybeComputeGiaiDoanTb(db: D1Database): Promise<void> {
  const row = await db.prepare("SELECT updated_at FROM sync_state WHERE key = ?").bind(TB_KEY).first<{ updated_at: string }>();
  if (row?.updated_at && Date.now() + 7 * 3600_000 - parseVn(row.updated_at) < 3600_000) return;
  await computeGiaiDoanTb(db);
}
