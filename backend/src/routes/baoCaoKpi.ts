import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { thangRange } from "../lib/baoCaoBo";
import { tinhBaoCaoKpi } from "../lib/baoCaoKpi";
import { nowVN } from "../lib/vnTime";

// GET /api/bao-cao-kpi?thang=YYYY-MM - BC KPIs nhan vien theo thang (lib/baoCaoKpi.ts).
// 25/11/2026: "bc này không cần chạy liên tục, chỉ cần thêm nút load bc, thì mới load số liệu khi cần" -> khong cache,
// khong cron; frontend chi goi khi bam "Tải số liệu". Quyen nhu Bao cao BO: Admin he thong, Admin BH, View.
const baoCaoKpi = new Hono<{ Bindings: Env }>();
baoCaoKpi.use("*", verifySessionMiddleware, loadUser);

baoCaoKpi.get("/", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh || user.la_view)) return c.json({ error: "FORBIDDEN" }, 403);
  const thang = c.req.query("thang") || nowVN().slice(0, 7);
  if (!thangRange(thang)) return c.json({ error: "INVALID_THANG" }, 400);
  const r = await tinhBaoCaoKpi(c.env.DB, thang);
  if (!r) return c.json({ error: "INVALID_THANG" }, 400);
  return c.json(r);
});

export default baoCaoKpi;
