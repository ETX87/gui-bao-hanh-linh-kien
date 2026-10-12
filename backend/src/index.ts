import { pushPhanLoaiPending } from "./lib/linhKienPush";
import { maybeComputeTopLinhKien } from "./lib/topLinhKien";
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
import khovanLookupRoutes from "./routes/khovanLookup";
import khuVucRoutes from "./routes/khuVuc";
import partnerKhoRoutes from "./routes/partnerKho";
import workloadRoutes from "./routes/workload";
import odooDonRoutes from "./routes/odooDon";
import mienRoutes from "./routes/mien";
import canhBaoRoutes from "./routes/canhBao";
import lichSuRoutes from "./routes/lichSu";
import deXuatRoutes from "./routes/deXuat";
import { maybeComputeGiaiDoanTb } from "./lib/canhBao";
import { runOdooSync } from "./lib/odooSync";

// He doc lap "Sua chua bao hanh" (Worker "suachua"). Giai doan 3: mount toan bo route nghiep vu (KTV/
// Kho/Admin BH/NV sua chua/Ke toan/Giam sat/View), port dung tu prototype-html/index.html - xem
// CLAUDE.md "Trien khai day du Giai doan 3-6". Cron 15 phut dong bo don Odoo (lib/odooSync.ts); Worker nay cung la BEN NHAN cua co che
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
app.route("/api/partner/box-lookup", khovanLookupRoutes);
app.route("/api/khu-vuc", khuVucRoutes);
app.route("/api/partner/kho-action", partnerKhoRoutes);
app.route("/api/workload", workloadRoutes);
app.route("/api/odoo-don", odooDonRoutes);
app.route("/api/mien", mienRoutes);
app.route("/api/canh-bao", canhBaoRoutes);
app.route("/api/lich-su", lichSuRoutes);
app.route("/api/de-xuat", deXuatRoutes);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "INTERNAL_ERROR" }, 500);
});

app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  // Cron 15 phut (wrangler.jsonc triggers) - keo don bao hanh Odoo tu dvbh + day trang thai gui sua
  // nguoc ve dvbh (lib/odooSync.ts, CLAUDE.md muc "Keo don bao hanh Odoo").
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runOdooSync(env).then(() => undefined));
    ctx.waitUntil(pushPhanLoaiPending(env).then(() => undefined).catch(() => undefined));
    // Top linh kien 30 ngay - tinh 1 lan/ngay o khung gio cai dat (05/10/2026 muc 7).
    // Thoi gian xu ly trung binh tung giai doan (30 ngay) - tinh lai toi da 1 lan/gio (12/10/2026).
    ctx.waitUntil(maybeComputeGiaiDoanTb(env.DB).catch((e) => console.error("[giaiDoanTb]", e instanceof Error ? e.message : e)));
    ctx.waitUntil(maybeComputeTopLinhKien(env.DB).catch((e) => console.error("[topLinhKien]", e instanceof Error ? e.message : e)));
  },
};
