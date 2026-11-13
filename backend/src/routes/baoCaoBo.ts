import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { thangRange, tinhBaoCaoBo } from "../lib/baoCaoBo";
import { nowVN } from "../lib/vnTime";

// GET /api/bao-cao-bo?thang=YYYY-MM - ket qua lam viec tung vai tro BO theo thang (xem lib/baoCaoBo.ts).
// Chi Admin he thong, Admin bao hanh, View (quan ly / kiem soat) xem duoc.
//
// 13/11/2026 ("báo cáo này tự động tạo 1 lần đầu tiên trong ngày khi có người vào xem, vào thêm 1 nút load
// lại thủ công để tránh báo cáo gây lãnh phí D1"): ket qua moi thang luu 1 dong sync_state
// (key bao_cao_bo:<thang>). Lan mo dau tien trong ngay (gio VN) moi tinh lai, cac lan sau doc ban da luu.
// ?lam_moi=1 = tinh lai ngay (nut "Tinh lai"), toi da 1 lan / 2 phut moi thang.
const baoCaoBo = new Hono<{ Bindings: Env }>();
baoCaoBo.use("*", verifySessionMiddleware, loadUser);

const LAM_MOI_TOI_THIEU_MS = 2 * 60_000;

baoCaoBo.get("/", async (c) => {
  const user = c.get("user");
  if (!(user.la_qtri || user.la_admin_bh || user.la_view))
    return c.json({ error: "FORBIDDEN" }, 403);
  const thang = c.req.query("thang") || nowVN().slice(0, 7);
  if (!thangRange(thang)) return c.json({ error: "INVALID_THANG" }, 400);
  const key = `bao_cao_bo:${thang}`;
  const now = nowVN();
  const row = await c.env.DB.prepare(
    "SELECT value, updated_at FROM sync_state WHERE key = ?",
  )
    .bind(key)
    .first<{ value: string; updated_at: string }>();
  const lamMoi = c.req.query("lam_moi") === "1";
  if (row) {
    const cungNgay = row.updated_at.slice(0, 10) === now.slice(0, 10);
    // Ca 2 ve deu la gio VN ma hoa nhu UTC nen tru truc tiep duoc.
    const vuaTinh =
      Date.parse(now.replace(" ", "T") + "Z") -
        Date.parse(row.updated_at.replace(" ", "T") + "Z") <
      LAM_MOI_TOI_THIEU_MS;
    if ((!lamMoi && cungNgay) || (lamMoi && vuaTinh)) {
      try {
        return c.json({
          ...JSON.parse(row.value),
          tinh_luc: row.updated_at,
          tu_bo_nho: true,
        });
      } catch {
        /* hong -> tinh lai */
      }
    }
  }
  const r = await tinhBaoCaoBo(c.env.DB, thang);
  if (!r) return c.json({ error: "INVALID_THANG" }, 400);
  await c.env.DB.prepare(
    "INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  )
    .bind(key, JSON.stringify(r), now)
    .run();
  return c.json({ ...r, tinh_luc: now, tu_bo_nho: false });
});

export default baoCaoBo;
