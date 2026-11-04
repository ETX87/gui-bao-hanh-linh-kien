// 31/10/2026: cac man cu da gop vao 4 man chung (xem layout/routes.ts). Link cu (bookmark, link gui qua
// Zalo, hash trong canh bao don ton) tu chuyen sang man moi + dung tab, giu nguyen cac tham so khac.
export const LEGACY_ROUTES: Record<string, string> = {
  "/kho/tiep-nhan": "/thung?tab=dang_gui",
  "/kho/dong-goi": "/phieu-tra?tab=cho_in",
  "/admin/phan-loai": "/don?tab=xu_ly",
  "/admin/dang-sua": "/don?tab=dang_sua",
  "/admin/xac-nhan": "/don?tab=hoan_tat",
  "/nv/viec-cua-toi": "/don?tab=nv",
  "/quanly/tra-cuu": "/don?tab=tat_ca",
  "/quanly/tong-quan": "/home",
  "/admin/phieu-tra": "/phieu-tra?tab=cho_tao",
  "/admin/phieu-tra-ke-toan": "/phieu-tra?tab=cho_kt",
  "/ketoan/duyet": "/phieu-tra?tab=cho_kt",
  "/linh-kien": "/quan-tri?tab=linh_kien",
  "/qtri/nguoi-dung": "/quan-tri?tab=nguoi_dung",
  "/qtri/ktv": "/quan-tri?tab=ktv",
  "/qtri/khu-vuc": "/quan-tri?tab=khu_vuc",
  "/qtri/cai-dat": "/quan-tri?tab=cai_dat",
};

// Tra ve hash moi (khong co dau #) neu path la man cu, null neu khong.
export function legacyTarget(path: string, query: URLSearchParams): string | null {
  const to = LEGACY_ROUTES[path];
  if (!to) return null;
  const [p, qs] = to.split("?");
  const q = new URLSearchParams(qs || "");
  query.forEach((v, k) => {
    if (!q.has(k)) q.set(k, v);
  });
  const s = q.toString();
  return s ? `${p}?${s}` : p;
}
