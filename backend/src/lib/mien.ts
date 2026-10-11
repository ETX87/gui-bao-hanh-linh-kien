import type { AppUser } from "../types";

// Mien (11/10/2026): MB / MN / NULL = "Khu vuc chua khai bao". Xem migrations/0010_mien.sql.
// - Don (phieu gui / don cha / phieu tra) mang 1 mien, tu xac dinh luc tao theo khu vuc KTV nguoi tao
//   (ma khu vuc chua tu khoa cua dung 1 mien), khong xac dinh duoc -> NULL.
// - Nguoi xu ly (Kho / Admin BH / NV / Ke toan) co users.mien: MB/MN -> chi thay don mien minh + don chua
//   khai bao; ALL hoac NULL (chua gan) -> thay tat ca. Admin he thong luon thay tat ca.

export type Mien = "MB" | "MN";
export const MIEN_VALUES: Mien[] = ["MB", "MN"];

export async function loadTuKhoa(db: D1Database): Promise<Record<Mien, string[]>> {
  const { results } = await db.prepare("SELECT mien, tu_khoa FROM mien_tu_khoa_bh").all<{ mien: Mien; tu_khoa: string }>();
  const out: Record<Mien, string[]> = { MB: [], MN: [] };
  for (const r of results) if (r.tu_khoa.trim()) out[r.mien].push(r.tu_khoa.trim().toUpperCase());
  return out;
}

export function detectMien(khuVucMa: string | null | undefined, tk: Record<Mien, string[]>): Mien | null {
  const ma = (khuVucMa || "").toUpperCase().trim();
  if (!ma) return null;
  const hits = MIEN_VALUES.filter((m) => tk[m].some((k) => ma.includes(k)));
  return hits.length === 1 ? hits[0] : null;
}

// Mien theo KTV (email dang nhap) - qua khu vuc trong danh ba.
export async function mienOfKtv(db: D1Database, email: string | null | undefined, tk?: Record<Mien, string[]>): Promise<Mien | null> {
  if (!email) return null;
  const k = await db
    .prepare("SELECT khu_vuc_ma, mien_gan FROM ktv_lien_he_bh WHERE email_dang_nhap = ? ORDER BY (mien_gan IS NULL), (khu_vuc_ma IS NULL) LIMIT 1")
    .bind(email)
    .first<{ khu_vuc_ma: string | null; mien_gan: Mien | null }>();
  if (!k) return null;
  if (k.mien_gan) return k.mien_gan; // mien gan tam uu tien
  return detectMien(k.khu_vuc_ma, tk ?? (await loadTuKhoa(db)));
}

// Mien cua 1 nhan vien (don khach le do Admin tao): chi khi nguoi do thuoc DUNG 1 mien.
export function mienOfStaff(user: AppUser): Mien | null {
  return user.mien === "MB" || user.mien === "MN" ? user.mien : null;
}

// Dieu kien loc theo mien cho hang doi cua nguoi xu ly. alias = bang mang cot mien.
export function mienScope(user: AppUser, alias: string): { sql: string; binds: string[] } {
  if (user.la_qtri || !user.mien || user.mien === "ALL") return { sql: "", binds: [] };
  return { sql: ` AND (${alias}.mien = ? OR ${alias}.mien IS NULL)`, binds: [user.mien] };
}

// Nguoi duoc phep xem 1 don theo mien (dung cho route chi tiet / thao tac don le).
export function mienAllowed(user: AppUser, mien: string | null | undefined): boolean {
  if (user.la_qtri || !user.mien || user.mien === "ALL" || !mien) return true;
  return user.mien === mien;
}

// Mien cua phieu tra = mien cua cac don vi ben trong (lay mien dau tien khac NULL). Goi sau moi lan
// tao / gop don vi vao phieu tra.
export async function syncPhieuTraMien(db: D1Database, phieuTraId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE phieu_tra_bh SET mien = (
         SELECT p.mien FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         WHERE u.phieu_tra_id = phieu_tra_bh.id AND p.mien IS NOT NULL LIMIT 1)
       WHERE id = ?`,
    )
    .bind(phieuTraId)
    .run();
}
