import { nowVN } from "./vnTime";

// Nhat ky insert-only dung chung 4 entity_type - port dung addLog() trong prototype-html/index.html.
export type LogEntityType = "phieu_gui" | "phieu_sc" | "phieu_sc_ct" | "phieu_tra";

export async function addLog(
  db: D1Database,
  entityType: LogEntityType,
  entityId: string,
  tuTrangThai: string | null,
  denTrangThai: string | null,
  nguoiThucHien: string,
  ghiChu?: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(entityType, entityId, tuTrangThai, denTrangThai, nguoiThucHien, nowVN(), ghiChu ?? "")
    .run();
}
