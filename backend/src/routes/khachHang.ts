import { Hono } from "hono";
import type { AppUser, Env } from "../types";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { parsePage } from "../lib/pagination";
import { kwClause } from "../lib/search";
import { mienOfStaff } from "../lib/mien";
import { normVi } from "../lib/timKiem";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";

// 14/11/2026 - Danh ba khach hang (NPP / khach le) cho Admin BH tao don thu cong: chon lai tu danh sach hoac tao moi.
// Xem CLAUDE.md muc "Tạo đơn thủ công: tạo hộ KTV hoặc khách lẻ / NPP".


const khachHangRoutes = new Hono<{ Bindings: Env }>();
khachHangRoutes.use("*", verifySessionMiddleware, loadUser);

const LOAI = ["npp", "kh_le"] as const;
const canRead = (u: AppUser) => !!(u.la_admin_bh || u.la_qtri || u.la_view || u.la_giam_sat || u.la_ke_toan || u.la_kho);
const canWrite = (u: AppUser) => !!(u.la_admin_bh || u.la_qtri);
const clean = (s: unknown, max = 300) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const normSdt = (s: string) => s.replace(/[\s.\-()]/g, "");
const tk = (r: { id: string; ten: string; sdt: string; dia_chi: string; ghi_chu: string }) => normVi([r.id, r.ten, r.sdt, r.dia_chi, r.ghi_chu].join(" "));

interface KhBody {
  loai?: string;
  ten?: string;
  sdt?: string;
  dia_chi?: string;
  ghi_chu?: string;
  an?: boolean;
}

// GET /  - khong truyen limit: tra toan bo khach dang dung (an=0) cho o chon; co limit: phan trang + tim + loc cho man quan ly.
khachHangRoutes.get("/", async (c) => {
  const user = c.get("user");
  if (!canRead(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const db = c.env.DB;
  const SO_DON = "(SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.khach_hang_id = k.id)";
  if (!c.req.query("limit")) {
    const { results } = await db
      .prepare(`SELECT k.id, k.loai, k.ten, k.sdt, k.dia_chi, k.ghi_chu, ${SO_DON} AS so_don FROM khach_hang_bh k WHERE k.an = 0 ORDER BY k.updated_at DESC LIMIT 5000`)
      .all();
    return c.json({ khach_hang: results });
  }
  const { limit, offset } = parsePage(c);
  const where: string[] = ["1=1"];
  const binds: unknown[] = [];
  const loai = c.req.query("loai");
  if (loai === "npp" || loai === "kh_le") {
    where.push("k.loai = ?");
    binds.push(loai);
  }
  const an = c.req.query("an");
  if (an === "0" || an === "1") {
    where.push("k.an = ?");
    binds.push(Number(an));
  }
  const kw = kwClause(c.req.query("q"), ["k.id", "k.ten", "k.sdt", "k.dia_chi", "k.ghi_chu"], ["k.tim_kiem"]);
  const whereSql = where.join(" AND ") + kw.sql;
  const allBinds = [...binds, ...kw.binds];
  const [{ results }, cnt] = await Promise.all([
    db
      .prepare(`SELECT k.*, ${SO_DON} AS so_don FROM khach_hang_bh k WHERE ${whereSql} ORDER BY k.updated_at DESC LIMIT ? OFFSET ?`)
      .bind(...allBinds, limit, offset)
      .all(),
    db.prepare(`SELECT COUNT(*) AS n FROM khach_hang_bh k WHERE ${whereSql}`).bind(...allBinds).first<{ n: number }>(),
  ]);
  return c.json({ khach_hang: results, total: cnt?.n ?? 0 });
});

khachHangRoutes.post("/", async (c) => {
  const user = c.get("user");
  if (!canWrite(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const b = await c.req.json<KhBody>().catch(() => ({}) as KhBody);
  const loai = LOAI.includes(b.loai as (typeof LOAI)[number]) ? b.loai! : "kh_le";
  const ten = clean(b.ten, 200);
  const sdt = normSdt(clean(b.sdt, 30));
  if (!ten) return c.json({ error: "MISSING_TEN" }, 400);
  if (!sdt) return c.json({ error: "MISSING_SDT" }, 400);
  const trung = await c.env.DB.prepare("SELECT id, ten FROM khach_hang_bh WHERE sdt = ? AND loai = ? AND an = 0").bind(sdt, loai).first<{ id: string; ten: string }>();
  if (trung) return c.json({ error: "KH_TRUNG_SDT", id: trung.id, ten: trung.ten }, 409);
  const id = await nextSequentialId(c.env.DB, "khach_hang_bh", "KH");
  const now = nowVN();
  await c.env.DB.prepare(
    "INSERT INTO khach_hang_bh (id, loai, ten, sdt, dia_chi, ghi_chu, tim_kiem, mien, an, nguoi_tao, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)",
  )
    .bind(id, loai, ten, sdt, clean(b.dia_chi, 500), clean(b.ghi_chu, 1000), tk({ id, ten, sdt, dia_chi: clean(b.dia_chi, 500), ghi_chu: clean(b.ghi_chu, 1000) }), mienOfStaff(user), user.email, now, now)
    .run();
  return c.json({ id, loai, ten, sdt, dia_chi: clean(b.dia_chi, 500), ghi_chu: clean(b.ghi_chu, 1000) }, 201);
});

khachHangRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  if (!canWrite(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const cur = await c.env.DB.prepare("SELECT * FROM khach_hang_bh WHERE id = ?").bind(id).first<{ loai: string; sdt: string }>();
  if (!cur) return c.json({ error: "NOT_FOUND" }, 404);
  const b = await c.req.json<KhBody>().catch(() => ({}) as KhBody);
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (b.loai !== undefined) {
    if (!LOAI.includes(b.loai as (typeof LOAI)[number])) return c.json({ error: "INVALID_LOAI" }, 400);
    sets.push("loai = ?");
    binds.push(b.loai);
  }
  if (b.ten !== undefined) {
    if (!clean(b.ten)) return c.json({ error: "MISSING_TEN" }, 400);
    sets.push("ten = ?");
    binds.push(clean(b.ten, 200));
  }
  if (b.sdt !== undefined) {
    const sdt = normSdt(clean(b.sdt, 30));
    if (!sdt) return c.json({ error: "MISSING_SDT" }, 400);
    const trung = await c.env.DB.prepare("SELECT id, ten FROM khach_hang_bh WHERE sdt = ? AND loai = ? AND an = 0 AND id <> ?")
      .bind(sdt, b.loai ?? cur.loai, id)
      .first<{ id: string; ten: string }>();
    if (trung) return c.json({ error: "KH_TRUNG_SDT", id: trung.id, ten: trung.ten }, 409);
    sets.push("sdt = ?");
    binds.push(sdt);
  }
  if (b.dia_chi !== undefined) {
    sets.push("dia_chi = ?");
    binds.push(clean(b.dia_chi, 500));
  }
  if (b.ghi_chu !== undefined) {
    sets.push("ghi_chu = ?");
    binds.push(clean(b.ghi_chu, 1000));
  }
  if (b.an !== undefined) {
    sets.push("an = ?");
    binds.push(b.an ? 1 : 0);
  }
  if (!sets.length) return c.json({ ok: true });
  sets.push("updated_at = ?");
  binds.push(nowVN());
  await c.env.DB.prepare(`UPDATE khach_hang_bh SET ${sets.join(", ")} WHERE id = ?`).bind(...binds, id).run();
  const moi = await c.env.DB.prepare("SELECT id, ten, sdt, dia_chi, ghi_chu FROM khach_hang_bh WHERE id = ?").bind(id).first<{ id: string; ten: string; sdt: string; dia_chi: string; ghi_chu: string }>();
  if (moi) await c.env.DB.prepare("UPDATE khach_hang_bh SET tim_kiem = ? WHERE id = ?").bind(tk(moi), id).run();
  return c.json({ ok: true });
});

// Xoa han chi khi chua co don nao; co don thi dung "an" (PATCH an=true).
khachHangRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!canWrite(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh WHERE khach_hang_id = ?").bind(id).first<{ n: number }>();
  if ((n?.n ?? 0) > 0) return c.json({ error: "KH_DA_CO_DON" }, 400);
  await c.env.DB.prepare("DELETE FROM khach_hang_bh WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
export default khachHangRoutes;
