import type { AppUser } from "../types";
import { nowVN } from "./vnTime";
import { hoursSince } from "./sla";
import { BUOC, BUOC_DUNG, BUOC_MAP, cauHinhBuoc, gdTuTrangThai, type BuocCauHinh } from "./buoc";
import { slaCutoffVn } from "./sla";
import { GS_KTV_SUBQUERY } from "./gs";
import { viewKhuVucEmailInSql } from "./scope";

// 15/11/2026 - giai trinh theo tung lan dung buoc (xem lib/buoc.ts).

/** Doi tuong giai trinh cua 1 dong x (allRowsSql): thung / phieu tra / don cha / don vi. */
export const GT_TYPE = `CASE WHEN substr(x.giai_doan,1,4) = 'tra_' THEN 'phieu_tra' WHEN substr(x.giai_doan,1,6) = 'thung_' THEN 'phieu_gui' WHEN x.loai = 'parent' THEN 'phieu_sc' ELSE 'phieu_sc_ct' END`;
export const GT_ID = `CASE WHEN substr(x.giai_doan,1,4) = 'tra_' THEN x.phieu_tra_id WHEN substr(x.giai_doan,1,6) = 'thung_' THEN x.phieu_gui_id ELSE x.id END`;

/** Da co giai trinh cho lan dung buoc hien tai (vai tro trong danh sach; rong = bat ky). */
export function sqlDaGiaiTrinh(vaiTro: string[] = []): string {
  const vt = vaiTro.length ? ` AND gt.vai_tro IN (${vaiTro.map((v) => `'${v}'`).join(",")})` : "";
  return `EXISTS (SELECT 1 FROM giai_trinh_bh gt WHERE gt.entity_type = ${GT_TYPE} AND gt.entity_id = ${GT_ID} AND gt.giai_doan = x.giai_doan AND gt.luc >= x.buoc_tu${vt})`;
}

/** Pham vi xem cho cac man quan tri theo buoc (dung trong allRowsSql: alias p, g). */
export function scopeBuoc(user: AppUser): { where: string; binds: unknown[] } {
  if (user.la_qtri) return { where: "1=1", binds: [] };
  if (user.la_admin_bh || user.la_kho || user.la_ke_toan) {
    if (!user.mien || user.mien === "ALL") return { where: "1=1", binds: [] };
    return { where: "(p.mien = ? OR p.mien IS NULL)", binds: [user.mien] };
  }
  if (user.la_giam_sat) return { where: `(p.email_gs = ? OR COALESCE(g.nguoi_tao, '') IN (${GS_KTV_SUBQUERY}))`, binds: [user.email, user.email.toLowerCase()] };
  if (user.la_view) return { where: `COALESCE(g.nguoi_tao, '') IN ${viewKhuVucEmailInSql()}`, binds: [user.email] };
  if (user.la_ktv_dvbh || user.la_ve_tinh) return { where: "(g.nguoi_tao = ? OR g.nguoi_tao_ho = ?)", binds: [user.email, user.email] };
  if (user.la_nv_sua_chua) return { where: "1=1", binds: [] }; // NV: loc theo nguoi_sua_chua o noi goi
  return { where: "1=0", binds: [] };
}

/** Cac buoc ma vai tro cua user la "chu buoc" (BO giai trinh). */
export function buocCuaBo(user: AppUser): string[] {
  const chu = new Set<string>();
  if (user.la_qtri) ["kho", "admin", "nv", "ketoan"].forEach((x) => chu.add(x));
  if (user.la_kho) chu.add("kho");
  if (user.la_admin_bh) chu.add("admin");
  if (user.la_nv_sua_chua) chu.add("nv");
  if (user.la_ke_toan) chu.add("ketoan");
  return BUOC.filter((b) => b.giai_trinh === "bo" && chu.has(b.chu)).map((b) => b.gd);
}

/** Ly do cham chon o cong SLA (nhat ky "... | Lý do chậm: X" / "⏱ Ghi nhận lý do chậm (...): X") = giai trinh cua BO. */
export async function ghiGiaiTrinhTuLog(db: D1Database, entityType: string, entityId: string, tuTrangThai: string | null, actor: string, ghiChu: string): Promise<void> {
  const m = ghiChu.match(/l[ýy] do ch[ậa]m[^:]*:\s*([^|]+)/i);
  if (!m) return;
  const lyDo = m[1].trim();
  if (!lyDo) return;
  const gd = gdTuTrangThai(entityType, tuTrangThai);
  if (!gd || !BUOC_MAP[gd]) return;
  const ben = await db.prepare("SELECT ben FROM settings_ly_do_cham_bh WHERE noi_dung = ?").bind(lyDo).first<{ ben: string | null }>().catch(() => null);
  await db
    .prepare("INSERT INTO giai_trinh_bh (entity_type, entity_id, giai_doan, vai_tro, ly_do, ben, ghi_chu, qua_gio, nguoi, luc) VALUES (?, ?, ?, 'bo', ?, ?, NULL, NULL, ?, ?)")
    .bind(entityType, entityId, gd, lyDo, ben?.ben ?? null, actor, nowVN())
    .run();
}

/** Buoc hien tai + moc bat dau dung cua 1 doi tuong giai trinh. */
export async function buocHienTai(db: D1Database, type: string, id: string): Promise<{ gd: string; tu: string; ktv: string | null; ktvHo: string | null } | null> {
  if (type === "phieu_gui") {
    const g = await db.prepare("SELECT trang_thai, admin_tiep_nhan, tu_choi_tt, updated_at, created_at, nguoi_tao, nguoi_tao_ho FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; admin_tiep_nhan: number; tu_choi_tt: string | null; updated_at: string; created_at: string; nguoi_tao: string; nguoi_tao_ho: string | null }>();
    if (!g) return null;
    const gd = g.trang_thai === "nhap" ? "thung_nhap" : g.trang_thai === "da_gui" ? "thung_dang_gui" : g.tu_choi_tt === "cho_kho" || g.tu_choi_tt === "cho_ktv" ? "thung_tu_choi" : g.trang_thai === "da_tiep_nhan" && !g.admin_tiep_nhan ? "thung_cho_admin_nhan" : "";
    // 16/11/2026: buoc 1 (thung nhap) tinh tu luc TAO thung - sua thung / them don khong lam dong ho chay lai.
    return gd ? { gd, tu: gd === "thung_nhap" ? g.created_at : g.updated_at, ktv: g.nguoi_tao, ktvHo: g.nguoi_tao_ho } : null;
  }
  if (type === "phieu_tra") {
    const t = await db.prepare("SELECT trang_thai, updated_at, ktv_nhan FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string; ktv_nhan: string | null }>();
    return t ? { gd: "tra_" + t.trang_thai, tu: t.updated_at, ktv: t.ktv_nhan, ktvHo: null } : null;
  }
  if (type === "phieu_sc") {
    const p = await db.prepare("SELECT p.trang_thai_cha, p.created_at, g.updated_at AS g_up, g.nguoi_tao, g.nguoi_tao_ho FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?").bind(id).first<{ trang_thai_cha: string; created_at: string; g_up: string | null; nguoi_tao: string | null; nguoi_tao_ho: string | null }>();
    return p && p.trang_thai_cha === "cho_xac_nhan_so_luong" ? { gd: "cho_xac_nhan_so_luong", tu: p.g_up || p.created_at, ktv: p.nguoi_tao, ktvHo: p.nguoi_tao_ho } : null;
  }
  const u = await db
    .prepare("SELECT u.trang_thai, u.updated_at, t.trang_thai AS t_tt, t.updated_at AS t_up, g.nguoi_tao, g.nguoi_tao_ho FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id WHERE u.id = ?")
    .bind(id)
    .first<{ trang_thai: string; updated_at: string; t_tt: string | null; t_up: string | null; nguoi_tao: string | null; nguoi_tao_ho: string | null }>();
  if (!u) return null;
  return u.t_tt ? { gd: "tra_" + u.t_tt, tu: u.t_up || u.updated_at, ktv: u.nguoi_tao, ktvHo: u.nguoi_tao_ho } : { gd: u.trang_thai, tu: u.updated_at, ktv: u.nguoi_tao, ktvHo: u.nguoi_tao_ho };
}

export async function soGioQua(db: D1Database, gd: string, tu: string): Promise<number> {
  const ch = await cauHinhBuoc(db);
  return Math.round((hoursSince(tu) - (ch.sla[gd] ?? 24)) * 10) / 10;
}

// ---- 16/11/2026: tam dung / gia han dong ho + bat buoc giai trinh o buoc KTV giu (doi chieu yeu cau doi tac) ----
// - Don vi co yeu cau THIEU HANG dang mo (ticket linh-kien-app chua dong) -> buoc "tam dung": khong tinh qua SLA.
//   Ticket dong -> dong ho tinh lai tu luc ticket cap nhat lan cuoi (khong tinh phan thoi gian cho hang).
// - Giai trinh co ben "ngoai_canh" (cho mail phe duyet, khach chua thanh toan...) -> gia han them 1 SLA tinh tu luc giai trinh.
export const THB_DANG_MO = ["Cho gui", "Cho kho xu ly", "Kho da tiep nhan", "Cho mua hang", "Mua hang da dat"];
const THB_MO_SQL = THB_DANG_MO.map((v) => `'${v}'`).join(",");
/** Dong x (allRowsSql) dang tam dung vi cho hang. */
export const SQL_TAM_DUNG = `(x.loai = 'unit' AND EXISTS (SELECT 1 FROM thieu_hang_bh th WHERE th.unit_id = x.id AND th.trang_thai IN (${THB_MO_SQL})))`;
/** Moc tinh SLA hieu luc cua dong x = max(vao buoc, giai trinh ngoai canh gan nhat, thieu hang cap nhat gan nhat). */
export const SQL_MOC_TINH = `MAX(x.buoc_tu, COALESCE((SELECT MAX(gt2.luc) FROM giai_trinh_bh gt2 WHERE gt2.entity_type = ${GT_TYPE} AND gt2.entity_id = ${GT_ID} AND gt2.giai_doan = x.giai_doan AND gt2.luc >= x.buoc_tu AND gt2.ben = 'ngoai_canh'), ''), COALESCE((SELECT MAX(th2.updated_at) FROM thieu_hang_bh th2 WHERE x.loai = 'unit' AND th2.unit_id = x.id AND th2.updated_at >= x.buoc_tu), ''))`;

/** "Dang qua SLA buoc" cua dong x, co tinh tam dung / gia han. extraGio: cong them (VD len Giam sat). */
export function sqlQuaHanX(ch: BuocCauHinh, gds: readonly string[] = BUOC_DUNG, extraGio = 0): { sql: string; binds: unknown[] } {
  const parts: string[] = [];
  const binds: unknown[] = [];
  for (const gd of gds) {
    const sla = ch.sla[gd];
    if (!sla) continue;
    parts.push("WHEN ? THEN ?");
    binds.push(gd, slaCutoffVn(sla + extraGio));
  }
  if (!parts.length) return { sql: "0", binds: [] };
  return { sql: `(${SQL_MOC_TINH} < CASE x.giai_doan ${parts.join(" ")} END AND NOT ${SQL_TAM_DUNG})`, binds };
}

export interface TrangThaiBuoc {
  gd: string;
  so: string;
  ten: string;
  chu: string;
  giai_trinh: string;
  loi: string[];
  tu: string;
  moc: string;
  sla: number;
  dung_gio: number;
  qua_gio: number;
  qua_han: boolean;
  tam_dung: boolean;
  thieu_hang: { ma_lk: string; trang_thai: string; ticket_id: string | null; updated_at: string }[];
  gia_han: { luc: string; ly_do: string } | null;
  da_giai_trinh: boolean;
  ktv: string | null;
  ktvHo: string | null;
}

/** Trang thai buoc hien tai cua 1 doi tuong (dung cho chi tiet don + cong bat buoc giai trinh). */
export async function trangThaiBuoc(db: D1Database, type: string, id: string): Promise<TrangThaiBuoc | null> {
  const cur = await buocHienTai(db, type, id);
  if (!cur) return null;
  const def = BUOC_MAP[cur.gd];
  if (!def || def.ket_thuc) return null;
  const ch = await cauHinhBuoc(db);
  const sla = ch.sla[cur.gd] ?? def.sla;
  const [nc, th, gt] = await Promise.all([
    db
      .prepare("SELECT luc, ly_do FROM giai_trinh_bh WHERE entity_type = ? AND entity_id = ? AND giai_doan = ? AND luc >= ? AND ben = 'ngoai_canh' ORDER BY luc DESC LIMIT 1")
      .bind(type, id, cur.gd, cur.tu)
      .first<{ luc: string; ly_do: string }>(),
    type === "phieu_sc_ct"
      ? db
          .prepare("SELECT ma_lk, trang_thai, ticket_id, updated_at FROM thieu_hang_bh WHERE unit_id = ? ORDER BY updated_at DESC LIMIT 10")
          .bind(id)
          .all<{ ma_lk: string; trang_thai: string; ticket_id: string | null; updated_at: string }>()
          .then((r) => r.results)
      : Promise.resolve([] as { ma_lk: string; trang_thai: string; ticket_id: string | null; updated_at: string }[]),
    db.prepare("SELECT 1 AS x FROM giai_trinh_bh WHERE entity_type = ? AND entity_id = ? AND giai_doan = ? AND luc >= ? LIMIT 1").bind(type, id, cur.gd, cur.tu).first(),
  ]);
  const tamDung = th.some((t) => THB_DANG_MO.includes(t.trang_thai));
  let moc = cur.tu;
  if (nc && nc.luc > moc) moc = nc.luc;
  for (const t of th) if (t.updated_at >= cur.tu && t.updated_at > moc) moc = t.updated_at;
  const tinh = hoursSince(moc);
  return {
    gd: cur.gd,
    so: def.so,
    ten: def.ten,
    chu: def.chu,
    giai_trinh: def.giai_trinh,
    loi: def.loi,
    tu: cur.tu,
    moc,
    sla,
    dung_gio: Math.round(hoursSince(cur.tu) * 10) / 10,
    qua_gio: Math.round((tinh - sla) * 10) / 10,
    qua_han: !tamDung && tinh > sla,
    tam_dung: tamDung,
    thieu_hang: th.filter((t) => THB_DANG_MO.includes(t.trang_thai) || t.updated_at >= cur.tu),
    gia_han: nc ?? null,
    da_giai_trinh: !!gt,
    ktv: cur.ktv,
    ktvHo: cur.ktvHo,
  };
}

/** Buoc KTV giu dang qua SLA ma chua ai giai trinh -> phai giai trinh truoc khi thao tac tiep (payload cho frontend). */
export async function canGiaiTrinhTruoc(db: D1Database, type: string, id: string): Promise<{ entity_type: string; entity_id: string; gd: string; so: string; ten: string; qua_gio: number } | null> {
  const t = await trangThaiBuoc(db, type, id);
  if (!t || t.giai_trinh !== "ktv" || !t.qua_han || t.da_giai_trinh) return null;
  return { entity_type: type, entity_id: id, gd: t.gd, so: t.so, ten: t.ten, qua_gio: t.qua_gio };
}

/** Ben chiu trach nhiem hop le theo chu buoc (loc ly do cham khi giai trinh). Ly do chua gan ben -> luon hop le.
 *  Frontend frontend/src/lib/buoc.ts BEN_THEO_CHU phai giong het. */
export const BEN_THEO_CHU: Record<string, string[]> = {
  ktv: ["ktv", "gs", "van_chuyen", "ngoai_canh"],
  kho: ["kho", "van_chuyen", "ktv", "ngoai_canh"],
  admin: ["admin_bh", "kho", "ktv", "ngoai_canh"],
  nv: ["nv", "admin_bh", "kho", "ngoai_canh"],
  ketoan: ["ke_toan", "admin_bh", "ngoai_canh"],
};
