import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { viewKhuVucEmailInSql } from "../lib/scope";
import { parsePage } from "../lib/pagination";
import { slaCutoffVn } from "../lib/sla";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF, textFilters, numFilters, sortParam } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { GS_KTV_SUBQUERY } from "../lib/gs";
import { mienScope } from "../lib/mien";
import { BUOC_DUNG, cauHinhBuoc, sqlQuaHan } from "../lib/buoc";
import { sqlDaGiaiTrinh } from "../lib/giaiTrinh";

// Man hinh "Giam sat" (la_giam_sat, scope qua email_gs) va "View" (la_view, scope theo Khu vuc qua
// user_khu_vuc_bh) - THUAN CHI XEM, khong co route nao lam doi du lieu o day (dung nguyen tac da
// chot: "man quanly/View THUAN CHI XEM, khong duoc co bat ky control nao lam doi du lieu").

const traCuu = new Hono<{ Bindings: Env }>();
traCuu.use("*", verifySessionMiddleware, loadUser);

// Tra ve {whereSql, binds} loc theo dung vai tro dang goi - qtri/admin_bh xem tat ca.
function scopeClause(user: { la_giam_sat: boolean; la_view: boolean; la_qtri: boolean; la_admin_bh: boolean; email: string }): { where: string; binds: unknown[] } {
  if (user.la_qtri || user.la_admin_bh) return { where: "1=1", binds: [] };
  // 01/11/2026: 1 Khu vuc co nhieu GS -> GS thay don dong goi email_gs = minh HOAC don cua KTV thuoc Khu vuc minh phu trach.
  if (user.la_giam_sat) return { where: `(p.email_gs = ? OR COALESCE(g.nguoi_tao, '') IN (${GS_KTV_SUBQUERY}))`, binds: [user.email, user.email.toLowerCase()] };
  if (user.la_view) return { where: `COALESCE(g.nguoi_tao, '') IN ${viewKhuVucEmailInSql()}`, binds: [user.email] };
  return { where: "1=0", binds: [] };
}

// 20/10/2026 ("đơn gửi sửa chữa đang chờ, admin bh không tìm thấy ở đâu => admin bh ... cần nhìn thấy
// trạng thái của đơn hàng tại mọi luồng quy trình"): tra cuu gom CA don cha chua tach don vi (thung nhap /
// dang gui ve Kho / Kho da nhan cho Admin / cho xac nhan SL) LAN don vi; moi dong co "giai_doan" = buoc
// thuc te cua don trong toan luong (don vi da vao phieu tra -> trang thai phieu tra "tra_<...>").
export const DANG_CHO = ["thung_dang_gui", "thung_cho_admin_nhan", "thung_tu_choi", "cho_xac_nhan_so_luong", "cho_phan_loai", "admin_can_xem_lai", "cho_bo_sung_tt", "cho_chan_doan", "cho_admin_xac_nhan", "san_sang_gom_phieu_tra", "tra_nhap", "tra_cho_ke_toan_duyet", "tra_da_duyet_ke_toan"];

// 14/11/2026 (toi uu D1): giai_doan la cot tinh (CASE) nen "WHERE x.giai_doan IN (...)" khong dung duoc index -> moi
// lan dem menu KTV / qua han quet TOAN BO don vi tu truoc toi nay (~15k dong/lan, ~19M rows_read/ngay). Truyen `gd` de
// loc TRUOC nhanh don vi bang 2 index (u.trang_thai + phieu tra theo trang thai): tap nay luon CHUA moi don vi co giai
// doan thuoc gd (giai_doan = u.trang_thai hoac 'tra_' || t.trang_thai), dieu kien x.giai_doan IN (...) ben ngoai van giu
// nguyen nen ket qua khong doi. Gia tri gd nhung thang vao SQL (khong them bind -> khong lech thu tu bind cua caller),
// nen chi nhan chuoi [a-z_].
const GD_HOP_LE = /^[a-z_]{2,40}$/;
function locTruocDonVi(gd: readonly string[] | undefined): string {
  const ds = (gd || []).filter((x) => GD_HOP_LE.test(x) && !x.startsWith("__"));
  if (!gd || !gd.length || ds.length !== gd.length) return "";
  const lit = (xs: string[]) => xs.map((x) => `'${x}'`).join(",");
  const tra = ds.filter((x) => x.startsWith("tra_")).map((x) => x.slice(4)).filter((x) => x.length >= 2);
  // Don vi da vao phieu tra luon co giai_doan 'tra_...' (phieu tra chi bi xoa khi da rong, FK + trang_thai NOT NULL) ma
  // u.trang_thai van giu 'san_sang_gom_phieu_tra' (~4.4k dong) -> nhanh nay chi xet don vi CHUA co phieu tra, qua index
  // mot phan idx_psc_ct_chua_tra (migration 0035).
  const nhanh = [`SELECT uu.rowid FROM phieu_sua_chua_bh_ct uu WHERE uu.trang_thai IN (${lit(ds)}) AND uu.phieu_tra_id IS NULL`];
  if (tra.length) nhanh.push(`SELECT uu.rowid FROM phieu_tra_bh tt JOIN phieu_sua_chua_bh_ct uu ON uu.phieu_tra_id = tt.id WHERE tt.trang_thai IN (${lit(tra)})`);
  return ` AND u.rowid IN (${nhanh.join(" UNION ")})`;
}

// Giai doan nhanh don cha co the nhan (CASE o allRowsSql). Loc giai doan khong chua gia tri nao trong nay -> nhanh don cha
// (~1.3k don cho xac nhan SL) khong dong nao khop, bo luon (giu scopeWhere de khong lech bind).
const GD_DON_CHA = ["thung_nhap", "thung_dang_gui", "thung_da_huy", "thung_tu_choi", "thung_cho_admin_nhan", "cho_xac_nhan_so_luong"];

// 14/11/2026 ("giai đoạn của đơn bh đang bị chia nhỏ quá ... gom các giai đoạn lại cho: Đơn nháp, đơn chờ tiếp nhận,
// đơn đã tiếp nhận, đơn đang sửa chữa, đơn chờ gửi trả, đơn đang gửi trả, đơn đã kết thúc, đơn đã hủy, đơn bị từ chối"):
// 9 nhom theo luong (frontend NHOM_GD trong lib/constants.ts phai khop). Loc ?nhom=a,b -> IN cac giai doan cua nhom.
export const NHOM_GD: Record<string, string[]> = {
  nhap: ["thung_nhap"],
  cho_tiep_nhan: ["thung_dang_gui", "thung_cho_admin_nhan"],
  da_tiep_nhan: ["cho_xac_nhan_so_luong", "cho_phan_loai", "admin_can_xem_lai", "cho_bo_sung_tt"],
  dang_sua: ["cho_chan_doan", "cho_admin_xac_nhan"],
  cho_gui_tra: ["san_sang_gom_phieu_tra", "tra_nhap", "tra_cho_ke_toan_duyet", "tra_da_duyet_ke_toan"],
  dang_gui_tra: ["tra_da_gui", "tra_khieu_nai_van_chuyen"],
  ket_thuc: ["tra_ktv_da_nhan", "tra_ket_thuc_khong_gui", "tra_gui_that_bai", "ket_thuc_chuyen_kho"],
  da_huy: ["thung_da_huy"],
  tu_choi: ["thung_tu_choi", "ket_thuc_tu_choi"],
};
function gdCuaNhom(v: string): string[] {
  return v.split(",").map((x) => x.trim()).flatMap((k) => NHOM_GD[k] || []);
}
function boNhanhCha(gd: readonly string[] | undefined): boolean {
  return !!locTruocDonVi(gd) && !gd!.some((x) => GD_DON_CHA.includes(x));
}

export function allRowsSql(scopeWhere: string, gd?: readonly string[]): string {
  const units = `SELECT u.id, u.parent_id, u.updated_at, u.created_at,
      CASE WHEN u.phieu_tra_id IS NOT NULL AND t.trang_thai IS NOT NULL THEN t.updated_at ELSE u.updated_at END AS buoc_tu,
      CASE WHEN u.phieu_tra_id IS NOT NULL AND t.trang_thai IS NOT NULL THEN 'tra_' || t.trang_thai ELSE u.trang_thai END AS giai_doan,
      u.trang_thai, u.phieu_tra_id, u.nguoi_sua_chua, u.huong_xu_ly, p.case_id, COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk) AS ma_lk, p.ma_lk AS lk_a, COALESCE(u.ma_lk_nhan, p.ma_lk) AS lk_b, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang,
      p.phieu_gui_id, p.mien, g.nguoi_tao AS ktv, 'unit' AS loai, 1 AS so_luong, p.so_luong_khai AS sl_dat, p.so_luong_thuc_nhan AS sl_duyet
    FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id
    WHERE ${scopeWhere}${locTruocDonVi(gd)}`;
  const parents = `SELECT p.id, p.id AS parent_id, COALESCE(g.updated_at, p.created_at) AS updated_at, p.created_at,
      COALESCE(g.updated_at, p.created_at) AS buoc_tu,
      CASE WHEN g.trang_thai = 'nhap' THEN 'thung_nhap' WHEN g.trang_thai = 'da_gui' THEN 'thung_dang_gui'
           WHEN p.trang_thai_cha = 'huy_thung' THEN 'thung_da_huy' WHEN g.tu_choi_tt IN ('cho_kho','cho_ktv') THEN 'thung_tu_choi' WHEN g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0 THEN 'thung_cho_admin_nhan' ELSE 'cho_xac_nhan_so_luong' END AS giai_doan,
      p.trang_thai_cha AS trang_thai, NULL AS phieu_tra_id, NULL AS nguoi_sua_chua, NULL AS huong_xu_ly, p.case_id, p.ma_lk, p.ma_lk AS lk_a, p.ma_lk AS lk_b, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang,
      p.phieu_gui_id, p.mien, g.nguoi_tao AS ktv, 'parent' AS loai, p.so_luong_khai AS so_luong, p.so_luong_khai AS sl_dat, NULL AS sl_duyet
    FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
    WHERE p.trang_thai_cha IN ('cho_xac_nhan_so_luong','huy_thung') AND ${scopeWhere}${boNhanhCha(gd) ? " AND 0" : ""}`;
  return `(${units} UNION ALL ${parents}) x`;
}

traCuu.get("/don-vi", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  // 02/11/2026: che do xem nhom theo KTV / linh kien lay toi da 1000 dong 1 lan.
  const { limit, offset } = parsePage(c, 20, 1000);
  const { where: scopeWhere, binds: scopeBinds } = scopeClause(user);
  let where = "1=1";
  const binds: unknown[] = [];
  // Loc theo giai doan (bam 1 o dem o man Tong quan -> sang day da loc san). "qua_han" = dang cho xu ly
  // ma da troi qua 24h SLA (bo Chu nhat, moc cat tinh bang JS).
  const st = (c.req.query("trang_thai") || "").trim();
  const chBuoc = await cauHinhBuoc(c.env.DB);
  if (st === "qua_han") {
    // 15/11/2026: qua han theo SLA RIENG tung buoc (lib/buoc.ts).
    const qh = sqlQuaHan(chBuoc, "x.giai_doan", "x.buoc_tu", BUOC_DUNG);
    where += ` AND ${qh.sql}`;
    binds.push(...qh.binds);
  } else if (st) {
    const ds = st.split(",").map((x) => x.trim()).filter(Boolean);
    where += ` AND x.giai_doan IN (${ds.map(() => "?").join(",")})`;
    binds.push(...ds);
  }
  // 14/11/2026: loc theo nhom giai doan (9 nhom theo luong).
  const nhomGd = gdCuaNhom(c.req.query("nhom") || "");
  if (c.req.query("nhom")) {
    if (!nhomGd.length) where += " AND 0";
    else {
      where += ` AND x.giai_doan IN (${nhomGd.map(() => "?").join(",")})`;
      binds.push(...nhomGd);
    }
  }
  // 15/11/2026: loc "buoc dang dung": qua_han / trong_han (theo SLA buoc), chua_gt (qua han chua giai trinh), da_gt.
  const btt = (c.req.query("buoc_tt") || "").trim();
  if (btt) {
    const qh = sqlQuaHan(chBuoc, "x.giai_doan", "x.buoc_tu", BUOC_DUNG);
    if (btt === "qua_han") where += ` AND ${qh.sql}`;
    else if (btt === "trong_han") where += ` AND x.giai_doan IN (${BUOC_DUNG.map(() => "?").join(",")}) AND NOT ${qh.sql}`;
    else if (btt === "chua_gt") where += ` AND ${qh.sql} AND NOT ${sqlDaGiaiTrinh()}`;
    else if (btt === "da_gt") where += ` AND ${sqlDaGiaiTrinh()}`;
    if (btt === "qua_han" || btt === "chua_gt") binds.push(...qh.binds);
    else if (btt === "trong_han") binds.push(...BUOC_DUNG, ...qh.binds);
  }
  // 21/10/2026: loc KTV gui / NV sua chua / huong xu ly / linh kien / mien.
  const LOC = { ktv: "x.ktv", nv: "x.nguoi_sua_chua", huong_xu_ly: "x.huong_xu_ly", lk_a: "x.lk_a", lk_b: "x.lk_b", lk: "x.ma_lk", mien: "x.mien" };
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, `FROM ${allRowsSql(scopeWhere)} WHERE 1=1`, [...scopeBinds, ...scopeBinds]) });
  // 01/11/2026: loc giai doan (frontend gui 1 giai doan hoac nhom "a,b,c" -> IN).
  // 13/11/2026 (bang kieu Excel): them loc chu / so theo tung cot.
  const f = joinF(
    eqFilters(c, { ...LOC, giai_doan: "x.giai_doan" }),
    timeFilter(c, "x.created_at"),
    slaFilter(c, "x.buoc_tu"),
    textFilters(c, {
      f_id: "x.id",
      f_gui: "COALESCE(x.phieu_gui_id,'') || ' ' || COALESCE(x.phieu_tra_id,'')",
      f_case: "x.case_id",
      f_mota: { expr: "x.mo_ta_loi", normExpr: "(SELECT pt.tim_kiem FROM phieu_sua_chua_bh pt WHERE pt.id = x.parent_id)" },
    }),
    numFilters(c, { sl: "x.sl_dat" }),
  );
  where += f.sql;
  binds.push(...f.binds);
  // 01/11/2026 ("thêm đánh giá việc linh kiện A <> linh kiện B, B <> linh kiện C"): A = KTV chon, B = thuc te
  // gui ve (mac dinh A), C = doi moi (x.ma_lk = C, mac dinh B). Don cha chua tach luon A = B = C.
  const lech = (c.req.query("lech_lk") || "").trim();
  if (lech === "ab") where += " AND x.lk_b <> x.lk_a";
  else if (lech === "bc") where += " AND x.ma_lk <> x.lk_b";
  else if (lech === "ab_bc") where += " AND x.lk_b <> x.lk_a AND x.ma_lk <> x.lk_b";
  else if (lech === "bat_ky") where += " AND (x.lk_b <> x.lk_a OR x.ma_lk <> x.lk_b)";
  else if (lech === "khop") where += " AND x.lk_b = x.lk_a AND x.ma_lk = x.lk_b";
  const kw = kwClause(c.req.query("q"), ["x.id", "x.case_id", "x.ma_lk", tenLkOf("x.ma_lk"), "x.mo_ta_loi", "x.ten_khach_hang", "x.sdt_khach_hang", "x.ktv", tenOf("x.ktv"), "x.phieu_gui_id", "x.phieu_tra_id",
    "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = x.case_id)"], ["(SELECT pt.tim_kiem FROM phieu_sua_chua_bh pt WHERE pt.id = x.parent_id)"]);
  where += kw.sql;
  binds.push(...kw.binds);
  // Loc truoc theo giai doan khi dang loc giai doan (o dem Tong quan / o loc cot) - xem locTruocDonVi.
  const gdRieng = (c.req.query("giai_doan") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const gdLoc = st === "qua_han" ? BUOC_DUNG : st ? st.split(",").map((x) => x.trim()).filter(Boolean) : nhomGd.length ? nhomGd : gdRieng.length ? gdRieng : ["qua_han", "chua_gt", "trong_han"].includes(btt) ? BUOC_DUNG : [];
  const from = `FROM ${allRowsSql(scopeWhere, gdLoc.length ? gdLoc : undefined)} WHERE ${where}`;
  const allBinds = [...scopeBinds, ...scopeBinds, ...binds];
  const sp = sortParam(c, {
    id: "x.id",
    gd: "x.giai_doan",
    gui: "COALESCE(x.phieu_gui_id, x.phieu_tra_id, '')",
    mien: "COALESCE(x.mien,'')",
    ktv: "COALESCE((SELECT us.ten FROM users us WHERE us.email = x.ktv), x.ktv, '')",
    case: "COALESCE(x.case_id,'')",
    lk: `COALESCE(${tenLkOf("x.ma_lk")}, x.ma_lk, '')`,
    nv: "COALESCE((SELECT us.ten FROM users us WHERE us.email = x.nguoi_sua_chua), x.nguoi_sua_chua, '')",
    huong: "COALESCE(x.huong_xu_ly,'')",
    mota: "COALESCE(x.mo_ta_loi,'')",
    sl: "x.sl_dat",
    tao: "x.created_at",
    sla: "x.buoc_tu",
  });
  const order = sp ? `${sp.expr} ${sp.dir}, x.id` : "x.updated_at DESC";
  // So dong truoc khi loc (de hien "x / tong dong").
  const coLoc = binds.length > 0 || where !== "1=1";
  const [{ results }, totalRow, tongRow] = await Promise.all([
    c.env.DB.prepare(`SELECT x.*, json_extract(s.data, '$.seri_san_pham') AS serial, json_extract(s.data, '$.ngay_mua') AS ngay_mua, json_extract(s.data, '$.ngay_san_xuat') AS ngay_sx FROM ${allRowsSql(scopeWhere)} LEFT JOIN case_lookup_snapshot s ON s.case_id = x.case_id WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).bind(...allBinds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${from}`).bind(...allBinds).first<{ cnt: number }>(),
    coLoc ? c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ${allRowsSql(scopeWhere)}`).bind(...scopeBinds, ...scopeBinds).first<{ cnt: number }>() : Promise.resolve(null),
  ]);
  const total = totalRow?.cnt ?? 0;
  return c.json({ don_vi: results, total, total_all: tongRow ? tongRow.cnt : total });
});

traCuu.get("/tong-quan", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const { where, binds } = scopeClause(user);
  const from = `FROM ${allRowsSql(where)}`;
  const fromDangCho = `FROM ${allRowsSql(where, BUOC_DUNG)}`;
  const b2 = [...binds, ...binds];
  const qhTq = sqlQuaHan(await cauHinhBuoc(c.env.DB), "x.giai_doan", "x.buoc_tu", BUOC_DUNG);
  const [{ results }, quaHanRow] = await Promise.all([
    c.env.DB.prepare(`SELECT x.giai_doan AS trang_thai, COUNT(*) as cnt ${from} GROUP BY x.giai_doan`).bind(...b2).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromDangCho} WHERE ${qhTq.sql}`)
      .bind(...b2, ...qhTq.binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ theo_trang_thai: results, qua_han: quaHanRow?.cnt ?? 0 });
});

// 04/11/2026 ("menu 2 ... hien danh sach cac KTV dang gui don BH (x123) ... click vao ten KTV de loc"):
// so don (don cha) dang con viec cua tung KTV - giai doan dang cho xu ly (DANG_CHO + KTV bao thieu). Pham vi:
// qtri/Admin BH/Kho/Ke toan theo mien; Giam sat / View theo khu vuc; NV chi don duoc giao cho minh.
traCuu.get("/ktv-menu", async (c) => {
  const user = c.get("user");
  let scopeWhere = "1=1";
  let scopeBinds: unknown[] = [];
  let extra = "";
  if (user.la_qtri || user.la_admin_bh || user.la_kho || user.la_ke_toan) {
    const ms = mienScope(user, "p");
    scopeWhere = "1=1" + ms.sql;
    scopeBinds = ms.binds;
  } else if (user.la_giam_sat || user.la_view) {
    const sc = scopeClause(user);
    scopeWhere = sc.where;
    scopeBinds = sc.binds;
  } else if (user.la_nv_sua_chua) {
    extra = " AND x.nguoi_sua_chua = ?";
  } else return c.json({ error: "FORBIDDEN" }, 403);
  // 05/11/2026 - "số lượng đếm sẽ phụ thuộc vào tab người dùng đang chọn": ?gd=a,b (giai doan cua tab dang mo),
  // ?gd=* = moi giai doan (tab "Moi giai doan"); khong truyen = cac giai doan dang cho xu ly nhu cu.
  const gdq = (c.req.query("gd") || "").trim();
  const tatCa = gdq === "*";
  const gdTab = tatCa ? [] : gdq.split(",").map((x) => x.trim()).filter((x) => /^[a-z_]{2,40}$/.test(x)).slice(0, 20);
  const gd = gdTab.length ? gdTab : [...DANG_CHO, "tra_khieu_nai_van_chuyen"];
  const binds: unknown[] = [...scopeBinds, ...scopeBinds, ...(tatCa ? [] : gd)];
  if (extra) binds.push(user.email);
  const gdWhere = tatCa ? "1=1" : `x.giai_doan IN (${gd.map(() => "?").join(",")})`;
  const { results } = await c.env.DB.prepare(
    `SELECT COALESCE(x.ktv, '') AS ktv, COUNT(DISTINCT x.parent_id) AS so_don, COUNT(*) AS so_dong,
       SUM(CASE WHEN x.updated_at < ? THEN 1 ELSE 0 END) AS qua_han
     FROM ${allRowsSql(scopeWhere, tatCa ? undefined : gd)} WHERE ${gdWhere}${extra}
     GROUP BY COALESCE(x.ktv, '') ORDER BY so_don DESC`
  ).bind(slaCutoffVn(24), ...binds).all();
  return c.json({ ktv: results });
});

// 06/11/2026: link mo thang theo ID (/DH-002957-1, /DH-002957, /BH-000458, /TR-000506 - frontend MoTheoId.tsx). Chi
// cho biet ID thuoc LOAI nao de frontend mo dung modal chi tiet san co; KHONG tra du lieu - quyen xem do route chi tiet
// (/admin/don-vi/:id, /phieu-gui/:id, /phieu-tra/:id) tu kiem tra. Don cha: da tach don vi -> don vi dau; chua -> thung gui.
traCuu.get("/mo-theo-id/:id", async (c) => {
  const id = c.req.param("id").trim().toUpperCase();
  const db = c.env.DB;
  if (/^TR-\d+$/.test(id)) {
    const t = await db.prepare("SELECT id FROM phieu_tra_bh WHERE id = ?").bind(id).first();
    return t ? c.json({ loai: "phieu_tra", id }) : c.json({ error: "NOT_FOUND" }, 404);
  }
  if (/^BH-\d+$/.test(id)) {
    const g = await db.prepare("SELECT id FROM phieu_gui_bh WHERE id = ?").bind(id).first();
    return g ? c.json({ loai: "phieu_gui", id }) : c.json({ error: "NOT_FOUND" }, 404);
  }
  if (/^DH-\d+-\d+$/.test(id)) {
    const u = await db.prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first();
    return u ? c.json({ loai: "don_vi", id }) : c.json({ error: "NOT_FOUND" }, 404);
  }
  if (/^DH-\d+$/.test(id)) {
    const p = await db.prepare("SELECT phieu_gui_id FROM phieu_sua_chua_bh WHERE id = ?").bind(id).first<{ phieu_gui_id: string | null }>();
    if (!p) return c.json({ error: "NOT_FOUND" }, 404);
    const u = await db.prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE parent_id = ? ORDER BY so_thu_tu LIMIT 1").bind(id).first<{ id: string }>();
    if (u) return c.json({ loai: "don_vi", id: u.id });
    if (p.phieu_gui_id) return c.json({ loai: "phieu_gui", id: p.phieu_gui_id });
    return c.json({ error: "NOT_FOUND" }, 404);
  }
  return c.json({ error: "INVALID_ID" }, 400);
});

export default traCuu;
