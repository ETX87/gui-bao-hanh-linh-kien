import { Hono } from "hono";
import type { Env } from "./types";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";

// He doc lap "Sua chua bao hanh" (Worker "suachua") - Giai doan 1: scaffold ha tang (xem CLAUDE.md
// muc "Cau hoi #6 chot xong..." + file phan tich "Phan-Tich-Va-Ke-Hoach-Chuyen-Doi-Cloudflare.md").
// Domain suachua.dichvu3t.workers.dev DA online that (ban rong/placeholder truoc do) - repo nay
// (gui-bao-hanh-linh-kien) la nguon that se lap day Worker do.
//
// Chi mount 2 route o Giai doan 1 (auth + users quan tri) - toan bo route nghiep vu (phieu gui/don
// sua chua/phieu tra/FAST actions...) la viec cua Giai doan 3, CHUA viet o day. Khong co cron job o
// Giai doan 1 (Worker nay la BEN NHAN cua co che day tu linh-kien-app, khong phai ben phat - xem
// wrangler.jsonc).
const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
};
