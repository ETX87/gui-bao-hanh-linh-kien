import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { computeEmailGs } from "../lib/gs";
import { parsePage } from "../lib/pagination";
import { lookupCase } from "../lib/caseLookupClient";
import { extractMaKtv } from "../lib/ktvCode";
import { pushBoxToKhovan } from "../lib/khovanPushClient";

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
  let col: "nguoi_tao" | "nguoi_tao_ho";
  if (isRealKtv) col = "nguoi_tao";
  else if (canTaoHo(user)) col = "nguoi_tao_ho";
  else if (isKtv(user)) col = "nguoi_tao"; // qtri fallback (khong xay ra thuc te vi canTaoHo() da gom qtri, giu de an toan)
  else return c.json({ error: "FORBIDDEN" }, 403);
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM phieu_gui_bh WHERE ${col} = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(user.email, limit, offset).all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_gui_bh WHERE ${col} = ?`).bind(user.email).first<{ cnt: number }>(),
  ]);
  return c.json({ phieu_gui: results, total: totalRow?.cnt ?? 0 });
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
    if (!canTaoHo(user)) return c.json({ error: "FORBIDDEN" }, 403);
    const ktvRow = await c.env.DB.prepare("SELECT ma_ktv, khu_vuc_ma FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(ktvEmailReq).first<{ ma_ktv: string; khu_vuc_ma: string | null }>();
    if (!ktvRow) return c.json({ error: "KTV_NOT_FOUND" }, 404);
    // GS chi tao ho duoc trong dung Khu vuc minh phu trach (khop qua khu_vuc_bh.gs_email) - Admin
    // BH/qtri khong bi gioi han khu vuc (dung nguyen van yeu cau "hoặc Admin bảo hành", khong dieu
    // kien them).
    if (user.la_giam_sat && !user.la_admin_bh && !user.la_qtri) {
      const emailGs = await computeEmailGs(c.env.DB, ktvEmailReq);
      if (emailGs !== user.email) return c.json({ error: "OUT_OF_KHU_VUC" }, 403);
    }
    target = ktvEmailReq;
    nguoiTaoHo = user.email;
  } else {
    if (!isKtv(user)) return c.json({ error: "FORBIDDEN" }, 403);
    target = user.email;
    nguoiTaoHo = null;
  }

  const last = await c.env.DB.prepare(
    "SELECT hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen FROM phieu_gui_bh WHERE nguoi_tao = ? AND hinh_thuc_gui IS NOT NULL ORDER BY created_at DESC LIMIT 1",
  )
    .bind(target)
    .first<{ hinh_thuc_gui: string; ma_xe_hoac_tai_xe: string | null; don_vi_van_chuyen: string | null }>();

  const id = await nextSequentialId(c.env.DB, "phieu_gui_bh", "BH");
  const now = nowVN();
  await c.env.DB.prepare(
    `INSERT INTO phieu_gui_bh (id, nguoi_tao, nguoi_tao_ho, ngay_tao, ngay_gui_xe, hinh_thuc_gui, ma_xe_hoac_tai_xe, don_vi_van_chuyen, trang_thai, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'nhap', ?, ?)`,
  )
    .bind(id, target, nguoiTaoHo, now.slice(0, 10), now.slice(0, 10), last?.hinh_thuc_gui ?? "xe_noi_bo", last?.ma_xe_hoac_tai_xe ?? "", last?.don_vi_van_chuyen ?? "", now, now)
    .run();
  await addLog(c.env.DB, "phieu_gui", id, null, "nhap", user.email, nguoiTaoHo ? `Tao phieu moi (tao ho cho KTV ${target})` : "Tao phieu moi");

  const ktvInfo = await c.env.DB.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(target).first<{ ten_hien_thi: string | null }>();
  await pushBoxToKhovan(c.env, id, ktvInfo?.ten_hien_thi || target, target);

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
}

// PATCH /api/phieu-gui/:id - luu header (khong con truong "ghi_chu" don dong - da bo theo CLAUDE.md
// "Phan hoi vong 3 muc 1", thay bang khu vuc ghi_chu_log rieng).
phieuGui.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; nguoi_tao_ho: string | null }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
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
  const g = await c.env.DB.prepare("SELECT nguoi_tao, nguoi_tao_ho, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string; nguoi_tao_ho: string | null; trang_thai: string }>();
  if (!g) return c.json({ error: "NOT_FOUND" }, 404);
  if (!ownsPhieuGui(user, g)) return c.json({ error: "FORBIDDEN" }, 403);
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
  // Anh chup linh kien loi luc tao don (KTV, thuong tu camera dien thoai) - luu vao
  // phieu_sua_chua_bh_anh (parent_id). Bang nay da co san trong schema tu Giai doan 1 va DA duoc
  // Admin BH doc lai (GET /admin/don-vi/:id) nhung CHUA tung co route ghi - gap that phat hien o
  // "QA vong 3" (nguoi dung hoi "chuc nang tao shortcut... co bo sot gi khong").
  anh?: string[];
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
  const caseId = body.case_id?.trim();
  if (!caseId) return c.json({ error: "MISSING_CASE_ID" }, 400);

  const casePreview = await lookupCase(caseId, c.env);
  if (!casePreview) return c.json({ error: "CASE_NOT_FOUND" }, 400);
  const maKtvCase = extractMaKtv(casePreview.ky_thuat_vien);
  const ktvRow = await c.env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(g.nguoi_tao).first<{ ma_ktv: string }>();
  if (!maKtvCase || !ktvRow || ktvRow.ma_ktv !== maKtvCase) return c.json({ error: "CASE_KTV_MISMATCH" }, 400);

  const id = await nextSequentialId(c.env.DB, "phieu_sua_chua_bh", "DH");
  // email_gs phai tinh theo KTV SO HUU thung (g.nguoi_tao), KHONG phai user.email dang thao tac - o
  // ban truoc 2 gia tri nay luon trung (chi chinh KTV moi them duoc don cho phieu cua ho), nhung tu
  // khi co "tao ho" (nguoi_tao_ho co the la GS/Admin BH, khong co dong ktv_lien_he_bh nao ca) thi
  // dung user.email se luon tra ve NULL - da sua tan goc, khong chi vá luc them "tao ho".
  const emailGs = await computeEmailGs(c.env.DB, g.nguoi_tao);
  await c.env.DB.prepare(
    `INSERT INTO phieu_sua_chua_bh (id, phieu_gui_id, case_id, ma_lk, mo_ta_loi, so_luong_khai, loai_doi_tru_de_xuat, nguon_tao, trang_thai_cha, email_gs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ktv', 'cho_xac_nhan_so_luong', ?, ?)`,
  )
    .bind(id, guiId, caseId, body.ma_lk || null, body.mo_ta_loi.trim(), soLuong, body.loai_doi_tru_de_xuat || "doi_tra", emailGs, nowVN())
    .run();
  // Luu "bang chung" case luc tao don (yeu cau muc 2) - dung 1 bang cache dung chung
  // case_lookup_snapshot (khong phai rieng tren dong don) de moi don khac cung case_id deu doc lai
  // duoc, va Admin BH bam "dong bo lai" (POST /case-lookup/detail/:id/sync) lam moi duoc cho ca nhom.
  await c.env.DB.prepare(
    "INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at",
  )
    .bind(caseId, JSON.stringify(casePreview), nowVN())
    .run();
  const anhUrls = (body.anh || []).filter((u) => u && u.trim());
  if (anhUrls.length > 0) {
    await c.env.DB.batch(anhUrls.map((url) => c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_anh (parent_id, anh_url) VALUES (?, ?)").bind(id, url)));
  }
  return c.json({ id }, 201);
});

// DELETE /api/phieu-gui-don/:id - xoa 1 don CHUA gui (phieu cha van "nhap").
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
  let where = "g.nguoi_tao = ?";
  const binds: unknown[] = [user.email];
  if (kw) {
    where += " AND (u.id LIKE ? OR p.case_id LIKE ? OR p.ma_lk LIKE ? OR p.mo_ta_loi LIKE ?)";
    const like = `%${kw}%`;
    binds.push(like, like, like, like);
  }
  const fromWhere = `FROM phieu_sua_chua_bh_ct u
     JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE ${where}`;
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
