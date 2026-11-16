import { Hono } from "hono";
import type { Env, AppUser } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { nextSequentialId } from "../lib/idCounter";
import { addLog } from "../lib/logs";
import { parsePage } from "../lib/pagination";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { mienScope } from "../lib/mien";
import { slaCutoffVn } from "../lib/sla";
import { dayCapLkCho, demCapLkCho } from "../lib/capLkPush";
import { dongBoDonSc, ghiMotDon, goiLinhKien, moTaLoi, type DonSc } from "../lib/donScLinhKien";

// De xuat linh kien sua chua (12/10/2026) - nguyen van chot: "NV se tu bao linh kien can duoc cap, Admin
// bao hanh se len misa de xuat tu kho sang. Cu de xuat den khi sua xong hoac xac dinh la khong sua
// duoc." Moi de xuat la DON CON cua 1 don vi bao hanh (unit_id). Trang thai: cho_cap -> da_cap (Admin
// nhap ma MISA phieu xuat) | tu_choi (Admin, bat buoc ly do) | huy (NV tu huy, hoac tu huy khi NV nop
// ket qua). Khong gioi han so lan de xuat / tu choi. Nhat ky ghi vao don vi (entity phieu_sc_ct).

const deXuat = new Hono<{ Bindings: Env }>();
deXuat.use("*", verifySessionMiddleware, loadUser);

const isAdmin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const isNv = (u: AppUser) => u.la_nv_sua_chua || u.la_qtri;
const isKt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
// 02/11/2026: Ke toan chi xem cac de xuat da qua buoc Admin dong y cap.
const KT_XEM = ["cho_ke_toan", "da_cap", "cho_kho_in", "kho_da_in", "kho_da_xuat"];
const isKho = (u: AppUser) => u.la_kho || u.la_qtri;
// 04/11/2026: giai doan Kho sau khi KT xac nhan (trang_thai = 'da_cap', cot kho_tt). Tab ao cua GET /.
const KHO_TAB: Record<string, string> = { cho_kho_in: "cho_in", kho_da_in: "da_in", kho_da_xuat: "da_xuat" };
const KHO_XEM = Object.keys(KHO_TAB);
// Dieu kien trang thai theo tab (tab Kho -> da_cap + kho_tt).
function ttWhere(tt: string): { sql: string; binds: unknown[] } {
  if (KHO_TAB[tt]) return { sql: "d.trang_thai = 'da_cap' AND COALESCE(d.kho_tt, 'cho_in') = ?", binds: [KHO_TAB[tt]] };
  return { sql: "d.trang_thai = ?", binds: [tt] };
}

// 06/11/2026 - "các tab đang bị lỗi đếm số lượng ca tồn cần xử lý": dem theo CA (case, khong co case thi theo don vi),
// tab Kho dem theo PHIEU PXK (ma MISA; chua co MISA thi moi de xuat la 1 phieu rieng).
const CA_KEY = "COALESCE(NULLIF(TRIM(p.case_id), ''), u.id)";
const PXK_KEY = "COALESCE(NULLIF(TRIM(d.ma_misa), ''), d.id)";
// 06/11/2026 - "đã xuất không cần đếm, chỉ cần đếm những vị trí còn cần thao tác để tiết kiệm lượt đọc D1": chi dem 4 tab con viec.
const ALL_TABS = ["cho_cap", "cho_ke_toan", "cho_kho_in", "kho_da_in"];
const canSee = (u: AppUser, tt: string) => isAdmin(u) || (isKt(u) && KT_XEM.includes(tt)) || (isKho(u) && KHO_XEM.includes(tt));

interface DxRow {
  id: string;
  unit_id: string;
  ma_lk: string;
  so_luong: number;
  trang_thai: string;
}

async function unitOf(db: D1Database, unitId: string) {
  return db.prepare("SELECT id, trang_thai, nguoi_sua_chua FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ id: string; trang_thai: string; nguoi_sua_chua: string | null }>();
}

// Hang doi Admin BH: de xuat theo trang thai (mac dinh cho_cap), gioi han theo mien cua nguoi xem.
deXuat.get("/", async (c) => {
  const user = c.get("user");
  const tt = c.req.query("trang_thai") || "cho_cap";
  if (!isAdmin(user) && !(isKt(user) && KT_XEM.includes(tt)) && !(isKho(user) && KHO_XEM.includes(tt))) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c, 20, 200); // 04/11: tab KT nhom theo case lay 200 de 1 case khong bi cat qua 2 trang
  const ms0 = mienScope(user, "p");
  const kw = kwClause(c.req.query("q"), ["d.id", "d.ma_lk", tenLkOf("d.ma_lk"), "d.ma_misa", "d.ma_don_hang", "d.ghi_chu", "d.nguoi_de_xuat", tenOf("d.nguoi_de_xuat"), "u.id", "p.case_id", "p.mo_ta_loi", "g.nguoi_tao", tenOf("g.nguoi_tao")], ["p.tim_kiem"]);
  // 21/10/2026: loc nguoi de xuat / NV sua chua / KTV gui / linh kien xin / nguoi xu ly.
  const LOC = { nguoi_de_xuat: "d.nguoi_de_xuat", nv: "u.nguoi_sua_chua", ktv: "g.nguoi_tao", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "d.ma_lk", nguoi_xu_ly: "d.nguoi_xu_ly" };
  const tw = ttWhere(tt);
  const baseDx = `FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE ${tw.sql}${ms0.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, baseDx, [...tw.binds, ...ms0.binds]) });
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "d.created_at"), slaFilter(c, "d.created_at"));
  const ms = { sql: ms0.sql + kw.sql + f.sql, binds: [...ms0.binds, ...kw.binds, ...f.binds] };
  const fw = `FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE ${tw.sql}${ms.sql}`;
  // 06/11/2026 - Kho: "tổng hợp theo mã PXK => kho vào 1 phiếu pxk sẽ xem được danh sách các đơn bảo hành bên trong":
  // group=pxk -> phan trang theo PHIEU PXK, tra du moi dong cua cac phieu trong trang.
  if (KHO_TAB[tt] && c.req.query("group") === "pxk") {
    const kOrder = tt === "kho_da_xuat" ? "MAX(COALESCE(d.kho_xuat_luc, d.updated_at)) DESC" : "MIN(COALESCE(d.kho_in_luc, d.kt_luc, d.updated_at))";
    const [{ results: keys }, cntRow] = await Promise.all([
      c.env.DB.prepare(`SELECT ${PXK_KEY} AS k ${fw} GROUP BY ${PXK_KEY} ORDER BY ${kOrder} LIMIT ? OFFSET ?`).bind(...tw.binds, ...ms.binds, limit, offset).all<{ k: string }>(),
      c.env.DB.prepare(`SELECT COUNT(DISTINCT ${PXK_KEY}) AS cnt ${fw}`).bind(...tw.binds, ...ms.binds).first<{ cnt: number }>(),
    ]);
    const ks = keys.map((x) => x.k);
    if (!ks.length) return c.json({ de_xuat: [], total: cntRow?.cnt ?? 0 });
    const { results } = await c.env.DB.prepare(
      `SELECT d.*, u.trang_thai AS unit_trang_thai, u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk AS unit_ma_lk, p.mo_ta_loi, p.case_id, p.mien, g.nguoi_tao AS ktv, ${PXK_KEY} AS pxk
       ${fw} AND ${PXK_KEY} IN (${ks.map(() => "?").join(",")}) ORDER BY d.unit_id, d.id`,
    ).bind(...tw.binds, ...ms.binds, ...ks).all<Record<string, unknown>>();
    const pos = new Map(ks.map((k, i) => [k, i]));
    results.sort((a, b) => (pos.get(a.pxk as string) ?? 0) - (pos.get(b.pxk as string) ?? 0));
    return c.json({ de_xuat: results, total: cntRow?.cnt ?? 0 });
  }
  const order = ["cho_cap", "cho_ke_toan", "cho_kho_in", "kho_da_in"].includes(tt) ? (KHO_TAB[tt] ? "COALESCE(d.kho_in_luc, d.kt_luc, d.updated_at)" : "d.created_at") : "d.updated_at DESC";
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT d.*, u.trang_thai AS unit_trang_thai, u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk AS unit_ma_lk, p.mo_ta_loi, p.case_id, p.mien, g.nguoi_tao AS ktv ${fw} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(...tw.binds, ...ms.binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${fw}`).bind(...tw.binds, ...ms.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ de_xuat: results, total: totalRow?.cnt ?? 0 });
});

// So dem tung tab (06/11/2026): { tab: { ca, pxk, dong } } - chi cac tab nguoi xem duoc phep xem, theo mien.
deXuat.get("/dem", async (c) => {
  const user = c.get("user");
  const ms = mienScope(user, "p");
  const tabs = ALL_TABS.filter((t) => canSee(user, t));
  const out: Record<string, { ca: number; pxk: number; dong: number }> = {};
  await Promise.all(
    tabs.map(async (t) => {
      const tw = ttWhere(t);
      const r = await c.env.DB.prepare(
        `SELECT COUNT(DISTINCT ${CA_KEY}) AS ca, COUNT(DISTINCT ${PXK_KEY}) AS pxk, COUNT(*) AS dong
         FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE ${tw.sql}${ms.sql}`,
      ).bind(...tw.binds, ...ms.binds).first<{ ca: number; pxk: number; dong: number }>();
      out[t] = { ca: r?.ca ?? 0, pxk: r?.pxk ?? 0, dong: r?.dong ?? 0 };
    }),
  );
  // 12/11/2026: so phieu cap linh kien chua dong bo sang linh-kien-app (Admin BH / Ke toan / Kho / qtri thay canh bao + nut gui lai).
  const lk = user.la_admin_bh || user.la_ke_toan || user.la_kho || user.la_qtri ? await demCapLkCho(c.env.DB) : undefined;
  return c.json({ dem: out, lk });
});

// POST /de-xuat/day-linh-kien - gui ngay cac phieu cap linh kien chua dong bo sang linh-kien-app (don "SỬA CHỮA TẠI KHO").
deXuat.post("/day-linh-kien", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_ke_toan || user.la_kho || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const r = await dayCapLkCho(c.env);
  const dem = await demCapLkCho(c.env.DB);
  return c.json({ da_day: r.da_day, loi: r.loi ?? null, cho: dem.cho, so_loi: dem.loi });
});

// 05/11/2026 - "bên menu cấp lk chưa nhảy đúng số lượng và danh sách người nhận hàng": menu KTV (menu 2) dem
// de xuat theo dung tab dang mo cua man Cap linh kien, nhom theo KTV gui don (g.nguoi_tao).
deXuat.get("/ktv-menu", async (c) => {
  const user = c.get("user");
  const tt = c.req.query("trang_thai") || "cho_cap";
  if (!isAdmin(user) && !(isKt(user) && KT_XEM.includes(tt)) && !(isKho(user) && KHO_XEM.includes(tt))) return c.json({ error: "FORBIDDEN" }, 403);
  const ms = mienScope(user, "p");
  const tw = ttWhere(tt);
  const { results } = await c.env.DB.prepare(
    `SELECT COALESCE(g.nguoi_tao, '') AS ktv, COUNT(DISTINCT ${CA_KEY}) AS so_don, COUNT(*) AS so_dong,
       SUM(CASE WHEN d.created_at < ? THEN 1 ELSE 0 END) AS qua_han
     FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
     LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE ${tw.sql}${ms.sql}
     GROUP BY COALESCE(g.nguoi_tao, '') ORDER BY so_don DESC`
  ).bind(slaCutoffVn(24), ...tw.binds, ...ms.binds).all();
  return c.json({ ktv: results });
});

// Danh sach de xuat cua 1 don vi (hien trong UI chi tiet don - dang me con).
// 16/11/2026 (v1.133): keo trang thai don ben linh-kien-app ve truoc khi tra (ca don NV dat thang tren app do) - loi ket noi thi tra ban da luu.
deXuat.get("/don-vi/:unitId", async (c) => {
  const unitId = c.req.param("unitId");
  const parent = await c.env.DB.prepare("SELECT parent_id FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ parent_id: string }>();
  const db = await dongBoDonSc(c.env, { bh: [unitId, ...(parent ? [parent.parent_id] : [])] });
  const { results } = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE unit_id = ? ORDER BY created_at DESC").bind(unitId).all();
  return c.json({ de_xuat: results, lk_loi: db.loi ? moTaLoi({ error: db.loi }) : null });
});

// NV tao de xuat (1 hoac nhieu linh kien) cho don vi dang giao cho minh, dang o buoc sua chua.
// 21/10/2026: Admin BH tao de xuat thay cho NV ("admin BH thêm quyền tạo đơn đề xuất linh kiện sửa chữa
// thay cho nhân viên sửa chữa") - cung dieu kien don dang o buoc sua chua, khong can la NV duoc giao.
deXuat.post("/don-vi/:unitId", async (c) => {
  const user = c.get("user");
  if (!isNv(user) && !isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const unitId = c.req.param("unitId");
  const u = await unitOf(c.env.DB, unitId);
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.trang_thai !== "cho_chan_doan") return c.json({ error: "WRONG_STATE" }, 400);
  const thayNv = u.nguoi_sua_chua !== user.email;
  if (thayNv && !isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ items?: { ma_lk?: string; so_luong?: number; ghi_chu?: string }[] }>().catch(() => ({}) as { items?: { ma_lk?: string; so_luong?: number; ghi_chu?: string }[] });
  const items = (body.items || []).filter((x) => x.ma_lk?.trim()).slice(0, 30);
  if (!items.length) return c.json({ error: "MISSING_LINH_KIEN" }, 400);
  for (const it of items) if (!Number.isInteger(it.so_luong ?? 1) || (it.so_luong ?? 1) < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  // 16/11/2026 (v1.133) - "Cấp lk tạo được từ cả 2 bên: thông tin thống nhất đẩy hết về app linh kiện, kế toán duyệt trên app lk": moi dong
  // = 1 don CÔNG NỢ SỬA CHỮA tao NGAY ben linh-kien-app (tai khoan NV sua chua nhan hang); Ke toan / Kho xu ly ben do, o day chi theo doi.
  if (!u.nguoi_sua_chua) return c.json({ error: "DON_CHUA_GIAO_NV" }, 400);
  const now = nowVN();
  const ids: string[] = [];
  const ketQua: { ma_lk: string; so_luong: number; id?: string; ddh?: string; nhan?: string; loi?: string }[] = [];
  for (const it of items) {
    const id = await nextSequentialId(c.env.DB, "de_xuat_linh_kien_bh", "DX");
    const maLk = it.ma_lk!.trim();
    const sl = it.so_luong ?? 1;
    const kq = await goiLinhKien<{ don?: DonSc }>(c.env, "/don-sc", {
      method: "POST",
      body: { dx_id: id, unit_id: unitId, nv_email: u.nguoi_sua_chua, nguoi_thao_tac: user.email, ma_lk: maLk, so_luong: sl, ghi_chu: it.ghi_chu?.trim() || undefined },
    });
    if (!kq.ok || !kq.data.don) {
      ketQua.push({ ma_lk: maLk, so_luong: sl, loi: kq.ok ? "Không đọc được đơn vừa tạo" : moTaLoi(kq) });
      continue;
    }
    const don = kq.data.don;
    await c.env.DB.prepare(
      `INSERT INTO de_xuat_linh_kien_bh (id, unit_id, ma_lk, so_luong, ghi_chu, trang_thai, nguoi_de_xuat, created_at, updated_at, nguon, lk_ddh_id)
       VALUES (?, ?, ?, ?, ?, 'lien_ket', ?, ?, ?, 'doitra', ?)`,
    ).bind(id, unitId, maLk, sl, it.ghi_chu?.trim() || null, user.email, now, now, don.id).run();
    await ghiMotDon(c.env, don);
    ids.push(id);
    ketQua.push({ ma_lk: maLk, so_luong: sl, id, ddh: don.id, nhan: don.nhan });
  }
  if (ids.length) {
    await addLog(c.env.DB, "phieu_sc_ct", unitId, u.trang_thai, u.trang_thai, user.email, `${thayNv ? `Admin BH tạo hộ NV${u.nguoi_sua_chua ? ` ${u.nguoi_sua_chua}` : ""}` : "NV tạo"} cấp linh kiện trên app Đặt linh kiện: ${ketQua.filter((x) => x.id).map((x) => `${x.ma_lk} ×${x.so_luong} (${x.id} → ${x.ddh})`).join(", ")}`);
  }
  if (!ids.length) return c.json({ error: "TAO_DON_LOI", message: ketQua.map((x) => `${x.ma_lk}: ${x.loi}`).join(" · "), ket_qua: ketQua }, 409);
  return c.json({ ok: true, ids, ket_qua: ketQua });
});

// Quyen sua / huy de xuat MOI (nguon khac NULL): nguoi tao de xuat, NV dang sua don vi, Admin BH.
async function dxMoi(db: D1Database, id: string) {
  return db.prepare(
    `SELECT d.*, u.nguoi_sua_chua, u.trang_thai AS unit_tt FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id WHERE d.id = ?`,
  ).bind(id).first<DxRow & { nguon: string | null; lk_ddh_id: string | null; lk_lan: number; lk_ddh_cu: string | null; nguoi_de_xuat: string; nguoi_sua_chua: string | null; unit_tt: string; ghi_chu: string | null }>();
}
const duocSuaDx = (user: AppUser, d: { nguoi_de_xuat: string; nguoi_sua_chua: string | null }) =>
  isAdmin(user) || d.nguoi_de_xuat === user.email || d.nguoi_sua_chua === user.email;

// POST /de-xuat/:id/sua {ma_lk?, so_luong?, ghi_chu?} - "sửa lk, số lượng nếu cần trước khi kế toán duyệt xuất kho". Chi de xuat tao tu app nay
// (don dat tren linh-kien-app sua ben do); doi ma LK / SL = ben kia huy don cu + tao don moi (danh gia lai ton kho / phieu).
deXuat.post("/:id/sua", async (c) => {
  const user = c.get("user");
  const d = await dxMoi(c.env.DB, c.req.param("id"));
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
  if (!d.nguon || !d.lk_ddh_id) return c.json({ error: "DE_XUAT_LUONG_CU" }, 400);
  if (d.nguon !== "doitra") return c.json({ error: "DON_TAO_TREN_APP_LINH_KIEN", message: moTaLoi({ error: "DON_TAO_TREN_APP_LINH_KIEN" }) }, 409);
  if (!duocSuaDx(user, d)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ma_lk?: string; so_luong?: number; ghi_chu?: string }>().catch(() => ({}) as { ma_lk?: string; so_luong?: number; ghi_chu?: string });
  const maLk = body.ma_lk?.trim() || d.ma_lk;
  const sl = body.so_luong ?? d.so_luong;
  if (!Number.isInteger(sl) || sl < 1) return c.json({ error: "INVALID_SO_LUONG" }, 400);
  const kq = await goiLinhKien<{ thay_bang?: string; don?: DonSc }>(c.env, `/don-sc/${encodeURIComponent(d.lk_ddh_id)}/sua`, {
    method: "POST",
    body: { nguoi_thao_tac: user.email, ma_lk: maLk, so_luong: sl, ghi_chu: body.ghi_chu !== undefined ? body.ghi_chu : undefined, lan: (d.lk_lan ?? 1) + 1 },
  });
  if (!kq.ok) {
    // Don cu da huy nhung tao don moi loi -> keo trang thai ve (de xuat thanh "Đã hủy"), nguoi dung tao lai.
    if (kq.body?.don_cu_da_huy) await dongBoDonSc(c.env, { ids: [d.lk_ddh_id] });
    return c.json({ error: kq.error, message: moTaLoi(kq) + (kq.body?.don_cu_da_huy ? " — đơn cũ đã hủy, hãy tạo lại đề xuất" : "") }, 409);
  }
  const now = nowVN();
  const moi = kq.data.thay_bang;
  if (moi) {
    await c.env.DB.prepare(
      "UPDATE de_xuat_linh_kien_bh SET lk_ddh_id = ?, lk_lan = ?, lk_ddh_cu = ?, ma_lk = ?, so_luong = ?, updated_at = ? WHERE id = ?",
    ).bind(moi, (d.lk_lan ?? 1) + 1, [d.lk_ddh_cu, d.lk_ddh_id].filter(Boolean).join(", "), maLk, sl, now, d.id).run();
  }
  if (body.ghi_chu !== undefined) await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET ghi_chu = ?, updated_at = ? WHERE id = ?").bind(body.ghi_chu.trim() || null, now, d.id).run();
  await ghiMotDon(c.env, kq.data.don);
  await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, d.unit_tt, d.unit_tt, user.email,
    `Sửa cấp linh kiện ${d.id}: ${d.ma_lk} ×${d.so_luong} → ${maLk} ×${sl}${moi ? ` (đơn ${d.lk_ddh_id} → ${moi})` : ""}`);
  return c.json({ ok: true, thay_bang: moi ?? null });
});

// NV tu huy de xuat chua cap.
deXuat.post("/:id/huy", async (c) => {
  const user = c.get("user");
  const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(c.req.param("id")).first<DxRow & { nguoi_de_xuat: string }>();
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
  // De xuat MOI (v1.133): huy ben linh-kien-app (chua xu ly -> huy ngay; Kho / Mua hang / Ke toan dang xu ly -> cho bo phan do dong y).
  const moi = await dxMoi(c.env.DB, d.id);
  if (moi?.nguon && moi.lk_ddh_id) {
    if (!duocSuaDx(user, moi)) return c.json({ error: "FORBIDDEN" }, 403);
    const b = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
    if (!b.ly_do?.trim()) return c.json({ error: "THIEU_LY_DO_HUY" }, 400);
    const kq = await goiLinhKien<{ da_huy?: boolean; bo_phan?: string; don?: DonSc }>(c.env, `/don-sc/${encodeURIComponent(moi.lk_ddh_id)}/huy`, {
      method: "POST",
      body: { nguoi_thao_tac: user.email, ly_do: b.ly_do.trim() },
    });
    if (!kq.ok) return c.json({ error: kq.error, message: moTaLoi(kq) }, 409);
    await ghiMotDon(c.env, kq.data.don);
    await addLog(c.env.DB, "phieu_sc_ct", moi.unit_id, moi.unit_tt, moi.unit_tt, user.email,
      `${kq.data.da_huy ? "Huỷ" : "Gửi yêu cầu huỷ"} cấp linh kiện ${moi.id} (đơn ${moi.lk_ddh_id}): ${b.ly_do.trim()}`);
    return c.json({ ok: true, da_huy: !!kq.data.da_huy, bo_phan: kq.data.bo_phan ?? null });
  }
  if (d.nguoi_de_xuat !== user.email && !user.la_qtri) return c.json({ error: "FORBIDDEN" }, 403);
  if (d.trang_thai !== "cho_cap") return c.json({ error: "WRONG_STATE" }, 400);
  const now = nowVN();
  await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'huy', nguoi_xu_ly = ?, xu_ly_luc = ?, updated_at = ? WHERE id = ?").bind(user.email, now, now, d.id).run();
  const u = await unitOf(c.env.DB, d.unit_id);
  await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `NV huỷ đề xuất linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong})`);
  return c.json({ ok: true });
});

// Admin BH dong y cap linh kien (1 hoac nhieu de xuat). 02/11/2026 - nguyen van: "Admin BH đồng ý cấp LK thì
// không bắt buộc nhập Mã Misa => xác nhận mã đơn hàng xong => sang trạng thái chờ kế toán xác nhận".
// Ma don hang bat buoc, MISA tuy chon -> 'cho_ke_toan'; Ke toan nhap MISA + xac nhan -> 'da_cap'.
deXuat.post("/cap", async (c) => {
  const user = c.get("user");
  if (!isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; ma_misa?: string; ma_don_hang?: string }>().catch(() => ({}) as { ids?: string[]; ma_misa?: string; ma_don_hang?: string });
  const ids = [...new Set((body.ids || []).filter((x) => typeof x === "string"))].slice(0, 200);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const misa = body.ma_misa?.trim() || null;
  const dh = body.ma_don_hang?.trim();
  if (!dh) return c.json({ error: "REQUIRE_MA_DON_HANG" }, 400);
  const now = nowVN();
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(id).first<DxRow>();
    if (!d) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    if (d.trang_thai !== "cho_cap") {
      loi.push({ id, error: "WRONG_STATE" });
      continue;
    }
    await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'cho_ke_toan', ma_misa = ?, ma_don_hang = ?, nguoi_xu_ly = ?, xu_ly_luc = ?, ly_do_tu_choi = NULL, updated_at = ? WHERE id = ?").bind(misa, dh, user.email, now, now, id).run();
    const u = await unitOf(c.env.DB, d.unit_id);
    await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `Admin BH đồng ý cấp linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}) | Mã ĐH: ${dh}` + (misa ? ` | MISA: ${misa}` : "") + " → chờ Kế toán xác nhận");
    ok++;
  }
  return c.json({ ok, loi });
});

// Ke toan nhap ma MISA + xac nhan (1 hoac nhieu de xuat). items[{id, ma_misa}] - moi de xuat 1 ma MISA rieng
// (thuong chung 1 phieu xuat). Ma MISA bat buoc.
deXuat.post("/ke-toan-xac-nhan", async (c) => {
  const user = c.get("user");
  if (!isKt(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ items?: { id?: string; ma_misa?: string }[] }>().catch(() => ({}) as { items?: { id?: string; ma_misa?: string }[] });
  const items = (body.items || []).filter((x) => typeof x.id === "string").slice(0, 200);
  if (!items.length) return c.json({ error: "MISSING_IDS" }, 400);
  const now = nowVN();
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const it of items) {
    const id = it.id!;
    const misa = it.ma_misa?.trim();
    if (!misa) {
      loi.push({ id, error: "REQUIRE_MA_MISA" });
      continue;
    }
    const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(id).first<DxRow & { ma_don_hang: string | null }>();
    if (!d) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    if (d.trang_thai !== "cho_ke_toan") {
      loi.push({ id, error: "WRONG_STATE" });
      continue;
    }
    await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'da_cap', kho_tt = 'cho_in', ma_misa = ?, kt_boi = ?, kt_luc = ?, updated_at = ? WHERE id = ?").bind(misa, user.email, now, now, id).run();
    const u = await unitOf(c.env.DB, d.unit_id);
    await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `Kế toán xác nhận cấp linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}) | MISA: ${misa}` + (d.ma_don_hang ? ` | Mã ĐH: ${d.ma_don_hang}` : "") + " → chờ Kho in phiếu");
    ok++;
  }
  return c.json({ ok, loi });
});

// Ke toan tra lai Admin BH (sai ma don hang...) - bat buoc ly do, de xuat quay ve 'cho_cap'.
deXuat.post("/:id/kt-tra-lai", async (c) => {
  const user = c.get("user");
  if (!isKt(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(c.req.param("id")).first<DxRow>();
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
  if (d.trang_thai !== "cho_ke_toan") return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const lyDo = body.ly_do?.trim();
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const now = nowVN();
  await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'cho_cap', ly_do_tu_choi = ?, kt_boi = ?, kt_luc = ?, updated_at = ? WHERE id = ?").bind(`Kế toán trả lại: ${lyDo}`, user.email, now, now, d.id).run();
  const u = await unitOf(c.env.DB, d.unit_id);
  await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `Kế toán trả lại đề xuất linh kiện ${d.id} cho Admin BH: ${lyDo}`);
  return c.json({ ok: true });
});

// Admin BH tu choi 1 de xuat (bat buoc ly do). Khong gioi han so lan - NV de xuat lai duoc.
deXuat.post("/:id/tu-choi", async (c) => {
  const user = c.get("user");
  const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(c.req.param("id")).first<DxRow>();
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
  // 03/11/2026: Ke toan cung tu choi duoc de xuat dang cho KT xac nhan (ket thuc, khong cap).
  const laKt = d.trang_thai === "cho_ke_toan";
  if (laKt ? !isKt(user) : !isAdmin(user)) return c.json({ error: "FORBIDDEN" }, 403);
  if (d.trang_thai !== "cho_cap" && !laKt) return c.json({ error: "WRONG_STATE" }, 400);
  const body = await c.req.json<{ ly_do?: string }>().catch(() => ({}) as { ly_do?: string });
  const lyDo = body.ly_do?.trim();
  if (!lyDo) return c.json({ error: "MISSING_LY_DO" }, 400);
  const now = nowVN();
  if (laKt) await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'tu_choi', ly_do_tu_choi = ?, kt_boi = ?, kt_luc = ?, updated_at = ? WHERE id = ?").bind(`Kế toán từ chối: ${lyDo}`, user.email, now, now, d.id).run();
  else await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'tu_choi', ly_do_tu_choi = ?, nguoi_xu_ly = ?, xu_ly_luc = ?, updated_at = ? WHERE id = ?").bind(lyDo, user.email, now, now, d.id).run();
  const u = await unitOf(c.env.DB, d.unit_id);
  await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `${laKt ? "Kế toán" : "Admin BH"} từ chối đề xuất linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}): ${lyDo}`);
  return c.json({ ok: true });
});

// 04/11/2026: Kho xu ly phieu cap linh kien KT da xac nhan. hanh_dong: da_in (cho_in -> da_in) | chua_in (da_in -> cho_in) |
// da_xuat (cho_in / da_in -> da_xuat, xuat luon khong can in). 1 hoac nhieu de xuat (<=200), loi theo dong.
deXuat.post("/kho", async (c) => {
  const user = c.get("user");
  if (!isKho(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; pxk?: string[]; hanh_dong?: string }>().catch(() => ({}) as { ids?: string[]; pxk?: string[]; hanh_dong?: string });
  const hd = body.hanh_dong;
  const TU: Record<string, string[]> = { da_in: ["cho_in"], chua_in: ["da_in"], da_xuat: ["cho_in", "da_in"] };
  if (!hd || !TU[hd]) return c.json({ error: "INVALID_HANH_DONG" }, 400);
  const idSet = new Set((body.ids || []).filter((x) => typeof x === "string"));
  // 06/11/2026: "Kho sẽ xử lý tất cả các đơn trong cùng 1 phiếu" - pxk[] -> moi de xuat cung ma PXK dang o dung giai doan Kho (theo mien).
  const pxks = [...new Set((body.pxk || []).filter((x) => typeof x === "string" && x.trim()))].slice(0, 100);
  if (pxks.length) {
    const ms = mienScope(user, "p");
    const { results } = await c.env.DB.prepare(
      `SELECT d.id FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE d.trang_thai = 'da_cap' AND COALESCE(d.kho_tt, 'cho_in') IN (${TU[hd].map(() => "?").join(",")})
         AND ${PXK_KEY} IN (${pxks.map(() => "?").join(",")})${ms.sql}`,
    ).bind(...TU[hd], ...pxks, ...ms.binds).all<{ id: string }>();
    results.forEach((r) => idSet.add(r.id));
  }
  const ids = [...idSet].slice(0, 500);
  if (!ids.length) return c.json({ error: "MISSING_IDS" }, 400);
  const now = nowVN();
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(id).first<DxRow & { kho_tt: string | null; ma_misa: string | null }>();
    if (!d) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    const khoTt = d.kho_tt || "cho_in";
    if (d.trang_thai !== "da_cap" || !TU[hd].includes(khoTt)) {
      loi.push({ id, error: "WRONG_STATE" });
      continue;
    }
    const sql =
      hd === "da_in"
        ? "UPDATE de_xuat_linh_kien_bh SET kho_tt = 'da_in', kho_in_boi = ?, kho_in_luc = ?, updated_at = ? WHERE id = ? AND trang_thai = 'da_cap' AND COALESCE(kho_tt, 'cho_in') = ?"
        : hd === "chua_in"
          ? "UPDATE de_xuat_linh_kien_bh SET kho_tt = 'cho_in', kho_in_boi = NULL, kho_in_luc = NULL, updated_at = ? WHERE id = ? AND trang_thai = 'da_cap' AND COALESCE(kho_tt, 'cho_in') = ?"
          : "UPDATE de_xuat_linh_kien_bh SET kho_tt = 'da_xuat', kho_xuat_boi = ?, kho_xuat_luc = ?, updated_at = ? WHERE id = ? AND trang_thai = 'da_cap' AND COALESCE(kho_tt, 'cho_in') = ?";
    const binds = hd === "chua_in" ? [now, id, khoTt] : [user.email, now, now, id, khoTt];
    const res = await c.env.DB.prepare(sql).bind(...binds).run();
    if (!res.meta.changes) {
      loi.push({ id, error: "STATE_CHANGED" });
      continue;
    }
    const u = await unitOf(c.env.DB, d.unit_id);
    const nd = hd === "da_in" ? "Kho đã in phiếu cấp linh kiện" : hd === "chua_in" ? "Kho chuyển về: chờ in phiếu cấp linh kiện" : "Kho đã xuất linh kiện";
    await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `${nd} ${d.id} (${d.ma_lk} ×${d.so_luong})` + (d.ma_misa ? ` | MISA: ${d.ma_misa}` : ""));
    ok++;
  }
  return c.json({ ok, loi });
});

// 11/11/2026 ("Khi kế toán duyệt đơn mà kho chưa xử lý, cho phép kế toán sửa mã PXK hoặc bổ sung mã PXK"):
// Ke toan sua / nhap ma PXK (ma_misa) cho de xuat da duyet ma Kho CHUA in / xuat (kho_tt = cho_in).
// pxk = sua ca phieu (moi dong cung ma PXK, theo mien); ids = sua le tung dong (tach sang phieu khac).
deXuat.post("/kt-sua-pxk", async (c) => {
  const user = c.get("user");
  if (!isKt(user)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<{ ids?: string[]; pxk?: string; ma_misa?: string }>().catch(() => ({}) as { ids?: string[]; pxk?: string; ma_misa?: string });
  const moi = (body.ma_misa ?? "").trim().slice(0, 200);
  if (!moi) return c.json({ error: "REQUIRE_MA_MISA" }, 400);
  const idSet = new Set((body.ids || []).filter((x) => typeof x === "string"));
  const pxk = typeof body.pxk === "string" ? body.pxk.trim() : "";
  if (pxk) {
    const ms = mienScope(user, "p");
    const { results } = await c.env.DB.prepare(
      `SELECT d.id FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE d.trang_thai = 'da_cap' AND COALESCE(d.kho_tt, 'cho_in') = 'cho_in' AND ${PXK_KEY} = ?${ms.sql}`,
    ).bind(pxk, ...ms.binds).all<{ id: string }>();
    results.forEach((r) => idSet.add(r.id));
  }
  const ids = [...idSet].slice(0, 500);
  if (!ids.length) return c.json({ error: pxk ? "KHO_DA_XU_LY" : "MISSING_IDS" }, 400);
  const now = nowVN();
  let ok = 0;
  const loi: { id: string; error: string }[] = [];
  for (const id of ids) {
    const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(id).first<DxRow & { kho_tt: string | null; ma_misa: string | null }>();
    if (!d) {
      loi.push({ id, error: "NOT_FOUND" });
      continue;
    }
    if (d.trang_thai !== "da_cap" || (d.kho_tt || "cho_in") !== "cho_in") {
      loi.push({ id, error: "KHO_DA_XU_LY" });
      continue;
    }
    if ((d.ma_misa || "").trim() === moi) {
      ok++;
      continue;
    }
    const res = await c.env.DB.prepare(
      "UPDATE de_xuat_linh_kien_bh SET ma_misa = ?, updated_at = ? WHERE id = ? AND trang_thai = 'da_cap' AND COALESCE(kho_tt, 'cho_in') = 'cho_in'",
    ).bind(moi, now, id).run();
    if (!res.meta.changes) {
      loi.push({ id, error: "KHO_DA_XU_LY" });
      continue;
    }
    const u = await unitOf(c.env.DB, d.unit_id);
    await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `Kế toán ${d.ma_misa ? "sửa" : "nhập"} mã PXK cấp linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}): ${d.ma_misa || "(trống)"} → ${moi}`);
    ok++;
  }
  return c.json({ ok, loi });
});

export default deXuat;
