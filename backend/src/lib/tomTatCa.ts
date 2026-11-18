// 18/11/2026: tóm tắt gửi bảo hành THEO CA cho dvbh ("Quản lý tồn" > Danh sách chi tiết: số LK thực tế đã gửi, trạng thái thấp nhất,
// diễn giải, tốc độ tồn đổi trả). Chủ hệ thống yêu cầu tận dụng API sẵn có, không thêm luồng kéo riêng cho từng báo cáo -> chạy chung
// cron 15 phút của lib/odooSync.ts và gửi kèm (field "ca") trong POST /api/partner/sync/sua-chua-trang-thai sẵn có.
// Chỉ gửi ca có thay đổi (so hash với ca_tom_tat_sync, migration 0043). Gửi số liệu THÔ (mã giai đoạn + số lượng), dvbh tự đổi nhãn
// trên máy người dùng.
//
// Quy tắc (chốt với chủ hệ thống 18/11/2026):
//   - Tính mọi đơn của ca TRỪ đơn bị huỷ / từ chối kết thúc (thung_da_huy, ket_thuc_tu_choi). Đơn chưa tách đơn vị tính so_luong_khai.
//   - Trạng thái = giai đoạn THẤP NHẤT theo THU_TU (vd 2 LK hoàn tất + 1 LK thùng nháp -> "thùng nháp").
//   - ngay_gui_cuoi = lần KTV bấm gửi xe (phieu_gui_bh.ngay_gui_xe) muộn nhất -> dvbh tính số ngày tồn = 0h hôm nay - mốc này.
//   - Mọi LK đã xong (DONE) -> xu_ly_max_ngay = thời gian xử lý lâu nhất (từ gửi xe tới lúc kết thúc) trong các đơn.
import type { Env } from "../types";
import { nowVN } from "./vnTime";

const THU_TU = [
  "thung_nhap",
  "thung_tu_choi",
  "thung_dang_gui",
  "thung_cho_admin_nhan",
  "cho_xac_nhan_so_luong",
  "cho_phan_loai",
  "admin_can_xem_lai",
  "cho_bo_sung_tt",
  "cho_chan_doan",
  "cho_admin_xac_nhan",
  "san_sang_gom_phieu_tra",
  "tra_nhap",
  "tra_cho_ke_toan_duyet",
  "tra_da_duyet_ke_toan",
  "tra_da_gui",
  "tra_khieu_nai_van_chuyen",
  "tra_gui_that_bai",
  "tra_ktv_da_nhan",
  "tra_ket_thuc_khong_gui",
  "ket_thuc_chuyen_kho",
];
const BO = new Set(["thung_da_huy", "ket_thuc_tu_choi"]);
const DONE = new Set(["tra_ktv_da_nhan", "tra_ket_thuc_khong_gui", "ket_thuc_chuyen_kho"]);
const thuTu = (gd: string) => {
  const i = THU_TU.indexOf(gd);
  return i < 0 ? -1 : i; // giai đoạn lạ -> coi là thấp nhất (đang chờ)
};
// Chỉ xét đơn tạo trong 120 ngày gần đây (ca cũ hơn đã đóng bên dvbh, không cần theo dõi) - giữ số dòng đọc mỗi 15 phút nhỏ.
const SO_NGAY_XET = 120;
const PUSH_BATCH = 200;

export interface TomTatCa {
  case_id: string;
  xoa?: boolean;
  so_lk?: number;
  gd?: Record<string, number>;
  gd_thap_nhat?: string;
  ngay_gui_cuoi?: string | null;
  hoan_tat?: 0 | 1;
  xu_ly_max_ngay?: number | null;
}

interface Dong {
  case_id: string;
  gd: string;
  sl: number;
  ngay_gui_xe: string | null;
  xong_luc: string | null;
}

const ngayGio = (s: string) => new Date(s.replace(" ", "T") + "Z").getTime();

export async function tinhTomTatCa(db: D1Database, ids: string[]): Promise<TomTatCa[]> {
  const dongs: Dong[] = [];
  // Lo 45: cau UNION ALL bind danh sach 2 lan (D1 toi da 100 tham so / cau - lo 90 da loi "too many SQL variables" 18/11/2026).
  for (let i = 0; i < ids.length; i += 45) {
    const chunk = ids.slice(i, i + 45);
    const ph = chunk.map(() => "?").join(",");
    // Đơn đã tách đơn vị: mỗi đơn vị = 1 LK; chưa tách: số lượng KTV khai (cùng cách tính giai đoạn với routes/traCuu.ts allRowsSql).
    const { results } = await db
      .prepare(
        `SELECT p.case_id, 1 AS sl, g.ngay_gui_xe,
                CASE WHEN u.phieu_tra_id IS NOT NULL AND t.trang_thai IS NOT NULL THEN 'tra_' || t.trang_thai ELSE u.trang_thai END AS gd,
                CASE WHEN u.phieu_tra_id IS NOT NULL AND t.trang_thai IS NOT NULL THEN t.updated_at ELSE u.updated_at END AS xong_luc
         FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id LEFT JOIN phieu_tra_bh t ON t.id = u.phieu_tra_id
         WHERE p.case_id IN (${ph})
         UNION ALL
         SELECT p.case_id, COALESCE(p.so_luong_khai, 1) AS sl, g.ngay_gui_xe,
                CASE WHEN g.trang_thai = 'nhap' THEN 'thung_nhap' WHEN g.trang_thai = 'da_gui' THEN 'thung_dang_gui'
                     WHEN p.trang_thai_cha = 'huy_thung' THEN 'thung_da_huy' WHEN g.tu_choi_tt IN ('cho_kho','cho_ktv') THEN 'thung_tu_choi'
                     WHEN g.trang_thai = 'da_tiep_nhan' AND g.admin_tiep_nhan = 0 THEN 'thung_cho_admin_nhan' ELSE 'cho_xac_nhan_so_luong' END AS gd,
                NULL AS xong_luc
         FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         WHERE p.trang_thai_cha IN ('cho_xac_nhan_so_luong','huy_thung') AND p.case_id IN (${ph})`,
      )
      .bind(...chunk, ...chunk)
      .all<Dong>();
    dongs.push(...results);
  }
  const theoCa = new Map<string, Dong[]>();
  for (const d of dongs) {
    if (BO.has(d.gd)) continue;
    const arr = theoCa.get(d.case_id) ?? [];
    arr.push(d);
    theoCa.set(d.case_id, arr);
  }
  return ids.map((id): TomTatCa => {
    const ds = theoCa.get(id);
    if (!ds || ds.length === 0) return { case_id: id, xoa: true };
    const gd: Record<string, number> = {};
    let soLk = 0;
    let thapNhat = ds[0].gd;
    let guiCuoi: string | null = null;
    for (const d of ds) {
      gd[d.gd] = (gd[d.gd] ?? 0) + Number(d.sl || 0);
      soLk += Number(d.sl || 0);
      if (thuTu(d.gd) < thuTu(thapNhat)) thapNhat = d.gd;
      if (d.ngay_gui_xe && (!guiCuoi || d.ngay_gui_xe > guiCuoi)) guiCuoi = d.ngay_gui_xe;
    }
    const hoanTat = ds.every((d) => DONE.has(d.gd));
    let xuLyMax: number | null = null;
    if (hoanTat) {
      for (const d of ds) {
        if (!d.ngay_gui_xe || !d.xong_luc) continue;
        const ngay = (ngayGio(d.xong_luc) - ngayGio(d.ngay_gui_xe)) / 86_400_000;
        if (Number.isFinite(ngay) && (xuLyMax === null || ngay > xuLyMax)) xuLyMax = ngay;
      }
      if (xuLyMax !== null) xuLyMax = Math.max(0, Math.round(xuLyMax * 10) / 10);
    }
    return { case_id: id, so_lk: soLk, gd, gd_thap_nhat: thapNhat, ngay_gui_cuoi: guiCuoi, hoan_tat: hoanTat ? 1 : 0, xu_ly_max_ngay: xuLyMax };
  });
}

const bam = (t: TomTatCa) => JSON.stringify([t.xoa ?? false, t.so_lk, t.gd, t.gd_thap_nhat, t.ngay_gui_cuoi, t.hoan_tat, t.xu_ly_max_ngay]);

/** Đẩy tóm tắt các ca có thay đổi. callDvbh truyền từ odooSync (dùng chung Service Binding + key). Trả số ca đã gửi. */
export async function dayTomTatCa(env: Env, callDvbh: (path: string, init: RequestInit) => Promise<unknown>): Promise<number> {
  // Ứng viên: ca có đơn trong 120 ngày mà chưa từng gửi / chưa xong / lần trước lỗi / có đơn tạo sau lần gửi trước.
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT p.case_id FROM phieu_sua_chua_bh p LEFT JOIN ca_tom_tat_sync s ON s.case_id = p.case_id
     WHERE p.case_id IS NOT NULL AND p.case_id <> '' AND p.created_at >= datetime('now', '+7 hours', '-${SO_NGAY_XET} days')
       AND (s.case_id IS NULL OR s.xong = 0 OR s.last_error IS NOT NULL OR p.created_at > s.last_sent_at)`,
  ).all<{ case_id: string }>();
  const ids = results.map((r) => r.case_id);
  if (ids.length === 0) return 0;

  const tomTat = await tinhTomTatCa(env.DB, ids);
  const prev = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const { results: r } = await env.DB.prepare(
      `SELECT case_id, last_hash, last_error FROM ca_tom_tat_sync WHERE case_id IN (${chunk.map(() => "?").join(",")})`,
    )
      .bind(...chunk)
      .all<{ case_id: string; last_hash: string | null; last_error: string | null }>();
    for (const x of r) prev.set(x.case_id, x.last_error ? "__retry__" : (x.last_hash ?? ""));
  }
  const doi = tomTat.filter((t) => prev.get(t.case_id) !== bam(t));
  // Ca không đổi nhưng đã xong -> đánh dấu xong để lần sau không xét lại (ca cũ chưa từng đánh dấu).
  const xongKhongDoi = tomTat.filter((t) => prev.get(t.case_id) === bam(t) && (t.xoa || t.hoan_tat === 1));
  if (xongKhongDoi.length) {
    await env.DB.batch(xongKhongDoi.map((t) => env.DB.prepare("UPDATE ca_tom_tat_sync SET xong = 1 WHERE case_id = ? AND xong = 0").bind(t.case_id)));
  }
  let sent = 0;
  for (let i = 0; i < doi.length; i += PUSH_BATCH) {
    const batch = doi.slice(i, i + PUSH_BATCH);
    const now = nowVN();
    let err: string | null = null;
    try {
      await callDvbh("sync/sua-chua-trang-thai", {
        method: "POST",
        body: JSON.stringify({ rows: [], ca: batch.map((t) => ({ ...t, thoi_diem: now })) }),
      });
      sent += batch.length;
    } catch (e) {
      err = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    }
    await env.DB.batch(
      batch.map((t) =>
        env.DB.prepare(
          `INSERT INTO ca_tom_tat_sync (case_id, last_hash, xong, last_sent_at, last_error) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(case_id) DO UPDATE SET last_hash = excluded.last_hash, xong = excluded.xong, last_sent_at = excluded.last_sent_at,
             last_error = excluded.last_error`,
        ).bind(t.case_id, bam(t), t.xoa || t.hoan_tat === 1 ? 1 : 0, now, err),
      ),
    );
    if (err) throw new Error(err);
  }
  return sent;
}
