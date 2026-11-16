import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AppUser, Env } from "../types";
import { VIEW_AS_COOKIE, VIEW_AS_USER_COOKIE, VIEW_AS_USER_WRITE_ALLOW, applyViewAsRole, isViewAsRole } from "../lib/viewAs";

// Adapted tu linh-kien-app/backend/src/middleware/loadUser.ts. Che do test cua Admin he thong ("Xem thử vai
// trò" / "Xem như người dùng") them lai 05/10/2026 - xem lib/viewAs.ts.

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
  la_tra_xac: number;
  la_qtri: number;
  mien: "MB" | "MN" | "ALL" | null;
}

const USER_COLUMNS =
  "email, ten, trang_thai_duyet, bi_khoa, la_ktv_dvbh, la_ve_tinh, la_kho, la_admin_bh, la_nv_sua_chua, la_ke_toan, la_giam_sat, la_view, la_qtri, la_tra_xac, mien";

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

  const user = toAppUser(row);
  const realIsAdmin = user.la_qtri;
  c.set("realIsAdmin", realIsAdmin);
  c.set("realEmail", user.email);
  c.set("viewAsRole", null);
  c.set("viewAsUser", null);

  if (realIsAdmin) {
    // "Xem như người dùng" - uu tien hon "xem thu vai tro". Tai khoan dich bi khoa/chua duyet -> bo qua.
    const viewAsEmail = getCookie(c, VIEW_AS_USER_COOKIE);
    if (viewAsEmail && viewAsEmail !== user.email) {
      const target = await loadTargetUser(c.env.DB, viewAsEmail);
      if (target) {
        const m = c.req.method;
        if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS" && !VIEW_AS_USER_WRITE_ALLOW.has(c.req.path)) {
          return c.json({ error: "XEM_NHU_CHI_DOC" }, 403);
        }
        c.set("viewAsUser", { email: target.email, ten: target.ten });
        c.set("user", target);
        await next();
        return;
      }
    }
    const role = getCookie(c, VIEW_AS_COOKIE);
    if (isViewAsRole(role)) {
      c.set("viewAsRole", role);
      c.set("user", applyViewAsRole(user, role));
      await next();
      return;
    }
  }

  c.set("user", user);
  await next();
}

function toAppUser(row: UserRow): AppUser {
  return {
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
    la_tra_xac: !!row.la_tra_xac,
    la_qtri: !!row.la_qtri,
    mien: row.mien ?? null,
  };
}

// Tai khoan dich cua "Xem như người dùng": bang users (da duyet, chua khoa), hoac KTV co trong danh ba
// ktv_lien_he_bh nhung CHUA TUNG dang nhap (dung mau tu kich hoat cua routes/auth.ts - lan dang nhap dau
// se duoc duyet san voi dung co KTV/Ve tinh) - de Admin xem truoc dung nhung gi KTV do se thay.
export async function loadTargetUser(db: D1Database, email: string): Promise<AppUser | null> {
  const row = await db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`).bind(email).first<UserRow>();
  if (row) return !row.bi_khoa && row.trang_thai_duyet === "Da duyet" ? toAppUser(row) : null;
  const k = await db.prepare("SELECT ten_hien_thi, vai_tro_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(email).first<{ ten_hien_thi: string | null; vai_tro_ktv: string | null }>();
  if (!k) return null;
  const veTinh = k.vai_tro_ktv === "Ve tinh";
  return {
    email,
    ten: k.ten_hien_thi,
    trang_thai_duyet: "Da duyet",
    bi_khoa: false,
    la_ktv_dvbh: !veTinh,
    la_ve_tinh: veTinh,
    la_kho: false,
    la_admin_bh: false,
    la_nv_sua_chua: false,
    la_ke_toan: false,
    la_giam_sat: false,
    la_view: false,
    la_tra_xac: false,
    la_qtri: false,
    mien: null,
  };
}
