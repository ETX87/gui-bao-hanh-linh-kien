import { extractMaKtv } from "./ktvCode";
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

// 05/11/2026 - "chỉ cần là 1 trong 2 người là tạo được (trạm triển khai là Trạm A, KTV triển khai là KTV B ... => Trạm A hoặc KTV B
// đều có thể lên đặt đơn bh)": ma KTV cua 1 case = ma trong ky_thuat_vien (Tram) + ma trong ktv_trien_khai (dvbh v1.522).
export function maKtvCuaCase(p: { ky_thuat_vien?: string | null; ktv_trien_khai?: string | null } | null | undefined): string[] {
  if (!p) return [];
  return [...new Set([extractMaKtv(p.ky_thuat_vien ?? null), extractMaKtv(p.ktv_trien_khai ?? null)].filter((x): x is string => !!x))];
}

// Case co thuoc KTV (email) khong - khop Tram HOAC KTV trien khai.
export async function caseThuocKtv(db: D1Database, p: { ky_thuat_vien?: string | null; ktv_trien_khai?: string | null } | null | undefined, email: string | null | undefined): Promise<boolean> {
  const ma = maKtvCuaCase(p);
  if (!ma.length) return false;
  const cua = await maKtvCuaEmail(db, email);
  return ma.some((m) => cua.includes(m));
}

// 05/11/2026 - "1 Tài khoản KTV có thể tạo đơn thay cho 1 tài khoản KTV khác" (Quan tri > Danh sach KTV): danh sach email KTV
// ma `email` duoc tao don ho.
export async function ktvDuocTaoHo(db: D1Database, email: string | null | undefined): Promise<string[]> {
  if (!email) return [];
  const { results } = await db.prepare("SELECT cho_email FROM ktv_tao_ho_bh WHERE LOWER(email) = LOWER(?)").bind(email).all<{ cho_email: string }>();
  return results.map((r) => r.cho_email);
}
export async function laKtvTaoHo(db: D1Database, email: string, choEmail: string): Promise<boolean> {
  return !!(await db.prepare("SELECT 1 AS x FROM ktv_tao_ho_bh WHERE LOWER(email) = LOWER(?) AND LOWER(cho_email) = LOWER(?)").bind(email, choEmail).first());
}
