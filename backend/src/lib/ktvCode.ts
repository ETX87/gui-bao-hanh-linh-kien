/**
 * "case_dvbh.ky_thuat_vien" la text tu do tu CRM, dang "(ma) Loai - Khu vuc - Ten" (vd "(huannt.mb)
 * Tram Bac Ninh - ..."). Phan "(ma)" o dau chuoi on dinh qua cac lan import - port DUNG tu
 * linh-kien-app/backend/src/lib/ktvCode.ts, dung de doi chieu voi ktv_lien_he_bh.ma_ktv khi kiem tra
 * "ma su co co dung cua KTV do khong" (yeu cau 05/09/2026 muc 2), KHONG dung nguyen chuoi lam khoa.
 */
export function extractMaKtv(kyThuatVien: string | null | undefined): string | null {
  if (!kyThuatVien) return null;
  const m = /^\(([^)]+)\)/.exec(kyThuatVien.trim());
  return m ? m[1].trim() : null;
}
