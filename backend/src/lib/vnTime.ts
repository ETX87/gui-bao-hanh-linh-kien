/**
 * Gio VN hien tai dang "YYYY-MM-DD HH:MM:SS" - port nguyen ven tu linh-kien-app/backend/src/lib/
 * vnTime.ts. Dung cho MOI cot timestamp he thong tu sinh (created_at, updated_at, thoi_gian...) khi
 * ghi tu code JS - de nhat quan voi 2 he kia va so sanh/hien thi truc tiep khong can quy doi
 * timezone. Dung ham nay thay vi new Date().toISOString() (tra ve UTC that).
 */
export function nowVN(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
}
