import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../types";
import { signSession } from "../lib/jwt";
import { verifySessionMiddleware, SESSION_COOKIE, SESSION_TTL_SECONDS } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";

// Adapted tu linh-kien-app/backend/src/routes/auth.ts - Giai doan 1 BO "xem thu vai tro" (view-as) va
// "nguoi-directory" (danh ba email->ten dung chung toan he thong), chua can cho scaffold ban dau; co
// the them lai khi port cac man hinh thuc su dung chung.

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
    const ktvRow = await c.env.DB.prepare("SELECT vai_tro_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?")
      .bind(userInfo.email)
      .first<{ vai_tro_ktv: string | null }>();
    if (ktvRow) {
      ktvMatch = {
        laKtvDvbh: ktvRow.vai_tro_ktv === "Ve tinh" ? 0 : 1,
        laVeTinh: ktvRow.vai_tro_ktv === "Ve tinh" ? 1 : 0,
      };
    }
  }

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
       ON CONFLICT(email) DO UPDATE SET ten = excluded.ten, updated_at = ?`,
    )
      .bind(userInfo.email, userInfo.name ?? null, isBootstrapAdmin ? "Da duyet" : "Cho duyet", isBootstrapAdmin ? 1 : 0, nowVN())
      .run();
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
  return c.json({ ok: true });
});

auth.get("/me", verifySessionMiddleware, loadUser, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

export default auth;
