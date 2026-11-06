
// 03/11/2026 - nguyen van: "nếu case có tiền tố SC261103 = hôm nay thì cho phép tạo nhưng sẽ thêm 1 lưu ý cảnh báo cho
// Admin bh là ID case chưa được xác minh. nếu tiền tố thấp hơn hoặc cao hơn hôm tạo thì không cho phép tạo. (SC + YY +
// MM + DD +xxxx) vì nếu phát sinh trường hợp chưa kịp đồng bộ chỉ có thể là ca trong ngày."

/** "SC26110301234" -> "261103"; khong dung dinh dang -> null. */
export function ngayCuaCase(caseId: string): string | null {
  const m = /^SC(\d{2})(\d{2})(\d{2})\d+$/i.exec(caseId.trim());
  if (!m) return null;
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return m[1] + m[2] + m[3];
}

/** YYMMDD theo gio VN, lech `ngayLui` ngay ve truoc. */
export function yymmddVN(ngayLui = 0): string {
  const d = new Date(Date.now() + 7 * 3600_000 - ngayLui * 86400_000).toISOString();
  return d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);
}

/** Case trong ngay hom nay (gio VN) -> duoc tao don du DVBH chua co (chua dong bo kip). */
export function laCaseHomNay(caseId: string): boolean {
  return ngayCuaCase(caseId) === yymmddVN(0);
}

/** Cron xac minh: case "trong ngay" chua thay tren DVBH thi cho them toi het ngay hom sau moi danh dau that bai. */
export function conChoDongBo(caseId: string): boolean {
  const d = ngayCuaCase(caseId);
  return !!d && d >= yymmddVN(1) && d <= yymmddVN(0);
}


/** 06/11/2026 - "hỗ trợ tìm kiếm ID case cả viết hoa và viết thường ví dụ Sc2611030124": ma case dang chu + so
 * (SC..., T...) luon viet hoa (DVBH luu viet hoa, so khop dung nguyen van). Ma khac giu nguyen. */
export function normCaseId(s: string | null | undefined): string {
  const t = (s || "").trim();
  return /^[a-z]{1,4}\d+$/i.test(t) ? t.toUpperCase() : t;
}
