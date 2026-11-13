import { maKtvCuaEmail, caseThuocKtv, laKtvTaoHo } from "../lib/ktvMa";
import { laCaseHomNay, normCaseId } from "../lib/caseNgay";
import { bumpLinhKienVersion } from "../lib/linhKienVersion";
import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { computeEmailGs, isGsOfKtv, GS_KTV_SUBQUERY } from "../lib/gs";
import { parsePage } from "../lib/pagination";
import { mienOfKtv, mienAllowed, mienScope } from "../lib/mien";
import { lookupCaseEx } from "../lib/caseLookupClient";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tenLkOf, tkThungOf } from "../lib/search";
import { capNhatTimKiem } from "../lib/timKiem";
import { pushBoxToKhovan } from "../lib/khovanPushClient";
import { syncCaseSnapshots } from "../lib/caseSnapshot";
import { AnhLoi, chuanHoaAnh } from "../lib/anhDrive";
import { nhanHoThung } from "../lib/nhanHo";

// Man hinh KTV: tao/quan ly phieu gui, them don, xac nhan gui xe, ghi chu/phan hoi (dung chung voi
// Kho/Admin BH - xem CLAUDE.md "Phan hoi vong 1 muc #5"). Port dung cac ham createPhieuGui()/
// submitAddDon()/confirmGui()/rememberNhaXe() cua prototype-html/index.html.

const phieuGui = new Hono<{ Bindings: Env }>();
phieuGui.use("*", verifySessionMiddleware, loadUser);

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function isKtv(u: { la_ktv_dvbh: boolean; la_ve_tinh: boolean; la_qtri: boolean }) {
  return u.la_ktv_dvbh || u.la_ve_tinh || u.la_qtri;
}
function canReadGhiChu(u: { la_ktv_dvbh: boolean; la_ve_tinh: boolean; la_kho: boolean; la_admin_bh: boolean; la_qtri: boolean; la_giam_sat: boolean; la_view: boolean; la_nv_sua_chua: boolean }) {
  return isKtv(u) || u.la_kho || u.la_admin_bh || u.la_qtri || u.la_giam_sat || u.la_view || u.la_nv_sua_chua;
}
// GS khu vuc cua KTV / Admin bao hanh "tao ho don bao hanh" (yeu cau 05/09/2026 muc 1) - CHOT qua
// AskUserQuestion: nguoi tao ho quan ly duoc TOAN BO thung truoc khi Kho tiep nhan (nhu chinh KTV do),
// dung "nguoi_tao_ho" (bind luc tao, xem migrations/0003) lam khoa xac dinh thay vi kiem tra lai vai
// tro moi lan (giu dung sau khi cac vai tro/khu vuc co the doi).
function canTaoHo(u: { la_giam_sat: boolean; la_admin_bh: boolean; la_qtri: boolean }) {
  return u.la_giam_sat || u.la_admin_bh || u.la_qtri;
}
function ownsPhieuGui(u: { email: string; la_qtri: boolean }, g: { nguoi_tao: string; nguoi_tao_ho: string | null }) {
  return g.nguoi_tao === u.email || g.nguoi_tao_ho === u.email || u.la_qtri;
}

// GET /api/phieu-gui?limit=&offset= - "Phieu gui hang cua toi" (KTV THAT, phieu CHINH MINH so huu) -
// hoac "Phieu tôi đã tạo hộ" (GS/Admin BH/qtri KHONG phai KTV that, loc theo nguoi_tao_ho = chinh
// minh - yeu cau 05/09/2026 muc 1). LUU Y: khong dung isKtv() o day (ham do coi la_qtri nhu 1 KTV vi
// muc dich "di qua moi cong vai tro" o cac route KHAC) - neu dung se khien qtri (khong phai KTV that)
// luon bi loc theo nguoi_tao=chinh email cua ho (khong bao gio khop gi), lam man "Phieu toi da tao
// ho" cua qtri LUON RONG du tao thanh cong (bug that phat hien luc kiem thu, da sua tan goc o day).
phieuGui.get("/", async (c) => {
  const user = c.get("user");
  const { limit, offset } = parsePage(c);
  const isRealKtv = user.la_ktv_dvbh || user.la_ve_tinh;
  // 05/11/2026: KTV thay ca thung minh tao ho KTV khac (nguoi_tao_ho = minh).
  let col: string;
  let colBinds: unknown[];
  // 11/11/2026 ("sao tôi là admin nhưng không tìm thấy thùng hàng này"): ?pham_vi=nhap_ktv - MOI thung
  // nhap KTV dang lam (chua bam gui), de Admin BH / Kho nhan truc tiep (v1.062) hoac nhac KTV gui.
  // Admin / Kho / qtri: theo mien; Giam sat: KTV khu vuc minh phu trach + thung minh tao ho.
  const phamVi = c.req.query("pham_vi");
  if (phamVi === "nhap_ktv" && (user.la_admin_bh || user.la_qtri || user.la_kho)) {
    const ms = mienScope(user, "phieu_gui_bh");
    col = `trang_thai = 'nhap'${ms.sql}`;
    colBinds = ms.binds;
  } else if (phamVi === "nhap_ktv" && user.la_giam_sat) {
    col = `trang_thai = 'nhap' AND (nguoi_tao IN (${GS_KTV_SUBQUERY}) OR nguoi_tao_ho = ?)`;
    colBinds = [user.email, user.email];
  } else if (isRealKtv) { col = "(nguoi_tao = ? OR nguoi_tao_ho = ?)"; colBinds = [user.email, user.email]; }
  else if (canTaoHo(user)) { col = "nguoi_tao_ho = ?"; colBinds = [user.email]; }
  else if (isKtv(user)) { col = "nguoi_tao = ?"; colBinds = [user.email]; } // qtri fallback (khong xay ra thuc te vi canTaoHo() da gom qtri, giu de an toan)
  else return c.json({ error: "FORBIDDEN" }, 403);
  const kw = kwClause(c.req.query("q"), [
    "id", "ma_van_don", "ma_xe_hoac_tai_xe", "don_vi_van_chuyen", "nguoi_tao", tenOf("phieu_gui_bh.nguoi_tao"),
    "(SELECT group_concat(p.id || ' ' || COALESCE(p.case_id,'') || ' ' || COALESCE(p.ma_lk,'') || ' ' || COALESCE(p.mo_ta_loi,''), ' ') FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id)",
  ], [tkThungOf("phieu_gui_bh.id")]);
  // 21/10/2026: bo loc trang thai / hinh thuc gui / KTV (khi tao ho) / mien.
  const LOC = { trang_thai: "trang_thai", hinh_thuc_gui: "hinh_thuc_gui", ktv: "nguoi_tao", mien: "mien" };
  if (c.req.query("loc_only")) {
    return c.json({ loc: await distinctOpts(c.env.DB, LOC, `FROM phieu_gui_bh WHERE ${col}`, colBinds) });
  }
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "created_at"));
  const w = `FROM phieu_gui_bh WHERE ${col}${kw.sql}${f.sql}`;
  const b = [...colBinds, ...kw.binds, ...f.binds];
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT *, (SELECT COUNT(*) FROM phieu_sua_chua_bh p WHERE p.phieu_gui_id = phieu_gui_bh.id) AS so_don ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...b, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${w}`).bind(...b).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
});

// GET /api/phieu-gui/don-cua-toi?nhom=dang|xong&q=&limit=&offset= (30/10/2026, ra soat UX mobile KTV):
// "Đơn của tôi" - 1 dong / don cha cua KTV, GOM CA don trong thung nhap / thung dang tren xe (chua duoc
// Admin tach don vi) - truoc day man Tien do chi tra don vi da tach nen don vua gui "bien mat".
// "xong" = don da tach va moi don vi da ket thuc (huy / chuyen kho / phieu tra KTV da nhan / gui that bai).
const DON_VI_KET_THUC = "(u2.trang_thai IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho') OR EXISTS (SELECT 1 FROM phieu_tra_bh t2 WHERE t2.id = u2.phieu_tra_id AND t2.trang_thai IN ('ktv_da_nhan','gui_that_bai')))";
// 13/11/2026: don cha bi huy theo thung (Admin BH tu choi thung, KTV dong y / qua 7 ngay) -> nhom "Huy / tu choi".
const DON_XONG_SQL = `(p.trang_thai_cha = 'huy_thung' OR (EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u2 WHERE u2.parent_id = p.id) AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u2 WHERE u2.parent_id = p.id AND NOT ${DON_VI_KET_THUC})))`;
// 12/11/2026 - "tách các đơn đã xong riêng ra đơn xong và đơn bị hủy, bị từ chối": don da xong ma MOI don vi
// deu bi huy / tu choi / chuyen kho (khong mon nao tra ve KTV) -> nhom "huy"; con lai (co it nhat 1 mon tra ve) -> "xong".
const DON_HUY_SQL = `(${DON_XONG_SQL} AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u6 WHERE u6.parent_id = p.id AND u6.trang_thai NOT IN ('ket_thuc_tu_choi','ket_thuc_chuyen_kho')))`;
const DON_XONG_THAT_SQL = `(${DON_XONG_SQL} AND NOT ${DON_HUY_SQL})`;
phieuGui.get("/don-cua-toi", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const nhom = c.req.query("nhom");
  const nhomSql = nhom === "xong" ? DON_XONG_THAT_SQL : nhom === "huy" ? DON_HUY_SQL : `NOT ${DON_XONG_SQL}`;
  const base = "FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE g.nguoi_tao = ?";
  const kw = kwClause(c.req.query("q"), [
    "p.id", "p.case_id", "p.ma_lk", "p.mo_ta_loi", "p.phieu_gui_id", tenLkOf("p.ma_lk"),
    "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)",
    "(SELECT group_concat(u3.id, ' ') FROM phieu_sua_chua_bh_ct u3 WHERE u3.parent_id = p.id)",
  ], ["p.tim_kiem"]);
  const f = joinF(eqFilters(c, { lk: "p.ma_lk" }), timeFilter(c, "p.created_at"));
  const w = `${base} AND ${nhomSql}${kw.sql}${f.sql}`;
  const b = [user.email, ...kw.binds, ...f.binds];
  const CAN_BO_SUNG = "EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u4 WHERE u4.parent_id = p.id AND u4.trang_thai = 'cho_bo_sung_tt')";
  const [{ results }, totalRow, dangRow, xongRow, huyRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.id, p.case_id, p.ma_lk, p.mo_ta_loi, p.so_luong_khai, p.phieu_gui_id, p.odoo_id, p.created_at, p.case_xac_minh,
         g.trang_thai AS gui_trang_thai, g.ngay_gui_xe, g.updated_at AS gui_updated_at,
         (SELECT json_extract(cs.data, '$.khach_hang') FROM case_lookup_snapshot cs WHERE cs.case_id = p.case_id) AS khach_hang,
         (SELECT json_group_array(json_object('id', u.id, 'trang_thai', u.trang_thai, 'huong_xu_ly', u.huong_xu_ly, 'ly_do_bo_sung', u.ly_do_bo_sung,
            'updated_at', u.updated_at, 'ma_lk_nhan', u.ma_lk_nhan, 'ma_lk_thuc_te', u.ma_lk_thuc_te, 'phieu_tra_id', u.phieu_tra_id, 'tra_trang_thai', t.trang_thai, 'ktv_thieu', u.ktv_thieu, 'that_lac', u.that_lac))
          FROM phieu_sua_chua_bh_ct u LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id WHERE u.parent_id = p.id) AS don_vi_json,
         ${CAN_BO_SUNG} AS can_bo_sung,
         COALESCE((SELECT MAX(u5.updated_at) FROM phieu_sua_chua_bh_ct u5 WHERE u5.parent_id = p.id), g.updated_at) AS cap_nhat
       ${w} ORDER BY can_bo_sung DESC, cap_nhat DESC LIMIT ? OFFSET ?`,
    ).bind(...b, limit, offset).all<Record<string, unknown>>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${w}`).bind(...b).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${base} AND NOT ${DON_XONG_SQL}`).bind(user.email).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${base} AND ${DON_XONG_THAT_SQL}`).bind(user.email).first<{ cnt: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${base} AND ${DON_HUY_SQL}`).bind(user.email).first<{ cnt: number }>(),
  ]);
  const don = results.map(({ don_vi_json, ...r }) => ({ ...r, don_vi: JSON.parse((don_vi_json as string) || "[]") }));
  return c.json({ don, total: totalRow?.cnt ?? 0, so_dang: dangRow?.cnt ?? 0, so_xong: xongRow?.cnt ?? 0, so_huy: huyRow?.cnt ?? 0 });
});

interface CreatePhieuBody {
  // Neu co (yeu cau 05/09/2026 muc 1): GS/Admin BH "tao ho" phieu cho dung KTV nay - bat buoc chon
  // luc tao thung, khong doi duoc sau. Bo trong/= chinh minh => tao binh thuong nhu truoc (KTV tu
  // tao cho chinh minh), khong doi hanh vi cu.
  ktv_email?: string;
}

// POST /api/phieu-gui - tao phieu nhap moi, tu dien nha xe theo lan gan nhat CUA DUNG KTV so huu
// thung (khong phai nguoi bam tao, neu la tao ho) - thay the DB.meta.nhaXeHistory cua prototype bang
// truy van "ban ghi gan nhat", khong can bang rieng.
phieuGui.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<CreatePhieuBody>().catch(() => ({}) as CreatePhieuBody);
  const ktvEmailReq = body.ktv_email?.trim();

  let target: string;
  let nguoiTaoHo: string | null;
  if (ktvEmailReq && ktvEmailReq !== user.email) {
    // 05/11/2026: KTV duoc Admin cho tao don ho KTV khac (Quan tri > Danh sach KTV).
    const laTaoHoKtv = (user.la_ktv_dvbh || user.la_ve_tinh) && (await laKtvTaoHo(c.env.DB, user.email, ktvEmailReq));
    if (!canTaoHo(user) && !laTaoHoKtv) return c.json({ error: "FORBIDDEN" }, 403);
    const ktvRow = await c.env.DB.prepare("SELECT ma_ktv, khu_vuc_ma, vai_tro_ktv, ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?")
      .bind(ktvEmailReq)
      .first<{ ma_ktv: string; khu_vuc_ma: string | null; vai_tro_ktv: string | null; ten_hien_thi: string | null }>();
    if (!ktvRow) return c.json({ error: "KTV_NOT_FOUND" }, 404);
    // GS chi tao ho duoc trong dung Khu vuc minh phu trach (khop qua khu_vuc_bh.gs_email) - Admin
    // BH/qtri khong bi gioi han khu vuc (dung nguyen van yeu cau "hoặc Admin bảo hành", khong dieu
    // kien them).
    if (!laTaoHoKtv && user.la_giam_sat && !user.la_admin_bh && !user.la_qtri) {
      if (!(await isGsOfKtv(c.env.DB, user.email, ktvEmailReq))) return c.json({ error: "OUT_OF_KHU_VUC" }, 403);
    }
    // "tao ho" duoc phep cho ca KTV CHUA TUNG dang nhap (danh ba ktv_lien_he_bh, CHOT qua
    // AskUserQuestion 05/09/2026) - nhung phieu_gui_bh.nguoi_tao co FOREIGN KEY REFERENCES
    // users(email) (migrations/0001), ma bang users CHI co dong khi nguoi do da tung dang nhap that
    // (xem auth.ts GET /callback) -> INSERT phieu_gui_bh se vo FK neu KTV chua co dong users, gay
    // INTERNAL_ERROR (bug that phat hien 07/09/2026 qua wrangler tail). Sua: tu cap phat truoc 1 dong
    // users toi thieu neu chua co (KHONG dung neu da co - tranh ghi de tai khoan da cau hinh/dang
    // nhap that), dung DUNG mau ktvMatch cua auth.ts de nhat quan khi KTV do sau nay tu dang nhap that.
    const laVeTinh = ktvRow.vai_tro_ktv === "Ve tinh" ? 1 : 0;
    await c.env.DB.prepare(
      `INSERT INTO users (email, ten, trang_thai_duyet, la_ktv_dvbh, la_ve_tinh)
       VALUES (?, ?, 'Da duyet', ?, ?)
       ON CONFLICT(email) DO NOTHING`,
    )
      .bind(ktvEmailReq, ktvRow.ten_hien_thi ?? null, laVeTinh ? 0 : 1, laVeTinh)
      .run();
    target = ktvEmailReq;
    nguoiTaoHo = user.email;
  } else {
    if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
    target = user.email;
    nguoiTaoHo = null;
  }

  // Tu dien phuong an gui hang theo LUA CHON THAT lan gan nhat cua KTV (05/10/2026 muc 4): uu tien
  // ktv_nha_xe_bh (ghi moi lan KTV luu/xac nhan gui), chua co thi lay phieu DA GUI gan nhat - KHONG lay
  // phieu nhap (phieu nhap moi tao chi mang gia tri mac dinh, chep lai se "quen" lua chon cua KTV).
  const last =
    (await c.env.DB.prepare("SELECT hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen FROM ktv_nha_xe_bh WHERE email = ?")
      .bind(target)
      .first<{ hinh_thuc_gui: string | null; ma_xe_hoac_tai_xe: string | null; don_vi_van_chuyen: string | null }>()) ??
    (await c.env.DB.prepare(
      "SELECT hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen FROM phieu_gui_bh WHERE nguoi_tao = ? AND trang_thai <> 'nhap' AND COALESCE(hinh_thuc_gui, '') <> '' ORDER BY created_at DESC LIMIT 1",
    )
      .bind(target)
      .first<{ hinh_thuc_gui: string | null; ma_xe_hoac_tai_xe: string | null; don_vi_van_chuyen: string | null }>());

  const id = await nextSequentialId(c.env.DB, "phieu_gui_bh", "BH");
  const now = nowVN();
  await c.env.DB.prepare(
    `INSERT INTO phieu_gui_bh (id, nguoi_tao, nguoi_tao_ho, ngay_tao, ngay_gui_xe, hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, trang_thai, created_at, updated_at, mien)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nhap', ?, ?, ?)`,
  )
    .bind(id, target, nguoiTaoHo, now.slice(0, 10), now.slice(0, 10), last?.hinh_thuc_gui || "xe_noi_bo", last?.ma_xe_hoac_tai_xe ?? "", last?.don_vi_van_chuyen ?? "", now, now, await mienOfKtv(c.env.DB, target))
    .run();
  await addLog(c.env.DB, "phieu_gui", id, null, "nhap", user.email, nguoiTaoHo ? `Tạo phiếu mới (tạo hộ cho KTV ${target})` : "Tạo phiếu mới");

  // KHONG day khovan ngay luc nay nua (07/09/2026, phan hoi "dang tao ra 1 dong phieu nhap thua") -
  // phieu "nhap" moi tao co the bi bo do/tu dong xoa (xem DELETE /:id va frontend auto-cleanup o
  // PhieuGuiDetailModal) neu KTV dong modal ma chua them don nao. Day sang khovan CHI khi KTV that su
  // xac nhan da gui xe (xem POST /:id/xac-nhan-gui ben duoi) - vua dung dung muc dich cua khovan
  // ("bao truoc hang SAP VE that"), vua giai quyet luon cau hoi "phieu nhap bi huy co bao sang khovan
  // khong": khong can bao huy, vi phieu nhap chua tung duoc bao cho khovan tu dau.

  return c.json({ id }, 201);
});

// DELETE /api/phieu-gui/:id - chi xoa duoc khi con "nhap" VA khong co don con nao (xem CLAUDE.md
// "Phan hoi vong 1 muc #3").
phieuGui.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT * FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
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
  // 21/10/2026: "khu vực gửi hàng bảo hành (khu vực động - KTV khu vực MB nhưng lại gửi hàng ra MN sửa
  // chữa)" - mien kho nhan thung. "" = theo khu vuc cua KTV; "MB"/"MN" = chon tay. Bo qua neu khong gui.
  mien_gui?: string;
}

// PATCH /api/phieu-gui/:id - luu header (khong con truong "ghi_chu" don dong - da bo theo CLAUDE.md
// "Phan hoi vong 3 muc 1", thay bang khu vuc ghi_chu_log rieng).
phieuGui.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho, trang_thai, mien FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string; mien: string | null }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<HeaderBody>().catch(() => ({}) as HeaderBody);
  // Mien gui ve (chi khi thung con nhap): ap cho ca thung + cac don cha ben trong.
  if (body.mien_gui !== undefined && g.trang_thai === "nhap") {
    const moi = body.mien_gui === "MB" || body.mien_gui === "MN" ? body.mien_gui : await mienOfKtv(c.env.DB, g.nguoi_tao);
    if (moi !== g.mien) {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE phieu_gui_bh SET mien = ? WHERE id = ?").bind(moi, id),
        c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET mien = ? WHERE phieu_gui_id = ?").bind(moi, id),
      ]);
      const lbl = (m: string | null) => (m === "MB" ? "Miền Bắc" : m === "MN" ? "Miền Nam" : "Chưa khai báo");
      await addLog(c.env.DB, "phieu_gui", id, g.trang_thai, g.trang_thai, user.email, `Đổi miền gửi về: ${lbl(g.mien)} → ${lbl(moi)}${body.mien_gui ? " (chọn tay, khác khu vực của KTV)" : " (theo khu vực của KTV)"}`);
    }
  }
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET hinh_thuc_gui = ?, ma_xe_hoac_tai_xe = ?, don_vi_van_chuyen = ?, ma_van_don = ?, updated_at = ? WHERE id = ?")
    .bind(body.hinh_thuc_gui ?? "", body.ma_xe_hoac_tai_xe ?? "", body.don_vi_van_chuyen ?? "", body.ma_van_don ?? "", nowVN(), id)
    .run();
  // Luu vet phuong an gui hang cua KTV so huu thung (muc 4) - lan tao phieu sau tu dien lai.
  if (body.hinh_thuc_gui) {
    await c.env.DB.prepare(
      `INSERT INTO ktv_nha_xe_bh (email, hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET hinh_thuc_gui = excluded.hinh_thuc_gui, ma_xe_hoac_tai_xe = excluded.ma_xe_hoac_tai_xe,
         don_vi_van_chuyen = excluded.don_vi_van_chuyen, updated_at = excluded.updated_at`,
    )
      .bind(g.nguoi_tao, body.hinh_thuc_gui, body.ma_xe_hoac_tai_xe ?? "", body.don_vi_van_chuyen ?? "", nowVN())
      .run();
  }
  return c.json({ ok: true });
});

// POST /api/phieu-gui/:id/nhan-thung-nhap (02/11/2026) - Kho / Admin BH nhan TRUC TIEP thung con NHAP
// cua KTV (KTV giao tan tay, chua bam "Xac nhan gui"). Bo qua buoc gui. vai_tro:
//  - "kho"  : nhap -> da_tiep_nhan (cho Admin BH tiep nhan noi bo nhu binh thuong)
//  - "admin": nhap -> da_tiep_nhan + admin_tiep_nhan = 1 (bo qua ca Kho), tuy chon tu xac nhan SL.
// Khong bao sang khovan (thung chua tung duoc bao, hang da ve tay).
phieuGui.post("/:id/nhan-thung-nhap", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req
    .json<{ vai_tro?: string; ghi_chu?: string; tu_xac_nhan_sl?: boolean; ngay_gui_xe?: string; hinh_thuc_gui?: string; ma_xe_hoac_tai_xe?: string; don_vi_van_chuyen?: string; ma_van_don?: string }>()
    .catch(() => ({}) as Record<string, never>);
  const vaiTro = body.vai_tro === "kho" ? "kho" : "admin";
  if (vaiTro === "kho" && !(user.la_kho || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  if (vaiTro === "admin" && !(user.la_admin_bh || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const g = await c.env.DB.prepare("SELECT trang_thai, mien FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; mien: string | null }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  if (!mienAllowed(user, g.mien)) return c.json({ error: "FORBIDDEN" }, 403);
  const donCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh WHERE phieu_gui_id = ?").bind(id).first<{ cnt: number }>();
  if ((donCount?.cnt ?? 0) === 0) return c.json({ error: "EMPTY_PHIEU" }, 400);

  const now = nowVN();
  const ghiChu = body.ghi_chu?.trim() ? " | " + body.ghi_chu.trim().slice(0, 1000) : "";
  const s = (v?: string) => (typeof v === "string" ? v.trim().slice(0, 200) : null);
  await c.env.DB.prepare(
    `UPDATE phieu_gui_bh SET trang_thai = 'da_gui', ngay_gui_xe = ?,
       hinh_thuc_gui = COALESCE(?, hinh_thuc_gui), ma_xe_hoac_tai_xe = COALESCE(?, ma_xe_hoac_tai_xe),
       don_vi_van_chuyen = COALESCE(?, don_vi_van_chuyen), ma_van_don = COALESCE(?, ma_van_don), updated_at = ? WHERE id = ?`,
  )
    .bind(body.ngay_gui_xe || now.slice(0, 10), s(body.hinh_thuc_gui) || null, s(body.ma_xe_hoac_tai_xe), s(body.don_vi_van_chuyen), s(body.ma_van_don), now, id)
    .run();
  const ai = vaiTro === "kho" ? "Kho" : "Admin BH";
  await addLog(c.env.DB, "phieu_gui", id, "nhap", "da_gui", user.email, `${ai} nhận trực tiếp thùng nháp của KTV (bỏ qua bước gửi)` + ghiChu);

  if (vaiTro === "kho") {
    await c.env.DB.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_tiep_nhan', nguoi_nhan_kho = ?, thoi_gian_nhan_kho = ?, updated_at = ? WHERE id = ?").bind(user.email, now, now, id).run();
    await addLog(c.env.DB, "phieu_gui", id, "da_gui", "da_tiep_nhan", user.email, "Kho xác nhận đã nhận (nhận trực tiếp thùng nháp)");
    return c.json({ ok: true, vai_tro: "kho" });
  }
  const r = await nhanHoThung(c.env.DB, id, user.email, {
    tuXacNhanSL: !!body.tu_xac_nhan_sl,
    ghiChu: "Admin BH nhận trực tiếp thùng nháp — bỏ qua Kho tiếp nhận + tiếp nhận nội bộ",
  });
  if ("error" in r) return c.json(r, 400);
  return c.json({ ok: true, vai_tro: "admin", so_don_vi: r.so_don_vi });
});

// POST /api/phieu-gui/:id/xac-nhan-gui - "nhap" -> "da_gui", cho phep sua lai ngay gui xe. Day
// khovan O DAY (khong phai luc tao phieu nua, xem comment o POST "/" phia tren) - dung dung thoi
// diem "hang THAT SU sap ve" ma khovan can biet truoc.
phieuGui.post("/:id/xac-nhan-gui", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  // QA 04/10/2026: chan gui thung RONG (truoc day cho qua -> Kho nhan 1 thung trong, khovan cung bi
  // bao 1 thung trong). Frontend da an nut khi 0 don, day la chot chan o backend.
  const donCount = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh WHERE phieu_gui_id = ?").bind(id).first<{ cnt: number }>();
  if ((donCount?.cnt ?? 0) === 0) return c.json({ error: "EMPTY_PHIEU" }, 400);
  const body = await c.req.json<{ ngay_gui_xe?: string }>().catch(() => ({}) as { ngay_gui_xe?: string });
  await c.env.DB.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_gui', ngay_gui_xe = ?, updated_at = ? WHERE id = ?")
    .bind(body.ngay_gui_xe || nowVN().slice(0, 10), nowVN(), id)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, "nhap", "da_gui", user.email, "Xác nhận đã gửi xe");

  // 20/10/2026: thung do Admin BH tao ho -> bo qua Kho + tiep nhan noi bo + xac nhan SL, vao thang phan loai.
  // Khong bao sang khovan (Kho khong can nhan thung nay).
  if ((user.la_admin_bh || user.la_qtri) && g.nguoi_tao_ho === user.email && user.email !== g.nguoi_tao) {
    const r = await nhanHoThung(c.env.DB, id, user.email, { tuXacNhanSL: true, ghiChu: "Admin BH tạo hộ — tự bỏ qua Kho tiếp nhận + tiếp nhận nội bộ" });
    return c.json({ ok: true, tu_tiep_nhan: true, so_don_vi: "error" in r ? 0 : r.so_don_vi });
  }

  const ktvInfo = await c.env.DB.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(g.nguoi_tao).first<{ ten_hien_thi: string | null }>();
  await pushBoxToKhovan(c.env, id, ktvInfo?.ten_hien_thi || g.nguoi_tao, g.nguoi_tao);

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
  // Goi y go nhanh (05/10/2026 muc 4): ma xe / don vi van chuyen KTV nay tung dung (8 gia tri gan nhat).
  let goiY: { ma_xe: string[]; dvvc: string[] } | undefined;
  if ((g as { trang_thai: string }).trang_thai === "nhap") {
    const [mx, dv] = await Promise.all([
      c.env.DB.prepare("SELECT ma_xe_hoac_tai_xe AS v, MAX(created_at) AS t FROM phieu_gui_bh WHERE nguoi_tao = ? AND COALESCE(ma_xe_hoac_tai_xe, '') <> '' GROUP BY 1 ORDER BY t DESC LIMIT 8").bind(gRow.nguoi_tao).all<{ v: string }>(),
      c.env.DB.prepare("SELECT don_vi_van_chuyen AS v, MAX(created_at) AS t FROM phieu_gui_bh WHERE nguoi_tao = ? AND COALESCE(don_vi_van_chuyen, '') <> '' GROUP BY 1 ORDER BY t DESC LIMIT 8").bind(gRow.nguoi_tao).all<{ v: string }>(),
    ]);
    goiY = { ma_xe: mx.results.map((r) => r.v), dvvc: dv.results.map((r) => r.v) };
  }
  // 10/10/2026 (thiet ke lai UI chi tiet): nhat ky phieu gui + tien do tung don cha (dem don vi theo
  // trang thai) de KTV/Kho/Admin thay ngay don nao dang o buoc nao ma khong phai mo tung don.
  const [{ results: logs }, { results: tienDo }] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM logs_bh WHERE entity_type = 'phieu_gui' AND entity_id = ? ORDER BY thoi_gian DESC").bind(id).all(),
    c.env.DB.prepare(
      // 31/10/2026: kem trang thai phieu tra - don da tra / KTV da nhan khong con hien "dang chuan bi tra".
      `SELECT u.parent_id, u.trang_thai, t.trang_thai AS tra_trang_thai, COUNT(*) AS n FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id
       WHERE p.phieu_gui_id = ? GROUP BY u.parent_id, u.trang_thai, t.trang_thai`,
    )
      .bind(id)
      .all(),
  ]);
  // mien_ktv: mien theo khu vuc cua KTV so huu thung - de UI biet thung dang "theo khu vuc" hay gui khac mien.
  const mienKtv = await mienOfKtv(c.env.DB, (g as { nguoi_tao: string }).nguoi_tao);
  return c.json({ phieu_gui: g, don_cha: donCha, ghi_chu_log: ghiChu, goi_y: goiY, logs, tien_do: tienDo, mien_ktv: mienKtv });
});

interface AddDonBody {
  case_id?: string | null;
  ma_lk?: string | null;
  so_luong_khai?: number;
  mo_ta_loi?: string;
  loai_doi_tru_de_xuat?: "doi_tra" | "tru_cong_no";
  // Anh chup linh kien loi luc tao don (KTV, thuong tu camera dien thoai) - luu vao
  // phieu_sua_chua_bh_anh (parent_id). Bang nay da co san trong schema tu Giai doan 1 va DA duoc
  // Admin BH doc lai (GET /admin/don-vi/:id) nhung CHUA tung co route ghi - gap that phat hien o
  // "QA vong 3" (nguoi dung hoi "chuc nang tao shortcut... co bo sot gi khong").
  anh?: string[];
  // 05/10/2026 muc 9: Admin BH / Giam sat (/qtri) tao don HO xac nhan tao don du case thuoc KTV khac.
  xac_nhan_khac_ktv?: boolean;
  // 30/10/2026: he DVBH loi/khong phan hoi -> nguoi tao tich "van tao, xac minh sau" (cron xac minh lai).
  xac_nhan_chua_xac_minh?: boolean;
}

// POST /api/phieu-gui/:id/don - them 1 don (phieu_sua_chua_bh) vao phieu gui, port dung
// submitAddDon() - chan so_luong_khai <=0 (bug that da sua trong prototype QA 31/08/2026). Yeu cau
// 05/09/2026 muc 2 ("Mã sự cố là bắt buộc... phải đúng của ktv đó mới cho tạo"): case_id nay BAT
// BUOC, phai tra ve duoc case that + khop dung KTV SO HUU THUNG (g.nguoi_tao - luon la KTV, bat ke ai
// dang bam them don, ke ca nguoi tao ho) - CHOT strict qua AskUserQuestion: khong tach duoc ma KTV tu
// case, hoac KTV khong co trong danh ba de doi chieu, deu bi chan (khong cho tao), khac tien le
// "canh bao mem" cua linh-kien-app.
phieuGui.post("/:id/don", async (c) => {
  const user = c.get("user");
  const guiId = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);

  const body = await c.req.json<AddDonBody>().catch(() => ({}) as AddDonBody);
  const soLuong = body.so_luong_khai ?? 1;
  if (!Number.isInteger(soLuong) || soLuong < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  if (!body.mo_ta_loi?.trim()) return c.json({ error: "MISSING_MO_TA_LOI" }, 400);
  const caseId = normCaseId(body.case_id) || undefined;
  if (!caseId) return c.json({ error: "MISSING_CASE_ID" }, 400);

  // 30/10/2026: tach "khong tim thay case" (chan cung) voi "DVBH loi / khong phan hoi" (cho tao neu nguoi
  // dung tich xac nhan, gan co case_xac_minh = 1, cron xac minh lai - lib/caseSnapshot.ts verifyPendingCases).
  const lk = await lookupCaseEx(caseId, c.env);
  // 03/11/2026: case trong ngay (SC + YYMMDD hom nay) chua dong bo kip sang DVBH -> cho tao, chua xac minh.
  const choDongBo = lk.status === "not_found" && laCaseHomNay(caseId);
  if (lk.status === "not_found" && !choDongBo) return c.json({ error: "CASE_NOT_FOUND" }, 400);
  const chuaXacMinh = lk.status === "error" || choDongBo;
  if (lk.status === "error" && body.xac_nhan_chua_xac_minh !== true) return c.json({ error: "DVBH_KHONG_PHAN_HOI" }, 400);
  const casePreview = lk.status === "found" ? lk.preview : null;
  let lechKtv = false;
  if (casePreview) {
    lechKtv = !(await caseThuocKtv(c.env.DB, casePreview, g.nguoi_tao));
  }
  // Chi nguoi tao HO (khong phai chinh KTV so huu thung) co quyen tao ho moi duoc xac nhan vuot qua.
  const duocVuot = (user.la_admin_bh || user.la_giam_sat || user.la_qtri) && user.email !== g.nguoi_tao;
  if (lechKtv && !(duocVuot && body.xac_nhan_khac_ktv === true)) return c.json({ error: "CASE_KTV_MISMATCH" }, 400);
  const xacNhanKhac = lechKtv ? user.email : null;

  // 12/11/2026: anh luu tren Google Drive (lib/anhDrive.ts), D1 chi giu link - tai TRUOC khi tao don de loi anh khong tao don thieu anh.
  let anhUrls: string[];
  try {
    anhUrls = await chuanHoaAnh(c.env, body.anh, `don_${guiId}`);
  } catch (e) {
    return c.json({ error: e instanceof AnhLoi ? e.code : "UPLOAD_FAILED" }, 400);
  }
  const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
  // email_gs phai tinh theo KTV SO HUU thung (g.nguoi_tao), KHONG phai user.email dang thao tac - o
  // ban truoc 2 gia tri nay luon trung (chi chinh KTV moi them duoc don cho phieu cua ho), nhung tu
  // khi co "tao ho" (nguoi_tao_ho co the la GS/Admin BH, khong co dong ktv_lien_he_bh nao ca) thi
  // dung user.email se luon tra ve NULL - da sua tan goc, khong chi vá luc them "tao ho".
  const emailGs = await computeEmailGs(c.env.DB, g.nguoi_tao);
  await c.env.DB.prepare(
    `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, so_luong_khai, loai_doi_tru_de_xuat, nguon_tao, trang_thai_cha, email_gs, xac_nhan_khac_ktv, ktv_tren_case, created_at, mien, case_xac_minh)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ktv', 'cho_xac_nhan_so_luong', ?, ?, ?, ?, (SELECT mien FROM phieu_gui_bh WHERE id = ?), ?)`,
  )
    .bind(id, guiId, caseId, body.ma_lk || null, body.mo_ta_loi.trim(), soLuong, body.loai_doi_tru_de_xuat || "doi_tra", emailGs, xacNhanKhac, casePreview?.ky_thuat_vien ?? null, nowVN(), guiId, chuaXacMinh ? 1 : 0)
    .run();
  if (xacNhanKhac) {
    await addLog(c.env.DB, "phieu_sc", id, null, "cho_xac_nhan_so_luong", user.email, `Xác nhận tạo đơn cho KTV ${g.nguoi_tao} dù case thuộc người khác (KTV trên case: ${casePreview?.ky_thuat_vien || "không xác định"})`);
  }
  if (chuaXacMinh) {
    await addLog(c.env.DB, "phieu_sc", id, null, "cho_xac_nhan_so_luong", user.email, choDongBo
      ? `⚠ Mã case ${caseId} chưa có trên DVBH (case trong ngày, có thể chưa kịp đồng bộ) — CHƯA được xác minh, hệ thống sẽ tự xác minh lại`
      : `Tạo đơn khi hệ DVBH không phản hồi — mã case ${caseId} CHƯA được xác minh, hệ thống sẽ tự xác minh lại`);
  }
  // Luu "bang chung" case luc tao don (yeu cau muc 2) - dung 1 bang cache dung chung
  // case_lookup_snapshot (khong phai rieng tren dong don) de moi don khac cung case_id deu doc lai
  // duoc, va Admin BH bam "dong bo lai" (POST /case-lookup/detail/:id/sync) lam moi duoc cho ca nhom.
  if (casePreview) {
    await c.env.DB.prepare(
      "INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at",
    )
      .bind(caseId, JSON.stringify(casePreview), nowVN())
      .run();
  }
  if (anhUrls.length > 0) {
    await c.env.DB.batch(anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_anh (parent_id, anh_url) VALUES (?, ?)").bind(id, url)));
  }
  c.executionCtx.waitUntil(capNhatTimKiem(c.env.DB, [id]).catch(() => 0));
  return c.json({ id }, 201);
});

// POST /api/phieu-gui/:id/don-tu-odoo - { odoo_ids: number[] } - KTV chon don bao hanh tao tren Odoo
// (keo ve qua dvbh, xem lib/odooSync.ts) dua vao thung (yeu cau 04/10/2026, CHOT "KTV chon don vao
// thung"). Moi don Odoo -> 1 don cha, tu dien ma ca/linh kien/so luong/mo ta. Thay cho cong case-lookup
// cua POST /:id/don: don Odoo da gan san ma ca + KTV phu trach (tu case_dvbh), chi can kiem tra ma KTV
// cua don khop KTV so huu thung. Linh kien chua co trong danh muc bao hanh -> tu them dong "noi_bo"
// (FK phieu_sua_chua_bh.ma_lk) de giu dung linh kien Odoo thay vi bo trong.
phieuGui.post("/:id/don-tu-odoo", async (c) => {
  const user = c.get("user");
  const guiId = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
  if (g.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);

  const body = await c.req.json<{ odoo_ids?: number[] }>().catch(() => ({}) as { odoo_ids?: number[] });
  const ids = [...new Set((body.odoo_ids || []).map(Number).filter((x) => Number.isInteger(x) && x > 0))].slice(0, 100);
  if (ids.length === 0) return c.json({ error: "MISSING_ODOO_IDS" }, 400);
  const maCuaKtv = await maKtvCuaEmail(c.env.DB, g.nguoi_tao);
  if (!maCuaKtv.length) return c.json({ error: "CASE_KTV_MISMATCH" }, 400);

  const { results: rows } = await c.env.DB.prepare(
    `SELECT o.*, (SELECT p.id FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id) AS da_gan FROM don_bh_odoo o WHERE o.odoo_id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(...ids)
    .all<{ odoo_id: number; ma_don: string | null; case_id: string | null; ma_linh_kien: string | null; ten_linh_kien: string | null; so_luong: number | null; trang_thai: string | null; tinh_trang_loi: string | null; ghi_chu: string | null; con_hieu_luc: number; ma_ktv: string | null; ma_ktv_tk: string | null; da_gan: string | null; khong_gui_boi: string | null }>();

  const loi: { odoo_id: number; error: string }[] = [];
  const ok = rows.filter((r) => {
    let e: string | null = null;
    if (r.da_gan) e = "DA_GAN_THUNG";
    else if (r.khong_gui_boi) e = "ODOO_KHONG_GUI";
    else if (!r.con_hieu_luc || !["new", "repairing"].includes(r.trang_thai || "")) e = "KHONG_CON_CHO_GUI";
    else if (!((r.ma_ktv && maCuaKtv.includes(r.ma_ktv)) || (r.ma_ktv_tk && maCuaKtv.includes(r.ma_ktv_tk)))) e = "CASE_KTV_MISMATCH";
    else if (!r.case_id) e = "MISSING_CASE_ID";
    if (e) loi.push({ odoo_id: r.odoo_id, error: e });
    return !e;
  });
  for (const id of ids) if (!rows.some((r) => r.odoo_id === id)) loi.push({ odoo_id: id, error: "NOT_FOUND" });

  const emailGs = await computeEmailGs(c.env.DB, g.nguoi_tao);
  const now = nowVN();
  const created: string[] = [];
  for (const r of ok) {
    if (r.ma_linh_kien) {
      const ins = await c.env.DB.prepare("INSERT INTO linh_kien_bh (ma_lk, ten_lk, nguon_du_lieu, ghi_chu) VALUES (?, ?, 'noi_bo', 'Tự thêm từ đơn bảo hành Odoo') ON CONFLICT(ma_lk) DO NOTHING")
        .bind(r.ma_linh_kien, r.ten_linh_kien || r.ma_linh_kien)
        .run();
      if (ins.meta.changes) await bumpLinhKienVersion(c.env.DB);
    }
    const moTa = [r.tinh_trang_loi, r.ghi_chu].filter((x) => x && x.trim()).join(" — ") || `Lỗi ${r.ten_linh_kien || "linh kiện"}`;
    const soLuong = Math.max(1, Math.round(Number(r.so_luong) || 1));
    const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
    await c.env.DB.prepare(
      `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, ghi_chu, so_luong_khai, loai_doi_tru_de_xuat, nguon_tao, trang_thai_cha, email_gs, odoo_id, created_at, mien)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'doi_tra', 'ktv', 'cho_xac_nhan_so_luong', ?, ?, ?, (SELECT mien FROM phieu_gui_bh WHERE id = ?))`,
    )
      .bind(id, guiId, r.case_id, r.ma_linh_kien || null, moTa, r.ma_don ? `Đơn Odoo ${r.ma_don}` : null, soLuong, emailGs, r.odoo_id, now, guiId)
      .run();
    created.push(id);
  }
  if (created.length > 0) await addLog(c.env.DB, "phieu_gui", guiId, "nhap", "nhap", user.email, `Thêm ${created.length} đơn từ Odoo: ${ok.map((r) => r.ma_don || r.odoo_id).join(", ")}`);
  // 20/10/2026: luu bang chung case tu dvbh ngay khi tao don (chay nen, khong lam cham thao tac).
  if (created.length > 0) c.executionCtx.waitUntil(syncCaseSnapshots(c.env, ok.map((r) => r.case_id)).catch(() => 0));
  return c.json({ created, loi }, created.length > 0 ? 201 : 400);
});

// DELETE /api/phieu-gui-don/:id - xoa 1 don CHUA gui (phieu cha van "nhap").
// 31/10/2026: sua 1 don trong thung NHAP (bam vao don): doi linh kien KTV chon (A, VD linh kien mac dinh tu
// Odoo bi sai), so luong, mo ta loi, loai doi tru de xuat. Chi khi thung con nhap (chua gui).
phieuGui.patch("/don/:donId", async (c) => {
  const user = c.get("user");
  const donId = c.req.param("donId");
  const don = await c.env.DB.prepare(
    `SELECT p.ma_lk, p.so_luong_khai, p.mo_ta_loi, p.loai_doi_tru_de_xuat, g.nguoi_tao, g.nguoi_tao_ho, g.trang_thai
     FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?`,
  )
    .bind(donId)
    .first<{ ma_lk: string | null; so_luong_khai: number; mo_ta_loi: string | null; loai_doi_tru_de_xuat: string | null; nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!don) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, don)) return c.json({ error: "FORBIDDEN" }, 403);
  if (don.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  const body = await c.req.json<{ ma_lk?: string; so_luong_khai?: number; mo_ta_loi?: string; loai_doi_tru_de_xuat?: string }>().catch(() => ({}) as Record<string, never>);
  const set: string[] = [];
  const binds: unknown[] = [];
  const doi: string[] = [];
  if (body.ma_lk !== undefined && body.ma_lk !== don.ma_lk) {
    const lk = await c.env.DB.prepare("SELECT ma_lk FROM linh_kien_bh WHERE ma_lk = ?").bind(body.ma_lk).first();
    if (!lk) return c.json({ error: "INVALID_LINH_KIEN" }, 400);
    set.push("ma_lk = ?"); binds.push(body.ma_lk); doi.push(`linh kiện ${don.ma_lk ?? "—"} → ${body.ma_lk}`);
  }
  if (body.so_luong_khai !== undefined && Number(body.so_luong_khai) !== don.so_luong_khai) {
    const sl = Math.floor(Number(body.so_luong_khai));
    if (!Number.isFinite(sl) || sl < 1 || sl > 999) return c.json({ error: "INVALID_SO_LUONG" }, 400);
    set.push("so_luong_khai = ?"); binds.push(sl); doi.push(`số lượng ${don.so_luong_khai} → ${sl}`);
  }
  if (body.mo_ta_loi !== undefined && body.mo_ta_loi.trim() !== (don.mo_ta_loi ?? "")) {
    if (!body.mo_ta_loi.trim()) return c.json({ error: "MISSING_MO_TA_LOI" }, 400);
    set.push("mo_ta_loi = ?"); binds.push(body.mo_ta_loi.trim()); doi.push("mô tả lỗi");
  }
  if (body.loai_doi_tru_de_xuat !== undefined && body.loai_doi_tru_de_xuat !== don.loai_doi_tru_de_xuat) {
    if (!["doi_tra", "tru_cong_no"].includes(body.loai_doi_tru_de_xuat)) return c.json({ error: "INVALID_LOAI_DOI_TRU" }, 400);
    set.push("loai_doi_tru_de_xuat = ?"); binds.push(body.loai_doi_tru_de_xuat); doi.push("loại đối trừ đề xuất");
  }
  if (set.length === 0) return c.json({ ok: true, doi: 0 });
  await c.env.DB.prepare(`UPDATE phieu_sua_chua_bh SET ${set.join(", ")} WHERE id = ?`).bind(...binds, donId).run();
  await addLog(c.env.DB, "phieu_sc", donId, "nhap", "nhap", user.email, "Sửa đơn trong thùng nháp: " + doi.join("; "));
  c.executionCtx.waitUntil(capNhatTimKiem(c.env.DB, [donId]).then(() => undefined).catch(() => undefined));
  return c.json({ ok: true, doi: doi.length });
});

phieuGui.delete("/don/:donId", async (c) => {
  const user = c.get("user");
  const donId = c.req.param("donId");
  const don = await c.env.DB.prepare(
    "SELECT p.phieu_gui_id, g.nguoi_tao, g.nguoi_tao_ho, g.trang_thai FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE p.id = ?",
  )
    .bind(donId)
    .first<{ phieu_gui_id: string; nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!don) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, don)) return c.json({ error: "FORBIDDEN" }, 403);
  if (don.trang_thai !== "nhap") return c.json({ error: "NOT_DRAFT" }, 400);
  // 11/11/2026: anh / bao cao sai co FOREIGN KEY toi don cha -> xoa cung luc (truoc day don co anh xoa bi INTERNAL_ERROR).
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM phieu_sua_chua_bh_anh WHERE parent_id = ?").bind(donId),
    c.env.DB.prepare("DELETE FROM phieu_sua_chua_bh_baocaosai WHERE parent_id = ?").bind(donId),
    c.env.DB.prepare("DELETE FROM phieu_sua_chua_bh WHERE id = ?").bind(donId),
  ]);
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
  // 11/10/2026: NV sua chua + Giam sat cung trao doi duoc (tu UI chi tiet don).
  if (!(isKtv(user) || user.la_kho || user.la_admin_bh || user.la_nv_sua_chua || user.la_giam_sat)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const body = await c.req.json<{ noi_dung?: string }>().catch(() => ({}) as { noi_dung?: string });
  if (!body.noi_dung?.trim()) return c.json({ error: "MISSING_NOI_DUNG" }, 400);
  await c.env.DB.prepare("INSERT INTO phieu_gui_bh_ghi_chu (phieu_gui_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)")
    .bind(id, user.email, nowVN(), body.noi_dung.trim())
    .run();
  return c.json({ ok: true }, 201);
});

// ---------- Tra cuu tien do (KTV) + Bo sung thong tin theo yeu cau Admin BH ----------

// GET /api/phieu-gui/don-vi/tra-cuu?q=&limit=&offset= - moi don vi con thuoc cac phieu gui CHINH
// MINH da tao (khong gioi han theo thoi gian - CLAUDE.md "Doi chieu bang gop y Gemini" da xac nhan
// hang doi/tra cuu KHONG duoc loc theo thoi gian, tranh don qua han lau bi "bien mat"). Phan trang
// that o tang SQL (LIMIT/OFFSET + COUNT) thay vi fetch het roi loc/cat o server nhu ban cu - "q" gio
// loc bang SQL LIKE tren dung cac cot hien thi tren bang (id/case/linh kien/mo ta), khong con
// JSON.stringify toan bo dong (cach cu bat buoc phai tai het du lieu ve dung 1 lan).
phieuGui.get("/don-vi/tra-cuu", async (c) => {
  const user = c.get("user");
  if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const kw = (c.req.query("q") || "").trim();
  const { limit, offset } = parsePage(c);
  const baseFrom = `FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE g.nguoi_tao = ?`;
  // 21/10/2026: loc trang thai / huong xu ly / linh kien / thung.
  const LOC = { trang_thai: "u.trang_thai", huong_xu_ly: "u.huong_xu_ly", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)", phieu_gui: "p.phieu_gui_id" };
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, baseFrom, [user.email]) });
  const kwc = kwClause(kw, ["u.id", "p.id", "p.case_id", "p.ma_lk", "u.ma_lk_thuc_te", "u.ma_lk_nhan", "p.mo_ta_loi", "p.phieu_gui_id", tenLkOf("COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)"), "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)"], ["p.tim_kiem"]);
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "p.created_at"));
  const binds: unknown[] = [user.email, ...kwc.binds, ...f.binds];
  const fromWhere = baseFrom + kwc.sql + f.sql;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.phieu_gui_id, p.loai_doi_tru_de_xuat, g.ngay_gui_xe ${fromWhere} ORDER BY u.updated_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt ${fromWhere}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

interface BoSungBody {
  mo_ta_loi?: string;
  ma_lk?: string;
  anh?: string[]; // 31/10/2026: KTV gui kem anh chup lai khi Admin yeu cau (gan vao don cha)
}

// PATCH /api/phieu-gui/don-vi/:id/bo-sung - KTV sua lai mo ta loi/linh kien khi bi Admin BH yeu cau
// bo sung (cho_bo_sung_tt -> cho_phan_loai). Sua ca "mo_ta_loi" (o don cha) lan "ma_lk" (doi linh
// kien, port dung yeu cau "Phan hoi vong 4 muc 1": modal bo sung them duoc truong doi linh kien).
phieuGui.patch("/don-vi/:id/bo-sung", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const u = await c.env.DB.prepare(
    `SELECT u.trang_thai, p.id as parent_id, g.nguoi_tao, g.nguoi_tao_ho FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE u.id = ?`,
  )
    .bind(id)
    .first<{ trang_thai: string; parent_id: string; nguoi_tao: string; nguoi_tao_ho: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  // 12/11/2026: GS khu vuc cua KTV (va nguoi tao ho thung, qtri) bo sung thong tin THAY KTV.
  const laChuThung = isKtv(user) && u.nguoi_tao === user.email;
  const laTaoHo = !!u.nguoi_tao_ho && u.nguoi_tao_ho === user.email;
  const laGs = !laChuThung && user.la_giam_sat && (await isGsOfKtv(c.env.DB, user.email, u.nguoi_tao));
  const thayKtv = !laChuThung && (laTaoHo || laGs || user.la_qtri);
  if (!laChuThung && !thayKtv) return c.json({ error: "FORBIDDEN" }, 403);
  if (u.trang_thai !== "cho_bo_sung_tt") return c.json({ error: "WRONG_STATE" }, 400);

  const body = await c.req.json<BoSungBody>().catch(() => ({}) as BoSungBody);
  // 12/11/2026: anh luu tren Google Drive (lib/anhDrive.ts), D1 chi giu link - tai TRUOC khi ghi gi khac.
  let anhUrls: string[];
  try {
    anhUrls = await chuanHoaAnh(c.env, body.anh, `bosung_${u.parent_id}`);
  } catch (e) {
    return c.json({ error: e instanceof AnhLoi ? e.code : "UPLOAD_FAILED" }, 400);
  }
  const now = nowVN();
  if (body.mo_ta_loi !== undefined) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET mo_ta_loi = ? WHERE id = ?").bind(body.mo_ta_loi.trim(), u.parent_id).run();
  if (body.ma_lk !== undefined) await c.env.DB.prepare("UPDATE phieu_sua_chua_bh SET ma_lk = ? WHERE id = ?").bind(body.ma_lk, u.parent_id).run();
  if (anhUrls.length > 0) {
    await c.env.DB.batch(anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_anh (parent_id, anh_url) VALUES (?, ?)").bind(u.parent_id, url)));
  }
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET trang_thai = 'cho_phan_loai', updated_at = ? WHERE id = ?").bind(now, id).run();
  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_bo_sung_tt", "cho_phan_loai", user.email, (thayKtv ? (laGs ? "GS bổ sung thông tin thay KTV" : "Bổ sung thông tin thay KTV") : "KTV đã bổ sung thông tin") + (anhUrls.length > 0 ? ` (kèm ${anhUrls.length} ảnh)` : ""));
  return c.json({ ok: true });
});

export default phieuGui;
