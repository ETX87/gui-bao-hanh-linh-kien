import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { verifySession, signSession } from "../lib/jwt";
import type { Env } from "../types";

// Session cookie RIENG cho suachua - KHONG dung ten "dvbh_session" nhu dvbh/linh-kien-app de tranh
// nham lan neu 1 nguoi dung mo ca 3 app tren cung 1 trinh duyet/domain con (moi Worker o 1 subdomain
// workers.dev khac nhau nen thuc ra khong xung dot cookie, nhung dat ten rieng van ro rang hon).
export const SESSION_COOKIE = "suachua_session";
// 72h + gia han theo hoat dong (sliding window) - dung y het quy uoc da chot cua linh-kien-app (xem
// CLAUDE.md repo do): tranh nguoi dung bi dang xuat giua luc dang lam viec.
export const SESSION_TTL_SECONDS = 72 * 60 * 60;

export async function verifySessionMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "MISSING_TOKEN" }, 401);

  const payload = await verifySession(token, c.env.SESSION_SECRET);
  if (!payload) return c.json({ error: "INVALID_TOKEN" }, 401);

  c.set("email", payload.email);

  // Gia han phien (sliding window): chi ky lai/cap nhat cookie khi thoi gian con lai duoi 50% tong
  // thoi gian song (~36h) - giam tai tinh toan ma hoa khi trinh duyet gui dong loat nhieu request.
  const now = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - now;
  if (remaining < SESSION_TTL_SECONDS / 2) {
    const freshToken = await signSession({ email: payload.email }, c.env.SESSION_SECRET, SESSION_TTL_SECONDS);
    setCookie(c, SESSION_COOKIE, freshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: SESSION_TTL_SECONDS,
      path: "/",
    });
  }

  await next();
}
