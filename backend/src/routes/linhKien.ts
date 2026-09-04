import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { parsePage } from "../lib/pagination";

// Danh muc linh kien - HYBRID dong bo (nguon_du_lieu='dong_bo', Giai doan 5 se nhan qua
// /api/sync/linh-kien) + tu tao them noi bo (nguon_du_lieu='noi_bo', CRUD day du o day). Admin BH
// quan ly ca 2 loai, nhung CHI sua duoc ten/gia/anh cho dong "noi_bo" - dong "dong_bo" chi sua duoc
// 2 cot rieng cua bao hanh (so_thang_bao_hanh, duoc_dung_bao_hanh) vi cac cot con lai phai theo dung
// linh-kien-app (sua o do se tu day sang, sua truc tiep o day se bi de len khi dot dong bo tiep theo
// chay).

const linhKien = new Hono<{ Bindings: Env }>();
linhKien.use("*", verifySessionMiddleware, loadUser);

function requireAdminBH(c: { get(k: "user"): { la_admin_bh: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_admin_bh || u.la_qtri;
}

// GET /linh-kien?duoc_dung_bao_hanh=1&q=&limit=&offset= - 2 kieu goi khac nhau CO CHU DICH:
// (a) khong truyen "limit" - tra TOAN BO danh sach khop dieu kien, dung cho picker (useLinhKien.ts,
//     SearchableSelect can du option de tu loc client-side, khong the phan trang - phan trang se lam
//     hong UX "go de tim thay ngay" cua combobox); (b) co truyen "limit" - phan trang that o SQL, dung
//     cho man "Danh muc linh kien" (LinhKienScreen.tsx, admin duyet toan bo danh muc) - xem
//     CLAUDE.md "Phan trang toan bo bang du lieu" (05/09/2026).
linhKien.get("/", async (c) => {
  const chiDuocDung = c.req.query("duoc_dung_bao_hanh");
  const kw = (c.req.query("q") || "").trim();
  let where = "1=1";
  const binds: unknown[] = [];
  if (chiDuocDung === "1") where += " AND duoc_dung_bao_hanh = 1";
  if (kw) {
    where += " AND (ten_lk LIKE ? OR ma_lk LIKE ?)";
    const like = `%${kw}%`;
    binds.push(like, like);
  }
  if (c.req.query("limit") === undefined) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM linh_kien_bh WHERE ${where} ORDER BY ten_lk`)
      .bind(...binds)
      .all();
    return c.json({ linh_kien: results });
  }
  const { limit, offset } = parsePage(c);
  const fromWhere = `FROM linh_kien_bh WHERE ${where}`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * ${fromWhere} ORDER BY ten_lk LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ linh_kien: results, total: totalRow?.cnt ?? 0 });
});

interface CreateBody {
  ma_lk?: string;
  ten_lk?: string;
  don_vi?: string;
  ghi_chu?: string;
  anh_demo?: string;
  so_thang_bao_hanh?: number;
  loai_hang?: string;
}

linhKien.post("/", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<CreateBody>().catch(() => ({}) as CreateBody);
  if (!body.ma_lk?.trim() || !body.ten_lk?.trim()) return c.json({ error: "MISSING_FIELDS" }, 400);
  const existing = await c.env.DB.prepare("SELECT 1 FROM linh_kien_bh WHERE ma_lk = ?").bind(body.ma_lk.trim()).first();
  if (existing) return c.json({ error: "MA_LK_EXISTS" }, 409);
  await c.env.DB.prepare(
    `INSERT INTO linh_kien_bh (ma_lk, ten_lk, don_vi, ghi_chu, anh_demo, so_thang_bao_hanh, loai_hang, nguon_du_lieu, nguoi_cap_nhat, ngay_cap_nhat)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'noi_bo', ?, ?)`,
  )
    .bind(body.ma_lk.trim(), body.ten_lk.trim(), body.don_vi || "", body.ghi_chu || "", body.anh_demo || "", body.so_thang_bao_hanh ?? null, body.loai_hang || "", user.email, nowVN())
    .run();
  return c.json({ ok: true }, 201);
});

interface PatchBody {
  ten_lk?: string;
  don_vi?: string;
  ghi_chu?: string;
  anh_demo?: string;
  so_thang_bao_hanh?: number;
  loai_hang?: string;
  duoc_dung_bao_hanh?: boolean;
}

linhKien.patch("/:ma", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const ma = c.req.param("ma");
  const row = await c.env.DB.prepare("SELECT nguon_du_lieu FROM linh_kien_bh WHERE ma_lk = ?").bind(ma).first<{ nguon_du_lieu: string }>();
  if (!row) return c.json({ error: "NOT_FOUND" }, 404);
  const body = await c.req.json<PatchBody>().catch(() => ({}) as PatchBody);

  if (row.nguon_du_lieu === "dong_bo") {
    // Dong dong bo: CHI sua duoc 2 cot rieng cua bao hanh.
    await c.env.DB.prepare("UPDATE linh_kien_bh SET so_thang_bao_hanh = COALESCE(?, so_thang_bao_hanh), duoc_dung_bao_hanh = COALESCE(?, duoc_dung_bao_hanh), nguoi_cap_nhat = ?, ngay_cap_nhat = ? WHERE ma_lk = ?")
      .bind(body.so_thang_bao_hanh ?? null, body.duoc_dung_bao_hanh === undefined ? null : body.duoc_dung_bao_hanh ? 1 : 0, user.email, nowVN(), ma)
      .run();
  } else {
    await c.env.DB.prepare(
      `UPDATE linh_kien_bh SET
         ten_lk = COALESCE(?, ten_lk), don_vi = COALESCE(?, don_vi), ghi_chu = COALESCE(?, ghi_chu),
         anh_demo = COALESCE(?, anh_demo), so_thang_bao_hanh = COALESCE(?, so_thang_bao_hanh),
         loai_hang = COALESCE(?, loai_hang), duoc_dung_bao_hanh = COALESCE(?, duoc_dung_bao_hanh),
         nguoi_cap_nhat = ?, ngay_cap_nhat = ?
       WHERE ma_lk = ?`,
    )
      .bind(
        body.ten_lk ?? null,
        body.don_vi ?? null,
        body.ghi_chu ?? null,
        body.anh_demo ?? null,
        body.so_thang_bao_hanh ?? null,
        body.loai_hang ?? null,
        body.duoc_dung_bao_hanh === undefined ? null : body.duoc_dung_bao_hanh ? 1 : 0,
        user.email,
        nowVN(),
        ma,
      )
      .run();
  }
  return c.json({ ok: true });
});

export default linhKien;
