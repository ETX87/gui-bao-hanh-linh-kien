import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { viewKhuVucEmailInSql } from "../lib/scope";
import { parsePage } from "../lib/pagination";
import { slaCutoffVn } from "../lib/sla";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { GS_KTV_SUBQUERY } from "../lib/gs";

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
const DANG_CHO = ["thung_dang_gui", "thung_cho_admin_nhan", "cho_xac_nhan_so_luong", "cho_phan_loai", "admin_can_xem_lai", "cho_bo_sung_tt", "cho_chan_doan", "cho_admin_xac_nhan", "san_sang_gom_phieu_tra", "tra_nhap", "tra_cho_ke_toan_duyet", "tra_da_duyet_ke_toan"];

function allRowsSql(scopeWhere: string): string {
  const units = `SELECT u.id, u.parent_id, u.updated_at, u.created_at,
      CASE WHEN u.phieu_tra_id IS NOT NULL AND t.trang_thai IS NOT NULL THEN 'tra_' || t.trang_thai ELSE u.trang_thai END AS giai_doan,
      u.trang_thai, u.phieu_tra_id, u.nguoi_sua_chua, u.huong_xu_ly, p.case_id, COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk) AS ma_lk, p.ma_lk AS lk_a, COALESCE(u.ma_lk_nhan, p.ma_lk) AS lk_b, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang,
      p.phieu_gui_id, p.mien, g.nguoi_tao AS ktv, 'unit' AS loai, 1 AS so_luong, p.so_luong_khai AS sl_dat, p.so_luong_thuc_nhan AS sl_duyet
    FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id
    WHERE ${scopeWhere}`;
  const parents = `SELECT p.id, p.id AS parent_id, COALESCE(g.updated_at, p.created_at) AS updated_at, p.created_at,
      CASE WHEN g.trang_thai = 'nhap' THEN 'thung_nhap' WHEN g.trang_thai = 'da_gui' THEN 'thung_dang_gui'
           WHEN g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0 THEN 'thung_cho_admin_nhan' ELSE 'cho_xac_nhan_so_luong' END AS giai_doan,
      p.trang_thai_cha AS trang_thai, NULL AS phieu_tra_id, NULL AS nguoi_sua_chua, NULL AS huong_xu_ly, p.case_id, p.ma_lk, p.ma_lk AS lk_a, p.ma_lk AS lk_b, p.mo_ta_loi, p.ten_khach_hang, p.sdt_khach_hang,
      p.phieu_gui_id, p.mien, g.nguoi_tao AS ktv, 'parent' AS loai, p.so_luong_khai AS so_luong, p.so_luong_khai AS sl_dat, NULL AS sl_duyet
    FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
    WHERE p.trang_thai_cha = 'cho_xac_nhan_so_luong' AND ${scopeWhere}`;
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
  if (st === "qua_han") {
    where += ` AND x.giai_doan IN (${DANG_CHO.map(() => "?").join(",")}) AND x.updated_at < ?`;
    binds.push(...DANG_CHO, slaCutoffVn(24));
  } else if (st) {
    where += " AND x.giai_doan = ?";
    binds.push(st);
  }
  // 21/10/2026: loc KTV gui / NV sua chua / huong xu ly / linh kien / mien.
  const LOC = { ktv: "x.ktv", nv: "x.nguoi_sua_chua", huong_xu_ly: "x.huong_xu_ly", lk_a: "x.lk_a", lk_b: "x.lk_b", lk: "x.ma_lk", mien: "x.mien" };
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, `FROM ${allRowsSql(scopeWhere)} WHERE 1=1`, [...scopeBinds, ...scopeBinds]) });
  // 01/11/2026: loc giai doan (frontend gui 1 giai doan hoac nhom "a,b,c" -> IN).
  const f = joinF(eqFilters(c, { ...LOC, giai_doan: "x.giai_doan" }), timeFilter(c, "x.created_at"), slaFilter(c, "x.updated_at"));
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
  const from = `FROM ${allRowsSql(scopeWhere)} WHERE ${where}`;
  const allBinds = [...scopeBinds, ...scopeBinds, ...binds];
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT x.*, json_extract(s.data, '$.seri_san_pham') AS serial, json_extract(s.data, '$.ngay_mua') AS ngay_mua, json_extract(s.data, '$.ngay_san_xuat') AS ngay_sx FROM ${allRowsSql(scopeWhere)} LEFT JOIN case_lookup_snapshot s ON s.case_id = x.case_id WHERE ${where} ORDER BY x.updated_at DESC LIMIT ? OFFSET ?`).bind(...allBinds, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${from}`).bind(...allBinds).first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

traCuu.get("/tong-quan", async (c) => {
  const user = c.get("user");
  if (!(user.la_giam_sat || user.la_view || user.la_qtri || user.la_admin_bh)) return c.json({ error: "FORBIDDEN" }, 403);
  const { where, binds } = scopeClause(user);
  const from = `FROM ${allRowsSql(where)}`;
  const b2 = [...binds, ...binds];
  const [{ results }, quaHanRow] = await Promise.all([
    c.env.DB.prepare(`SELECT x.giai_doan AS trang_thai, COUNT(*) as cnt ${from} GROUP BY x.giai_doan`).bind(...b2).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${from} WHERE x.giai_doan IN (${DANG_CHO.map(() => "?").join(",")}) AND x.updated_at < ?`)
      .bind(...b2, ...DANG_CHO, slaCutoffVn(24))
      .first<{ cnt: number }>(),
  ]);
  return c.json({ theo_trang_thai: results, qua_han: quaHanRow?.cnt ?? 0 });
});

export default traCuu;
