import { Hono } from "hono";
import type { Env } from "./types";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import phieuGuiRoutes from "./routes/phieuGui";
import khoRoutes from "./routes/kho";
import adminBHRoutes from "./routes/adminBH";
import nvSuaChuaRoutes from "./routes/nvSuaChua";
import phieuTraRoutes from "./routes/phieuTra";
import settingsRoutes from "./routes/settings";
import linhKienRoutes from "./routes/linhKien";
import traCuuRoutes from "./routes/traCuu";
import logsRoutes from "./routes/logs";
import syncRoutes from "./routes/sync";
import caseLookupRoutes from "./routes/caseLookup";
import ktvLienHeRoutes from "./routes/ktvLienHe";

// He doc lap "Sua chua bao hanh" (Worker "suachua"). Giai doan 3: mount toan bo route nghiep vu (KTV/
// Kho/Admin BH/NV sua chua/Ke toan/Giam sat/View), port dung tu prototype-html/index.html - xem
// CLAUDE.md "Trien khai day du Giai doan 3-6". Khong co cron job (Worker nay la BEN NHAN cua co che
// day tu linh-kien-app, xem routes/sync.ts).
const app = new Hono<{ Bindings: Env }>();

app.route("/api/auth", authRoutes);
app.route("/api/users", usersRoutes);
app.route("/api/phieu-gui", phieuGuiRoutes);
app.route("/api/kho", khoRoutes);
app.route("/api/admin", adminBHRoutes);
app.route("/api/nv", nvSuaChuaRoutes);
app.route("/api/phieu-tra", phieuTraRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/linh-kien", linhKienRoutes);
app.route("/api/tra-cuu", traCuuRoutes);
app.route("/api/logs", logsRoutes);
app.route("/api/partner/sync", syncRoutes);
app.route("/api/case-lookup", caseLookupRoutes);
app.route("/api/ktv-lien-he", ktvLienHeRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
};
