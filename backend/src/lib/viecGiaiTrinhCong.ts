import type { Env } from "../types";
import { BUOC, BUOC_KTV, BUOC_MAP, cauHinhBuoc } from "./buoc";
import { GT_ID, GT_TYPE, sqlDaGiaiTrinh, sqlQuaHanX } from "./giaiTrinh";
import { allRowsSql } from "../routes/traCuu";
import { hoursSince, parseVn } from "./sla";
import { nowVN } from "./vnTime";
import { guiAnhChupDu, type KetQuaCong, type ViecCong } from "./congNhiemVu";

// 23/11/2026 - Day viec "CAN GIAI TRINH" (buoc qua SLA, chua ai giai trinh) len App Nhiem vu eOffice.
// Dung DUNG luat cua man "Can giai trinh" (routes/buoc.ts layCanGiaiTrinh), nhung tinh 1 lan cho ca he thong roi chia
// cho tung nguoi (thay vi chay truy van rieng cho moi nguoi):
//   - Buoc BO giu (Kho / Admin BH / NV / Ke toan) qua SLA -> moi tai khoan giu vai do, cung mien (chua gan / Ca 2 mien
//     = thay het; don chua khai bao mien hien cho moi mien). NV thuan chi nhan don duoc giao cho minh.
//   - Buoc KTV giu qua SLA + len_gs -> Giam sat phu trach khu vuc cua KTV (khu_vuc_gs_bh).
//   - KTV khong phai giai trinh (19/11/2026). Admin he thong khong nhan (chi xem) tru khi co vai tro xu ly.
// id viec = "GT-<ma doi tuong>-<buoc>" (on dinh suot lan dung buoc do). Giai trinh xong -> lan anh chup sau tu go,
// va POST /buoc/giai-trinh gui "xong" ngay.

export const idViecGt = (gtId: string, gd: string) => `GT-${gtId}-${gd}`;

type Row = { gt_type: string; gt_id: string; gd: string; tu: string; so_don: number; ktv: string | null; mien: string | null; nv: string | null };
type U = { email: string; mien: string | null; la_kho: number; la_admin_bh: number; la_nv_sua_chua: number; la_ke_toan: number; la_giam_sat: number };

function fmtGio(h: number): string {
  const g = Math.max(0, Math.round(h));
  if (g < 24) return `${g} giờ`;
  return `${Math.floor(g / 24)} ngày${g % 24 ? ` ${g % 24} giờ` : ""}`;
}

async function layRows(db: D1Database, gds: string[], extra: number): Promise<Row[]> {
  const ch = await cauHinhBuoc(db);
  const qh = sqlQuaHanX(ch, gds, extra);
  const { results } = await db
    .prepare(
      `SELECT ${GT_TYPE} AS gt_type, ${GT_ID} AS gt_id, x.giai_doan AS gd, MIN(x.buoc_tu) AS tu, COUNT(*) AS so_don,
          MAX(x.ktv) AS ktv, MAX(x.mien) AS mien, MAX(x.nguoi_sua_chua) AS nv
       FROM ${allRowsSql("1=1", gds)} WHERE ${qh.sql} AND NOT ${sqlDaGiaiTrinh()}
       GROUP BY gt_type, gt_id, x.giai_doan ORDER BY tu LIMIT 5000`,
    )
    .bind(...qh.binds)
    .all<Row>();
  return results;
}

/** Dung danh sach viec theo tung nguoi (gom ca nguoi khong co viec, items rong). */
export async function dungViecGiaiTrinh(env: Env): Promise<{ email: string; items: ViecCong[] }[]> {
  const db = env.DB;
  const ch = await cauHinhBuoc(db);
  const boGds = BUOC.filter((b) => b.giai_trinh === "bo").map((b) => b.gd);
  const [boRows, gsRows] = await Promise.all([layRows(db, boGds, 0), layRows(db, BUOC_KTV, ch.len_gs)]);

  const { results: users } = await db
    .prepare(
      `SELECT lower(email) AS email, mien, la_kho, la_admin_bh, la_nv_sua_chua, la_ke_toan, la_giam_sat FROM users
       WHERE bi_khoa = 0 AND trang_thai_duyet = 'Da duyet'
         AND (la_kho = 1 OR la_admin_bh = 1 OR la_nv_sua_chua = 1 OR la_ke_toan = 1 OR la_giam_sat = 1)`,
    )
    .all<U>();
  const { results: gsMap } = await db
    .prepare("SELECT lower(k.email_dang_nhap) AS ktv, lower(x.gs_email) AS gs FROM ktv_lien_he_bh k JOIN khu_vuc_gs_bh x ON x.khu_vuc_ma = k.khu_vuc_ma WHERE k.email_dang_nhap IS NOT NULL")
    .all<{ ktv: string; gs: string }>();
  const { results: tenRows } = await db.prepare("SELECT lower(email) AS email, ten FROM users").all<{ email: string; ten: string | null }>();
  const ten = new Map(tenRows.map((r) => [r.email, r.ten || r.email]));
  const gsCuaKtv = new Map<string, Set<string>>();
  for (const r of gsMap) {
    if (!gsCuaKtv.has(r.ktv)) gsCuaKtv.set(r.ktv, new Set());
    gsCuaKtv.get(r.ktv)!.add(r.gs);
  }

  const base = (env.FRONTEND_URL || "https://suachua.dichvu3t.workers.dev").replace(/\/+$/, "");
  const ds = new Map<string, { item: ViecCong; qua: number }[]>(users.map((u) => [u.email, []]));
  const them = (email: string, r: Row, extra: number, vai: "bo" | "gs") => {
    const list = ds.get(email);
    if (!list) return;
    const b = BUOC_MAP[r.gd];
    const sla = ch.sla[r.gd] ?? b?.sla ?? 24;
    const qua = hoursSince(r.tu) - sla - extra;
    const ktvTen = r.ktv ? ten.get(r.ktv.toLowerCase()) || r.ktv : null;
    const phan = [
      `${r.gt_id} · B${b?.so ?? "?"} ${b?.ten ?? r.gd}`,
      `quá SLA ${fmtGio(hoursSince(r.tu) - sla)}`,
      r.so_don > 1 ? `${r.so_don} đơn` : "",
      vai === "gs" && ktvTen ? `KTV ${ktvTen}` : "",
    ].filter(Boolean);
    list.push({
      qua,
      item: {
        id: idViecGt(r.gt_id, r.gd),
        tag: vai === "gs" ? "Giải trình (GS)" : "Giải trình chậm",
        title: phan.join(" · ").slice(0, 200),
        link: `${base}/${encodeURIComponent(r.gt_id)}`,
        khan: hoursSince(r.tu) - sla >= sla * 2, // qua 3 x SLA = muc do (cung muc mau cua app)
      },
    });
  };

  const coMien = (u: U, r: Row) => !u.mien || u.mien === "ALL" || !r.mien || r.mien === u.mien;
  for (const r of boRows) {
    const chu = BUOC_MAP[r.gd]?.chu;
    for (const u of users) {
      const coVai = (chu === "kho" && u.la_kho) || (chu === "admin" && u.la_admin_bh) || (chu === "ketoan" && u.la_ke_toan) || (chu === "nv" && u.la_nv_sua_chua);
      if (!coVai) continue;
      const laXuLy = u.la_admin_bh || u.la_kho || u.la_ke_toan;
      if (chu === "nv" && !laXuLy && (r.nv || "").toLowerCase() !== u.email) continue; // NV thuan: chi don cua minh
      if (laXuLy && !coMien(u, r)) continue;
      them(u.email, r, 0, "bo");
    }
  }
  const laGs = new Set(users.filter((u) => u.la_giam_sat).map((u) => u.email));
  for (const r of gsRows) {
    const gss = r.ktv ? gsCuaKtv.get(r.ktv.toLowerCase()) : undefined;
    if (!gss) continue;
    for (const gs of gss) if (laGs.has(gs)) them(gs, r, ch.len_gs, "gs");
  }

  return [...ds.entries()].map(([email, list]) => ({
    email,
    items: list.sort((a, b) => Number(!!b.item.khan) - Number(!!a.item.khan) || b.qua - a.qua).map((x) => x.item),
  }));
}

/** Gui anh chup du + luu ket qua vao sync_state.cong_nv_last. */
export async function dayGiaiTrinhLenCong(env: Env): Promise<KetQuaCong & { so_nguoi_co_viec?: number; so_viec?: number }> {
  if (!env.TASK_FEED_KEY) return { ok: false, loi: "CHUA_CO_KHOA" };
  const ds = await dungViecGiaiTrinh(env);
  const kq = await guiAnhChupDu(env, ds);
  const out = { ...kq, so_nguoi_co_viec: ds.filter((d) => d.items.length).length, so_viec: ds.reduce((s, d) => s + d.items.length, 0) };
  const luc = nowVN();
  await env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('cong_nv_last', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify({ ...out, khongRo: Array.isArray(kq.khongRo) ? kq.khongRo.length : 0, luc }), luc)
    .run();
  return out;
}

/** Cron 15 phut: 30 phut / lan. */
export async function maybeDayGiaiTrinhLenCong(env: Env): Promise<void> {
  if (!env.TASK_FEED_KEY) return;
  const r = await env.DB.prepare("SELECT updated_at FROM sync_state WHERE key = 'cong_nv_last'").first<{ updated_at: string }>();
  if (r && parseVn(nowVN()) - parseVn(r.updated_at) < 27 * 60 * 1000) return;
  await dayGiaiTrinhLenCong(env);
}
