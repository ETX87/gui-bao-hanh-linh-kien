// 03/11/2026: 1 email KTV co the gan NHIEU ma KTV trong danh ba (VD nguyenvantinh29091986@gmail.com co ca
// "tinhnv.ptdv-hcm" lan "tinhnv.ns-465" - doi ma / chuyen khu vuc). Truoc day chi lay 1 dong (.first()) nen
// case thuoc ma con lai bi bao nham "Sai ma su vu". Moi cho doi chieu ma KTV voi case / don Odoo dung ham nay.
export async function maKtvCuaEmail(db: D1Database, email: string | null | undefined): Promise<string[]> {
  if (!email) return [];
  const { results } = await db
    .prepare("SELECT DISTINCT ma_ktv FROM ktv_lien_he_bh WHERE LOWER(email_dang_nhap) = LOWER(?) AND ma_ktv IS NOT NULL")
    .bind(email)
    .all<{ ma_ktv: string }>();
  return results.map((r) => r.ma_ktv);
}
