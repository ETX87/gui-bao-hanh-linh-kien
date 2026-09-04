/**
 * Sinh ID tuan tu (vd "BH-000123") qua bang dem rieng `id_counters` - port mau tu
 * linh-kien-app/backend/src/lib/idCounter.ts (UPDATE...RETURNING de tang atomic, O(1) bat ke bang
 * nguon lon co nao). Prefix dung DUNG quy uoc cua ham nextId() trong prototype-html/index.html:
 * gui -> "BH", dh (don sua chua cha) -> "DH", tra (phieu tra) -> "TR", deu dem 6 chu so.
 */
export async function nextSequentialId(db: D1Database, table: "phieu_gui_bh" | "phieu_sua_chua_bh" | "phieu_tra_bh", prefix: "BH" | "DH" | "TR"): Promise<string> {
  const row = await db
    .prepare("UPDATE id_counters SET gia_tri_hien_tai = gia_tri_hien_tai + 1 WHERE ten_bang = ? RETURNING gia_tri_hien_tai")
    .bind(table)
    .first<{ gia_tri_hien_tai: number }>();
  const next = row?.gia_tri_hien_tai ?? 1;
  return `${prefix}-${String(next).padStart(6, "0")}`;
}
