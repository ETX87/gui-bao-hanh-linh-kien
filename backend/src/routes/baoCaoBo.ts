import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { tinhBaoCaoBo } from "../lib/baoCaoBo";
import { nowVN } from "../lib/vnTime";

// GET /api/bao-cao-bo?thang=YYYY-MM - ket qua lam viec tung vai tro BO theo thang (xem lib/baoCaoBo.ts).
// Chi Admin he thong, Admin bao hanh, View (quan ly / kiem soat) xem duoc. Tinh truc tiep moi lan mo.
const baoCaoBo = new Hono<{ Bindings: Env }>();
baoCaoBo.use("*", verifySessionMiddleware, loadUser);

baoCaoBo.get("/", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh || user.la_view))
    return c.json({ error: "FORBIDDEN" }, 403);
  const thang = c.req.query("thang") || nowVN().slice(0, 7);
  const r = await tinhBaoCaoBo(c.env.DB, thang);
  if (!r) return c.json({ error: "INVALID_THANG" }, 400);
  return c.json(r);
});

export default baoCaoBo;
