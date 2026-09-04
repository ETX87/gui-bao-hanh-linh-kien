import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { computeEmailGs } from "../lib/gs";

// Man hinh KTV: tao/quan ly phieu gui, them don, xac nhan gui xe, ghi chu/phan hoi (dung chung voi
// Kho/Admin BH - xem CLAUDE.md "Phan hoi vong 1 muc #5"). Port dung cac ham createPhieuGui()/
// submitAddDon()/confirmGui()/rememberNhaXe() cua prototype-html/index.html.

const phieuGui = new Hono<{ Bindings: Env }>();
phieuGui.use("*", verifySessionMiddleware, loadUser);

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function isKtv(u: { la_ktv_dvbh: boolean; la_ve_tinh: boolean; la_qtri: boolean }) {
  return u.la_ktv_dvbh || u.la_ve_tinh || u.la_qtri;
}
function canReadGhiChu(u: { la_ktv_dvbh: boolean; la_ve_tinh: boolean; la_kho: boolean; la_admin_bh: boolean; la_qtri: boolean; la_giam_sat: boolean; la_view: boolean }) {
  return isKtv(u) || u.la_kho || u.la_admin_bh || u.la_qtri || u.la_giam_sat || u.la_view;
}

// GET /api/phieu-gui - "Phieu gui hang cua toi" (KTV) - chi thay phieu CHINH MINH tao.
phieuGui.get("/", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh WHERE nguoi_tao = ? ORDER BY created_at DESC").bind(user.email).all();
  return c.json({ phieu_gui: results });
});

// POST /api/phieu-gui - tao phieu nhap moi, tu dien nha xe theo lan gan nhat cua chinh KTV nay (thay
// the DB.meta.nhaXeHistory cua prototype bang truy van "ban ghi gan nhat" - khong can bang rieng).
phieuGui.post("/", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);

  const last = await c.env.DB.prepare(
    "SELECT hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen FROM phieu_gui_bh WHERE nguoi_tao = ? AND hinh_thuc_gui IS NOT NULL ORDER BY created_at DESC LIMIT 1",
  )
    .bind(user.email)
    .first<{ hinh_thuc_gui: string; ma_xe_hoac_tai_xe: string | null; don_vi_van_chuyen: string | null }>();

  const id = await nextSequentialId(c.env.DB, "phieu_gui_bh", "BH");
  const now = nowVN();
  await c.env.DB.prepare(
    `INSERT INTO phieu_gui_bh (id, nguoi_tao, ngay_tao, ngay_gui_xe, hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, trang_thai, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'nhap', ?, ?)`,
  )
    .bind(id, user.email, now.slice(0, 10), now.slice(0, 10), last?.hinh_thuc_gui ?? "xe_noi_bo", last?.ma_xe_hoac_tai_xe ?? "", last?.don_vi_van_chuyen ?? "", now, now)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, null, "nhap", user.email, "Tao phieu moi");
  return c.json({ id }, 201);
});

// DELETE /api/phieu-gui/:id - chi xoa duoc khi con "nhap" VA khong co don con nao (xem CLAUDE.md
// "Phan hoi vong 1 muc #3").
phieuGui.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  const conCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh WHERE phieu_gui_id = ?").bind(id).first<{ cnt: number }>();
  if ((conCount?.cnt ?? 0) > 0) return c.json({ error: "HAS_CHILDREN" }, 400);
  await c.env.DB.prepare("DELETE FROM phieu_gui_bh WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

interface HeaderBody {
  hinh_thuc_gui?: string;
  ma_xe_hoac_tai_xe?: string;
  don_vi_van_chuyen?: string;
  ma_van_don?: string;
}

// PATCH /api/phieu-gui/:id - luu header (khong con truong "ghi_chu" don dong - da bo theo CLAUDE.md
// "Phan hoi vong 3 muc 1", thay bang khu vuc ghi_chu_log rieng).
phieuGui.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<HeaderBody>().catch(() => ({}) as HeaderBody);
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET hinh_thuc_gui = ?, ma_xe_hoac_tai_xe = ?, don_vi_van_chuyen = ?, ma_van_don = ?, updated_at = ? WHERE id = ?")
    .bind(body.hinh_thuc_gui ?? "", body.ma_xe_hoac_tai_xe ?? "", body.don_vi_van_chuyen ?? "", body.ma_van_don ?? "", nowVN(), id)
    .run();
  return c.json({ ok: true });
});

// POST /api/phieu-gui/:id/xac-nhan-gui - "nhap" -> "da_gui", cho phep sua lai ngay gui xe.
phieuGui.post("/:id/xac-nhan-gui", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  const body = await c.req.json<{ ngay_gui_xe?: string }>().catch(() => ({}) as { ngay_gui_xe?: string });
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_gui', ngay_gui_xe = ?, updated_at = ? WHERE id = ?")
    .bind(body.ngay_gui_xe || nowVN().slice(0, 10), nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "nhap", "da_gui", user.email, "Xac nhan da gui xe");
  return c.json({ ok: true });
});

// GET /api/phieu-gui/:id - chi tiet + danh sach don cha ben trong.
phieuGui.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh WHERE id = ?").bind(id).first();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  const gRow = g as { nguoi_tao: string };
  if (!(gRow.nguoi_tao === user.email || user.la_kho || user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view)) {
    return c.json({ error: "FORBIDDEN" }, 403);
  }
  const { results: donCha } = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? ORDER BY created_at").bind(id).all();
  const { results: ghiChu } = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh_ghi_chu WHERE phieu_gui_id = ? ORDER BY thoi_gian DESC").bind(id).all();
  return c.json({ phieu_gui: g, don_cha: donCha, ghi_chu_log: ghiChu });
});

interface AddDonBody {
  case_id?: string | null;
  ma_lk?: string | null;
  so_luong_khai?: number;
  mo_ta_loi?: string;
  loai_doi_tru_de_xuat?: "doi_tra" | "tru_cong_no";
}

// POST /api/phieu-gui/:id/don - them 1 don (phieu_sua_chua_bh) vao phieu gui, port dung
// submitAddDon() - chan so_luong_khai <=0 (bug that da sua trong prototype QA 31/08/2026).
phieuGui.post("/:id/don", async (c) => {
  const user = c.get("user");
  const guiId = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ nguoi_tao: string; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);

  const body = await c.req.json<AddDonBody>().catch(() => ({}) as AddDonBody);
  const soLuong = body.so_luong_khai ?? 1;
  if (!Number.isInteger(soLuong) || soLuong < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  if (!body.mo_ta_loi?.trim()) return c.json({ error: "MISSING_MO_TA_LOI" }, 400);

  const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
  const emailGs = await computeEmailGs(c.env.DB, user.email);
  await c.env.DB.prepare(
    `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, so_luong_khai, loai_doi_tru_de_xuat, nguon_tao, trang_thai_cha, email_gs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ktv', 'cho_xac_nhan_so_luong', ?, ?)`,
  )
    .bind(id, guiId, body.case_id || null, body.ma_lk || null, body.mo_ta_loi.trim(), soLuong, body.loai_doi_tru_de_xuat || "doi_tra", emailGs, nowVN())
    .run();
  return c.json({ id }, 201);
});

// DELETE /api/phieu-gui-don/:id - xoa 1 don CHUA gui (phieu cha van "nhap").
phieuGui.delete("/don/:donId", async (c) => {
  const user = c.get("user");
  const donId = c.req.param("donId");
  const don = await c.env.DB.prepare(
    "SELECT p.phieu_gui_id, g.nguoi_tao, g.trang_thai FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?",
  )
    .bind(donId)
    .first<{ phieu_gui_id: string; nguoi_tao: string; trang_thai: string }>();
  if (!don) return c.json({ error: "NOT_FOUND" }, 404);
  if (don.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (don.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  await c.env.DB.prepare("DELETE FROM phieu_sua_chua_bh WHERE id = ?").bind(donId).run();
  return c.json({ ok: true });
});

// ---------- Ghi chu / phan hoi (dung chung KTV/Kho/Admin BH - CLAUDE.md "Phan hoi vong 1 muc #5") ----------

phieuGui.get("/:id/ghi-chu", async (c) => {
  const user = c.get("user");
  if (!canReadGhiChu(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const { results } = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh_ghi_chu WHERE phieu_gui_id = ? ORDER BY thoi_gian DESC").bind(id).all();
  return c.json({ ghi_chu_log: results });
});

phieuGui.post("/:id/ghi-chu", async (c) => {
  const user = c.get("user");
  if (!(isKtv(user) || user.la_kho || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const body = await c.req.json<{ noi_dung?: string }>().catch(() => ({}) as { noi_dung?: string });
  if (!body.noi_dung?.trim()) return c.json({ error: "MISSING_NOI_DUNG" }, 400);
  await c.env.DB.prepare("INSERT INTO phieu_gui_bh_ghi_chu (phieu_gui_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)")
    .bind(id, user.email, nowVN(), body.noi_dung.trim())
    .run();
  return c.json({ ok: true }, 201);
});

// ---------- Tra cuu tien do (KTV) + Bo sung thong tin theo yeu cau Admin BH ----------

// GET /api/phieu-gui/don-vi/tra-cuu - moi don vi con thuoc cac phieu gui CHINH MINH da tao (khong
// gioi han theo thoi gian - CLAUDE.md "Doi chieu bang gop y Gemini" da xac nhan hang doi/tra cuu
// KHONG duoc loc theo thoi gian, tranh don qua han lau bi "bien mat").
phieuGui.get("/don-vi/tra-cuu", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const kw = (c.req.query("q") || "").trim().toLowerCase();
  const { results } = await c.env.DB.prepare(
    `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.phieu_gui_id, p.loai_doi_tru_de_xuat, g.ngay_gui_xe
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE g.nguoi_tao = ?
     ORDER BY u.updated_at DESC`,
  )
    .bind(user.email)
    .all();
  if (!kw) return c.json({ don_vi: results });
  const filtered = results.filter((r) => JSON.stringify(r).toLowerCase().includes(kw));
  return c.json({ don_vi: filtered });
});

interface BoSungBody {
  mo_ta_loi?: string;
  ma_lk?: string;
}

// PATCH /api/phieu-gui/don-vi/:id/bo-sung - KTV sua lai mo ta loi/linh kien khi bi Admin BH yeu cau
// bo sung (cho_bo_sung_tt -> cho_phan_loai). Sua ca "mo_ta_loi" (o don cha) lan "ma_lk" (doi linh
// kien, port dung yeu cau "Phan hoi vong 4 muc 1": modal bo sung them duoc truong doi linh kien).
phieuGui.patch("/don-vi/:id/bo-sung", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const u = await c.env.DB.prepare(
    `SELECT u.trang_thai, p.id as parent_id, g.nguoi_tao FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.id = ?`,
  )
    .bind(id)
    .first<{ trang_thai: string; parent_id: string; nguoi_tao: string }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.nguoi_tao !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (u.trang_thai !== "cho_bo_sung_tt") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<BoSungBody>().catch(() => ({}) as BoSungBody);
  const now = nowVN();
  if (body.mo_ta_loi !== undefined) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET mo_ta_loi = ? WHERE id = ?").bind(body.mo_ta_loi.trim(), u.parent_id).run();
  if (body.ma_lk !== undefined) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET ma_lk = ? WHERE id = ?").bind(body.ma_lk, u.parent_id).run();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET trang_thai = 'cho_phan_loai', updated_at = ? WHERE id = ?").bind(now, id).run();
  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_bo_sung_tt", "cho_phan_loai", user.email, "KTV da bo sung thong tin");
  return c.json({ ok: true });
});

export default phieuGui;
