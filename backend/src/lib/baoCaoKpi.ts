import { parseVn, slaHoursBetween } from "./sla";
import { thangRange } from "./baoCaoBo";
import { nowVN } from "./vnTime";

// 25/11/2026 - BC KPIs theo thang (yeu cau: "đây là báo cáo kpis tháng 10 của tôi cho nhân viên ... xây dựng trên app
// mục BC KPIs cho phép tải về (bc này không cần chạy liên tục, chỉ cần thêm nút load bc, thì mới load số liệu khi cần)").
// Chuyen 3 KPI cua file Excel "BC DVBH <ky> - bảo hành.xlsx" sang du lieu he thong moi:
//   1) KHO - toc do gui hang tra (sheet "Tốc độ gửi hàng"): moi phieu tra, tu luc Ke toan duyet toi luc Kho bam Gui hang,
//      dung han = <= 24 gio SLA. Gom theo mien. Thang = thang Kho gui.
//   2) ADMIN BH - toc do xu ly (sheet "KPIs Admin BH"): moi don vi (1 linh kien), tu luc Admin nhan hang (som hon giua
//      "Kho nhan + 2 gio" va "Admin xac nhan nhan thung" - dung cot "Tính ngày admin nhận" cua Excel) toi luc don vi roi tay
//      Admin lan dau (giao NV sua / san sang tra / huy - tu choi / chuyen kho), tru thoi gian cho KTV bo sung thong tin.
//      Duoi 24h / Ton qua 24h; "Khong xet" khi buoc Admin co giai trinh ly do ben "ngoai canh" (Khong co linh kien, Het hang
//      ton kho... - tuong duong cot "Tồn quá 24h" cua Excel). Gom theo thang x nguoi x mien + so luong xu ly.
//   3) NV SUA CHUA - nang suat (sheet "NS SUẤT NV SỬA CHỮA"): moi luot giao NV (vao "Cho NV chan doan") toi luc NV nop ket
//      qua, Duoi 24h / Ton qua 24h theo NV duoc giao. Kem so don dang sua (tai luc tinh) qua 24h.
// Gio tinh theo luat SLA chung cua he thong (lien tuc, bo Chu nhat - lib/sla.ts), KHONG dung luat cu cua Excel (tru 39h / 63h
// cuoi tuan). Ca bat dau tu du lieu nhap AppSheet (truoc 01/11/2026) chi dem o cot "Từ AppSheet", khong tinh gio.
// Khong cache, khong cron: chi tinh khi nguoi dung bam "Tải số liệu" (routes/baoCaoKpi.ts).

export const KPI_NGUONG_GIO = 24;

export type KetQua = "dat" | "qua" | "khong_xet" | "appsheet" | "dang_cho" | "dang_cho_qua";
export interface DongKpi {
  loai: "kho" | "admin" | "nv";
  id: string; // ma phieu tra / don vi
  mien: string | null;
  nguoi: string | null; // nguoi chiu KPI (Kho bam gui / Admin xu ly / NV duoc giao)
  ktv: string | null;
  case_id: string | null;
  tu: string | null;
  den: string | null; // null = dang cho (chua xong luc tinh)
  gio: number | null;
  ket_qua: KetQua;
  ghi_chu: string | null;
}
export interface TongKpi {
  dat: number;
  qua: number;
  khong_xet: number;
  appsheet: number;
  tong: number; // dat + qua (mau so ty le)
  ty_le: number | null; // % dat
  tb_gio: number | null;
  dang_cho: number;
  dang_cho_qua: number;
}
export interface NhomKpi extends TongKpi {
  nguoi: string | null;
  mien: string | null;
}
export interface BaoCaoKpi {
  thang: string;
  tinh_luc: string;
  nguong_gio: number;
  kho: { tong: TongKpi; theo_mien: NhomKpi[]; theo_nguoi: NhomKpi[] };
  admin: { tong: TongKpi; theo_mien: NhomKpi[]; theo_nguoi: NhomKpi[] };
  nv: { tong: TongKpi; theo_nguoi: NhomKpi[] };
  chi_tiet: DongKpi[];
}

const HE_THONG = new Set(["hệ thống", "he thong", "system", ""]);
const r1 = (x: number) => Math.round(x * 10) / 10;

function lui(vn: string, days: number): string {
  return new Date(parseVn(vn) - days * 86400_000).toISOString().slice(0, 19).replace("T", " ");
}
function cong(vn: string, gio: number): string {
  return new Date(parseVn(vn) + gio * 3600_000).toISOString().slice(0, 19).replace("T", " ");
}
function gioSla(a: string, b: string): number | null {
  const x = parseVn(a);
  const y = parseVn(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;
  return y <= x ? 0 : slaHoursBetween(x, y);
}

function tongHop(list: DongKpi[]): TongKpi {
  let dat = 0, qua = 0, khong_xet = 0, appsheet = 0, dang_cho = 0, dang_cho_qua = 0, sum = 0, n = 0;
  for (const d of list) {
    if (d.ket_qua === "dat") dat++;
    else if (d.ket_qua === "qua") qua++;
    else if (d.ket_qua === "khong_xet") khong_xet++;
    else if (d.ket_qua === "appsheet") appsheet++;
    else if (d.ket_qua === "dang_cho") dang_cho++;
    else if (d.ket_qua === "dang_cho_qua") {
      dang_cho++;
      dang_cho_qua++;
    }
    if ((d.ket_qua === "dat" || d.ket_qua === "qua") && d.gio != null) {
      sum += d.gio;
      n++;
    }
  }
  const tong = dat + qua;
  return { dat, qua, khong_xet, appsheet, tong, ty_le: tong ? Math.round((dat / tong) * 1000) / 10 : null, tb_gio: n ? r1(sum / n) : null, dang_cho, dang_cho_qua };
}
function nhom(list: DongKpi[], key: (d: DongKpi) => [string | null, string | null]): NhomKpi[] {
  const m = new Map<string, { nguoi: string | null; mien: string | null; ds: DongKpi[] }>();
  for (const d of list) {
    const [nguoi, mien] = key(d);
    const k = `${nguoi ?? ""}|${mien ?? ""}`;
    (m.get(k) ?? m.set(k, { nguoi, mien, ds: [] }).get(k)!).ds.push(d);
  }
  return [...m.values()]
    .map((g) => ({ nguoi: g.nguoi, mien: g.mien, ...tongHop(g.ds) }))
    .sort((a, b) => (a.mien ?? "~").localeCompare(b.mien ?? "~") || b.tong + b.dang_cho - (a.tong + a.dang_cho));
}

interface LogRow {
  entity_id: string;
  tu: string | null;
  den: string | null;
  nguoi: string;
  thoi_gian: string;
  appsheet: number;
}

// Trang thai don vi Admin BH dang giu / KTV bo sung (khong tinh gio cho Admin) / con lai = da roi tay Admin.
const AD_GIU = new Set(["cho_phan_loai", "admin_can_xem_lai"]);
const KTV_BO_SUNG = "cho_bo_sung_tt";
const NV_XONG = new Set(["cho_admin_xac_nhan", "san_sang_gom_phieu_tra", "admin_can_xem_lai"]);
// Buoc (giai_doan) cua Admin khi xet "Khong xet" (giai trinh ngoai canh).
const GD_ADMIN = ["thung_cho_admin_nhan", "cho_xac_nhan_so_luong", "cho_phan_loai", "admin_can_xem_lai"];

export async function tinhBaoCaoKpi(db: D1Database, thang: string): Promise<BaoCaoKpi | null> {
  const r = thangRange(thang);
  if (!r) return null;
  const now = nowVN();
  const laThangHienTai = now >= r.tu && now < r.den;
  const tuLog = lui(r.tu, 90);
  const trongThang = (t: string | null) => !!t && t >= r.tu && t < r.den;
  const chiTiet: DongKpi[] = [];

  // ---------------- 1) KHO: Ke toan duyet -> Kho gui hang ----------------
  const { results: logTra } = await db
    .prepare(
      `SELECT entity_id, tu_trang_thai AS tu, den_trang_thai AS den, nguoi_thuc_hien AS nguoi, thoi_gian,
              CASE WHEN ghi_chu LIKE '%AppSheet%' THEN 1 ELSE 0 END AS appsheet
       FROM logs_bh WHERE entity_type = 'phieu_tra' AND thoi_gian >= ? AND thoi_gian < ?
         AND (tu_trang_thai IS NULL OR den_trang_thai IS NULL OR tu_trang_thai <> den_trang_thai)
       ORDER BY entity_id, thoi_gian, id`,
    )
    .bind(tuLog, r.den)
    .all<LogRow>();
  const { results: phieuTra } = await db
    .prepare(
      `SELECT id, mien, ktv_nhan, trang_thai, updated_at FROM phieu_tra_bh
       WHERE id IN (SELECT DISTINCT entity_id FROM logs_bh WHERE entity_type = 'phieu_tra' AND thoi_gian >= ? AND thoi_gian < ?)
          OR trang_thai = 'da_duyet_ke_toan'`,
    )
    .bind(tuLog, r.den)
    .all<{ id: string; mien: string | null; ktv_nhan: string; trang_thai: string; updated_at: string }>();
  const traMap = new Map(phieuTra.map((p) => [p.id, p]));
  const vaoDuyet = new Map<string, { luc: string; as: boolean }>(); // lan vao "da_duyet_ke_toan" gan nhat
  for (const l of logTra) {
    if (l.den === "da_duyet_ke_toan") vaoDuyet.set(l.entity_id, { luc: l.thoi_gian, as: l.appsheet === 1 });
    if (l.tu === "da_duyet_ke_toan" && l.den === "da_gui" && trongThang(l.thoi_gian)) {
      const p = traMap.get(l.entity_id);
      const v = vaoDuyet.get(l.entity_id);
      const as = !v || v.as || l.appsheet === 1;
      const gio = v ? gioSla(v.luc, l.thoi_gian) : null;
      chiTiet.push({
        loai: "kho", id: l.entity_id, mien: p?.mien ?? null, nguoi: l.nguoi, ktv: p?.ktv_nhan ?? null, case_id: null,
        tu: v?.luc ?? null, den: l.thoi_gian, gio: gio == null ? null : r1(gio),
        ket_qua: as ? "appsheet" : gio != null && gio <= KPI_NGUONG_GIO ? "dat" : "qua",
        ghi_chu: as ? "Bắt đầu từ dữ liệu AppSheet — không tính giờ" : null,
      });
    }
  }
  // Phieu dang cho Kho gui (chi bao o thang hien tai - do tai luc tinh).
  if (laThangHienTai)
    for (const p of phieuTra) {
      if (p.trang_thai !== "da_duyet_ke_toan") continue;
      const tu = vaoDuyet.get(p.id)?.luc ?? p.updated_at;
      const gio = gioSla(tu, now);
      chiTiet.push({
        loai: "kho", id: p.id, mien: p.mien, nguoi: null, ktv: p.ktv_nhan, case_id: null, tu, den: null, gio: gio == null ? null : r1(gio),
        ket_qua: gio != null && gio > KPI_NGUONG_GIO ? "dang_cho_qua" : "dang_cho", ghi_chu: "Kế toán đã duyệt, Kho chưa gửi",
      });
    }

  // ---------------- 2 + 3) ADMIN BH & NV: nhat ky don vi ----------------
  const { results: logUnit } = await db
    .prepare(
      `SELECT entity_id, tu_trang_thai AS tu, den_trang_thai AS den, nguoi_thuc_hien AS nguoi, thoi_gian,
              CASE WHEN ghi_chu LIKE '%AppSheet%' THEN 1 ELSE 0 END AS appsheet
       FROM logs_bh WHERE entity_type = 'phieu_sc_ct' AND thoi_gian >= ? AND thoi_gian < ?
         AND (tu_trang_thai IS NULL OR den_trang_thai IS NULL OR tu_trang_thai <> den_trang_thai)
       ORDER BY entity_id, thoi_gian, id`,
    )
    .bind(tuLog, r.den)
    .all<LogRow>();
  const { results: units } = await db
    .prepare(
      `SELECT u.id, u.parent_id, u.trang_thai, u.created_at, u.updated_at, u.nguoi_sua_chua, p.case_id, p.mien,
              p.created_at AS p_created, g.id AS g_id, g.nguoi_tao AS ktv, g.thoi_gian_nhan_kho AS kho_nhan,
              g.admin_thoi_gian_nhan AS ad_nhan, g.admin_nguoi_nhan AS ad_nguoi,
              CASE WHEN p.ghi_chu LIKE '%AppSheet ID%' THEN 1 ELSE 0 END AS appsheet
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE u.updated_at >= ? OR u.trang_thai = 'cho_chan_doan'`,
    )
    .bind(tuLog)
    .all<{
      id: string; parent_id: string; trang_thai: string; created_at: string; updated_at: string; nguoi_sua_chua: string | null;
      case_id: string | null; mien: string | null; p_created: string; g_id: string | null; ktv: string | null;
      kho_nhan: string | null; ad_nhan: string | null; ad_nguoi: string | null; appsheet: number;
    }>();
  // Giai trinh ngoai canh o buoc Admin (Khong co linh kien / Het hang ton kho...) -> "Khong xet".
  const { results: gt } = await db
    .prepare(
      `SELECT entity_id, giai_doan, ly_do FROM giai_trinh_bh WHERE ben = 'ngoai_canh' AND luc >= ?
         AND giai_doan IN (${GD_ADMIN.map(() => "?").join(",")})`,
    )
    .bind(tuLog, ...GD_ADMIN)
    .all<{ entity_id: string; giai_doan: string; ly_do: string }>()
    .catch(() => ({ results: [] as { entity_id: string; giai_doan: string; ly_do: string }[] }));
  const gtMap = new Map<string, string>();
  for (const x of gt) gtMap.set(x.entity_id, x.ly_do);

  const logsOf = new Map<string, LogRow[]>();
  for (const l of logUnit) (logsOf.get(l.entity_id) ?? logsOf.set(l.entity_id, []).get(l.entity_id)!).push(l);

  for (const u of units) {
    const ls = logsOf.get(u.id) ?? [];
    // ----- Admin -----
    let end: LogRow | null = null;
    let boSung = 0; // gio SLA cho KTV bo sung truoc khi roi tay Admin
    let bsTu: string | null = null;
    for (const l of ls) {
      if (bsTu) {
        boSung += gioSla(bsTu, l.thoi_gian) ?? 0;
        bsTu = null;
      }
      if (l.den === KTV_BO_SUNG) {
        bsTu = l.thoi_gian;
        continue;
      }
      if (l.den && !AD_GIU.has(l.den)) {
        end = l;
        break;
      }
    }
    // FAST: don vi sinh thang o trang thai sau Admin, khong co dong nhat ky -> xong luc tao.
    const fast = !end && ls.length === 0 && !AD_GIU.has(u.trang_thai) && u.trang_thai !== KTV_BO_SUNG && u.trang_thai !== "cho_xac_nhan_so_luong";
    const denAd = end?.thoi_gian ?? (fast ? u.created_at : null);
    if (denAd && trongThang(denAd)) {
      const tuAd = u.g_id ? (u.ad_nhan ? (u.kho_nhan && cong(u.kho_nhan, 2) < u.ad_nhan ? cong(u.kho_nhan, 2) : u.ad_nhan) : u.created_at) : u.p_created;
      const as = u.appsheet === 1 || end?.appsheet === 1;
      const g0 = gioSla(tuAd, denAd);
      const gio = g0 == null ? null : Math.max(0, g0 - boSung);
      const nguoiRaw = end?.nguoi ?? u.ad_nguoi ?? null;
      const nguoi = nguoiRaw && !HE_THONG.has(nguoiRaw.trim().toLowerCase()) ? nguoiRaw : (u.ad_nguoi ?? nguoiRaw);
      const lyDoNc = gtMap.get(u.id) ?? gtMap.get(u.parent_id) ?? (u.g_id ? gtMap.get(u.g_id) : undefined);
      let kq: KetQua;
      let ghi: string | null = null;
      if (as) {
        kq = "appsheet";
        ghi = "Dữ liệu AppSheet — không tính giờ";
      } else if (gio != null && gio <= KPI_NGUONG_GIO) kq = "dat";
      else if (lyDoNc) {
        kq = "khong_xet";
        ghi = `Giải trình ngoại cảnh: ${lyDoNc}`;
      } else kq = "qua";
      if (boSung > 0 && kq !== "appsheet") ghi = [ghi, `Trừ ${r1(boSung)} giờ chờ KTV bổ sung`].filter(Boolean).join(" · ");
      chiTiet.push({
        loai: "admin", id: u.id, mien: u.mien, nguoi, ktv: u.ktv, case_id: u.case_id, tu: tuAd, den: denAd,
        gio: gio == null ? null : r1(gio), ket_qua: kq, ghi_chu: ghi,
      });
    }

    // ----- NV sua chua: moi luot vao "cho_chan_doan" -> nop ket qua -----
    if (!u.nguoi_sua_chua) continue;
    let vao: LogRow | null = null;
    for (const l of ls) {
      if (l.den === "cho_chan_doan") {
        vao = l;
        continue;
      }
      if (vao && l.tu === "cho_chan_doan") {
        if (l.den && NV_XONG.has(l.den) && trongThang(l.thoi_gian)) {
          const as = vao.appsheet === 1 || l.appsheet === 1;
          const gio = gioSla(vao.thoi_gian, l.thoi_gian);
          chiTiet.push({
            loai: "nv", id: u.id, mien: u.mien, nguoi: u.nguoi_sua_chua, ktv: u.ktv, case_id: u.case_id, tu: vao.thoi_gian, den: l.thoi_gian,
            gio: gio == null ? null : r1(gio), ket_qua: as ? "appsheet" : gio != null && gio <= KPI_NGUONG_GIO ? "dat" : "qua",
            ghi_chu: l.den === "admin_can_xem_lai" ? "NV báo không sửa được (trả Admin)" : as ? "Dữ liệu AppSheet — không tính giờ" : null,
          });
        }
        vao = null;
      }
    }
    if (laThangHienTai && u.trang_thai === "cho_chan_doan") {
      const tu = vao?.thoi_gian ?? u.updated_at;
      const gio = gioSla(tu, now);
      chiTiet.push({
        loai: "nv", id: u.id, mien: u.mien, nguoi: u.nguoi_sua_chua, ktv: u.ktv, case_id: u.case_id, tu, den: null,
        gio: gio == null ? null : r1(gio), ket_qua: gio != null && gio > KPI_NGUONG_GIO ? "dang_cho_qua" : "dang_cho", ghi_chu: "Đang sửa (chưa nộp kết quả)",
      });
    }
  }

  const kho = chiTiet.filter((d) => d.loai === "kho");
  const admin = chiTiet.filter((d) => d.loai === "admin");
  const nv = chiTiet.filter((d) => d.loai === "nv");
  return {
    thang,
    tinh_luc: now,
    nguong_gio: KPI_NGUONG_GIO,
    kho: { tong: tongHop(kho), theo_mien: nhom(kho, (d) => [null, d.mien]), theo_nguoi: nhom(kho.filter((d) => d.nguoi), (d) => [d.nguoi, d.mien]) },
    admin: { tong: tongHop(admin), theo_mien: nhom(admin, (d) => [null, d.mien]), theo_nguoi: nhom(admin, (d) => [d.nguoi, d.mien]) },
    nv: { tong: tongHop(nv), theo_nguoi: nhom(nv, (d) => [d.nguoi, null]) },
    chi_tiet: chiTiet,
  };
}
