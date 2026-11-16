import { Hono } from "hono";
import { tenGonKtv } from "../lib/taiKhoan";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { parsePage } from "../lib/pagination";

// CRUD nguoi dung cho man "#/qtri/nguoi-dung" (Admin he thong, la_qtri) - port lai tu
// renderQtriNguoiDung()/suaVaiTroNguoiDung()/xoaNguoiDung()/submitThemNguoiDung() cua prototype.
// Giai doan 1: chi scaffold route, CHUA co frontend UI goi toi day (se lam o Giai doan 3/4).

const users = new Hono<{ Bindings: Env }>();
users.use("*", verifySessionMiddleware, loadUser);

const ROLE_FLAGS = ["la_ktv_dvbh", "la_ve_tinh", "la_kho", "la_admin_bh", "la_nv_sua_chua", "la_ke_toan", "la_giam_sat", "la_view", "la_qtri", "la_tra_xac"] as const;
type RoleFlag = (typeof ROLE_FLAGS)[number];
function isRoleFlag(v: unknown): v is RoleFlag {
  return typeof v === "string" && (ROLE_FLAGS as readonly string[]).includes(v);
}

function requireQtri(c: { get(k: "user"): { la_qtri: boolean } }): boolean {
  return c.get("user").la_qtri;
}

users.get("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  // Phat hien 13 vong ra soat UX: them tim theo email/ten - truoc day khong co, phai bam qua tung
  // trang de tim 1 nguoi giua hang tram tai khoan.
  const kw = (c.req.query("q") || "").trim();
  let where = "1=1";
  const binds: unknown[] = [];
  if (kw) {
    where += " AND (email LIKE ? OR ten LIKE ? OR EXISTS (SELECT 1 FROM ktv_lien_he_bh k WHERE LOWER(k.email_dang_nhap) = LOWER(users.email) AND (k.ma_ktv LIKE ? OR k.ten_hien_thi LIKE ?)))";
    binds.push(`%${kw}%`, `%${kw}%`, `%${kw}%`, `%${kw}%`);
  }
  // 16/10/2026: bo loc danh sach nhan su - trang thai duyet, khoa, vai tro, mien, trang thai ETX.
  const tt = c.req.query("trang_thai");
  if (tt === "Cho duyet" || tt === "Da duyet" || tt === "Tu choi") {
    where += " AND trang_thai_duyet = ?";
    binds.push(tt);
  }
  const khoa = c.req.query("khoa");
  if (khoa === "1") where += " AND COALESCE(bi_khoa, 0) = 1";
  else if (khoa === "0") where += " AND COALESCE(bi_khoa, 0) = 0";
  else if (khoa === "etx") where += " AND COALESCE(bi_khoa, 0) = 1 AND khoa_boi_etx = 1";
  const vt = c.req.query("vai_tro");
  if (isRoleFlag(vt)) where += ` AND ${vt} = 1`;
  else if (vt === "none") where += ` AND ${ROLE_FLAGS.map((f) => `COALESCE(${f}, 0) = 0`).join(" AND ")}`;
  const mien = c.req.query("mien");
  if (mien === "MB" || mien === "MN" || mien === "ALL") {
    where += " AND mien = ?";
    binds.push(mien);
  } else if (mien === "none") where += " AND mien IS NULL";
  const ETX_ST = "(SELECT MAX(e.trang_thai_lam_viec) FROM etx_nhan_su_bh e WHERE e.gmail = LOWER(users.email))";
  const etx = c.req.query("etx");
  if (etx === "on") where += ` AND ${ETX_ST} = 'on'`;
  else if (etx === "off") where += ` AND ${ETX_ST} = 'off'`;
  else if (etx === "none") where += ` AND ${ETX_ST} IS NULL`;
  else if (etx === "off_mo") where += ` AND ${ETX_ST} = 'off' AND COALESCE(bi_khoa, 0) = 0`;
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT email, ten, ten_tay, bi_khoa, khoa_boi_etx, trang_thai_duyet, mien, ${ROLE_FLAGS.join(", ")}, created_at,
       (SELECT MAX(e.trang_thai_lam_viec) FROM etx_nhan_su_bh e WHERE e.gmail = LOWER(users.email)) AS etx_trang_thai,
       (SELECT json_group_array(json_object('ma', k.ma_ktv, 'ten', k.ten_hien_thi)) FROM ktv_lien_he_bh k WHERE LOWER(k.email_dang_nhap) = LOWER(users.email)) AS ktv_json,
       (SELECT json_group_array(ud.doi_tac_id) FROM user_doi_tac_bh ud WHERE ud.email = users.email) AS doi_tac_json
       FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM users WHERE ${where}`).bind(...binds).first<{ cnt: number }>(),
  ]);
  // 05/11/2026 - "ưu tiên hiện thị tên trên app linh-kien-app (theo mã ktv - ví dụ (id.ktv) tên ktv": tai khoan co trong
  // danh ba KTV -> ten_ktv = "(ma) Ten" (nhieu ma cung email: "(ma1, ma2) Ten").
  const users = (results as Array<Record<string, unknown>>).map(({ ktv_json, doi_tac_json, ...u0 }) => {
    // 16/11/2026 (v1.142): doi tac vai tro "Tra xac" duoc xu ly.
    let doiTac: number[] = [];
    try {
      doiTac = (JSON.parse(String(doi_tac_json || "[]")) as (number | null)[]).filter((x): x is number => typeof x === "number");
    } catch {
      doiTac = [];
    }
    const u: Record<string, unknown> = { ...u0, doi_tac_ids: doiTac };
    let ds: Array<{ ma: string | null; ten: string | null }> = [];
    try {
      ds = JSON.parse(String(ktv_json || "[]"));
    } catch {
      ds = [];
    }
    ds = ds.filter((k) => k && k.ma);
    if (!ds.length) return { ...u, ten_ktv: null };
    // 13/11/2026: hien dung ten ma CRM day du tren danh ba KTV (VD "(nguyetlb.mb2) CTV Hà Tĩnh - Lê Bích Nguyệt").
    const crm = ds.map((k) => (k.ten || "").trim()).find((t) => t.startsWith("("));
    if (crm) return { ...u, ten_ktv: crm };
    const ma = [...new Set(ds.map((k) => k.ma as string))].join(", ");
    const ten = ds.map((k) => (k.ten ? tenGonKtv(k.ten) : "")).find((t) => !!t) || (u.ten as string) || "";
    return { ...u, ten_ktv: `(${ma}) ${ten}`.trim() };
  });
  return c.json({ users, total: totalRow?.cnt ?? 0 });
});

// GET /api/users/nv-sua-chua - danh sach rut gon (email, ten) cac tai khoan la_nv_sua_chua=1, dung
// cho Admin BH chon "nguoi sua chua" luc phan loai (form Phan loai/FAST actions can 1 <select>, KHONG
// the goi GET / o tren vi route do chi danh cho la_qtri).
users.get("/nv-sua-chua", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare("SELECT email, ten FROM users WHERE la_nv_sua_chua = 1 AND bi_khoa = 0 ORDER BY ten, email").all();
  return c.json({ users: results });
});

// GET /api/users/ten - bang tra cuu email -> ten hien thi (09/10/2026: "Cac noi hien thi thong tin ten
// nguoi dung deu uu tien hien ten, neu khong co ten moi hien thi theo gmail"). Gop danh ba KTV
// (ktv_lien_he_bh.ten_hien_thi) + tai khoan (users.ten - uu tien). Frontend tai 1 lan/phien, cache may.

users.get("/ten", async (c) => {
  // 03/11/2026 - "Sửa lại tên người đặt hàng trên hệ thống theo tên nhân sự từ linh-kien-app kéo sang" (VD
  // karofibinhduong01@gmail.com hien "kenvin thanh" = ten Google). Uu tien: ho ten ETX nhan su (keo tu
  // linh-kien-app, ban 'on' truoc) > ten trong danh ba KTV (bo tien to "(ma) KTV Tinh - ") > ten Google (users.ten).
  const [ktv, us, etx] = await Promise.all([
    c.env.DB.prepare("SELECT email_dang_nhap AS email, ten_hien_thi AS ten FROM ktv_lien_he_bh WHERE email_dang_nhap IS NOT NULL AND TRIM(COALESCE(ten_hien_thi,'')) <> '' ORDER BY CASE nguon_du_lieu WHEN 'dong_bo' THEN 1 ELSE 0 END").all<{ email: string; ten: string }>(),
    c.env.DB.prepare("SELECT email, ten FROM users WHERE TRIM(COALESCE(ten,'')) <> ''").all<{ email: string; ten: string }>(),
    c.env.DB.prepare("SELECT gmail AS email, ho_ten AS ten FROM etx_nhan_su_bh WHERE gmail IS NOT NULL AND TRIM(COALESCE(ho_ten,'')) <> '' ORDER BY CASE trang_thai_lam_viec WHEN 'on' THEN 1 ELSE 0 END").all<{ email: string; ten: string }>(),
  ]);
  const names: Record<string, string> = {};
  // 13/11/2026: uu tien ten ma CRM tren danh ba KTV (day du "(ma) KTV Tinh - Ten") > ETX > ten tai khoan.
  for (const r of us.results) names[r.email.toLowerCase()] = r.ten.trim();
  for (const r of etx.results) names[r.email.toLowerCase()] = r.ten.trim();
  for (const r of ktv.results) names[r.email.toLowerCase()] = r.ten.trim();
  return c.json({ names });
});

// GET /api/users/giam-sat - danh sach rut gon (email, ten) cac tai khoan la_giam_sat=1, dung cho man
// "#/qtri/khu-vuc" (picker chon GS phu trach 1 Khu vuc) - cung mau voi GET /nv-sua-chua o tren.
users.get("/giam-sat", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare("SELECT email, ten FROM users WHERE la_giam_sat = 1 AND bi_khoa = 0 ORDER BY ten, email").all();
  return c.json({ users: results });
});

interface PatchBody {
  flag?: string;
  value?: boolean;
  bi_khoa?: boolean;
  trang_thai_duyet?: "Cho duyet" | "Da duyet" | "Tu choi";
  mien?: "MB" | "MN" | "ALL" | null;
  ten?: string;
  doi_tac_ids?: number[];
}

// PATCH /api/users/:email - sua 1 co vai tro (body {flag, value}), hoac bi_khoa/trang_thai_duyet.
// Chan tu-khoa/tu-go-quyen qtri cua CHINH minh (tranh khoa nham mat quyen truy cap, dung nguyen tac
// da ap dung o prototype xoaNguoiDung()/suaVaiTroNguoiDung()).
users.patch("/:email", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const targetEmail = decodeURIComponent(c.req.param("email"));
  const me = c.get("email");
  const body = await c.req.json<PatchBody>().catch(() => ({}) as PatchBody);

  if (targetEmail === me && (body.bi_khoa === true || (body.flag === "la_qtri" && body.value === false))) {
    return c.json({ error: "CANNOT_MODIFY_SELF" }, 400);
  }

  if (body.flag !== undefined) {
    if (!isRoleFlag(body.flag)) return c.json({ error: "INVALID_FLAG" }, 400);
    await c.env.DB.prepare(`UPDATE users SET ${body.flag} = ?, updated_at = ? WHERE email = ?`)
      .bind(body.value ? 1 : 0, nowVN(), targetEmail)
      .run();
  }
  if (body.bi_khoa !== undefined) {
    await c.env.DB.prepare("UPDATE users SET bi_khoa = ?, khoa_boi_etx = 0, updated_at = ? WHERE email = ?").bind(body.bi_khoa ? 1 : 0, nowVN(), targetEmail).run();
  }
  // 11/10/2026: mien phu trach cua nguoi xu ly (MB / MN / ALL = ca 2 / null = chua gan, thay tat ca).
  if (body.mien !== undefined) {
    if (body.mien !== null && !["MB", "MN", "ALL"].includes(body.mien)) return c.json({ error: "INVALID_MIEN" }, 400);
    await c.env.DB.prepare("UPDATE users SET mien = ?, mien_tu_dong = 0, updated_at = ? WHERE email = ?").bind(body.mien, nowVN(), targetEmail).run();
  }
  // 13/11/2026: Admin khai bao ten hien thi (tai khoan khong co tren danh ba KTV / ETX). Dang nhap Google khong ghi de;
  // co ten ma CRM / ETX thi lan dong bo sau van lay ten do (uu tien hon).
  if (body.ten !== undefined) {
    const ten = String(body.ten).trim().slice(0, 200);
    await c.env.DB.prepare("UPDATE users SET ten = ?, ten_tay = ?, updated_at = ? WHERE email = ?").bind(ten || null, ten ? 1 : 0, nowVN(), targetEmail).run();
  }
  // 16/11/2026 (v1.142): danh sach doi tac vai tro "Tra xac" duoc xu ly (thay ca bo).
  if (body.doi_tac_ids !== undefined) {
    if (!Array.isArray(body.doi_tac_ids)) return c.json({ error: "INVALID_DOI_TAC" }, 400);
    const ids = [...new Set(body.doi_tac_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM user_doi_tac_bh WHERE email = ?").bind(targetEmail),
      ...ids.map((id) => c.env.DB.prepare("INSERT OR IGNORE INTO user_doi_tac_bh (email, doi_tac_id) SELECT ?, id FROM doi_tac_bh WHERE id = ?").bind(targetEmail, id)),
    ]);
  }
  if (body.trang_thai_duyet !== undefined) {
    await c.env.DB.prepare("UPDATE users SET trang_thai_duyet = ?, updated_at = ? WHERE email = ?").bind(body.trang_thai_duyet, nowVN(), targetEmail).run();
  }
  return c.json({ ok: true });
});

interface CreateBody {
  email?: string;
  ten?: string;
}

// POST /api/users - tao 1 tai khoan placeholder (Cho duyet), qtri gan vai tro sau qua PATCH. Chan
// trung email (kiem tra da xac nhan can o prototype: submitThemNguoiDung() "chan trung email").
users.post("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<CreateBody>().catch(() => ({}) as CreateBody);
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return c.json({ error: "INVALID_EMAIL" }, 400);

  const existing = await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
  if (existing) return c.json({ error: "EMAIL_EXISTS" }, 409);

  await c.env.DB.prepare("INSERT INTO users (email, ten, ten_tay, trang_thai_duyet) VALUES (?, ?, ?, 'Cho duyet')").bind(email, body.ten?.trim() || null, body.ten?.trim() ? 1 : 0).run();
  return c.json({ ok: true });
});

// DELETE /api/users/:email - xoa tai khoan. Chan tu-xoa chinh minh.
users.delete("/:email", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const targetEmail = decodeURIComponent(c.req.param("email"));
  if (targetEmail === c.get("email")) return c.json({ error: "CANNOT_DELETE_SELF" }, 400);
  await c.env.DB.prepare("DELETE FROM users WHERE email = ?").bind(targetEmail).run();
  return c.json({ ok: true });
});

export default users;
