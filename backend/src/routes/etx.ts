import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { runEtxSync } from "../lib/etxSync";

// Dong bo "ETX nhan su" (16/10/2026, xem lib/etxSync.ts) - the "👥 Đồng bộ ETX nhân sự" o Cai dat he thong.
const etx = new Hono<{ Bindings: Env }>();
etx.use("*", verifySessionMiddleware, loadUser);

// Tai khoan dang mo, da duyet nhung Gmail chi con ma "nghi viec" tren ETX (khong co ma nao dang lam) - lan dau dong bo
// khong tu khoa nhung nguoi nay, Admin xem danh sach roi tu quyet.
const NGHI_MA_MO_SQL = `
  FROM users u
  WHERE COALESCE(u.bi_khoa, 0) = 0 AND u.trang_thai_duyet = 'Da duyet'
    AND EXISTS (SELECT 1 FROM etx_nhan_su_bh e WHERE e.gmail = LOWER(u.email) AND e.trang_thai_lam_viec = 'off')
    AND NOT EXISTS (SELECT 1 FROM etx_nhan_su_bh e WHERE e.gmail = LOWER(u.email) AND e.trang_thai_lam_viec = 'on')`;

// GET /api/etx/status
etx.get("/status", async (c) => {
  const user = c.get("user");
  if (!user.la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const db = c.env.DB;
  const [last, dem, nghiMaMo, khoaEtx] = await Promise.all([
    db.prepare("SELECT value FROM sync_state WHERE key = 'etx_last'").first<{ value: string }>(),
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM users WHERE COALESCE(bi_khoa,0) = 0 AND LOWER(email) IN (SELECT gmail FROM etx_nhan_su_bh WHERE trang_thai_lam_viec = 'on')) AS tk_dang_lam,
           (SELECT COUNT(*) FROM users WHERE LOWER(email) NOT IN (SELECT gmail FROM etx_nhan_su_bh WHERE gmail IS NOT NULL)) AS tk_khong_co_etx`,
      )
      .first<{ tk_dang_lam: number; tk_khong_co_etx: number }>(),
    db.prepare(`SELECT u.email, u.ten, u.la_qtri ${NGHI_MA_MO_SQL} ORDER BY u.email LIMIT 200`).all(),
    db.prepare("SELECT email, ten FROM users WHERE khoa_boi_etx = 1 AND bi_khoa = 1 ORDER BY email LIMIT 200").all(),
  ]);
  let lan_gan_nhat: unknown = null;
  try {
    lan_gan_nhat = last ? JSON.parse(last.value) : null;
  } catch {
    lan_gan_nhat = null;
  }
  return c.json({ lan_gan_nhat, ...dem, nghi_ma_dang_mo: nghiMaMo.results, khoa_boi_etx: khoaEtx.results });
});

// POST /api/etx/sync-now
etx.post("/sync-now", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await runEtxSync(c.env));
});

// POST /api/etx/khoa-nghi-viec - { emails: string[] } khoa cac tai khoan ETX bao nghi viec (Admin chon tu danh sach
// "dang mo nhung ETX bao nghi"). Chi khoa duoc dung nguoi dang nam trong danh sach do, khong khoa Admin he thong / chinh minh.
etx.post("/khoa-nghi-viec", async (c) => {
  const user = c.get("user");
  if (!user.la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ emails?: string[] }>().catch(() => ({}) as { emails?: string[] });
  const emails = (body.emails ?? []).map((e) => String(e).trim().toLowerCase()).filter(Boolean).slice(0, 500);
  if (!emails.length) return c.json({ error: "MISSING_IDS" }, 400);
  const r = await c.env.DB.prepare(
    `UPDATE users SET bi_khoa = 1, khoa_boi_etx = 1, updated_at = ?
     WHERE email IN (SELECT u.email ${NGHI_MA_MO_SQL})
       AND la_qtri = 0 AND LOWER(email) <> ? AND LOWER(email) IN (SELECT value FROM json_each(?))`,
  )
    .bind(nowVN(), user.email.toLowerCase(), JSON.stringify(emails))
    .run();
  return c.json({ ok: true, da_khoa: r.meta?.changes ?? 0 });
});

export default etx;
