import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { computeGiaiDoanTb, tinhCanhBao } from "../lib/canhBao";

// GET /api/canh-bao - canh bao don ton + thoi gian xu ly trung binh theo tung giai doan, chi cac giai
// doan thuoc vai tro cua nguoi xem (Giam sat / View / qtri thay toan bo theo pham vi). Xem lib/canhBao.ts.
const canhBao = new Hono<{ Bindings: Env }>();
canhBao.use("*", verifySessionMiddleware, loadUser);

canhBao.get("/", async (c) => {
  const user = c.get("user");
  const r = await tinhCanhBao(c.env.DB, user);
  // Lan dau (chua co so trung binh) -> tinh ngay 1 lan, cac lan sau de cron lam.
  if (!r.tb_cap_nhat) {
    await computeGiaiDoanTb(c.env.DB).catch(() => undefined);
    return c.json(await tinhCanhBao(c.env.DB, user));
  }
  return c.json(r);
});

// Tinh lai thoi gian trung binh ngay (Admin BH / qtri).
canhBao.post("/tinh-lai", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  await computeGiaiDoanTb(c.env.DB);
  return c.json(await tinhCanhBao(c.env.DB, user));
});

export default canhBao;
