import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { QtriNguoiDungScreen } from "../qtri/NguoiDung";
import { QtriKtvScreen } from "../qtri/KtvLienHe";
import { QtriKhuVucScreen } from "../qtri/KhuVuc";
import { QtriCaiDatScreen } from "../qtri/CaiDat";
import { LinhKienScreen } from "../shared/LinhKienScreen";
import { KhachHangScreen } from "../adminbh/KhachHang";
import type { AppUser } from "../../lib/types";

// 31/10/2026 - MAN CHUNG "Quản trị" (#/quan-tri) gop 5 man danh muc / quan tri: Người dùng, Danh sách KTV,
// Giám sát khu vực, Cài đặt hệ thống, Danh mục linh kiện (Admin BH chi thay tab Linh kiện).

export function QuanTriScreen({ user }: { user: AppUser }) {
  const q = (u: AppUser) => u.la_qtri;
  const tabs: TabDef[] = [
    { key: "linh_kien", label: "Danh mục linh kiện", show: (u) => u.la_admin_bh || u.la_qtri, render: () => <LinhKienScreen /> },
    { key: "khach_hang", label: "Khách hàng / NPP", show: (u) => u.la_admin_bh || u.la_qtri, render: () => <KhachHangScreen canEdit={!!(user.la_admin_bh || user.la_qtri)} /> },
    { key: "nguoi_dung", label: "Người dùng & phân quyền", show: q, render: () => <QtriNguoiDungScreen currentEmail={user.email} /> },
    { key: "ktv", label: "Danh sách KTV", show: q, render: () => <QtriKtvScreen /> },
    { key: "khu_vuc", label: "Giám sát khu vực", show: q, render: () => <QtriKhuVucScreen /> },
    { key: "cai_dat", label: "Cài đặt hệ thống", show: q, render: () => <QtriCaiDatScreen /> },
  ];
  return <TabScreen user={user} title="⚙️ Quản trị & danh mục" tabs={tabs} />;
}
