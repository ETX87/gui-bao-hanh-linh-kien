import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { viewKhuVucEmailInSql } from "../lib/scope";

// Man hinh "Giam sat" (la_giam_sat, scope qua email_gs) va "View" (la_view, scope theo Khu vuc qua
// user_khu_vuc_bh) - THUAN CHI XEM, khong co route nao lam doi du lieu o day (dung nguyen tac da
// chot: "man quanly/View THUAN CHI XEM, khong duoc co bat ky control nao lam doi du lieu").

const traCuu = new Hono<{ Bindings: Env }>();
traCuu.use("*", verifySessionMiddleware, loadUser);

// Tra ve {whereSql, binds} loc theo dung vai tro dang goi - qtri/admin_bh xem tat ca.
function scopeClause(user: { la_giam_sat: boolean; la_view: boolean; la_qtri: boolean; la_admin_bh: boolean; email: string }): { where: string; binds: unknown[] } {
  if (user.la_qtri || user.la_admin_bh) return { where: "1=1", binds: [] };
  if (user.la_giam_sat) return { where: "p.email_gs = ?", binds: [user.email] };
  if (user.la_view) return { where: `COALESCE(g.nguoi_tao, '') IN ${viewKhuVucEmailInSql()}`, binds: [user.email] };
  return { where: "1=0", binds: [] };
}

traCuu.get("/don-vi", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const kw = (c.req.query("q") || "").trim().toLowerCase();
  const { where, binds } = scopeClause(user);
  const { results } = await c.env.DB.prepare(
    `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang, p.phieu_gui_id, g.nguoi_tao as ktv
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE ${where}
     ORDER BY u.updated_at DESC`,
  )
    .bind(...binds)
    .all();
  if (!kw) return c.json({ don_vi: results });
  return c.json({ don_vi: results.filter((r) => JSON.stringify(r).toLowerCase().includes(kw)) });
});

traCuu.get("/tong-quan", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const { where, binds } = scopeClause(user);
  const { results } = await c.env.DB.prepare(
    `SELECT u.trang_thai, COUNT(*) as cnt
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE ${where}
     GROUP BY u.trang_thai`,
  )
    .bind(...binds)
    .all();
  return c.json({ theo_trang_thai: results });
});

export default traCuu;
