import { Hono } from "hono";
import type { AppUser, Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { BUOC, BUOC_DUNG, BUOC_KTV, BUOC_MAP, cauHinhBuoc, luuCauHinhBuoc, sqlQuaHan } from "../lib/buoc";
import { BEN_THEO_CHU, GT_ID, GT_TYPE, SQL_TAM_DUNG, buocCuaBo, buocHienTai, scopeBuoc, soGioQua, sqlDaGiaiTrinh, sqlQuaHanX, trangThaiBuoc } from "../lib/giaiTrinh";
import { allRowsSql } from "./traCuu";
import { isGsOfKtv } from "../lib/gs";
import { addLog, type LogEntityType } from "../lib/logs";
import { nowVN } from "../lib/vnTime";

// 15/11/2026 - quan tri theo buoc (yeu cau doi tac): danh muc buoc + SLA, so don dang dung tung buoc, danh sach can
// giai trinh (KTV / Giam sat / BO), ghi giai trinh, cau hinh SLA (Admin he thong).

const buoc = new Hono<{ Bindings: Env }>();
buoc.use("*", verifySessionMiddleware, loadUser);

buoc.get("/", async (c) => {
  const ch = await cauHinhBuoc(c.env.DB);
  return c.json({ buoc: BUOC.map((b) => ({ ...b, sla_mac_dinh: b.sla, sla: ch.sla[b.gd] ?? b.sla })), len_gs: ch.len_gs });
});

buoc.put("/cau-hinh", async (c) => {
  const user = c.get("user");
  if (!user.la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ sla?: Record<string, number>; len_gs?: number }>().catch(() => ({}) as { sla?: Record<string, number>; len_gs?: number });
  const cur = await cauHinhBuoc(c.env.DB);
  const sla = { ...cur.sla };
  for (const [k, v] of Object.entries(body.sla || {})) {
    if (!BUOC_MAP[k] || BUOC_MAP[k].ket_thuc) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 720) return c.json({ error: "INVALID_SLA" }, 400);
    sla[k] = Math.round(n * 10) / 10;
  }
  let len_gs = cur.len_gs;
  if (body.len_gs !== undefined) {
    const n = Number(body.len_gs);
    if (!Number.isFinite(n) || n < 0 || n > 720) return c.json({ error: "INVALID_SLA" }, 400);
    len_gs = n;
  }
  await luuCauHinhBuoc(c.env.DB, { sla, len_gs });
  return c.json({ ok: true });
});

// So don dang dung o tung buoc (trong pham vi user) + so qua han + so qua han chua giai trinh.
export type DangDungRow = { gd: string; tong: number; qua_han: number; chua_gt: number; tam_dung: number };
export async function demDangDung(db: D1Database, user: AppUser): Promise<DangDungRow[]> {
  const ch = await cauHinhBuoc(db);
  const sc = scopeBuoc(user);
  let extra = "";
  const eb: unknown[] = [];
  // NV thuan: chi don vi duoc giao cho minh.
  if (user.la_nv_sua_chua && !(user.la_qtri || user.la_admin_bh || user.la_kho || user.la_ke_toan || user.la_giam_sat || user.la_view)) {
    extra = " AND x.nguoi_sua_chua = ?";
    eb.push(user.email);
  }
  const qh = sqlQuaHanX(ch, BUOC_DUNG);
  const { results } = await db.prepare(
    `SELECT x.giai_doan AS gd, COUNT(*) AS tong, SUM(CASE WHEN ${qh.sql} THEN 1 ELSE 0 END) AS qua_han,
       SUM(CASE WHEN ${qh.sql} AND NOT ${sqlDaGiaiTrinh()} THEN 1 ELSE 0 END) AS chua_gt,
       SUM(CASE WHEN ${SQL_TAM_DUNG} THEN 1 ELSE 0 END) AS tam_dung
     FROM ${allRowsSql(sc.where, BUOC_DUNG)} WHERE x.giai_doan IN (${BUOC_DUNG.map(() => "?").join(",")})${extra} GROUP BY x.giai_doan`,
  )
    .bind(...qh.binds, ...qh.binds, ...sc.binds, ...sc.binds, ...BUOC_DUNG, ...eb)
    .all<DangDungRow>();
  return results;
}
buoc.get("/dang-dung", async (c) => c.json({ items: await demDangDung(c.env.DB, c.get("user")) }));

// Danh sach viec CAN GIAI TRINH cua chinh user (gom theo doi tuong: thung / phieu tra / don).
//   - KTV: buoc KTV giu, qua SLA, chua ai giai trinh.
//   - Giam sat (TNGS): buoc KTV giu cua KTV khu vuc minh, qua SLA + len_gs, KTV chua giai trinh.
//   - BO (Kho / Admin / NV / Ke toan): buoc minh giu, qua SLA, chua giai trinh.
export type CanGtItem = { gt_type: string; gt_id: string; gd: string; tu: string; so_don: number; ktv: string | null; ids: string; case_id: string | null; mien: string | null; vai: "ktv" | "gs" | "bo"; qua_gio: number };
export async function layCanGiaiTrinh(db: D1Database, user: AppUser): Promise<{ items: CanGtItem[]; len_gs: number }> {
  const ch = await cauHinhBuoc(db);
  const nhom: { vai: "ktv" | "gs" | "bo"; gds: string[]; extra: number; scopeUser: typeof user; extraSql?: string; extraBinds?: unknown[] }[] = [];
  const laKtvThat = user.la_ktv_dvbh || user.la_ve_tinh;
  // 19/11/2026: KTV khong con phai giai trinh (viec KTV qua SLA chuyen Giam sat sau len_gs).
  if (false && laKtvThat) nhom.push({ vai: "ktv", gds: BUOC_KTV, extra: 0, scopeUser: { ...user, la_qtri: false, la_admin_bh: false, la_kho: false, la_ke_toan: false, la_giam_sat: false, la_view: false } });
  if (user.la_giam_sat) nhom.push({ vai: "gs", gds: BUOC_KTV, extra: ch.len_gs, scopeUser: { ...user, la_qtri: false, la_admin_bh: false, la_kho: false, la_ke_toan: false } });
  const boGds = buocCuaBo(user);
  if (boGds.length) {
    const chiNv = user.la_nv_sua_chua && !(user.la_qtri || user.la_admin_bh || user.la_kho || user.la_ke_toan);
    nhom.push({ vai: "bo", gds: boGds, extra: 0, scopeUser: user, extraSql: chiNv ? " AND x.nguoi_sua_chua = ?" : "", extraBinds: chiNv ? [user.email] : [] });
  }
  const out: CanGtItem[] = [];
  for (const n of nhom) {
    const sc = scopeBuoc(n.scopeUser);
    const qh = sqlQuaHanX(ch, n.gds, n.extra);
    // GS: chi khi KTV chua giai trinh (KTV giai trinh roi thi thoi); KTV / BO: chua co ai giai trinh.
    const { results } = await db.prepare(
      `SELECT ${GT_TYPE} AS gt_type, ${GT_ID} AS gt_id, x.giai_doan AS gd, MIN(x.buoc_tu) AS tu, COUNT(*) AS so_don,
          MAX(x.ktv) AS ktv, GROUP_CONCAT(x.id, ', ') AS ids, MAX(x.case_id) AS case_id, MAX(x.mien) AS mien
       FROM ${allRowsSql(sc.where, n.gds)} WHERE ${qh.sql} AND NOT ${sqlDaGiaiTrinh()}${n.extraSql || ""}
       GROUP BY gt_type, gt_id, x.giai_doan ORDER BY tu LIMIT 300`,
    )
      .bind(...sc.binds, ...sc.binds, ...qh.binds, ...(n.extraBinds || []))
      .all<{ gt_type: string; gt_id: string; gd: string; tu: string; so_don: number; ktv: string | null; ids: string; case_id: string | null; mien: string | null }>();
    for (const r of results) out.push({ ...r, vai: n.vai, qua_gio: await soGioQua(db, r.gd, r.tu) });
  }
  return { items: out, len_gs: ch.len_gs };
}
buoc.get("/can-giai-trinh", async (c) => c.json(await layCanGiaiTrinh(c.env.DB, c.get("user"))));

// 16/11/2026: trang thai buoc hien tai cua 1 doi tuong (tam dung cho hang / gia han ngoai canh / da giai trinh).
buoc.get("/trang-thai", async (c) => {
  const type = c.req.query("type") || "";
  const id = c.req.query("id") || "";
  if (!["phieu_gui", "phieu_sc", "phieu_sc_ct", "phieu_tra"].includes(type) || !id) return c.json({ error: "INVALID_ENTITY_TYPE" }, 400);
  return c.json({ item: await trangThaiBuoc(c.env.DB, type, id) });
});

// Lich su giai trinh cua 1 doi tuong (UI chi tiet).
buoc.get("/giai-trinh", async (c) => {
  const ids = (c.req.query("ids") || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
  if (!ids.length) return c.json({ items: [] });
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM giai_trinh_bh WHERE entity_id IN (${ids.map(() => "?").join(",")}) ORDER BY luc DESC LIMIT 100`,
  )
    .bind(...ids)
    .all();
  return c.json({ items: results });
});

buoc.post("/giai-trinh", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ entity_type?: string; entity_id?: string; ly_do?: string; ghi_chu?: string }>().catch(() => ({}) as Record<string, string>);
  const type = String(body.entity_type || "");
  const id = String(body.entity_id || "").trim();
  const lyDo = String(body.ly_do || "").trim();
  if (!["phieu_gui", "phieu_sc", "phieu_sc_ct", "phieu_tra"].includes(type) || !id) return c.json({ error: "INVALID_ENTITY_TYPE" }, 400);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO_CHAM" }, 400);
  const ghiChu = String(body.ghi_chu || "").trim().slice(0, 1000) || null;
  const cur = await buocHienTai(c.env.DB, type, id);
  if (!cur) return c.json({ error: "NOT_FOUND" }, 404);
  const def = BUOC_MAP[cur.gd];
  if (!def || def.ket_thuc) return c.json({ error: "WRONG_STATE" }, 400);

  // Xac dinh vai tro giai trinh + quyen.
  let vai: "ktv" | "gs" | "bo" | null = null;
  const laChuKtv = !!cur.ktv && (cur.ktv === user.email || cur.ktvHo === user.email);
  if (def.giai_trinh === "ktv") {
    if (laChuKtv && (user.la_ktv_dvbh || user.la_ve_tinh)) vai = "ktv";
    else if (user.la_giam_sat && cur.ktv && (await isGsOfKtv(c.env.DB, user.email, cur.ktv))) vai = "gs";
    else if (user.la_qtri || user.la_admin_bh) vai = "bo";
  } else if (def.giai_trinh === "bo") {
    const chu = def.chu;
    if (user.la_qtri || (chu === "kho" && user.la_kho) || (chu === "admin" && user.la_admin_bh) || (chu === "nv" && (user.la_nv_sua_chua || user.la_admin_bh)) || (chu === "ketoan" && user.la_ke_toan)) vai = "bo";
  }
  if (!vai) return c.json({ error: "FORBIDDEN" }, 403);

  const ben = await c.env.DB.prepare("SELECT ben FROM settings_ly_do_cham_bh WHERE noi_dung = ?").bind(lyDo).first<{ ben: string | null }>();
  // 16/11/2026: ly do phai hop voi buoc (VD buoc Kho khong chon "Do sua chua cham").
  if (ben?.ben && BEN_THEO_CHU[def.chu] && !BEN_THEO_CHU[def.chu].includes(ben.ben)) return c.json({ error: "LY_DO_KHONG_HOP_BUOC" }, 400);
  const qua = await soGioQua(c.env.DB, cur.gd, cur.tu);
  await c.env.DB.prepare("INSERT INTO giai_trinh_bh (entity_type, entity_id, giai_doan, vai_tro, ly_do, ben, ghi_chu, qua_gio, nguoi, luc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(type, id, cur.gd, vai, lyDo, ben?.ben ?? null, ghiChu, qua, user.email, nowVN())
    .run();
  const vaiLabel = vai === "ktv" ? "KTV" : vai === "gs" ? "Giám sát" : "BO";
  // Khong dung cum "Lý do chậm" de hook addLog khong ghi trung giai trinh.
  await addLog(c.env.DB, type as LogEntityType, id, null, null, user.email, `📝 Giải trình bước ${def.so} (${vaiLabel}): ${lyDo}${ghiChu ? " | " + ghiChu : ""}`);
  return c.json({ ok: true, vai });
});

export default buoc;
