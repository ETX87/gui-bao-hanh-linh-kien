import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { parsePage } from "../lib/pagination";
import { eqFilters, distinctOpts, timeFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { mienScope, mienAllowed } from "../lib/mien";
import { XAC_CHO_GOM } from "../lib/xac";

// 13/11/2026 - Module quan ly tra xac linh kien (xem migrations/0031_thung_tra_xac.sql).
// Luong: don vi Doi moi + xu ly xac "Tra doi tac" -> danh sach "Xac cho gom" -> Admin BH tao thung tra xac,
// them / bot xac, nhap doi tac + ma EO -> gui Ke toan -> KT kiem tra, duyet (ket thuc, xac = da tra) hoac
// tra lai (bat buoc ly do). Admin sua thung (them / bot xac) toi khi KT duyet.

const xac = new Hono<{ Bindings: Env }>();
xac.use("*", verifySessionMiddleware, loadUser);

const isAdmin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const isKt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
const canView = (u: AppUser) => isAdmin(u) || isKt(u) || u.la_view || u.la_giam_sat;

const XAC_NGOAI = `u.huong_xu_ly = 'doi_moi' AND u.xac_tt = 'ngoai'`;
const LK_XAC = "COALESCE(u.ma_lk_nhan, p.ma_lk)"; // xac tinh theo B (linh kien thuc te gui ve)

const UNIT_COLS = `u.id, u.parent_id, u.so_thu_tu, u.trang_thai, u.xu_ly_xac, u.xac_tt, u.thung_xac_id, u.ma_lk_nhan, u.ma_lk_thuc_te,
  u.created_at, u.updated_at, p.ma_lk, p.case_id, p.mien, p.mo_ta_loi, g.nguoi_tao AS ktv, ${LK_XAC} AS ma_lk_xac,
  (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS khach_hang`;
const UNIT_FROM = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id`;
const LOC_UNIT = { nguoi_gui: "g.nguoi_tao", lk_b: LK_XAC, mien: "p.mien" };
const UNIT_KW = ["u.id", "p.case_id", "p.ma_lk", "u.ma_lk_nhan", tenLkOf(LK_XAC), "g.nguoi_tao", tenOf("g.nguoi_tao"), "p.mo_ta_loi"];

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

// ---- Danh sach xac (cho gom / da xu ly ngoai) ----
xac.get("/xac", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user) && !user.la_view && !user.la_giam_sat) return c.json({ error: "FORBIDDEN" }, 403);
  const nhom = c.req.query("nhom") === "ngoai" ? "ngoai" : "cho_gom";
  const { limit, offset } = parsePage(c, 20, 500);
  const ms = mienScope(user, "p");
  const base = `${UNIT_FROM} WHERE ${nhom === "ngoai" ? XAC_NGOAI : XAC_CHO_GOM}${ms.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC_UNIT, base, ms.binds) });
  const kw = kwClause(c.req.query("q"), UNIT_KW, ["p.tim_kiem"]);
  const f = joinF(eqFilters(c, LOC_UNIT), timeFilter(c, "u.updated_at"));
  // Thung dang sua (de them xac): chi lay xac cung mien voi thung (mien NULL thi khong rang buoc).
  const mienThung = c.req.query("mien_thung");
  const mt = mienThung ? { sql: " AND (p.mien = ? OR p.mien IS NULL)", binds: [mienThung] } : { sql: "", binds: [] as string[] };
  const where = `${base}${kw.sql}${f.sql}${mt.sql}`;
  const binds = [...ms.binds, ...kw.binds, ...f.binds, ...mt.binds];
  const [rows, tot] = await Promise.all([
    c.env.DB.prepare(`SELECT ${UNIT_COLS} ${where} ORDER BY u.updated_at, u.id LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS n ${where}`).bind(...binds).first<{ n: number }>(),
  ]);
  return c.json({ xac: rows.results, total: tot?.n ?? 0 });
});

// Danh dau xac da xu ly ngoai he thong (bo khoi danh sach cho gom) / dua lai cho gom.
xac.post("/xac/ngoai", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; ly_do?: string; dua_lai?: boolean }>().catch(() => ({}) as { ids?: string[]; ly_do?: string; dua_lai?: boolean });
  const ids = [...new Set((body.ids || []).filter(Boolean))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const lyDo = (body.ly_do || "").trim().slice(0, 500);
  let ok = 0;
  for (const id of ids) {
    const r = body.dua_lai
      ? await c.env.DB.prepare(`UPDATE phieu_sua_chua_bh_ct SET xac_tt = NULL, updated_at = updated_at WHERE id = ? AND xac_tt = 'ngoai' AND thung_xac_id IS NULL`).bind(id).run()
      : await c.env.DB.prepare(`UPDATE phieu_sua_chua_bh_ct AS u SET xac_tt = 'ngoai', updated_at = updated_at WHERE u.id = ? AND ${XAC_CHO_GOM}`).bind(id).run();
    if (r.meta.changes) {
      ok++;
      const st = await c.env.DB.prepare("SELECT trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string }>();
      await addLog(c.env.DB, "phieu_sc_ct", id, st?.trang_thai ?? null, st?.trang_thai ?? null, user.email, body.dua_lai ? "Xác: đưa lại danh sách chờ gom thùng trả xác" : `Xác: đánh dấu đã xử lý ngoài hệ thống${lyDo ? ` | ${lyDo}` : ""}`);
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
  const tk = "(SELECT group_concat(p.tim_kiem, ' ') FROM phieu_sua_chua_bh p WHERE p.id IN (SELECT u.parent_id FROM phieu_sua_chua_bh_ct u WHERE u.thung_xac_id = t.id))";
  const kw = kwClause(c.req.query("q"), ["t.id", "t.ma_eo", "t.doi_tac", "t.ghi_chu", "t.nguoi_tao", tenOf("t.nguoi_tao"), trong], [tk]);
  const f = joinF(eqFilters(c, LOC_THUNG), timeFilter(c, "t.created_at"));
  const where = `${base}${kw.sql}${f.sql}`;
  const binds = [...bb, ...kw.binds, ...f.binds];
  const [rows, tot] = await Promise.all([
    c.env.DB.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.thung_xac_id = t.id) AS so_xac
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
    c.env.DB.prepare(`SELECT ${UNIT_COLS} ${UNIT_FROM} WHERE u.thung_xac_id = ? ORDER BY ${LK_XAC}, u.id`).bind(t.id).all(),
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
    const u = await db
      .prepare(`SELECT u.id, u.trang_thai, p.mien, (CASE WHEN ${XAC_CHO_GOM} THEN 1 ELSE 0 END) AS hop_le FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?`)
      .bind(id)
      .first<{ id: string; trang_thai: string; mien: string | null; hop_le: number }>();
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
    const r = await db.prepare(`UPDATE phieu_sua_chua_bh_ct AS u SET thung_xac_id = ?, xac_tt = 'trong_thung', updated_at = updated_at WHERE u.id = ? AND ${XAC_CHO_GOM}`).bind(t.id, id).run();
    if (!r.meta.changes) {
      loi.push({ id, error: "XAC_KHONG_CHO_GOM" });
      continue;
    }
    if (!mien && u.mien) {
      mien = u.mien;
      await db.prepare("UPDATE thung_xac_bh SET mien = ? WHERE id = ? AND mien IS NULL").bind(mien, t.id).run();
    }
    ok++;
    await addLog(db, "phieu_sc_ct", id, u.trang_thai, u.trang_thai, actor, `Xác: đưa vào thùng trả xác ${t.id}`);
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
  const r = await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET thung_xac_id = NULL, xac_tt = NULL, updated_at = updated_at WHERE id = ? AND thung_xac_id = ?").bind(uid, t.id).run();
  if (!r.meta.changes) return c.json({ error: "NOT_FOUND" }, 404);
  const st = await c.env.DB.prepare("SELECT trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(uid).first<{ trang_thai: string }>();
  await addLog(c.env.DB, "phieu_sc_ct", uid, st?.trang_thai ?? null, st?.trang_thai ?? null, user.email, `Xác: bỏ khỏi thùng trả xác ${t.id} (về danh sách chờ gom)`);
  const con = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?").bind(t.id).first<{ n: number }>();
  // Thung rong -> bo rang buoc mien de them xac mien khac.
  await c.env.DB.prepare(`UPDATE thung_xac_bh SET updated_at = ?${(con?.n ?? 0) === 0 ? ", mien = NULL" : ""} WHERE id = ?`).bind(nowVN(), t.id).run();
  await logThung(c.env.DB, t.id, t.trang_thai, t.trang_thai, user.email, `Bỏ xác ${uid}`);
  return c.json({ ok: true });
});

xac.delete("/thung/:id", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const t = await getThung(c.env.DB, c.req.param("id"));
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "nhap") return c.json({ error: "WRONG_STATE" }, 400);
  const con = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?").bind(t.id).first<{ n: number }>();
  if ((con?.n ?? 0) > 0) return c.json({ error: "THUNG_CON_XAC" }, 400);
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
  const con = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?").bind(t.id).first<{ n: number }>();
  if (!(con?.n ?? 0)) return c.json({ error: "THUNG_RONG" }, 400);
  const ok = await chuyen(c.env.DB, t, "cho_ke_toan", ", gui_kt_boi = ?, gui_kt_luc = ?, ly_do_tra_lai = NULL", [user.email, nowVN()], user.email, `Gửi Kế toán duyệt (${con?.n} xác, EO ${t.ma_eo})`);
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
  const { results } = await c.env.DB.prepare("SELECT id, trang_thai FROM phieu_sua_chua_bh_ct WHERE thung_xac_id = ?").bind(t.id).all<{ id: string; trang_thai: string }>();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET xac_tt = 'da_tra', updated_at = updated_at WHERE thung_xac_id = ?").bind(t.id).run();
  for (const u of results) await addLog(c.env.DB, "phieu_sc_ct", u.id, u.trang_thai, u.trang_thai, user.email, `Xác: Kế toán duyệt thùng trả xác ${t.id} (EO ${t.ma_eo}) — đã trả đối tác`);
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

export default xac;
