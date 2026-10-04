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
  // Nhan ngan cho BottomNav mobile va Sidebar thu gon (hien duoi icon).
  short?: string;
  // Mo ta 1 dong "muc nay dung de lam gi" - hien duoi nhan khi Sidebar mo rong + tooltip.
  desc?: string;
}

// Sap xep lai 05/10/2026 (phan hoi "giao dien admin hien nhieu muc menu... sap xep hon loan va khong biet
// dung cho viec gi"): menu chia nhom THEO LUONG NGHIEP VU (Theo doi -> 1 Gui hang -> 2 Kho -> 3 Xu ly ->
// 4 Tra hang -> Danh muc & quan tri), moi muc co mo ta (desc) hien duoi nhan/tooltip. Admin he thong
// (la_qtri) VAN thay du moi module nghiep vu (giu quyet dinh 04/09/2026), tru 3 man "cua toi" chi co
// nghia voi chinh nguoi do (KTV: Tien do don cua toi / Nhan hang tra; NV: Chan doan duoc giao) - voi
// Admin cac man nay luon rong; muon xem dung nhu KTV/NV thi dung "Che do test" (layout/TestMode.tsx).
// Thu tu trong mang = thu tu hien thi; nhom hien theo lan xuat hien dau tien.
interface CatalogItem extends RouteItem {
  show: (u: AppUser) => boolean;
}

const isKtv = (u: AppUser) => u.la_ktv_dvbh || u.la_ve_tinh;

const CATALOG: CatalogItem[] = [
  { hash: "/home", label: "Trang chủ", short: "Trang chủ", icon: "🏠", group: "", desc: "Việc cần làm của bạn", show: () => true },

  { hash: "/quanly/tong-quan", label: "Tổng quan hệ thống", short: "Tổng quan", icon: "📊", group: "Theo dõi", desc: "Số đơn theo trạng thái, đơn quá hạn", show: (u) => u.la_giam_sat || u.la_view || u.la_qtri },
  { hash: "/quanly/tra-cuu", label: "Tra cứu mọi đơn", short: "Tra cứu", icon: "🔎", group: "Theo dõi", desc: "Tìm đơn bảo hành bất kỳ", show: (u) => u.la_giam_sat || u.la_view || u.la_qtri },

  { hash: "/ktv/tao-phieu", label: "Gửi hàng bảo hành", short: "Gửi hàng", icon: "📦", group: "1 · Gửi hàng", desc: "Tạo thùng, thêm đơn, gửi về kho", workloadKey: "ktv_phieu_nhap", show: isKtv },
  { hash: "/ktv/tao-phieu", label: "Tạo hộ đơn cho KTV", short: "Tạo hộ", icon: "📦", group: "1 · Gửi hàng", desc: "Tạo thùng thay cho 1 KTV", show: (u) => !isKtv(u) && (u.la_giam_sat || u.la_admin_bh || u.la_qtri) },
  { hash: "/ktv/tra-cuu", label: "Tiến độ đơn của tôi", short: "Tiến độ", icon: "🔍", group: "1 · Gửi hàng", desc: "Đơn đã gửi đang ở bước nào", show: isKtv },
  { hash: "/ktv/nhan-hang", label: "Nhận hàng trả", short: "Nhận hàng", icon: "📬", group: "1 · Gửi hàng", desc: "Xác nhận đã nhận hàng trả về", workloadKey: "ktv_nhan_hang", show: isKtv },

  { hash: "/kho/tiep-nhan", label: "Tiếp nhận thùng", short: "Tiếp nhận", icon: "📥", group: "2 · Kho", desc: "Kho nhận thùng KTV gửi về", workloadKey: "kho_cho_tiep_nhan", show: (u) => u.la_kho || u.la_qtri },
  { hash: "/kho/dong-goi", label: "Đóng gói & gửi trả", short: "Đóng gói", icon: "📤", group: "2 · Kho", desc: "Đóng gói phiếu trả đã duyệt, gửi KTV", workloadKey: "kho_cho_dong_goi", show: (u) => u.la_kho || u.la_qtri },

  { hash: "/admin/phan-loai", label: "Xử lý đơn bảo hành", short: "Xử lý đơn", icon: "🗂️", group: "3 · Xử lý bảo hành", desc: "Nhận thùng nội bộ, xác nhận SL, phân loại", workloadKey: "admin_cho_phan_loai", show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/nv/viec-cua-toi", label: "Chẩn đoán sửa chữa", short: "Chẩn đoán", icon: "🔧", group: "3 · Xử lý bảo hành", desc: "Đơn được giao cho bạn chẩn đoán", workloadKey: "nv_cho_chan_doan", show: (u) => u.la_nv_sua_chua },
  { hash: "/admin/xac-nhan", label: "Xác nhận hoàn tất", short: "Hoàn tất", icon: "✔️", group: "3 · Xử lý bảo hành", desc: "Duyệt kết quả NV sửa chữa", workloadKey: "admin_cho_xac_nhan_hoan_tat", show: (u) => u.la_admin_bh || u.la_qtri },

  { hash: "/admin/phieu-tra", label: "Phiếu trả bảo hành", short: "Phiếu trả", icon: "↩️", group: "4 · Trả hàng", desc: "Gộp đơn xong thành phiếu trả KTV", workloadKey: "admin_san_sang_gom", show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/ketoan/duyet", label: "Duyệt phiếu trả", short: "Duyệt", icon: "💰", group: "4 · Trả hàng", desc: "Kế toán duyệt trước khi Kho gửi", workloadKey: "ketoan_cho_duyet", show: (u) => u.la_ke_toan || u.la_qtri },

  { hash: "/linh-kien", label: "Danh mục linh kiện", short: "Linh kiện", icon: "🔩", group: "Danh mục & quản trị", desc: "Linh kiện dùng trong bảo hành", show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/qtri/ktv", label: "Danh sách KTV", short: "DS KTV", icon: "📇", group: "Danh mục & quản trị", desc: "Danh bạ KTV, tự duyệt khi đăng nhập", show: (u) => u.la_qtri },
  { hash: "/qtri/khu-vuc", label: "Giám sát khu vực", short: "Khu vực", icon: "🗺️", group: "Danh mục & quản trị", desc: "Gán giám sát phụ trách từng khu vực", show: (u) => u.la_qtri },
  { hash: "/qtri/nguoi-dung", label: "Người dùng & phân quyền", short: "Người dùng", icon: "👥", group: "Danh mục & quản trị", desc: "Duyệt tài khoản, gán vai trò", show: (u) => u.la_qtri },
  { hash: "/qtri/cai-dat", label: "Cài đặt hệ thống", short: "Cài đặt", icon: "⚙️", group: "Danh mục & quản trị", desc: "Lý do chậm/huỷ, đồng bộ Odoo", show: (u) => u.la_qtri },

  // Lien ket ra ngoai sang he "Dat mua linh kien" (05/09/2026) - luon hien cho moi nguoi.
  { hash: "/mua-hang", label: "Mua hàng", short: "Mua hàng", icon: "🛒", href: "https://linhkien.dichvu3t.workers.dev/", group: "Liên kết", desc: "Mở hệ Đặt mua linh kiện", show: () => true },
];

export function routesForUser(u: AppUser): RouteItem[] {
  const seen = new Set<string>();
  const out: RouteItem[] = [];
  for (const { show, ...it } of CATALOG) {
    if (!show(u) || seen.has(it.hash)) continue;
    seen.add(it.hash);
    out.push(it);
  }
  return out;
}
