import { parseVn, slaHoursBetween } from "./sla";

// Bao cao ket qua lam viec cua tung vai tro BO theo thang (13/11/2026, yeu cau "báo cáo tổng quát về kết
// quả làm việc của từng vai trò BO theo tháng (SL ca đã xử lý, thời gian xử lý trung bình, ca nhanh nhất,
// ca lâu nhất, tỷ lệ xử lý trong SLA)").
//
// 1 "ca" = 1 lan 1 nguoi lam xong 1 viec cua vai tro minh (VD Kho tiep nhan 1 thung, Admin phan loai 1 don
// vi, NV nop ket qua 1 don vi, Ke toan duyet 1 phieu tra). Thoi gian xu ly = tu luc viec "sang tay" vai tro
// do (vao trang thai cho) toi luc nguoi do bam xong, tinh bang gio SLA (bo Chu nhat, lib/sla.ts). Tinh vao
// thang cua LUC LAM XONG. Trong SLA = <= 24 gio SLA. Nguoi lam = nguoi_thuc_hien cua nhat ky (lam ho van
// tinh cho nguoi bam). Bo dong cua "He thong" va dong nhap tu AppSheet (khong phai thao tac that).

export type VaiTroBo = "kho" | "admin" | "nv" | "ketoan";
export const VAI_TRO_BO_LABEL: Record<VaiTroBo, string> = {
  kho: "Kho",
  admin: "Admin bảo hành",
  nv: "NV sửa chữa",
  ketoan: "Kế toán",
};

interface TaskDef {
  key: string;
  vai_tro: VaiTroBo;
  label: string;
  don_vi: string;
}

export const TASKS: TaskDef[] = [
  {
    key: "kho_tiep_nhan",
    vai_tro: "kho",
    label: "Tiếp nhận thùng KTV gửi",
    don_vi: "thùng",
  },
  {
    key: "kho_gui_tra",
    vai_tro: "kho",
    label: "Gửi trả phiếu đã duyệt",
    don_vi: "phiếu",
  },
  {
    key: "kho_khieu_nai",
    vai_tro: "kho",
    label: "Đánh giá KTV báo không nhận hàng",
    don_vi: "phiếu",
  },
  {
    key: "kho_xuat_lk",
    vai_tro: "kho",
    label: "Xuất phiếu cấp linh kiện",
    don_vi: "phiếu",
  },
  {
    key: "ad_noi_bo",
    vai_tro: "admin",
    label: "Tiếp nhận thùng nội bộ từ Kho",
    don_vi: "thùng",
  },
  {
    key: "ad_xac_nhan_sl",
    vai_tro: "admin",
    label: "Xác nhận số lượng",
    don_vi: "đơn",
  },
  {
    key: "ad_phan_loai",
    vai_tro: "admin",
    label: "Phân loại đơn",
    don_vi: "đơn",
  },
  {
    key: "ad_hoan_tat",
    vai_tro: "admin",
    label: "Xác nhận hoàn tất",
    don_vi: "đơn",
  },
  {
    key: "ad_cap_lk",
    vai_tro: "admin",
    label: "Duyệt đề xuất linh kiện",
    don_vi: "phiếu",
  },
  {
    key: "ad_gui_kt",
    vai_tro: "admin",
    label: "Lập phiếu trả, gửi Kế toán",
    don_vi: "phiếu",
  },
  {
    key: "nv_sua",
    vai_tro: "nv",
    label: "Sửa chữa / nộp kết quả",
    don_vi: "đơn",
  },
  {
    key: "kt_duyet",
    vai_tro: "ketoan",
    label: "Duyệt phiếu trả",
    don_vi: "phiếu",
  },
  {
    key: "kt_cap_lk",
    vai_tro: "ketoan",
    label: "Xác nhận cấp linh kiện",
    don_vi: "phiếu",
  },
];
const TASK_BY_KEY = new Map(TASKS.map((t) => [t.key, t]));

// Viec doc tu nhat ky chuyen trang thai: (entity, trang thai roi khoi) -> viec, chi tinh khi chuyen sang 1 trong `den`.
const LOG_TASKS: Record<string, { task: string; den: string[] }> = {
  "phieu_gui:da_gui": { task: "kho_tiep_nhan", den: ["da_tiep_nhan"] },
  "phieu_sc_ct:cho_phan_loai": { task: "ad_phan_loai", den: ["*"] },
  "phieu_sc_ct:admin_can_xem_lai": { task: "ad_phan_loai", den: ["*"] },
  "phieu_sc_ct:cho_admin_xac_nhan": {
    task: "ad_hoan_tat",
    den: ["san_sang_gom_phieu_tra", "cho_chan_doan"],
  },
  "phieu_sc_ct:cho_chan_doan": {
    task: "nv_sua",
    den: ["cho_admin_xac_nhan", "san_sang_gom_phieu_tra"],
  },
  "phieu_tra:nhap": { task: "ad_gui_kt", den: ["cho_ke_toan_duyet"] },
  "phieu_tra:cho_ke_toan_duyet": {
    task: "kt_duyet",
    den: ["da_duyet_ke_toan", "nhap", "ket_thuc_khong_gui"],
  },
  "phieu_tra:da_duyet_ke_toan": { task: "kho_gui_tra", den: ["da_gui"] },
  "phieu_tra:khieu_nai_van_chuyen": { task: "kho_khieu_nai", den: ["*"] },
};

interface Ca {
  task: string;
  nguoi: string;
  gio: number;
  id: string;
  appsheet: boolean; // viec bat dau cho tu du lieu nhap AppSheet -> chi dem, khong tinh thoi gian
}

export interface ThongKe {
  so_ca: number;
  tb_gio: number | null;
  nhanh_gio: number | null;
  nhanh_id: string | null;
  lau_gio: number | null;
  lau_id: string | null;
  trong_sla: number;
  ty_le_sla: number | null; // %
  ca_appsheet: number; // ca bat dau cho tu du lieu AppSheet (ngay goc), khong tinh vao thoi gian / SLA
}

export interface DongNguoi extends ThongKe {
  nguoi: string;
  cong_viec: (ThongKe & { task: string; label: string; don_vi: string })[];
}

export interface NhomVaiTro {
  vai_tro: VaiTroBo;
  label: string;
  tong: ThongKe;
  nguoi: DongNguoi[];
}

function thongKe(all: Ca[]): ThongKe {
  const ca_appsheet = all.filter((c) => c.appsheet).length;
  const list = all.filter((c) => !c.appsheet);
  if (!list.length)
    return {
      so_ca: 0,
      tb_gio: null,
      nhanh_gio: null,
      nhanh_id: null,
      lau_gio: null,
      lau_id: null,
      trong_sla: 0,
      ty_le_sla: null,
      ca_appsheet,
    };
  let sum = 0;
  let min = list[0];
  let max = list[0];
  let sla = 0;
  for (const c of list) {
    sum += c.gio;
    if (c.gio < min.gio) min = c;
    if (c.gio > max.gio) max = c;
    if (c.gio <= 24) sla++;
  }
  const r = (x: number) => Math.round(x * 10) / 10;
  return {
    so_ca: list.length,
    tb_gio: r(sum / list.length),
    nhanh_gio: r(min.gio),
    nhanh_id: min.id,
    lau_gio: r(max.gio),
    lau_id: max.id,
    trong_sla: sla,
    ty_le_sla: Math.round((sla / list.length) * 1000) / 10,
    ca_appsheet,
  };
}

const HE_THONG = new Set(["hệ thống", "he thong", "system", ""]);

// thang: "YYYY-MM". Tra ve [dau thang, dau thang sau) dang chuoi gio VN.
export function thangRange(thang: string): { tu: string; den: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(thang);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const ny = mo === 12 ? y + 1 : y;
  const nm = mo === 12 ? 1 : mo + 1;
  return {
    tu: `${y}-${pad(mo)}-01 00:00:00`,
    den: `${ny}-${pad(nm)}-01 00:00:00`,
  };
}

function lui(vn: string, days: number): string {
  return new Date(parseVn(vn) - days * 86400_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export async function tinhBaoCaoBo(
  db: D1Database,
  thang: string,
): Promise<{ thang: string; nhom: NhomVaiTro[] } | null> {
  const r = thangRange(thang);
  if (!r) return null;
  const cas: Ca[] = [];
  const add = (
    task: string,
    nguoi: string | null,
    from: string | null,
    to: string | null,
    id: string,
    appsheet = false,
  ) => {
    if (!nguoi || !from || !to || to < r.tu || to >= r.den) return;
    if (HE_THONG.has(nguoi.trim().toLowerCase())) return;
    const a = parseVn(from);
    const b = parseVn(to);
    if (Number.isNaN(a) || Number.isNaN(b) || b < a) return;
    cas.push({
      task,
      nguoi: nguoi.trim(),
      gio: slaHoursBetween(a, b),
      id,
      appsheet,
    });
  };

  // 1) Nhat ky chuyen trang thai: lay tu 60 ngay truoc dau thang (de biet luc vao trang thai cho).
  const tu = lui(r.tu, 60);
  const { results: logs } = await db
    .prepare(
      `SELECT entity_type, entity_id, tu_trang_thai AS tu, den_trang_thai AS den, nguoi_thuc_hien AS nguoi, thoi_gian,
              CASE WHEN ghi_chu LIKE '%AppSheet%' THEN 1 ELSE 0 END AS appsheet
       FROM logs_bh
       WHERE thoi_gian >= ? AND thoi_gian < ? AND entity_type IN ('phieu_gui','phieu_sc_ct','phieu_tra')
         AND (tu_trang_thai IS NULL OR den_trang_thai IS NULL OR tu_trang_thai <> den_trang_thai)
       ORDER BY entity_type, entity_id, thoi_gian, id`,
    )
    .bind(tu, r.den)
    .all<{
      entity_type: string;
      entity_id: string;
      tu: string | null;
      den: string | null;
      nguoi: string;
      thoi_gian: string;
      appsheet: number;
    }>();
  // Don vi khong co dong nhat ky luc tao -> vao "cho_phan_loai" luc created_at.
  const { results: units } = await db
    .prepare(
      `SELECT u.id, u.created_at, CASE WHEN p.ghi_chu LIKE '%AppSheet ID%' THEN 1 ELSE 0 END AS appsheet
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.created_at >= ? AND u.created_at < ?`,
    )
    .bind(tu, r.den)
    .all<{ id: string; created_at: string; appsheet: number }>();
  const unitStart = new Map(units.map((x) => [x.id, x]));
  // 13/11/2026: viec "Sua chua / nop ket qua" tinh cho NV DUOC GIAO (nguoi_sua_chua), ke ca khi Admin BH bam
  // "Nop ket qua ho NV" - nguoi sua that la NV, Admin chi bam thay.
  const { results: nvGiao } = await db
    .prepare(
      "SELECT id, nguoi_sua_chua FROM phieu_sua_chua_bh_ct WHERE nguoi_sua_chua IS NOT NULL AND nguoi_sua_chua <> ''",
    )
    .all<{ id: string; nguoi_sua_chua: string }>();
  const nvCua = new Map(nvGiao.map((x) => [x.id, x.nguoi_sua_chua]));

  let cur = "";
  let state: string | null = null;
  let since: string | null = null;
  let sinceAs = false;
  for (const l of logs) {
    const k = `${l.entity_type}:${l.entity_id}`;
    if (k !== cur) {
      cur = k;
      state = null;
      since = null;
      sinceAs = false;
      const us =
        l.entity_type === "phieu_sc_ct"
          ? unitStart.get(l.entity_id)
          : undefined;
      if (us) {
        state = "cho_phan_loai";
        since = us.created_at;
        sinceAs = us.appsheet === 1;
      }
    }
    if (state && since && l.tu === state && !l.appsheet) {
      const def: { task: string; den: string[] } | undefined =
        LOG_TASKS[`${l.entity_type}:${state}`];
      if (def && l.den && (def.den[0] === "*" || def.den.includes(l.den))) {
        const nguoi =
          def.task === "nv_sua" ? (nvCua.get(l.entity_id) ?? l.nguoi) : l.nguoi;
        add(def.task, nguoi, since, l.thoi_gian, l.entity_id, sinceAs);
      }
    }
    state = l.den;
    since = l.thoi_gian;
    sinceAs = l.appsheet === 1;
  }

  // 2) Admin tiep nhan noi bo: tu luc Kho nhan -> Admin xac nhan da nhan.
  const { results: nb } = await db
    .prepare(
      `SELECT id, admin_nguoi_nhan AS nguoi, thoi_gian_nhan_kho AS a, admin_thoi_gian_nhan AS b,
              CASE WHEN ghi_chu LIKE '%AppSheet%' THEN 1 ELSE 0 END AS appsheet FROM phieu_gui_bh
       WHERE admin_tiep_nhan = 1 AND admin_thoi_gian_nhan >= ? AND admin_thoi_gian_nhan < ?`,
    )
    .bind(r.tu, r.den)
    .all<{
      id: string;
      nguoi: string | null;
      a: string | null;
      b: string | null;
      appsheet: number;
    }>();
  for (const x of nb)
    add("ad_noi_bo", x.nguoi, x.a, x.b, x.id, x.appsheet === 1);

  // 3) Admin xac nhan so luong: tu luc Admin nhan noi bo -> log cho_xac_nhan_so_luong -> da_tach.
  const { results: sl } = await db
    .prepare(
      `SELECT p.id, l.nguoi_thuc_hien AS nguoi, g.admin_thoi_gian_nhan AS a, l.thoi_gian AS b,
              CASE WHEN g.ghi_chu LIKE '%AppSheet%' THEN 1 ELSE 0 END AS appsheet FROM logs_bh l
       JOIN phieu_sua_chua_bh p ON p.id = l.entity_id JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE l.entity_type = 'phieu_sc' AND l.tu_trang_thai = 'cho_xac_nhan_so_luong' AND l.den_trang_thai = 'da_tach'
         AND l.thoi_gian >= ? AND l.thoi_gian < ? AND COALESCE(l.ghi_chu, '') NOT LIKE '%AppSheet%'
         AND COALESCE(l.ghi_chu, '') NOT LIKE '%tự xác nhận%'`,
    )
    .bind(r.tu, r.den)
    .all<{
      id: string;
      nguoi: string;
      a: string | null;
      b: string;
      appsheet: number;
    }>();
  for (const x of sl)
    add("ad_xac_nhan_sl", x.nguoi, x.a, x.b, x.id, x.appsheet === 1);

  // 4) De xuat cap linh kien: Admin duyet / Ke toan xac nhan / Kho xuat.
  const { results: dx } = await db
    .prepare(
      `SELECT id, created_at, trang_thai, nguoi_xu_ly, xu_ly_luc, kt_boi, kt_luc, kho_xuat_boi, kho_xuat_luc FROM de_xuat_linh_kien_bh
       WHERE (xu_ly_luc >= ? AND xu_ly_luc < ?) OR (kt_luc >= ? AND kt_luc < ?) OR (kho_xuat_luc >= ? AND kho_xuat_luc < ?)`,
    )
    .bind(r.tu, r.den, r.tu, r.den, r.tu, r.den)
    .all<{
      id: string;
      created_at: string;
      trang_thai: string;
      nguoi_xu_ly: string | null;
      xu_ly_luc: string | null;
      kt_boi: string | null;
      kt_luc: string | null;
      kho_xuat_boi: string | null;
      kho_xuat_luc: string | null;
    }>();
  for (const x of dx) {
    // Phieu nhap tu AppSheet: da cap nhung khong co buoc Ke toan (kt_luc rong).
    add(
      "ad_cap_lk",
      x.nguoi_xu_ly,
      x.created_at,
      x.xu_ly_luc,
      x.id,
      x.trang_thai === "da_cap" && !x.kt_luc,
    );
    add("kt_cap_lk", x.kt_boi, x.xu_ly_luc, x.kt_luc, x.id);
    add("kho_xuat_lk", x.kho_xuat_boi, x.kt_luc, x.kho_xuat_luc, x.id);
  }

  // 5) 13/11/2026 ("tại sao báo cáo lại không có nv sửa chữa văn khương" -> "Có, hiện thêm"): don vi nhap tu
  // AppSheet ma NV da sua xong ben AppSheet (co ket_qua_nv, khong co lan nop ket qua tren he thong moi) ->
  // dem 1 ca "Từ AppSheet" cho NV duoc giao, tinh vao thang tao don vi (AppSheet khong luu ngay sua xong
  // dang tin duoc). Chi dem, khong tinh thoi gian / SLA.
  const { results: nvAs } = await db
    .prepare(
      `SELECT u.id, u.nguoi_sua_chua AS nguoi, u.created_at FROM phieu_sua_chua_bh_ct u
       JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE p.ghi_chu LIKE '%AppSheet ID%' AND u.nguoi_sua_chua IS NOT NULL AND u.nguoi_sua_chua <> ''
         AND u.ket_qua_nv IS NOT NULL AND u.created_at >= ? AND u.created_at < ?
         AND NOT EXISTS (SELECT 1 FROM logs_bh l WHERE l.entity_type = 'phieu_sc_ct' AND l.entity_id = u.id
           AND l.tu_trang_thai = 'cho_chan_doan' AND COALESCE(l.ghi_chu, '') NOT LIKE '%AppSheet%')`,
    )
    .bind(r.tu, r.den)
    .all<{ id: string; nguoi: string; created_at: string }>();
  for (const x of nvAs)
    add("nv_sua", x.nguoi, x.created_at, x.created_at, x.id, true);

  // Gom theo vai tro -> nguoi -> viec.
  const nhom: NhomVaiTro[] = (Object.keys(VAI_TRO_BO_LABEL) as VaiTroBo[]).map(
    (vt) => {
      const list = cas.filter((c) => TASK_BY_KEY.get(c.task)!.vai_tro === vt);
      const byNguoi = new Map<string, Ca[]>();
      for (const c of list)
        (byNguoi.get(c.nguoi) ?? byNguoi.set(c.nguoi, []).get(c.nguoi)!).push(
          c,
        );
      const nguoi: DongNguoi[] = [...byNguoi.entries()]
        .map(([n, l]) => ({
          nguoi: n,
          ...thongKe(l),
          cong_viec: TASKS.filter((t) => t.vai_tro === vt)
            .map((t) => ({
              task: t.key,
              label: t.label,
              don_vi: t.don_vi,
              ...thongKe(l.filter((c) => c.task === t.key)),
            }))
            .filter((t) => t.so_ca + t.ca_appsheet > 0),
        }))
        .filter((p) => p.so_ca + p.ca_appsheet > 0)
        .sort((a, b) => b.so_ca - a.so_ca || b.ca_appsheet - a.ca_appsheet);
      return {
        vai_tro: vt,
        label: VAI_TRO_BO_LABEL[vt],
        tong: thongKe(list),
        nguoi,
      };
    },
  );
  return { thang, nhom };
}
