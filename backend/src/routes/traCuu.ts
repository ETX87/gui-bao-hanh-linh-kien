import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { viewKhuVucEmailInSql } from "../lib/scope";
import { parsePage } from "../lib/pagination";
import { slaCutoffVn } from "../lib/sla";

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

// Phan trang that o tang SQL (LIMIT/OFFSET + COUNT) - day la bang "tra cuu MOI don hang toan he
// thong", co kha nang phinh to nhat trong ca he thong nen uu tien phan trang dung dan nhat. "q" chuyen
// tu "JSON.stringify toan dong roi loc o server" (ban cu, bat buoc phai SELECT het du lieu ve truoc)
// sang SQL LIKE tren dung cac cot hien thi tren bang.
traCuu.get("/don-vi", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const kw = (c.req.query("q") || "").trim();
  const { limit, offset } = parsePage(c);
  const { where: scopeWhere, binds: scopeBinds } = scopeClause(user);
  let where = scopeWhere;
  const binds = [...scopeBinds];
  if (kw) {
    where += " AND (u.id LIKE ? OR p.case_id LIKE ? OR p.ma_lk LIKE ? OR p.mo_ta_loi LIKE ? OR p.ten_khach_hang LIKE ? OR g.nguoi_tao LIKE ?)";
    const like = `%${kw}%`;
    binds.push(like, like, like, like, like, like);
  }
  // Loc theo trang thai (Phat hien 12): bam 1 o dem o man Tong quan -> sang day da loc san.
  // "qua_han" = cac trang thai dang cho xu ly ma updated_at cu hon 24h (gio VN).
  const st = (c.req.query("trang_thai") || "").trim();
  if (st === "qua_han") {
    // Moc cat tinh trong JS (slaCutoffVn) vi SLA khong tinh Chu nhat (chot 04/10/2026).
    where += " AND u.trang_thai IN ('cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt','cho_chan_doan','cho_admin_xac_nhan') AND u.updated_at < ?";
    binds.push(slaCutoffVn(24));
  } else if (st) {
    where += " AND u.trang_thai = ?";
    binds.push(st);
  }
  const fromWhere = `FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE ${where}`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang, p.phieu_gui_id, g.nguoi_tao as ktv ${fromWhere} ORDER BY u.updated_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

traCuu.get("/tong-quan", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const { where, binds } = scopeClause(user);
  const fromWhere = `FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE ${where}`;
  const [{ results }, quaHanRow] = await Promise.all([
    c.env.DB.prepare(`SELECT u.trang_thai, COUNT(*) as cnt ${fromWhere} GROUP BY u.trang_thai`).bind(...binds).all(),
    // "qua han SLA" (Phat hien 12): don dang cho xu ly, updated_at cu hon 24h gio VN.
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt ${fromWhere}
         AND u.trang_thai IN ('cho_phan_loai','admin_can_xem_lai','cho_bo_sung_tt','cho_chan_doan','cho_admin_xac_nhan')
         AND u.updated_at < ?`,
    )
      .bind(...binds, slaCutoffVn(24))
      .first<{ cnt: number }>(),
  ]);
  return c.json({ theo_trang_thai: results, qua_han: quaHanRow?.cnt ?? 0 });
});

export default traCuu;
