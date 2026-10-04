import type { AppUser } from "../lib/types";
import type { WorkloadCounts } from "../hooks/useWorkload";

// Danh sach menu theo vai tro - dung DUNG quy uoc hash cua prototype (#/ktv/tao-phieu...) de nguoi
// van hanh da quen giao dien cu khong bi lac. workloadKey (neu co) tro toi 1 field cua WorkloadCounts
// dung lam huy hieu so viec can lam tren Sidebar/Trang chu.

export interface RouteItem {
  hash: string;
  label: string;
  icon: string;
  workloadKey?: keyof WorkloadCounts;
  // "href" (them 05/09/2026, yeu cau "modules Mua hàng" tro sang linhkien.dichvu3t.workers.dev) -
  // danh dau 1 muc la LIEN KET RA NGOAI (sang he Worker/app khac hoan toan), KHONG phai 1 route noi
  // bo cua app nay - dung <a href> that (Sidebar/BottomNav) thay vi goi nav() qua router hash noi bo,
  // giu nguyen tab hien tai (khong target=_blank). Port dung quy uoc NavItem.href cua linh-kien-app
  // (frontend/src/layout/navConfig.ts) - ho da lam chieu nguoc lai (link tro sang suachua) tu
  // 25/08/2026.
  href?: string;
  // Nhom menu (DESIGN_SYSTEM.md §4 - nhan nhom 11px HOA tren Sidebar) - giup qtri/nguoi da vai tro
  // (toi 16 muc) quet nhanh theo khau nghiep vu thay vi 1 danh sach phang.
  group?: string;
  // Nhan ngan cho BottomNav mobile (1 tab chi ~70px - nhan day du bi cat "Gửi hàng bả…").
  short?: string;
}

export function routesForUser(u: AppUser): RouteItem[] {
  const items: RouteItem[] = [{ hash: "/home", label: "Trang chủ", short: "Trang chủ", icon: "🏠", group: "Chung" }];
  // la_qtri (Admin he thong) la superuser - phan hoi 04/09/2026 "Vai trò Admin cần nhìn được tất cả
  // các modules của hệ thống": moi nhanh duoi day mo them cho ca la_qtri, khong chi rieng vai tro
  // nghiep vu tuong ung - dong bo voi backend (moi ham requireX() da them u.la_qtri lam loi rem).
  if (u.la_ktv_dvbh || u.la_ve_tinh || u.la_qtri) {
    items.push(
      { hash: "/ktv/tao-phieu", label: "Gửi hàng bảo hành", short: "Gửi hàng", icon: "📦", workloadKey: "ktv_phieu_nhap", group: "KTV / Gửi hàng" },
      { hash: "/ktv/tra-cuu", label: "Tra cứu tiến độ", short: "Tra cứu", icon: "🔍", group: "KTV / Gửi hàng" },
      { hash: "/ktv/nhan-hang", label: "Nhận hàng trả", short: "Nhận hàng", icon: "📬", workloadKey: "ktv_nhan_hang", group: "KTV / Gửi hàng" },
    );
  }
  // GS/Admin bao hanh (khong dong thoi la KTV/Ve tinh/qtri - da co hash nay tu nhanh tren) - "tạo hộ
  // đơn bảo hành" (yeu cau 05/09/2026 muc 1): dung LAI dung man #/ktv/tao-phieu, tu re nhanh giao
  // dien theo vai tro (xem KtvTaoPhieuScreen).
  if ((u.la_giam_sat || u.la_admin_bh) && !(u.la_ktv_dvbh || u.la_ve_tinh || u.la_qtri)) {
    items.push({ hash: "/ktv/tao-phieu", label: "Tạo hộ đơn KTV", short: "Tạo hộ", icon: "📦", group: "KTV / Gửi hàng" });
  }
  if (u.la_kho || u.la_qtri) {
    items.push({ hash: "/kho/tiep-nhan", label: "Tiếp nhận", short: "Tiếp nhận", icon: "📥", workloadKey: "kho_cho_tiep_nhan", group: "Kho" }, { hash: "/kho/dong-goi", label: "Đóng gói & gửi", short: "Đóng gói", icon: "📤", workloadKey: "kho_cho_dong_goi", group: "Kho" });
  }
  if (u.la_admin_bh || u.la_qtri) {
    items.push(
      { hash: "/admin/phan-loai", label: "Xử lý đơn bảo hành", short: "Xử lý đơn", icon: "🗂️", workloadKey: "admin_cho_phan_loai", group: "Admin bảo hành" },
      { hash: "/admin/xac-nhan", label: "Xác nhận hoàn tất", short: "Hoàn tất", icon: "✔️", workloadKey: "admin_cho_xac_nhan_hoan_tat", group: "Admin bảo hành" },
      { hash: "/admin/phieu-tra", label: "Phiếu trả bảo hành", short: "Phiếu trả", icon: "↩️", workloadKey: "admin_san_sang_gom", group: "Admin bảo hành" },
      { hash: "/linh-kien", label: "Danh mục linh kiện", short: "Linh kiện", icon: "🔩", group: "Admin bảo hành" },
    );
  }
  if (u.la_nv_sua_chua || u.la_qtri) {
    items.push({ hash: "/nv/viec-cua-toi", label: "Việc của tôi", short: "Việc tôi", icon: "🔧", workloadKey: "nv_cho_chan_doan", group: "Sửa chữa" });
  }
  if (u.la_ke_toan || u.la_qtri) {
    items.push({ hash: "/ketoan/duyet", label: "Duyệt phiếu trả", short: "Duyệt", icon: "💰", workloadKey: "ketoan_cho_duyet", group: "Kế toán" });
  }
  if (u.la_giam_sat || u.la_view || u.la_qtri) {
    items.push({ hash: "/quanly/tong-quan", label: "Tổng quan", short: "Tổng quan", icon: "📊", group: "Giám sát" }, { hash: "/quanly/tra-cuu", label: "Tra cứu", short: "Tra cứu", icon: "🔍", group: "Giám sát" });
  }
  if (u.la_qtri) {
    items.push(
      { hash: "/qtri/nguoi-dung", label: "Người dùng", short: "Người dùng", icon: "👥", group: "Quản trị" },
      { hash: "/qtri/ktv", label: "Danh sách KTV", short: "DS KTV", icon: "📇", group: "Quản trị" },
      { hash: "/qtri/khu-vuc", label: "Giám sát khu vực", short: "Khu vực", icon: "🗺️", group: "Quản trị" },
      { hash: "/qtri/cai-dat", label: "Cài đặt hệ thống", short: "Cài đặt", icon: "⚙️", group: "Quản trị" },
      { hash: "/linh-kien", label: "Danh mục linh kiện", short: "Linh kiện", icon: "🔩", group: "Admin bảo hành" },
    );
  }
  // "Mua hàng" (them 05/09/2026) - lien ket ra ngoai sang he "Dat mua linh kien" (linh-kien-app),
  // LUON hien cho MOI nguoi dang nhap bat ke vai tro (giong cach linh-kien-app lam nguoc lai voi muc
  // "Sửa chữa" cua ho) - dat cuoi danh sach, truoc buoc dedupe.
  items.push({ hash: "/mua-hang", label: "Mua hàng", short: "Mua hàng", icon: "🛒", href: "https://linhkien.dichvu3t.workers.dev/", group: "Liên kết" });
  // Khu vuc dedupe theo hash - nhieu nhanh o tren co the cung push 1 hash (VD "/linh-kien" tu ca
  // nhanh admin_bh lan nhanh qtri, hoac 1 nguoi dung vua co nhieu co vai tro that vua la_qtri).
  const seen = new Set<string>();
  return items.filter((it) => (seen.has(it.hash) ? false : (seen.add(it.hash), true)));
}
