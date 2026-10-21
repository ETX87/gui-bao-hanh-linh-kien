import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { eqFilters, distinctOpts } from "../lib/filters";
import { parsePage } from "../lib/pagination";
import { bumpLinhKienVersion, getLinhKienVersion } from "../lib/linhKienVersion";
import { computeTopLinhKien, getLkTopGio } from "../lib/topLinhKien";
import { countPhanLoaiPending, pushPhanLoaiPending } from "../lib/linhKienPush";

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
        `SELECT l.ma_lk, l.ten_lk, l.don_vi, l.nguon_du_lieu, l.so_thang_bao_hanh, l.duoc_dung_bao_hanh, t.hang AS top_hang, t.so_luong AS top_so_luong FROM linh_kien_bh l LEFT JOIN linh_kien_top_bh t ON t.ma_lk = l.ma_lk
         WHERE ${where.replace("ma_lk LIKE", "l.ma_lk LIKE")} ORDER BY (t.hang IS NULL), t.hang, l.ten_lk`,
      )
        .bind(...binds)
        .all(),
      getLinhKienVersion(c.env.DB),
    ]);
    return c.json({ linh_kien: results, version });
  }
  // 21/10/2026: loc phan loai / nguon / dung trong BH / so thang BH (ban phan trang cua man danh muc).
  const LOC = { phan_loai: "don_vi", nguon: "nguon_du_lieu", duoc_dung: "duoc_dung_bao_hanh", so_thang: "so_thang_bao_hanh" };
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, "FROM linh_kien_bh WHERE 1=1", []) });
  const f = eqFilters(c, LOC);
  where += f.sql;
  binds.push(...f.binds);
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
    // Dong dong bo: sua duoc 2 cot rieng cua bao hanh + Phan loai (don_vi, 2026-10-11 - sua tay o day
    // roi DAY NGUOC ve linh-kien-app, xem lib/linhKienPush.ts). Ten/anh/ghi chu van theo linh-kien-app.
    await c.env.DB.prepare("UPDATE linh_kien_bh SET so_thang_bao_hanh = COALESCE(?, so_thang_bao_hanh), duoc_dung_bao_hanh = COALESCE(?, duoc_dung_bao_hanh), nguoi_cap_nhat = ?, ngay_cap_nhat = ? WHERE ma_lk = ?")
      .bind(body.so_thang_bao_hanh ?? null, body.duoc_dung_bao_hanh === undefined ? null : body.duoc_dung_bao_hanh ? 1 : 0, user.email, nowVN(), ma)
      .run();
    if (body.don_vi !== undefined) {
      const r = await c.env.DB.prepare("UPDATE linh_kien_bh SET don_vi = ?, don_vi_cho_day = 1 WHERE ma_lk = ? AND COALESCE(don_vi, '') <> ?")
        .bind(body.don_vi.trim() || null, ma, body.don_vi.trim())
        .run();
      if (r.meta.changes) c.executionCtx.waitUntil(pushPhanLoaiPending(c.env).then(() => undefined));
    }
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

// GET /linh-kien/phan-loai - danh sach Phan loai dang dung (goi y cho o nhap) + so dong cho day nguoc.
linhKien.get("/phan-loai", async (c) => {
  const [{ results }, cho] = await Promise.all([
    c.env.DB.prepare("SELECT TRIM(don_vi) AS v, COUNT(*) AS n FROM linh_kien_bh WHERE TRIM(COALESCE(don_vi, '')) <> '' GROUP BY TRIM(don_vi) ORDER BY n DESC").all<{ v: string; n: number }>(),
    countPhanLoaiPending(c.env.DB),
  ]);
  return c.json({ phan_loai: results, cho_day: cho });
});

// POST /linh-kien/phan-loai/day-lai - gui lai ngay cac Phan loai chua day duoc sang linh-kien-app.
linhKien.post("/phan-loai/day-lai", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const r = await pushPhanLoaiPending(c.env);
  return c.json({ ...r, con_lai: await countPhanLoaiPending(c.env.DB) });
});

// POST /linh-kien/import - { rows: [{ ma_lk, so_thang_bao_hanh?, don_vi? }] } (toi da 10.000 dong). File
// do client tu doc (xlsx/csv) - server chi nhan JSON. Khop theo ma_lk; o trong = bo qua cot do (KHONG
// xoa gia tri cu). Phan loai cua dong dong bo doi -> danh dau cho day nguoc ve linh-kien-app.
linhKien.post("/import", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ rows?: { ma_lk?: string; so_thang_bao_hanh?: number | null; don_vi?: string | null }[] }>().catch(() => ({}) as { rows?: undefined });
  if (!Array.isArray(body.rows) || body.rows.length > 10000) return c.json({ error: "INVALID_BODY" }, 400);
  const rows = body.rows
    .map((r) => ({
      ma: String(r.ma_lk ?? "").trim(),
      thang: r.so_thang_bao_hanh === null || r.so_thang_bao_hanh === undefined || Number.isNaN(Number(r.so_thang_bao_hanh)) ? null : Math.round(Number(r.so_thang_bao_hanh)),
      pl: r.don_vi === null || r.don_vi === undefined ? null : String(r.don_vi).trim(),
    }))
    .filter((r) => r.ma && (r.thang !== null || r.pl));
  const loiThang = rows.filter((r) => r.thang !== null && (r.thang < 0 || r.thang > 240)).map((r) => r.ma);
  const hop = rows.filter((r) => !loiThang.includes(r.ma));
  // Doc hien trang theo lo (json_each) de dem dung so dong thuc su thay doi.
  const cur = new Map<string, { thang: number | null; pl: string; nguon: string }>();
  for (let i = 0; i < hop.length; i += 500) {
    const { results } = await c.env.DB.prepare("SELECT ma_lk, so_thang_bao_hanh, COALESCE(TRIM(don_vi), '') AS pl, nguon_du_lieu FROM linh_kien_bh WHERE ma_lk IN (SELECT value FROM json_each(?))")
      .bind(JSON.stringify(hop.slice(i, i + 500).map((r) => r.ma)))
      .all<{ ma_lk: string; so_thang_bao_hanh: number | null; pl: string; nguon_du_lieu: string }>();
    for (const r of results) cur.set(r.ma_lk, { thang: r.so_thang_bao_hanh, pl: r.pl, nguon: r.nguon_du_lieu });
  }
  const now = nowVN();
  const stmts: D1PreparedStatement[] = [];
  let doiThang = 0;
  let doiPl = 0;
  const khongThay: string[] = [];
  for (const r of hop) {
    const c0 = cur.get(r.ma);
    if (!c0) {
      khongThay.push(r.ma);
      continue;
    }
    if (r.thang !== null && r.thang !== c0.thang) {
      doiThang++;
      stmts.push(c.env.DB.prepare("UPDATE linh_kien_bh SET so_thang_bao_hanh = ?, nguoi_cap_nhat = ?, ngay_cap_nhat = ? WHERE ma_lk = ?").bind(r.thang, user.email, now, r.ma));
    }
    if (r.pl && r.pl !== c0.pl) {
      doiPl++;
      stmts.push(
        c.env.DB.prepare("UPDATE linh_kien_bh SET don_vi = ?, don_vi_cho_day = ?, nguoi_cap_nhat = ?, ngay_cap_nhat = ? WHERE ma_lk = ?").bind(r.pl, c0.nguon === "dong_bo" ? 1 : 0, user.email, now, r.ma),
      );
    }
  }
  for (let i = 0; i < stmts.length; i += 100) await c.env.DB.batch(stmts.slice(i, i + 100));
  if (stmts.length) await bumpLinhKienVersion(c.env.DB);
  if (doiPl) c.executionCtx.waitUntil(pushPhanLoaiPending(c.env).then(() => undefined));
  return c.json({ tong: body.rows.length, doi_thang: doiThang, doi_phan_loai: doiPl, khong_thay: khongThay, loi_thang: loiThang });
});

export default linhKien;
