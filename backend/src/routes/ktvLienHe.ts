import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { parsePage } from "../lib/pagination";

// Man "Quan ly danh sach KTV" (qtri) - CRUD ktv_lien_he_bh, gap that phat hien 04/09/2026 ("thieu
// modules quan ly danh sach ktv"): bang nay truoc gio CHI nhan duoc du lieu qua sync day tu
// linh-kien-app (routes/sync.ts), nhung co che day o phia linh-kien-app CHUA trien khai xong (xem
// CLAUDE.md "Giai doan 5") nen bang dang RONG tren production - khong co du lieu de auth.ts (GET
// /callback) doi chieu tu dong duyet tai khoan KTV dang nhap lan dau. Them man nay de qtri tu khai
// bao thu cong (nguon_du_lieu='noi_bo', xem migrations/0002) - dung duoc tinh nang auto-duyet ngay,
// khong phai cho lien-kien-app deploy xong. Dong "dong_bo" van sua/xoa duoc tu do (khong khoa field
// nhu linh_kien_bh) - sync lan sau se ghi de lai dung du lieu that neu co xung dot.

const ktvLienHe = new Hono<{ Bindings: Env }>();
ktvLienHe.use("*", verifySessionMiddleware, loadUser);

const VAI_TRO_VALUES = ["KTV", "CTV", "Tram", "Ve tinh"] as const;

function requireQtri(c: { get(k: "user"): { la_qtri: boolean } }): boolean {
  return c.get("user").la_qtri;
}

// GET / - mo rong 05/09/2026 (muc 1, "GS khu vực của KTV hoặc Admin bảo hành tạo hộ đơn bảo hành"):
// truoc chi la_qtri doc duoc (man #/qtri/ktv). Nay la_admin_bh doc duoc TOAN BO (khong gioi han khu
// vuc - dung nguyen van "hoặc Admin bảo hành" khong kem dieu kien), la_giam_sat CHI thay KTV thuoc
// dung Khu vuc minh phu trach (khop qua khu_vuc_bh.gs_email, dung mau computeEmailGs() da co). Dung
// cho picker "chọn KTV để tạo hộ" (SearchableSelect, khong dung thu vien lay danh sach day du - xem
// quy uoc "khong truyen limit = danh sach day du cho o chon" da chot o vong phan trang 05/09/2026);
// co truyen limit van la ban phan trang that cho bang quan tri #/qtri/ktv, khong doi hanh vi cu.
ktvLienHe.get("/", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh || user.la_giam_sat)) return c.json({ error: "FORBIDDEN" }, 403);

  let where = "1=1";
  const binds: unknown[] = [];
  if (user.la_giam_sat && !user.la_admin_bh && !user.la_qtri) {
    where = "khu_vuc_ma IN (SELECT ma FROM khu_vuc_bh WHERE gs_email = ?)";
    binds.push(user.email);
  }
  // Phat hien 13 vong ra soat UX: tim theo ten/email/SDT/ma KTV/khu vuc.
  const kw = (c.req.query("q") || "").trim();
  if (kw) {
    where += " AND (ten_hien_thi LIKE ? OR email_dang_nhap LIKE ? OR sdt LIKE ? OR ma_ktv LIKE ? OR khu_vuc_ma LIKE ?)";
    const like = `%${kw}%`;
    binds.push(like, like, like, like, like);
  }

  if (c.req.query("limit") === undefined) {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ktv_lien_he_bh WHERE ${where} ORDER BY ten_hien_thi, ma_ktv`)
      .bind(...binds)
      .all();
    return c.json({ ktv: results, total: results.length });
  }

  const { limit, offset } = parsePage(c);
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM ktv_lien_he_bh WHERE ${where} ORDER BY ten_hien_thi, ma_ktv LIMIT ? OFFSET ?`)
      .bind(...binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM ktv_lien_he_bh WHERE ${where}`)
      .bind(...binds)
      .first<{ cnt: number }>(),
  ]);
  return c.json({ ktv: results, total: totalRow?.cnt ?? 0 });
});

interface KtvBody {
  ma_ktv?: string;
  ten_hien_thi?: string;
  sdt?: string;
  gmail?: string;
  email_dang_nhap?: string;
  vai_tro_ktv?: string;
  khu_vuc_ma?: string;
  ktv_cap1_phu_trach?: string;
}

ktvLienHe.post("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const body = await c.req.json<KtvBody>().catch(() => ({}) as KtvBody);
  if (!body.ten_hien_thi?.trim()) return c.json({ error: "MISSING_TEN" }, 400);
  if (!body.email_dang_nhap?.trim()) return c.json({ error: "MISSING_EMAIL_DANG_NHAP" }, 400);
  if (body.vai_tro_ktv && !(VAI_TRO_VALUES as readonly string[]).includes(body.vai_tro_ktv)) return c.json({ error: "INVALID_VAI_TRO" }, 400);

  // ma_ktv la khoa chinh dang TEXT tu do (dong bo dung ID noi bo cua linh-kien-app) - dong tu khai
  // bao thu cong khong co ID nguon nao, mac dinh lay chinh email dang nhap lam khoa (duy nhat, du
  // dung de INSERT khong trung, khong can them 1 bo dem rieng chi cho truong hop nay).
  const maKtv = body.ma_ktv?.trim() || body.email_dang_nhap.trim();
  const exists = await c.env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE ma_ktv = ?").bind(maKtv).first();
  if (exists) return c.json({ error: "MA_KTV_EXISTS" }, 400);

  await c.env.DB.prepare(
    `INSERT INTO ktv_lien_he_bh (ma_ktv, ten_hien_thi, sdt, gmail, email_dang_nhap, vai_tro_ktv, khu_vuc_ma, ktv_cap1_phu_trach, nguon_du_lieu, dong_bo_luc)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'noi_bo', ?)`,
  )
    .bind(maKtv, body.ten_hien_thi.trim(), body.sdt?.trim() || null, body.gmail?.trim() || null, body.email_dang_nhap.trim(), body.vai_tro_ktv || null, body.khu_vuc_ma?.trim() || null, body.ktv_cap1_phu_trach?.trim() || null, nowVN())
    .run();
  return c.json({ ma_ktv: maKtv }, 201);
});

ktvLienHe.patch("/:ma_ktv", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const maKtv = c.req.param("ma_ktv");
  const body = await c.req.json<KtvBody>().catch(() => ({}) as KtvBody);
  if (body.vai_tro_ktv && !(VAI_TRO_VALUES as readonly string[]).includes(body.vai_tro_ktv)) return c.json({ error: "INVALID_VAI_TRO" }, 400);
  const row = await c.env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE ma_ktv = ?").bind(maKtv).first();
  if (!row) return c.json({ error: "NOT_FOUND" }, 404);

  await c.env.DB.prepare(
    `UPDATE ktv_lien_he_bh SET
       ten_hien_thi = COALESCE(?, ten_hien_thi), sdt = ?, gmail = ?, email_dang_nhap = COALESCE(?, email_dang_nhap),
       vai_tro_ktv = ?, khu_vuc_ma = ?, ktv_cap1_phu_trach = ?, dong_bo_luc = ?
     WHERE ma_ktv = ?`,
  )
    .bind(body.ten_hien_thi?.trim() || null, body.sdt?.trim() || null, body.gmail?.trim() || null, body.email_dang_nhap?.trim() || null, body.vai_tro_ktv || null, body.khu_vuc_ma?.trim() || null, body.ktv_cap1_phu_trach?.trim() || null, nowVN(), maKtv)
    .run();
  return c.json({ ok: true });
});

ktvLienHe.delete("/:ma_ktv", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const maKtv = c.req.param("ma_ktv");
  await c.env.DB.prepare("DELETE FROM ktv_lien_he_bh WHERE ma_ktv = ?").bind(maKtv).run();
  return c.json({ ok: true });
});

export default ktvLienHe;
