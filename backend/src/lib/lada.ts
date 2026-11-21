import type { Env } from "../types";
import { goiLinhKien } from "./donScLinhKien";

// 21/11/2026 - ma Lada (don Ecolada) dung chung o "Ma yeu cau" voi ma case DVBH. Nguyen van: "bổ sung thêm cột nhập mã lada
// và kéo API theo mã Lada về. nếu không tìm được báo không thấy và cảnh báo người dùng tự chịu trách nhiệm (mã lada sẽ không
// có ký tự SC ở đầu) - tốt nhất là gộp chung trong cùng 1 cột mã yc". Tra qua app Dat linh kien (GET /suachua-partner/lada,
// ben do giu token center.dichvu3t.com + cache 10 phut) - app nay KHONG giu token rieng.

export interface LadaPreview {
  khach_hang: string | null;
  ky_thuat_vien: string | null;
  trang_thai: string | null;
  model: string | null;
  hang: string | null;
  tinh: string | null;
  quan_huyen: string | null;
  ngay_khoi_tao: string | null;
  ngay_chot_don: string | null;
}

export type LadaKq = { status: "found"; preview: LadaPreview } | { status: "not_found" } | { status: "error"; loi: string };

/** Dinh dang ID Lada: 1 chu cai + >=5 so (D1154680) - ban sao isLikelyLadaId ben linh-kien-app + FE lib/lada.ts. */
export function laMaLada(id: string | null | undefined): boolean {
  return /^[A-Z]\d{5,}$/i.test((id || "").trim());
}

export async function traLada(env: Env, id: string): Promise<LadaKq> {
  const r = await goiLinhKien<{ found?: boolean; preview?: LadaPreview | null; warning?: string | null }>(env, `/lada?id=${encodeURIComponent(id.trim().toUpperCase())}`);
  if (!r.ok) return { status: "error", loi: r.error };
  if (r.data.found && r.data.preview) return { status: "found", preview: r.data.preview };
  if (r.data.warning) return { status: "error", loi: r.data.warning };
  return { status: "not_found" };
}

/** Bang chung luu vao case_lookup_snapshot (cung khung voi case DVBH de man chi tiet doc duoc). Co san khoa ngay_san_xuat
 * (null) de cron refreshSnapshotsThieuNsx khong hoi DVBH cho ma Lada. */
export function ladaSnapshot(id: string, p: LadaPreview): Record<string, unknown> {
  return {
    nguon: "lada",
    ma_lada: id.toUpperCase(),
    khach_hang: p.khach_hang,
    ky_thuat_vien: p.ky_thuat_vien,
    san_pham_bao_hanh: p.model,
    hang: p.hang,
    tinh: p.tinh,
    quan_huyen: p.quan_huyen,
    ngay_mua: p.ngay_chot_don,
    trang_thai_lada: p.trang_thai,
    ngay_khoi_tao: p.ngay_khoi_tao,
    ngay_chot_don: p.ngay_chot_don,
    seri_san_pham: null,
    link_crm: null,
    ngay_san_xuat: null,
  };
}
