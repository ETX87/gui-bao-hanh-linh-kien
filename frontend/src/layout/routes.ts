import type { AppUser } from "../lib/types";
import type { WorkloadCounts } from "../hooks/useWorkload";

// Danh sach menu theo vai tro - dung DUNG quy uoc hash cua prototype (#/ktv/tao-phieu...) de nguoi
// van hanh da quen giao dien cu khong bi lac.

export interface RouteItem {
  hash: string;
  label: string;
  icon: string;
  // Cac so "viec can lam" (field cua WorkloadCounts) cong lai thanh huy hieu cua muc nay. 1 man hinh co
  // the gom nhieu hang doi (VD "Xu ly don bao hanh" = thung cho nhan noi bo + don cho xac nhan SL + don
  // cho phan loai) - truoc 10/10/2026 moi muc chi 1 so nen huy hieu thieu.
  countKeys?: (keyof WorkloadCounts)[];
  // "href" (them 05/09/2026, "modules Mua hàng" tro sang linhkien.dichvu3t.workers.dev) - danh dau 1 muc
  // la LIEN KET RA NGOAI (sang he Worker khac), dung <a href> that thay vi nav() qua router hash noi bo.
  href?: string;
  // Nhom menu = VAI TRO (10/10/2026). Nhan nhom hien kem tong so viec cua vai tro do.
  group?: string;
  // Nhan ngan cho BottomNav mobile va Sidebar thu gon (hien duoi icon).
  short?: string;
  // Mo ta 1 dong "muc nay dung de lam gi" - hien duoi nhan khi Sidebar mo rong + tooltip.
  desc?: string;
}

// Thiet ke lai 10/10/2026 (yeu cau "thiet ke lai menu cho toi, voi moi vai tro, se dem so don con can
// vai tro do xu ly"): menu chia nhom THEO VAI TRO (Theo doi -> KTV -> Kho -> Admin bao hanh -> NV sua
// chua -> Ke toan -> Quan tri), ben trong moi nhom giu thu tu quy trinh; nhan nhom hien TONG so viec cua
// vai tro, tung muc hien so viec cua man do (cong nhieu hang doi neu man gom nhieu buoc).
// Admin he thong (la_qtri) van thay du moi module nghiep vu (quyet dinh 04/09/2026), tru 3 man "cua toi"
// chi co nghia voi chinh nguoi do (KTV: Tien do / Nhan hang tra; NV: Chan doan duoc giao) - dung "Che do
// test" (layout/TestMode.tsx) de xem nhu KTV/NV.
// Thu tu trong mang = thu tu hien thi; nhom hien theo lan xuat hien dau tien; trung hash thi giu muc dau.
interface CatalogItem extends RouteItem {
  show: (u: AppUser) => boolean;
}

const isKtv = (u: AppUser) => u.la_ktv_dvbh || u.la_ve_tinh;

export const ROLE_GROUP = {
  theoDoi: "Giám sát · Theo dõi",
  ktv: "Kỹ thuật viên",
  kho: "Kho",
  admin: "Admin bảo hành",
  nv: "NV sửa chữa",
  ketoan: "Kế toán",
  qtri: "Quản trị hệ thống",
  link: "Liên kết",
} as const;
const G = ROLE_GROUP;

const CATALOG: CatalogItem[] = [
  { hash: "/home", label: "Trang chủ", short: "Trang chủ", icon: "🏠", group: "", desc: "Tổng hợp việc cần làm", show: () => true },

  { hash: "/quanly/tong-quan", label: "Tổng quan hệ thống", short: "Tổng quan", icon: "📊", group: G.theoDoi, desc: "Số đơn theo trạng thái, đơn quá hạn", show: (u) => u.la_giam_sat || u.la_view || u.la_qtri },
  { hash: "/quanly/tra-cuu", label: "Tra cứu mọi đơn", short: "Tra cứu", icon: "🔎", group: G.theoDoi, desc: "Tìm đơn bảo hành bất kỳ", show: (u) => u.la_giam_sat || u.la_view || u.la_qtri },
  // Giam sat (khong kem Admin BH/qtri) tao ho thung cho KTV trong khu vuc - nam trong nhom cua GS.
  { hash: "/ktv/tao-phieu", label: "Tạo hộ đơn cho KTV", short: "Tạo hộ", icon: "📦", group: G.theoDoi, desc: "Thùng nháp đang tạo hộ KTV", countKeys: ["ktv_phieu_nhap"], show: (u) => !isKtv(u) && u.la_giam_sat && !u.la_admin_bh && !u.la_qtri },

  { hash: "/ktv/tao-phieu", label: "Gửi hàng bảo hành", short: "Gửi hàng", icon: "📦", group: G.ktv, desc: "Thùng nháp + đơn Odoo chờ gửi", countKeys: ["ktv_phieu_nhap", "ktv_odoo_cho_gui"], show: isKtv },
  { hash: "/ktv/tra-cuu", label: "Tiến độ đơn của tôi", short: "Tiến độ", icon: "🔍", group: G.ktv, desc: "Đơn Admin yêu cầu bổ sung", countKeys: ["ktv_cho_bo_sung"], show: isKtv },
  { hash: "/ktv/nhan-hang", label: "Nhận hàng trả", short: "Nhận hàng", icon: "📬", group: G.ktv, desc: "Xác nhận đã nhận hàng trả về", countKeys: ["ktv_nhan_hang"], show: isKtv },

  { hash: "/kho/tiep-nhan", label: "Tiếp nhận thùng", short: "Tiếp nhận", icon: "📥", group: G.kho, desc: "Thùng chờ nhận + chờ bàn giao Admin", countKeys: ["kho_cho_tiep_nhan", "kho_cho_ban_giao"], show: (u) => u.la_kho || u.la_qtri },
  { hash: "/kho/dong-goi", label: "Đóng gói & gửi trả", short: "Đóng gói", icon: "📤", group: G.kho, desc: "Phiếu trả đã duyệt chờ đóng gói + khiếu nại không nhận được hàng", countKeys: ["kho_cho_dong_goi", "kho_khieu_nai"], show: (u) => u.la_kho || u.la_qtri },

  { hash: "/admin/phan-loai", label: "Xử lý đơn bảo hành", short: "Xử lý đơn", icon: "🗂️", group: G.admin, desc: "Nhận thùng nội bộ, xác nhận SL, phân loại", countKeys: ["admin_cho_tiep_nhan_noi_bo", "admin_cho_xac_nhan_sl", "admin_cho_phan_loai"], show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/admin/xac-nhan", label: "Xác nhận hoàn tất", short: "Hoàn tất", icon: "✔️", group: G.admin, desc: "Duyệt kết quả NV sửa chữa", countKeys: ["admin_cho_xac_nhan_hoan_tat"], show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/admin/phieu-tra", label: "Phiếu trả bảo hành", short: "Phiếu trả", icon: "↩️", group: G.admin, desc: "Đơn xong chờ gộp phiếu trả", countKeys: ["admin_san_sang_gom"], show: (u) => u.la_admin_bh || u.la_qtri },
  { hash: "/ktv/tao-phieu", label: "Tạo hộ đơn cho KTV", short: "Tạo hộ", icon: "📦", group: G.admin, desc: "Thùng nháp đang tạo hộ KTV", countKeys: ["ktv_phieu_nhap"], show: (u) => !isKtv(u) && (u.la_admin_bh || u.la_qtri) },
  { hash: "/linh-kien", label: "Danh mục linh kiện", short: "Linh kiện", icon: "🔩", group: G.admin, desc: "Linh kiện dùng trong bảo hành", show: (u) => u.la_admin_bh || u.la_qtri },

  { hash: "/nv/viec-cua-toi", label: "Chẩn đoán sửa chữa", short: "Chẩn đoán", icon: "🔧", group: G.nv, desc: "Đơn được giao cho bạn chẩn đoán", countKeys: ["nv_cho_chan_doan"], show: (u) => u.la_nv_sua_chua },

  { hash: "/ketoan/duyet", label: "Duyệt phiếu trả", short: "Duyệt", icon: "💰", group: G.ketoan, desc: "Phiếu trả chờ kế toán duyệt", countKeys: ["ketoan_cho_duyet"], show: (u) => u.la_ke_toan || u.la_qtri },

  { hash: "/qtri/ktv", label: "Danh sách KTV", short: "DS KTV", icon: "📇", group: G.qtri, desc: "Danh bạ KTV, tự duyệt khi đăng nhập", show: (u) => u.la_qtri },
  { hash: "/qtri/khu-vuc", label: "Giám sát khu vực", short: "Khu vực", icon: "🗺️", group: G.qtri, desc: "Gán giám sát phụ trách từng khu vực", show: (u) => u.la_qtri },
  { hash: "/qtri/nguoi-dung", label: "Người dùng & phân quyền", short: "Người dùng", icon: "👥", group: G.qtri, desc: "Duyệt tài khoản, gán vai trò", show: (u) => u.la_qtri },
  { hash: "/qtri/cai-dat", label: "Cài đặt hệ thống", short: "Cài đặt", icon: "⚙️", group: G.qtri, desc: "Lý do chậm/huỷ, đồng bộ Odoo", show: (u) => u.la_qtri },

  // 12/10/2026: tra lich su bao hanh theo Serial / ID case - moi vai tro. Nhom "" -> hien cung nhom Trang chu tren Sidebar; nam cuoi
  // danh sach de BottomNav mobile khong day cac tab cong viec ra khoi thanh duoi.
  { hash: "/lich-su", label: "Lịch sử Serial / Case", short: "Lịch sử", icon: "🔁", group: "", desc: "Tra lịch sử bảo hành theo Serial hoặc ID case", show: () => true },
  // Lien ket ra ngoai sang he "Dat mua linh kien" (05/09/2026) - luon hien cho moi nguoi.
  { hash: "/mua-hang", label: "Mua hàng", short: "Mua hàng", icon: "🛒", href: "https://linhkien.dichvu3t.workers.dev/", group: G.link, desc: "Mở hệ Đặt mua linh kiện", show: () => false }, // 11/10/2026: ẩn theo yêu cầu "ẩn menu sidebar Liên kết mua hàng"
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

// So viec cua 1 muc menu (cong cac hang doi cua man do).
export function countOf(it: RouteItem, counts: WorkloadCounts): number {
  return (it.countKeys ?? []).reduce((s, k) => s + (counts[k] ?? 0), 0);
}

// Tong so viec (khong cong trung 1 hang doi) cua 1 tap muc menu.
export function totalOf(items: RouteItem[], counts: WorkloadCounts): number {
  const keys = new Set<keyof WorkloadCounts>();
  for (const it of items) for (const k of it.countKeys ?? []) keys.add(k);
  let s = 0;
  keys.forEach((k) => (s += counts[k] ?? 0));
  return s;
}

// Gom muc menu theo nhom (vai tro) kem tong so viec cua nhom.
export function groupRoutes(items: RouteItem[], counts: WorkloadCounts) {
  const groups: { label: string; items: RouteItem[]; total: number }[] = [];
  for (const it of items) {
    const label = it.group || "";
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(it);
    else groups.push({ label, items: [it], total: 0 });
  }
  for (const g of groups) g.total = totalOf(g.items, counts);
  return groups;
}

// Chu thich so viec theo tung hang doi (tooltip) - VD "3 thùng chờ nhận nội bộ · 12 chờ phân loại".
export const COUNT_LABEL: Record<keyof WorkloadCounts, string> = {
  ktv_phieu_nhap: "thùng nháp chưa gửi",
  ktv_odoo_cho_gui: "đơn Odoo chờ gửi",
  ktv_cho_bo_sung: "đơn cần bổ sung",
  ktv_nhan_hang: "phiếu trả chờ nhận",
  kho_cho_tiep_nhan: "thùng chờ tiếp nhận",
  kho_cho_dong_goi: "phiếu chờ đóng gói",
  kho_cho_ban_giao: "thùng chờ bàn giao Admin",
  kho_khieu_nai: "khiếu nại chưa đánh giá",
  admin_cho_tiep_nhan_noi_bo: "thùng chờ nhận nội bộ",
  admin_cho_xac_nhan_sl: "đơn chờ xác nhận SL",
  admin_cho_phan_loai: "đơn chờ phân loại",
  admin_cho_xac_nhan_hoan_tat: "đơn chờ xác nhận hoàn tất",
  admin_san_sang_gom: "đơn chờ gộp phiếu trả",
  nv_cho_chan_doan: "đơn chờ chẩn đoán",
  ketoan_cho_duyet: "phiếu chờ duyệt",
};

export function countBreakdown(it: RouteItem, counts: WorkloadCounts): string {
  return (it.countKeys ?? [])
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => `${counts[k]} ${COUNT_LABEL[k]}`)
    .join(" · ");
}

// Ten vai tro viet tat cho Sidebar thu gon (duong ke ngan nhom).
export const GROUP_SHORT: Record<string, string> = {
  [ROLE_GROUP.theoDoi]: "Theo dõi",
  [ROLE_GROUP.ktv]: "KTV",
  [ROLE_GROUP.kho]: "Kho",
  [ROLE_GROUP.admin]: "Admin",
  [ROLE_GROUP.nv]: "NV",
  [ROLE_GROUP.ketoan]: "Kế toán",
  [ROLE_GROUP.qtri]: "Quản trị",
  [ROLE_GROUP.link]: "Liên kết",
};
