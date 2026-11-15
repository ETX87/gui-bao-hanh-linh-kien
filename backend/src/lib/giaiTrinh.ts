import type { AppUser } from "../types";
import { nowVN } from "./vnTime";
import { hoursSince } from "./sla";
import { BUOC, BUOC_MAP, cauHinhBuoc, gdTuTrangThai } from "./buoc";
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
    const g = await db.prepare("SELECT trang_thai, admin_tiep_nhan, tu_choi_tt, updated_at, nguoi_tao, nguoi_tao_ho FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; admin_tiep_nhan: number; tu_choi_tt: string | null; updated_at: string; nguoi_tao: string; nguoi_tao_ho: string | null }>();
    if (!g) return null;
    const gd = g.trang_thai === "nhap" ? "thung_nhap" : g.trang_thai === "da_gui" ? "thung_dang_gui" : g.tu_choi_tt === "cho_kho" || g.tu_choi_tt === "cho_ktv" ? "thung_tu_choi" : g.trang_thai === "da_tiep_nhan" && !g.admin_tiep_nhan ? "thung_cho_admin_nhan" : "";
    return gd ? { gd, tu: g.updated_at, ktv: g.nguoi_tao, ktvHo: g.nguoi_tao_ho } : null;
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
