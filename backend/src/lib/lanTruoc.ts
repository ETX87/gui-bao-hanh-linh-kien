// 30/10/2026 (de xuat #7 "phat hien sua lai lan 2"): so lan san pham nay DA duoc bao hanh xong truoc do -
// cung case_id + cung linh kien thuc te gui ve (B, mac dinh A), don cha khac tao truoc trong 90 ngay, don
// vi da qua buoc tra hang (hoan tat / co phieu tra / san sang gom), tru huy / chuyen kho.
// pAlias = alias bang phieu_sua_chua_bh cua dong dang xet; lkExpr = bieu thuc linh kien cua dong do.
export function lanTruocSql(pAlias: string, lkExpr: string): string {
  return `(SELECT COUNT(DISTINCT p2.id) FROM phieu_sua_chua_bh p2 JOIN phieu_sua_chua_bh_ct u2 ON u2.parent_id = p2.id
    WHERE ${pAlias}.case_id IS NOT NULL AND ${pAlias}.case_id <> '' AND p2.case_id = ${pAlias}.case_id AND p2.id <> ${pAlias}.id
      AND (p2.created_at < ${pAlias}.created_at OR (p2.created_at = ${pAlias}.created_at AND p2.id < ${pAlias}.id)) AND p2.created_at >= datetime(${pAlias}.created_at, '-90 days')
      AND COALESCE(u2.ma_lk_nhan, p2.ma_lk) IS ${lkExpr}
      AND (u2.admin_xac_nhan_hoan_tat = 1 OR u2.phieu_tra_id IS NOT NULL OR u2.trang_thai = 'san_sang_gom_phieu_tra')
      AND COALESCE(u2.huong_xu_ly, '') NOT IN ('tu_choi', 'chuyen_kho'))`;
}
