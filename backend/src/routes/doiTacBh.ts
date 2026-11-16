import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";

// 16/11/2026 (v1.142, migration 0041) - Danh muc "Doi tac" cua don bao hanh (chot: "Danh mục trong Cài đặt" - tu nap tu CRM, Admin them / sua,
// danh dau doi tac Karofi). Dung de: (1) Admin BH chon Doi tac khi day don sang NV sua chua; (2) chon loai de xuat cap linh kien (Karofi + con
// bao hanh = HỖ TRỢ SỬA CHỮA 0 ĐỒNG); (3) gioi han vai tro "Tra xac" theo doi tac (user_doi_tac_bh).
//  - GET  /api/doi-tac           moi tai khoan da dang nhap (o chon)
//  - POST /api/doi-tac           {ten, la_karofi?, ghi_chu?}            Admin BH / qtri
//  - PATCH /api/doi-tac/:id      {ten?, la_karofi?, bat_tat?, ghi_chu?} Admin BH / qtri
const doiTac = new Hono<{ Bindings: Env }>();
doiTac.use("*", verifySessionMiddleware, loadUser);
const duocSua = (u: AppUser) => u.la_qtri || u.la_admin_bh;

doiTac.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT d.*, (SELECT COUNT(*) FROM user_doi_tac_bh ud WHERE ud.doi_tac_id = d.id) AS so_nguoi_tra_xac
     FROM doi_tac_bh d ORDER BY d.bat_tat DESC, d.stt, d.ten`,
  ).all();
  return c.json({ rows: results });
});

doiTac.post("/", async (c) => {
  const user = c.get("user");
  if (!duocSua(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const b = await c.req.json<{ ten?: string; la_karofi?: boolean; ghi_chu?: string }>().catch(() => ({}) as { ten?: string; la_karofi?: boolean; ghi_chu?: string });
  const ten = (b.ten || "").trim().replace(/\s+/g, " ").slice(0, 200);
  if (!ten) return c.json({ error: "THIEU_TEN" }, 400);
  const co = await c.env.DB.prepare("SELECT id FROM doi_tac_bh WHERE ten = ? COLLATE NOCASE").bind(ten).first<{ id: number }>();
  if (co) return c.json({ error: "TEN_DA_CO", id: co.id }, 409);
  const now = nowVN();
  const r = await c.env.DB.prepare("INSERT INTO doi_tac_bh (ten, la_karofi, ghi_chu, nguoi_cap_nhat, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(ten, b.la_karofi ? 1 : 0, (b.ghi_chu || "").trim().slice(0, 500) || null, user.email, now, now).run();
  return c.json({ ok: true, id: r.meta.last_row_id }, 201);
});

doiTac.patch("/:id", async (c) => {
  const user = c.get("user");
  if (!duocSua(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = Number(c.req.param("id"));
  const d = await c.env.DB.prepare("SELECT * FROM doi_tac_bh WHERE id = ?").bind(id).first<{ id: number; ten: string; la_karofi: number; bat_tat: number; ghi_chu: string | null }>();
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
  const b = await c.req.json<{ ten?: string; la_karofi?: boolean; bat_tat?: boolean; ghi_chu?: string }>().catch(() => ({}) as Record<string, never>);
  const ten = b.ten !== undefined ? String(b.ten).trim().replace(/\s+/g, " ").slice(0, 200) : d.ten;
  if (!ten) return c.json({ error: "THIEU_TEN" }, 400);
  if (ten.toLowerCase() !== d.ten.toLowerCase()) {
    const co = await c.env.DB.prepare("SELECT id FROM doi_tac_bh WHERE ten = ? COLLATE NOCASE AND id <> ?").bind(ten, id).first();
    if (co) return c.json({ error: "TEN_DA_CO" }, 409);
  }
  await c.env.DB.prepare("UPDATE doi_tac_bh SET ten = ?, la_karofi = ?, bat_tat = ?, ghi_chu = ?, nguoi_cap_nhat = ?, updated_at = ? WHERE id = ?")
    .bind(
      ten,
      b.la_karofi === undefined ? d.la_karofi : b.la_karofi ? 1 : 0,
      b.bat_tat === undefined ? d.bat_tat : b.bat_tat ? 1 : 0,
      b.ghi_chu === undefined ? d.ghi_chu : String(b.ghi_chu).trim().slice(0, 500) || null,
      user.email,
      nowVN(),
      id,
    )
    .run();
  return c.json({ ok: true });
});

export default doiTac;
