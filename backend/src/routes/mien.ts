import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { loadTuKhoa, detectMien, mienOfKtv, syncPhieuTraMien, type Mien } from "../lib/mien";

// Chia 2 mien (11/10/2026) - xem migrations/0010_mien.sql + lib/mien.ts.
//  - Tu khoa nhan dien mien (qtri): GET/POST/DELETE /tu-khoa, GET /khu-vuc (xem truoc khu vuc -> mien).
//  - Doi mien 1 don (Kho / Admin BH / Ke toan / qtri - nguyen van "KT, Admin sua chua, Kho, Admin he
//    thong"): POST /phieu-gui/:id, /don-cha/:id (don khach le), /phieu-tra/:id.
//    Body {mien: 'MB'|'MN'|null, chuyen_ktv?: boolean}. chuyen_ktv (chi khi don dang "chua khai bao"):
//    "hoi nguoi chuyen la tai khoan cua KTV do co chuyen sang khu vuc do luon khong => neu dong y thi
//    chuyen khu vuc cua KTV do tam thoi sang MB hoac MN" -> ghi ktv_lien_he_bh.mien_gan + ap luon mien
//    moi cho cac don "chua khai bao" khac cua KTV do.
//  - Mien gan tam cua KTV (qtri): PUT /ktv/:ma_ktv {mien_gan}.
//  - Ap dung lai tu khoa cho don chua khai bao (qtri): POST /ap-dung-lai.

const mien = new Hono<{ Bindings: Env }>();
mien.use("*", verifySessionMiddleware, loadUser);

const canDoiMien = (u: AppUser) => u.la_kho || u.la_admin_bh || u.la_ke_toan || u.la_qtri;
const parseMien = (v: unknown): Mien | null | undefined => (v === "MB" || v === "MN" ? v : v === null || v === "" ? null : undefined);
const MIEN_LBL = (m: string | null) => (m === "MB" ? "Miền Bắc" : m === "MN" ? "Miền Nam" : "Chưa khai báo");

// ---------- Tu khoa ----------
mien.get("/tu-khoa", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, mien, tu_khoa FROM mien_tu_khoa_bh ORDER BY mien, tu_khoa").all();
  return c.json({ tu_khoa: results });
});

mien.post("/tu-khoa", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const b = await c.req.json<{ mien?: string; tu_khoa?: string }>().catch(() => ({}) as { mien?: string; tu_khoa?: string });
  const m = parseMien(b.mien);
  const tk = (b.tu_khoa || "").trim().toUpperCase();
  if (!m || !tk) return c.json({ error: "MISSING_FIELDS" }, 400);
  await c.env.DB.prepare("INSERT INTO mien_tu_khoa_bh (mien, tu_khoa) VALUES (?, ?) ON CONFLICT(mien, tu_khoa) DO NOTHING").bind(m, tk).run();
  return c.json({ ok: true }, 201);
});

mien.delete("/tu-khoa/:id", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  await c.env.DB.prepare("DELETE FROM mien_tu_khoa_bh WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

// Xem truoc: moi ma khu vuc dang co trong danh ba KTV -> mien suy ra + so KTV (+ so KTV gan tam).
mien.get("/khu-vuc", async (c) => {
  const u = c.get("user");
  if (!(u.la_qtri || u.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const tk = await loadTuKhoa(c.env.DB);
  const { results } = await c.env.DB.prepare(
    "SELECT khu_vuc_ma AS ma, COUNT(*) AS so_ktv, SUM(CASE WHEN mien_gan IS NOT NULL THEN 1 ELSE 0 END) AS so_gan_tam FROM ktv_lien_he_bh GROUP BY khu_vuc_ma ORDER BY khu_vuc_ma",
  ).all<{ ma: string | null; so_ktv: number; so_gan_tam: number }>();
  const pending = await c.env.DB.prepare("SELECT COUNT(*) AS cnt FROM phieu_gui_bh WHERE mien IS NULL").first<{ cnt: number }>();
  return c.json({ khu_vuc: results.map((r) => ({ ...r, mien: detectMien(r.ma, tk) })), phieu_gui_chua_khai_bao: pending?.cnt ?? 0 });
});

// ---------- Doi mien ----------
interface DoiBody {
  mien?: string | null;
  chuyen_ktv?: boolean;
}

// Dat mien cho 1 phieu gui + cac don cha cua no + phieu tra chua cac don vi cua no.
async function setMienPhieuGui(db: D1Database, guiId: string, m: Mien | null) {
  await db.batch([
    db.prepare("UPDATE phieu_gui_bh SET mien = ? WHERE id = ?").bind(m, guiId),
    db.prepare("UPDATE phieu_sua_chua_bh SET mien = ? WHERE phieu_gui_id = ?").bind(m, guiId),
  ]);
  const { results } = await db
    .prepare("SELECT DISTINCT u.phieu_tra_id AS id FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE p.phieu_gui_id = ? AND u.phieu_tra_id IS NOT NULL")
    .bind(guiId)
    .all<{ id: string }>();
  for (const r of results) await syncPhieuTraMien(db, r.id);
}

// Chuyen luon KTV sang mien moi (gan tam) + ap cho moi don "chua khai bao" khac cua KTV do.
async function chuyenKtv(db: D1Database, ktvEmail: string, m: Mien, actor: string): Promise<{ ok: boolean; so_thung: number }> {
  const r = await db.prepare("UPDATE ktv_lien_he_bh SET mien_gan = ? WHERE email_dang_nhap = ?").bind(m, ktvEmail).run();
  if (!r.meta.changes) return { ok: false, so_thung: 0 };
  const { results } = await db.prepare("SELECT id, trang_thai FROM phieu_gui_bh WHERE nguoi_tao = ? AND mien IS NULL").bind(ktvEmail).all<{ id: string; trang_thai: string }>();
  for (const g of results) {
    await setMienPhieuGui(db, g.id, m);
    await addLog(db, "phieu_gui", g.id, g.trang_thai, g.trang_thai, actor, `Đổi miền: Chưa khai báo → ${MIEN_LBL(m)} (theo KTV ${ktvEmail} được chuyển sang ${MIEN_LBL(m)})`);
  }
  return { ok: true, so_thung: results.length };
}

mien.post("/phieu-gui/:id", async (c) => {
  const user = c.get("user");
  if (!canDoiMien(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const b = await c.req.json<DoiBody>().catch(() => ({}) as DoiBody);
  const m = parseMien(b.mien);
  if (m === undefined) return c.json({ error: "INVALID_MIEN" }, 400);
  const g = await c.env.DB.prepare("SELECT mien, nguoi_tao, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ mien: Mien | null; nguoi_tao: string; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.mien === m) return c.json({ ok: true, khong_doi: true });
  await setMienPhieuGui(c.env.DB, id, m);
  await addLog(c.env.DB, "phieu_gui", id, g.trang_thai, g.trang_thai, user.email, `Đổi miền: ${MIEN_LBL(g.mien)} → ${MIEN_LBL(m)}`);
  let ktv: { ok: boolean; so_thung: number } | null = null;
  if (b.chuyen_ktv && g.mien === null && m) ktv = await chuyenKtv(c.env.DB, g.nguoi_tao, m, user.email);
  return c.json({ ok: true, ktv });
});

// Don cha: don thuoc phieu gui -> doi theo ca thung (khong de 1 thung 2 mien); don khach le doi rieng.
mien.post("/don-cha/:id", async (c) => {
  const user = c.get("user");
  if (!canDoiMien(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const b = await c.req.json<DoiBody>().catch(() => ({}) as DoiBody);
  const m = parseMien(b.mien);
  if (m === undefined) return c.json({ error: "INVALID_MIEN" }, 400);
  const p = await c.env.DB.prepare("SELECT mien, phieu_gui_id, trang_thai_cha FROM phieu_sua_chua_bh WHERE id = ?").bind(id).first<{ mien: Mien | null; phieu_gui_id: string | null; trang_thai_cha: string }>();
  if (!p) return c.json({ error: "NOT_FOUND" }, 404);
  if (p.phieu_gui_id) return c.json({ error: "DOI_THEO_PHIEU_GUI", phieu_gui_id: p.phieu_gui_id }, 400);
  if (p.mien === m) return c.json({ ok: true, khong_doi: true });
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET mien = ? WHERE id = ?").bind(m, id).run();
  const { results } = await c.env.DB.prepare("SELECT DISTINCT phieu_tra_id AS id FROM phieu_sua_chua_bh_ct WHERE parent_id = ? AND phieu_tra_id IS NOT NULL").bind(id).all<{ id: string }>();
  for (const r of results) await syncPhieuTraMien(c.env.DB, r.id);
  await addLog(c.env.DB, "phieu_sc", id, p.trang_thai_cha, p.trang_thai_cha, user.email, `Đổi miền: ${MIEN_LBL(p.mien)} → ${MIEN_LBL(m)}`);
  return c.json({ ok: true });
});

mien.post("/phieu-tra/:id", async (c) => {
  const user = c.get("user");
  if (!canDoiMien(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const b = await c.req.json<DoiBody>().catch(() => ({}) as DoiBody);
  const m = parseMien(b.mien);
  if (m === undefined) return c.json({ error: "INVALID_MIEN" }, 400);
  const t = await c.env.DB.prepare("SELECT mien, ktv_nhan, trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ mien: Mien | null; ktv_nhan: string; trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.mien === m) return c.json({ ok: true, khong_doi: true });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET mien = ? WHERE id = ?").bind(m, id).run();
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, `Đổi miền: ${MIEN_LBL(t.mien)} → ${MIEN_LBL(m)}`);
  let ktv: { ok: boolean; so_thung: number } | null = null;
  if (b.chuyen_ktv && t.mien === null && m && t.ktv_nhan && t.ktv_nhan.includes("@")) ktv = await chuyenKtv(c.env.DB, t.ktv_nhan, m, user.email);
  return c.json({ ok: true, ktv });
});

// ---------- Mien gan tam cua KTV (qtri) ----------
mien.put("/ktv/:ma_ktv", async (c) => {
  if (!c.get("user").la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const b = await c.req.json<{ mien_gan?: string | null }>().catch(() => ({}) as { mien_gan?: string | null });
  const m = parseMien(b.mien_gan);
  if (m === undefined) return c.json({ error: "INVALID_MIEN" }, 400);
  const r = await c.env.DB.prepare("UPDATE ktv_lien_he_bh SET mien_gan = ? WHERE ma_ktv = ?").bind(m, c.req.param("ma_ktv")).run();
  if (!r.meta.changes) return c.json({ error: "NOT_FOUND" }, 404);
  return c.json({ ok: true });
});

// ---------- Ap dung lai tu khoa / mien gan cho don "chua khai bao" (qtri) ----------
mien.post("/ap-dung-lai", async (c) => {
  const user = c.get("user");
  if (!user.la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  const tk = await loadTuKhoa(c.env.DB);
  const { results } = await c.env.DB.prepare("SELECT id, nguoi_tao, trang_thai FROM phieu_gui_bh WHERE mien IS NULL").all<{ id: string; nguoi_tao: string; trang_thai: string }>();
  let so = 0;
  for (const g of results) {
    const m = await mienOfKtv(c.env.DB, g.nguoi_tao, tk);
    if (!m) continue;
    await setMienPhieuGui(c.env.DB, g.id, m);
    await addLog(c.env.DB, "phieu_gui", g.id, g.trang_thai, g.trang_thai, user.email, `Đổi miền: Chưa khai báo → ${MIEN_LBL(m)} (áp dụng lại từ khoá khu vực)`);
    so++;
  }
  return c.json({ ok: true, so_thung: so, con_lai: results.length - so, luc: nowVN() });
});

export default mien;
