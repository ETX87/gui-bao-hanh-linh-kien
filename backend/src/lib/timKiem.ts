import { nowVN } from "./vnTime";

// 31/10/2026: tim kiem khong dau (xem migrations/0020_tim_kiem.sql). Nguoi dung thuong chi biet ID case
// CRM, ten linh kien da gui hoac ten khach hang - va hay go khong dau tren dien thoai.

const COMBINING = new RegExp("[" + String.fromCharCode(0x300) + "-" + String.fromCharCode(0x36f) + "]", "g");

// Bo dau tieng Viet + chu thuong + gom khoang trang.
export function normVi(s: string | null | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(COMBINING, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Cac truong trong bang chung case dua vao chuoi tim kiem.
const SNAP_KEYS = ["khach_hang", "seri_san_pham", "san_pham_bao_hanh", "nhom_san_pham", "hang_san_xuat", "dia_chi", "ky_thuat_vien"];

interface Row {
  id: string;
  case_id: string | null;
  ten_khach_hang: string | null;
  sdt_khach_hang: string | null;
  san_pham_bh: string | null;
  mo_ta_loi: string | null;
  ma_lk: string | null;
  phieu_gui_id: string | null;
  ten_lk: string | null;
  lk_dv: string | null;
  snap: string | null;
  ktv: string | null;
  ten_ktv: string | null;
  ma_don_odoo: string | null;
}

// Tinh lai chuoi tim kiem. ids = null -> cac don "cu" (chua co / co thay doi sau lan tinh truoc: don vi
// con cap nhat, bang chung case dong bo lai), toi da `max` don / lan.
export async function capNhatTimKiem(db: D1Database, ids: string[] | null = null, max = 400): Promise<number> {
  const where = ids
    ? `p.id IN (${ids.map(() => "?").join(",")})`
    : `(p.tim_kiem_luc IS NULL
        OR EXISTS (SELECT 1 FROM phieu_sua_chua_bh_ct u0 WHERE u0.parent_id = p.id AND u0.updated_at > p.tim_kiem_luc)
        OR EXISTS (SELECT 1 FROM case_lookup_snapshot s0 WHERE s0.case_id = p.case_id AND s0.synced_at > p.tim_kiem_luc))`;
  const { results } = await db
    .prepare(
      `SELECT p.id, p.case_id, p.ten_khach_hang, p.sdt_khach_hang, p.san_pham_bh, p.mo_ta_loi, p.ma_lk, p.phieu_gui_id,
         (SELECT l.ten_lk FROM linh_kien_bh l WHERE l.ma_lk = p.ma_lk) AS ten_lk,
         (SELECT group_concat(COALESCE(u.ma_lk_nhan,'') || ' ' || COALESCE(ln.ten_lk,'') || ' ' || COALESCE(u.ma_lk_thuc_te,'') || ' ' || COALESCE(lt.ten_lk,'') || ' ' || u.id, ' ')
            FROM phieu_sua_chua_bh_ct u LEFT JOIN linh_kien_bh ln ON ln.ma_lk = u.ma_lk_nhan LEFT JOIN linh_kien_bh lt ON lt.ma_lk = u.ma_lk_thuc_te
            WHERE u.parent_id = p.id) AS lk_dv,
         (SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id) AS snap,
         g.nguoi_tao AS ktv,
         (SELECT COALESCE(k.ten_hien_thi,'') || ' ' || COALESCE(k.ma_ktv,'') FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = g.nguoi_tao LIMIT 1) AS ten_ktv,
         (SELECT o.ma_don FROM don_bh_odoo o WHERE o.odoo_id = p.odoo_id) AS ma_don_odoo
       FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE ${where} LIMIT ?`,
    )
    .bind(...(ids ?? []), ids ? ids.length : max)
    .all<Row>();
  if (!results.length) return 0;
  const now = nowVN();
  const stmts = results.map((r) => {
    let snapTxt = "";
    if (r.snap) {
      try {
        const d = JSON.parse(r.snap) as Record<string, unknown>;
        snapTxt = SNAP_KEYS.map((k) => (d[k] == null ? "" : String(d[k]))).join(" ");
      } catch {
        /* bo qua */
      }
    }
    const txt = normVi(
      [r.id, r.case_id, r.ten_khach_hang, r.sdt_khach_hang, r.san_pham_bh, r.mo_ta_loi, r.ma_lk, r.ten_lk, r.lk_dv, r.phieu_gui_id, snapTxt, r.ktv, r.ten_ktv, r.ma_don_odoo]
        .filter(Boolean)
        .join(" "),
    );
    return db.prepare("UPDATE phieu_sua_chua_bh SET tim_kiem = ?, tim_kiem_luc = ? WHERE id = ?").bind(txt, now, r.id);
  });
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  return results.length;
}
