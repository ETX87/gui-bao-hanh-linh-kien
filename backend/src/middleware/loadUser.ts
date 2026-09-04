import type { Context, Next } from "hono";
import type { AppUser, Env } from "../types";

// Adapted tu linh-kien-app/backend/src/middleware/loadUser.ts - BO phan "xem thu vai tro" (view-as,
// Admin-only) o Giai doan 1 nay, chua can thiet cho scaffold ban dau; co the them lai sau neu Admin
// he thong (la_qtri) can test nhanh theo tung vai tro giong linh-kien-app.

interface UserRow {
  email: string;
  ten: string | null;
  trang_thai_duyet: "Cho duyet" | "Da duyet" | "Tu choi";
  bi_khoa: number;
  la_ktv_dvbh: number;
  la_ve_tinh: number;
  la_kho: number;
  la_admin_bh: number;
  la_nv_sua_chua: number;
  la_ke_toan: number;
  la_giam_sat: number;
  la_view: number;
  la_qtri: number;
}

const USER_COLUMNS =
  "email, ten, trang_thai_duyet, bi_khoa, la_ktv_dvbh, la_ve_tinh, la_kho, la_admin_bh, la_nv_sua_chua, la_ke_toan, la_giam_sat, la_view, la_qtri";

export async function loadUser(c: Context<{ Bindings: Env }>, next: Next) {
  const email = c.get("email");
  await c.env.DB.prepare("PRAGMA foreign_keys = ON").run();

  let row = await c.env.DB.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).bind(email).first<UserRow>();

  if (!row) {
    const isBootstrapAdmin = email === c.env.BOOTSTRAP_ADMIN_EMAIL;
    row = await c.env.DB.prepare(
      `INSERT INTO users (email, trang_thai_duyet, la_qtri)
       VALUES (?, ?, ?)
       RETURNING ${USER_COLUMNS}`,
    )
      .bind(email, isBootstrapAdmin ? "Da duyet" : "Cho duyet", isBootstrapAdmin ? 1 : 0)
      .first<UserRow>();
  }

  if (!row) return c.json({ error: "USER_LOAD_FAILED" }, 500);

  if (row.bi_khoa) return c.json({ error: "DISABLED" }, 403);
  if (row.trang_thai_duyet === "Cho duyet") return c.json({ error: "PENDING_APPROVAL" }, 403);
  if (row.trang_thai_duyet === "Tu choi") return c.json({ error: "REJECTED" }, 403);

  const user: AppUser = {
    email: row.email,
    ten: row.ten,
    trang_thai_duyet: row.trang_thai_duyet,
    bi_khoa: !!row.bi_khoa,
    la_ktv_dvbh: !!row.la_ktv_dvbh,
    la_ve_tinh: !!row.la_ve_tinh,
    la_kho: !!row.la_kho,
    la_admin_bh: !!row.la_admin_bh,
    la_nv_sua_chua: !!row.la_nv_sua_chua,
    la_ke_toan: !!row.la_ke_toan,
    la_giam_sat: !!row.la_giam_sat,
    la_view: !!row.la_view,
    la_qtri: !!row.la_qtri,
  };

  c.set("user", user);
  await next();
}
