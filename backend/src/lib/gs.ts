// Tinh email GS phu trach (dong goi san vao phieu_sua_chua_bh.email_gs luc tao don, dung mau
// "ddh.email_gs" cua linh-kien-app - xem migrations/0001_init.sql). Tra tu ktv_lien_he_bh.khu_vuc_ma
// -> khu_vuc_bh.gs_email cua chinh KTV tao don - NULL neu KTV chua duoc gan Khu vuc (chua dong bo
// tu linh-kien-app) hoac Khu vuc chua co GS phu trach.
export async function computeEmailGs(db: D1Database, ktvEmail: string): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT kv.gs_email FROM ktv_lien_he_bh k
       JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma
       WHERE k.email_dang_nhap = ?`,
    )
    .bind(ktvEmail)
    .first<{ gs_email: string | null }>();
  return row?.gs_email ?? null;
}
