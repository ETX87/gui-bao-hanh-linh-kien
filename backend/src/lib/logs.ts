import { nowVN } from "./vnTime";
import { ghiNhanThieuHangTuLog } from "./thieuHang";
import { ghiGiaiTrinhTuLog } from "./giaiTrinh";

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
  // 04/11/2026: ly do cham "Khong co linh kien" / "Het hang ton kho" -> tu tao yeu cau thieu hang gui sang linh-kien-app (lib/thieuHang.ts).
  // Loi o buoc nay khong duoc lam hong thao tac nghiep vu goc.
  if (ghiChu) await ghiNhanThieuHangTuLog(db, entityType, entityId, nguoiThucHien, ghiChu).catch((e) => console.error("[thieuHang]", e instanceof Error ? e.message : e));
  // 15/11/2026: ly do cham chon o cong SLA = 1 lan giai trinh cua BO cho buoc dang dung (lib/giaiTrinh.ts).
  if (ghiChu) await ghiGiaiTrinhTuLog(db, entityType, entityId, tuTrangThai, nguoiThucHien, ghiChu).catch((e) => console.error("[giaiTrinh]", e instanceof Error ? e.message : e));
}
