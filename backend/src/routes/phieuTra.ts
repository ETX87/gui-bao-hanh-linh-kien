import { AnhLoi, chuanHoaAnh } from "../lib/anhDrive";
import { canGiaiTrinhTruoc } from "../lib/giaiTrinh";
import { eqFilters, distinctOpts, timeFilter, joinF } from "../lib/filters";
import { tkPhieuTraOf } from "../lib/search";
import { normVi } from "../lib/timKiem";
import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { LBL, KHACH_LE_KEY, type LoaiDoiTru } from "../lib/constants";
import { parsePage } from "../lib/pagination";
import { pushBoxToKhovan, pushBoxDoneToKhovan } from "../lib/khovanPushClient";
import { mienScope, syncPhieuTraMien } from "../lib/mien";
import { extractMaKtv } from "../lib/ktvCode";

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
  await db.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, ma_don_hang, created_at, updated_at) VALUES (?, ?, ?, 'nhap', ?, ?, ?, ?)").bind(id, ktvKey, actor, loai, id, now, now).run();
  const statements = unitIds.map((uid) => db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, uid));
  await db.batch(statements);
  await addLog(db, "phieu_tra", id, null, "nhap", actor, `Tạo phiếu trả mới (${LBL[loai] || loai}) với ${unitIds.length} dòng`);
  await syncPhieuTraMien(db, id);
  return id;
}

// ---------- Admin BH: tao & quan ly ----------

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireAdminBH(c: { get(k: "user"): { la_admin_bh: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_admin_bh || u.la_qtri;
}

// Phieu tra con sua duoc (them/bot don vi, doi linh kien thuc te, sua ma) cho toi khi Ke toan duyet
// cho Kho xuat (19/10/2026: "duoc sua cho den khi phieu chuyen sang trang thai KT xac nhan cho kho xuat").
const EDIT_STATES = ["nhap", "cho_ke_toan_duyet"];
const DOI_TAC_PREFIX = "__doi_tac__:";

// Cot hien thi cua 1 don vi "cho tao phieu tra" / "trong phieu tra" (19/10/2026, danh sach dang bang).
const UNIT_COLS = `u.id, u.parent_id, u.so_thu_tu, u.trang_thai, u.loai_doi_tru, u.loai_bao_hanh, u.huong_xu_ly, u.ma_lk_thuc_te, u.ma_lk_nhan,
  u.ket_qua_nv, u.ket_qua_chan_doan, u.xu_ly_xac, u.nguoi_sua_chua, u.updated_at, u.phieu_tra_id, u.ktv_thieu, u.that_lac,
  p.case_id, p.ma_lk, p.mo_ta_loi, p.mien, p.phieu_gui_id, p.odoo_id, p.nguon_tao, p.ten_khach_hang,
  (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_khach_hang`;

// GET /api/phieu-tra/san-sang - don vi san sang gom (chua thuoc phieu tra nao). Loc/tim lam tren may
// (hang doi bi chan boi buoc "xac nhan hoan tat" nen khong lon).
phieuTra.get("/san-sang", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const ms = mienScope(c.get("user"), "p");
  const { results } = await c.env.DB.prepare(
    `SELECT ${UNIT_COLS}, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL${ms.sql}
     ORDER BY ktv_key, u.updated_at`,
  )
    .bind(KHACH_LE_KEY, ...ms.binds)
    .all();
  return c.json({ don_vi: results });
});

// POST /api/phieu-tra/tao-nhieu {unit_ids, doi_tac_ten?} - tao phieu tra tu cac don vi da tick (co the
// thuoc nhieu KTV): moi to hop (KTV, loai doi tru) 1 phieu "nhap" moi. doi_tac_ten -> tat ca thanh phieu
// "tra xac cho doi tac" (tach theo loai doi tru).
phieuTra.post("/tao-nhieu", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ unit_ids?: string[]; doi_tac_key?: string }>().catch(() => ({}) as { unit_ids?: string[]; doi_tac_key?: string });
  const ids = [...new Set((body.unit_ids ?? []).map(String))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  if (body.doi_tac_key && !body.doi_tac_key.startsWith(DOI_TAC_PREFIX)) return c.json({ error: "INVALID_DOI_TAC" }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.loai_doi_tru, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.id IN (SELECT value FROM json_each(?)) AND u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL`,
  )
    .bind(KHACH_LE_KEY, JSON.stringify(ids))
    .all<{ id: string; loai_doi_tru: LoaiDoiTru; ktv_key: string }>();
  const okIds = new Set(results.map((r) => r.id));
  const boQua = ids.filter((id) => !okIds.has(id));
  const groups = new Map<string, string[]>();
  for (const r of results) {
    const key = `${body.doi_tac_key || r.ktv_key}::${r.loai_doi_tru || "doi_tra"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r.id);
  }
  const created: string[] = [];
  for (const [key, gIds] of groups) {
    const [ktvKey, loai] = key.split("::");
    created.push(await createPhieuTraForUnits(c.env.DB, ktvKey, loai as LoaiDoiTru, gIds, user.email));
  }
  return c.json({ phieu_tra_ids: created, so_don: results.length, bo_qua: boQua }, created.length ? 201 : 400);
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
  const ms = mienScope(user, "p");
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.loai_doi_tru, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL${ms.sql}`,
  )
    .bind(KHACH_LE_KEY, ...ms.binds)
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
      await syncPhieuTraMien(c.env.DB, existing.id);
      merged.push(existing.id);
      continue;
    }
    created.push(await createPhieuTraForUnits(c.env.DB, ktvKey, loai as LoaiDoiTru, ids, user.email));
  }
  return c.json({ so_phieu_tao: created.length, phieu_tra_ids: created, so_phieu_gop_them: merged.length, phieu_tra_gop_ids: merged });
});

// Nhat ky Ke toan da xu ly 1 phieu tra: duyet (cho_ke_toan_duyet -> da_duyet_ke_toan), tu choi (-> nhap,
// "Kế toán từ chối...") hoac day nguoc sau khi duyet (da_duyet_ke_toan -> nhap, "Kế toán đẩy ngược...").
// Khong tinh "Huỷ gửi duyệt" (Admin tu rut) va day nguoc cua Kho.
const KT_LOG = `l.entity_type = 'phieu_tra' AND l.entity_id = phieu_tra_bh.id AND ((l.tu_trang_thai = 'cho_ke_toan_duyet' AND l.den_trang_thai = 'da_duyet_ke_toan') OR (l.den_trang_thai = 'nhap' AND l.ghi_chu LIKE 'Kế toán%'))`;
const KT_LAST = `(SELECT l.id FROM logs_bh l WHERE ${KT_LOG} ORDER BY l.thoi_gian DESC, l.id DESC LIMIT 1)`;
const KT_LUC_SQL = `(SELECT thoi_gian FROM logs_bh WHERE id = ${KT_LAST})`;
const KT_BOI_SQL = `(SELECT nguoi_thuc_hien FROM logs_bh WHERE id = ${KT_LAST})`;
const KT_KQ_SQL = `COALESCE((SELECT CASE WHEN den_trang_thai = 'da_duyet_ke_toan' THEN 'duyet' WHEN tu_trang_thai = 'da_duyet_ke_toan' THEN 'day_nguoc' ELSE 'tu_choi' END FROM logs_bh WHERE id = ${KT_LAST}), 'appsheet')`;

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
  } else {
    // 11/10/2026: nguoi xu ly gan 1 mien chi thay phieu tra mien minh + chua khai bao.
    const ms = mienScope(user, "phieu_tra_bh");
    where += ms.sql;
    binds.push(...ms.binds);
  }
  if (ktv) {
    where += " AND ktv_nhan = ?";
    binds.push(ktv);
  }
  if (trangThai) {
    // Nhieu trang thai cach nhau dau phay (bo loc "dang xu ly" = nhap,cho_ke_toan_duyet,...).
    const tts = trangThai.split(",").map((s) => s.trim()).filter(Boolean);
    where += ` AND trang_thai IN (${tts.map(() => "?").join(",")})`;
    binds.push(...tts);
  }
  // 20/10/2026: phieu bi Ke toan tu choi, da tra ve Admin BH (nhap + co ly do tu choi).
  // 04/11/2026: Kho tach "Chờ kho gửi" thanh Chờ in phiếu (kho_in=0) / Đã in phiếu (kho_in=1).
  const khoIn = c.req.query("kho_in");
  if (khoIn === "0" || khoIn === "1") {
    where += " AND kho_da_in = ?";
    binds.push(Number(khoIn));
  }
  if (c.req.query("tu_choi_kt") === "1") where += " AND trang_thai = 'nhap' AND ly_do_tu_choi_kt IS NOT NULL";
  // 21/10/2026: "vai trò kế toán thiếu tab các đơn đã từng xử lý" - phieu Ke toan da duyet / tu choi / day
  // nguoc (theo nhat ky) + phieu nhap tu AppSheet da qua buoc KT. Kem lan xu ly gan nhat (kt_luc/kt_boi/kt_kq).
  const ktDaXuLy = c.req.query("kt_da_xu_ly") === "1";
  if (ktDaXuLy) {
    where += ` AND (EXISTS (SELECT 1 FROM logs_bh l WHERE ${KT_LOG}) OR (trang_thai <> 'nhap' AND id IN (SELECT entity_id FROM logs_bh WHERE entity_type = 'phieu_tra' AND ghi_chu LIKE 'Nhập từ AppSheet%')))`;
    const ktKq = c.req.query("kt_kq");
    if (ktKq) {
      where += ` AND ${KT_KQ_SQL} = ?`;
      binds.push(ktKq);
    }
    const ktBoi = c.req.query("kt_boi");
    if (ktBoi) {
      where += ` AND ${KT_BOI_SQL} = ?`;
      binds.push(ktBoi);
    }
  }
  // 21/10/2026: bo loc nguoi nhan (KTV cu the) / nguoi tao phieu / NV sua chua cua don ben trong / trang thai.
  if (c.req.query("loc_only")) {
    const locExprs: Record<string, string> = { ktv: "ktv_nhan", nguoi_tao: "nguoi_tao", trang_thai: "trang_thai" };
    if (ktDaXuLy) Object.assign(locExprs, { kt_kq: KT_KQ_SQL, kt_boi: KT_BOI_SQL });
    const loc = await distinctOpts(c.env.DB, locExprs, `FROM phieu_tra_bh WHERE ${where}`, binds);
    const nvRows = await c.env.DB.prepare(`SELECT DISTINCT u.nguoi_sua_chua AS v FROM phieu_sua_chua_bh_ct u WHERE u.nguoi_sua_chua IS NOT NULL AND u.phieu_tra_id IN (SELECT id FROM phieu_tra_bh WHERE ${where}) ORDER BY v LIMIT 500`).bind(...binds).all<{ v: string }>();
    loc.nv = nvRows.results.map((r) => r.v);
    return c.json({ loc });
  }
  const f = joinF(eqFilters(c, { nguoi_tao: "nguoi_tao" }), timeFilter(c, "created_at"));
  where += f.sql;
  binds.push(...f.binds);
  const nvF = c.req.query("nv");
  if (nvF) {
    where += " AND id IN (SELECT phieu_tra_id FROM phieu_sua_chua_bh_ct WHERE phieu_tra_id IS NOT NULL AND nguoi_sua_chua = ?)";
    binds.push(nvF);
  }
  // Bo loc + tim kiem man phieu tra (19/10/2026).
  const loai = c.req.query("loai_doi_tru");
  if (loai) {
    where += " AND loai_doi_tru = ?";
    binds.push(loai);
  }
  const nguoiNhan = c.req.query("nguoi_nhan"); // ktv | khach_le | doi_tac
  if (nguoiNhan === "khach_le") where += ` AND ktv_nhan = '${KHACH_LE_KEY}'`;
  else if (nguoiNhan === "doi_tac") where += ` AND ktv_nhan LIKE '${DOI_TAC_PREFIX}%'`;
  else if (nguoiNhan === "ktv") where += ` AND ktv_nhan <> '${KHACH_LE_KEY}' AND ktv_nhan NOT LIKE '${DOI_TAC_PREFIX}%'`;
  const mien = c.req.query("mien");
  if (mien === "none") where += " AND mien IS NULL";
  else if (mien === "MB" || mien === "MN") {
    where += " AND mien = ?";
    binds.push(mien);
  }
  const q = c.req.query("q")?.trim().toLowerCase();
  if (q) {
    const kw = `%${q}%`;
    where += ` AND (LOWER(id) LIKE ? OR LOWER(COALESCE(ma_don_hang,'')) LIKE ? OR LOWER(COALESCE(ma_misa,'')) LIKE ? OR LOWER(COALESCE(ma_van_don,'')) LIKE ?
      OR LOWER(ktv_nhan) LIKE ?
      OR ktv_nhan IN (SELECT email_dang_nhap FROM ktv_lien_he_bh WHERE LOWER(COALESCE(ten_hien_thi,'')) LIKE ? OR LOWER(ma_ktv) LIKE ?)
      OR ktv_nhan IN (SELECT email FROM users WHERE LOWER(COALESCE(ten,'')) LIKE ?)
      OR id IN (SELECT u.phieu_tra_id FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
                WHERE u.phieu_tra_id IS NOT NULL AND (LOWER(u.id) LIKE ? OR LOWER(COALESCE(p.case_id,'')) LIKE ? OR LOWER(COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk, '')) LIKE ?))
      OR COALESCE(${tkPhieuTraOf("phieu_tra_bh.id")},'') LIKE ?)`;
    // 31/10/2026: kem tim KHONG DAU theo ten khach / ten linh kien / case cua don ben trong.
    binds.push(kw, kw, kw, kw, kw, kw, kw, kw, kw, kw, kw, `%${normVi(q)}%`);
  }
  const [{ results }, totalRow] = await Promise.all([
    // so_don (12/10/2026, de xuat #16): so don vi trong phieu, hien cot "Số đơn" o cac danh sach.
    c.env.DB.prepare(
      ktDaXuLy
        ? `SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.phieu_tra_id = phieu_tra_bh.id) AS so_don, ${KT_LUC_SQL} AS kt_luc, ${KT_BOI_SQL} AS kt_boi, ${KT_KQ_SQL} AS kt_kq FROM phieu_tra_bh WHERE ${where} ORDER BY COALESCE(kt_luc, updated_at) DESC LIMIT ? OFFSET ?`
        : `SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.phieu_tra_id = phieu_tra_bh.id) AS so_don FROM phieu_tra_bh WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    )
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_tra_bh WHERE ${where}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  // 30/10/2026 (UX mobile KTV): kem_don=1 -> kem danh sach don ben trong (linh kien, khach) de the "Nhan hang"
  // cua KTV hien ngay phieu co gi, khong phai mo bang chi tiet.
  let rows = results as Record<string, unknown>[];
  if (c.req.query("kem_don") && rows.length) {
    const ids = rows.map((r) => r.id as string);
    const { results: us } = await c.env.DB.prepare(
      `SELECT u.id, u.phieu_tra_id, u.huong_xu_ly, COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk) AS ma_lk, p.case_id, p.mo_ta_loi,
         (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS khach_hang
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE u.phieu_tra_id IN (${ids.map(() => "?").join(",")}) ORDER BY u.id`,
    ).bind(...ids).all<Record<string, unknown>>();
    rows = rows.map((r) => ({ ...r, don: us.filter((u) => u.phieu_tra_id === r.id) }));
  }
  return c.json({ phieu_tra: rows, total: totalRow?.cnt ?? 0 });
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
    `SELECT ${UNIT_COLS}
     FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     WHERE u.phieu_tra_id = ? ORDER BY u.id`,
  )
    .bind(id)
    .all();
  const { results: anh } = await c.env.DB.prepare("SELECT * FROM phieu_tra_bh_anh WHERE phieu_tra_id = ?").bind(id).all();
  const { results: logs } = await c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_tra' AND entity_id = ? ORDER BY thoi_gian DESC").bind(id).all();
  // Ten KTV cho "Dien giai MISA" (02/11/2026): dung dung chuoi KTV tren CRM "(ma) Loai - Khu vuc - Ten"
  // (uu tien case trong phieu, roi don Odoo cua KTV), khong co thi "(ma) Ten" tu danh ba.
  let misaKtv: string | null = null;
  const ktv = await c.env.DB.prepare("SELECT ma_ktv, ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ? LIMIT 1")
    .bind(t.ktv_nhan)
    .first<{ ma_ktv: string; ten_hien_thi: string | null }>();
  if (ktv) {
    const caseIds = [...new Set((donVi as { case_id: string | null }[]).map((u) => u.case_id).filter(Boolean))] as string[];
    if (caseIds.length) {
      const { results: snaps } = await c.env.DB.prepare(
        `SELECT json_extract(data, '$.ky_thuat_vien') AS ktv FROM case_lookup_snapshot WHERE case_id IN (${caseIds.map(() => "?").join(",")})`,
      )
        .bind(...caseIds)
        .all<{ ktv: string | null }>();
      misaKtv = snaps.map((r) => r.ktv).find((k) => !!k && extractMaKtv(k) === ktv.ma_ktv) ?? null;
    }
    if (!misaKtv) {
      const o = await c.env.DB.prepare("SELECT ky_thuat_vien FROM don_bh_odoo WHERE ma_ktv = ? AND ky_thuat_vien IS NOT NULL ORDER BY ngay_dong_bo DESC LIMIT 1")
        .bind(ktv.ma_ktv)
        .first<{ ky_thuat_vien: string }>();
      misaKtv = o?.ky_thuat_vien ?? null;
    }
    if (!misaKtv) misaKtv = `(${ktv.ma_ktv}) ${ktv.ten_hien_thi || t.ktv_nhan}`;
  }
  return c.json({ phieu_tra: t, don_vi: donVi, anh, logs, misa_ktv: misaKtv });
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

// POST /api/phieu-tra/:id/ma-misa (02/11/2026) - Ke toan nhap them / sua ma MISA truoc khi Kho xu ly:
// phieu "cho KT duyet", hoac "KT da duyet" ma Kho chua dong goi (chua co anh dong goi) / chua gui.
phieuTra.post("/:id/ma-misa", async (c) => {
  const user = c.get("user");
  if (!requireKeToan(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, ma_misa FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; ma_misa: string | null }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!["cho_ke_toan_duyet", "da_duyet_ke_toan"].includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  if (t.trang_thai === "da_duyet_ke_toan") {
    const a = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_tra_bh_anh WHERE phieu_tra_id = ?").bind(id).first<{ n: number }>();
    if ((a?.n ?? 0) > 0) return c.json({ error: "KHO_DA_XU_LY" }, 400);
  }
  const body = await c.req.json<{ ma_misa?: string }>().catch(() => ({}) as { ma_misa?: string });
  const moi = (body.ma_misa ?? "").trim().slice(0, 200);
  if ((t.ma_misa || "") === moi) return c.json({ ok: true, khong_doi: true });
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET ma_misa = ?, updated_at = ? WHERE id = ?").bind(moi || null, nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, `Kế toán ${t.ma_misa ? "sửa" : "nhập"} mã MISA: ${t.ma_misa || "(trống)"} → ${moi || "(trống)"}`);
  return c.json({ ok: true });
});

// DELETE /api/phieu-tra/:id/don-vi/:unitId - bo 1 don vi khoi phieu (don vi quay lai danh sach "cho tao
// phieu tra"). Duoc khi phieu con "nhap" hoac "cho Ke toan duyet" (19/10/2026).
phieuTra.delete("/:id/don-vi/:unitId", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const unitId = c.req.param("unitId");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!EDIT_STATES.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const r = await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = NULL WHERE id = ? AND phieu_tra_id = ?").bind(unitId, id).run();
  if (!r.meta?.changes) return c.json({ error: "NOT_FOUND" }, 404);
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, `Bỏ đơn vị ${unitId} khỏi phiếu`);
  await syncPhieuTraMien(c.env.DB, id);
  return c.json({ ok: true });
});

// GET /api/phieu-tra/:id/co-the-them - don vi san sang gom co the them vao phieu nay (cung KTV nhan + cung
// loai doi tru; phieu tra xac cho doi tac thi chi can cung loai doi tru).
phieuTra.get("/:id/co-the-them", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT ktv_nhan, loai_doi_tru FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ ktv_nhan: string; loai_doi_tru: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  const ms = mienScope(c.get("user"), "p");
  const doiTac = t.ktv_nhan.startsWith(DOI_TAC_PREFIX);
  const { results } = await c.env.DB.prepare(
    `SELECT ${UNIT_COLS}, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai = 'san_sang_gom_phieu_tra' AND u.phieu_tra_id IS NULL AND COALESCE(u.loai_doi_tru, 'doi_tra') = ?
       ${doiTac ? "" : "AND COALESCE(g.nguoi_tao, ?) = ?"}${ms.sql}
     ORDER BY ktv_key, u.updated_at`,
  )
    .bind(KHACH_LE_KEY, t.loai_doi_tru, ...(doiTac ? [] : [KHACH_LE_KEY, t.ktv_nhan]), ...ms.binds)
    .all();
  return c.json({ don_vi: results });
});

// POST /api/phieu-tra/:id/don-vi {unit_ids} - them don vi vao phieu dang sua (nhap / cho Ke toan duyet).
phieuTra.post("/:id/don-vi", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai, ktv_nhan, loai_doi_tru FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; ktv_nhan: string; loai_doi_tru: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!EDIT_STATES.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ unit_ids?: string[] }>().catch(() => ({}) as { unit_ids?: string[] });
  const ids = [...new Set((body.unit_ids ?? []).map(String))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.loai_doi_tru, u.trang_thai, u.phieu_tra_id, COALESCE(g.nguoi_tao, ?) as ktv_key
     FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.id IN (SELECT value FROM json_each(?))`,
  )
    .bind(KHACH_LE_KEY, JSON.stringify(ids))
    .all<{ id: string; loai_doi_tru: string | null; trang_thai: string; phieu_tra_id: string | null; ktv_key: string }>();
  const doiTac = t.ktv_nhan.startsWith(DOI_TAC_PREFIX);
  const loi: { id: string; error: string }[] = [];
  const ok: string[] = [];
  for (const id2 of ids) {
    const u = results.find((r) => r.id === id2);
    if (!u) loi.push({ id: id2, error: "NOT_FOUND" });
    else if (u.trang_thai !== "san_sang_gom_phieu_tra" || u.phieu_tra_id) loi.push({ id: id2, error: "NOT_READY" });
    else if ((u.loai_doi_tru || "doi_tra") !== t.loai_doi_tru) loi.push({ id: id2, error: "LOAI_DOI_TRU_MISMATCH" });
    else if (!doiTac && u.ktv_key !== t.ktv_nhan) loi.push({ id: id2, error: "KTV_MISMATCH" });
    else ok.push(id2);
  }
  if (ok.length) {
    await c.env.DB.batch(ok.map((uid) => c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ? AND phieu_tra_id IS NULL").bind(id, uid)));
    await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, `Thêm ${ok.length} đơn vị vào phiếu: ${ok.join(", ")}`);
    await syncPhieuTraMien(c.env.DB, id);
  }
  return c.json({ ok: ok.length, loi });
});

// PATCH /api/phieu-tra/:id/don-vi/:unitId {ma_lk_thuc_te} - doi linh kien thuc te tra ve trong phieu dang sua.
phieuTra.patch("/:id/don-vi/:unitId", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const unitId = c.req.param("unitId");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!EDIT_STATES.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const u = await c.env.DB.prepare("SELECT u.ma_lk_thuc_te, u.ma_lk_nhan, u.trang_thai, p.ma_lk FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ? AND u.phieu_tra_id = ?")
    .bind(unitId, id)
    .first<{ ma_lk_thuc_te: string | null; ma_lk_nhan: string | null; trang_thai: string; ma_lk: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  const body = await c.req.json<{ ma_lk_thuc_te?: string | null }>().catch(() => ({}) as { ma_lk_thuc_te?: string | null });
  const ma = body.ma_lk_thuc_te?.trim() || null;
  if (!ma) return c.json({ error: "MISSING_LINH_KIEN" }, 400);
  const lk = await c.env.DB.prepare("SELECT ma_lk FROM linh_kien_bh WHERE ma_lk = ?").bind(ma).first();
  if (!lk) return c.json({ error: "LINH_KIEN_NOT_FOUND" }, 400);
  const cu = u.ma_lk_thuc_te || u.ma_lk_nhan || u.ma_lk || "—";
  if (cu === ma) return c.json({ ok: true });
  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET ma_lk_thuc_te = ?, updated_at = ? WHERE id = ?").bind(ma, now, unitId).run();
  const msg = `Đổi linh kiện thực tế trong phiếu trả ${id}: ${cu} → ${ma}`;
  await addLog(c.env.DB, "phieu_sc_ct", unitId, u.trang_thai, u.trang_thai, user.email, msg);
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, `Đơn vị ${unitId}: đổi linh kiện thực tế ${cu} → ${ma}`);
  return c.json({ ok: true });
});

// DELETE /api/phieu-tra/:id - xoa phieu da rong (khong con don vi nao), chi khi con dang sua.
phieuTra.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (!EDIT_STATES.includes(t.trang_thai)) return c.json({ error: "WRONG_STATE" }, 400);
  const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh_ct WHERE phieu_tra_id = ?").bind(id).first<{ n: number }>();
  if ((n?.n ?? 0) > 0) return c.json({ error: "PHIEU_TRA_CON_DON" }, 400);
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, "da_xoa", user.email, "Xoá phiếu trả rỗng");
  await c.env.DB.prepare("DELETE FROM phieu_tra_bh_anh WHERE phieu_tra_id = ?").bind(id).run();
  await c.env.DB.prepare("DELETE FROM phieu_tra_bh WHERE id = ?").bind(id).run();
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
  // 20/10/2026: bo bat buoc ma MISA o buoc Admin BH ("mã misa là bước của kế toán - admin bh có thể nhập hoặc không").
  const n = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM phieu_sua_chua_bh_ct WHERE phieu_tra_id = ?").bind(id).first<{ n: number }>();
  if (!n?.n) return c.json({ error: "EMPTY_PHIEU_TRA" }, 400);
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'cho_ke_toan_duyet', ly_do_day_nguoc = NULL, day_nguoc_boi = NULL, day_nguoc_vai_tro = NULL, day_nguoc_luc = NULL, updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
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
  const misa = body.ma_misa?.trim() || randomCode("PXK");
  const targetState = body.mode === "ktv" ? "da_gui" : "da_duyet_ke_toan";
  const id = await nextSequentialId(c.env.DB, "phieu_tra_bh", "TR");
  // 05/11/2026: ma don hang mac dinh = ma phieu tra (sua lai duoc).
  const madh = body.ma_don_hang?.trim() || id;
  const now = nowVN();
  await c.env.DB.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, ma_don_hang, ma_misa, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, ktvKey, user.email, targetState, u.loai_doi_tru, madh, misa, now, now)
    .run();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, unitId).run();
  await syncPhieuTraMien(c.env.DB, id);
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
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'da_duyet_ke_toan', ly_do_tu_choi_kt = NULL, updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
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
  await addLog(c.env.DB, "phieu_tra", id, "cho_ke_toan_duyet", "nhap", user.email, "Kế toán từ chối, trả lại Admin BH: " + body.ly_do.trim());
  return c.json({ ok: true });
});

// 03/11/2026 - nguyen van: "Kế toán thêm nút trừ công nợ => xác nhận trừ công nợ đơn sẽ kết thúc như đơn kho
// xác nhận trừ công nợ (không gửi đến KTV)". Phieu cho KT duyet hoac da duyet ma Kho chua gui -> ket_thuc_khong_gui.
// Phieu da duyet (da bao sang khovan) -> bao khovan "da ban giao" de Kho khong xu ly nua.
phieuTra.post("/:id/kt-tru-cong-no", async (c) => {
  const user = c.get("user");
  if (!requireKeToan(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "cho_ke_toan_duyet" && t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ghi_chu?: string }>().catch(() => ({}) as { ghi_chu?: string });
  const gc = body.ghi_chu?.trim();
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ket_thuc_khong_gui', ly_do_tu_choi_kt = NULL, updated_at = ? WHERE id = ?").bind(nowVN(), id).run();
  await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, "ket_thuc_khong_gui", user.email, "Kế toán xác nhận trừ công nợ — kết thúc, không gửi hàng về KTV" + (gc ? " | " + gc : ""));
  if (t.trang_thai === "da_duyet_ke_toan") c.executionCtx.waitUntil(pushBoxDoneToKhovan(c.env, id, "Kế toán xác nhận trừ công nợ — không gửi hàng"));
  return c.json({ ok: true });
});

// 04/11/2026 - "Bổ sung 1 trạng trung gian cho KHO là trạng thái "Kho đã in phiếu", "Chờ kho in phiếu", có thể đổi
// qua lại". POST /api/phieu-tra/kho-in {ids, da_in} - 1 hoac nhieu phieu da Ke toan duyet (Kho chua gui).
phieuTra.post("/kho-in", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; da_in?: boolean }>().catch(() => ({}) as { ids?: string[]; da_in?: boolean });
  const ids = [...new Set((body.ids || []).filter((x) => typeof x === "string"))].slice(0, 200);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const daIn = body.da_in === false ? 0 : 1;
  const now = nowVN();
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const t = await c.env.DB.prepare("SELECT trang_thai, kho_da_in FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string; kho_da_in: number }>();
    if (!t) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    if (t.trang_thai !== "da_duyet_ke_toan") {
      loi.push({ id, error: "WRONG_STATE" });
      continue;
    }
    if (t.kho_da_in === daIn) {
      ok++;
      continue;
    }
    await c.env.DB.prepare("UPDATE phieu_tra_bh SET kho_da_in = ?, kho_in_boi = ?, kho_in_luc = ?, updated_at = ? WHERE id = ?").bind(daIn, daIn ? user.email : null, daIn ? now : null, now, id).run();
    await addLog(c.env.DB, "phieu_tra", id, t.trang_thai, t.trang_thai, user.email, daIn ? "Kho đã in phiếu" : "Kho chuyển về: chờ in phiếu");
    ok++;
  }
  return c.json({ ok, loi });
});

// POST /api/phieu-tra/:id/day-nguoc {vai_tro: 'kho'|'ke_toan', ly_do} - phieu da duyet nhung len nham
// (19/10/2026: "them nut day nguoc cho kho + ke toan phong truong hop don bi len nham"): Kho (truoc khi
// gui) hoac Ke toan (huy duyet) tra phieu ve "nhap" cho Admin BH sua, bat buoc ly do.
phieuTra.post("/:id/day-nguoc", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json<{ vai_tro?: string; ly_do?: string }>().catch(() => ({}) as { vai_tro?: string; ly_do?: string });
  const vaiTro = body.vai_tro === "kho" ? "kho" : body.vai_tro === "ke_toan" ? "ke_toan" : null;
  if (!vaiTro) return c.json({ error: "INVALID_VAI_TRO" }, 400);
  if (vaiTro === "kho" ? !(user.la_kho || user.la_qtri) : !(user.la_ke_toan || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const lyDo = body.ly_do?.trim();
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "da_duyet_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'nhap', kho_da_in = 0, ly_do_day_nguoc = ?, day_nguoc_boi = ?, day_nguoc_vai_tro = ?, day_nguoc_luc = ?, updated_at = ? WHERE id = ?")
    .bind(lyDo, user.email, vaiTro, now, now, id)
    .run();
  await addLog(c.env.DB, "phieu_tra", id, "da_duyet_ke_toan", "nhap", user.email, `${vaiTro === "kho" ? "Kho" : "Kế toán"} đẩy ngược phiếu về Admin BH (lên nhầm): ${lyDo}`);
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
  // 12/11/2026: anh luu tren Google Drive (lib/anhDrive.ts), D1 chi giu link.
  let anhUrls: string[];
  try {
    anhUrls = await chuanHoaAnh(c.env, body.anh, `dong_goi_${id}`);
  } catch (e) {
    return c.json({ error: e instanceof AnhLoi ? e.code : "UPLOAD_FAILED" }, 400);
  }
  const statements = anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_tra_bh_anh (phieu_tra_id, anh_url) VALUES (?, ?)").bind(id, url));
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
  // 16/11/2026: buoc KTV giu qua SLA ma chua ai giai trinh -> phai giai trinh truoc (frontend tu mo hop giai trinh roi gui lai).
  const gtTruoc = await canGiaiTrinhTruoc(c.env.DB, "phieu_tra", id);
  if (gtTruoc) return c.json({ error: "REQUIRE_GIAI_TRINH", gt: gtTruoc }, 400);
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
  // 31/10/2026: bao thieu THEO TUNG MON - thieu_ids = cac don vi KTV khong nhan duoc (khong gui = thieu ca phieu).
  // Mon khong bao thieu coi nhu KTV da nhan.
  const body = await c.req.json<{ ghi_chu?: string; thieu_ids?: string[] }>().catch(() => ({}) as { ghi_chu?: string; thieu_ids?: string[] });
  if (!body.ghi_chu?.trim()) return c.json({ error: "MISSING_GHI_CHU" }, 400);
  const { results: us } = await c.env.DB.prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE phieu_tra_id = ?").bind(id).all<{ id: string }>();
  const all = us.map((u) => u.id);
  const thieu = Array.isArray(body.thieu_ids) ? all.filter((x) => body.thieu_ids!.includes(x)) : all;
  if (thieu.length === 0) return c.json({ error: "MISSING_THIEU" }, 400);
  const now = nowVN();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET ktv_thieu = 0 WHERE phieu_tra_id = ?").bind(id),
    ...thieu.map((x) => c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET ktv_thieu = 1 WHERE id = ?").bind(x)),
    c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = 'khieu_nai_van_chuyen', khong_nhan_duoc_ghi_chu = ?, updated_at = ? WHERE id = ?").bind(body.ghi_chu.trim(), now, id),
  ]);
  const phan = thieu.length === all.length ? "không nhận được cả phiếu" : `thiếu ${thieu.length}/${all.length} món (${thieu.join(", ")})`;
  await addLog(c.env.DB, "phieu_tra", id, "da_gui", "khieu_nai_van_chuyen", user.email, `KTV báo ${phan}: ` + body.ghi_chu.trim());
  return c.json({ ok: true, thieu: thieu.length, tong: all.length });
});

// Kho danh gia khieu nai "khong nhan duoc hang" (12/10/2026, dinh nghia "that lac tren duong tra" da
// chot): thanh_cong -> hang da toi noi (ktv_da_nhan); that_bai -> 'gui_that_bai' (ket thuc, ghi ro ly
// do - bat buoc ghi chu khi that bai).
phieuTra.post("/:id/danh-gia-khieu-nai", async (c) => {
  const user = c.get("user");
  if (!requireKho(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const t = await c.env.DB.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!t) return c.json({ error: "NOT_FOUND" }, 404);
  if (t.trang_thai !== "khieu_nai_van_chuyen") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ket_qua?: string; ghi_chu?: string }>().catch(() => ({}) as { ket_qua?: string; ghi_chu?: string });
  if (body.ket_qua !== "thanh_cong" && body.ket_qua !== "that_bai") return c.json({ error: "INVALID_KET_QUA" }, 400);
  const ghiChu = body.ghi_chu?.trim() || "";
  // That bai: Kho bat buoc ghi PHUONG AN XU LY (xu ly ngoai he thong - chot 12/10/2026).
  if (body.ket_qua === "that_bai" && !ghiChu) return c.json({ error: "MISSING_GHI_CHU" }, 400);
  // 31/10/2026: chi cac mon KTV bao thieu moi bi danh dau that lac. Thieu ca phieu -> 'gui_that_bai' nhu cu;
  // thieu 1 phan -> phieu 'ktv_da_nhan' (KTV da nhan phan con lai), mon thieu mang that_lac = 1.
  const cnt = await c.env.DB.prepare("SELECT COUNT(*) AS n, SUM(ktv_thieu) AS thieu FROM phieu_sua_chua_bh_ct WHERE phieu_tra_id = ?").bind(id).first<{ n: number; thieu: number | null }>();
  const nThieu = cnt?.thieu || cnt?.n || 0;
  const caPhieu = !cnt || nThieu >= cnt.n;
  const den = body.ket_qua === "thanh_cong" || !caPhieu ? "ktv_da_nhan" : "gui_that_bai";
  const now = nowVN();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE phieu_tra_bh SET trang_thai = ?, kq_khieu_nai = ?, kq_khieu_nai_ghi_chu = ?, kq_khieu_nai_boi = ?, kq_khieu_nai_luc = ?, updated_at = ? WHERE id = ?")
      .bind(den, body.ket_qua, ghiChu || null, user.email, now, now, id),
    body.ket_qua === "that_bai"
      ? c.env.DB.prepare(caPhieu ? "UPDATE phieu_sua_chua_bh_ct SET that_lac = 1, ktv_thieu = 1 WHERE phieu_tra_id = ?" : "UPDATE phieu_sua_chua_bh_ct SET that_lac = 1 WHERE phieu_tra_id = ? AND ktv_thieu = 1").bind(id)
      : c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET that_lac = 0, ktv_thieu = 0 WHERE phieu_tra_id = ?").bind(id),
  ]);
  await addLog(
    c.env.DB,
    "phieu_tra",
    id,
    "khieu_nai_van_chuyen",
    den,
    user.email,
    (body.ket_qua === "thanh_cong" ? "Kho đánh giá khiếu nại: gửi THÀNH CÔNG (hàng đã tới nơi)" : caPhieu ? "Kho đánh giá khiếu nại: gửi THẤT BẠI (thất lạc cả phiếu)" : `Kho đánh giá khiếu nại: THẤT LẠC ${nThieu}/${cnt?.n} món KTV báo thiếu, phần còn lại KTV đã nhận`) + (ghiChu ? (body.ket_qua === "that_bai" ? " | Phương án xử lý: " : " | ") + ghiChu : ""),
  );
  return c.json({ ok: true });
});

export default phieuTra;
