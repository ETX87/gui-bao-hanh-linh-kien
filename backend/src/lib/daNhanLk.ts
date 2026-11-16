// 16/11/2026 (v1.140) - nguyen van: "Bước NV xác nhận. YC phải xác nhận đã nhận mới cho đóng đơn sửa chữa (nếu chưa xác nhận mà đóng đơn
// sẽ hiện cảnh báo tự động xác nhận tất cả các linh kiện đều chuyển sang trạng thái đã nhận đủ)".
// Lan cap qua app Dat linh kien (trang_thai 'lien_ket') ma NV chua xac nhan da nhan (lk_buoc khac 'xong' / 'dong'). NV bam "Đã nhận" (hoac he
// thong tu xac nhan khi dong don) -> goi linh-kien-app POST /suachua-partner/don-sc/:ddh/da-nhan: phieu xuat "Dang gui KTV" -> "KTV da nhan".
// Lan cap chua duoc Kho gui (Ke toan / Kho dang xu ly) -> khong xac nhan duoc (CHUA_GUI_HANG).
import type { Env } from "../types";
import { addLog } from "./logs";
import { ghiMotDon, goiLinhKien, moTaLoi, type DonSc } from "./donScLinhKien";

export const DX_CHUA_NHAN_SQL = "d.trang_thai = 'lien_ket' AND d.lk_ddh_id IS NOT NULL AND COALESCE(d.lk_buoc, '') NOT IN ('xong', 'dong')";

export interface DxChuaNhan { id: string; ma_lk: string; so_luong: number; lk_ddh_id: string; lk_nhan: string | null; lk_buoc: string | null }

export async function dxChuaNhan(db: D1Database, unitId: string): Promise<DxChuaNhan[]> {
  const { results } = await db.prepare(
    `SELECT d.id, d.ma_lk, d.so_luong, d.lk_ddh_id, d.lk_nhan, d.lk_buoc FROM de_xuat_linh_kien_bh d WHERE d.unit_id = ? AND ${DX_CHUA_NHAN_SQL} ORDER BY d.id`,
  ).bind(unitId).all<DxChuaNhan>();
  return results;
}

export interface KqDaNhan { ok: string[]; loi: { id: string; error: string; message: string; nhan?: string | null }[] }

// Xac nhan da nhan cho danh sach de xuat (cung 1 phieu xuat thi lan goi sau tra "da_nhan_truoc").
export async function xacNhanDaNhan(env: Env, dx: DxChuaNhan[], unitId: string, unitTt: string | null, nguoi: string, tuDong: boolean): Promise<KqDaNhan> {
  const out: KqDaNhan = { ok: [], loi: [] };
  for (const d of dx) {
    const kq = await goiLinhKien<{ don?: DonSc; pxk_id?: string; da_nhan_truoc?: boolean }>(env, `/don-sc/${encodeURIComponent(d.lk_ddh_id)}/da-nhan`, {
      method: "POST",
      body: { nguoi_thao_tac: nguoi, tu_dong: tuDong },
    });
    if (!kq.ok) {
      out.loi.push({ id: d.id, error: kq.error, message: moTaLoi(kq), nhan: (kq.body?.nhan as string | null | undefined) ?? d.lk_nhan });
      continue;
    }
    await ghiMotDon(env, kq.data.don);
    out.ok.push(d.id);
    await addLog(env.DB, "phieu_sc_ct", unitId, unitTt, unitTt, nguoi,
      `${tuDong ? "Tự động xác nhận đã nhận đủ (đóng đơn sửa chữa)" : "NV xác nhận đã nhận"} linh kiện ${d.id} (${d.ma_lk} ×${d.so_luong}, đơn ${d.lk_ddh_id}${kq.data.pxk_id ? ` · phiếu ${kq.data.pxk_id}` : ""})`);
  }
  return out;
}
