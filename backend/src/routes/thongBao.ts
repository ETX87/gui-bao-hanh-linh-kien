import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { dungTongHop, layHoacTaoHomNay, denGioBao, GIO_BAO, type TbRow } from "../lib/thongBao";
import { sendPushToUser } from "../lib/webPush";

// 15/11/2026 - chuong thong bao trong app + dang ky Web Push (lib/thongBao.ts, lib/webPush.ts).
const tb = new Hono<{ Bindings: Env }>();
tb.use("*", verifySessionMiddleware, loadUser);

function parse(r: TbRow) {
  let nd: { nhom?: unknown[] } = {};
  try {
    nd = JSON.parse(r.noi_dung || "{}");
  } catch {
    /* bo qua */
  }
  return { id: r.id, ngay: r.ngay, tieu_de: r.tieu_de, tom_tat: r.tom_tat, tong: r.tong, da_doc: !!r.da_doc, da_push: r.da_push, created_at: r.created_at, nhom: nd.nhom ?? [] };
}

// Danh sach 10 ban gan nhat (tu tao ban hom nay neu da qua 12h).
tb.get("/", async (c) => {
  const user = c.get("user");
  // Che do "xem nhu nguoi dung" chi doc: khong tao ban moi cho nguoi khac.
  if (!c.get("viewAsUser")) await layHoacTaoHomNay(c.env.DB, user, c.env.THONG_BAO_NOW_TEST || nowVN()).catch((e) => console.error("[thongBao] tao", e instanceof Error ? e.message : e));
  const { results } = await c.env.DB.prepare("SELECT * FROM thong_bao_bh WHERE email = ? AND tieu_de <> '' ORDER BY ngay DESC LIMIT 10").bind(user.email).all<TbRow>();
  const sub = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM push_subscriptions_bh WHERE email = ?").bind(user.email).first<{ n: number }>();
  return c.json({
    items: results.map(parse),
    chua_doc: results.filter((r) => !r.da_doc && r.tong > 0).length,
    gio_bao: GIO_BAO,
    da_toi_gio: denGioBao(c.env.THONG_BAO_NOW_TEST || nowVN()),
    so_thiet_bi: sub?.n ?? 0,
  });
});

// Xem truoc ban tong hop ngay bay gio (khong luu).
tb.get("/xem-truoc", async (c) => {
  const th = await dungTongHop(c.env.DB, c.get("user"));
  return c.json({ ...th, ngay: nowVN().slice(0, 10) });
});

tb.post("/:id/doc", async (c) => {
  await c.env.DB.prepare("UPDATE thong_bao_bh SET da_doc = 1 WHERE id = ? AND email = ?").bind(Number(c.req.param("id")), c.get("user").email).run();
  return c.json({ ok: true });
});
tb.post("/doc-het", async (c) => {
  await c.env.DB.prepare("UPDATE thong_bao_bh SET da_doc = 1 WHERE email = ? AND da_doc = 0").bind(c.get("user").email).run();
  return c.json({ ok: true });
});

// ---- Web Push ----
tb.get("/push/vapid-public-key", (c) => c.json({ publicKey: c.env.VAPID_SERVER_PUBLIC_KEY || "" }));

tb.post("/push/subscribe", async (c) => {
  const user = c.get("user");
  const b = await c.req.json<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>().catch(() => ({}) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } });
  const endpoint = String(b.endpoint || "");
  if (!/^https:\/\//.test(endpoint) || !b.keys?.p256dh || !b.keys?.auth) return c.json({ error: "INVALID_SUBSCRIPTION" }, 400);
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions_bh (email, endpoint, p256dh, auth, ngay_tao) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET email = excluded.email, p256dh = excluded.p256dh, auth = excluded.auth`,
  )
    .bind(user.email, endpoint, b.keys.p256dh, b.keys.auth, nowVN())
    .run();
  return c.json({ ok: true });
});

tb.post("/push/unsubscribe", async (c) => {
  const b = await c.req.json<{ endpoint?: string }>().catch(() => ({}) as { endpoint?: string });
  await c.env.DB.prepare("DELETE FROM push_subscriptions_bh WHERE endpoint = ? AND email = ?").bind(String(b.endpoint || ""), c.get("user").email).run();
  return c.json({ ok: true });
});

// Gui thu 1 thong bao toi chinh may cua minh (kiem tra da bat dung chua).
tb.post("/push/thu", async (c) => {
  const user = c.get("user");
  const th = await dungTongHop(c.env.DB, user);
  const ok = await sendPushToUser(c.env, user.email, { title: "🔔 Thử: " + th.tieu_de, body: th.tom_tat.slice(0, 300), url: "/#/home?thong_bao=1" });
  if (!ok) return c.json({ error: c.env.VAPID_SERVER_PRIVATE_KEY ? "PUSH_KHONG_GUI_DUOC" : "PUSH_CHUA_CAU_HINH" }, 400);
  return c.json({ ok: true, thiet_bi: ok });
});

export default tb;
