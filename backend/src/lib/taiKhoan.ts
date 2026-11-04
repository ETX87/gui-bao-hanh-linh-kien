import { nowVN } from "./vnTime";
import { tuDuyetTaiKhoanCho } from "./etxSync";

// 04/11/2026 - nguyen van: "2. Tài khoản trùng với tài khoản hệ thống có sẵn tự động đồng bộ vào nhau. 3. Tài khoản chưa có
// trên hệ thống thì mới để tên gốc, còn lại phải chuyển hết thành tài khoản công ty". "He thong co san" = danh ba KTV
// (ktv_lien_he_bh, dong bo tu linh-kien-app) + ETX nhan su (etx_nhan_su_bh). So khop Gmail khong phan biet hoa / thuong.

// "(thanhlv2.dvkh) KTV Bình Dương - Lò Văn Thanh" -> "Lò Văn Thanh".
export function tenGonKtv(t: string): string {
  const x = t.trim();
  if (!x.startsWith("(")) return x;
  const i = x.lastIndexOf(" - ");
  return i > 0 ? x.slice(i + 3).trim() || x : x;
}

// Ten cong ty theo Gmail: ho ten ETX (ban dang lam truoc) > ten danh ba KTV. Khong co -> khong co trong map (giu ten Google).
export async function tenCongTyMap(db: D1Database, email?: string): Promise<Map<string, string>> {
  const em = email?.trim().toLowerCase();
  const [ktv, etx] = await Promise.all([
    db
      .prepare(`SELECT LOWER(TRIM(email_dang_nhap)) AS email, ten_hien_thi AS ten FROM ktv_lien_he_bh WHERE email_dang_nhap IS NOT NULL AND TRIM(COALESCE(ten_hien_thi,'')) <> ''${em ? " AND LOWER(TRIM(email_dang_nhap)) = ?" : ""} ORDER BY CASE nguon_du_lieu WHEN 'dong_bo' THEN 1 ELSE 0 END`)
      .bind(...(em ? [em] : []))
      .all<{ email: string; ten: string }>(),
    db
      .prepare(`SELECT LOWER(TRIM(gmail)) AS email, ho_ten AS ten FROM etx_nhan_su_bh WHERE gmail IS NOT NULL AND TRIM(COALESCE(ho_ten,'')) <> ''${em ? " AND LOWER(TRIM(gmail)) = ?" : ""} ORDER BY CASE trang_thai_lam_viec WHEN 'on' THEN 1 ELSE 0 END`)
      .bind(...(em ? [em] : []))
      .all<{ email: string; ten: string }>(),
  ]);
  const m = new Map<string, string>();
  for (const r of ktv.results) m.set(r.email, tenGonKtv(r.ten));
  for (const r of etx.results) m.set(r.email, r.ten.trim()); // ETX ghi sau -> uu tien
  return m;
}

export interface DongBoTaiKhoanKq {
  tu_duyet: number;
  gan_ktv: number;
  doi_ten: number;
}

// Dong bo tai khoan voi danh ba KTV + ETX (1 email hoac tat ca):
//  - "Cho duyet" trung danh ba KTV / ETX dang lam -> "Da duyet" (+ co KTV / Ve tinh) - tuDuyetTaiKhoanCho;
//  - tai khoan da duyet nhung CHUA co vai tro nao ma co trong danh ba KTV -> gan co KTV / Ve tinh (khong dong vao tai khoan da co vai tro);
//  - users.ten = ten cong ty (ETX > danh ba KTV); khong co tren he thong thi giu ten Google.
export async function dongBoTaiKhoan(db: D1Database, email?: string): Promise<DongBoTaiKhoanKq> {
  const now = nowVN();
  const em = email?.trim().toLowerCase();
  const tuDuyet = await tuDuyetTaiKhoanCho(db);
  const gan = await db
    .prepare(
      `UPDATE users SET
         la_ktv_dvbh = CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 0 ELSE 1 END,
         la_ve_tinh = CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 1 ELSE 0 END,
         updated_at = ?
       FROM (SELECT LOWER(TRIM(email_dang_nhap)) AS em, MAX(vai_tro_ktv) AS vai_tro_ktv FROM ktv_lien_he_bh
             WHERE email_dang_nhap IS NOT NULL GROUP BY LOWER(TRIM(email_dang_nhap))) k
       WHERE users.trang_thai_duyet = 'Da duyet' AND LOWER(users.email) = k.em${em ? " AND LOWER(users.email) = ?" : ""}
         AND users.la_ktv_dvbh + users.la_ve_tinh + users.la_kho + users.la_admin_bh + users.la_nv_sua_chua + users.la_ke_toan
             + users.la_giam_sat + users.la_view + users.la_qtri = 0`,
    )
    .bind(now, ...(em ? [em] : []))
    .run();
  const ten = await tenCongTyMap(db, em);
  const { results: us } = await db
    .prepare(`SELECT email, ten FROM users${em ? " WHERE LOWER(email) = ?" : ""}`)
    .bind(...(em ? [em] : []))
    .all<{ email: string; ten: string | null }>();
  const doi = us.filter((u) => {
    const t = ten.get(u.email.toLowerCase());
    return t && t !== (u.ten ?? "").trim();
  });
  for (let i = 0; i < doi.length; i += 50) {
    await db.batch(doi.slice(i, i + 50).map((u) => db.prepare("UPDATE users SET ten = ?, updated_at = ? WHERE email = ?").bind(ten.get(u.email.toLowerCase())!, now, u.email)));
  }
  return { tu_duyet: tuDuyet, gan_ktv: gan.meta?.changes ?? 0, doi_ten: doi.length };
}
