import type { AppUser } from "../types";
import { BUOC_DUNG, BUOC_KTV, BUOC_MAP, cauHinhBuoc, gdTuTrangThai, sqlQuaHan } from "./buoc";
import { GT_ID, GT_TYPE, scopeBuoc, sqlDaGiaiTrinh } from "./giaiTrinh";
import { allRowsSql } from "../routes/traCuu";
import { hoursSince, parseVn, slaHoursBetween } from "./sla";

// 15/11/2026 - Bao cao "Diem nghen & trach nhiem" (yeu cau: "phân tích các vấn đề để đưa ra được 1 báo cáo tập trung đúng
// vào nội dung và quản lý cần quan tâm"; chot huong "Điểm nghẽn & trách nhiệm"). 1 trang tra loi 5 cau hoi:
//   1) Dang ton bao nhieu, bao nhieu qua SLA, bao nhieu chua giai trinh? (KPI)
//   2) Ket o buoc nao? (moi buoc: dang dung / qua SLA / chua giai trinh / dung lau nhat)
//   3) Cham do ben nao? (giai trinh + ly do cham trong ky, gom theo ben chiu trach nhiem / ly do / buoc)
//   4) Ai dang giu nhieu viec qua han? (KTV / Giam sat / NV sua chua)
//   5) Viec nao qua han ma chua ai giai trinh (lau nhat truoc) + xu huong 8 tuan.
// Pham vi theo scopeBuoc (Admin BH theo mien, Giam sat theo khu vuc, View theo khu vuc gan, qtri toan he thong).
// Ly do cham truoc khi co bang giai_trinh_bh (15/11/2026) doc tu nhat ky (logs_bh "Lý do chậm: X").

export const GT_BAT_DAU = "2026-11-15 00:00:00";
const DAY = 86_400_000;

function ngayCong(ngay: string, soNgay: number): string {
  return new Date(Date.parse(ngay + "T00:00:00Z") + soNgay * DAY).toISOString().slice(0, 10);
}
/** Thu 2 dau tuan (YYYY-MM-DD) cua 1 ngay. */
function dauTuan(ngay: string): string {
  const d = new Date(ngay.slice(0, 10) + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dow * DAY).toISOString().slice(0, 10);
}

type GtRow = { ben: string | null; ly_do: string; gd: string | null; vai_tro: string; nguoi: string; qua_gio: number | null; luc: string };

/** SQL loc 1 bang co (entity_type, entity_id) theo pham vi user (alias bang = `a`). */
function scopeEntity(w: string, a: string): string {
  return `((${a}.entity_type = 'phieu_gui' AND EXISTS (SELECT 1 FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE g.id = ${a}.entity_id AND ${w}))
    OR (${a}.entity_type = 'phieu_sc' AND EXISTS (SELECT 1 FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ${a}.entity_id AND ${w}))
    OR (${a}.entity_type = 'phieu_sc_ct' AND EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE u.id = ${a}.entity_id AND ${w}))
    OR (${a}.entity_type = 'phieu_tra' AND EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE u.phieu_tra_id = ${a}.entity_id AND ${w})))`;
}

export async function tinhBaoCaoNghen(db: D1Database, user: AppUser, tu: string, den: string) {
  const ch = await cauHinhBuoc(db);
  const sc = scopeBuoc(user);
  const denHet = den + " 23:59:59";
  // Cua so du lieu lich su = max(ky bao cao, 8 tuan) de ve xu huong.
  const tuanDau = dauTuan(ngayCong(den, -7 * 7));
  const tuCua = tu < tuanDau ? tu : tuanDau;

  // ---- 1+2+4: anh chup hien tai, gom theo buoc x KTV x NV (1 lan quet) ----
  const qh = sqlQuaHan(ch, "x.giai_doan", "x.buoc_tu", BUOC_DUNG);
  const { results: snap } = await db
    .prepare(
      `SELECT x.giai_doan AS gd, x.ktv AS ktv, x.nguoi_sua_chua AS nv, COUNT(*) AS tong,
         SUM(CASE WHEN ${qh.sql} THEN 1 ELSE 0 END) AS qua_han,
         SUM(CASE WHEN ${qh.sql} AND NOT ${sqlDaGiaiTrinh()} THEN 1 ELSE 0 END) AS chua_gt,
         MIN(x.buoc_tu) AS tu_som
       FROM ${allRowsSql(sc.where, BUOC_DUNG)} WHERE x.giai_doan IN (${BUOC_DUNG.map(() => "?").join(",")})
       GROUP BY x.giai_doan, x.ktv, x.nguoi_sua_chua`,
    )
    .bind(...qh.binds, ...qh.binds, ...sc.binds, ...sc.binds, ...BUOC_DUNG)
    .all<{ gd: string; ktv: string | null; nv: string | null; tong: number; qua_han: number; chua_gt: number; tu_som: string }>();

  const buocAgg = new Map<string, { gd: string; tong: number; qua_han: number; chua_gt: number; tu_som: string | null }>();
  const ktvAgg = new Map<string, { email: string; tong: number; qua_han: number; chua_gt: number }>();
  const nvAgg = new Map<string, { email: string; tong: number; qua_han: number; chua_gt: number }>();
  for (const r of snap) {
    const b = buocAgg.get(r.gd) ?? { gd: r.gd, tong: 0, qua_han: 0, chua_gt: 0, tu_som: null };
    b.tong += r.tong;
    b.qua_han += r.qua_han;
    b.chua_gt += r.chua_gt;
    if (r.tu_som && (!b.tu_som || r.tu_som < b.tu_som)) b.tu_som = r.tu_som;
    buocAgg.set(r.gd, b);
    if (BUOC_KTV.includes(r.gd) && r.ktv) {
      const k = ktvAgg.get(r.ktv) ?? { email: r.ktv, tong: 0, qua_han: 0, chua_gt: 0 };
      k.tong += r.tong;
      k.qua_han += r.qua_han;
      k.chua_gt += r.chua_gt;
      ktvAgg.set(r.ktv, k);
    }
    if (r.gd === "cho_chan_doan") {
      const key = r.nv || "__chua_gan__";
      const n = nvAgg.get(key) ?? { email: key, tong: 0, qua_han: 0, chua_gt: 0 };
      n.tong += r.tong;
      n.qua_han += r.qua_han;
      n.chua_gt += r.chua_gt;
      nvAgg.set(key, n);
    }
  }
  const buoc = [...buocAgg.values()]
    .map((b) => ({ ...b, lau_nhat_gio: b.tu_som ? Math.round(hoursSince(b.tu_som)) : 0, sla: ch.sla[b.gd] ?? BUOC_MAP[b.gd]?.sla ?? 24 }))
    .sort((a, b) => b.qua_han - a.qua_han || b.tong - a.tong);
  const tongDung = buoc.reduce((s, b) => s + b.tong, 0);
  const tongQua = buoc.reduce((s, b) => s + b.qua_han, 0);
  const tongChuaGt = buoc.reduce((s, b) => s + b.chua_gt, 0);

  // Giam sat (GS chinh cua khu vuc KTV) - tong viec KTV qua han theo GS.
  const ktvList = [...ktvAgg.values()];
  const gsAgg = new Map<string, { email: string; so_ktv: number; tong: number; qua_han: number; chua_gt: number }>();
  if (ktvList.length) {
    const { results: gsRows } = await db
      .prepare(
        `SELECT LOWER(k.email_dang_nhap) AS ktv, MAX(COALESCE(kv.gs_email, (SELECT MIN(x.gs_email) FROM khu_vuc_gs_bh x WHERE x.khu_vuc_ma = k.khu_vuc_ma))) AS gs FROM ktv_lien_he_bh k LEFT JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma
         WHERE k.email_dang_nhap IS NOT NULL GROUP BY LOWER(k.email_dang_nhap)`,
      )
      .all<{ ktv: string; gs: string | null }>();
    const gsOf = new Map(gsRows.map((r) => [r.ktv, r.gs]));
    for (const k of ktvList) {
      const gs = gsOf.get(k.email.toLowerCase()) || "__chua_co_gs__";
      const g = gsAgg.get(gs) ?? { email: gs, so_ktv: 0, tong: 0, qua_han: 0, chua_gt: 0 };
      g.so_ktv++;
      g.tong += k.tong;
      g.qua_han += k.qua_han;
      g.chua_gt += k.chua_gt;
      gsAgg.set(gs, g);
    }
  }
  const top = <T extends { qua_han: number; tong: number }>(arr: T[], n = 20) => arr.sort((a, b) => b.qua_han - a.qua_han || b.tong - a.tong).slice(0, n);

  // ---- 5a: viec qua han chua ai giai trinh, lau nhat truoc ----
  const { results: chuaGt } = await db
    .prepare(
      `SELECT ${GT_TYPE} AS gt_type, ${GT_ID} AS gt_id, x.giai_doan AS gd, MIN(x.buoc_tu) AS tu, COUNT(*) AS so_don,
         MAX(x.ktv) AS ktv, MAX(x.nguoi_sua_chua) AS nv, MAX(x.case_id) AS case_id, MAX(x.mien) AS mien, MIN(x.id) AS don_id
       FROM ${allRowsSql(sc.where, BUOC_DUNG)} WHERE x.giai_doan IN (${BUOC_DUNG.map(() => "?").join(",")}) AND ${qh.sql} AND NOT ${sqlDaGiaiTrinh()}
       GROUP BY gt_type, gt_id, x.giai_doan ORDER BY tu LIMIT 60`,
    )
    .bind(...sc.binds, ...sc.binds, ...BUOC_DUNG, ...qh.binds)
    .all<{ gt_type: string; gt_id: string; gd: string; tu: string; so_don: number; ktv: string | null; nv: string | null; case_id: string | null; mien: string | null; don_id: string }>();
  const quaHanChuaGt = chuaGt.map((r) => {
    const sla = ch.sla[r.gd] ?? BUOC_MAP[r.gd]?.sla ?? 24;
    return { ...r, dung_gio: Math.round(hoursSince(r.tu)), qua_gio: Math.max(0, Math.round(hoursSince(r.tu) - sla)) };
  });

  // ---- 3: giai trinh / ly do cham trong cua so (bang giai_trinh_bh + nhat ky cu) ----
  const loc = sc.where === "1=1" ? "" : ` AND ${scopeEntity(sc.where, "a")}`;
  const locBinds = sc.where === "1=1" ? [] : [...sc.binds, ...sc.binds, ...sc.binds, ...sc.binds];
  const { results: gtMoi } = await db
    .prepare(`SELECT a.ben, a.ly_do, a.giai_doan AS gd, a.vai_tro, a.nguoi, a.qua_gio, a.luc FROM giai_trinh_bh a WHERE a.luc >= ? AND a.luc <= ?${loc}`)
    .bind(tuCua + " 00:00:00", denHet, ...locBinds)
    .all<GtRow>();
  const gtAll: GtRow[] = [...gtMoi];
  if (tuCua + " 00:00:00" < GT_BAT_DAU) {
    const { results: lyDoBen } = await db.prepare("SELECT noi_dung, ben FROM settings_ly_do_cham_bh").all<{ noi_dung: string; ben: string | null }>();
    const benOf = new Map(lyDoBen.map((r) => [r.noi_dung.trim().toLowerCase(), r.ben]));
    const { results: logs } = await db
      .prepare(
        `SELECT a.entity_type, a.tu_trang_thai, a.nguoi_thuc_hien, a.thoi_gian, a.ghi_chu FROM logs_bh a
         WHERE a.thoi_gian >= ? AND a.thoi_gian < ? AND a.thoi_gian <= ? AND a.ghi_chu LIKE '%do chậm%'${loc}`,
      )
      .bind(tuCua + " 00:00:00", GT_BAT_DAU, denHet, ...locBinds)
      .all<{ entity_type: string; tu_trang_thai: string | null; nguoi_thuc_hien: string; thoi_gian: string; ghi_chu: string }>();
    for (const l of logs) {
      const m = l.ghi_chu.match(/l[ýy] do ch[ậa]m[^:]*:\s*([^|]+)/i);
      const lyDo = m?.[1]?.trim();
      if (!lyDo) continue;
      gtAll.push({ ben: benOf.get(lyDo.toLowerCase()) ?? null, ly_do: lyDo, gd: gdTuTrangThai(l.entity_type, l.tu_trang_thai), vai_tro: "bo", nguoi: l.nguoi_thuc_hien, qua_gio: null, luc: l.thoi_gian });
    }
  }
  const trongKy = gtAll.filter((g) => g.luc >= tu + " 00:00:00" && g.luc <= denHet);
  const nhomBy = (key: (g: GtRow) => string) => {
    const m = new Map<string, { key: string; so: number; tong_qua: number; co_qua: number }>();
    for (const g of trongKy) {
      const k = key(g);
      const v = m.get(k) ?? { key: k, so: 0, tong_qua: 0, co_qua: 0 };
      v.so++;
      if (g.qua_gio != null) {
        v.tong_qua += g.qua_gio;
        v.co_qua++;
      }
      m.set(k, v);
    }
    return [...m.values()].map((v) => ({ key: v.key, so: v.so, tb_qua_gio: v.co_qua ? Math.round(v.tong_qua / v.co_qua) : null })).sort((a, b) => b.so - a.so);
  };
  const theoBen = nhomBy((g) => g.ben || "chua_ro");
  const lyDoMap = new Map<string, { ly_do: string; ben: string; so: number }>();
  for (const g of trongKy) {
    const v = lyDoMap.get(g.ly_do) ?? { ly_do: g.ly_do, ben: g.ben || "chua_ro", so: 0 };
    v.so++;
    lyDoMap.set(g.ly_do, v);
  }
  const theoLyDo = [...lyDoMap.values()].sort((a, b) => b.so - a.so).slice(0, 30);
  const theoBuoc = nhomBy((g) => g.gd || "khac");
  const theoVai = nhomBy((g) => g.vai_tro);

  // ---- KPI hoan tat + thoi gian ca trung binh (bo don nhap AppSheet) ----
  const locU = sc.where === "1=1" ? "" : ` AND ${sc.where}`;
  const { results: xong } = await db
    .prepare(
      `SELECT p.created_at AS bd, t.updated_at AS kt FROM phieu_sua_chua_bh_ct u
       JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE t.trang_thai IN ('ktv_da_nhan', 'ket_thuc_khong_gui') AND t.updated_at >= ? AND t.updated_at <= ?
         AND COALESCE(p.ghi_chu, '') NOT LIKE '%AppSheet ID%'${locU}`,
    )
    .bind(tuCua + " 00:00:00", denHet, ...sc.binds)
    .all<{ bd: string; kt: string }>();
  const caGio = (r: { bd: string; kt: string }) => Math.max(0, slaHoursBetween(parseVn(r.bd), parseVn(r.kt)));
  const xongKy = xong.filter((r) => r.kt >= tu + " 00:00:00");
  const tbCa = xongKy.length ? Math.round(xongKy.reduce((s, r) => s + caGio(r), 0) / xongKy.length) : null;

  // ---- Xu huong 8 tuan ----
  const tuan: { tuan: string; giai_trinh: number; theo_ben: Record<string, number>; hoan_tat: number; tb_ca_gio: number | null }[] = [];
  for (let i = 0; i < 8; i++) tuan.push({ tuan: ngayCong(tuanDau, i * 7), giai_trinh: 0, theo_ben: {}, hoan_tat: 0, tb_ca_gio: null });
  const idx = (luc: string) => tuan.findIndex((w) => w.tuan === dauTuan(luc));
  for (const g of gtAll) {
    const i = idx(g.luc);
    if (i < 0) continue;
    tuan[i].giai_trinh++;
    const b = g.ben || "chua_ro";
    tuan[i].theo_ben[b] = (tuan[i].theo_ben[b] ?? 0) + 1;
  }
  const tongCa = new Array(8).fill(0);
  for (const r of xong) {
    const i = idx(r.kt);
    if (i < 0) continue;
    tuan[i].hoan_tat++;
    tongCa[i] += caGio(r);
  }
  tuan.forEach((w, i) => (w.tb_ca_gio = w.hoan_tat ? Math.round(tongCa[i] / w.hoan_tat) : null));

  return {
    tu,
    den,
    kpi: {
      dang_dung: tongDung,
      qua_sla: tongQua,
      trong_sla_pct: tongDung ? Math.round(((tongDung - tongQua) / tongDung) * 100) : 100,
      chua_giai_trinh: tongChuaGt,
      giai_trinh_ky: trongKy.length,
      hoan_tat_ky: xongKy.length,
      tb_ca_gio: tbCa,
    },
    buoc,
    giai_trinh: { theo_ben: theoBen, theo_ly_do: theoLyDo, theo_buoc: theoBuoc, theo_vai: theoVai },
    nguoi: {
      ktv: top(ktvList),
      gs: top([...gsAgg.values()]),
      nv: top([...nvAgg.values()]),
    },
    qua_han_chua_gt: quaHanChuaGt,
    xu_huong: tuan,
  };
}
