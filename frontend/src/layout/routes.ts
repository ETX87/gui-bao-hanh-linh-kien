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
}

export function routesForUser(u: AppUser): RouteItem[] {
  const items: RouteItem[] = [{ hash: "/home", label: "Trang chủ", icon: "🏠" }];
  if (u.la_ktv_dvbh || u.la_ve_tinh) {
    items.push(
      { hash: "/ktv/tao-phieu", label: "Gửi hàng bảo hành", icon: "📦", workloadKey: "ktv_phieu_nhap" },
      { hash: "/ktv/tra-cuu", label: "Tra cứu tiến độ", icon: "🔍" },
      { hash: "/ktv/nhan-hang", label: "Nhận hàng trả", icon: "📬", workloadKey: "ktv_nhan_hang" },
    );
  }
  if (u.la_kho) {
    items.push({ hash: "/kho/tiep-nhan", label: "Tiếp nhận", icon: "📥", workloadKey: "kho_cho_tiep_nhan" }, { hash: "/kho/dong-goi", label: "Đóng gói & gửi", icon: "📤", workloadKey: "kho_cho_dong_goi" });
  }
  if (u.la_admin_bh) {
    items.push(
      { hash: "/admin/phan-loai", label: "Xử lý đơn bảo hành", icon: "🗂️", workloadKey: "admin_cho_phan_loai" },
      { hash: "/admin/xac-nhan", label: "Xác nhận hoàn tất", icon: "✔️", workloadKey: "admin_cho_xac_nhan_hoan_tat" },
      { hash: "/admin/phieu-tra", label: "Phiếu trả bảo hành", icon: "↩️", workloadKey: "admin_san_sang_gom" },
      { hash: "/linh-kien", label: "Danh mục linh kiện", icon: "🔩" },
    );
  }
  if (u.la_nv_sua_chua) {
    items.push({ hash: "/nv/viec-cua-toi", label: "Việc của tôi", icon: "🔧", workloadKey: "nv_cho_chan_doan" });
  }
  if (u.la_ke_toan) {
    items.push({ hash: "/ketoan/duyet", label: "Duyệt phiếu trả", icon: "💰", workloadKey: "ketoan_cho_duyet" });
  }
  if (u.la_giam_sat || u.la_view) {
    items.push({ hash: "/quanly/tong-quan", label: "Tổng quan", icon: "📊" }, { hash: "/quanly/tra-cuu", label: "Tra cứu", icon: "🔍" });
  }
  if (u.la_qtri) {
    items.push({ hash: "/qtri/nguoi-dung", label: "Người dùng", icon: "👥" }, { hash: "/qtri/cai-dat", label: "Cài đặt hệ thống", icon: "⚙️" }, { hash: "/linh-kien", label: "Danh mục linh kiện", icon: "🔩" });
  }
  // Khu vuc dedupe theo hash - 1 nguoi dung co the vua la_admin_bh vua la_qtri, ca 2 nhanh o tren deu
  // push "/linh-kien" (chi khac nhau ve vi tri trong menu vai tro nao chiem truoc).
  const seen = new Set<string>();
  return items.filter((it) => (seen.has(it.hash) ? false : (seen.add(it.hash), true)));
}
