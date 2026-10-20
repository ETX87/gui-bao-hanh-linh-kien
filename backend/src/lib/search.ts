// Tim kiem tu khoa dung chung cho cac danh sach (20/10/2026, "bo sung tim kiem o cac danh sach table").
// Tach tu khoa theo khoang trang: MOI tu phai khop it nhat 1 cot (khong can dung thu tu). Tra ve doan
// " AND (...)" + binds de noi vao cuoi WHERE (binds dat SAU cac binds khac cua WHERE).
export function kwClause(q: string | undefined | null, cols: string[]): { sql: string; binds: string[] } {
  const words = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length || !cols.length) return { sql: "", binds: [] };
  const one = "(" + cols.map((c) => `LOWER(COALESCE(${c},'')) LIKE ?`).join(" OR ") + ")";
  return {
    sql: " AND " + words.map(() => one).join(" AND "),
    binds: words.flatMap((w) => cols.map(() => `%${w}%`)),
  };
}

// Bieu thuc ten nguoi dung / KTV theo email (users.ten hoac ten trong danh ba KTV) - dung lam 1 "cot".
export const tenOf = (emailExpr: string) =>
  `(SELECT COALESCE(us.ten,'') || ' ' || COALESCE((SELECT k.ten_hien_thi || ' ' || k.ma_ktv FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = ${emailExpr} LIMIT 1),'') FROM (SELECT 1) LEFT JOIN users us ON us.email = ${emailExpr})`;

// Ten linh kien theo ma.
export const tenLkOf = (maExpr: string) => `(SELECT ten_lk FROM linh_kien_bh WHERE ma_lk = ${maExpr})`;
