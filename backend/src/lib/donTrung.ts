// 16/11/2026 - "Chặn KTV/GS tạo 2 lần cùng 1 mã linh kiện trên cùng 1 mã yêu cầu (ngoại trừ trường hợp mã lk
// của mã yc đó bị từ chối hoặc bị hủy)". Don cu cung case_id + cung linh kien KTV chon (A) van "con hieu luc" ->
// khong cho tao don moi. Don KHONG con hieu luc (duoc tao lai):
//  - don cha huy theo thung (trang_thai_cha = 'huy_thung');
//  - don cha da tach va MOI don vi deu bi Admin BH tu choi / huy bao hanh (ket_thuc_tu_choi).

export interface DonTrung {
  id: string;
  phieu_gui_id: string | null;
  trang_thai_cha: string;
  created_at: string;
}

const CON_HIEU_LUC = `p.trang_thai_cha <> 'huy_thung'
  AND NOT (p.trang_thai_cha = 'da_tach' AND NOT EXISTS (
    SELECT 1 FROM phieu_sua_chua_bh_ct u WHERE u.parent_id = p.id AND u.trang_thai <> 'ket_thuc_tu_choi'))`;

export async function timDonTrung(db: D1Database, caseId: string | null | undefined, maLk: string | null | undefined, boQuaId?: string | null): Promise<DonTrung | null> {
  if (!caseId || !maLk) return null;
  return db
    .prepare(
      `SELECT p.id, p.phieu_gui_id, p.trang_thai_cha, p.created_at FROM phieu_sua_chua_bh p
       WHERE p.case_id = ? AND p.ma_lk = ? AND p.id <> ? AND ${CON_HIEU_LUC}
       ORDER BY p.created_at DESC LIMIT 1`,
    )
    .bind(caseId, maLk, boQuaId || "")
    .first<DonTrung>();
}

export function msgTrung(t: DonTrung): string {
  return `Mã case này đã có đơn ${t.id}${t.phieu_gui_id ? ` (thùng ${t.phieu_gui_id})` : ""} cùng linh kiện — không thể tạo trùng. Chỉ tạo lại được khi đơn cũ bị từ chối / huỷ.`;
}
