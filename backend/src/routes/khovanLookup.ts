import { Hono } from "hono";
import type { Env } from "../types";

// Khovan (he Quan ly hang ve kho) goi vao day khi kho quet ma 1 thung hang da duoc
// bao truoc (xem lib/khovanPushClient.ts) - lay thong tin MOI NHAT (nguoi tao,
// hang/doi tac cua don con dau tien - chot 07/09/2026: 1 thung co the co nhieu don
// hang/doi tac khac nhau, lay dai dien don dau tien) de tu dien form nhan hang ben
// khovan. Xac thuc bang 1 secret dung chung don gian (X-Khovan-Key), cung khuon voi
// routes/sync.ts (LINHKIEN_SYNC_API_KEY) - quan he 1-1, khong dung bang nhieu-key.
const khovanLookup = new Hono<{ Bindings: Env }>();

khovanLookup.use("*", async (c, next) => {
  const key = c.req.header("X-Khovan-Key");
  if (!key || !c.env.KHOVAN_LOOKUP_API_KEY || key !== c.env.KHOVAN_LOOKUP_API_KEY) {
    return c.json({ error: "INVALID_KEY" }, 401);
  }
  await next();
});

khovanLookup.get("/:id", async (c) => {
  const id = c.req.param("id");
  const box = await c.env.DB.prepare("SELECT nguoi_tao FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string }>();
  if (!box) return c.json({ error: "NOT_FOUND" }, 404);

  const ktvInfo = await c.env.DB.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?")
    .bind(box.nguoi_tao)
    .first<{ ten_hien_thi: string | null }>();

  // "Don con dau tien" = ban ghi phieu_sua_chua_bh cu nhat cua thung nay (bang khong
  // co cot thoi gian tao rieng, dung rowid ngam dinh cua SQLite lam thu tu chen).
  const firstCase = await c.env.DB.prepare(
    "SELECT case_id FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? ORDER BY rowid ASC LIMIT 1"
  ).bind(id).first<{ case_id: string | null }>();

  let brandName: string | null = null;
  let partnerName: string | null = null;
  if (firstCase?.case_id) {
    const snap = await c.env.DB.prepare("SELECT data FROM case_lookup_snapshot WHERE case_id = ?")
      .bind(firstCase.case_id)
      .first<{ data: string }>();
    if (snap) {
      try {
        const parsed = JSON.parse(snap.data) as { hang?: string | null; doi_tac?: string | null };
        brandName = parsed.hang ?? null;
        partnerName = parsed.doi_tac ?? null;
      } catch {
        // du lieu snapshot hong - bo qua, tra ve null cho 2 truong nay
      }
    }
  }

  return c.json({
    sender_name: ktvInfo?.ten_hien_thi || box.nguoi_tao,
    brand_name: brandName,
    partner_name: partnerName,
  });
});

export default khovanLookup;
