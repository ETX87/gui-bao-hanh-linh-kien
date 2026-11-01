// Tinh email GS phu trach (dong goi san vao phieu_sua_chua_bh.email_gs luc tao don, dung mau
// "ddh.email_gs" cua linh-kien-app - xem migrations/0001_init.sql). Tra tu ktv_lien_he_bh.khu_vuc_ma
// -> khu_vuc_bh.gs_email ("GS chinh") cua chinh KTV tao don; neu chua co GS chinh thi lay GS dau tien
// trong khu_vuc_gs_bh. NULL neu KTV chua duoc gan Khu vuc hoac Khu vuc chua co GS phu trach.
export async function computeEmailGs(db: D1Database, ktvEmail: string): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT COALESCE(kv.gs_email, (SELECT x.gs_email FROM khu_vuc_gs_bh x WHERE x.khu_vuc_ma = k.khu_vuc_ma ORDER BY x.gs_email LIMIT 1)) AS gs_email
       FROM ktv_lien_he_bh k
       LEFT JOIN khu_vuc_bh kv ON kv.ma = k.khu_vuc_ma
       WHERE k.email_dang_nhap = ?`,
    )
    .bind(ktvEmail)
    .first<{ gs_email: string | null }>();
  return row?.gs_email ?? null;
}

// 01/11/2026: 1 Khu vuc co nhieu GS (khu_vuc_gs_bh). Subquery tra ve email dang nhap cua moi KTV
// thuoc cac Khu vuc ma GS (tham so ?) phu trach.
export const GS_KTV_SUBQUERY =
  "SELECT k.email_dang_nhap FROM ktv_lien_he_bh k JOIN khu_vuc_gs_bh x ON x.khu_vuc_ma = k.khu_vuc_ma WHERE x.gs_email = ?";

// Subquery ma khu vuc ma GS (tham so ?) phu trach.
export const GS_KHU_VUC_SUBQUERY = "SELECT khu_vuc_ma FROM khu_vuc_gs_bh WHERE gs_email = ?";

// GS co phu trach Khu vuc cua KTV nay khong.
export async function isGsOfKtv(db: D1Database, gsEmail: string, ktvEmail: string): Promise<boolean> {
  const r = await db
    .prepare(`SELECT 1 FROM ktv_lien_he_bh k JOIN khu_vuc_gs_bh x ON x.khu_vuc_ma = k.khu_vuc_ma WHERE k.email_dang_nhap = ? AND x.gs_email = ? LIMIT 1`)
    .bind(ktvEmail, gsEmail.toLowerCase())
    .first();
  return !!r;
}

// Danh sach GS cua Khu vuc chua KTV nay (hien o UI chi tiet don).
export async function gsListOfKtv(db: D1Database, ktvEmail: string): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT x.gs_email FROM ktv_lien_he_bh k JOIN khu_vuc_gs_bh x ON x.khu_vuc_ma = k.khu_vuc_ma WHERE k.email_dang_nhap = ? ORDER BY x.gs_email`)
    .bind(ktvEmail)
    .all<{ gs_email: string }>();
  return results.map((r) => r.gs_email);
}
