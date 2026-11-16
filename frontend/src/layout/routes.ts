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
// 30/10/2026 (UX mobile KTV): tai khoan CHI la KTV/Ve tinh (khong kem vai tro xu ly nao) -> Trang chu
// "Việc của tôi" rieng + thanh duoi 4 tab (Việc của tôi · Gửi hàng · Đơn của tôi · Nhận hàng).
export const isPureKtv = (u: AppUser) =>
  isKtv(u) && !(u.la_kho || u.la_admin_bh || u.la_nv_sua_chua || u.la_ke_toan || u.la_giam_sat || u.la_view || u.la_qtri || u.la_tra_xac);

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

// 31/10/2026 ("gộp các màn có chức năng tương tự ... tái sử dụng cho các vai trò"): menu khong con chia
// theo vai tro - moi vai tro dung chung 4 man chinh co tab theo giai doan (ui/TabScreen.tsx): Thùng hàng /
// Đơn bảo hành / Phiếu trả / Quản trị; man tu mo dung tab viec cua vai tro. KTV giu 3 man rieng (mobile).
// Link cu (#/kho/tiep-nhan, #/admin/phan-loai, #/ketoan/duyet...) tu chuyen tiep - xem lib/legacyRoutes.ts.
const CATALOG: CatalogItem[] = [
  { hash: "/home", label: "Trang chủ", short: "Trang chủ", icon: "🏠", group: "", desc: "Việc cần làm + tổng quan", show: () => true },

  { hash: "/ktv/tao-phieu", label: "Gửi hàng bảo hành", short: "Gửi hàng", icon: "📦", group: G.ktv, desc: "Thùng nháp + đơn Odoo chờ gửi", countKeys: ["ktv_phieu_nhap", "ktv_odoo_cho_gui", "ktv_thung_tu_choi"], show: isKtv },
  { hash: "/ktv/tra-cuu", label: "Đơn của tôi", short: "Đơn của tôi", icon: "📋", group: G.ktv, desc: "Mọi đơn đã gửi (cả thùng chưa về Kho) + đơn cần bổ sung", countKeys: ["ktv_cho_bo_sung"], show: isKtv },
  { hash: "/ktv/nhan-hang", label: "Nhận hàng trả", short: "Nhận hàng", icon: "📬", group: G.ktv, desc: "Xác nhận đã nhận hàng trả về", countKeys: ["ktv_nhan_hang"], show: isKtv },

  {
    hash: "/thung",
    label: "Thùng hàng",
    short: "Thùng",
    icon: "🚚",
    group: "",
    desc: "Thùng nháp / tạo hộ → đang gửi về Kho → Kho đã nhận, chờ Admin",
    countKeys: ["kho_cho_tiep_nhan", "kho_cho_ban_giao", "admin_cho_tiep_nhan_noi_bo", "kho_thung_tu_choi"],
    show: (u) => u.la_kho || u.la_admin_bh || u.la_giam_sat || u.la_qtri,
  },
  {
    hash: "/don",
    label: "Đơn bảo hành",
    short: "Đơn BH",
    icon: "🗂️",
    group: "",
    desc: "Chờ phân loại → đang sửa → chờ hoàn tất; tra cứu mọi giai đoạn",
    countKeys: ["admin_cho_xac_nhan_sl", "admin_cho_phan_loai", "admin_cho_xac_nhan_hoan_tat", "nv_cho_chan_doan", "admin_thieu_hang_da_ve"],
    show: (u) => u.la_admin_bh || u.la_nv_sua_chua || u.la_giam_sat || u.la_view || u.la_qtri,
  },
  { hash: "/admin/de-xuat", label: "Cấp linh kiện sửa chữa", short: "Cấp LK", icon: "🔩", group: "", desc: "Cấp linh kiện qua app Đặt linh kiện — Admin xác nhận tiêu hao, tự trừ công nợ NV", countKeys: ["admin_xn_tieu_hao", "admin_de_xuat_cho_cap", "kho_lk_cho_in", "kho_lk_da_in"], show: (u) => u.la_admin_bh || u.la_kho || u.la_qtri },
  { hash: "/nv/linh-kien", label: "Linh kiện của tôi", short: "LK của tôi", icon: "🧰", group: "", desc: "Linh kiện được cấp: đang giữ, đã dùng, trả kho, trừ công nợ", show: (u) => u.la_nv_sua_chua || u.la_admin_bh || u.la_ke_toan || u.la_qtri },
  {
    hash: "/phieu-tra",
    label: "Phiếu trả",
    short: "Phiếu trả",
    icon: "↩️",
    group: "",
    desc: "Chờ tạo phiếu → KT duyệt → Kho gửi → KTV nhận",
    countKeys: ["admin_san_sang_gom", "admin_phieu_tra_tu_choi", "ketoan_cho_duyet", "ketoan_de_xuat_lk", "kho_cho_in", "kho_da_in", "kho_lk_cho_in", "kho_lk_da_in", "kho_khieu_nai"],
    show: (u) => u.la_admin_bh || u.la_ke_toan || u.la_kho || u.la_view || u.la_qtri,
  },
  // 13/11/2026: module tra xac linh kien cho nha may (routes/xac.ts) - Admin BH gom thung, Ke toan duyet.
  { hash: "/tra-xac", label: "Trả xác linh kiện", short: "Trả xác", icon: "♻️", group: "", desc: "Gom xác Đổi mới vào thùng trả nhà máy → mã EO → Kế toán duyệt", countKeys: ["admin_thung_xac_tra_lai", "ketoan_thung_xac"], show: (u) => u.la_admin_bh || u.la_ke_toan || u.la_view || u.la_qtri || !!u.la_tra_xac },
  { hash: "/lich-su", label: "Lịch sử Serial / Case", short: "Lịch sử", icon: "🔁", group: "", desc: "Tra lịch sử bảo hành theo Serial hoặc ID case", show: () => true },
  { hash: "/bao-cao-nghen", label: "Điểm nghẽn & trách nhiệm", short: "Điểm nghẽn", icon: "🚦", group: "", desc: "Đang kẹt ở bước nào, chậm do bên nào, ai giữ việc quá hạn, việc chưa giải trình, xu hướng 8 tuần", show: (u) => u.la_admin_bh || u.la_view || u.la_giam_sat || u.la_qtri },
  { hash: "/bao-cao-bo", label: "Báo cáo BO theo tháng", short: "Báo cáo", icon: "📊", group: "", desc: "Số ca, thời gian xử lý, tỷ lệ SLA của từng nhân viên Kho / Admin BH / NV / Kế toán", show: (u) => u.la_admin_bh || u.la_view || u.la_qtri },
  { hash: "/logic", label: "Logic hệ thống", short: "Logic", icon: "📘", group: "", desc: "Luồng quy trình, logic tự động, lịch chạy — tài liệu cho BO", show: (u) => !isPureKtv(u) },
  { hash: "/quan-tri", label: "Quản trị & danh mục", short: "Quản trị", icon: "⚙️", group: "", desc: "Linh kiện, người dùng, KTV, khu vực, cài đặt", show: (u) => u.la_admin_bh || u.la_qtri },
];

export function routesForUser(u: AppUser): RouteItem[] {
  const seen = new Set<string>();
  const out: RouteItem[] = [];
  const pure = isPureKtv(u);
  for (const { show, ...it } of CATALOG) {
    if (!show(u) || seen.has(it.hash)) continue;
    // KTV thuan: Lich su Serial/Case nam trong man "Đơn của tôi" (link), khong chiem 1 tab thanh duoi.
    if (pure && it.hash === "/lich-su") continue;
    seen.add(it.hash);
    out.push(pure && it.hash === "/home" ? { ...it, label: "Việc của tôi", short: "Việc của tôi", icon: "🔥", desc: "Việc cần làm ngay + đơn đang theo dõi" } : it);
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
  kho_cho_in: "phiếu chờ in",
  kho_da_in: "phiếu đã in, chờ gửi",
  kho_lk_cho_in: "phiếu PXK cấp linh kiện chờ in",
  kho_lk_da_in: "phiếu PXK cấp linh kiện đã in, chờ xuất",
  kho_cho_ban_giao: "thùng chờ bàn giao Admin",
  kho_khieu_nai: "khiếu nại chưa đánh giá",
  kho_thung_tu_choi: "thùng Admin từ chối chờ Kho phản hồi",
  ktv_thung_tu_choi: "thùng bị từ chối chờ bạn phản hồi",
  admin_cho_tiep_nhan_noi_bo: "thùng chờ nhận nội bộ",
  admin_cho_xac_nhan_sl: "đơn chờ xác nhận SL",
  admin_cho_phan_loai: "đơn chờ phân loại",
  admin_cho_xac_nhan_hoan_tat: "đơn chờ xác nhận hoàn tất",
  admin_san_sang_gom: "đơn chờ gộp phiếu trả",
  admin_de_xuat_cho_cap: "ca xin linh kiện chờ cấp",
  admin_xn_tieu_hao: "ca chờ xác nhận tiêu hao linh kiện",
  admin_thieu_hang_da_ve: "yêu cầu thiếu hàng có kết quả (hàng về / từ chối)",
  admin_phieu_tra_tu_choi: "phiếu trả Kế toán trả lại",
  nv_cho_chan_doan: "đơn chờ chẩn đoán",
  ketoan_cho_duyet: "phiếu chờ duyệt",
  ketoan_de_xuat_lk: "ca cấp linh kiện chờ KT xác nhận",
  admin_xac_cho_gom: "xác chờ gom thùng",
  admin_thung_xac_nhap: "thùng trả xác nháp",
  admin_thung_xac_tra_lai: "thùng trả xác KT trả lại",
  ketoan_thung_xac: "thùng trả xác chờ KT duyệt",
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
