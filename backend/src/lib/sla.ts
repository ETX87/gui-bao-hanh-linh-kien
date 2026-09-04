// Cong SLA 24h - port dung isOverdue()/gateSla() trong prototype-html/index.html. Backend khong co
// khai niem "mo modal" nhu frontend - route chi tra loi 400 REQUIRE_LY_DO_CHAM neu qua han ma
// request khong kem "ly_do_cham", frontend se hien modal hoi lai (Giai doan 4).

export function hoursSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  // Cot thoi gian luu dang "YYYY-MM-DD HH:MM:SS" gio VN (xem lib/vnTime.ts) - Date() parse duoc
  // truc tiep khi thay " " bang "T" (giong cach frontend prototype da lam).
  const then = new Date(dateStr.replace(" ", "T")).getTime();
  const nowVNms = Date.now() + 7 * 60 * 60 * 1000;
  return (nowVNms - then) / 3_600_000;
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  return hoursSince(dateStr) > 24;
}
