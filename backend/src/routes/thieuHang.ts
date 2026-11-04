import { Hono } from "hono";
import type { AppUser, Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { mienScope } from "../lib/mien";
import { parsePage } from "../lib/pagination";
import { dongBoThieuHang, guiThieuHangCho, huyThieuHang, taoYeuCauThieuHang, THB_MO_LOCAL } from "../lib/thieuHang";

// /api/thieu-hang (04/11/2026) - yeu cau thieu linh kien gui sang linh-kien-app (lib/thieuHang.ts, migration 0026).
const r = new Hono<{ Bindings: Env }>();
r.use("*", verifySessionMiddleware, loadUser);

const xemDuoc = (u: AppUser) => u.la_admin_bh || u.la_qtri || u.la_kho || u.la_ke_toan || u.la_giam_sat || u.la_view || u.la_nv_sua_chua;
const quanLy = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const DONG_CAN_XEM = ["Kho xac nhan hang da ve", "Kho tu choi", "Mua hang tu choi"];

const SELECT = `SELECT t.*, l.ten_lk, p.case_id, p.id AS parent_id, p.mien, g.nguoi_tao AS ktv, u.trang_thai AS unit_trang_thai,
    (SELECT ten FROM users WHERE email = t.nguoi_bao) AS nguoi_bao_ten
  FROM thieu_hang_bh t
  JOIN phieu_sua_chua_bh_ct u ON u.id = t.unit_id
  JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
  LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
  LEFT JOIN linh_kien_bh l ON l.ma_lk = t.ma_lk`;

// GET /api/thieu-hang?nhom=mo|da_ve|can_xem|dong|tat_ca&q=&limit=&offset=
r.get("/", async (c) => {
  const user = c.get("user");
  if (!xemDuoc(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const nhom = c.req.query("nhom") || "mo";
  const q = (c.req.query("q") ?? "").trim().toLowerCase();
  const ms = mienScope(user, "p");
  const base: string[] = ["1=1"];
  const binds: unknown[] = [];
  if (q) {
    base.push("(LOWER(t.unit_id) LIKE ? OR LOWER(COALESCE(t.ticket_id,'')) LIKE ? OR LOWER(t.ma_lk) LIKE ? OR LOWER(COALESCE(l.ten_lk,'')) LIKE ? OR LOWER(COALESCE(p.case_id,'')) LIKE ? OR LOWER(COALESCE(p.tim_kiem,'')) LIKE ?)");
    binds.push(...Array(6).fill(`%${q}%`));
  }
  const whereBase = base.join(" AND ") + ms.sql;
  const bindBase = [...binds, ...ms.binds];
  const nhomSql: Record<string, string> = {
    mo: `t.trang_thai IN (${THB_MO_LOCAL.map((x) => `'${x}'`).join(",")})`,
    da_ve: "t.trang_thai = 'Kho xac nhan hang da ve'",
    can_xem: `t.da_xem = 0 AND t.trang_thai IN (${DONG_CAN_XEM.map((x) => `'${x}'`).join(",")})`,
    dong: `t.trang_thai NOT IN (${THB_MO_LOCAL.map((x) => `'${x}'`).join(",")})`,
    tat_ca: "1=1",
  };
  const ns = nhomSql[nhom] ?? nhomSql.mo;
  const db = c.env.DB;
  const [list, tong, dem] = await Promise.all([
    db.prepare(`${SELECT} WHERE ${whereBase} AND ${ns} ORDER BY t.da_xem ASC, t.updated_at DESC, t.id DESC LIMIT ? OFFSET ?`).bind(...bindBase, limit, offset).all(),
    db.prepare(`SELECT COUNT(*) AS n FROM thieu_hang_bh t JOIN phieu_sua_chua_bh_ct u ON u.id = t.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN linh_kien_bh l ON l.ma_lk = t.ma_lk WHERE ${whereBase} AND ${ns}`).bind(...bindBase).first<{ n: number }>(),
    db
      .prepare(
        `SELECT ${Object.entries(nhomSql).map(([k, v]) => `SUM(CASE WHEN ${v} THEN 1 ELSE 0 END) AS ${k}`).join(", ")}
         FROM thieu_hang_bh t JOIN phieu_sua_chua_bh_ct u ON u.id = t.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN linh_kien_bh l ON l.ma_lk = t.ma_lk WHERE ${whereBase}`,
      )
      .bind(...bindBase)
      .first<Record<string, number | null>>(),
  ]);
  const counts: Record<string, number> = {};
  for (const k of Object.keys(nhomSql)) counts[k] = Number(dem?.[k] ?? 0);
  return c.json({ rows: list.results, total: tong?.n ?? 0, counts });
});

// GET /api/thieu-hang/don-vi/:unitId - yeu cau thieu hang cua 1 don vi.
r.get("/don-vi/:unitId", async (c) => {
  const user = c.get("user");
  if (!xemDuoc(user) && !user.la_ktv_dvbh && !user.la_ve_tinh) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare(`${SELECT} WHERE t.unit_id = ? ORDER BY t.id DESC`).bind(c.req.param("unitId")).all();
  return c.json({ rows: results });
});

// POST /api/thieu-hang/don-vi/:unitId - { items: [{ ma_lk, so_luong }], ghi_chu? } - bao tay (Admin BH / qtri / NV duoc giao).
r.post("/don-vi/:unitId", async (c) => {
  const user = c.get("user");
  const unitId = c.req.param("unitId");
  const unit = await c.env.DB.prepare("SELECT id, nguoi_sua_chua, trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ id: string; nguoi_sua_chua: string | null; trang_thai: string }>();
  if (!unit) return c.json({ error: "NOT_FOUND" }, 404);
  if (!quanLy(user) && !(user.la_nv_sua_chua && unit.nguoi_sua_chua === user.email)) return c.json({ error: "FORBIDDEN" }, 403);
  if (["ket_thuc_tu_choi", "chuyen_kho"].includes(unit.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ items?: { ma_lk?: string; so_luong?: number }[]; ghi_chu?: string }>().catch(() => ({}) as { items?: undefined; ghi_chu?: string });
  const items = (body.items ?? []).filter((x) => typeof x.ma_lk === "string" && x.ma_lk.trim()).map((x) => ({ ma_lk: x.ma_lk!.trim(), so_luong: Number(x.so_luong) || 1 })).slice(0, 20);
  if (!items.length) return c.json({ error: "MISSING_LINH_KIEN" }, 400);
  const { results: co } = await c.env.DB.prepare("SELECT ma_lk FROM linh_kien_bh WHERE ma_lk IN (SELECT value FROM json_each(?))").bind(JSON.stringify(items.map((x) => x.ma_lk))).all<{ ma_lk: string }>();
  const coSet = new Set(co.map((x) => x.ma_lk));
  if (items.some((x) => !coSet.has(x.ma_lk))) return c.json({ error: "INVALID_LINH_KIEN" }, 400);
  const n = await taoYeuCauThieuHang(c.env.DB, unitId, items, "Báo tay: thiếu linh kiện", user.email, "tay", (body.ghi_chu ?? "").trim().slice(0, 1000) || null);
  const gui = n ? await guiThieuHangCho(c.env) : { da_gui: 0 };
  return c.json({ tao: n, ...gui });
});

// POST /api/thieu-hang/:id/huy - { ly_do } - rut lai bao thieu.
r.post("/:id/huy", async (c) => {
  const user = c.get("user");
  if (!quanLy(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const res = await huyThieuHang(c.env, Number(c.req.param("id")), user.email, (body.ly_do ?? "").trim().slice(0, 500));
  if (res.error) return c.json({ error: res.error }, res.error === "NOT_FOUND" ? 404 : 400);
  return c.json({ ok: true });
});

// POST /api/thieu-hang/da-xem - { ids } - Admin BH da nam ket qua (ticket da dong).
r.post("/da-xem", async (c) => {
  const user = c.get("user");
  if (!quanLy(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: number[] }>().catch(() => ({}) as { ids?: number[] });
  const ids = (body.ids ?? []).map(Number).filter((x) => Number.isInteger(x)).slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const res = await c.env.DB.prepare(`UPDATE thieu_hang_bh SET da_xem = 1 WHERE id IN (SELECT value FROM json_each(?)) AND trang_thai NOT IN (${THB_MO_LOCAL.map(() => "?").join(",")})`).bind(JSON.stringify(ids), ...THB_MO_LOCAL).run();
  return c.json({ cap_nhat: res.meta.changes });
});

// POST /api/thieu-hang/dong-bo - gui yeu cau cho + keo trang thai ticket ngay (Admin BH / qtri).
r.post("/dong-bo", async (c) => {
  if (!quanLy(c.get("user"))) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await dongBoThieuHang(c.env));
});

export default r;
