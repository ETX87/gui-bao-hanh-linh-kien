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
// 01/11/2026 ("1 khu vực có thể có nhiều GS cùng phụ trách"): tra them gs_emails = danh sach GS
// (khu_vuc_gs_bh), gs_email giu lai la GS chinh.
khuVuc.get("/", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const [{ results }, gs] = await Promise.all([
    c.env.DB.prepare(
      `SELECT k.khu_vuc_ma AS ma, COUNT(*) AS so_ktv, kv.ten AS ten, kv.gs_email AS gs_email
       FROM ktv_lien_he_bh k
       LEFT JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma
       WHERE k.khu_vuc_ma IS NOT NULL AND k.khu_vuc_ma != ''
       GROUP BY k.khu_vuc_ma
       ORDER BY k.khu_vuc_ma`,
    ).all<{ ma: string; gs_email: string | null }>(),
    c.env.DB.prepare("SELECT khu_vuc_ma, gs_email, nguon FROM khu_vuc_gs_bh ORDER BY gs_email").all<{ khu_vuc_ma: string; gs_email: string; nguon: string }>(),
  ]);
  const map = new Map<string, string[]>();
  const dongBo = new Map<string, string[]>();
  for (const r of gs.results) {
    const a = map.get(r.khu_vuc_ma) ?? [];
    a.push(r.gs_email);
    map.set(r.khu_vuc_ma, a);
    if (r.nguon === "linhkien") dongBo.set(r.khu_vuc_ma, [...(dongBo.get(r.khu_vuc_ma) ?? []), r.gs_email]);
  }
  return c.json({
    khu_vuc: results.map((r) => {
      const list = map.get(r.ma) ?? [];
      // GS chinh dung dau danh sach.
      const main = r.gs_email?.toLowerCase();
      if (main && list.includes(main)) list.sort((a, b) => (a === main ? -1 : b === main ? 1 : 0));
      // gs_dong_bo: GS den tu linh-kien-app (GS chinh / GS phu gan ben do) - bo tich o day thi lan dong bo sau se them lai.
      return { ...r, gs_emails: list, gs_dong_bo: dongBo.get(r.ma) ?? [] };
    }),
  });
});

interface PatchBody {
  ten?: string;
  gs_email?: string | null;
  gs_emails?: string[];
}

// PATCH /:ma - doi ten hien thi va/hoac danh sach GS phu trach cua 1 Khu vuc - upsert vi Khu vuc co the
// CHUA co dong khu_vuc_bh nao (moi thay qua ktv_lien_he_bh.khu_vuc_ma). gs_emails = danh sach GS (thay
// toan bo, [] = bo het); GS dau tien thanh GS chinh (khu_vuc_bh.gs_email). Van nhan gs_email (1 GS) cho
// tuong thich.
khuVuc.patch("/:ma", async (c) => {
  if (!requireQtri(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const ma = decodeURIComponent(c.req.param("ma"));
  const body = await c.req.json<PatchBody>().catch(() => ({}) as PatchBody);

  const existing = await c.env.DB.prepare("SELECT ten, gs_email FROM khu_vuc_bh WHERE ma = ?").bind(ma).first<{ ten: string; gs_email: string | null }>();
  const ten = body.ten?.trim() || existing?.ten || ma;
  let list: string[] | null = null;
  if (Array.isArray(body.gs_emails)) list = body.gs_emails;
  else if (body.gs_email !== undefined) list = body.gs_email?.trim() ? [body.gs_email] : [];
  if (list) list = [...new Set(list.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  if (list && list.length > 50) return c.json({ error: "INVALID_BODY" }, 400);
  if (list && list.length) {
    const ph = list.map(() => "?").join(",");
    const ok = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE LOWER(email) IN (${ph}) AND la_giam_sat = 1`).bind(...list).first<{ n: number }>();
    if ((ok?.n ?? 0) !== list.length) return c.json({ error: "GS_KHONG_HOP_LE" }, 400);
  }
  const gsMain = list ? (list[0] ?? null) : (existing?.gs_email ?? null);

  const stmts = [
    c.env.DB.prepare(
      `INSERT INTO khu_vuc_bh (ma, ten, gs_email, dong_bo_luc) VALUES (?, ?, ?, ?)
       ON CONFLICT(ma) DO UPDATE SET ten = excluded.ten, gs_email = excluded.gs_email, dong_bo_luc = excluded.dong_bo_luc`,
    ).bind(ma, ten, gsMain, nowVN()),
  ];
  if (list) {
    // Giu nguon cu cua GS con duoc tich (dong bo / tay); GS moi tich = 'tay'.
    const { results: cu } = await c.env.DB.prepare("SELECT gs_email, nguon FROM khu_vuc_gs_bh WHERE khu_vuc_ma = ?").bind(ma).all<{ gs_email: string; nguon: string }>();
    const nguonCu = new Map(cu.map((r) => [r.gs_email, r.nguon]));
    stmts.push(c.env.DB.prepare("DELETE FROM khu_vuc_gs_bh WHERE khu_vuc_ma = ?").bind(ma));
    for (const e of list) stmts.push(c.env.DB.prepare("INSERT OR IGNORE INTO khu_vuc_gs_bh (khu_vuc_ma, gs_email, nguon) VALUES (?, ?, ?)").bind(ma, e, nguonCu.get(e) ?? "tay"));
  }
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

export default khuVuc;
