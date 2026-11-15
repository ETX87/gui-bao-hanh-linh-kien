import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { tinhBaoCaoNghen } from "../lib/baoCaoNghen";

// GET /api/bao-cao-nghen?tu=YYYY-MM-DD&den=YYYY-MM-DD[&lam_moi=1] - bao cao "Diem nghen & trach nhiem" (lib/baoCaoNghen.ts).
// Admin he thong, Admin BH, Giam sat, View. Ket qua luu sync_state 30 phut theo (pham vi, ky) de khong quet lai moi lan mo;
// "Tinh lai" toi da 1 lan / 2 phut.
const r = new Hono<{ Bindings: Env }>();
r.use("*", verifySessionMiddleware, loadUser);

const LUU_MS = 30 * 60_000;
const LAM_MOI_MS = 2 * 60_000;
const ms = (s: string) => Date.parse(s.replace(" ", "T") + "Z");

r.get("/", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh || user.la_giam_sat || user.la_view)) return c.json({ error: "FORBIDDEN" }, 403);
  const now = nowVN();
  const homNay = now.slice(0, 10);
  const den = /^\d{4}-\d{2}-\d{2}$/.test(c.req.query("den") || "") ? c.req.query("den")! : homNay;
  const tuMacDinh = new Date(ms(den + " 00:00:00") - 29 * 86_400_000).toISOString().slice(0, 10);
  const tu = /^\d{4}-\d{2}-\d{2}$/.test(c.req.query("tu") || "") ? c.req.query("tu")! : tuMacDinh;
  if (tu > den || ms(den + " 00:00:00") - ms(tu + " 00:00:00") > 366 * 86_400_000) return c.json({ error: "INVALID_KHOANG" }, 400);
  // Khoa cache theo pham vi xem (khong theo email khi pham vi giong nhau).
  const pv = user.la_qtri ? "all" : user.la_admin_bh ? `mien:${user.mien || "ALL"}` : user.email;
  const key = `bao_cao_nghen:${pv}:${tu}:${den}`;
  const row = await c.env.DB.prepare("SELECT value, updated_at FROM sync_state WHERE key = ?").bind(key).first<{ value: string; updated_at: string }>();
  const lamMoi = c.req.query("lam_moi") === "1";
  if (row) {
    const tuoi = ms(now) - ms(row.updated_at);
    if ((!lamMoi && tuoi < LUU_MS) || (lamMoi && tuoi < LAM_MOI_MS)) {
      try {
        return c.json({ ...JSON.parse(row.value), tinh_luc: row.updated_at, tu_bo_nho: true });
      } catch {
        /* tinh lai */
      }
    }
  }
  const kq = await tinhBaoCaoNghen(c.env.DB, user, tu, den);
  await c.env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(key, JSON.stringify(kq), now)
    .run();
  // Don khoa cu (> 2 ngay) cua bao cao nay de sync_state khong phinh.
  c.executionCtx.waitUntil(
    c.env.DB.prepare("DELETE FROM sync_state WHERE key LIKE 'bao_cao_nghen:%' AND updated_at < ?").bind(new Date(ms(now) - 2 * 86_400_000).toISOString().replace("T", " ").slice(0, 19)).run().then(() => undefined).catch(() => undefined),
  );
  return c.json({ ...kq, tinh_luc: now, tu_bo_nho: false });
});

export default r;
