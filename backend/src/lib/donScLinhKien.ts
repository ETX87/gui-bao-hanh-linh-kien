import type { Env } from "../types";
import { nowVN } from "./vnTime";
import { nextSequentialId } from "./idCounter";

// 16/11/2026 (v1.133) - cap linh kien sua chua chuyen han sang linh-kien-app (xem migrations/0038_de_xuat_qua_linh_kien.sql). Nguyen van:
// "Cấp lk tạo được từ cả 2 bên: thông tin thống nhất đẩy hết về app linh kiện, kế toán duyệt trên app lk. app đổi trả chỉ còn bước tạo cấp lk
// (sửa lk, số lượng nếu cần trước khi kế toán duyệt xuất kho)".
// Goi linh-kien-app qua Service Binding LINHKIEN_SERVICE + X-Sync-Key (cung khoa voi capLkPush.ts):
//  - POST /api/suachua-partner/don-sc            tao don CÔNG NỢ SỬA CHỮA tu 1 de xuat (chay bang tai khoan NV sua chua ben do)
//  - POST /api/suachua-partner/don-sc/:id/sua    sua ma LK / SL / ghi chu (chi khi Ke toan chua xu ly)
//  - POST /api/suachua-partner/don-sc/:id/huy    huy (chua xu ly -> huy ngay; dang xu ly -> cho bo phan dong y ben do)
//  - GET  /api/suachua-partner/don-sc?bh=|?ids=  trang thai hien tai -> dongBoDonSc() ghi vao de_xuat_linh_kien_bh.

const GIOI_HAN_MS = 20_000;
function coHan<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms))]);
}

export interface DonSc {
  id: string;
  nguon_tao: string | null;
  nguon_tao_id: string | null;
  bh_don_vi_id: string | null;
  ma_lk: string;
  ten_lk: string | null;
  so_luong: number;
  ghi_chu: string | null;
  nguoi_tao: string;
  nguoi_nhan_hang: string | null;
  ngay_tao: string;
  tt: string;
  pxk_id: string | null;
  nhan: string;
  buoc: string;
  sua_duoc: boolean;
  giai_doan: string | null;
  yeu_cau_huy_bo_phan: string | null;
}

export type KqGoi<T> = { ok: true; data: T } | { ok: false; status: number; error: string; body?: Record<string, unknown> };

export async function goiLinhKien<T>(env: Env, path: string, init?: { method?: string; body?: unknown }): Promise<KqGoi<T>> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { ok: false, status: 503, error: "CHUA_CAU_HINH_LINH_KIEN" };
  try {
    const res = await coHan(
      env.LINHKIEN_SERVICE.fetch(`https://linhkien/api/suachua-partner${path}`, {
        method: init?.method ?? "GET",
        headers: { "Content-Type": "application/json", "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      }),
      GIOI_HAN_MS,
    );
    const body = (await coHan(res.json(), GIOI_HAN_MS).catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, status: res.status, error: String(body.error ?? `HTTP_${res.status}`), body };
    return { ok: true, data: body as T };
  } catch (e) {
    return { ok: false, status: 502, error: e instanceof Error && e.message === "TIMEOUT" ? "LINH_KIEN_KHONG_TRA_LOI" : "KHONG_KET_NOI_LINH_KIEN" };
  }
}

// Nhan tieng Viet cho loi tra ve tu linh-kien-app (FE hien nguyen cau).
const LOI: Record<string, string> = {
  CHUA_CAU_HINH_LINH_KIEN: "Chưa cấu hình kết nối app Đặt linh kiện",
  CHUA_GUI_HANG: "Kho chưa gửi linh kiện này (Kế toán / Kho đang xử lý) — chưa xác nhận đã nhận được",
  DANG_BAO_NHAN_THIEU: "Phiếu xuất đang có báo nhận thiếu chờ Kho kiểm tra",
  DON_DA_DONG: "Đơn cấp linh kiện đã huỷ / bị từ chối",
  KHONG_KET_NOI_LINH_KIEN: "Không kết nối được app Đặt linh kiện — thử lại sau",
  LINH_KIEN_KHONG_TRA_LOI: "App Đặt linh kiện không phản hồi — thử lại sau (kiểm tra danh sách trước khi gửi lại)",
  MA_LK_NOT_FOUND: "Mã linh kiện không có trong danh mục app Đặt linh kiện",
  NGUOI_NHAN_KHONG_PHAI_NV_SUA_CHUA: "Tài khoản NV sửa chữa chưa được bật cờ \"NV sửa chữa\" trên app Đặt linh kiện",
  TAI_KHOAN_DAT_HANG_KHONG_TON_TAI: "NV sửa chữa chưa có tài khoản trên app Đặt linh kiện",
  TAI_KHOAN_DAT_HANG_BI_KHOA: "Tài khoản NV sửa chữa trên app Đặt linh kiện đang bị khoá",
  TAI_KHOAN_DAT_HANG_CHUA_DUYET: "Tài khoản NV sửa chữa trên app Đặt linh kiện chưa được duyệt",
  KTV_CHUA_CO_MA_MISA: "NV sửa chữa chưa có Mã MISA trên app Đặt linh kiện — không đặt hàng được",
  KE_TOAN_DA_XU_LY: "Kế toán / Kho đã xử lý đơn này — không sửa được nữa",
  KHONG_HUY_DUOC: "Đơn không hủy được nữa",
  DA_CO_YEU_CAU_HUY: "Đơn đang có yêu cầu hủy chờ bộ phận đồng ý",
  DON_TAO_TREN_APP_LINH_KIEN: "Đơn đặt trên app Đặt linh kiện — sửa trên app đó",
  FORBIDDEN_ROLE: "Tài khoản NV sửa chữa không có quyền đặt hàng trên app Đặt linh kiện",
};
export function moTaLoi(k: { error: string; body?: Record<string, unknown> }): string {
  const msg = k.body?.message ? String(k.body.message) : "";
  const gd = k.body?.giai_doan ? ` (${String(k.body.giai_doan)})` : "";
  return (LOI[k.error] ?? (msg || k.error)) + gd;
}

// Ghi ket qua 1 don ben linh-kien-app vao de_xuat_linh_kien_bh. Don tao tu app nay: khop theo de xuat (nguon_tao_id) - CHI don hien hanh
// (lk_ddh_id) cua de xuat moi ghi (don cu da thay bang don moi khi sua bi bo qua). Don tao ben linh-kien-app: khop theo lk_ddh_id, chua co ->
// tao dong de xuat moi (nguon 'linhkien') neu ma don bao hanh khop 1 don vi (ma don vi, hoac ma don cha -> don vi dau tien).
async function ghiDonSc(db: D1Database, r: DonSc, now: string): Promise<void> {
  const ttDx = r.buoc === "dong" ? "huy" : "lien_ket";
  const cot = [r.ma_lk, r.so_luong, r.tt, r.nhan, r.buoc, r.sua_duoc ? 1 : 0, r.giai_doan, r.pxk_id, r.yeu_cau_huy_bo_phan, ttDx];
  const set =
    "ma_lk = ?, so_luong = ?, lk_tt = ?, lk_nhan = ?, lk_buoc = ?, lk_sua_duoc = ?, lk_giai_doan = ?, lk_pxk = ?, lk_yeu_cau_huy = ?, trang_thai = ?";
  // Chi doi updated_at khi co gi thay doi that (tranh "moi cap nhat" gia).
  const khac = `(COALESCE(ma_lk,'') <> COALESCE(?,'') OR so_luong <> ? OR COALESCE(lk_tt,'') <> COALESCE(?,'') OR COALESCE(lk_nhan,'') <> COALESCE(?,'')
    OR COALESCE(lk_buoc,'') <> COALESCE(?,'') OR lk_sua_duoc <> ? OR COALESCE(lk_giai_doan,'') <> COALESCE(?,'') OR COALESCE(lk_pxk,'') <> COALESCE(?,'')
    OR COALESCE(lk_yeu_cau_huy,'') <> COALESCE(?,'') OR trang_thai <> ?)`;
  if (r.nguon_tao === "doitra" && r.nguon_tao_id) {
    await db.batch([
      db.prepare(`UPDATE de_xuat_linh_kien_bh SET ${set}, updated_at = ? WHERE id = ? AND lk_ddh_id = ? AND ${khac}`).bind(...cot, now, r.nguon_tao_id, r.id, ...cot),
      db.prepare("UPDATE de_xuat_linh_kien_bh SET lk_dong_bo_luc = ? WHERE id = ? AND lk_ddh_id = ?").bind(now, r.nguon_tao_id, r.id),
    ]);
    return;
  }
  const co = await db.prepare("SELECT id FROM de_xuat_linh_kien_bh WHERE lk_ddh_id = ? AND nguon = 'linhkien'").bind(r.id).first<{ id: string }>();
  if (co) {
    await db.batch([
      db.prepare(`UPDATE de_xuat_linh_kien_bh SET ${set}, updated_at = ? WHERE id = ? AND ${khac}`).bind(...cot, now, co.id, ...cot),
      db.prepare("UPDATE de_xuat_linh_kien_bh SET lk_dong_bo_luc = ? WHERE id = ?").bind(now, co.id),
    ]);
    return;
  }
  if (!r.bh_don_vi_id) return;
  const unit = await db
    .prepare("SELECT id FROM phieu_sua_chua_bh_ct WHERE id = ? UNION ALL SELECT id FROM (SELECT id FROM phieu_sua_chua_bh_ct WHERE parent_id = ? ORDER BY so_thu_tu LIMIT 1)")
    .bind(r.bh_don_vi_id, r.bh_don_vi_id)
    .first<{ id: string }>();
  if (!unit) return;
  const id = await nextSequentialId(db, "de_xuat_linh_kien_bh", "DX");
  await db
    .prepare(
      `INSERT INTO de_xuat_linh_kien_bh (id, unit_id, ma_lk, so_luong, ghi_chu, trang_thai, nguoi_de_xuat, created_at, updated_at, nguon, lk_ddh_id,
         lk_tt, lk_nhan, lk_buoc, lk_sua_duoc, lk_giai_doan, lk_pxk, lk_yeu_cau_huy, lk_dong_bo_luc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'linhkien', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, unit.id, r.ma_lk, r.so_luong, r.ghi_chu, ttDx, r.nguoi_tao, r.ngay_tao, now, r.id, r.tt, r.nhan, r.buoc, r.sua_duoc ? 1 : 0, r.giai_doan,
      r.pxk_id, r.yeu_cau_huy_bo_phan, now)
    .run();
}

// Keo trang thai ve: theo danh sach don vi (mo chi tiet don vi), danh sach don, hoac mac dinh (cron) = don 120 ngay gan nhat.
export async function dongBoDonSc(env: Env, loc: { bh?: string[]; ids?: string[] } = {}): Promise<{ so_don: number; loi?: string }> {
  const qs = loc.bh?.length ? `?bh=${encodeURIComponent(loc.bh.join(","))}` : loc.ids?.length ? `?ids=${encodeURIComponent(loc.ids.join(","))}` : "";
  const kq = await goiLinhKien<{ rows: DonSc[] }>(env, `/don-sc${qs}`);
  if (!kq.ok) return { so_don: 0, loi: kq.error };
  const now = nowVN();
  for (const r of kq.data.rows ?? []) await ghiDonSc(env.DB, r, now);
  return { so_don: kq.data.rows?.length ?? 0 };
}

export async function ghiMotDon(env: Env, r: DonSc | undefined): Promise<void> {
  if (r) await ghiDonSc(env.DB, r, nowVN());
}
