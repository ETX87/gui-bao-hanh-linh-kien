import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";

// Danh muc "Ly do cham" / "Ly do huy" - man "#/qtri/cai-dat" (Admin he thong). Seed san 8+5 gia tri
// that trong migrations/0001_init.sql - route nay chi CRUD them/xoa/bat-tat.

const settings = new Hono<{ Bindings: Env }>();
settings.use("*", verifySessionMiddleware, loadUser);

function requireQtri(c: { get(k: "user"): { la_qtri: boolean } }) {
  return c.get("user").la_qtri;
}

function crudFor(table: "settings_ly_do_cham_bh" | "settings_ly_do_tu_choi_bh") {
  const group = new Hono<{ Bindings: Env }>();
  group.use("*", verifySessionMiddleware, loadUser);

  // GET mo cho moi vai tro dang nhap (can hien trong dropdown chon ly do o nhieu man hinh nghiep vu).
  group.get("/", async (c) => {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} WHERE bat_tat = 1 ORDER BY stt, id`).all();
    return c.json({ items: results });
  });

  group.post("/", async (c) => {
    if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const body = await c.req.json<{ noi_dung?: string }>().catch(() => ({}) as { noi_dung?: string });
    if (!body.noi_dung?.trim()) return c.json({ error: "MISSING_NOI_DUNG" }, 400);
    await c.env.DB.prepare(`INSERT INTO ${table} (noi_dung) VALUES (?)`).bind(body.noi_dung.trim()).run();
    return c.json({ ok: true }, 201);
  });

  group.patch("/:id", async (c) => {
    if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const body = await c.req.json<{ bat_tat?: boolean; noi_dung?: string }>().catch(() => ({}) as { bat_tat?: boolean; noi_dung?: string });
    if (body.bat_tat !== undefined) await c.env.DB.prepare(`UPDATE ${table} SET bat_tat = ? WHERE id = ?`).bind(body.bat_tat ? 1 : 0, c.req.param("id")).run();
    if (body.noi_dung !== undefined) await c.env.DB.prepare(`UPDATE ${table} SET noi_dung = ? WHERE id = ?`).bind(body.noi_dung.trim(), c.req.param("id")).run();
    return c.json({ ok: true });
  });

  return group;
}

settings.route("/ly-do-cham", crudFor("settings_ly_do_cham_bh"));
settings.route("/ly-do-tu-choi", crudFor("settings_ly_do_tu_choi_bh"));

export default settings;
