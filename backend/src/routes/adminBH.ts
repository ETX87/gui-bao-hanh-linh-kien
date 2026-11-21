import { AnhLoi, chuanHoaAnh } from "../lib/anhDrive";
import { Hono } from "hono";
import { normCaseId } from "../lib/caseNgay";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { gsListOfKtv } from "../lib/gs";
import { slaCutoffVn } from "../lib/sla";
import { quaHanBuoc } from "../lib/buoc";
import { LBL, HUONG_CAN_NV, HUONG_TAO_PHIEU_TRA, KHACH_LE_KEY, type HuongXuLy, type LoaiBaoHanh, type LoaiDoiTru } from "../lib/constants";
import { parsePage } from "../lib/pagination";
import { syncCaseSnapshots } from "../lib/caseSnapshot";
import { nhanHoThung } from "../lib/nhanHo";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF, textFilters, numFilters, sortParam, tonFilter } from "../lib/filters";
import { normVi, capNhatTimKiem } from "../lib/timKiem";
import type { Context } from "hono";
import { kwClause, tenOf, tenLkOf, tkThungOf } from "../lib/search";
import { mienScope, mienOfStaff, syncPhieuTraMien } from "../lib/mien";
import { pushBoxDoneToKhovan } from "../lib/khovanPushClient";
import { lanTruocSql } from "../lib/lanTruoc";
import { HANG_SQL, DOI_TAC_ID_SQL, COT_HANG_DOI_TAC, loaiDeXuatSuaChua } from "../lib/doiTac";
import { kiemTraCase, ghiDoiCase } from "../lib/kiemTraCase";

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
  const ms = mienScope(c.get("user"), "phieu_gui_bh");
  // 20/10/2026: ?trang_thai=da_gui -> thung dang gui ve Kho (de Admin "nhan ho Kho" khi KTV giao truc tiep).
  const base = (c.req.query("trang_thai") === "da_gui" ? "FROM phieu_gui_bh WHERE trang_thai = 'da_gui'" : "FROM phieu_gui_bh WHERE trang_thai = 'da_tiep_nhan' AND admin_tiep_nhan = 0 AND tu_choi_tt IS NULL") + ms.sql;
  // 21/10/2026: loc KTV gui / Kho nhan / hinh thuc gui + tim.
  const LOC = { ktv: "nguoi_tao", kho: "nguoi_nhan_kho", hinh_thuc_gui: "hinh_thuc_gui", mien: "mien" };
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, base, ms.binds) });
  const f = eqFilters(c, LOC);
  const kw = kwClause(c.req.query("q"), ["id", "ma_van_don", "ma_xe_hoac_tai_xe", "nguoi_tao", tenOf("phieu_gui_bh.nguoi_tao"), "(SELECT group_concat(p.id || ' ' || COALESCE(p.case_id,'') || ' ' || COALESCE(p.ma_lk,''), ' ') FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id)"], [tkThungOf("phieu_gui_bh.id")]);
  // 31/10/2026: loc thoi gian (ngay tao thung) + canh bao SLA (tu luc Kho nhan / gui xe).
  const tf = joinF(timeFilter(c, "created_at"), slaFilter(c, "COALESCE(thoi_gian_nhan_kho, updated_at)"), tonFilter(c, c.req.query("trang_thai") === "da_gui" ? "updated_at" : "COALESCE(thoi_gian_nhan_kho, updated_at)"));
  const fromWhere = base + f.sql + kw.sql + tf.sql;
  const b = [...ms.binds, ...f.binds, ...kw.binds, ...tf.binds];
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id) AS so_don ${fromWhere} ORDER BY ${c.req.query("trang_thai") === "da_gui" ? "updated_at" : "COALESCE(thoi_gian_nhan_kho, updated_at)"} ASC LIMIT ? OFFSET ?`).bind(...b, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).bind(...b).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
});

const KHOVAN_NOTE_NOI_BO = "Kho đã bàn giao, Admin bảo hành đã tiếp nhận — đã xử lý, kết thúc bên kho";

// Tiep nhan noi bo 1 thung - dung chung cho don le + hang loat (12/10/2026, de xuat #10 ra soat Admin BH).
async function tiepNhanNoiBo(db: D1Database, id: string, lyDoCham: string | undefined, actor: string): Promise<{ error: string } | { ok: true }> {
  const g = await db.prepare("SELECT trang_thai, admin_tiep_nhan, thoi_gian_nhan_kho, tu_choi_tt FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; admin_tiep_nhan: number; thoi_gian_nhan_kho: string | null; tu_choi_tt: string | null }>();
  if (!g) return { error: "NOT_FOUND" };
  if (g.trang_thai !== "da_tiep_nhan" || g.admin_tiep_nhan) return { error: "WRONG_STATE" };
  // 13/11/2026: thung dang bi tu choi (cho Kho / KTV phan hoi) -> Admin phai "Rut lai tu choi" truoc.
  if (g.tu_choi_tt) return { error: "THUNG_DANG_TU_CHOI" };
  if ((await quaHanBuoc(db, "thung_cho_admin_nhan", g.thoi_gian_nhan_kho)) && !lyDoCham?.trim()) return { error: "REQUIRE_LY_DO_CHAM" };
  const now = nowVN();
  await db.prepare("UPDATE phieu_gui_bh SET admin_tiep_nhan = 1, admin_nguoi_nhan = ?, admin_thoi_gian_nhan = ?, updated_at = ? WHERE id = ?").bind(actor, now, now, id).run();
  await addLog(db, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", actor, "Admin bảo hành xác nhận tiếp nhận nội bộ từ Kho" + (lyDoCham ? " | Lý do chậm: " + lyDoCham : ""));
  return { ok: true };
}

adminBH.post("/phieu-gui/tiep-nhan-noi-bo-hang-loat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; ly_do_cham?: string }>().catch(() => ({}) as { ids?: string[]; ly_do_cham?: string });
  const ids = [...new Set((body.ids || []).filter((x) => typeof x === "string"))].slice(0, 200);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const r = await tiepNhanNoiBo(c.env.DB, id, body.ly_do_cham, user.email);
    if ("error" in r) loi.push({ id, error: r.error });
    else { ok++; c.executionCtx.waitUntil(pushBoxDoneToKhovan(c.env, id, KHOVAN_NOTE_NOI_BO)); }
  }
  return c.json({ ok, loi });
});

adminBH.post("/phieu-gui/:id/tiep-nhan-noi-bo", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ly_do_cham?: string }>().catch(() => ({}) as { ly_do_cham?: string });
  const r = await tiepNhanNoiBo(c.env.DB, c.req.param("id"), body.ly_do_cham, user.email);
  if ("error" in r) return c.json(r, r.error === "NOT_FOUND" ? 404 : 400);
  c.executionCtx.waitUntil(pushBoxDoneToKhovan(c.env, c.req.param("id"), KHOVAN_NOTE_NOI_BO));
  return c.json({ ok: true });
});

// 20/10/2026: Admin BH nhan ho Kho (hang da ve tay Admin - KTV giao truc tiep): bo qua Kho tiep nhan +
// tiep nhan noi bo. tu_xac_nhan_sl = true -> xac nhan luon SL = SL KTV khai.
adminBH.post("/phieu-gui/:id/nhan-ho-kho", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ghi_chu?: string; tu_xac_nhan_sl?: boolean }>().catch(() => ({}) as { ghi_chu?: string; tu_xac_nhan_sl?: boolean });
  const r = await nhanHoThung(c.env.DB, c.req.param("id"), user.email, {
    tuXacNhanSL: !!body.tu_xac_nhan_sl,
    ghiChu: "Admin BH nhận hộ Kho (hàng đã về tay Admin)" + (body.ghi_chu?.trim() ? " | " + body.ghi_chu.trim() : ""),
  });
  if ("error" in r) return c.json(r, r.error === "NOT_FOUND" ? 404 : 400);
  c.executionCtx.waitUntil(pushBoxDoneToKhovan(c.env, c.req.param("id"), "Admin bảo hành đã nhận trực tiếp thùng (KTV giao tận tay) — đã xử lý, Kho không cần nhận nữa"));
  return c.json(r);
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
  await addLog(c.env.DB, "phieu_gui", id, "da_tiep_nhan", "da_tiep_nhan", user.email, "Admin BH đẩy lại chưa tiếp nhận nội bộ (xác nhận nhầm trước đó)");
  return c.json({ ok: true });
});

// ---------- Bo loc bang thong nhat (09/10/2026) ----------
// "bo sung them cac filter de tim kiem va lap danh sach can xu ly: Trang thai, Nguoi gui, Linh kien
// gui, linh kien thuc sua, Loai linh kien, trang thai cham". Ap dung DONG THOI cho GET /don-cha (don
// cha cho xac nhan SL) va GET /don-vi (don vi can xu ly) de 2 phan cua bang thong nhat luon khop nhau.
//   tt   : cho_xac_nhan_so_luong (chi don cha) | cho_phan_loai | admin_can_xem_lai | cho_bo_sung_tt
//   ktv  : email nguoi gui (g.nguoi_tao) | __khach_le__
//   lk   : linh kien KTV gui (p.ma_lk)
//   lk_tt: linh kien thuc sua (COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk); don cha = p.ma_lk)
//   pl   : phan loai linh kien (linh_kien_bh.don_vi) | __none__
//   cham : qua_han | dung_han (SLA 24h bo Chu nhat; don cha tinh tu created_at, don vi tu updated_at)
//   mien : MB | MN | __none__ (chua khai bao) - loc them; ngoai ra luon gioi han theo mien cua nguoi xem.
function locBangThongNhat(c: { req: { query(k: string): string | undefined }; get(k: "user"): AppUser }, kind: "parent" | "unit", chiPhamVi = false): { sql: string; binds: unknown[] } {
  const q = (k: string) => (c.req.query(k) || "").trim();
  // 13/11/2026 (bang kieu Excel): moi o loc nhan nhieu gia tri "a,b,c" (tich chon tren tieu de cot); "__none__" = rong.
  const list = (k: string) => q(k).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  const parts: string[] = [];
  const binds: unknown[] = [];
  const ms = mienScope(c.get("user"), "p");
  if (ms.sql) {
    parts.push(ms.sql.replace(/^ AND /, ""));
    binds.push(...ms.binds);
  }
  if (chiPhamVi) return { sql: parts.length ? " AND " + parts.join(" AND ") : "", binds };
  // IN co ho tro "__none__" (rong / NULL).
  const inList = (expr: string, vals: string[], noneSql?: string) => {
    if (!vals.length) return;
    const real = vals.filter((v) => v !== "__none__");
    const ors: string[] = [];
    if (vals.includes("__none__")) ors.push(noneSql || `(${expr} IS NULL OR ${expr} = '')`);
    if (real.length) {
      ors.push(`${expr} IN (${real.map(() => "?").join(",")})`);
      binds.push(...real);
    }
    parts.push(ors.length > 1 ? `(${ors.join(" OR ")})` : ors[0]);
  };
  inList("p.mien", list("mien"), "p.mien IS NULL");
  const tt = list("tt");
  if (tt.length) {
    if (kind === "parent") {
      if (!tt.includes("cho_xac_nhan_so_luong")) parts.push("1 = 0");
    } else {
      const rest = tt.filter((v) => v !== "cho_xac_nhan_so_luong");
      if (!rest.length) parts.push("1 = 0");
      else inList("u.trang_thai", rest);
    }
  }
  const ktv = list("ktv");
  if (ktv.length) {
    const emails = ktv.filter((v) => v !== KHACH_LE_KEY && v !== "__none__");
    const ors: string[] = [];
    if (ktv.includes(KHACH_LE_KEY) || ktv.includes("__none__")) ors.push("p.phieu_gui_id IS NULL");
    if (emails.length) {
      ors.push(`g.nguoi_tao IN (${emails.map(() => "?").join(",")})`);
      binds.push(...emails);
    }
    parts.push(`(${ors.join(" OR ")})`);
  }
  inList("p.ma_lk", list("lk"));
  const effLk = kind === "unit" ? "COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)" : "p.ma_lk";
  const lkB = kind === "unit" ? "COALESCE(u.ma_lk_nhan, p.ma_lk)" : "p.ma_lk";
  inList(effLk, list("lk_tt"));
  inList(lkB, list("lk_nhan"));
  const pl = list("pl");
  if (pl.length) {
    const real = pl.filter((v) => v !== "__none__");
    const ors: string[] = [];
    if (pl.includes("__none__")) ors.push(`NOT EXISTS (SELECT 1 FROM linh_kien_bh l WHERE l.ma_lk = ${lkB} AND TRIM(COALESCE(l.don_vi,'')) <> '')`);
    if (real.length) {
      ors.push(`EXISTS (SELECT 1 FROM linh_kien_bh l WHERE l.ma_lk = ${lkB} AND TRIM(l.don_vi) IN (${real.map(() => "?").join(",")}))`);
      binds.push(...real);
    }
    parts.push(`(${ors.join(" OR ")})`);
  }
  const slaCol = kind === "unit" ? "u.updated_at" : "p.created_at";
  const cham = q("cham");
  if (cham === "qua_han" || cham === "dung_han") {
    parts.push(`${slaCol} ${cham === "qua_han" ? "<" : ">="} ?`);
    binds.push(slaCutoffVn(24));
  } else if (cham === "nguy_hiem") {
    parts.push(`${slaCol} < ?`);
    binds.push(slaCutoffVn(72));
  }
  const huong = list("huong");
  if (huong.length) {
    if (kind === "parent") parts.push("1 = 0");
    else inList("u.huong_xu_ly", huong, "u.huong_xu_ly IS NULL");
  }
  inList(kind === "unit" ? "COALESCE(u.loai_doi_tru, p.loai_doi_tru_de_xuat)" : "p.loai_doi_tru_de_xuat", list("doitru"));
  const tf = timeFilter(c as unknown as Context, "p.created_at");
  if (tf.sql) {
    parts.push(tf.sql.replace(/^ AND /, ""));
    binds.push(...tf.binds);
  }
  // Loc chu / so theo cot.
  const khachExpr = "COALESCE(p.ten_khach_hang, (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id))";
  const txt = textFilters(c as unknown as Context, {
    f_id: kind === "unit" ? "u.id" : "p.id",
    f_case: "p.case_id",
    f_mota: { expr: "p.mo_ta_loi", normExpr: "p.tim_kiem" },
    f_khach: { expr: khachExpr, normExpr: "p.tim_kiem" },
    f_sdt: "p.sdt_khach_hang",
    f_doncha: "p.id",
    f_gui: "p.phieu_gui_id",
  });
  if (txt.sql) {
    parts.push(txt.sql.replace(/^ AND /, ""));
    binds.push(...txt.binds);
  }
  const num = numFilters(c as unknown as Context, { sl: "p.so_luong_khai" });
  if (num.sql) {
    parts.push(num.sql.replace(/^ AND /, ""));
    binds.push(...num.binds);
  }
  // q: tim tu khoa (12/10/2026, de xuat #9) - ma don/case/phieu gui, mo ta loi, khach le, linh kien
  // (ma + ten), KTV (email + ten danh ba) va ca "bang chung case" da luu (ten khach, serial, san pham).
  const kw = q("q").toLowerCase();
  if (kw) {
    const like = `%${kw}%`;
    const cols = ["p.id", "p.case_id", "p.mo_ta_loi", "p.ten_khach_hang", "p.sdt_khach_hang", "p.ma_lk", "p.phieu_gui_id", "g.nguoi_tao"];
    const ors = cols.map((col) => `LOWER(COALESCE(${col}, '')) LIKE ?`);
    ors.push("EXISTS (SELECT 1 FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id AND LOWER(cs.data) LIKE ?)");
    ors.push("EXISTS (SELECT 1 FROM linh_kien_bh l WHERE l.ma_lk = p.ma_lk AND LOWER(l.ten_lk) LIKE ?)");
    // 31/10/2026: khop chuoi khong dau (ten khach / linh kien / serial go khong dau).
    ors.push("COALESCE(p.tim_kiem, '') LIKE ?");
    ors.push("EXISTS (SELECT 1 FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = g.nguoi_tao AND LOWER(COALESCE(k.ten_hien_thi, '')) LIKE ?)");
    if (kind === "unit") {
      ors.push("LOWER(u.id) LIKE ?");
      ors.push("EXISTS (SELECT 1 FROM linh_kien_bh l2 WHERE l2.ma_lk = u.ma_lk_thuc_te AND LOWER(l2.ten_lk) LIKE ?)");
    }
    parts.push(`(${ors.join(" OR ")})`);
    const iNorm = ors.indexOf("COALESCE(p.tim_kiem, '') LIKE ?");
    for (let i = 0; i < ors.length; i++) binds.push(i === iNorm ? `%${normVi(kw)}%` : like);
  }
  return { sql: parts.length ? " AND " + parts.join(" AND ") : "", binds };
}

// 13/11/2026 (bang kieu Excel): sap xep theo cot cua bang thong nhat - ?sort=<khoa cot>&dir=asc|desc (khoa = AdminColKey).
function sortBangThongNhat(c: Context, kind: "parent" | "unit"): { expr: string; dir: "ASC" | "DESC" } | null {
  const lkB = kind === "unit" ? "COALESCE(u.ma_lk_nhan, p.ma_lk)" : "p.ma_lk";
  return sortParam(c, {
    id: kind === "unit" ? "u.id" : "p.id",
    trangthai: kind === "unit" ? "u.trang_thai" : "'cho_xac_nhan_so_luong'",
    sla: kind === "unit" ? "u.updated_at" : "p.created_at",
    nguon: "COALESCE((SELECT us.ten FROM users us WHERE us.email = g.nguoi_tao), g.nguoi_tao, '')",
    mien: "COALESCE(p.mien, '')",
    khachhang: "COALESCE(p.ten_khach_hang, (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id), '')",
    linhkien: `COALESCE(${tenLkOf(lkB)}, ${lkB}, '')`,
    phanloai: `COALESCE((SELECT l.don_vi FROM linh_kien_bh l WHERE l.ma_lk = ${lkB}), '')`,
    mota: "COALESCE(p.mo_ta_loi, '')",
    sdt: "COALESCE(p.sdt_khach_hang, '')",
    donchacode: "p.id",
    phieuguicode: "COALESCE(p.phieu_gui_id, '')",
    doitru: kind === "unit" ? "COALESCE(u.loai_doi_tru, p.loai_doi_tru_de_xuat, '')" : "COALESCE(p.loai_doi_tru_de_xuat, '')",
    huongxuly: kind === "unit" ? "COALESCE(u.huong_xu_ly, '')" : "''",
    baohanh: "COALESCE((SELECT json_extract(cs.data, '$.ngay_mua') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id), '')",
    ngaytao: "p.created_at",
    sl: "p.so_luong_khai",
  });
}

// ---------- 2. Don cha cho xac nhan so luong thuc nhan ----------

adminBH.get("/don-cha", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const trangThai = c.req.query("trang_thai_cha") || "cho_xac_nhan_so_luong";
  const { limit, offset } = parsePage(c, 20, 1000);
  // them g.nguoi_tao AS ktv - can cho cot "Nguon" cua bang thong nhat (UI, xem AdminUnifiedTable.tsx)
  // hien dung email KTV thay vi chi case_id, khop dung renderAdminUnifiedTable() cua prototype.
  const loc = locBangThongNhat(c, "parent");
  const fromWhere = `FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE p.trang_thai_cha = ? AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${loc.sql}`;
  const sp = sortBangThongNhat(c as unknown as Context, "parent");
  const order = sp ? `${sp.expr} ${sp.dir}, p.id` : "p.created_at";
  const pv = locBangThongNhat(c, "parent", true);
  const [{ results }, totalRow, tongRow] = await Promise.all([
    c.env.DB.prepare(`SELECT p.*, g.nguoi_tao AS ktv, ${lanTruocSql("p", "p.ma_lk")} AS lan_truoc, (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_khach_hang, (SELECT json_extract(cs.data, '$.ngay_mua') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_ngay_mua, (SELECT json_extract(cs.data, '$.thoi_gian_cskh_tiep_nhan') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_tiep_nhan, (SELECT json_extract(cs.data, '$.seri_san_pham') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_serial, (SELECT json_extract(cs.data, '$.ngay_san_xuat') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_ngay_sx ${fromWhere} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(trangThai, ...loc.binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).bind(trangThai, ...loc.binds).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.trang_thai_cha = ? AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${pv.sql}`).bind(trangThai, ...pv.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ don_cha: results, total: totalRow?.cnt ?? 0, total_all: tongRow?.cnt ?? 0 });
});

interface XacNhanSoLuongBody {
  so_luong_thuc_nhan?: number;
  ly_do_chenh_lech_sl?: string;
}

// Tach don vi con - port dung submitSoLuongThucNhan(). Dung chung cho don le + hang loat.
async function xacNhanSoLuong(db: D1Database, id: string, body: XacNhanSoLuongBody, actor: string): Promise<{ error: string } | { ok: true; so_don_vi: number }> {
  const s = await db.prepare("SELECT so_luong_khai, trang_thai_cha FROM phieu_sua_chua_bh WHERE id = ?").bind(id).first<{ so_luong_khai: number; trang_thai_cha: string }>();
  if (!s) return { error: "NOT_FOUND" };
  if (s.trang_thai_cha !== "cho_xac_nhan_so_luong") return { error: "WRONG_STATE" };
  const sltn = body.so_luong_thuc_nhan ?? 0;
  if (!Number.isInteger(sltn) || sltn < 1) return { error: "INVALID_SO_LUONG" };
  let lyDo = "";
  if (sltn !== s.so_luong_khai) {
    if (!body.ly_do_chenh_lech_sl?.trim()) return { error: "REQUIRE_LY_DO_CHENH_LECH" };
    lyDo = body.ly_do_chenh_lech_sl.trim();
  }
  const now = nowVN();
  const statements = [db.prepare("UPDATE phieu_sua_chua_bh SET so_luong_thuc_nhan = ?, ly_do_chenh_lech_sl = ?, trang_thai_cha = 'da_tach' WHERE id = ? AND trang_thai_cha = 'cho_xac_nhan_so_luong'").bind(sltn, lyDo, id)];
  for (let i = 1; i <= sltn; i++) {
    statements.push(db.prepare("INSERT INTO phieu_sua_chua_bh_ct (id, parent_id, so_thu_tu, trang_thai, created_at, updated_at) VALUES (?, ?, ?, 'cho_phan_loai', ?, ?)").bind(`${id}-${i}`, id, i, now, now));
  }
  await db.batch(statements);
  await addLog(db, "phieu_sc", id, "cho_xac_nhan_so_luong", "da_tach", actor, `SL thực nhận = ${sltn}` + (lyDo ? ` | Lý do lệch: ${lyDo}` : ""));
  return { ok: true, so_don_vi: sltn };
}

adminBH.post("/don-cha/:id/xac-nhan-so-luong", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<XacNhanSoLuongBody>().catch(() => ({}) as XacNhanSoLuongBody);
  const r = await xacNhanSoLuong(c.env.DB, c.req.param("id"), body, c.get("user").email);
  if ("error" in r) return c.json(r, r.error === "NOT_FOUND" ? 404 : 400);
  return c.json(r);
});

// 09/10/2026: "Thieu chuc nang xu ly hang loat khi Admin bao hanh xac nhan sl linh kien thuc te, SL
// thuc nhan hien = sl gui... don nao sai thi moi sua, con lai xac nhan 1 nut la duyet tat ca don".
// Body {items:[{id, so_luong_thuc_nhan, ly_do_chenh_lech_sl?}]} - tung don xu ly doc lap, tra ve so
// don thanh cong + danh sach loi (don loi khong chan cac don khac).
adminBH.post("/don-cha/xac-nhan-so-luong-hang-loat", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ items?: (XacNhanSoLuongBody & { id?: string })[] }>().catch(() => ({}) as { items?: (XacNhanSoLuongBody & { id?: string })[] });
  const items = (body.items || []).filter((x) => x && typeof x.id === "string");
  if (items.length === 0) return c.json({ error: "EMPTY" }, 400);
  if (items.length > 200) return c.json({ error: "TOO_MANY" }, 400);
  const actor = c.get("user").email;
  let ok = 0;
  let soDonVi = 0;
  const loi: { id: string; error: string }[] = [];
  for (const it of items) {
    const r = await xacNhanSoLuong(c.env.DB, it.id!, it, actor);
    if ("error" in r) loi.push({ id: it.id!, error: r.error });
    else {
      ok++;
      soDonVi += r.so_don_vi;
    }
  }
  return c.json({ ok, so_don_vi: soDonVi, loi });
});

// ---------- 3. Bang thong nhat - don vi can xu ly ----------

// GET /don-vi?limit=&offset= - "bang thong nhat" (dong lon nhat, phan loai that o day) - xem
// lib/pagination.ts. Rieng GET /don-cha (thung cho xac nhan SL) khong lo dai vi bi gate lai truoc khi
// don qua duoc buoc nay - khong can pager rieng o frontend, chi can COUNT/LIMIT day du de an toan.
adminBH.get("/don-vi", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  // them g.nguoi_tao AS ktv - xem comment o GET /don-cha o tren (cung ly do).
  const loc = locBangThongNhat(c, "unit");
  const fromWhere = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai', 'cho_bo_sung_tt')
       AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${loc.sql}`;
  const B = loc.binds;
  const sp = sortBangThongNhat(c as unknown as Context, "unit");
  const pv = locBangThongNhat(c, "unit", true);
  const tongSql = `SELECT COUNT(DISTINCT u.parent_id) AS cnt, COUNT(*) AS units FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.trang_thai IN ('cho_phan_loai', 'admin_can_xem_lai', 'cho_bo_sung_tt') AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${pv.sql}`;
  const selectCols = `SELECT u.*, p.case_id, p.ma_lk, p.so_luong_khai, p.so_luong_thuc_nhan, p.mo_ta_loi, p.phieu_gui_id, p.nguon_tao, p.ten_khach_hang, p.sdt_khach_hang, p.san_pham_bh, p.loai_doi_tru_de_xuat, p.mien, p.case_xac_minh, p.case_xac_minh_loi, p.loai_ma, p.lada_tim_thay, ${lanTruocSql("p", "COALESCE(u.ma_lk_nhan, p.ma_lk)")} AS lan_truoc, g.nguoi_tao AS ktv, (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_khach_hang, (SELECT json_extract(cs.data, '$.ngay_mua') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_ngay_mua, (SELECT json_extract(cs.data, '$.thoi_gian_cskh_tiep_nhan') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_tiep_nhan, (SELECT json_extract(cs.data, '$.seri_san_pham') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_serial, (SELECT json_extract(cs.data, '$.ngay_san_xuat') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS case_ngay_sx, ${COT_HANG_DOI_TAC("p")}`;

  // 05/10/2026 ("Cac danh sach table dai phai phan trang, toi da 20 dong/trang"): ?group=1 -> phan
  // trang theo DON CHA (moi trang toi da `limit` don cha + du moi don vi cua chung) - bang thong nhat
  // van gop "xN" dung tren client ma khong phai lay het 1000 dong nhu truoc. total = so don cha (= so
  // dong thu gon tren bang), total_don_vi = tong so don vi.
  if (c.req.query("group") === "1") {
    const { limit, offset } = parsePage(c, 20, 100);
    // Sap xep nhom (don cha): tang = gia tri NHO nhat trong nhom, giam = LON nhat.
    const grpKey = sp ? `${sp.dir === "ASC" ? "MIN" : "MAX"}(${sp.expr})` : "MIN(u.updated_at)";
    const grpDir = sp ? sp.dir : "ASC";
    const [{ results: pids }, totalRow, tongRow] = await Promise.all([
      c.env.DB.prepare(`SELECT u.parent_id AS pid, ${grpKey} AS t ${fromWhere} GROUP BY u.parent_id ORDER BY t ${grpDir}, u.parent_id LIMIT ? OFFSET ?`).bind(...B, limit, offset).all<{ pid: string }>(),
      c.env.DB.prepare(`SELECT COUNT(DISTINCT u.parent_id) AS cnt, COUNT(*) AS units ${fromWhere}`).bind(...B).first<{ cnt: number; units: number }>(),
      c.env.DB.prepare(tongSql).bind(...pv.binds).first<{ cnt: number; units: number }>(),
    ]);
    const tong = { total_all: tongRow?.cnt ?? 0, total_all_don_vi: tongRow?.units ?? 0 };
    if (pids.length === 0) return c.json({ don_vi: [], total: totalRow?.cnt ?? 0, total_don_vi: totalRow?.units ?? 0, ...tong });
    const ph = pids.map(() => "?").join(",");
    // Giu dung thu tu nhom cua trang (theo pids), trong nhom sap theo cot dang chon.
    const pos = `CASE u.parent_id ${pids.map((_, i) => `WHEN ? THEN ${i}`).join(" ")} END`;
    const { results } = await c.env.DB.prepare(`${selectCols} ${fromWhere} AND u.parent_id IN (${ph}) ORDER BY ${pos}, ${sp ? `${sp.expr} ${sp.dir}, ` : ""}u.updated_at, u.id`)
      .bind(...B, ...pids.map((r) => r.pid), ...pids.map((r) => r.pid))
      .all();
    return c.json({ don_vi: results, total: totalRow?.cnt ?? 0, total_don_vi: totalRow?.units ?? 0, ...tong });
  }

  // 02/11/2026: che do xem nhom theo KTV / linh kien lay toi da 1000 don vi 1 lan.
  const { limit, offset } = parsePage(c, 20, 1000);
  const [{ results }, totalRow, tongRow] = await Promise.all([
    c.env.DB.prepare(`${selectCols} ${fromWhere} ORDER BY ${sp ? `${sp.expr} ${sp.dir}, u.id` : "u.updated_at"} LIMIT ? OFFSET ?`).bind(...B, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`).bind(...B).first<{ cnt: number }>(),
    c.env.DB.prepare(tongSql).bind(...pv.binds).first<{ cnt: number; units: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0, total_all: tongRow?.units ?? 0 });
});

// GET /don-vi/loc-options - gia tri cho cac o loc cua bang thong nhat: chi lay tu chinh hang doi dang
// can xu ly (don cha cho SL + don vi), khong liet ke het 6.000 linh kien / 500 KTV.
adminBH.get("/don-vi/loc-options", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const ms = mienScope(c.get("user"), "p");
  const mienSql = ms.binds.length ? ` AND (p.mien = '${ms.binds[0]}' OR p.mien IS NULL)` : "";
  // 14/11/2026 (toi uu D1): truoc day 6 cau SELECT DISTINCT, moi cau quet ~12k dong (dieu kien OR tren 2 bang khong
  // dung duoc index) -> ~29M rows_read/ngay. Gio: (1) loc truoc don cha bang 2 index (trang_thai_cha / u.trang_thai),
  // dieu kien goc van giu nguyen nen ket qua khong doi; (2) 1 cau duy nhat, moi o loc 1 json_group_array(DISTINCT ...).
  const QUEUE_DV = "'cho_phan_loai', 'admin_can_xem_lai', 'cho_bo_sung_tt'";
  const fromWhere = `FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id LEFT JOIN phieu_sua_chua_bh_ct u ON u.parent_id = p.id
     LEFT JOIN linh_kien_bh l ON l.ma_lk = COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)
     WHERE p.id IN (SELECT pp.id FROM phieu_sua_chua_bh pp WHERE pp.trang_thai_cha = 'cho_xac_nhan_so_luong'
                    UNION SELECT uu.parent_id FROM phieu_sua_chua_bh_ct uu WHERE uu.trang_thai IN (${QUEUE_DV}))
       AND (p.phieu_gui_id IS NULL OR g.admin_tiep_nhan = 1)${mienSql}
       AND (p.trang_thai_cha = 'cho_xac_nhan_so_luong' OR u.trang_thai IN (${QUEUE_DV}))`;
  const row = await c.env.DB.prepare(
    `SELECT json_group_array(DISTINCT COALESCE(g.nguoi_tao, '${KHACH_LE_KEY}')) AS ktv,
            json_group_array(DISTINCT p.ma_lk) AS lk,
            json_group_array(DISTINCT COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)) AS lk_tt,
            json_group_array(DISTINCT TRIM(COALESCE(l.don_vi,''))) AS pl,
            json_group_array(DISTINCT COALESCE(u.ma_lk_nhan, p.ma_lk)) AS lk_nhan,
            json_group_array(DISTINCT CASE WHEN u.id IS NOT NULL THEN COALESCE(u.huong_xu_ly, '') END) AS huong
     ${fromWhere}`,
  ).first<Record<"ktv" | "lk" | "lk_tt" | "pl" | "lk_nhan" | "huong", string>>();
  // NULL = gia tri cu bi loai bang "IS NOT NULL" / "u.id IS NOT NULL" -> bo.
  const ds = (k: "ktv" | "lk" | "lk_tt" | "pl" | "lk_nhan" | "huong") => (JSON.parse(row?.[k] || "[]") as (string | null)[]).filter((v): v is string => v !== null);
  const out = { ktv: ds("ktv"), lk: ds("lk"), lk_tt: ds("lk_tt"), phan_loai: ds("pl"), lk_nhan: ds("lk_nhan"), huong: ds("huong") };
  // 13/11/2026: them dang {loc} cho bo loc tieu de cot (useListFilters) - khoa = ten tham so loc.
  return c.json({ ...out, loc: { ktv: out.ktv, lk: out.lk, lk_tt: out.lk_tt, lk_nhan: out.lk_nhan, pl: out.phan_loai, huong: out.huong } });
});

// Chi tiet 1 don vi (dung cho modal chi tiet + 4 khoi log rieng biet).
adminBH.get("/don-vi/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  const uRow = u as { parent_id: string; nguoi_sua_chua: string | null };
  const p = await c.env.DB.prepare("SELECT * FROM phieu_sua_chua_bh WHERE id = ?").bind(uRow.parent_id).first<{ phieu_gui_id: string | null; ma_lk: string | null; loai_doi_tru_de_xuat: string | null }>();
  // 06/11/2026: Kho / Ke toan cung xem duoc chi tiet don (mo tu Cap linh kien / Phieu tra) - chi xem, nut thao tac van theo vai tro.
  let allowed = user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view || user.la_kho || user.la_ke_toan || uRow.nguoi_sua_chua === user.email;
  // 08/11/2026 - "danh sách đơn bảo hành trong phiếu, cho phép người dùng click vào để mở UI chi tiết": KTV so huu / tao ho
  // thung chua don, hoac KTV nhan phieu tra chua don vi, cung xem duoc (chi xem; bao cao sai / thu hoi van an).
  let laKtvXem = false;
  if (!allowed) {
    const own = await c.env.DB.prepare(
      `SELECT 1 AS ok FROM phieu_gui_bh g WHERE g.id = ? AND (LOWER(g.nguoi_tao) = LOWER(?) OR LOWER(COALESCE(g.nguoi_tao_ho, '')) = LOWER(?))
       UNION ALL SELECT 1 FROM phieu_tra_bh t WHERE t.id = ? AND LOWER(t.ktv_nhan) = LOWER(?) LIMIT 1`,
    ).bind(p?.phieu_gui_id ?? "", user.email, user.email, (u as { phieu_tra_id: string | null }).phieu_tra_id ?? "", user.email).first();
    allowed = laKtvXem = !!own;
  }
  if (!allowed) return c.json({ error: "FORBIDDEN" }, 403);

  // Ghep them 2 truong cua don cha (ma_lk/loai_doi_tru_de_xuat) truc tiep vao don_vi tra ve - de
  // PhanLoaiModal.tsx (frontend) doc duoc gia tri mac dinh (linh kien goc/de xuat doi tru cua KTV) ma
  // KHONG can 1 prop "parent" rieng khi mo tu chinh modal chi tiet nay (dong bo voi cach bang thong
  // nhat AdminUnifiedTable.tsx da co san 2 truong nay qua JOIN cua GET /don-vi).
  if (p) Object.assign(u, { ma_lk: p.ma_lk, loai_doi_tru_de_xuat: p.loai_doi_tru_de_xuat, phieu_gui_id: p.phieu_gui_id });
  // 16/11/2026 (v1.142): Hang / Doi tac hieu luc (Admin chot > CRM) + loai de xuat cap linh kien sua chua tuong ung.
  const hdt = await c.env.DB.prepare(`SELECT ${COT_HANG_DOI_TAC("p")}, p.hang AS hang_chot, p.doi_tac_id AS doi_tac_chot FROM phieu_sua_chua_bh p WHERE p.id = ?`)
    .bind(uRow.parent_id).first<{ hang: string | null; doi_tac_id: number | null; doi_tac: string | null; doi_tac_karofi: number | null; hang_chot: string | null; doi_tac_chot: number | null }>();
  if (hdt) Object.assign(u, { ...hdt, ldx_sua_chua: loaiDeXuatSuaChua((u as { loai_bao_hanh: string | null }).loai_bao_hanh, hdt.doi_tac_karofi) });

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

  // 10/10/2026 (thiet ke lai UI chi tiet): KTV so huu thung + cac don vi cung don cha (lo xN) de hien
  // "don vi k/N" va trang thai cac don vi con lai ngay trong chi tiet.
  const [guiRow, anhEm] = await Promise.all([
    p?.phieu_gui_id ? c.env.DB.prepare("SELECT nguoi_tao, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(p.phieu_gui_id).first<{ nguoi_tao: string; trang_thai: string }>() : Promise.resolve(null),
    c.env.DB.prepare("SELECT id, so_thu_tu, trang_thai FROM phieu_sua_chua_bh_ct WHERE parent_id = ? ORDER BY so_thu_tu").bind(uRow.parent_id).all(),
  ]);
  if (p && guiRow) Object.assign(p, { ktv: guiRow.nguoi_tao, phieu_gui_trang_thai: guiRow.trang_thai });

  // 11/10/2026 - UI chi tiet "tat ca trong mot": tom tat chung tu lien ket (xem nhanh tai cho, khong goi
  // them API khi bam), thong tin KTV (danh ba), don Odoo + lan bao dvbh, trao doi cua phieu gui.
  const pFull = p as { phieu_gui_id: string | null; odoo_id: number | null; email_gs: string | null } | null;
  const canGhiChu = user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view || user.la_kho || user.la_nv_sua_chua || laKtvXem;
  const [phieuGui, phieuTra, odoo, ktvInfo, ghiChu] = await Promise.all([
    pFull?.phieu_gui_id
      ? c.env.DB.prepare(
          `SELECT g.id, g.nguoi_tao, g.nguoi_tao_ho, g.trang_thai, g.ngay_gui_xe, g.hinh_thuc_gui, g.ma_xe_hoac_tai_xe, g.don_vi_van_chuyen,
                  g.ma_van_don, g.su_co_tiep_nhan, g.su_co_ly_do, g.nguoi_nhan_kho, g.thoi_gian_nhan_kho, g.admin_tiep_nhan,
                  g.admin_nguoi_nhan, g.admin_thoi_gian_nhan, g.created_at,
                  (SELECT COUNT(*) FROM phieu_sua_chua_bh x WHERE x.phieu_gui_id = g.id) AS so_don,
                  (SELECT MIN(l.thoi_gian) FROM logs_bh l WHERE l.entity_type = 'phieu_gui' AND l.entity_id = g.id AND l.den_trang_thai = 'da_gui') AS thoi_gian_gui
           FROM phieu_gui_bh g WHERE g.id = ?`,
        ).bind(pFull.phieu_gui_id).first()
      : Promise.resolve(null),
    uFull.phieu_tra_id
      ? c.env.DB.prepare(
          `SELECT t.id, t.ktv_nhan, t.trang_thai, t.loai_doi_tru, t.ma_don_hang, t.ma_misa, t.ma_van_don, t.created_at, t.updated_at,
                  (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct x WHERE x.phieu_tra_id = t.id) AS so_don_vi
           FROM phieu_tra_bh t WHERE t.id = ?`,
        ).bind(uFull.phieu_tra_id).first()
      : Promise.resolve(null),
    pFull?.odoo_id
      ? c.env.DB.prepare(
          `SELECT o.odoo_id, o.ma_don, o.trang_thai, o.tinh_trang_loi, o.ngay_tao, o.ten_linh_kien, s.last_status, s.last_sent_at, s.last_error
           FROM don_bh_odoo o LEFT JOIN odoo_status_sync s ON s.odoo_id = o.odoo_id WHERE o.odoo_id = ?`,
        ).bind(pFull.odoo_id).first()
      : Promise.resolve(null),
    guiRow
      ? c.env.DB.prepare("SELECT ma_ktv, ten_hien_thi, sdt, khu_vuc_ma, vai_tro_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ? LIMIT 1").bind(guiRow.nguoi_tao).first()
      : Promise.resolve(null),
    pFull?.phieu_gui_id && canGhiChu
      ? c.env.DB.prepare("SELECT * FROM phieu_gui_bh_ghi_chu WHERE phieu_gui_id = ? ORDER BY thoi_gian DESC").bind(pFull.phieu_gui_id).all()
      : Promise.resolve({ results: [] }),
  ]);

  // 01/11/2026: 1 Khu vuc co nhieu GS - hien du danh sach GS cua Khu vuc chua KTV.
  const gsList = guiRow ? await gsListOfKtv(c.env.DB, guiRow.nguoi_tao) : [];
  return c.json({
    don_vi: u,
    don_cha: p,
    anh_em: anhEm.results,
    logs: { don_vi: ctLogs.results, don_cha: pLogs.results, phieu_gui: guiLogs, phieu_tra: traLogs },
    anh: { don_vi: ctAnh.results, don_cha: pAnh.results },
    bao_cao_sai_thong_tin: baoCaoSai.results,
    lien_ket: { phieu_gui: phieuGui, phieu_tra: phieuTra, odoo },
    ktv_info: ktvInfo ? { ...ktvInfo, email_gs: pFull?.email_gs ?? null, gs_list: gsList } : pFull?.email_gs ? { email_gs: pFull.email_gs, gs_list: gsList } : null,
    ghi_chu: ghiChu.results,
    co_the_trao_doi: !!pFull?.phieu_gui_id && (canGhiChu || uRow.nguoi_sua_chua === user.email),
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
  ghi_chu_huy?: string; // 09/11/2026 - ghi chu tuy chon khi huy
  ma_lk_thuc_te?: string | null; // C - linh kien doi moi / thay the (NULL = giong B)
  ma_lk_nhan?: string | null; // B - linh kien thuc te gui ve, Admin xac nhan (NULL = giong A cua don cha)
  ly_do_cham?: string;
  // 05/10/2026: "Khi chon doi moi nhanh, se hien 1 lua chon phuong an xu ly voi xac => admin chon 1 lan
  // cho tat ca cac don xu ly" - huong doi_moi BAT BUOC chon xu ly xac ngay luc phan loai (don le, hang
  // loat, FAST), khong doi toi luc xac nhan hoan tat moi hoi.
  xu_ly_xac?: string;
  // 16/11/2026 (v1.142): Hang + Doi tac cua don cha - BAT BUOC du khi day sang NV sua chua (huong HUONG_CAN_NV); khong gui = giu gia tri hien
  // tai (Admin da chot hoac theo CRM). Doi tac la id danh muc doi_tac_bh.
  hang?: string | null;
  doi_tac_id?: number | null;
}

// Hang / Doi tac hieu luc cua don cha (Admin chot > CRM) - lib/doiTac.ts.
async function hangDoiTacCha(db: D1Database, parentId: string): Promise<{ hang: string | null; doi_tac_id: number | null; doi_tac: string | null; la_karofi: number | null }> {
  const r = await db.prepare(`SELECT ${HANG_SQL("p")} AS hang, ${DOI_TAC_ID_SQL("p")} AS doi_tac_id FROM phieu_sua_chua_bh p WHERE p.id = ?`).bind(parentId)
    .first<{ hang: string | null; doi_tac_id: number | null }>();
  const dt = r?.doi_tac_id ? await db.prepare("SELECT ten, la_karofi FROM doi_tac_bh WHERE id = ?").bind(r.doi_tac_id).first<{ ten: string; la_karofi: number }>() : null;
  return { hang: r?.hang ?? null, doi_tac_id: dt ? r!.doi_tac_id : null, doi_tac: dt?.ten ?? null, la_karofi: dt?.la_karofi ?? null };
}

// Ghi Hang / Doi tac Admin chon vao don cha (chi khi doi). Tra mo ta thay doi cho nhat ky ("" = khong doi) hoac loi.
async function chotHangDoiTac(db: D1Database, parentId: string, hangMoi: string | null | undefined, doiTacMoi: number | null | undefined, batBuoc: boolean): Promise<{ error: string } | { ghi: string; laKarofi: number | null; doiTac: string | null }> {
  const cu = await hangDoiTacCha(db, parentId);
  const hang = hangMoi === undefined ? cu.hang : (hangMoi ?? "").trim().slice(0, 100) || null;
  let doiTacId = doiTacMoi === undefined ? cu.doi_tac_id : doiTacMoi;
  let ten = cu.doi_tac;
  let laKarofi = cu.la_karofi;
  if (doiTacMoi !== undefined && doiTacMoi !== null) {
    const dt = await db.prepare("SELECT id, ten, la_karofi FROM doi_tac_bh WHERE id = ?").bind(doiTacMoi).first<{ id: number; ten: string; la_karofi: number }>();
    if (!dt) return { error: "DOI_TAC_KHONG_CO" };
    doiTacId = dt.id;
    ten = dt.ten;
    laKarofi = dt.la_karofi;
  } else if (doiTacMoi === null) {
    doiTacId = null;
    ten = null;
    laKarofi = null;
  }
  if (batBuoc && (!hang || !doiTacId)) return { error: "REQUIRE_HANG_DOI_TAC" };
  const p = await db.prepare("SELECT hang, doi_tac_id FROM phieu_sua_chua_bh WHERE id = ?").bind(parentId).first<{ hang: string | null; doi_tac_id: number | null }>();
  if (p?.hang === hang && p?.doi_tac_id === doiTacId) return { ghi: "", laKarofi, doiTac: ten };
  await db.prepare("UPDATE phieu_sua_chua_bh SET hang = ?, doi_tac_id = ? WHERE id = ?").bind(hang, doiTacId, parentId).run();
  const doi: string[] = [];
  if (hang !== cu.hang) doi.push(`Hãng: ${cu.hang || "—"} → ${hang || "—"}`);
  if (doiTacId !== cu.doi_tac_id) doi.push(`Đối tác: ${cu.doi_tac || "—"} → ${ten || "—"}`);
  return { ghi: doi.length ? doi.join(" · ") : `Hãng ${hang || "—"} · Đối tác ${ten || "—"}`, laKarofi, doiTac: ten };
}

const XU_LY_XAC_VALUES = ["tra_doi_tac", "tieu_huy", "luu_kho"];

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
  if (body.huong_xu_ly === "doi_moi" && !XU_LY_XAC_VALUES.includes(body.xu_ly_xac || "")) return { error: "REQUIRE_XU_LY_XAC" };
  if ((await quaHanBuoc(db, unit.trang_thai, unit.updated_at)) && !body.ly_do_cham?.trim()) return { error: "REQUIRE_LY_DO_CHAM" };
  // 16/11/2026 (v1.142): "khi đẩy 1 đơn sang nv sửa chữa, bắt buộc phải chọn đủ Hãng, Đối tác, còn bảo hành/hết bảo hành" (con / het bao hanh =
  // loai_bao_hanh, da bat buoc o tren). Huong khac: chi ghi neu Admin co gui.
  const canNv = HUONG_CAN_NV.includes(body.huong_xu_ly);
  let ghiHdt = "";
  let ldxSc: string | null = null;
  if (canNv || body.hang !== undefined || body.doi_tac_id !== undefined) {
    const pid = (await db.prepare("SELECT parent_id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unit.id).first<{ parent_id: string }>())?.parent_id;
    if (pid) {
      const kq = await chotHangDoiTac(db, pid, body.hang, body.doi_tac_id, canNv);
      if ("error" in kq) return kq;
      ghiHdt = kq.ghi;
      if (canNv) ldxSc = loaiDeXuatSuaChua(body.loai_bao_hanh, kq.laKarofi);
    }
  }

  let trangThaiMoi = unit.trang_thai;
  if (HUONG_CAN_NV.includes(body.huong_xu_ly)) trangThaiMoi = "cho_chan_doan";
  else if (HUONG_TAO_PHIEU_TRA.includes(body.huong_xu_ly)) trangThaiMoi = "san_sang_gom_phieu_tra";
  else if (body.huong_xu_ly === "tu_choi") trangThaiMoi = "ket_thuc_tu_choi";
  else if (body.huong_xu_ly === "chuyen_kho") trangThaiMoi = "ket_thuc_chuyen_kho";

  await db
    .prepare(
      `UPDATE phieu_sua_chua_bh_ct SET
         loai_bao_hanh = ?, thong_tin_mail_pd = ?, ma_phe_duyet = ?, huong_xu_ly = ?, loai_doi_tru = ?,
         nguoi_sua_chua = ?, ly_do_tu_choi = ?, ghi_chu_huy = ?, ma_lk_thuc_te = CASE WHEN ? IS NULL THEN ma_lk_thuc_te ELSE NULLIF(?, '') END, ma_lk_nhan = CASE WHEN ? IS NULL THEN ma_lk_nhan ELSE NULLIF(?, '') END, xu_ly_xac = ?, trang_thai = ?, updated_at = ?
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
      body.huong_xu_ly === "tu_choi" ? body.ghi_chu_huy?.trim().slice(0, 2000) || null : null,
      // undefined/null = giu nguyen, "" = bo (ve mac dinh).
      body.ma_lk_thuc_te ?? null,
      body.ma_lk_thuc_te ?? null,
      body.ma_lk_nhan ?? null,
      body.ma_lk_nhan ?? null,
      body.huong_xu_ly === "doi_moi" ? body.xu_ly_xac : null,
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
    `Admin BH phân loại: ${LBL[body.loai_bao_hanh] || body.loai_bao_hanh} / ${LBL[body.huong_xu_ly] || body.huong_xu_ly} / Đối trừ: ${LBL[body.loai_doi_tru] || body.loai_doi_tru}` +
      (body.huong_xu_ly === "tu_choi" ? ` | Lý do huỷ: ${body.ly_do_tu_choi}` + (body.ghi_chu_huy?.trim() ? ` | Ghi chú: ${body.ghi_chu_huy.trim().slice(0, 2000)}` : "") : "") +
      (body.huong_xu_ly === "doi_moi" ? ` | Xử lý xác: ${LBL[body.xu_ly_xac ?? ""] || body.xu_ly_xac}` : "") +
      (body.ma_lk_nhan ? ` | LK thực tế gửi về: ${body.ma_lk_nhan}` : "") +
      (body.ma_lk_thuc_te ? ` | LK đổi mới: ${body.ma_lk_thuc_te}` : "") +
      (body.ly_do_cham ? ` | Lý do chậm: ${body.ly_do_cham}` : "") +
      (ghiHdt ? ` | ${ghiHdt}` : "") +
      (ldxSc ? ` | Cấp linh kiện sửa chữa: ${ldxSc}` : ""),
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

// POST /don-vi/:id/thong-tin-bh {hang?, doi_tac_id?, loai_bao_hanh?} (16/11/2026, v1.142 - "admin BH có thể sửa lại nếu chưa chính xác"): sua
// Hang / Doi tac (don cha) + con / het bao hanh (don vi) bat ky luc nao don chua ket thuc. Don dang o NV sua chua thi khong de trong duoc.
adminBH.post("/don-vi/:id/thong-tin-bh", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const u = await c.env.DB.prepare("SELECT id, parent_id, trang_thai, loai_bao_hanh, huong_xu_ly FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(c.req.param("id"))
    .first<{ id: string; parent_id: string; trang_thai: string; loai_bao_hanh: string | null; huong_xu_ly: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.trang_thai.startsWith("ket_thuc")) return c.json({ error: "WRONG_STATE" }, 400);
  const b = await c.req.json<{ hang?: string | null; doi_tac_id?: number | null; loai_bao_hanh?: string }>().catch(() => ({}) as { hang?: string | null; doi_tac_id?: number | null; loai_bao_hanh?: string });
  if (b.loai_bao_hanh !== undefined && !["trong_bh", "ngoai_bh"].includes(b.loai_bao_hanh)) return c.json({ error: "INVALID_LOAI_BAO_HANH" }, 400);
  const canNv = u.trang_thai === "cho_chan_doan" && HUONG_CAN_NV.includes(u.huong_xu_ly as HuongXuLy);
  const kq = await chotHangDoiTac(c.env.DB, u.parent_id, b.hang, b.doi_tac_id, canNv);
  if ("error" in kq) return c.json(kq, 400);
  const doiBh = b.loai_bao_hanh !== undefined && b.loai_bao_hanh !== u.loai_bao_hanh;
  if (doiBh) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET loai_bao_hanh = ?, updated_at = updated_at WHERE id = ?").bind(b.loai_bao_hanh, u.id).run();
  const ghi = [kq.ghi, doiBh ? `Bảo hành: ${LBL[u.loai_bao_hanh ?? ""] || "—"} → ${LBL[b.loai_bao_hanh!]}` : ""].filter(Boolean).join(" · ");
  if (ghi) {
    const ldx = loaiDeXuatSuaChua(doiBh ? b.loai_bao_hanh : u.loai_bao_hanh, kq.laKarofi);
    await addLog(c.env.DB, "phieu_sc_ct", u.id, u.trang_thai, u.trang_thai, user.email, `Sửa thông tin đơn bảo hành: ${ghi}${canNv && ldx ? ` | Cấp linh kiện sửa chữa: ${ldx}` : ""}`);
  }
  return c.json({ ok: true, doi: !!ghi });
});

adminBH.post("/don-vi/phan-loai-hang-loat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<PhanLoaiBody & { ids?: string[] }>().catch(() => ({}) as PhanLoaiBody & { ids?: string[] });
  const ids = body.ids || [];
  if (ids.length === 0) return c.json({ error: "NO_IDS" }, 400);
  const errors: Record<string, string> = {};
  let applied = 0;
  // 05/10/2026 (ra soat Admin BH): loai_doi_tru="theo_de_xuat" -> moi don vi lay dung de xuat cua KTV
  // (giong nut FAST) thay vi ep 1 gia tri chung; huong tao phieu tra -> tu gop vao phieu "Nhap" dung
  // KTV + loai doi tru (giong FAST), khong de don nam cho "Tu dong gop".
  const theoDeXuat = (body.loai_doi_tru as string) === "theo_de_xuat";
  for (const id of ids) {
    const unit = await c.env.DB.prepare("SELECT id, parent_id, trang_thai, updated_at FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<UnitRow & { parent_id: string }>();
    if (!unit || !["cho_phan_loai", "admin_can_xem_lai"].includes(unit.trang_thai)) {
      errors[id] = "WRONG_STATE";
      continue;
    }
    const loaiDoiTru = theoDeXuat ? await defaultLoaiDoiTru(c.env.DB, unit.parent_id) : (body.loai_doi_tru as LoaiDoiTru);
    const result = await applyPhanLoaiToUnit(c.env.DB, unit, { ...body, loai_doi_tru: loaiDoiTru }, user.email);
    if ("error" in result) {
      errors[id] = result.error;
      continue;
    }
    applied++;
    if (body.huong_xu_ly && HUONG_TAO_PHIEU_TRA.includes(body.huong_xu_ly)) {
      const ktvKey = await ktvKeyOfUnit(c.env.DB, unit.parent_id);
      await attachToOrCreatePhieuTra(c.env.DB, unit.id, ktvKey, loaiDoiTru, user.email);
    }
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
  for (const ch of children) await addLog(c.env.DB, "phieu_sc_ct", ch.id, "cho_phan_loai", "cho_bo_sung_tt", user.email, "Admin BH yêu cầu bổ sung: " + (LBL[body.ly_do] || body.ly_do) + (body.ghi_chu?.trim() ? " — " + body.ghi_chu.trim() : ""));
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

// 21/10/2026: menu rieng "KTV đang sửa" - cac don vi dang cho NV sua chua xu ly (cho_chan_doan).
// Loc theo NV (?nv=email | __chua_gan__), tim q; kem so de xuat linh kien cho cap / da cap.
adminBH.get("/dang-sua", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const ms0 = mienScope(c.get("user"), "p");
  const kw = kwClause(c.req.query("q"), ["u.id", "p.id", "p.case_id", "p.ma_lk", "u.ma_lk_thuc_te", "u.ma_lk_nhan", "p.mo_ta_loi", "p.phieu_gui_id", "p.ten_khach_hang", tenLkOf("COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)"),
    "u.nguoi_sua_chua", tenOf("u.nguoi_sua_chua"), "g.nguoi_tao", tenOf("g.nguoi_tao"), "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)"], ["p.tim_kiem"]);
  let nvSql = "";
  const nvBinds: string[] = [];
  const nv = c.req.query("nv");
  if (nv === "__chua_gan__") nvSql = " AND (u.nguoi_sua_chua IS NULL OR u.nguoi_sua_chua = '')";
  else if (nv) {
    nvSql = " AND u.nguoi_sua_chua = ?";
    nvBinds.push(nv);
  }
  const LOC = { ktv: "g.nguoi_tao", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)", huong_xu_ly: "u.huong_xu_ly", loai_bao_hanh: "u.loai_bao_hanh", mien: "p.mien" };
  const baseFw = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
    WHERE u.trang_thai = 'cho_chan_doan'${ms0.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, baseFw, ms0.binds) });
  // 16/11/2026 (loc kieu Excel tren tieu de cot): them loc chu ma don + sap xep theo cot.
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "p.created_at"), slaFilter(c, "u.updated_at"), textFilters(c, { f_id: "u.id", f_mota: { expr: "p.mo_ta_loi", normExpr: "p.tim_kiem" } }));
  const spDs = sortParam(c, { id: "u.id", lk: `COALESCE(${tenLkOf("COALESCE(u.ma_lk_nhan, p.ma_lk)")}, p.ma_lk, '')`, huong: "COALESCE(u.huong_xu_ly,'')", sla: "u.updated_at", mota: "COALESCE(p.mo_ta_loi,'')", tao: "p.created_at", nv: "COALESCE((SELECT us.ten FROM users us WHERE us.email = u.nguoi_sua_chua), u.nguoi_sua_chua, '')", ktv: "COALESCE((SELECT us.ten FROM users us WHERE us.email = g.nguoi_tao), g.nguoi_tao, '')", mien: "COALESCE(p.mien,'')" });
  const binds = [...ms0.binds, ...kw.binds, ...nvBinds, ...f.binds];
  const fw = `${baseFw}${kw.sql}${nvSql}${f.sql}`;
  const [{ results }, totalRow, nvRows] = await Promise.all([
    c.env.DB.prepare(`SELECT u.*, p.mien, p.ma_lk, p.mo_ta_loi, p.case_id, p.phieu_gui_id, p.ten_khach_hang, g.nguoi_tao AS ktv,
      (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai IN ('cho_cap', 'cho_ke_toan')) AS dx_cho_cap,
      (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai = 'da_cap') AS dx_da_cap
      ${fw} ORDER BY ${spDs ? `${spDs.expr} ${spDs.dir}, u.id` : "u.updated_at"} LIMIT ? OFFSET ?`).bind(...binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fw}`).bind(...binds).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT u.nguoi_sua_chua AS nv, COUNT(*) AS n FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
      WHERE u.trang_thai = 'cho_chan_doan'${ms0.sql} GROUP BY u.nguoi_sua_chua ORDER BY n DESC`).bind(...ms0.binds).all<{ nv: string | null; n: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0, theo_nv: nvRows.results });
});

adminBH.get("/xac-nhan", async (c) => {
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const ms0 = mienScope(c.get("user"), "p");
  const kw = kwClause(c.req.query("q"), ["u.id", "p.id", "p.case_id", "p.ma_lk", "u.ma_lk_thuc_te", "u.ma_lk_nhan", "p.mo_ta_loi", "p.phieu_gui_id", "p.ten_khach_hang", tenLkOf("COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)"),
    "(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)", tenOf("(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)"),
    "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)"], ["p.tim_kiem"]);
  // 21/10/2026: loc NV / KTV gui / huong xu ly / ket qua NV / linh kien.
  const LOC = { nv: "u.nguoi_sua_chua", ktv: "(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)", huong_xu_ly: "u.huong_xu_ly", ket_qua: "u.ket_qua_nv", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)", mien: "p.mien" };
  const baseXn = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'cho_admin_xac_nhan'${ms0.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, baseXn, ms0.binds) });
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "p.created_at"), slaFilter(c, "u.updated_at"), textFilters(c, { f_id: "u.id", f_gc: { expr: "u.ghi_chu_nv" } }));
  const spXn = sortParam(c, { id: "u.id", lk: `COALESCE(${tenLkOf("COALESCE(u.ma_lk_nhan, p.ma_lk)")}, p.ma_lk, '')`, huong: "COALESCE(u.huong_xu_ly,'')", sla: "u.updated_at", mota: "COALESCE(p.mo_ta_loi,'')", tao: "p.created_at", nv: "COALESCE((SELECT us.ten FROM users us WHERE us.email = u.nguoi_sua_chua), u.nguoi_sua_chua, '')", kq: "COALESCE(u.ket_qua_nv,'')" });
  const ms = { sql: ms0.sql + kw.sql + f.sql, binds: [...ms0.binds, ...kw.binds, ...f.binds] };
  const fw = `FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'cho_admin_xac_nhan'${ms.sql}`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT u.*, p.mien ${fw} ORDER BY ${spXn ? `${spXn.expr} ${spXn.dir}, u.id` : "u.updated_at"} LIMIT ? OFFSET ?`).bind(...ms.binds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fw}`).bind(...ms.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

// Xac nhan hoan tat 1 don vi - dung chung cho don le + hang loat (12/10/2026, de xuat #12).
async function xacNhanHoanTat(db: D1Database, id: string, body: { ly_do_cham?: string; xu_ly_xac?: string }, actor: string, giuXacCu = false): Promise<{ error: string } | { ok: true }> {
  const u = await db.prepare("SELECT trang_thai, updated_at, huong_xu_ly, xu_ly_xac FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string; huong_xu_ly: string; xu_ly_xac: string | null }>();
  if (!u) return { error: "NOT_FOUND" };
  if (u.trang_thai !== "cho_admin_xac_nhan") return { error: "WRONG_STATE" };
  // Huong "doi_moi" BAT BUOC co cach xu ly xac truoc khi hoan tat - neu da chon luc phan loai
  // (05/10/2026) thi khong hoi lai; gui gia tri moi hop le thi ghi de (chi ap cho don doi_moi).
  if (body.xu_ly_xac && !XU_LY_XAC_VALUES.includes(body.xu_ly_xac)) return { error: "REQUIRE_XU_LY_XAC" };
  if (u.huong_xu_ly === "doi_moi" && !u.xu_ly_xac && !body.xu_ly_xac) return { error: "REQUIRE_XU_LY_XAC" };
  if ((await quaHanBuoc(db, "cho_admin_xac_nhan", u.updated_at)) && !body.ly_do_cham?.trim()) return { error: "REQUIRE_LY_DO_CHAM" };
  // Hang loat (giuXacCu): chi dien xu ly xac cho don Doi moi CHUA co, khong ghi de lua chon da chot.
  const xlx = u.huong_xu_ly === "doi_moi" && !(giuXacCu && u.xu_ly_xac) ? body.xu_ly_xac || null : null;
  const now = nowVN();
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET admin_xac_nhan_hoan_tat = 1, xu_ly_xac = COALESCE(?, xu_ly_xac), trang_thai = 'san_sang_gom_phieu_tra', updated_at = ? WHERE id = ?")
    .bind(xlx, now, id)
    .run();
  await addLog(
    db,
    "phieu_sc_ct",
    id,
    "cho_admin_xac_nhan",
    "san_sang_gom_phieu_tra",
    actor,
    "Admin BH xác nhận hoàn tất" + (xlx ? ` + xử lý xác: ${LBL[xlx] || xlx}` : "") + (body.ly_do_cham ? ` | Lý do chậm: ${body.ly_do_cham}` : ""),
  );
  return { ok: true };
}

adminBH.post("/don-vi/xac-nhan-hoan-tat-hang-loat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; ly_do_cham?: string; xu_ly_xac?: string }>().catch(() => ({}) as { ids?: string[]; ly_do_cham?: string; xu_ly_xac?: string });
  const ids = [...new Set((body.ids || []).filter((x) => typeof x === "string"))].slice(0, 200);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const r = await xacNhanHoanTat(c.env.DB, id, body, user.email, true);
    if ("error" in r) loi.push({ id, error: r.error });
    else ok++;
  }
  return c.json({ ok, loi });
});

adminBH.post("/don-vi/:id/xac-nhan-hoan-tat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ly_do_cham?: string; xu_ly_xac?: string }>().catch(() => ({}) as { ly_do_cham?: string; xu_ly_xac?: string });
  const r = await xacNhanHoanTat(c.env.DB, c.req.param("id"), body, user.email);
  if ("error" in r) return c.json(r, r.error === "NOT_FOUND" ? 404 : 400);
  return c.json({ ok: true });
});

// Thu hoi chi phi bao hanh tu hang (12/10/2026): ghi nhan thu cong so tien da thu duoc (khong bat
// buoc), sua duoc o moi trang thai. Admin BH / Ke toan / qtri.
// 20/10/2026: doi xu ly xac sau khi da phan loai (FAST Doi moi mac dinh "tra doi tac").
adminBH.patch("/don-vi/:id/xu-ly-xac", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const body = await c.req.json<{ xu_ly_xac?: string }>().catch(() => ({}) as { xu_ly_xac?: string });
  if (!XU_LY_XAC_VALUES.includes(body.xu_ly_xac || "")) return c.json({ error: "REQUIRE_XU_LY_XAC" }, 400);
  const u = await c.env.DB.prepare("SELECT trang_thai, huong_xu_ly, xu_ly_xac, thung_xac_id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string; huong_xu_ly: string | null; xu_ly_xac: string | null; thung_xac_id: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.huong_xu_ly !== "doi_moi") return c.json({ error: "WRONG_STATE" }, 400);
  // 13/11/2026: xac da vao thung tra xac -> bo khoi thung truoc moi doi duoc xu ly xac.
  if (u.thung_xac_id && u.xu_ly_xac !== body.xu_ly_xac) return c.json({ error: "XAC_TRONG_THUNG" }, 400);
  if (u.xu_ly_xac === body.xu_ly_xac) return c.json({ ok: true });
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET xu_ly_xac = ?, updated_at = updated_at WHERE id = ?").bind(body.xu_ly_xac, id).run();
  await addLog(c.env.DB, "phieu_sc_ct", id, u.trang_thai, u.trang_thai, user.email, `Đổi xử lý xác: ${LBL[u.xu_ly_xac ?? ""] || u.xu_ly_xac || "—"} → ${LBL[body.xu_ly_xac!] || body.xu_ly_xac}`);
  return c.json({ ok: true });
});

// PATCH /api/admin/don-vi/:id/linh-kien {ma_lk_nhan?, ma_lk_thuc_te?} - 29/10/2026: Admin BH xac nhan lai
// linh kien THUC TE GUI VE (B) va linh kien DOI MOI (C) bat cu luc nao (VD sau khi xu ly nhanh/hang loat).
// undefined = giu nguyen, null/"" = bo (B ve giong A, C ve giong B). Quan ly xac tinh theo B.
// Doi linh kien B (thuc te gui ve) / C (doi moi) cua 1 don vi. undefined = giu, ""/null = bo ve mac dinh.
async function doiLinhKienDonVi(db: D1Database, id: string, nhan: string | null | undefined, thucTe: string | null | undefined, actor: string): Promise<string | null> {
  const u = await db
    .prepare("SELECT u.trang_thai, u.ma_lk_nhan, u.ma_lk_thuc_te, p.ma_lk FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?")
    .bind(id)
    .first<{ trang_thai: string; ma_lk_nhan: string | null; ma_lk_thuc_te: string | null; ma_lk: string | null }>();
  if (!u) return "NOT_FOUND";
  const moiNhan = nhan === undefined ? u.ma_lk_nhan : nhan;
  const moiTt = thucTe === undefined ? u.ma_lk_thuc_te : thucTe;
  if (moiNhan === u.ma_lk_nhan && moiTt === u.ma_lk_thuc_te) return null;
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET ma_lk_nhan = ?, ma_lk_thuc_te = ?, updated_at = updated_at WHERE id = ?").bind(moiNhan, moiTt, id).run();
  const parts: string[] = [];
  if (moiNhan !== u.ma_lk_nhan) parts.push(`LK thực tế gửi về: ${u.ma_lk_nhan || u.ma_lk || "—"} → ${moiNhan || u.ma_lk || "—"}`);
  if (moiTt !== u.ma_lk_thuc_te) parts.push(`LK đổi mới: ${u.ma_lk_thuc_te || "—"} → ${moiTt || "—"}`);
  await addLog(db, "phieu_sc_ct", id, u.trang_thai, u.trang_thai, actor, parts.join(" | "));
  return null;
}

const normLk = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null);
async function lkHopLe(db: D1Database, mas: (string | null | undefined)[]): Promise<boolean> {
  for (const ma of mas) if (ma && !(await db.prepare("SELECT 1 FROM linh_kien_bh WHERE ma_lk = ?").bind(ma).first())) return false;
  return true;
}

// 08/11/2026 - "Cho Admin BH sửa mã ID case sai nếu đơn chưa kết thúc": doi ma case cua don cha (moi don vi dung chung).
// Kiem tra nhu luc tao don (lib/kiemTraCase.ts); case thuoc KTV khac thi Admin tich xac nhan. Don Odoo: ma case theo Odoo, khong doi.
adminBH.patch("/don-cha/:id/case", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const p = await c.env.DB.prepare(
    `SELECT p.case_id, p.odoo_id, p.trang_thai_cha, g.nguoi_tao,
       (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.parent_id = p.id) AS so_dv,
       (SELECT COUNT(*) FROM phieu_sua_chua_bh_ct u WHERE u.parent_id = p.id AND NOT (u.trang_thai IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho')
          OR EXISTS (SELECT 1 FROM phieu_tra_bh t WHERE t.id = u.phieu_tra_id AND t.trang_thai IN ('ktv_da_nhan','gui_that_bai','ket_thuc_khong_gui')))) AS con_mo
     FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?`,
  )
    .bind(id)
    .first<{ case_id: string | null; odoo_id: number | null; trang_thai_cha: string; nguoi_tao: string | null; so_dv: number; con_mo: number }>();
  if (!p) return c.json({ error: "NOT_FOUND" }, 404);
  if (p.so_dv > 0 && p.con_mo === 0) return c.json({ error: "DON_DA_KET_THUC" }, 400);
  if (p.odoo_id) return c.json({ error: "CASE_TU_ODOO" }, 400);
  const body = await c.req.json<{ case_id?: string; xac_nhan_khac_ktv?: boolean; xac_nhan_chua_xac_minh?: boolean }>().catch(() => ({}) as { case_id?: string; xac_nhan_khac_ktv?: boolean; xac_nhan_chua_xac_minh?: boolean });
  const moi = normCaseId(body.case_id);
  if (!moi) return c.json({ error: "MISSING_CASE_ID" }, 400);
  if (moi === (p.case_id ?? "")) return c.json({ ok: true, doi: 0 });
  const kq = await kiemTraCase(c.env, moi, p.nguoi_tao, user, body);
  if (!kq.ok) return c.json({ error: kq.error }, 400);
  await ghiDoiCase(c.env, id, p.case_id, moi, kq, user, p.trang_thai_cha, "Admin BH");
  return c.json({ ok: true, doi: 1, chua_xac_minh: kq.chuaXacMinh });
});

adminBH.patch("/don-vi/:id/linh-kien", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ma_lk_nhan?: string | null; ma_lk_thuc_te?: string | null }>().catch(() => ({}) as { ma_lk_nhan?: string | null; ma_lk_thuc_te?: string | null });
  const nhan = normLk(body.ma_lk_nhan);
  const thucTe = normLk(body.ma_lk_thuc_te);
  if (!(await lkHopLe(c.env.DB, [nhan, thucTe]))) return c.json({ error: "LINH_KIEN_NOT_FOUND" }, 400);
  const err = await doiLinhKienDonVi(c.env.DB, c.req.param("id"), nhan, thucTe, user.email);
  if (err) return c.json({ error: err }, 404);
  return c.json({ ok: true });
});

// 03/11/2026 - "thêm tính năng đổi linh kiện B hoặc C hàng loạt cho admin BH". {ids, ma_lk_nhan?, ma_lk_thuc_te?}
// - chi gui truong can doi (khong gui = giu nguyen tung don); "" = bo ve mac dinh.
adminBH.post("/don-vi/linh-kien-hang-loat", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; ma_lk_nhan?: string | null; ma_lk_thuc_te?: string | null }>().catch(() => ({}) as { ids?: string[]; ma_lk_nhan?: string | null; ma_lk_thuc_te?: string | null });
  const ids = [...new Set((body.ids || []).filter((x) => typeof x === "string"))].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const nhan = normLk(body.ma_lk_nhan);
  const thucTe = normLk(body.ma_lk_thuc_te);
  if (nhan === undefined && thucTe === undefined) return c.json({ error: "MISSING_LINH_KIEN" }, 400);
  if (!(await lkHopLe(c.env.DB, [nhan, thucTe]))) return c.json({ error: "LINH_KIEN_NOT_FOUND" }, 400);
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const err = await doiLinhKienDonVi(c.env.DB, id, nhan, thucTe, user.email);
    if (err) loi.push({ id, error: err });
    else ok++;
  }
  return c.json({ ok, loi });
});

adminBH.patch("/don-vi/:id/thu-hoi-hang", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_ke_toan || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  const body = await c.req.json<{ so_tien?: number | null; ghi_chu?: string }>().catch(() => ({}) as { so_tien?: number | null; ghi_chu?: string });
  const soTien = body.so_tien === null || body.so_tien === undefined ? null : Number(body.so_tien);
  if (soTien !== null && (!Number.isFinite(soTien) || soTien < 0 || !Number.isInteger(soTien))) return c.json({ error: "INVALID_SO_TIEN" }, 400);
  const ghiChu = body.ghi_chu?.trim() || null;
  const now = nowVN();
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET so_tien_thu_hoi_hang = ?, thu_hoi_hang_ghi_chu = ?, thu_hoi_hang_boi = ?, thu_hoi_hang_luc = ? WHERE id = ?")
    .bind(soTien, ghiChu, user.email, now, id)
    .run();
  await addLog(
    c.env.DB,
    "phieu_sc_ct",
    id,
    u.trang_thai,
    u.trang_thai,
    user.email,
    "Ghi nhận thu hồi chi phí từ hãng: " + (soTien === null ? "xoá số tiền" : soTien.toLocaleString("vi-VN") + " đ") + (ghiChu ? " | " + ghiChu : ""),
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
  if ((await quaHanBuoc(c.env.DB, "cho_admin_xac_nhan", u.updated_at)) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET trang_thai = 'cho_chan_doan', so_lan_yeu_cau_lam_lai = ?, ly_do_yeu_cau_lam_lai = ?, updated_at = ? WHERE id = ?")
    .bind((u.so_lan_yeu_cau_lam_lai || 0) + 1, body.ly_do.trim(), nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_admin_xac_nhan", "cho_chan_doan", user.email, "Admin BH yêu cầu làm lại: " + body.ly_do.trim() + (body.ly_do_cham ? ` | Lý do chậm: ${body.ly_do_cham}` : ""));
  return c.json({ ok: true });
});

// 03/11/2026 - nguyen van: "cho phép lùi lại đơn hủy nhầm, lùi lại đơn đã duyệt nếu giai đoạn sau chưa được
// thực hiện". POST /admin/don-vi/:id/hoan-tac {ly_do} - lui 1 buoc:
//  - Da huy / chuyen kho -> Cho phan loai.
//  - Cho NV sua (NV chua nop ket qua, chua co de xuat LK dang/da cap) -> Cho phan loai (de xuat cho cap tu huy).
//  - San sang tra (chua vao phieu tra, hoac phieu tra con Nhap -> tu go khoi phieu):
//      + da qua NV va Admin xac nhan hoan tat -> Cho Admin xac nhan hoan tat;
//      + con lai -> Cho phan loai.
//  Phieu tra da gui Ke toan / da duyet / da gui -> GIAI_DOAN_SAU (dung Huy gui duyet / Day nguoc truoc).
const TT_LUI: Record<string, string> = { ket_thuc_tu_choi: "Đã huỷ", ket_thuc_chuyen_kho: "Chuyển kho", cho_chan_doan: "Chờ NV sửa", san_sang_gom_phieu_tra: "Sẵn sàng trả", cho_phan_loai: "Chờ phân loại", cho_admin_xac_nhan: "Chờ xác nhận hoàn tất" };
async function hoanTacDonVi(db: D1Database, id: string, actor: string, lyDo: string): Promise<{ error?: string; den?: string }> {
  const u = await db
    .prepare("SELECT id, trang_thai, phieu_tra_id, ket_qua_nv, admin_xac_nhan_hoan_tat, thung_xac_id FROM phieu_sua_chua_bh_ct WHERE id = ?")
    .bind(id)
    .first<{ id: string; trang_thai: string; phieu_tra_id: string | null; ket_qua_nv: string | null; admin_xac_nhan_hoan_tat: number; thung_xac_id: string | null }>();
  if (!u) return { error: "NOT_FOUND" };
  // 13/11/2026: xac dang trong thung tra xac -> phai bo khoi thung truoc.
  if (u.thung_xac_id) return { error: "XAC_TRONG_THUNG" };
  const now = nowVN();
  const RESET_PL =
    "huong_xu_ly = NULL, loai_bao_hanh = NULL, loai_doi_tru = NULL, nguoi_sua_chua = NULL, ly_do_tu_choi = NULL, ghi_chu_huy = NULL, xu_ly_xac = NULL, thong_tin_mail_pd = NULL, ma_phe_duyet = NULL, ket_qua_chan_doan = NULL, ket_qua_nv = NULL, ghi_chu_nv = NULL, admin_xac_nhan_hoan_tat = 0, phieu_tra_id = NULL";
  let den: string;
  let ghi = "";
  if (u.trang_thai === "ket_thuc_tu_choi" || u.trang_thai === "ket_thuc_chuyen_kho") {
    den = "cho_phan_loai";
    await db.prepare(`UPDATE phieu_sua_chua_bh_ct SET ${RESET_PL}, trang_thai = ?, updated_at = ? WHERE id = ?`).bind(den, now, id).run();
  } else if (u.trang_thai === "cho_chan_doan") {
    const dx = await db.prepare("SELECT COUNT(*) AS n FROM de_xuat_linh_kien_bh WHERE unit_id = ? AND trang_thai IN ('cho_ke_toan', 'da_cap')").bind(id).first<{ n: number }>();
    if ((dx?.n ?? 0) > 0) return { error: "GIAI_DOAN_SAU" };
    den = "cho_phan_loai";
    await db.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'huy', ly_do_tu_choi = 'Tự huỷ: Admin BH lùi đơn về chờ phân loại', updated_at = ? WHERE unit_id = ? AND trang_thai = 'cho_cap'").bind(now, id).run();
    await db.prepare(`UPDATE phieu_sua_chua_bh_ct SET ${RESET_PL}, trang_thai = ?, updated_at = ? WHERE id = ?`).bind(den, now, id).run();
  } else if (u.trang_thai === "cho_admin_xac_nhan") {
    // 05/11/2026 - "cho admin đẩy lùi lại bước sửa cho đúng quy trình": NV da bao ket qua -> ve lai Cho NV sua (giu NV),
    // xoa ket qua NV de NV nop lai (VD can them linh kien de xuat). Chua co NV thi ve Cho phan loai.
    const nv = await db.prepare("SELECT nguoi_sua_chua FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ nguoi_sua_chua: string | null }>();
    if (nv?.nguoi_sua_chua) {
      den = "cho_chan_doan";
      await db.prepare("UPDATE phieu_sua_chua_bh_ct SET ket_qua_nv = NULL, ket_qua_chan_doan = NULL, admin_xac_nhan_hoan_tat = 0, trang_thai = ?, updated_at = ? WHERE id = ?").bind(den, now, id).run();
    } else {
      den = "cho_phan_loai";
      await db.prepare(`UPDATE phieu_sua_chua_bh_ct SET ${RESET_PL}, trang_thai = ?, updated_at = ? WHERE id = ?`).bind(den, now, id).run();
    }
  } else if (u.trang_thai === "san_sang_gom_phieu_tra") {
    if (u.phieu_tra_id) {
      const t = await db.prepare("SELECT trang_thai FROM phieu_tra_bh WHERE id = ?").bind(u.phieu_tra_id).first<{ trang_thai: string }>();
      if (t && t.trang_thai !== "nhap") return { error: "GIAI_DOAN_SAU" };
      ghi = ` | Gỡ khỏi phiếu trả nháp ${u.phieu_tra_id}`;
      await addLog(db, "phieu_tra", u.phieu_tra_id, "nhap", "nhap", actor, `Gỡ ${id} khỏi phiếu (Admin BH lùi đơn): ${lyDo}`);
    }
    if (u.ket_qua_nv && u.admin_xac_nhan_hoan_tat) {
      den = "cho_admin_xac_nhan";
      await db.prepare("UPDATE phieu_sua_chua_bh_ct SET admin_xac_nhan_hoan_tat = 0, phieu_tra_id = NULL, trang_thai = ?, updated_at = ? WHERE id = ?").bind(den, now, id).run();
    } else {
      den = "cho_phan_loai";
      await db.prepare(`UPDATE phieu_sua_chua_bh_ct SET ${RESET_PL}, trang_thai = ?, updated_at = ? WHERE id = ?`).bind(den, now, id).run();
    }
    if (u.phieu_tra_id) await syncPhieuTraMien(db, u.phieu_tra_id);
  } else {
    return { error: "WRONG_STATE" };
  }
  await addLog(db, "phieu_sc_ct", id, u.trang_thai, den, actor, `Admin BH lùi lại đơn (${TT_LUI[u.trang_thai] ?? u.trang_thai} → ${TT_LUI[den] ?? den}): ${lyDo}${ghi}`);
  return { den };
}

adminBH.post("/don-vi/:id/hoan-tac", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const lyDo = body.ly_do?.trim();
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const r = await hoanTacDonVi(c.env.DB, c.req.param("id"), user.email, lyDo);
  if (r.error) return c.json({ error: r.error }, r.error === "NOT_FOUND" ? 404 : 400);
  return c.json({ ok: true, trang_thai: r.den });
});

// ---------- 7. Don dich vu tinh phi (khach le, Admin BH tu tao) ----------

interface DonDichVuBody {
  case_id?: string | null;
  ten_khach_hang?: string;
  sdt_khach_hang?: string;
  dia_chi_khach_hang?: string;
  san_pham_bh?: string;
  // 14/11/2026: khach hang chon tu danh ba (khach_hang_bh, NPP / khach le) - ten/SDT/dia chi lay tu danh ba neu de trong.
  khach_hang_id?: string | null;
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
  body.case_id = normCaseId(body.case_id) || null; // 06/11/2026: sc... -> SC...
  if (body.khach_hang_id) {
    const kh = await c.env.DB.prepare("SELECT id, ten, sdt, dia_chi FROM khach_hang_bh WHERE id = ?").bind(body.khach_hang_id).first<{ id: string; ten: string; sdt: string; dia_chi: string }>();
    if (!kh) return c.json({ error: "KH_NOT_FOUND" }, 400);
    body.ten_khach_hang = body.ten_khach_hang?.trim() || kh.ten;
    body.sdt_khach_hang = body.sdt_khach_hang?.trim() || kh.sdt;
    body.dia_chi_khach_hang = body.dia_chi_khach_hang?.trim() || kh.dia_chi;
  }
  if (!body.case_id) {
    if (!body.ten_khach_hang?.trim() || !body.sdt_khach_hang?.trim() || !body.san_pham_bh?.trim()) return c.json({ error: "MISSING_KHACH_LE_INFO" }, 400);
  }
  const soLuong = body.so_luong ?? 1;
  if (!Number.isInteger(soLuong) || soLuong < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  if (!body.mo_ta_loi?.trim()) return c.json({ error: "MISSING_MO_TA_LOI" }, 400);

  // 12/11/2026: anh luu tren Google Drive (lib/anhDrive.ts), D1 chi giu link - tai TRUOC khi tao don.
  let anhUrls: string[];
  try {
    anhUrls = await chuanHoaAnh(c.env, body.anh, "don_dich_vu");
  } catch (e) {
    return c.json({ error: e instanceof AnhLoi ? e.code : "UPLOAD_FAILED" }, 400);
  }
  const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
  const now = nowVN();
  await c.env.DB.prepare(
    `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, so_luong_khai, so_luong_thuc_nhan, nguon_tao, ten_khach_hang, sdt_khach_hang, dia_chi_khach_hang, san_pham_bh, trang_thai_cha, created_at, mien, khach_hang_id)
     VALUES (?, NULL, ?, ?, ?, ?, ?, 'admin_dich_vu', ?, ?, ?, ?, 'da_tach', ?, ?, ?)`,
  )
    .bind(id, body.case_id || null, body.ma_lk || null, body.mo_ta_loi.trim(), soLuong, soLuong, body.ten_khach_hang?.trim() || "", body.sdt_khach_hang?.trim() || "", body.dia_chi_khach_hang?.trim() || "", body.san_pham_bh?.trim() || "", now, mienOfStaff(user), body.khach_hang_id || null)
    .run();
  const statements = [];
  for (let i = 1; i <= soLuong; i++) {
    statements.push(c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct (id, parent_id, so_thu_tu, trang_thai, created_at, updated_at) VALUES (?, ?, ?, 'cho_phan_loai', ?, ?)").bind(`${id}-${i}`, id, i, now, now));
  }
  await c.env.DB.batch(statements);
  if (anhUrls.length > 0) {
    await c.env.DB.batch(anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_anh (parent_id, anh_url) VALUES (?, ?)").bind(id, url)));
  }
  await addLog(c.env.DB, "phieu_sc", id, null, "da_tach", user.email, "Admin BH tạo đơn dịch vụ tính phí (khách lẻ)");
  c.executionCtx.waitUntil(body.case_id ? syncCaseSnapshots(c.env, [body.case_id]).catch(() => 0) : capNhatTimKiem(c.env.DB, null, 50).catch(() => 0));
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
  { key: "huy_khong_co_hang", label: "Huỷ do không có hàng", huong: "tu_choi", loaiBH: "trong_bh", lyDoTuChoi: "Không có hàng" },
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
  ghi_chu_huy?: string;
  ly_do_cham?: string;
  xu_ly_xac?: string;
  hang?: string | null; // 16/11/2026 (v1.142) - Hang / Doi tac khi day sang NV sua chua
  doi_tac_id?: number | null;
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
    await addLog(db, "phieu_tra", existing.id, "nhap", "nhap", actor, `Gộp thêm đơn vị ${unitId} vào phiếu (từ nút thao tác nhanh)`);
    await syncPhieuTraMien(db, existing.id);
    return existing.id;
  }
  const id = await nextSequentialId(db, "phieu_tra_bh", "TR");
  const now = nowVN();
  await db.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, ma_don_hang, created_at, updated_at) VALUES (?, ?, ?, 'nhap', ?, ?, ?, ?)").bind(id, ktvKey, actor, loaiDoiTru, id, now, now).run();
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, unitId).run();
  await addLog(db, "phieu_tra", id, null, "nhap", actor, `Tạo phiếu trả mới (${LBL[loaiDoiTru] || loaiDoiTru}) từ nút thao tác nhanh`);
  await syncPhieuTraMien(db, id);
  return id;
}

async function ktvKeyOfUnit(db: D1Database, parentId: string): Promise<string> {
  const row = await db
    .prepare(`SELECT g.nguoi_tao FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?`)
    .bind(parentId)
    .first<{ nguoi_tao: string | null }>();
  return row?.nguoi_tao ?? KHACH_LE_KEY;
}

// Ap 1 nut FAST cho 1 don vi - dung chung cho nut don le va nut hang loat (05/10/2026).
async function applyFastToUnit(db: D1Database, meta: FastActionMeta, unitId: string, body: FastActionBody, actor: string): Promise<{ error: string } | { ok: true; phieu_tra_id: string | null }> {
  const unit = await db.prepare("SELECT id, parent_id, trang_thai, updated_at FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<UnitRow & { parent_id: string }>();
  if (!unit) return { error: "NOT_FOUND" };
  if (!["cho_phan_loai", "admin_can_xem_lai"].includes(unit.trang_thai)) return { error: "WRONG_STATE" };
  const needsNv = meta.huong && HUONG_CAN_NV.includes(meta.huong);
  const needsMailPd = meta.loaiBH === "ngoai_bh";
  // 09/11/2026: huy luon co ly do - nut co ly do dat san (Huy do khong co hang) dung lam mac dinh, Admin doi duoc.
  const needsLyDoTuChoi = meta.huong === "tu_choi" && !meta.lyDoTuChoi;
  if (needsNv && !body.nv) return { error: "REQUIRE_NV" };
  if (needsMailPd && !body.mail_pd?.trim()) return { error: "REQUIRE_MAIL_PD" };
  if (needsLyDoTuChoi && !body.ly_do_tu_choi) return { error: "REQUIRE_LY_DO_TU_CHOI" };
  if ((await quaHanBuoc(db, unit.trang_thai, unit.updated_at)) && !body.ly_do_cham?.trim()) return { error: "REQUIRE_LY_DO_CHAM" };

  const loaiDoiTru = meta.loaiDoiTru || (await defaultLoaiDoiTru(db, unit.parent_id));
  const result = await applyPhanLoaiToUnit(
    db,
    unit,
    {
      loai_bao_hanh: meta.loaiBH,
      thong_tin_mail_pd: body.mail_pd,
      ma_phe_duyet: body.ma_phe_duyet,
      loai_doi_tru: loaiDoiTru,
      huong_xu_ly: meta.huong,
      nguoi_sua_chua: body.nv,
      ly_do_tu_choi: body.ly_do_tu_choi?.trim() || meta.lyDoTuChoi,
      ghi_chu_huy: body.ghi_chu_huy,
      ly_do_cham: body.ly_do_cham,
      // 20/10/2026: FAST Doi moi khong hoi xu ly xac - mac dinh "tra doi tac", Admin doi lai sau.
      xu_ly_xac: meta.huong === "doi_moi" ? body.xu_ly_xac || "tra_doi_tac" : body.xu_ly_xac,
      hang: body.hang,
      doi_tac_id: body.doi_tac_id,
    },
    actor,
  );
  if ("error" in result) return result;
  // 30/10/2026: FAST chot luon LK thuc te gui ve (B) = LK KTV chon (A) neu B con trong - Admin chi sua
  // lai (✎ Sua linh kien trong chi tiet don) khi thay sai.
  await db
    .prepare("UPDATE phieu_sua_chua_bh_ct SET ma_lk_nhan = (SELECT p.ma_lk FROM phieu_sua_chua_bh p WHERE p.id = phieu_sua_chua_bh_ct.parent_id) WHERE id = ? AND ma_lk_nhan IS NULL")
    .bind(unit.id)
    .run();

  let phieuTraId: string | null = null;
  if (meta.huong && HUONG_TAO_PHIEU_TRA.includes(meta.huong)) {
    const ktvKey = await ktvKeyOfUnit(db, unit.parent_id);
    phieuTraId = await attachToOrCreatePhieuTra(db, unit.id, ktvKey, loaiDoiTru, actor);
  }
  return { ok: true, phieu_tra_id: phieuTraId };
}

// POST /don-vi/fast-hang-loat/:key { ids, ...FastActionBody } - 1 nut FAST cho nhieu don vi, Admin chon
// 1 lan (NV / mail PD / ly do huy / xu ly xac / ly do cham) ap cho tat ca.
adminBH.post("/don-vi/fast-hang-loat/:key", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const meta = FAST_ACTIONS.find((a) => a.key === c.req.param("key"));
  if (!meta || meta.special) return c.json({ error: "UNKNOWN_ACTION" }, 400);
  const body = await c.req.json<FastActionBody & { ids?: string[] }>().catch(() => ({}) as FastActionBody & { ids?: string[] });
  const ids = body.ids || [];
  if (ids.length === 0) return c.json({ error: "NO_IDS" }, 400);
  const errors: Record<string, string> = {};
  let applied = 0;
  for (const id of ids) {
    const r = await applyFastToUnit(c.env.DB, meta, id, body, user.email);
    if ("error" in r) errors[id] = r.error;
    else applied++;
  }
  return c.json({ applied, errors });
});

adminBH.post("/don-vi/:id/fast/:key", async (c) => {
  const user = c.get("user");
  if (!requireAdminBH(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const meta = FAST_ACTIONS.find((a) => a.key === c.req.param("key"));
  if (!meta) return c.json({ error: "UNKNOWN_ACTION" }, 400);

  if (meta.special === "bo_sung_tt" || meta.special === "bao_cao_sai") {
    const unit = await c.env.DB.prepare("SELECT parent_id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ parent_id: string }>();
    if (!unit) return c.json({ error: "NOT_FOUND" }, 404);
    return c.json({ redirect: meta.special, parent_id: unit.parent_id });
  }

  const body = await c.req.json<FastActionBody>().catch(() => ({}) as FastActionBody);
  const r = await applyFastToUnit(c.env.DB, meta, id, body, user.email);
  if ("error" in r) return c.json(r, r.error === "NOT_FOUND" ? 404 : 400);
  return c.json(r);
});

export default adminBH;
