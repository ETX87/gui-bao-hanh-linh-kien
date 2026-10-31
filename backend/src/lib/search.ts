import { normVi } from "./timKiem";
// Tim kiem tu khoa dung chung cho cac danh sach (20/10/2026, "bo sung tim kiem o cac danh sach table").
// Tach tu khoa theo khoang trang: MOI tu phai khop it nhat 1 cot (khong can dung thu tu). Tra ve doan
// " AND (...)" + binds de noi vao cuoi WHERE (binds dat SAU cac binds khac cua WHERE).
// normCols (31/10/2026): cac cot da luu san dang KHONG DAU (vd phieu_sua_chua_bh.tim_kiem) - so voi tu khoa
// da bo dau, nen go "tran thi mai" / "bom tang ap" van ra "Trần Thị Mai" / "Bơm tăng áp".
export function kwClause(q: string | undefined | null, cols: string[], normCols: string[] = []): { sql: string; binds: string[] } {
  const words = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (!words.length || (!cols.length && !normCols.length)) return { sql: "", binds: [] };
  const one = "(" + [...cols.map((c) => `LOWER(COALESCE(${c},'')) LIKE ?`), ...normCols.map((c) => `COALESCE(${c},'') LIKE ?`)].join(" OR ") + ")";
  return {
    sql: " AND " + words.map(() => one).join(" AND "),
    binds: words.flatMap((w) => [...cols.map(() => `%${w}%`), ...normCols.map(() => `%${normVi(w)}%`)]),
  };
}

// Chuoi tim kiem khong dau cua cac don cha trong 1 thung / 1 phieu tra (dung lam normCols).
export const tkThungOf = (guiIdExpr: string) => `(SELECT group_concat(pt.tim_kiem, ' ') FROM phieu_sua_chua_bh pt WHERE pt.phieu_gui_id = ${guiIdExpr})`;
export const tkPhieuTraOf = (traIdExpr: string) =>
  `(SELECT group_concat(pt.tim_kiem, ' ') FROM phieu_sua_chua_bh pt WHERE pt.id IN (SELECT ut.parent_id FROM phieu_sua_chua_bh_ct ut WHERE ut.phieu_tra_id = ${traIdExpr}))`;

// Bieu thuc ten nguoi dung / KTV theo email (users.ten hoac ten trong danh ba KTV) - dung lam 1 "cot".
export const tenOf = (emailExpr: string) =>
  `(SELECT COALESCE(us.ten,'') || ' ' || COALESCE((SELECT k.ten_hien_thi || ' ' || k.ma_ktv FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = ${emailExpr} LIMIT 1),'') FROM (SELECT 1) LEFT JOIN users us ON us.email = ${emailExpr})`;

// Ten linh kien theo ma.
export const tenLkOf = (maExpr: string) => `(SELECT ten_lk FROM linh_kien_bh WHERE ma_lk = ${maExpr})`;
