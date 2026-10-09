import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";
import { LBL, KHACH_LE_KEY, type LoaiDoiTru } from "../lib/constants";
import { parsePage } from "../lib/pagination";
import { pushBoxToKhovan } from "../lib/khovanPushClient";

// Phieu tra bao hanh - Admin BH tao/gop, Ke toan duyet, Kho dong goi/gui/ket thuc, KTV xac nhan
// nhan/khieu nai. State machine: nhap -> cho_ke_toan_duyet -> da_duyet_ke_toan -> da_gui ->
// ktv_da_nhan | khieu_nai_van_chuyen (tu choi cua Ke toan quay lai "nhap").

const phieuTra = new Hono<{ Bindings: Env }>();
phieuTra.use("*", verifySessionMiddleware, loadUser);

function randomCode(prefix: string): string {
  return `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}

async function ktvKeyOfUnit(db: D1Database, unitParentId: string): Promise<string> {
  const row = await db.prepare(`SELECT g.nguoi_tao FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?`).bind(unitParentId).first<{ nguoi_tao: string | null }>();
  return row?.nguoi_tao ?? KHACH_LE_KEY;
}

async function createPhieuTraForUnits(db: D1Database, ktvKey: string, loai: LoaiDoiTru, unitIds: string[], actor: string): Promise<string> {
  const id = await nextSequentialId(db, "phieu_tra_bh", "TR");
  const now = nowVN();
  await db.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, created_at, updated_at) VALUES (?, ?, ?, 'nhap', ?, ?, ?)").bind(id, ktvKey, actor, loai, now, now).run();
  const statements = unitIds.map((uid) => db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, uid));
  await db.batch(statements);
  await addLog(db, "phieu_tra", id, null, "nhap", actor, `Tạo phiếu trả mới (${LBL[loai] || loai}) với ${unitIds.length} dòng`);
  return id;
}

// ---------- Admin BH: tao & quan ly ----------

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireAdminBH(c: { get(k: "user"): { la_admin_bh: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_admin_bh || u.la_qtri;
}

// GET /api/phieu-tra/san-sang?ktv=<email|__khach_le__> - don vi san sang gom, nhom theo loai doi tru.
phieuTra.get("/san-sang", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.loai_doi_tru, u.parent_id, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL`,
  )
    .bind(KHACH_LE_KEY)
    .all();
  return c.json({ don_vi: results });
});

phieuTra.post("/", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ktv_key?: string; loai_doi_tru?: LoaiDoiTru; unit_ids?: string[] }>().catch(() => ({}) as { ktv_key?: string; loai_doi_tru?: LoaiDoiTru; unit_ids?: string[] });
  if (!body.ktv_key || !body.loai_doi_tru || !body.unit_ids?.length) return c.json({ error: "MISSING_FIELDS" }, 400);
  const id = await createPhieuTraForUnits(c.env.DB, body.ktv_key, body.loai_doi_tru, body.unit_ids, user.email);
  return c.json({ id }, 201);
});

// POST /api/phieu-tra/tu-dong-gom - gom TAT CA KTV/khach le dang co don san sang, tach theo loai doi
// tru - port dung autoGomPhieuTraTatCa(). VAN qua Ke toan duyet binh thuong (khong bo qua).
phieuTra.post("/tu-dong-gom", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.loai_doi_tru, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL`,
  )
    .bind(KHACH_LE_KEY)
    .all<{ id: string; loai_doi_tru: LoaiDoiTru; ktv_key: string }>();

  const groups = new Map<string, string[]>();
  for (const row of results) {
    const key = `${row.ktv_key}::${row.loai_doi_tru}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row.id);
  }
  const created: string[] = [];
  const merged: string[] = [];
  for (const [key, ids] of groups) {
    const [ktvKey, loai] = key.split("::");
    // QA 04/10/2026: gop vao phieu "nhap" SAN CO cua dung KTV + loai doi tru (neu co) thay vi luon
    // tao phieu moi - dong bo voi attachToOrCreatePhieuTra() cua nut thao tac nhanh (quyet dinh
    // 03/09/2026: "gop vao phieu Nhap co san ... giong het autoGomPhieuTraTatCa()").
    const existing = await c.env.DB.prepare("SELECT id FROM phieu_tra_bh WHERE trang_thai = 'nhap' AND ktv_nhan = ? AND loai_doi_tru = ? ORDER BY created_at LIMIT 1")
      .bind(ktvKey, loai)
      .first<{ id: string }>();
    if (existing) {
      for (const uid of ids) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(existing.id, uid).run();
      await addLog(c.env.DB, "phieu_tra", existing.id, "nhap", "nhap", user.email, `Tự động gộp thêm ${ids.length} đơn vị: ${ids.join(", ")}`);
      merged.push(existing.id);
      continue;
    }
    created.push(await createPhieuTraForUnits(c.env.DB, ktvKey, loai as LoaiDoiTru, ids, user.email));
  }
  return c.json({ so_phieu_tao: created.length, phieu_tra_ids: created, so_phieu_gop_them: merged.length, phieu_tra_gop_ids: merged });
});

// GET /api/phieu-tra?ktv=&trang_thai=&limit=&offset=
phieuTra.get("/", async (c) => {
  const user = c.get("user");
  const ktv = c.req.query("ktv");
  const trangThai = c.req.query("trang_thai");
  const { limit, offset } = parsePage(c);
  let where = "1=1";
  const binds: unknown[] = [];
  if (user.la_ktv_dvbh || user.la_ve_tinh) {
    where += " AND ktv_nhan = ?";
    binds.push(user.email);
  } else if (!(user.la_admin_bh || user.la_ke_toan || user.la_kho || user.la_qtri || user.la_view)) {
    return c.json({ error: "FORBIDDEN" }, 403);
  }
  if (ktv) {
    where += " AND ktv_nhan = ?";
    binds.push(ktv);
  }
  if (trangThai) {
    where += " AND trang_thai = ?";
    binds.push(trangThai);
  }
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM phieu_tra_bh WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_tra_bh WHERE ${where}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_tra: results, total: totalRow?.cnt ?? 0 });
});

phieuTra.get("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT * FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ ktv_nhan: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if ((user.la_ktv_dvbh || user.la_ve_tinh) && t.ktv_nhan !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  // JOIN don cha de tra ten linh kien / mo ta loi / case (Phat hien 4 vong ra soat UX): KTV nhan
  // hang tra / Ke toan duyet can biet trong phieu co gi, ban cu chi hien ID + huong_xu_ly tho.
  const { results: donVi } = await c.env.DB.prepare(
    `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi
     FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     WHERE u.phieu_tra_id = ?`,
  )
    .bind(id)
    .all();
  const { results: anh } = await c.env.DB.prepare("SELECT * FROM phieu_tra_bh_anh WHERE phieu_tra_id = ?").bind(id).all();
  const { results: logs } = await c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_tra' AND entity_id = ? ORDER BY thoi_gian DESC").bind(id).all();
  return c.json({ phieu_tra: t, don_vi: donVi, anh, logs });
});

// PATCH - tach khoi phieu (chi khi con "nhap"), sua ma don hang/misa/van don.
phieuTra.patch("/:id", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  const body = await c.req.json<{ ma_don_hang?: string; ma_misa?: string; ma_van_don?: string }>().catch(() => ({}) as { ma_don_hang?: string; ma_misa?: string; ma_van_don?: string });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET ma_don_hang = COALESCE(?, ma_don_hang), ma_misa = COALESCE(?, ma_misa), ma_van_don = COALESCE(?, ma_van_don), updated_at = ? WHERE id = ?")
    .bind(body.ma_don_hang ?? null, body.ma_misa ?? null, body.ma_van_don ?? null, nowVN(), id)
    .run();
  return c.json({ ok: true });
});

// DELETE /api/phieu-tra/:id/don-vi/:unitId - tach 1 don vi khoi phieu (chi khi phieu con "nhap").
phieuTra.delete("/:id/don-vi/:unitId", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const unitId = c.req.param("unitId");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "nhap") return c.json({ error: "WRONG_STATE" }, 400);
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = NULL WHERE id = ? AND phieu_tra_id = ?").bind(unitId, id).run();
  return c.json({ ok: true });
});

// POST /api/phieu-tra/:id/gui-duyet - "nhap" -> "cho_ke_toan_duyet". Ma MISA bat buoc TRU khi
// loai_doi_tru = tru_cong_no.
phieuTra.post("/:id/gui-duyet", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, loai_doi_tru, ma_misa FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; loai_doi_tru: string; ma_misa: string | null }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "nhap") return c.json({ error: "WRONG_STATE" }, 400);
  if (t.loai_doi_tru !== "tru_cong_no" && !t.ma_misa?.trim()) return c.json({ error: "REQUIRE_MA_MISA" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'cho_ke_toan_duyet', updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "nhap", "cho_ke_toan_duyet", user.email, "Gửi duyệt kế toán");
  return c.json({ ok: true });
});

// POST /api/phieu-tra/:id/huy-gui-duyet - chi khi Ke toan CHUA xu ly.
phieuTra.post("/:id/huy-gui-duyet", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "cho_ke_toan_duyet") return c.json({ error: "WRONG_STATE" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'nhap', updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "cho_ke_toan_duyet", "nhap", user.email, "Huỷ gửi duyệt kế toán");
  return c.json({ ok: true });
});

// "Tra truc tiep KTV"/"Giao truc tiep Kho" - duong tat BO QUA gom nhom + duyet ke toan (co chu dich,
// port dung openTaoPhieuTraNhanhModal()/submitTaoPhieuTraNhanh()). mode=ktv -> "da_gui" (cho KTV xac
// nhan), mode=kho -> "da_duyet_ke_toan" (cho Kho dong goi).
phieuTra.post("/nhanh/:unitId", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const unitId = c.req.param("unitId");
  const body = await c.req.json<{ mode?: "ktv" | "kho"; ma_don_hang?: string; ma_misa?: string }>().catch(() => ({}) as { mode?: "ktv" | "kho"; ma_don_hang?: string; ma_misa?: string });
  if (body.mode !== "ktv" && body.mode !== "kho") return c.json({ error: "INVALID_MODE" }, 400);

  const u = await c.env.DB.prepare("SELECT parent_id, loai_doi_tru, phieu_tra_id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ parent_id: string; loai_doi_tru: string; phieu_tra_id: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.phieu_tra_id) return c.json({ error: "ALREADY_IN_PHIEU_TRA" }, 400);

  const ktvKey = await ktvKeyOfUnit(c.env.DB, u.parent_id);
  const madh = body.ma_don_hang?.trim() || randomCode("DH");
  const misa = body.ma_misa?.trim() || randomCode("PXK");
  const targetState = body.mode === "ktv" ? "da_gui" : "da_duyet_ke_toan";
  const id = await nextSequentialId(c.env.DB, "phieu_tra_bh", "TR");
  const now = nowVN();
  await c.env.DB.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, ma_don_hang, ma_misa, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, ktvKey, user.email, targetState, u.loai_doi_tru, madh, misa, now, now)
    .run();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, unitId).run();
  const nhan = body.mode === "ktv" ? "Tra truc tiep cho KTV" : "Admin giao truc tiep cho Kho";
  await addLog(c.env.DB, "phieu_tra", id, null, targetState, user.email, `${nhan} — tạo nhanh từ đơn vị ${unitId}`);
  return c.json({ id }, 201);
});

// ---------- Ke toan ----------

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireKeToan(c: { get(k: "user"): { la_ke_toan: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_ke_toan || u.la_qtri;
}

// Ke toan duyet la moc "san sang cho Kho xu ly" (nguyen tac "Kho chi thao tac qua app
// kho van", chot 2026-09-07) - day "cho xu ly" sang khovan O DAY (khong phai luc gui
// hang nua, vi buoc gui gio do chinh Kho THUC HIEN TU khovan qua routes/partnerKho.ts).
phieuTra.post("/:id/duyet", async (c) => {
  const user = c.get("user");
  if (!requireKeToan(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, ktv_nhan FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; ktv_nhan: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "cho_ke_toan_duyet") return c.json({ error: "WRONG_STATE" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'da_duyet_ke_toan', updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "cho_ke_toan_duyet", "da_duyet_ke_toan", user.email, "Kế toán duyệt");

  const ktvInfo = await c.env.DB.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(t.ktv_nhan).first<{ ten_hien_thi: string | null }>();
  const senderLabel = `Kho SC-BH (trả cho KTV ${ktvInfo?.ten_hien_thi || t.ktv_nhan})`;
  await pushBoxToKhovan(c.env, id, senderLabel, user.email, "Trả bảo hành - chờ Kho đóng gói/gửi");

  return c.json({ ok: true });
});

phieuTra.post("/:id/tu-choi", async (c) => {
  const user = c.get("user");
  if (!requireKeToan(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "cho_ke_toan_duyet") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  if (!body.ly_do?.trim()) return c.json({ error: "MISSING_LY_DO" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'nhap', ly_do_tu_choi_kt = ?, updated_at = ? WHERE id = ?").bind(body.ly_do.trim(), nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "cho_ke_toan_duyet", "nhap", user.email, "Kế toán từ chối: " + body.ly_do.trim());
  return c.json({ ok: true });
});

// ---------- Kho: dong goi (anh bien ban, tuy chon) + gui + ket thuc du phong ----------

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireKho(c: { get(k: "user"): { la_kho: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_kho || u.la_qtri;
}

phieuTra.post("/:id/dong-goi", async (c) => {
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ anh?: string[] }>().catch(() => ({}) as { anh?: string[] });
  const statements = (body.anh || []).map((url) => c.env.DB.prepare("INSERT INTO phieu_tra_bh_anh (phieu_tra_id, anh_url) VALUES (?, ?)").bind(id, url));
  if (statements.length) await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

phieuTra.post("/:id/gui", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ma_van_don?: string }>().catch(() => ({}) as { ma_van_don?: string });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'da_gui', ma_van_don = COALESCE(?, ma_van_don), updated_at = ? WHERE id = ?")
    .bind(body.ma_van_don ?? null, nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_tra", id, "da_duyet_ke_toan", "da_gui", user.email, "Kho gửi hàng");
  return c.json({ ok: true });
});

// Kho xac nhan ket thuc KHONG gui hang (chot 2026-09-08: gop chung 2 y tuong "tru kho"/"ket
// thuc" thanh 1 hanh dong duy nhat, co ghi chu tuy chon) - dung khi Kho quyet dinh dong phieu
// ngay tu buoc dang "da_duyet_ke_toan" ma khong gui di (vd giao tay truc tiep, huy vi ly do
// khac...). "trang_thai" khong co CHECK constraint tren cot nay (xem migrations/0001_init.sql)
// nen them 1 gia tri moi khong can migration.
phieuTra.post("/:id/ket-thuc-khong-gui", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ghi_chu?: string }>().catch(() => ({}) as { ghi_chu?: string });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ket_thuc_khong_gui', updated_at = ? WHERE id = ?")
    .bind(nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_tra", id, "da_duyet_ke_toan", "ket_thuc_khong_gui", user.email, "Kho xác nhận kết thúc, không gửi hàng" + (body.ghi_chu?.trim() ? " | " + body.ghi_chu.trim() : ""));
  return c.json({ ok: true });
});

// Kho xac nhan thay (du phong) - dung cho MOI phieu tra dang "da_gui" (khong chi khach le).
phieuTra.post("/:id/kho-xac-nhan-ket-thuc", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ktv_da_nhan', updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "da_gui", "ktv_da_nhan", user.email, "Kho xác nhận thay, dự phòng (KTV báo đã nhận qua kênh khác)");
  return c.json({ ok: true });
});

// ---------- KTV: xac nhan nhan / khieu nai ----------

phieuTra.post("/:id/ktv-xac-nhan-nhan", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, ktv_nhan FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; ktv_nhan: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.ktv_nhan !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (t.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ danh_gia?: string }>().catch(() => ({}) as { danh_gia?: string });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ktv_da_nhan', danh_gia_ktv = ?, updated_at = ? WHERE id = ?").bind(body.danh_gia?.trim() || "", nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "da_gui", "ktv_da_nhan", user.email, "KTV xác nhận đã nhận hàng");
  return c.json({ ok: true });
});

phieuTra.post("/:id/khieu-nai", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, ktv_nhan FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; ktv_nhan: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.ktv_nhan !== user.email) return c.json({ error: "FORBIDDEN" }, 403);
  if (t.trang_thai !== "da_gui") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ghi_chu?: string }>().catch(() => ({}) as { ghi_chu?: string });
  if (!body.ghi_chu?.trim()) return c.json({ error: "MISSING_GHI_CHU" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'khieu_nai_van_chuyen', khong_nhan_duoc_ghi_chu = ?, updated_at = ? WHERE id = ?").bind(body.ghi_chu.trim(), nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, "da_gui", "khieu_nai_van_chuyen", user.email, "KTV mở khiếu nại vận chuyển: " + body.ghi_chu.trim());
  return c.json({ ok: true });
});

export default phieuTra;
