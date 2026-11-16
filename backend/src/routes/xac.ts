import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { parsePage } from "../lib/pagination";
import { eqFilters, distinctOpts, timeFilter, joinF, textFilters, sortParam } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { mienScope, mienAllowed } from "../lib/mien";
import { normVi } from "../lib/timKiem";
import { XAC_CHO_GOM, XAC_DX_CHO_GOM, XAC_KQ, XAC_KQ_LABEL, XAC_KQ_SQL, laDx } from "../lib/xac";

// 13/11/2026 - Module quan ly tra xac linh kien (xem migrations/0031_thung_tra_xac.sql).
// Luong: don vi Doi moi + xu ly xac "Tra doi tac" -> danh sach "Xac cho gom" -> Admin BH tao thung tra xac,
// them / bot xac, nhap doi tac + ma EO -> gui Ke toan -> KT kiem tra, duyet (ket thuc, xac = da tra) hoac
// tra lai (bat buoc ly do). Admin sua thung (them / bot xac) toi khi KT duyet.

const xac = new Hono<{ Bindings: Env }>();
xac.use("*", verifySessionMiddleware, loadUser);

const isAdmin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const isKt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
const canView = (u: AppUser) => isAdmin(u) || isKt(u) || u.la_view || u.la_giam_sat;

const LK_XAC = "COALESCE(u.ma_lk_nhan, p.ma_lk)"; // xac Doi moi tinh theo B (linh kien thuc te gui ve)
const LK_DOI = `COALESCE(u.ma_lk_thuc_te, ${LK_XAC})`; // C (doi moi), mac dinh = B
const KH_CASE = "(SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id)";

// 16/11/2026: 1 "xac" = 1 dong cua 2 nguon gop chung (UNION ALL), cung bo cot:
//   - loai 'doi_moi'  : don vi Doi moi + xu ly xac "Tra doi tac" (xac = LK B, SL 1)       - bang phieu_sua_chua_bh_ct
//   - loai 'sua_chua' : linh kien cap cho sua chua da xuat (xac = LK cu thao ra, SL de xuat) - bang de_xuat_linh_kien_bh
// condU (alias u, p, g) / condD (alias d, u, p, g) = dieu kien rieng tung nguon; ben ngoai loc theo cot x.*.
function xacFrom(condU: string, condD: string): string {
  return `FROM (
    SELECT u.id, 'doi_moi' AS loai, u.id AS unit_id, u.parent_id, 1 AS so_luong, p.ma_lk, u.ma_lk_nhan, ${LK_XAC} AS ma_lk_xac,
      u.ma_lk_thuc_te, ${LK_DOI} AS ma_lk_doi, p.case_id, p.mien, p.mo_ta_loi, p.tim_kiem, g.nguoi_tao AS ktv, ${KH_CASE} AS khach_hang,
      u.trang_thai, u.xac_tt, u.thung_xac_id, u.xac_xl_boi, u.xac_xl_luc, u.xac_xl_ghi_chu, u.nguoi_sua_chua,
      u.created_at, u.updated_at, COALESCE(u.xac_xl_luc, u.updated_at) AS ngay_xl
    FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
    WHERE ${condU}
    UNION ALL
    SELECT d.id, 'sua_chua', d.unit_id, u.parent_id, d.so_luong, p.ma_lk, u.ma_lk_nhan, d.ma_lk,
      d.ma_lk, d.ma_lk, p.case_id, p.mien, p.mo_ta_loi, p.tim_kiem, g.nguoi_tao, ${KH_CASE},
      u.trang_thai, d.xac_tt, d.thung_xac_id, d.xac_xl_boi, d.xac_xl_luc, d.xac_xl_ghi_chu, u.nguoi_sua_chua,
      d.created_at, COALESCE(d.kho_xuat_luc, d.updated_at), COALESCE(d.xac_xl_luc, d.kho_xuat_luc, d.updated_at)
    FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
      LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
    WHERE ${condD}
  ) x`;
}
const XAC_COLS = `x.id, x.loai, x.unit_id, x.parent_id, x.so_luong, x.ma_lk, x.ma_lk_nhan, x.ma_lk_xac, x.ma_lk_thuc_te, x.ma_lk_doi,
  x.case_id, x.mien, x.mo_ta_loi, x.ktv, x.khach_hang, x.trang_thai, x.xac_tt, x.thung_xac_id, x.xac_xl_boi, x.xac_xl_luc,
  x.xac_xl_ghi_chu, x.nguoi_sua_chua, x.created_at, x.updated_at, x.ngay_xl`;
const XAC_NGOAI_U = `u.huong_xu_ly = 'doi_moi' AND u.xac_tt IN (${XAC_KQ_SQL})`;
const XAC_NGOAI_D = `d.xac_tt IN (${XAC_KQ_SQL})`;

// 16/11/2026: loc kieu Excel giong Don BH - loai xac, ket qua, LK A / B / C, KTV gui, NV sua, mien + loc chu tren cot + sap xep.
const LOC_UNIT = { loai: "x.loai", kq: "x.xac_tt", nguoi_gui: "x.ktv", nv: "x.nguoi_sua_chua", lk_a: "x.ma_lk", lk_b: "x.ma_lk_xac", lk: "x.ma_lk_doi", mien: "x.mien" };
const TXT_UNIT = {
  f_id: "x.id || ' ' || x.unit_id",
  f_case: { expr: "x.case_id || ' ' || COALESCE(x.khach_hang,'')", normExpr: "x.tim_kiem" },
  f_mota: { expr: "x.mo_ta_loi", normExpr: "x.tim_kiem" },
};
const SORT_UNIT: Record<string, string> = { id: "x.id", loai: "x.loai", lk: "x.ma_lk_xac", c: "x.ma_lk_doi", sl: "x.so_luong", ktv: "x.ktv", case: "x.case_id", mien: "x.mien", cn: "x.updated_at", xl: "x.ngay_xl", kq: "x.xac_tt" };
const UNIT_KW = ["x.id", "x.unit_id", "x.case_id", "x.ma_lk", "x.ma_lk_xac", tenLkOf("x.ma_lk_xac"), "x.ktv", tenOf("x.ktv"), "x.mo_ta_loi"];

async function logThung(db: D1Database, id: string, tu: string | null, den: string | null, actor: string, ghi: string) {
  await db.prepare("INSERT INTO thung_xac_log_bh (thung_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)").bind(id, tu, den, actor, nowVN(), ghi).run();
}

interface Thung {
  id: string;
  trang_thai: string;
  doi_tac: string | null;
  ma_eo: string | null;
  ghi_chu: string | null;
  mien: string | null;
}
async function getThung(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM thung_xac_bh WHERE id = ?").bind(id).first<Thung>();
}
const SUA_DUOC = ["nhap", "cho_ke_toan"]; // Admin them / bot xac toi khi KT duyet

// So xac (dong) trong thung - ca 2 nguon.
async function demXac(db: D1Database, thungId: string): Promise<number> {
  const r = await db
    .prepare("SELECT (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?1) + (SELECT COUNT(*) FROM de_xuat_linh_kien_bh WHERE thung_xac_id = ?1) AS n")
    .bind(thungId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}
// Ghi nhat ky len don vi (xac sua chua: don vi cua de xuat), giu nguyen trang thai don vi.
async function logXac(db: D1Database, id: string, actor: string, ghi: string) {
  const unitId = laDx(id) ? (await db.prepare("SELECT unit_id FROM de_xuat_linh_kien_bh WHERE id = ?").bind(id).first<{ unit_id: string }>())?.unit_id : id;
  if (!unitId) return;
  const st = await db.prepare("SELECT trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ trang_thai: string }>();
  await addLog(db, "phieu_sc_ct", unitId, st?.trang_thai ?? null, st?.trang_thai ?? null, actor, laDx(id) ? `Xác sửa chữa ${id}: ${ghi}` : `Xác: ${ghi}`);
}

// ---- Danh sach xac (cho gom / da xu ly ngoai thung) ----
xac.get("/xac", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user) && !user.la_view && !user.la_giam_sat) return c.json({ error: "FORBIDDEN" }, 403);
  const nhom = c.req.query("nhom") === "ngoai" ? "ngoai" : "cho_gom";
  const { limit, offset } = parsePage(c, 20, 500);
  const ms = mienScope(user, "x");
  const base = `${nhom === "ngoai" ? xacFrom(XAC_NGOAI_U, XAC_NGOAI_D) : xacFrom(XAC_CHO_GOM, XAC_DX_CHO_GOM)} WHERE 1 = 1${ms.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC_UNIT, base, ms.binds) });
  const kw = kwClause(c.req.query("q"), UNIT_KW, ["x.tim_kiem"]);
  const f = joinF(eqFilters(c, LOC_UNIT), timeFilter(c, "x.updated_at"), timeFilter(c, "x.ngay_xl", "xl"), textFilters(c, TXT_UNIT));
  const so = sortParam(c, SORT_UNIT);
  // Thung dang sua (de them xac): chi lay xac cung mien voi thung (mien NULL thi khong rang buoc).
  const mienThung = c.req.query("mien_thung");
  const mt = mienThung ? { sql: " AND (x.mien = ? OR x.mien IS NULL)", binds: [mienThung] } : { sql: "", binds: [] as string[] };
  const where = `${base}${kw.sql}${f.sql}${mt.sql}`;
  const binds = [...ms.binds, ...kw.binds, ...f.binds, ...mt.binds];
  const [rows, tot] = await Promise.all([
    c.env.DB.prepare(`SELECT ${XAC_COLS} ${where} ORDER BY ${so ? `${so.expr} ${so.dir}, ` : nhom === "ngoai" ? "x.ngay_xl DESC, " : ""}x.updated_at, x.id LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(x.so_luong), 0) AS sl ${where}`).bind(...binds).first<{ n: number; sl: number }>(),
  ]);
  return c.json({ xac: rows.results, total: tot?.n ?? 0, tong_sl: tot?.sl ?? 0 });
});

// Ket qua xac ngoai thung (hang loat): 'ngoai' | 'tieu_huy' | 'that_lac' | 'khong_co'; dua_lai = ve danh sach cho gom.
xac.post("/xac/ngoai", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  type B = { ids?: string[]; ly_do?: string; dua_lai?: boolean; kq?: string };
  const body = await c.req.json<B>().catch(() => ({}) as B);
  const ids = [...new Set((body.ids || []).filter(Boolean))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const kq = body.kq || "ngoai";
  if (!body.dua_lai && !(XAC_KQ as readonly string[]).includes(kq)) return c.json({ error: "INVALID_KQ" }, 400);
  const lyDo = (body.ly_do || "").trim().slice(0, 500) || null;
  const now = nowVN();
  let ok = 0;
  for (const id of ids) {
    const dx = laDx(id);
    const tbl = dx ? "de_xuat_linh_kien_bh AS d" : "phieu_sua_chua_bh_ct AS u";
    const a = dx ? "d" : "u";
    const r = body.dua_lai
      ? await c.env.DB.prepare(`UPDATE ${tbl} SET xac_tt = NULL, xac_xl_boi = NULL, xac_xl_luc = NULL, xac_xl_ghi_chu = NULL WHERE ${a}.id = ? AND ${a}.xac_tt IN (${XAC_KQ_SQL}) AND ${a}.thung_xac_id IS NULL`).bind(id).run()
      : await c.env.DB.prepare(`UPDATE ${tbl} SET xac_tt = ?, xac_xl_boi = ?, xac_xl_luc = ?, xac_xl_ghi_chu = ? WHERE ${a}.id = ? AND ${dx ? XAC_DX_CHO_GOM : XAC_CHO_GOM}`).bind(kq, user.email, now, lyDo, id).run();
    if (r.meta.changes) {
      ok++;
      await logXac(c.env.DB, id, user.email, body.dua_lai ? "đưa lại danh sách chờ gom thùng trả xác" : `${XAC_KQ_LABEL[kq]}${lyDo ? ` | ${lyDo}` : ""}`);
    }
  }
  return c.json({ ok, bo_qua: ids.length - ok });
});

// ---- Thung tra xac ----
const LOC_THUNG = { nguoi_tao: "t.nguoi_tao", doi_tac: "t.doi_tac", mien: "t.mien", kt_boi: "t.kt_boi" };

xac.get("/thung", async (c) => {
  const user = c.get("user");
  if (!canView(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const tt = (c.req.query("trang_thai") || "nhap").split(",").filter(Boolean);
  if (!isAdmin(user) && tt.includes("nhap")) return c.json({ thung: [], total: 0, loc: {} });
  const { limit, offset } = parsePage(c, 20, 200);
  const ms = mienScope(user, "t");
  const ttSql = `t.trang_thai IN (${tt.map(() => "?").join(",")})`;
  const traLai = c.req.query("tra_lai") === "1" ? " AND t.ly_do_tra_lai IS NOT NULL" : "";
  const base = `FROM thung_xac_bh t WHERE ${ttSql}${traLai}${ms.sql}`;
  const bb = [...tt, ...ms.binds];
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC_THUNG, base, bb) });
  // Tim ca theo ma don vi / case / linh kien ben trong thung.
  const trong = "(SELECT group_concat(u.id || ' ' || COALESCE(p.case_id,'') || ' ' || COALESCE(u.ma_lk_nhan, p.ma_lk), ' ') FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.thung_xac_id = t.id)";
  const trongDx = "(SELECT group_concat(d.id || ' ' || d.unit_id || ' ' || d.ma_lk, ' ') FROM de_xuat_linh_kien_bh d WHERE d.thung_xac_id = t.id)";
  const tk = "(SELECT group_concat(p.tim_kiem, ' ') FROM phieu_sua_chua_bh p WHERE p.id IN (SELECT u.parent_id FROM phieu_sua_chua_bh_ct u WHERE u.thung_xac_id = t.id))";
  const kw = kwClause(c.req.query("q"), ["t.id", "t.ma_eo", "t.doi_tac", "t.ghi_chu", "t.nguoi_tao", tenOf("t.nguoi_tao"), trong, trongDx], [tk]);
  const f = joinF(eqFilters(c, LOC_THUNG), timeFilter(c, "t.created_at"));
  const where = `${base}${kw.sql}${f.sql}`;
  const binds = [...bb, ...kw.binds, ...f.binds];
  const [rows, tot] = await Promise.all([
    c.env.DB.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.thung_xac_id = t.id) + (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.thung_xac_id = t.id) AS so_xac
       ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n ${where}`).bind(...binds).first<{ n: number }>(),
  ]);
  return c.json({ thung: rows.results, total: tot?.n ?? 0 });
});

xac.get("/thung/:id", async (c) => {
  const user = c.get("user");
  if (!canView(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await c.env.DB.prepare("SELECT * FROM thung_xac_bh WHERE id = ?").bind(c.req.param("id")).first<Thung & Record<string, unknown>>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  const [units, logs] = await Promise.all([
    c.env.DB.prepare(`SELECT ${XAC_COLS} ${xacFrom("u.thung_xac_id = ?1", "d.thung_xac_id = ?1")} ORDER BY x.ma_lk_xac, x.id`).bind(t.id).all(),
    c.env.DB.prepare("SELECT * FROM thung_xac_log_bh WHERE thung_id = ? ORDER BY id DESC").bind(t.id).all(),
  ]);
  return c.json({ thung: t, xac: units.results, logs: logs.results });
});

// Them xac vao thung (dung chung cho tao thung + them). Tra danh sach loi theo dong.
async function themXac(db: D1Database, t: Thung, ids: string[], actor: string): Promise<{ ok: number; loi: { id: string; error: string }[]; mien: string | null }> {
  const loi: { id: string; error: string }[] = [];
  let ok = 0;
  let mien = t.mien;
  for (const id of ids) {
    const dx = laDx(id);
    const u = await db
      .prepare(
        dx
          ? `SELECT d.id, p.mien, (CASE WHEN ${XAC_DX_CHO_GOM} THEN 1 ELSE 0 END) AS hop_le FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.id = ?`
          : `SELECT u.id, p.mien, (CASE WHEN ${XAC_CHO_GOM} THEN 1 ELSE 0 END) AS hop_le FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?`,
      )
      .bind(id)
      .first<{ id: string; mien: string | null; hop_le: number }>();
    if (!u) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    if (!u.hop_le) {
      loi.push({ id, error: "XAC_KHONG_CHO_GOM" });
      continue;
    }
    if (mien && u.mien && u.mien !== mien) {
      loi.push({ id, error: "MIEN_MISMATCH" });
      continue;
    }
    const r = dx
      ? await db.prepare(`UPDATE de_xuat_linh_kien_bh AS d SET thung_xac_id = ?, xac_tt = 'trong_thung' WHERE d.id = ? AND ${XAC_DX_CHO_GOM}`).bind(t.id, id).run()
      : await db.prepare(`UPDATE phieu_sua_chua_bh_ct AS u SET thung_xac_id = ?, xac_tt = 'trong_thung', updated_at = updated_at WHERE u.id = ? AND ${XAC_CHO_GOM}`).bind(t.id, id).run();
    if (!r.meta.changes) {
      loi.push({ id, error: "XAC_KHONG_CHO_GOM" });
      continue;
    }
    if (!mien && u.mien) {
      mien = u.mien;
      await db.prepare("UPDATE thung_xac_bh SET mien = ? WHERE id = ? AND mien IS NULL").bind(mien, t.id).run();
    }
    ok++;
    await logXac(db, id, actor, `đưa vào thùng trả xác ${t.id}`);
  }
  if (ok) {
    await db.prepare("UPDATE thung_xac_bh SET updated_at = ? WHERE id = ?").bind(nowVN(), t.id).run();
    await logThung(db, t.id, t.trang_thai, t.trang_thai, actor, `Thêm ${ok} xác: ${ids.filter((i) => !loi.some((l) => l.id === i)).join(", ")}`);
  }
  return { ok, loi, mien };
}

xac.post("/thung", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ doi_tac?: string; ghi_chu?: string; ma_eo?: string; unit_ids?: string[] }>().catch(() => ({}) as { doi_tac?: string; ghi_chu?: string; ma_eo?: string; unit_ids?: string[] });
  const ids = [...new Set((body.unit_ids || []).filter(Boolean))].slice(0, 500);
  const id = await nextSequentialId(c.env.DB, "thung_xac_bh", "TX");
  const now = nowVN();
  await c.env.DB.prepare("INSERT INTO thung_xac_bh (id, trang_thai, doi_tac, ma_eo, ghi_chu, nguoi_tao, created_at, updated_at) VALUES (?, 'nhap', ?, ?, ?, ?, ?, ?)")
    .bind(id, (body.doi_tac || "").trim() || null, (body.ma_eo || "").trim() || null, (body.ghi_chu || "").trim() || null, user.email, now, now)
    .run();
  await logThung(c.env.DB, id, null, "nhap", user.email, "Tạo thùng trả xác");
  const r = ids.length ? await themXac(c.env.DB, { id, trang_thai: "nhap", doi_tac: null, ma_eo: null, ghi_chu: null, mien: null }, ids, user.email) : { ok: 0, loi: [] };
  return c.json({ id, ok: r.ok, loi: r.loi }, 201);
});

xac.patch("/thung/:id", async (c) => {
  const user = c.get("user");
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  // Admin sua khi nhap / cho KT; Ke toan sua (kiem tra, bo sung ma EO) khi cho KT.
  const duoc = (isAdmin(user) && SUA_DUOC.includes(t.trang_thai)) || (isKt(user) && t.trang_thai === "cho_ke_toan");
  if (!duoc) return c.json({ error: SUA_DUOC.includes(t.trang_thai) ? "FORBIDDEN" : "WRONG_STATE" }, SUA_DUOC.includes(t.trang_thai) ? 403 : 400);
  const body = await c.req.json<{ doi_tac?: string; ma_eo?: string; ghi_chu?: string }>().catch(() => ({}) as { doi_tac?: string; ma_eo?: string; ghi_chu?: string });
  const moi = {
    doi_tac: body.doi_tac === undefined ? t.doi_tac : body.doi_tac.trim().slice(0, 200) || null,
    ma_eo: body.ma_eo === undefined ? t.ma_eo : body.ma_eo.trim().slice(0, 100) || null,
    ghi_chu: body.ghi_chu === undefined ? t.ghi_chu : body.ghi_chu.trim().slice(0, 2000) || null,
  };
  const doi: string[] = [];
  if (moi.doi_tac !== t.doi_tac) doi.push(`Đối tác: ${t.doi_tac || "—"} → ${moi.doi_tac || "—"}`);
  if (moi.ma_eo !== t.ma_eo) doi.push(`Mã EO: ${t.ma_eo || "—"} → ${moi.ma_eo || "—"}`);
  if (moi.ghi_chu !== t.ghi_chu) doi.push("Sửa ghi chú");
  if (!doi.length) return c.json({ ok: true, doi: 0 });
  await c.env.DB.prepare("UPDATE thung_xac_bh SET doi_tac = ?, ma_eo = ?, ghi_chu = ?, updated_at = ? WHERE id = ?").bind(moi.doi_tac, moi.ma_eo, moi.ghi_chu, nowVN(), t.id).run();
  await logThung(c.env.DB, t.id, t.trang_thai, t.trang_thai, user.email, (isAdmin(user) ? "" : "Kế toán: ") + doi.join(" | "));
  return c.json({ ok: true, doi: doi.length });
});

xac.post("/thung/:id/xac", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (!SUA_DUOC.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ unit_ids?: string[] }>().catch(() => ({}) as { unit_ids?: string[] });
  const ids = [...new Set((body.unit_ids || []).filter(Boolean))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  return c.json(await themXac(c.env.DB, t, ids, user.email));
});

xac.delete("/thung/:id/xac/:unitId", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (!SUA_DUOC.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const uid = c.req.param("unitId");
  const r = laDx(uid)
    ? await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET thung_xac_id = NULL, xac_tt = NULL WHERE id = ? AND thung_xac_id = ?").bind(uid, t.id).run()
    : await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET thung_xac_id = NULL, xac_tt = NULL, updated_at = updated_at WHERE id = ? AND thung_xac_id = ?").bind(uid, t.id).run();
  if (!r.meta.changes) return c.json({ error: "NOT_FOUND" }, 404);
  await logXac(c.env.DB, uid, user.email, `bỏ khỏi thùng trả xác ${t.id} (về danh sách chờ gom)`);
  const con = await demXac(c.env.DB, t.id);
  // Thung rong -> bo rang buoc mien de them xac mien khac.
  await c.env.DB.prepare(`UPDATE thung_xac_bh SET updated_at = ?${con === 0 ? ", mien = NULL" : ""} WHERE id = ?`).bind(nowVN(), t.id).run();
  await logThung(c.env.DB, t.id, t.trang_thai, t.trang_thai, user.email, `Bỏ xác ${uid}`);
  return c.json({ ok: true });
});

xac.delete("/thung/:id", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "nhap") return c.json({ error: "WRONG_STATE" }, 400);
  if ((await demXac(c.env.DB, t.id)) > 0) return c.json({ error: "THUNG_CON_XAC" }, 400);
  await c.env.DB.batch([c.env.DB.prepare("DELETE FROM thung_xac_log_bh WHERE thung_id = ?").bind(t.id), c.env.DB.prepare("DELETE FROM thung_xac_bh WHERE id = ?").bind(t.id)]);
  return c.json({ ok: true });
});

// Chuyen trang thai thung (CAS theo trang thai cu).
async function chuyen(db: D1Database, t: Thung, den: string, set: string, binds: unknown[], actor: string, ghi: string): Promise<boolean> {
  const r = await db.prepare(`UPDATE thung_xac_bh SET trang_thai = ?, updated_at = ?${set} WHERE id = ? AND trang_thai = ?`).bind(den, nowVN(), ...binds, t.id, t.trang_thai).run();
  if (!r.meta.changes) return false;
  await logThung(db, t.id, t.trang_thai, den, actor, ghi);
  return true;
}

xac.post("/thung/:id/gui-kt", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (t.trang_thai !== "nhap") return c.json({ error: "WRONG_STATE" }, 400);
  if (!t.ma_eo) return c.json({ error: "REQUIRE_MA_EO" }, 400);
  const n = await demXac(c.env.DB, t.id);
  if (!n) return c.json({ error: "THUNG_RONG" }, 400);
  const ok = await chuyen(c.env.DB, t, "cho_ke_toan", ", gui_kt_boi = ?, gui_kt_luc = ?, ly_do_tra_lai = NULL", [user.email, nowVN()], user.email, `Gửi Kế toán duyệt (${n} xác, EO ${t.ma_eo})`);
  return ok ? c.json({ ok: true }) : c.json({ error: "WRONG_STATE" }, 400);
});

xac.post("/thung/:id/huy-gui", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "cho_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const ok = await chuyen(c.env.DB, t, "nhap", "", [], user.email, "Admin BH huỷ gửi Kế toán");
  return ok ? c.json({ ok: true }) : c.json({ error: "WRONG_STATE" }, 400);
});

xac.post("/thung/:id/kt-duyet", async (c) => {
  const user = c.get("user");
  if (!isKt(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (t.trang_thai !== "cho_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ghi_chu?: string }>().catch(() => ({}) as { ghi_chu?: string });
  if (!t.ma_eo) return c.json({ error: "REQUIRE_MA_EO" }, 400);
  const now = nowVN();
  const ok = await chuyen(c.env.DB, t, "da_duyet", ", kt_boi = ?, kt_luc = ?, ly_do_tra_lai = NULL", [user.email, now], user.email, `Kế toán duyệt — kết thúc trả xác${body.ghi_chu?.trim() ? ` | ${body.ghi_chu.trim().slice(0, 500)}` : ""}`);
  if (!ok) return c.json({ error: "WRONG_STATE" }, 400);
  const { results } = await c.env.DB.prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?1 UNION ALL SELECT id FROM de_xuat_linh_kien_bh WHERE thung_xac_id = ?1").bind(t.id).all<{ id: string }>();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET xac_tt = 'da_tra', updated_at = updated_at WHERE thung_xac_id = ?").bind(t.id),
    c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET xac_tt = 'da_tra' WHERE thung_xac_id = ?").bind(t.id),
  ]);
  for (const u of results) await logXac(c.env.DB, u.id, user.email, `Kế toán duyệt thùng trả xác ${t.id} (EO ${t.ma_eo}) — đã trả đối tác`);
  return c.json({ ok: true, so_xac: results.length });
});

xac.post("/thung/:id/kt-tra-lai", async (c) => {
  const user = c.get("user");
  if (!isKt(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!mienAllowed(user, t.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  if (t.trang_thai !== "cho_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const lyDo = (body.ly_do || "").trim().slice(0, 1000);
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const ok = await chuyen(c.env.DB, t, "nhap", ", ly_do_tra_lai = ?, tra_lai_boi = ?, tra_lai_luc = ?", [lyDo, user.email, nowVN()], user.email, `Kế toán trả lại Admin BH: ${lyDo}`);
  return ok ? c.json({ ok: true }) : c.json({ error: "WRONG_STATE" }, 400);
});


// ---- Import ket qua xac hang loat (16/11/2026) ----
// Nguyen van: "thêm tính năng import hàng loạt (có file mẫu kèm sheet hướng dẫn chi tiết có dữ liệu các lựa chọn mặc định cần
// setup theo)" - chot: import KET QUA XAC. Moi dong: ma xac (DH-..-n / DX-..) + ket qua + (ma thung khi dua vao thung) + ghi chu.
// POST /import {rows, ap_dung}: ap_dung=false -> chi kiem tra tung dong (xem truoc); true -> ghi cac dong hop le (theo lo, CAS).
// Ma thung "MOI" / "MOI-<ten>" (khong phan biet dau / hoa thuong) = tao thung moi, cung ten -> cung 1 thung.
const IMPORT_MAX = 1000;
const KQ_IMPORT: [string, string[]][] = [
  ["vao_thung", ["vao thung", "dua vao thung", "dua vao thung tra xac", "thung", "tra doi tac"]],
  ["tieu_huy", ["tieu huy", "xac da tieu huy", "da tieu huy"]],
  ["that_lac", ["that lac", "xac that lac"]],
  ["khong_co", ["khong co xac", "khong co"]],
  ["ngoai", ["ngoai", "tra ngoai he thong", "da tra ngoai he thong", "da xu ly ngoai he thong", "xu ly ngoai"]],
  ["dua_lai", ["dua lai", "dua lai cho gom"]],
];
const chuan = (s: string) => normVi(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function kqImport(raw: string): string | null {
  const n = chuan(raw);
  if (!n) return null;
  for (const [k, alias] of KQ_IMPORT) if (n === k.replace("_", " ") || alias.includes(n)) return k;
  return null;
}
const laThungMoi = (s: string) => /^moi(\s|$)/.test(chuan(s));

interface ImportRow { dong?: number; ma?: string; kq?: string; thung?: string; ghi_chu?: string }
interface XacInfo { id: string; mien: string | null; cho_gom: number; xac_tt: string | null; thung_xac_id: string | null }

async function layXac(db: D1Database, ids: string[]): Promise<Map<string, XacInfo>> {
  const out = new Map<string, XacInfo>();
  const units = ids.filter((i) => !laDx(i));
  const dxs = ids.filter((i) => laDx(i));
  for (let i = 0; i < units.length; i += 90) {
    const part = units.slice(i, i + 90);
    const { results } = await db
      .prepare(`SELECT u.id, p.mien, (CASE WHEN ${XAC_CHO_GOM} THEN 1 ELSE 0 END) AS cho_gom, u.xac_tt, u.thung_xac_id FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id IN (${part.map(() => "?").join(",")}) AND u.huong_xu_ly = 'doi_moi'`)
      .bind(...part)
      .all<XacInfo>();
    for (const r of results) out.set(r.id, r);
  }
  for (let i = 0; i < dxs.length; i += 90) {
    const part = dxs.slice(i, i + 90);
    const { results } = await db
      .prepare(`SELECT d.id, p.mien, (CASE WHEN ${XAC_DX_CHO_GOM} THEN 1 ELSE 0 END) AS cho_gom, d.xac_tt, d.thung_xac_id FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE d.id IN (${part.map(() => "?").join(",")})`)
      .bind(...part)
      .all<XacInfo>();
    for (const r of results) out.set(r.id, r);
  }
  return out;
}

xac.post("/import", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ rows?: ImportRow[]; ap_dung?: boolean }>().catch(() => ({}) as { rows?: ImportRow[]; ap_dung?: boolean });
  const input = (body.rows || []).filter((r) => (r.ma || "").trim() || (r.kq || "").trim());
  if (!input.length) return c.json({ error: "MISSING_ROWS" }, 400);
  if (input.length > IMPORT_MAX) return c.json({ error: "IMPORT_QUA_NHIEU", message: `Tối đa ${IMPORT_MAX} dòng / lần.` }, 400);

  const ids = [...new Set(input.map((r) => (r.ma || "").trim().toUpperCase()).filter(Boolean))];
  const info = await layXac(c.env.DB, ids);
  const maThung = [...new Set(input.map((r) => (r.thung || "").trim().toUpperCase()).filter((t) => t && !laThungMoi(t)))];
  const thungs = new Map<string, Thung>();
  for (let i = 0; i < maThung.length; i += 90) {
    const part = maThung.slice(i, i + 90);
    const { results } = await c.env.DB.prepare(`SELECT * FROM thung_xac_bh WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part).all<Thung>();
    for (const t of results) thungs.set(t.id, t);
  }

  const daGap = new Set<string>();
  const mienNhom = new Map<string, string | null>(); // mien cua tung thung (co san / moi) sau khi nhan cac dong truoc
  for (const t of thungs.values()) mienNhom.set(t.id, t.mien);
  type Kq = { dong: number; ma: string; kq: string | null; thung: string | null; ghi_chu: string | null; ok: boolean; loi?: string };
  const out: Kq[] = input.map((r, i) => {
    const dong = r.dong ?? i + 2;
    const ma = (r.ma || "").trim().toUpperCase();
    const kq = kqImport(r.kq || "");
    const thungRaw = (r.thung || "").trim();
    const ghi = (r.ghi_chu || "").trim().slice(0, 500) || null;
    const base = { dong, ma, kq, thung: null as string | null, ghi_chu: ghi };
    const loi = (m: string): Kq => ({ ...base, ok: false, loi: m });
    if (!ma) return loi("Thiếu mã xác");
    if (daGap.has(ma)) return loi("Trùng mã xác trong file");
    daGap.add(ma);
    const x = info.get(ma);
    if (!x) return loi("Không tìm thấy xác (mã đơn vị Đổi mới DH-…-n hoặc mã đề xuất DX-…)");
    if (!mienAllowed(user, x.mien)) return loi("Xác thuộc miền khác miền bạn phụ trách");
    if (!kq) return loi(`Kết quả "${r.kq || ""}" không hợp lệ — xem sheet Hướng dẫn`);
    if (kq === "dua_lai") {
      if (!x.xac_tt || !(XAC_KQ as readonly string[]).includes(x.xac_tt) || x.thung_xac_id) return loi("Chỉ đưa lại được xác đang ở tab \"Đã xử lý khác\"");
      return { ...base, ok: true };
    }
    if (!x.cho_gom) return loi(x.thung_xac_id ? `Xác đang trong thùng ${x.thung_xac_id}` : x.xac_tt ? `Xác đã có kết quả: ${XAC_KQ_LABEL[x.xac_tt] || x.xac_tt}` : "Xác không ở danh sách chờ gom");
    if (kq !== "vao_thung") return { ...base, ok: true };
    if (!thungRaw) return loi("Kết quả \"Vào thùng\" cần cột Mã thùng (TX-… hoặc MOI)");
    let key: string;
    if (laThungMoi(thungRaw)) key = `MOI:${chuan(thungRaw)}`;
    else {
      const t = thungs.get(thungRaw.toUpperCase());
      if (!t) return loi(`Không tìm thấy thùng ${thungRaw}`);
      if (!SUA_DUOC.includes(t.trang_thai)) return loi(`Thùng ${t.id} đã được Kế toán duyệt — không thêm xác được`);
      if (!mienAllowed(user, t.mien)) return loi(`Thùng ${t.id} thuộc miền khác`);
      key = t.id;
    }
    const m = mienNhom.has(key) ? mienNhom.get(key)! : null;
    if (m && x.mien && m !== x.mien) return loi(`Xác miền ${x.mien} khác miền thùng (${m})`);
    if (!m && x.mien) mienNhom.set(key, x.mien);
    else if (!mienNhom.has(key)) mienNhom.set(key, null);
    return { ...base, thung: key, ok: true };
  });
  const tom = { tong: out.length, hop_le: out.filter((r) => r.ok).length, loi: out.filter((r) => !r.ok).length, thung_moi: [...new Set(out.filter((r) => r.ok && r.thung?.startsWith("MOI:")).map((r) => r.thung))].length };
  const hien = (r: Kq) => ({ ...r, thung: r.thung?.startsWith("MOI:") ? `Thùng mới (${r.thung.slice(4).toUpperCase()})` : r.thung });
  if (!body.ap_dung) return c.json({ rows: out.map(hien), ...tom });

  // ---- Ap dung ----
  const db = c.env.DB;
  const now = nowVN();
  const moiId = new Map<string, string>();
  for (const key of new Set(out.filter((r) => r.ok && r.thung?.startsWith("MOI:")).map((r) => r.thung!))) {
    const id = await nextSequentialId(db, "thung_xac_bh", "TX");
    await db.prepare("INSERT INTO thung_xac_bh (id, trang_thai, mien, ghi_chu, nguoi_tao, created_at, updated_at) VALUES (?, 'nhap', ?, ?, ?, ?, ?)").bind(id, mienNhom.get(key) ?? null, `Tạo từ file import (${key.slice(4).toUpperCase()})`, user.email, now, now).run();
    await logThung(db, id, null, "nhap", user.email, "Tạo thùng trả xác từ file import");
    moiId.set(key, id);
  }
  const stmts: D1PreparedStatement[] = [];
  const kind: ("upd" | "log")[] = [];
  const logStmt = (ma: string, ghi: string) => {
    const unitExpr = laDx(ma) ? "(SELECT unit_id FROM de_xuat_linh_kien_bh WHERE id = ?1)" : "?1";
    const text = laDx(ma) ? `Xác sửa chữa ${ma}: ${ghi}` : `Xác: ${ghi}`;
    return db
      .prepare(`INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu)
        SELECT 'phieu_sc_ct', ${unitExpr}, u.trang_thai, u.trang_thai, ?2, ?3, ?4 FROM phieu_sua_chua_bh_ct u WHERE u.id = ${unitExpr} AND changes() > 0`)
      .bind(ma, user.email, now, text);
  };
  const theoThung = new Map<string, string[]>();
  for (const r of out.filter((x) => x.ok)) {
    const dx = laDx(r.ma);
    const tbl = dx ? "de_xuat_linh_kien_bh AS d" : "phieu_sua_chua_bh_ct AS u";
    const a = dx ? "d" : "u";
    const choGom = dx ? XAC_DX_CHO_GOM : XAC_CHO_GOM;
    let ghi: string;
    if (r.kq === "vao_thung") {
      const tid = r.thung!.startsWith("MOI:") ? moiId.get(r.thung!)! : r.thung!;
      stmts.push(db.prepare(`UPDATE ${tbl} SET thung_xac_id = ?, xac_tt = 'trong_thung'${dx ? "" : ", updated_at = updated_at"} WHERE ${a}.id = ? AND ${choGom}`).bind(tid, r.ma));
      ghi = `đưa vào thùng trả xác ${tid} (import)`;
      theoThung.set(tid, [...(theoThung.get(tid) || []), r.ma]);
    } else if (r.kq === "dua_lai") {
      stmts.push(db.prepare(`UPDATE ${tbl} SET xac_tt = NULL, xac_xl_boi = NULL, xac_xl_luc = NULL, xac_xl_ghi_chu = NULL WHERE ${a}.id = ? AND ${a}.xac_tt IN (${XAC_KQ_SQL}) AND ${a}.thung_xac_id IS NULL`).bind(r.ma));
      ghi = "đưa lại danh sách chờ gom thùng trả xác (import)";
    } else {
      stmts.push(db.prepare(`UPDATE ${tbl} SET xac_tt = ?, xac_xl_boi = ?, xac_xl_luc = ?, xac_xl_ghi_chu = ? WHERE ${a}.id = ? AND ${choGom}`).bind(r.kq, user.email, now, r.ghi_chu, r.ma));
      ghi = `${XAC_KQ_LABEL[r.kq!]} (import)${r.ghi_chu ? ` | ${r.ghi_chu}` : ""}`;
    }
    kind.push("upd");
    stmts.push(logStmt(r.ma, ghi));
    kind.push("log");
  }
  let ok = 0;
  for (let i = 0; i < stmts.length; i += 100) {
    const res = await db.batch(stmts.slice(i, i + 100));
    res.forEach((x, j) => {
      if (kind[i + j] === "upd" && x.meta.changes) ok++;
    });
  }
  for (const [tid, mas] of theoThung) {
    const m = [...mienNhom.entries()].find(([k]) => k === tid || moiId.get(k) === tid)?.[1] ?? null;
    await db.prepare(`UPDATE thung_xac_bh SET updated_at = ?${m ? ", mien = COALESCE(mien, ?)" : ""} WHERE id = ?`).bind(...(m ? [now, m, tid] : [now, tid])).run();
    await logThung(db, tid, null, null, user.email, `Thêm ${mas.length} xác từ file import: ${mas.slice(0, 30).join(", ")}${mas.length > 30 ? "…" : ""}`);
  }
  return c.json({ ok, bo_qua: tom.hop_le - ok, loi: tom.loi, thung_moi: [...moiId.values()] });
});

export default xac;
