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

async function lookupHangDoiTac(db: D1Database, caseId: string | null): Promise<{ brandName: string | null; partnerName: string | null }> {
  if (!caseId) return { brandName: null, partnerName: null };
  const snap = await db.prepare("SELECT data FROM case_lookup_snapshot WHERE case_id = ?").bind(caseId).first<{ data: string }>();
  if (!snap) return { brandName: null, partnerName: null };
  try {
    const parsed = JSON.parse(snap.data) as { hang?: string | null; doi_tac?: string | null };
    return { brandName: parsed.hang ?? null, partnerName: parsed.doi_tac ?? null };
  } catch {
    return { brandName: null, partnerName: null };
  }
}

async function ktvTenHienThi(db: D1Database, email: string): Promise<string | null> {
  const row = await db.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(email).first<{ ten_hien_thi: string | null }>();
  return row?.ten_hien_thi ?? null;
}

khovanLookup.get("/:id", async (c) => {
  const id = c.req.param("id");

  // Tra bao hanh (TR-...) - thung do Kho gui TRA lai cho KTV (nguyen tac "Kho chi thao
  // tac qua app kho van", chot 2026-09-07) - khac chieu voi BH- (KTV gui VE kho).
  if (id.startsWith("TR-")) {
    const t = await c.env.DB.prepare("SELECT ktv_nhan FROM phieu_tra_bh WHERE id = ?").bind(id).first<{ ktv_nhan: string }>();
    if (!t) return c.json({ error: "NOT_FOUND" }, 404);
    const ktvName = await ktvTenHienThi(c.env.DB, t.ktv_nhan);

    // "Don con dau tien" gan voi phieu tra nay (qua phieu_sua_chua_bh_ct.phieu_tra_id) -
    // cung quy uoc dai dien hang/doi tac nhu nhanh BH- ben duoi (chot 07/09/2026: 1
    // thung co the co nhieu don/hang/doi tac khac nhau, lay dai dien don dau tien).
    const firstUnit = await c.env.DB.prepare(
      `SELECT p.case_id FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE u.phieu_tra_id = ? ORDER BY u.rowid ASC LIMIT 1`,
    ).bind(id).first<{ case_id: string | null }>();
    const { brandName, partnerName } = await lookupHangDoiTac(c.env.DB, firstUnit?.case_id ?? null);

    return c.json({
      sender_name: `Kho SC-BH (trả cho KTV ${ktvName || t.ktv_nhan})`,
      brand_name: brandName,
      partner_name: partnerName,
    });
  }

  const box = await c.env.DB.prepare("SELECT nguoi_tao FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ nguoi_tao: string }>();
  if (!box) return c.json({ error: "NOT_FOUND" }, 404);

  const ktvName = await ktvTenHienThi(c.env.DB, box.nguoi_tao);

  // "Don con dau tien" = ban ghi phieu_sua_chua_bh cu nhat cua thung nay (bang khong
  // co cot thoi gian tao rieng, dung rowid ngam dinh cua SQLite lam thu tu chen).
  const firstCase = await c.env.DB.prepare(
    "SELECT case_id FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? ORDER BY rowid ASC LIMIT 1"
  ).bind(id).first<{ case_id: string | null }>();
  const { brandName, partnerName } = await lookupHangDoiTac(c.env.DB, firstCase?.case_id ?? null);

  return c.json({
    sender_name: ktvName || box.nguoi_tao,
    brand_name: brandName,
    partner_name: partnerName,
  });
});

export default khovanLookup;
