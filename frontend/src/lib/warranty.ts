// Tinh trang thai bao hanh 1 case - port DUNG cong thuc warrantyCheck() cua prototype-html/index.html
// (dong 1419-1427, doc truc tiep truoc khi viet lai, khong doan): han bao hanh = ngay_mua + N thang
// (N = linh_kien.so_thang_bao_hanh), het han neu thoi_gian_cskh_tiep_nhan (luc khach bao loi) > han.

export interface WarrantyStatus {
  known: boolean; // co du du lieu de tinh khong (ngay_mua + so_thang_bao_hanh)
  expired: boolean;
  limitDate: string | null; // yyyy-mm-dd
  daysUsed: number | null;
  months: number | null;
}

export function computeWarranty(ngayMua: string | null | undefined, soThangBaoHanh: number | null | undefined, thoiGianTiepNhan: string | null | undefined): WarrantyStatus {
  if (!ngayMua || !soThangBaoHanh) return { known: false, expired: false, limitDate: null, daysUsed: null, months: null };
  const muaDate = new Date(ngayMua);
  if (Number.isNaN(muaDate.getTime())) return { known: false, expired: false, limitDate: null, daysUsed: null, months: null };
  const limit = new Date(muaDate);
  limit.setMonth(limit.getMonth() + soThangBaoHanh);
  const usedStr = thoiGianTiepNhan || new Date().toISOString();
  const used = new Date(usedStr);
  const expired = used.getTime() > limit.getTime();
  const daysUsed = Math.round((used.getTime() - muaDate.getTime()) / 86400000);
  return { known: true, expired, limitDate: limit.toISOString().slice(0, 10), daysUsed, months: soThangBaoHanh };
}
