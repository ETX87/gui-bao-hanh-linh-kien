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
const KT_XEM = ["cho_ke_toan", "da_cap"];

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
  if (!isAdmin(user) && !(isKt(user) && KT_XEM.includes(tt))) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  const ms0 = mienScope(user, "p");
  const kw = kwClause(c.req.query("q"), ["d.id", "d.ma_lk", tenLkOf("d.ma_lk"), "d.ma_misa", "d.ma_don_hang", "d.ghi_chu", "d.nguoi_tao", tenOf("d.nguoi_tao"), "u.id", "p.case_id", "p.mo_ta_loi", "g.nguoi_tao", tenOf("g.nguoi_tao")], ["p.tim_kiem"]);
  // 21/10/2026: loc nguoi de xuat / NV sua chua / KTV gui / linh kien xin / nguoi xu ly.
  const LOC = { nguoi_de_xuat: "d.nguoi_de_xuat", nv: "u.nguoi_sua_chua", ktv: "g.nguoi_tao", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "d.ma_lk", nguoi_xu_ly: "d.nguoi_xu_ly" };
  const baseDx = `FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE d.trang_thai = ?${ms0.sql}`;
  if (c.req.query("loc_only")) return c.json({ loc: await distinctOpts(c.env.DB, LOC, baseDx, [tt, ...ms0.binds]) });
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "d.created_at"), slaFilter(c, "d.created_at"));
  const ms = { sql: ms0.sql + kw.sql + f.sql, binds: [...ms0.binds, ...kw.binds, ...f.binds] };
  const fw = `FROM de_xuat_linh_kien_bh d JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
    LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE d.trang_thai = ?${ms.sql}`;
  const order = tt === "cho_cap" || tt === "cho_ke_toan" ? "d.created_at" : "d.updated_at DESC";
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT d.*, u.trang_thai AS unit_trang_thai, u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk AS unit_ma_lk, p.mo_ta_loi, p.case_id, p.mien, g.nguoi_tao AS ktv ${fw} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(tt, ...ms.binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) AS cnt ${fw}`).bind(tt, ...ms.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ de_xuat: results, total: totalRow?.cnt ?? 0 });
});

// Danh sach de xuat cua 1 don vi (hien trong UI chi tiet don - dang me con).
deXuat.get("/don-vi/:unitId", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE unit_id = ? ORDER BY created_at DESC").bind(c.req.param("unitId")).all();
  return c.json({ de_xuat: results });
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
  const now = nowVN();
  const ids: string[] = [];
  for (const it of items) {
    const id = await nextSequentialId(c.env.DB, "de_xuat_linh_kien_bh", "DX");
    await c.env.DB.prepare("INSERT INTO de_xuat_linh_kien_bh (id, unit_id, ma_lk, so_luong, ghi_chu, trang_thai, nguoi_de_xuat, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'cho_cap', ?, ?, ?)")
      .bind(id, unitId, it.ma_lk!.trim(), it.so_luong ?? 1, it.ghi_chu?.trim() || null, user.email, now, now)
      .run();
    ids.push(id);
  }
  await addLog(c.env.DB, "phieu_sc_ct", unitId, u.trang_thai, u.trang_thai, user.email, `${thayNv ? `Admin BH đề xuất hộ NV${u.nguoi_sua_chua ? ` ${u.nguoi_sua_chua}` : ""}` : "NV đề xuất"} cấp linh kiện: ${items.map((x) => `${x.ma_lk} ×${x.so_luong ?? 1}`).join(", ")} (${ids.join(", ")})`);
  return c.json({ ok: true, ids });
});

// NV tu huy de xuat chua cap.
deXuat.post("/:id/huy", async (c) => {
  const user = c.get("user");
  const d = await c.env.DB.prepare("SELECT * FROM de_xuat_linh_kien_bh WHERE id = ?").bind(c.req.param("id")).first<DxRow & { nguoi_de_xuat: string }>();
  if (!d) return c.json({ error: "NOT_FOUND" }, 404);
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
    await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'da_cap', ma_misa = ?, kt_boi = ?, kt_luc = ?, updated_at = ? WHERE id = ?").bind(misa, user.email, now, now, id).run();
    const u = await unitOf(c.env.DB, d.unit_id);
    await addLog(c.env.DB, "phieu_sc_ct", d.unit_id, u?.trang_thai ?? null, u?.trang_thai ?? null, user.email, `Kế toán xác nhận cấp linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}) | MISA: ${misa}` + (d.ma_don_hang ? ` | Mã ĐH: ${d.ma_don_hang}` : ""));
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

export default deXuat;
