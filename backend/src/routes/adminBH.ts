import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";
import { HUONG_CAN_NV, HUONG_TAO_PHIEU_TRA, KHACH_LE_KEY, type HuongXuLy, type LoaiBaoHanh, type LoaiDoiTru } from "../lib/constants";
import { parsePage } from "../lib/pagination";

// Man hinh Admin bao hanh - port dung toan bo luong tu prototype-html/index.html: tiep nhan noi bo,
// xac nhan so luong (tach don vi con), phan loai (don le + hang loat), yeu cau bo sung, bao cao sai,
// xac nhan hoan tat (+ xac nhan tra xac rieng cho huong "doi_moi"), yeu cau lam lai, tao don dich vu
// tinh phi, va bo 10 nut FAST (xem CLAUDE.md muc "Nut thao tac nhanh...").

const adminBH = new Hono<{ Bindings: Env }>();
adminBH.use("*", verifySessionMiddleware, loadUser);

// la_qtri (Admin he thong) luon di qua duoc moi cong vai tro - phan hoi 04/09/2026 "Vai trò Admin
// cần nhìn được tất cả các modules của hệ thống": qtri la superuser, khong chi xem ma con thao tac
// duoc moi module de kiem tra/ho tro khi can, khong phai rieng gi Admin BH.
function requireAdminBH(c: { get(k: "user"): { la_admin_bh: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_admin_bh || u.la_qtri;
}

// ---------- 1. Thung hang cho Admin BH xac nhan tiep nhan noi bo tu Kho ----------

adminBH.get("/phieu-gui", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const fromWhere = "FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0";
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * ${fromWhere} ORDER BY nguoi_tao, updated_at LIMIT ? OFFSET ?`).bind(limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
});

adminBH.post("/phieu-gui/:id/tiep-nhan-noi-bo", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT trang_thai, admin_tiep_nhan, thoi_gian_nhan_kho FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; admin_tiep_nhan: number; thoi_gian_nhan_kho: string | null }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.trang_thai !== "da_tiep_nhan" || g.admin_tiep_nhan) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do_cham?: string }>().catch(() => ({}) as { ly_do_cham?: string });
  if (isOverdue(g.thoi_gian_nhan_kho) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET admin_tiep_nhan = 1, admin_nguoi_nhan = ?, admin_thoi_gian_nhan = ?, updated_at = ? WHERE id = ?").bind(user.email, now, now, id).run();
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, "Admin bao hanh xac nhan tiep nhan noi bo tu Kho" + (body.ly_do_cham ? " | Ly do cham: " + body.ly_do_cham : ""));
  return c.json({ ok: true });
});

// "Day lai chua tiep nhan" - chi cho phep neu CHUA co don vi con nao duoc tach (an toan du lieu).
adminBH.post("/phieu-gui/:id/day-lai-chua-tiep-nhan", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT admin_tiep_nhan FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ admin_tiep_nhan: number }>();
  if (!g || !g.admin_tiep_nhan) return c.json({ error: "NOT_YET_RECEIVED" }, 400);
  const daTach = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha = 'da_tach'").bind(id).first<{ cnt: number }>();
  if ((daTach?.cnt ?? 0) > 0) return c.json({ error: "ALREADY_SPLIT" }, 400);

  await c.env.DB.prepare("UPDATE phieu_gui_bh SET admin_tiep_nhan = 0, admin_nguoi_nhan = NULL, admin_thoi_gian_nhan = NULL, updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, "Admin BH day lai chua tiep nhan noi bo (xac nhan nham truoc do)");
  return c.json({ ok: true });
});

// ---------- 2. Don cha cho xac nhan so luong thuc nhan ----------

adminBH.get("/don-cha", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const trangThai = c.req.query("trang_thai_cha") || "cho_xac_nhan_so_luong";
  const { limit, offset } = parsePage(c);
  // them g.nguoi_tao AS ktv - can cho cot "Nguon" cua bang thong nhat (UI, xem AdminUnifiedTable.tsx)
  // hien dung email KTV thay vi chi case_id, khop dung renderAdminUnifiedTable() cua prototype.
  const fromWhere = `FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE p.trang_thai_cha = ? AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT p.*, g.nguoi_tao AS ktv ${fromWhere} ORDER BY p.created_at LIMIT ? OFFSET ?`).bind(trangThai, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).bind(trangThai).first<{ cnt: number }>(),
  ]);
  return c.json({ don_cha: results, total: totalRow?.cnt ?? 0 });
});

interface XacNhanSoLuongBody {
  so_luong_thuc_nhan?: number;
  ly_do_chenh_lech_sl?: string;
}

// Tach don vi con - port dung submitSoLuongThucNhan().
adminBH.post("/don-cha/:id/xac-nhan-so-luong", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const s = await c.env.DB.prepare("SELECT so_luong_khai, trang_thai_cha FROM phieu_sua_chua_bh WHERE id = ?").bind(id).first<{ so_luong_khai: number; trang_thai_cha: string }>();
  if (!s) return c.json({ error: "NOT_FOUND" }, 404);
  if (s.trang_thai_cha !== "cho_xac_nhan_so_luong") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<XacNhanSoLuongBody>().catch(() => ({}) as XacNhanSoLuongBody);
  const sltn = body.so_luong_thuc_nhan ?? 0;
  if (!Number.isInteger(sltn) || sltn < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  let lyDo = "";
  if (sltn !== s.so_luong_khai) {
    if (!body.ly_do_chenh_lech_sl?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHENH_LECH" }, 400);
    lyDo = body.ly_do_chenh_lech_sl.trim();
  }

  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET so_luong_thuc_nhan = ?, ly_do_chenh_lech_sl = ?, trang_thai_cha = 'da_tach' WHERE id = ?").bind(sltn, lyDo, id).run();
  const statements = [];
  for (let i = 1; i <= sltn; i++) {
    statements.push(
      c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct (id, parent_id, so_thu_tu, trang_thai, created_at, updated_at) VALUES (?, ?, ?, 'cho_phan_loai', ?, ?)").bind(`${id}-${i}`, id, i, now, now),
    );
  }
  await c.env.DB.batch(statements);
  await addLog(c.env.DB, "phieu_sc", id, "cho_xac_nhan_so_luong", "da_tach", c.get("user").email, `SL thuc nhan=${sltn}` + (lyDo ? ` | ly do lech: ${lyDo}` : ""));
  return c.json({ ok: true, so_don_vi: sltn });
});

// ---------- 3. Bang thong nhat - don vi can xu ly ----------

// GET /don-vi?limit=&offset= - "bang thong nhat" (dong lon nhat, phan loai that o day) - xem
// lib/pagination.ts. Rieng GET /don-cha (thung cho xac nhan SL) khong lo dai vi bi gate lai truoc khi
// don qua duoc buoc nay - khong can pager rieng o frontend, chi can COUNT/LIMIT day du de an toan.
adminBH.get("/don-vi", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  // max cao (Phat hien 14): frontend gop don vi theo don cha va thu gon "xN" ngay tren client - can
  // lay het don vi cua 1 lo (co the >20) trong 1 lan de nhom dung. Hang doi nay bi gate nen thuc te
  // toi da vai tram dong; sau khi gop chi con vai chuc dong hien thi.
  const { limit, offset } = parsePage(c, 1000, 2000);
  // them g.nguoi_tao AS ktv - xem comment o GET /don-cha o tren (cung ly do).
  const fromWhere = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai', 'cho_bo_sung_tt')
       AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.phieu_gui_id, p.nguon_tao, p.ten_khach_hang, p.sdt_khach_hang, p.san_pham_bh, p.loai_doi_tru_de_xuat, g.nguoi_tao AS ktv
       ${fromWhere} ORDER BY u.updated_at LIMIT ? OFFSET ?`,
    )
      .bind(limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

// Chi tiet 1 don vi (dung cho modal chi tiet + 4 khoi log rieng biet).
adminBH.get("/don-vi/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  const uRow = u as { parent_id: string; nguoi_sua_chua: string | null };
  const p = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh WHERE id = ?").bind(uRow.parent_id).first<{ phieu_gui_id: string | null; ma_lk: string | null; loai_doi_tru_de_xuat: string | null }>();
  const allowed = user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view || uRow.nguoi_sua_chua === user.email;
  if (!allowed) return c.json({ error: "FORBIDDEN" }, 403);

  // Ghep them 2 truong cua don cha (ma_lk/loai_doi_tru_de_xuat) truc tiep vao don_vi tra ve - de
  // PhanLoaiModal.tsx (frontend) doc duoc gia tri mac dinh (linh kien goc/de xuat doi tru cua KTV) ma
  // KHONG can 1 prop "parent" rieng khi mo tu chinh modal chi tiet nay (dong bo voi cach bang thong
  // nhat AdminUnifiedTable.tsx da co san 2 truong nay qua JOIN cua GET /don-vi).
  if (p) Object.assign(u, { ma_lk: p.ma_lk, loai_doi_tru_de_xuat: p.loai_doi_tru_de_xuat });

  const [ctLogs, pLogs, ctAnh, pAnh, baoCaoSai] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_sc_ct' AND entity_id = ? ORDER BY thoi_gian DESC").bind(id).all(),
    c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_sc' AND entity_id = ? ORDER BY thoi_gian DESC").bind(uRow.parent_id).all(),
    c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_ct_anh WHERE unit_id = ?").bind(id).all(),
    c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_anh WHERE parent_id = ?").bind(uRow.parent_id).all(),
    user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view ? c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_baocaosai WHERE parent_id = ? ORDER BY thoi_gian DESC").bind(uRow.parent_id).all() : Promise.resolve({ results: [] }),
  ]);
  let guiLogs: unknown[] = [];
  let traLogs: unknown[] = [];
  if (p?.phieu_gui_id) guiLogs = (await c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_gui' AND entity_id = ? ORDER BY thoi_gian DESC").bind(p.phieu_gui_id).all()).results;
  const uFull = u as { phieu_tra_id: string | null };
  if (uFull.phieu_tra_id) traLogs = (await c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_tra' AND entity_id = ? ORDER BY thoi_gian DESC").bind(uFull.phieu_tra_id).all()).results;

  return c.json({
    don_vi: u,
    don_cha: p,
    logs: { don_vi: ctLogs.results, don_cha: pLogs.results, phieu_gui: guiLogs, phieu_tra: traLogs },
    anh: { don_vi: ctAnh.results, don_cha: pAnh.results },
    bao_cao_sai_thong_tin: baoCaoSai.results,
  });
});

// ---------- 4. Phan loai (don le + hang loat) ----------

interface PhanLoaiBody {
  loai_bao_hanh?: LoaiBaoHanh;
  thong_tin_mail_pd?: string;
  ma_phe_duyet?: string;
  loai_doi_tru?: LoaiDoiTru;
  huong_xu_ly?: HuongXuLy;
  nguoi_sua_chua?: string;
  ly_do_tu_choi?: string;
  ma_lk_thuc_te?: string | null;
  ly_do_cham?: string;
}

interface UnitRow {
  id: string;
  trang_thai: string;
  updated_at: string;
}

async function applyPhanLoaiToUnit(db: D1Database, unit: UnitRow, body: PhanLoaiBody, actor: string): Promise<{ error: string } | { ok: true }> {
  if (!body.huong_xu_ly) return { error: "MISSING_HUONG_XU_LY" };
  if (!body.loai_bao_hanh) return { error: "MISSING_LOAI_BAO_HANH" };
  if (!body.loai_doi_tru) return { error: "MISSING_LOAI_DOI_TRU" };
  if (body.loai_bao_hanh === "ngoai_bh" && !body.thong_tin_mail_pd?.trim()) return { error: "REQUIRE_MAIL_PD" };
  if (HUONG_CAN_NV.includes(body.huong_xu_ly) && !body.nguoi_sua_chua) return { error: "REQUIRE_NV" };
  if (body.huong_xu_ly === "tu_choi" && !body.ly_do_tu_choi) return { error: "REQUIRE_LY_DO_TU_CHOI" };
  if (isOverdue(unit.updated_at) && !body.ly_do_cham?.trim()) return { error: "REQUIRE_LY_DO_CHAM" };

  let trangThaiMoi = unit.trang_thai;
  if (HUONG_CAN_NV.includes(body.huong_xu_ly)) trangThaiMoi = "cho_chan_doan";
  else if (HUONG_TAO_PHIEU_TRA.includes(body.huong_xu_ly)) trangThaiMoi = "san_sang_gom_phieu_tra";
  else if (body.huong_xu_ly === "tu_choi") trangThaiMoi = "ket_thuc_tu_choi";
  else if (body.huong_xu_ly === "chuyen_kho") trangThaiMoi = "ket_thuc_chuyen_kho";

  await db
    .prepare(
      `UPDATE phieu_sua_chua_bh_ct SET
         loai_bao_hanh = ?, thong_tin_mail_pd = ?, ma_phe_duyet = ?, huong_xu_ly = ?, loai_doi_tru = ?,
         nguoi_sua_chua = ?, ly_do_tu_choi = ?, ma_lk_thuc_te = COALESCE(?, ma_lk_thuc_te), trang_thai = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      body.loai_bao_hanh,
      body.thong_tin_mail_pd || "",
      body.ma_phe_duyet || "",
      body.huong_xu_ly,
      body.loai_doi_tru,
      HUONG_CAN_NV.includes(body.huong_xu_ly) ? body.nguoi_sua_chua : null,
      body.huong_xu_ly === "tu_choi" ? body.ly_do_tu_choi : null,
      body.ma_lk_thuc_te === undefined ? null : body.ma_lk_thuc_te,
      trangThaiMoi,
      nowVN(),
      unit.id,
    )
    .run();
  await addLog(
    db,
    "phieu_sc_ct",
    unit.id,
    unit.trang_thai,
    trangThaiMoi,
    actor,
    `Admin BH phan loai: ${body.loai_bao_hanh} / ${body.huong_xu_ly} / doi_tru=${body.loai_doi_tru}` +
      (body.huong_xu_ly === "tu_choi" ? ` | Ly do huy: ${body.ly_do_tu_choi}` : "") +
      (body.ly_do_cham ? ` | Ly do cham: ${body.ly_do_cham}` : ""),
  );
  return { ok: true };
}

adminBH.post("/don-vi/:id/phan-loai", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const unit = await c.env.DB.prepare("SELECT id, trang_thai, updated_at FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<UnitRow>();
  if (!unit) return c.json({ error: "NOT_FOUND" }, 404);
  if (!["cho_phan_loai", "admin_can_xem_lai"].includes(unit.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<PhanLoaiBody>().catch(() => ({}) as PhanLoaiBody);
  const result = await applyPhanLoaiToUnit(c.env.DB, unit, body, user.email);
  if ("error" in result) return c.json(result, 400);
  return c.json({ ok: true });
});

adminBH.post("/don-vi/phan-loai-hang-loat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<PhanLoaiBody & { ids?: string[] }>().catch(() => ({}) as PhanLoaiBody & { ids?: string[] });
  const ids = body.ids || [];
  if (ids.length === 0) return c.json({ error: "NO_IDS" }, 400);
  const errors: Record<string, string> = {};
  let applied = 0;
  for (const id of ids) {
    const unit = await c.env.DB.prepare("SELECT id, trang_thai, updated_at FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<UnitRow>();
    if (!unit || !["cho_phan_loai", "admin_can_xem_lai"].includes(unit.trang_thai)) {
      errors[id] = "WRONG_STATE";
      continue;
    }
    const result = await applyPhanLoaiToUnit(c.env.DB, unit, body, user.email);
    if ("error" in result) errors[id] = result.error;
    else applied++;
  }
  return c.json({ applied, errors });
});

// ---------- 5. Yeu cau bo sung + bao cao sai (cap don cha) ----------

adminBH.post("/don-cha/:id/yeu-cau-bo-sung", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const scId = c.req.param("id");
  const body = await c.req.json<{ ly_do?: string; ghi_chu?: string }>().catch(() => ({}) as { ly_do?: string; ghi_chu?: string });
  if (!body.ly_do || !["sai_case", "thieu_mota", "linh_kien_khong_khop", "khac"].includes(body.ly_do)) return c.json({ error: "INVALID_LY_DO" }, 400);
  const { results: children } = await c.env.DB.prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE parent_id = ? AND trang_thai = 'cho_phan_loai'").bind(scId).all<{ id: string }>();
  if (children.length === 0) return c.json({ error: "NO_ELIGIBLE_UNITS" }, 400);

  const lyDoBoSung = body.ly_do + (body.ghi_chu?.trim() ? ": " + body.ghi_chu.trim() : "");
  const now = nowVN();
  const statements = children.map((ch) => c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET trang_thai = 'cho_bo_sung_tt', ly_do_bo_sung = ?, updated_at = ? WHERE id = ?").bind(lyDoBoSung, now, ch.id));
  await c.env.DB.batch(statements);
  for (const ch of children) await addLog(c.env.DB, "phieu_sc_ct", ch.id, "cho_phan_loai", "cho_bo_sung_tt", user.email, lyDoBoSung);
  return c.json({ ok: true, so_don_vi: children.length });
});

adminBH.get("/don-cha/:id/bao-cao-sai", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_baocaosai WHERE parent_id = ? ORDER BY thoi_gian DESC").bind(c.req.param("id")).all();
  return c.json({ bao_cao_sai_thong_tin: results });
});

adminBH.post("/don-cha/:id/bao-cao-sai", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ noi_dung?: string }>().catch(() => ({}) as { noi_dung?: string });
  if (!body.noi_dung?.trim()) return c.json({ error: "MISSING_NOI_DUNG" }, 400);
  await c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_baocaosai (parent_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)").bind(c.req.param("id"), user.email, nowVN(), body.noi_dung.trim()).run();
  return c.json({ ok: true }, 201);
});

// ---------- 6. Xac nhan hoan tat (sau khi NV nop ket qua) ----------

adminBH.get("/xac-nhan", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'cho_admin_xac_nhan' ORDER BY updated_at LIMIT ? OFFSET ?").bind(limit, offset).all(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'cho_admin_xac_nhan'").first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

adminBH.post("/don-vi/:id/xac-nhan-hoan-tat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT trang_thai, updated_at, huong_xu_ly FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string; huong_xu_ly: string }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.trang_thai !== "cho_admin_xac_nhan") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<{ ly_do_cham?: string; xu_ly_xac?: string }>().catch(() => ({}) as { ly_do_cham?: string; xu_ly_xac?: string });

  // Huong "doi_moi" BAT BUOC ghi nhan cach xu ly xac linh kien loi truoc khi hoan tat.
  if (u.huong_xu_ly === "doi_moi") {
    if (!body.xu_ly_xac || !["tra_doi_tac", "tieu_huy", "luu_kho"].includes(body.xu_ly_xac)) return c.json({ error: "REQUIRE_XU_LY_XAC" }, 400);
  }
  if (isOverdue(u.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET admin_xac_nhan_hoan_tat = 1, xu_ly_xac = COALESCE(?, xu_ly_xac), trang_thai = 'san_sang_gom_phieu_tra', updated_at = ? WHERE id = ?")
    .bind(body.xu_ly_xac || null, now, id)
    .run();
  await addLog(
    c.env.DB,
    "phieu_sc_ct",
    id,
    "cho_admin_xac_nhan",
    "san_sang_gom_phieu_tra",
    user.email,
    "Admin BH xac nhan hoan tat" + (body.xu_ly_xac ? ` + xac nhan tra xac: ${body.xu_ly_xac}` : "") + (body.ly_do_cham ? ` | Ly do cham: ${body.ly_do_cham}` : ""),
  );
  return c.json({ ok: true });
});

adminBH.post("/don-vi/:id/yeu-cau-lam-lai", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT trang_thai, updated_at, so_lan_yeu_cau_lam_lai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string; so_lan_yeu_cau_lam_lai: number }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.trang_thai !== "cho_admin_xac_nhan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string; ly_do_cham?: string }>().catch(() => ({}) as { ly_do?: string; ly_do_cham?: string });
  if (!body.ly_do?.trim()) return c.json({ error: "MISSING_LY_DO" }, 400);
  if (isOverdue(u.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET trang_thai = 'cho_chan_doan', so_lan_yeu_cau_lam_lai = ?, ly_do_yeu_cau_lam_lai = ?, updated_at = ? WHERE id = ?")
    .bind((u.so_lan_yeu_cau_lam_lai || 0) + 1, body.ly_do.trim(), nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_admin_xac_nhan", "cho_chan_doan", user.email, "Admin BH yeu cau lam lai: " + body.ly_do.trim() + (body.ly_do_cham ? ` | Ly do cham: ${body.ly_do_cham}` : ""));
  return c.json({ ok: true });
});

// ---------- 7. Don dich vu tinh phi (khach le, Admin BH tu tao) ----------

interface DonDichVuBody {
  case_id?: string | null;
  ten_khach_hang?: string;
  sdt_khach_hang?: string;
  dia_chi_khach_hang?: string;
  san_pham_bh?: string;
  ma_lk?: string | null;
  so_luong?: number;
  mo_ta_loi?: string;
  // Anh chup linh kien loi luc tao don - xem chu thich cung ten o phieuGui.ts (POST /:id/don).
  anh?: string[];
}

adminBH.post("/don-dich-vu", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<DonDichVuBody>().catch(() => ({}) as DonDichVuBody);
  if (!body.case_id) {
    if (!body.ten_khach_hang?.trim() || !body.sdt_khach_hang?.trim() || !body.san_pham_bh?.trim()) return c.json({ error: "MISSING_KHACH_LE_INFO" }, 400);
  }
  const soLuong = body.so_luong ?? 1;
  if (!Number.isInteger(soLuong) || soLuong < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  if (!body.mo_ta_loi?.trim()) return c.json({ error: "MISSING_MO_TA_LOI" }, 400);

  const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
  const now = nowVN();
  await c.env.DB.prepare(
    `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, so_luong_khai, so_luong_thuc_nhan, nguon_tao, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, san_pham_bh, trang_thai_cha, created_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 'admin_dich_vu', ?, ?, ?, ?, 'da_tach', ?)`,
  )
    .bind(id, body.case_id || null, body.ma_lk || null, body.mo_ta_loi.trim(), soLuong, soLuong, body.ten_khach_hang?.trim() || "", body.sdt_khach_hang?.trim() || "", body.dia_chi_khach_hang?.trim() || "", body.san_pham_bh?.trim() || "", now)
    .run();
  const statements = [];
  for (let i = 1; i <= soLuong; i++) {
    statements.push(c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct (id, parent_id, so_thu_tu, trang_thai, created_at, updated_at) VALUES (?, ?, ?, 'cho_phan_loai', ?, ?)").bind(`${id}-${i}`, id, i, now, now));
  }
  await c.env.DB.batch(statements);
  const anhUrls = (body.anh || []).filter((u) => u && u.trim());
  if (anhUrls.length > 0) {
    await c.env.DB.batch(anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_anh (parent_id, anh_url) VALUES (?, ?)").bind(id, url)));
  }
  await addLog(c.env.DB, "phieu_sc", id, null, "da_tach", user.email, "Admin BH tao don dich vu tinh phi (khach le)");
  return c.json({ id }, 201);
});

// ---------- 8. Bo 10 nut "Xu ly nhanh" (FAST) - xem CLAUDE.md muc "Nut thao tac nhanh..." ----------

interface FastActionMeta {
  key: string;
  label: string;
  huong?: HuongXuLy;
  loaiBH?: LoaiBaoHanh;
  loaiDoiTru?: LoaiDoiTru;
  lyDoTuChoi?: string;
  special?: "bo_sung_tt" | "bao_cao_sai";
}

const FAST_ACTIONS: FastActionMeta[] = [
  { key: "doi_moi_fast", label: "Đổi mới trong BH", huong: "doi_moi", loaiBH: "trong_bh" },
  { key: "tru_no_fast", label: "Trừ công nợ", huong: "xac_nhan_tru_no", loaiBH: "trong_bh", loaiDoiTru: "tru_cong_no" },
  { key: "sua_chua_fast", label: "Sửa chữa trong BH", huong: "sua_chua", loaiBH: "trong_bh" },
  { key: "bo_sung_tt", label: "Bổ sung thông tin", special: "bo_sung_tt" },
  { key: "tu_choi_fast", label: "Từ chối", huong: "tu_choi", loaiBH: "trong_bh" },
  { key: "bao_cao_sai", label: "KTV báo cáo sai thông tin", special: "bao_cao_sai" },
  { key: "huy_khong_co_hang", label: "Huỷ do không có hàng", huong: "tu_choi", loaiBH: "trong_bh", lyDoTuChoi: "Khong co hang" },
  { key: "doi_moi_pd", label: "Đổi mới có phê duyệt", huong: "doi_moi", loaiBH: "ngoai_bh" },
  { key: "tru_no_pd", label: "Trừ công nợ có phê duyệt", huong: "xac_nhan_tru_no", loaiBH: "ngoai_bh", loaiDoiTru: "tru_cong_no" },
  { key: "sua_chua_pd", label: "Sửa chữa có phê duyệt", huong: "sua_chua", loaiBH: "ngoai_bh" },
];

adminBH.get("/fast-actions", async (c) => c.json({ fast_actions: FAST_ACTIONS }));

interface FastActionBody {
  nv?: string;
  mail_pd?: string;
  ma_phe_duyet?: string;
  ly_do_tu_choi?: string;
  ly_do_cham?: string;
}

// Lay loai_doi_tru mac dinh theo de xuat cua KTV luc gui hang - dung mau da chot 22/08/2026.
async function defaultLoaiDoiTru(db: D1Database, parentId: string): Promise<LoaiDoiTru> {
  const p = await db.prepare("SELECT loai_doi_tru_de_xuat FROM phieu_sua_chua_bh WHERE id = ?").bind(parentId).first<{ loai_doi_tru_de_xuat: string | null }>();
  return p?.loai_doi_tru_de_xuat === "tru_cong_no" ? "tru_cong_no" : "doi_tra";
}

// Gop vao phieu tra "Nhap" co san dung (KTV + loai doi tru), chi tao moi khi chua co - dung y het
// hanh vi autoGomPhieuTraTatCa().
async function attachToOrCreatePhieuTra(db: D1Database, unitId: string, ktvKey: string, loaiDoiTru: LoaiDoiTru, actor: string): Promise<string> {
  const existing = await db.prepare("SELECT id FROM phieu_tra_bh WHERE trang_thai = 'nhap' AND ktv_nhan = ? AND loai_doi_tru = ?").bind(ktvKey, loaiDoiTru).first<{ id: string }>();
  if (existing) {
    await db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(existing.id, unitId).run();
    await addLog(db, "phieu_tra", existing.id, "nhap", "nhap", actor, `Gop them don vi ${unitId} vao phieu (tu nut thao tac nhanh)`);
    return existing.id;
  }
  const id = await nextSequentialId(db, "phieu_tra_bh", "TR");
  const now = nowVN();
  await db.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, created_at, updated_at) VALUES (?, ?, ?, 'nhap', ?, ?, ?)").bind(id, ktvKey, actor, loaiDoiTru, now, now).run();
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, unitId).run();
  await addLog(db, "phieu_tra", id, null, "nhap", actor, `Tao phieu tra moi (${loaiDoiTru}) tu nut thao tac nhanh`);
  return id;
}

async function ktvKeyOfUnit(db: D1Database, parentId: string): Promise<string> {
  const row = await db
    .prepare(`SELECT g.nguoi_tao FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?`)
    .bind(parentId)
    .first<{ nguoi_tao: string | null }>();
  return row?.nguoi_tao ?? KHACH_LE_KEY;
}

adminBH.post("/don-vi/:id/fast/:key", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const key = c.req.param("key");
  const meta = FAST_ACTIONS.find((a) => a.key === key);
  if (!meta) return c.json({ error: "UNKNOWN_ACTION" }, 400);

  const unit = await c.env.DB.prepare("SELECT id, parent_id, trang_thai, updated_at FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<UnitRow & { parent_id: string }>();
  if (!unit) return c.json({ error: "NOT_FOUND" }, 404);
  if (!["cho_phan_loai", "admin_can_xem_lai"].includes(unit.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);

  if (meta.special === "bo_sung_tt" || meta.special === "bao_cao_sai") {
    return c.json({ redirect: meta.special, parent_id: unit.parent_id });
  }

  const body = await c.req.json<FastActionBody>().catch(() => ({}) as FastActionBody);
  const needsNv = meta.huong && HUONG_CAN_NV.includes(meta.huong);
  const needsMailPd = meta.loaiBH === "ngoai_bh";
  const needsLyDoTuChoi = meta.huong === "tu_choi" && !meta.lyDoTuChoi;

  if (needsNv && !body.nv) return c.json({ error: "REQUIRE_NV" }, 400);
  if (needsMailPd && !body.mail_pd?.trim()) return c.json({ error: "REQUIRE_MAIL_PD" }, 400);
  if (needsLyDoTuChoi && !body.ly_do_tu_choi) return c.json({ error: "REQUIRE_LY_DO_TU_CHOI" }, 400);
  if (isOverdue(unit.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const loaiDoiTru = meta.loaiDoiTru || (await defaultLoaiDoiTru(c.env.DB, unit.parent_id));
  const result = await applyPhanLoaiToUnit(
    c.env.DB,
    unit,
    {
      loai_bao_hanh: meta.loaiBH,
      thong_tin_mail_pd: body.mail_pd,
      ma_phe_duyet: body.ma_phe_duyet,
      loai_doi_tru: loaiDoiTru,
      huong_xu_ly: meta.huong,
      nguoi_sua_chua: body.nv,
      ly_do_tu_choi: meta.lyDoTuChoi || body.ly_do_tu_choi,
      ly_do_cham: body.ly_do_cham,
    },
    user.email,
  );
  if ("error" in result) return c.json(result, 400);

  let phieuTraId: string | null = null;
  if (meta.huong && HUONG_TAO_PHIEU_TRA.includes(meta.huong)) {
    const ktvKey = await ktvKeyOfUnit(c.env.DB, unit.parent_id);
    phieuTraId = await attachToOrCreatePhieuTra(c.env.DB, unit.id, ktvKey, loaiDoiTru, user.email);
  }
  return c.json({ ok: true, phieu_tra_id: phieuTraId });
});

export default adminBH;
