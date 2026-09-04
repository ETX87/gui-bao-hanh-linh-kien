import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";

// CRUD nguoi dung cho man "#/qtri/nguoi-dung" (Admin he thong, la_qtri) - port lai tu
// renderQtriNguoiDung()/suaVaiTroNguoiDung()/xoaNguoiDung()/submitThemNguoiDung() cua prototype.
// Giai doan 1: chi scaffold route, CHUA co frontend UI goi toi day (se lam o Giai doan 3/4).

const users = new Hono<{ Bindings: Env }>();
users.use("*", verifySessionMiddleware, loadUser);

const ROLE_FLAGS = ["la_ktv_dvbh", "la_ve_tinh", "la_kho", "la_admin_bh", "la_nv_sua_chua", "la_ke_toan", "la_giam_sat", "la_view", "la_qtri"] as const;
type RoleFlag = (typeof ROLE_FLAGS)[number];
function isRoleFlag(v: unknown): v is RoleFlag {
  return typeof v === "string" && (ROLE_FLAGS as readonly string[]).includes(v);
}

function requireQtri(c: { get(k: "user"): { la_qtri: boolean } }): boolean {
  return c.get("user").la_qtri;
}

users.get("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT email, ten, bi_khoa, trang_thai_duyet, ${ROLE_FLAGS.join(", ")}, created_at
     FROM users ORDER BY created_at DESC`,
  ).all();
  return c.json({ users: results });
});

interface PatchBody {
  flag?: string;
  value?: boolean;
  bi_khoa?: boolean;
  trang_thai_duyet?: "Cho duyet" | "Da duyet" | "Tu choi";
}

// PATCH /api/users/:email - sua 1 co vai tro (body {flag, value}), hoac bi_khoa/trang_thai_duyet.
// Chan tu-khoa/tu-go-quyen qtri cua CHINH minh (tranh khoa nham mat quyen truy cap, dung nguyen tac
// da ap dung o prototype xoaNguoiDung()/suaVaiTroNguoiDung()).
users.patch("/:email", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const targetEmail = decodeURIComponent(c.req.param("email"));
  const me = c.get("email");
  const body = await c.req.json<PatchBody>().catch(() => ({}) as PatchBody);

  if (targetEmail === me && (body.bi_khoa === true || (body.flag === "la_qtri" && body.value === false))) {
    return c.json({ error: "CANNOT_MODIFY_SELF" }, 400);
  }

  if (body.flag !== undefined) {
    if (!isRoleFlag(body.flag)) return c.json({ error: "INVALID_FLAG" }, 400);
    await c.env.DB.prepare(`UPDATE users SET ${body.flag} = ?, updated_at = ? WHERE email = ?`)
      .bind(body.value ? 1 : 0, nowVN(), targetEmail)
      .run();
  }
  if (body.bi_khoa !== undefined) {
    await c.env.DB.prepare("UPDATE users SET bi_khoa = ?, updated_at = ? WHERE email = ?").bind(body.bi_khoa ? 1 : 0, nowVN(), targetEmail).run();
  }
  if (body.trang_thai_duyet !== undefined) {
    await c.env.DB.prepare("UPDATE users SET trang_thai_duyet = ?, updated_at = ? WHERE email = ?").bind(body.trang_thai_duyet, nowVN(), targetEmail).run();
  }
  return c.json({ ok: true });
});

interface CreateBody {
  email?: string;
  ten?: string;
}

// POST /api/users - tao 1 tai khoan placeholder (Cho duyet), qtri gan vai tro sau qua PATCH. Chan
// trung email (kiem tra da xac nhan can o prototype: submitThemNguoiDung() "chan trung email").
users.post("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<CreateBody>().catch(() => ({}) as CreateBody);
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return c.json({ error: "INVALID_EMAIL" }, 400);

  const existing = await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  if (existing) return c.json({ error: "EMAIL_EXISTS" }, 409);

  await c.env.DB.prepare("INSERT INTO users (email, ten, trang_thai_duyet) VALUES (?, ?, 'Cho duyet')").bind(email, body.ten?.trim() || null).run();
  return c.json({ ok: true });
});

// DELETE /api/users/:email - xoa tai khoan. Chan tu-xoa chinh minh.
users.delete("/:email", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const targetEmail = decodeURIComponent(c.req.param("email"));
  if (targetEmail === c.get("email")) return c.json({ error: "CANNOT_DELETE_SELF" }, 400);
  await c.env.DB.prepare("DELETE FROM users WHERE email = ?").bind(targetEmail).run();
  return c.json({ ok: true });
});

export default users;
