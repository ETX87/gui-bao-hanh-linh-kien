import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";

// Man "Quan ly Giam sat khu vuc" (qtri) - gap that phat hien 07/09/2026 ("phân vai trò giám sát cho
// 1 nhân viên nhưng không thể phân khu vực cho họ để họ quản lý nhân sự khu vực mình"): khu_vuc_bh
// (ma, ten, gs_email) truoc gio CHI nhan duoc du lieu qua sync day tu linh-kien-app
// (routes/sync.ts POST /khu-vuc), nhung phia do CHUA day entity "khu-vuc" (chi moi day "ktv" - xac
// nhan qua sondu lieu that: ktv_lien_he_bh co 492 dong nhung khu_vuc_bh dang RONG) - khong co man hinh
// nao de qtri tu gan gs_email trong luc cho linh-kien-app trien khai xong. Them man nay de qtri tu
// quan ly ngay, dung mau hybrid giong ktv_lien_he_bh/linh_kien_bh (dong bo sau nay se ghi de ten/
// gs_email neu co xung dot - chap nhan duoc vi hien tai khong co du lieu dong bo nao ca).
//
// Nguon danh sach "Khu vuc" de qtri chon: LAY TU khu_vuc_ma DA CO SAN tren tung dong ktv_lien_he_bh
// (dung nguyen van "hiện có của KTV kéo về từ API") thay vi bat qtri go tay ma khu vuc tu do - GROUP
// BY + LEFT JOIN khu_vuc_bh de biet dong nao da co ten/GS, dong nao chua.

const khuVuc = new Hono<{ Bindings: Env }>();
khuVuc.use("*", verifySessionMiddleware, loadUser);

function requireQtri(c: { get(k: "user"): { la_qtri: boolean } }): boolean {
  return c.get("user").la_qtri;
}

// GET / - moi Khu vuc DA TUNG thay tren it nhat 1 dong ktv_lien_he_bh (ke ca chua co dong khu_vuc_bh
// tuong ung - ten/gs_email se la null, frontend hien "Chưa đặt tên"/"Chưa gán").
khuVuc.get("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT k.khu_vuc_ma AS ma, COUNT(*) AS so_ktv, kv.ten AS ten, kv.gs_email AS gs_email
     FROM ktv_lien_he_bh k
     LEFT JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma
     WHERE k.khu_vuc_ma IS NOT NULL AND k.khu_vuc_ma != ''
     GROUP BY k.khu_vuc_ma
     ORDER BY k.khu_vuc_ma`,
  ).all();
  return c.json({ khu_vuc: results });
});

interface PatchBody {
  ten?: string;
  gs_email?: string | null;
}

// PATCH /:ma - gan/doi GS phu trach (va/hoac ten hien thi) cho 1 Khu vuc - upsert vi co the Khu vuc
// nay CHUA co dong khu_vuc_bh nao (moi thay qua ktv_lien_he_bh.khu_vuc_ma, chua tung dong bo).
// gs_email=null (hoac "") = go GS dang gan (Khu vuc tro ve trang thai "chua co GS phu trach").
khuVuc.patch("/:ma", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const ma = decodeURIComponent(c.req.param("ma"));
  const body = await c.req.json<PatchBody>().catch(() => ({}) as PatchBody);

  const existing = await c.env.DB.prepare("SELECT ten, gs_email FROM khu_vuc_bh WHERE ma = ?").bind(ma).first<{ ten: string; gs_email: string | null }>();
  const ten = body.ten?.trim() || existing?.ten || ma;
  const gsEmail = body.gs_email === undefined ? (existing?.gs_email ?? null) : body.gs_email?.trim() || null;

  await c.env.DB.prepare(
    `INSERT INTO khu_vuc_bh (ma, ten, gs_email, dong_bo_luc) VALUES (?, ?, ?, ?)
     ON CONFLICT(ma) DO UPDATE SET ten = excluded.ten, gs_email = excluded.gs_email, dong_bo_luc = excluded.dong_bo_luc`,
  )
    .bind(ma, ten, gsEmail, nowVN())
    .run();
  return c.json({ ok: true });
});

export default khuVuc;
