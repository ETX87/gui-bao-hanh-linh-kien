import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { parsePage } from "../lib/pagination";
import { bumpLinhKienVersion, getLinhKienVersion } from "../lib/linhKienVersion";
import { computeTopLinhKien, getLkTopGio } from "../lib/topLinhKien";

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
    where += " AND (ten_lk LIKE ? OR ma_lk LIKE ? OR don_vi LIKE ?)";
    const like = `%${kw}%`;
    binds.push(like, like, like);
  }
  if (c.req.query("limit") === undefined) {
    // Kem hang top 30 ngay (05/10/2026 muc 7) - picker xep top truoc, con lai theo ten. Kem "version"
    // de client luu cache tren may (muc 8). Chi tra cot can cho o chon/tra ten (danh muc ~6.300 dong,
    // bo anh_demo/ghi_chu cho goi cache nhe).
    const [{ results }, version] = await Promise.all([
      c.env.DB.prepare(
        `SELECT l.ma_lk, l.ten_lk, l.don_vi, l.so_thang_bao_hanh, l.duoc_dung_bao_hanh, t.hang AS top_hang, t.so_luong AS top_so_luong FROM linh_kien_bh l LEFT JOIN linh_kien_top_bh t ON t.ma_lk = l.ma_lk
         WHERE ${where.replace("ma_lk LIKE", "l.ma_lk LIKE")} ORDER BY (t.hang IS NULL), t.hang, l.ten_lk`,
      )
        .bind(...binds)
        .all(),
      getLinhKienVersion(c.env.DB),
    ]);
    return c.json({ linh_kien: results, version });
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

// GET /linh-kien/version - 1 dong, client so voi ban cache tren may (05/10/2026 muc 8).
linhKien.get("/version", async (c) => c.json({ version: await getLinhKienVersion(c.env.DB) }));

// GET/PATCH /linh-kien/top-settings - khung gio tinh top linh kien hang ngay + lan tinh gan nhat.
linhKien.get("/top-settings", async (c) => {
  const last = await c.env.DB.prepare("SELECT value FROM sync_state WHERE key = 'lk_top_last'").first<{ value: string }>();
  return c.json({ gio: await getLkTopGio(c.env.DB), last: last ? JSON.parse(last.value) : null });
});
linhKien.patch("/top-settings", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ gio?: number }>().catch(() => ({}) as { gio?: number });
  const gio = Number(body.gio);
  if (!Number.isInteger(gio) || gio < 0 || gio > 23) return c.json({ error: "INVALID_GIO" }, 400);
  await c.env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('lk_top_gio', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(String(gio), nowVN())
    .run();
  return c.json({ ok: true });
});
linhKien.post("/top/tinh-ngay", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  return c.json(await computeTopLinhKien(c.env.DB));
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
  await bumpLinhKienVersion(c.env.DB);
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
  await bumpLinhKienVersion(c.env.DB);
  return c.json({ ok: true });
});

export default linhKien;
