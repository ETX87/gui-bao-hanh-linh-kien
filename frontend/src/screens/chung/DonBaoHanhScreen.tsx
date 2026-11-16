import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { AdminPhanLoaiScreen } from "../adminbh/PhanLoai";
import { AdminDangSuaScreen } from "../adminbh/DangSua";
import { AdminXacNhanScreen } from "../adminbh/XacNhan";
import { NvViecCuaToiScreen } from "../nv/ViecCuaToi";
import { QuanLyTraCuuScreen } from "../quanly/TraCuu";
import { ThieuHangListScreen } from "../adminbh/ThieuHangList";
import type { AppUser } from "../../lib/types";

// 31/10/2026 - MAN CHUNG "Đơn bảo hành" (#/don) thay 5 man cu: Admin "Xử lý đơn bảo hành", "KTV đang sửa",
// "Xác nhận hoàn tất", NV "Chẩn đoán sửa chữa", Giám sát / View "Tra cứu mọi đơn". Tab theo giai doan;
// UI chi tiet don + cac nut xu ly (PhanLoai, FAST, Chan doan, Hoan tat...) da dung chung tu truoc va tu doi
// theo vai tro + trang thai. Quyen du lieu van loc o backend (NV chi thay don duoc giao...).

const admin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const theoDoi = (u: AppUser) => admin(u) || u.la_giam_sat || u.la_view;

export function DonBaoHanhScreen({ user }: { user: AppUser }) {
  const tabs: TabDef[] = [
    {
      key: "xu_ly", buoc: ["cho_xac_nhan_so_luong","cho_phan_loai","admin_can_xem_lai","cho_bo_sung_tt"],
      label: "Chờ phân loại",
      show: admin,
      countKeys: ["admin_cho_xac_nhan_sl", "admin_cho_phan_loai"],
      hint: "Xác nhận số lượng, phân loại, xử lý nhanh",
      render: () => <AdminPhanLoaiScreen user={user} />,
    },
    { key: "nv", buoc: ["cho_chan_doan"], label: "Việc sửa của tôi", show: (u) => u.la_nv_sua_chua, countKeys: ["nv_cho_chan_doan"], hint: "Đơn được giao cho bạn — nộp kết quả sửa chữa", render: () => <NvViecCuaToiScreen user={user} /> },
    { key: "dang_sua", buoc: ["cho_chan_doan"], label: "Đang sửa (NV)", show: admin, hint: "Đơn đang chờ NV sửa chữa — theo dõi, đề xuất linh kiện hộ", render: () => <AdminDangSuaScreen user={user} /> },
    { key: "hoan_tat", buoc: ["cho_admin_xac_nhan"], label: "Chờ xác nhận hoàn tất", show: admin, countKeys: ["admin_cho_xac_nhan_hoan_tat"], hint: "Duyệt kết quả NV sửa chữa", render: () => <AdminXacNhanScreen user={user} /> },
    {
      key: "thieu_hang",
      label: "📦 Thiếu hàng",
      show: (u) => admin(u) || u.la_nv_sua_chua || u.la_giam_sat || u.la_view,
      countKeys: ["admin_thieu_hang_da_ve"],
      hint: "Yêu cầu thiếu linh kiện gửi Kho / Mua hàng — theo dõi hàng đã về",
      render: () => <ThieuHangListScreen user={user} />,
    },
    { key: "tat_ca", label: "Mọi giai đoạn", show: theoDoi, hint: "Tra cứu mọi đơn, kể cả thùng chưa về Kho", render: () => <QuanLyTraCuuScreen key="tat_ca" user={user} /> },
    // 16/11/2026: 3 tab don da ket thuc - KHONG dem so tren tab (giam tai D1), chi tai khi bam vao, 20 dong / trang.
    { key: "xong_hom_nay", label: "✅ Đơn xong trong ngày", show: theoDoi, hint: "Mọi đơn kết thúc hôm nay: hoàn tất, huỷ, từ chối", render: () => <QuanLyTraCuuScreen key="kt_hom_nay" user={user} ketThuc="hom_nay" /> },
    { key: "da_xong", label: "🏁 Đơn xong", show: theoDoi, hint: "Đơn đã kết thúc: KTV đã nhận, kết thúc không gửi, chuyển kho, thất lạc", render: () => <QuanLyTraCuuScreen key="kt_xong" user={user} ketThuc="xong" /> },
    { key: "huy_tu_choi", label: "🚫 Đơn huỷ / từ chối", show: theoDoi, hint: "Thùng bị huỷ, đơn Admin từ chối / huỷ bảo hành", render: () => <QuanLyTraCuuScreen key="kt_huy" user={user} ketThuc="huy" /> },
  ];
  return <TabScreen user={user} title="🗂️ Đơn bảo hành" tabs={tabs} />;
}
