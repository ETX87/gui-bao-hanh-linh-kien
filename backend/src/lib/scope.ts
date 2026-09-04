// Scope theo vai tro "View" (la_view) - CHI gioi han pham vi xem, dung mau khuVucViewEmailInSql()
// cua linh-kien-app: tap email KTV co khu_vuc_ma nam trong danh sach Khu vuc da gan cho tai khoan
// View do qua user_khu_vuc_bh. Chua gan khu vuc nao -> subquery rong -> khong thay don nao (an toan
// mac dinh, KHONG phai mac dinh thay het).
export function viewKhuVucEmailInSql(): string {
  return "(SELECT email_dang_nhap FROM ktv_lien_he_bh WHERE email_dang_nhap IS NOT NULL AND khu_vuc_ma IN (SELECT khu_vuc_ma FROM user_khu_vuc_bh WHERE user_email = ?))";
}
