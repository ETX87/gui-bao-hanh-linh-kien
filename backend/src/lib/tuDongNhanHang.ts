import type { Env } from "../types";
import { nowVN } from "./vnTime";

// 16/11/2026 ("OK đồng ý tự đóng sau 14 ngày"): phieu tra da gui KTV ("Đang gửi KTV", buoc 11) ma KTV khong bam
// "Đã nhận" cung khong bao thieu sau 14 ngay -> he thong tu xac nhan da nhan (ktv_da_nhan). Phieu nhap tu AppSheet (hang
// da giao tu lau) dong ngay khong cho 14 ngay. Truoc day ~91% so "Bước đang dừng" la cac phieu nay (KTV gan nhu khong bam
// xac nhan) -> lam nhieu so lieu + cac bo dem phinh dan theo thoi gian. KTV bao thieu (khieu_nai_van_chuyen) khong bi dong.
export const TU_DONG_NHAN_NGAY = 14;
const MOI_LAN = 200;

export async function tuDongXacNhanNhanHang(env: Env): Promise<{ dong: number }> {
  const db = env.DB;
  const cutoff = new Date(Date.now() + 7 * 3600_000 - TU_DONG_NHAN_NGAY * 86400_000).toISOString().slice(0, 19).replace("T", " ");
  const { results } = await db
    .prepare(
      `SELECT id, appsheet FROM (SELECT t.id, t.updated_at,
         EXISTS (SELECT 1 FROM logs_bh l WHERE l.entity_type = 'phieu_tra' AND l.entity_id = t.id AND l.ghi_chu LIKE '%AppSheet%') AS appsheet
       FROM phieu_tra_bh t WHERE t.trang_thai = 'da_gui') WHERE appsheet = 1 OR updated_at < ?
       ORDER BY updated_at LIMIT ${MOI_LAN}`,
    )
    .bind(cutoff)
    .all<{ id: string; appsheet: number }>();
  if (!results.length) return { dong: 0 };
  const now = nowVN();
  const stmts: D1PreparedStatement[] = [];
  for (const r of results) {
    const ghiChu = r.appsheet
      ? "Hệ thống tự xác nhận đã nhận — phiếu nhập từ AppSheet, hàng đã giao trước khi chuyển hệ thống"
      : `Hệ thống tự xác nhận đã nhận — KTV không xác nhận / không báo thiếu sau ${TU_DONG_NHAN_NGAY} ngày`;
    // CAS theo trang thai: KTV vua bam / bao thieu trong luc cron chay thi khong ghi de.
    stmts.push(
      db.prepare("UPDATE phieu_tra_bh SET trang_thai = 'ktv_da_nhan', danh_gia_ktv = COALESCE(NULLIF(danh_gia_ktv, ''), ?), updated_at = ? WHERE id = ? AND trang_thai = 'da_gui'").bind(ghiChu, now, r.id),
      db
        .prepare("INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, ghi_chu, thoi_gian) SELECT 'phieu_tra', ?, 'da_gui', 'ktv_da_nhan', 'Hệ thống', ?, ? WHERE changes() > 0")
        .bind(r.id, ghiChu, now),
    );
  }
  await db.batch(stmts);
  return { dong: results.length };
}
