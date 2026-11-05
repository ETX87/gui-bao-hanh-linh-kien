import { runUserKhuVucSync } from "../lib/userKhuVucSync";
import { Hono } from "hono";
import { dongBoTaiKhoan } from "../lib/taiKhoan";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../types";
import { signSession } from "../lib/jwt";
import { verifySessionMiddleware, SESSION_COOKIE, SESSION_TTL_SECONDS } from "../middleware/session";
import { loadUser, loadTargetUser } from "../middleware/loadUser";
import { VIEW_AS_COOKIE, VIEW_AS_USER_COOKIE, isViewAsRole } from "../lib/viewAs";
import { nowVN } from "../lib/vnTime";

// Adapted tu linh-kien-app/backend/src/routes/auth.ts. "Xem thu vai tro"/"Xem nhu nguoi dung" cua Admin
// them lai 05/10/2026 (cuoi file, xem lib/viewAs.ts); "nguoi-directory" van chua port.

const STATE_COOKIE = "suachua_oauth_state";

const auth = new Hono<{ Bindings: Env }>();

auth.get("/login", async (c) => {
  const state = crypto.randomUUID();
  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: c.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

auth.get("/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/" });

  if (!code || !state || !savedState || state !== savedState) {
    return c.text("Xac thuc that bai: state khong hop le.", 400);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return c.text("Khong the doi ma xac thuc voi Google.", 502);
  const tokenJson = (await tokenRes.json()) as { access_token: string };

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userInfoRes.ok) return c.text("Khong the lay thong tin nguoi dung tu Google.", 502);
  const userInfo = (await userInfoRes.json()) as { email: string; email_verified: boolean; name?: string };

  if (!userInfo.email_verified) return c.text("Email Google chua duoc xac minh.", 403);

  const isBootstrapAdmin = userInfo.email === c.env.BOOTSTRAP_ADMIN_EMAIL;

  // Neu email khop 1 dong ktv_lien_he_bh.email_dang_nhap (danh ba dong bo tu linh-kien-app, xem
  // CLAUDE.md muc "Chot 5 cau hoi mo..."), tu dong KICH HOAT tai khoan luon (bo qua buoc qtri duyet)
  // + gan san co la_ktv_dvbh/la_ve_tinh - dung mau da chot o linh-kien-app (auth.ts /callback), CHI
  // ap dung khi tai khoan van dang "Cho duyet" (khong bao gio ghi de tai khoan da duyet/cau hinh tay).
  let ktvMatch: { laKtvDvbh: number; laVeTinh: number } | null = null;
  if (!isBootstrapAdmin) {
    const ktvRow = await c.env.DB.prepare("SELECT vai_tro_ktv FROM ktv_lien_he_bh WHERE LOWER(TRIM(email_dang_nhap)) = LOWER(?) ORDER BY CASE vai_tro_ktv WHEN 'Ve tinh' THEN 1 ELSE 0 END LIMIT 1")
      .bind(userInfo.email)
      .first<{ vai_tro_ktv: string | null }>();
    if (ktvRow) {
      ktvMatch = {
        laKtvDvbh: ktvRow.vai_tro_ktv === "Ve tinh" ? 0 : 1,
        laVeTinh: ktvRow.vai_tro_ktv === "Ve tinh" ? 1 : 0,
      };
    }
  }

  // 16/10/2026: nhan su dang lam tren ETX (danh ba lay tu linh-kien-app, lib/etxSync.ts) -> tu duyet luon, chua gan vai tro.
  let etxDangLam = false;
  if (!isBootstrapAdmin && !ktvMatch) {
    const e = await c.env.DB.prepare("SELECT 1 AS x FROM etx_nhan_su_bh WHERE gmail = ? AND trang_thai_lam_viec = 'on' LIMIT 1")
      .bind(userInfo.email.trim().toLowerCase())
      .first<{ x: number }>();
    etxDangLam = !!e;
  }

  // 21/10/2026: tai khoan moi -> keo ngay khu vuc nhan su tu linh-kien-app (khong doi toi lan dong bo hang ngay).
  const daCoTaiKhoan = !!(await c.env.DB.prepare("SELECT 1 AS x FROM users WHERE email = ?").bind(userInfo.email).first());
  await c.env.DB.prepare("PRAGMA foreign_keys = ON").run();
  if (ktvMatch) {
    await c.env.DB.prepare(
      `INSERT INTO users (email, ten, trang_thai_duyet, la_ktv_dvbh, la_ve_tinh)
       VALUES (?, ?, 'Da duyet', ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         ten = excluded.ten,
         updated_at = ?,
         trang_thai_duyet = CASE WHEN trang_thai_duyet = 'Cho duyet' THEN 'Da duyet' ELSE trang_thai_duyet END,
         la_ktv_dvbh = CASE WHEN trang_thai_duyet = 'Cho duyet' THEN ? ELSE la_ktv_dvbh END,
         la_ve_tinh = CASE WHEN trang_thai_duyet = 'Cho duyet' THEN ? ELSE la_ve_tinh END`,
    )
      .bind(userInfo.email, userInfo.name ?? null, ktvMatch.laKtvDvbh, ktvMatch.laVeTinh, nowVN(), ktvMatch.laKtvDvbh, ktvMatch.laVeTinh)
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO users (email, ten, trang_thai_duyet, la_qtri)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET ten = excluded.ten, updated_at = ?,
         trang_thai_duyet = CASE WHEN ? = 1 AND trang_thai_duyet = 'Cho duyet' THEN 'Da duyet' ELSE trang_thai_duyet END`,
    )
      .bind(userInfo.email, userInfo.name ?? null, isBootstrapAdmin || etxDangLam ? "Da duyet" : "Cho duyet", isBootstrapAdmin ? 1 : 0, nowVN(), etxDangLam ? 1 : 0)
      .run();
  }

  // 04/11/2026: dong bo tai khoan voi danh ba KTV / ETX - ten cong ty thay ten Google, tai khoan chua co vai tro ma co trong danh ba KTV thi gan co KTV.
  await dongBoTaiKhoan(c.env.DB, userInfo.email).catch((e) => console.error("[dongBoTaiKhoan]", e));

  if (!daCoTaiKhoan) {
    c.executionCtx.waitUntil(runUserKhuVucSync(c.env).then(() => undefined).catch(() => undefined));
  }

  // Nhat ky dang nhap (bao mat noi bo). CF-Connecting-IP la header Cloudflare tu dong gan.
  await c.env.DB.prepare("INSERT INTO login_log (email, thoi_gian, ip, user_agent) VALUES (?, ?, ?, ?)")
    .bind(userInfo.email, nowVN(), c.req.header("CF-Connecting-IP") ?? null, c.req.header("User-Agent") ?? null)
    .run();

  const token = await signSession({ email: userInfo.email }, c.env.SESSION_SECRET, SESSION_TTL_SECONDS);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return c.redirect(c.env.FRONTEND_URL || "/");
});

// GET /api/auth/dev-login - cua sau CHI hoat dong khi LOCAL_DEV_BYPASS_AUTH=true (.dev.vars local,
// khong bao gio co tren production) - dang nhap thang vao BOOTSTRAP_ADMIN_EMAIL voi la_qtri=1, giong
// he dvbh/linh-kien-app.
auth.get("/dev-login", async (c) => {
  if (c.env.LOCAL_DEV_BYPASS_AUTH !== "true") return c.text("Not found", 404);

  const email = c.env.BOOTSTRAP_ADMIN_EMAIL;
  await c.env.DB.prepare(
    `INSERT INTO users (email, ten, trang_thai_duyet, la_qtri)
     VALUES (?, ?, 'Da duyet', 1)
     ON CONFLICT(email) DO UPDATE SET updated_at = ?`,
  )
    .bind(email, "Dev Admin he thong (local bypass)", nowVN())
    .run();

  const token = await signSession({ email }, c.env.SESSION_SECRET, SESSION_TTL_SECONDS);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return c.redirect(c.env.FRONTEND_URL || "/");
});

auth.post("/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  deleteCookie(c, VIEW_AS_COOKIE, { path: "/" });
  deleteCookie(c, VIEW_AS_USER_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

auth.get("/me", verifySessionMiddleware, loadUser, async (c) => {
  const user = c.get("user");
  return c.json({ user, realIsAdmin: c.get("realIsAdmin"), realEmail: c.get("realEmail"), viewAsRole: c.get("viewAsRole"), viewAsUser: c.get("viewAsUser") });
});

// ===== Che do test cua Admin he thong (lib/viewAs.ts) - moi check dung realIsAdmin (tai khoan THAT) =====
const cookieOpts = { httpOnly: true, secure: true, sameSite: "Lax" as const, maxAge: SESSION_TTL_SECONDS, path: "/" };

// POST /api/auth/view-as { role | null } - "Xem thử vai trò"; null = ve Admin that. Tat "xem nhu nguoi dung".
auth.post("/view-as", verifySessionMiddleware, loadUser, async (c) => {
  if (!c.get("realIsAdmin")) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ role?: unknown }>().catch(() => ({}) as { role?: unknown });
  deleteCookie(c, VIEW_AS_USER_COOKIE, { path: "/" });
  if (body.role === null || body.role === undefined || body.role === "") {
    deleteCookie(c, VIEW_AS_COOKIE, { path: "/" });
    return c.json({ ok: true });
  }
  if (!isViewAsRole(body.role)) return c.json({ error: "INVALID_ROLE" }, 400);
  setCookie(c, VIEW_AS_COOKIE, body.role, cookieOpts);
  return c.json({ ok: true });
});

// GET /api/auth/view-as-user/options?q= - tai khoan that (users da duyet, chua khoa) + KTV trong danh ba
// chua tung dang nhap. Loc o server (danh ba KTV ~1000 dong), toi da 50 ket qua.
auth.get("/view-as-user/options", verifySessionMiddleware, loadUser, async (c) => {
  if (!c.get("realIsAdmin")) return c.json({ error: "FORBIDDEN" }, 403);
  const q = `%${(c.req.query("q") || "").trim()}%`;
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM (
       SELECT u.email, COALESCE(u.ten, k.ten_hien_thi) AS ten, k.ma_ktv, 1 AS da_dang_nhap,
              u.la_ktv_dvbh, u.la_ve_tinh, u.la_kho, u.la_admin_bh, u.la_nv_sua_chua, u.la_ke_toan, u.la_giam_sat, u.la_view, u.la_qtri
       FROM users u LEFT JOIN ktv_lien_he_bh k ON k.email_dang_nhap = u.email
       WHERE u.trang_thai_duyet = 'Da duyet' AND COALESCE(u.bi_khoa, 0) = 0 AND u.email != ?
       UNION ALL
       SELECT k.email_dang_nhap, k.ten_hien_thi, k.ma_ktv, 0,
              CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 0 ELSE 1 END, CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 1 ELSE 0 END, 0, 0, 0, 0, 0, 0, 0
       FROM ktv_lien_he_bh k
       WHERE k.email_dang_nhap IS NOT NULL AND k.email_dang_nhap != '' AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.email = k.email_dang_nhap)
     ) t
     WHERE t.email LIKE ? OR COALESCE(t.ten, '') LIKE ? OR COALESCE(t.ma_ktv, '') LIKE ?
     ORDER BY t.da_dang_nhap DESC, t.ten LIMIT 50`,
  )
    .bind(c.get("realEmail"), q, q, q)
    .all();
  return c.json({ rows: results });
});

// POST /api/auth/view-as-user { email | null } - bat/doi/thoat "Xem như người dùng". Tat "xem thu vai tro".
auth.post("/view-as-user", verifySessionMiddleware, loadUser, async (c) => {
  if (!c.get("realIsAdmin")) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ email?: string | null }>().catch(() => ({}) as { email?: string | null });
  const email = body.email?.trim();
  deleteCookie(c, VIEW_AS_COOKIE, { path: "/" });
  if (!email || email === c.get("realEmail")) {
    deleteCookie(c, VIEW_AS_USER_COOKIE, { path: "/" });
    return c.json({ ok: true });
  }
  if (!(await loadTargetUser(c.env.DB, email))) return c.json({ error: "TAI_KHOAN_KHONG_HOAT_DONG" }, 400);
  setCookie(c, VIEW_AS_USER_COOKIE, email, cookieOpts);
  return c.json({ ok: true });
});

export default auth;
