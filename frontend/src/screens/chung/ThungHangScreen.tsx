import { useState } from "react";
import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { KtvTaoPhieuScreen } from "../ktv/TaoPhieu";
import { ThungNhapKtvList } from "./ThungNhapKtv";
import { KhoTiepNhanScreen } from "../kho/TiepNhan";
import { ThungDangGuiCard } from "../adminbh/NhanHoKho";
import { ThungChoNhanNoiBoCard } from "../adminbh/ThungNoiBo";
import { ThungTuChoiList } from "../shared/TuChoiThung";
import { useWorkload } from "../../hooks/useWorkload";
import type { AppUser } from "../../lib/types";

// 31/10/2026 - MAN CHUNG "Thùng hàng" (#/thung) thay: "Tạo hộ đơn cho KTV" (Giám sát / Admin), Kho "Tiếp
// nhận thùng", 2 khoi thung o dau man Admin "Xử lý đơn" (chờ nhận nội bộ + đang gửi về Kho). Tab theo
// duong di cua thung: Nháp -> Đang gửi về Kho -> Kho đã nhận, chờ Admin -> Kho nhận gần đây.
// Cung 1 thung, nut thao tac doi theo vai tro: Kho "Xác nhận tiếp nhận", Admin "Nhận hộ Kho" / "Xác nhận đã nhận".

const admin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const kho = (u: AppUser) => u.la_kho || u.la_qtri;
const taoHo = (u: AppUser) => u.la_giam_sat || u.la_admin_bh || u.la_qtri || u.la_ktv_dvbh || u.la_ve_tinh;

function NhanHoKhoTab() {
  const { refresh } = useWorkload();
  const [k, setK] = useState(0);
  return <ThungDangGuiCard alwaysOpen reloadKey={k} onDone={() => { setK((x) => x + 1); refresh(); }} />;
}

export function ThungHangScreen({ user }: { user: AppUser }) {
  const tabs: TabDef[] = [
    { key: "nhap", label: "Thùng nháp / tạo hộ", show: taoHo, countKeys: ["ktv_phieu_nhap"], hint: "Tạo thùng hộ KTV, thêm đơn, xác nhận gửi", render: () => <KtvTaoPhieuScreen user={user} /> },
    {
      key: "nhap_ktv",
      label: "Thùng nháp của KTV",
      show: (u) => kho(u) || admin(u) || u.la_giam_sat,
      hint: "Mọi thùng KTV đang tạo, chưa bấm gửi — xem, in phiếu, hoặc nhận trực tiếp",
      render: () => <ThungNhapKtvList />,
    },
    {
      key: "dang_gui",
      label: "Đang gửi về Kho",
      show: (u) => kho(u) || admin(u),
      countKeys: ["kho_cho_tiep_nhan"],
      hint: "Kho xác nhận tiếp nhận / Admin nhận hộ Kho khi KTV giao trực tiếp",
      render: () => (kho(user) ? <KhoTiepNhanScreen only="cho_nhan" /> : <NhanHoKhoTab />),
    },
    {
      key: "cho_admin",
      label: "Kho đã nhận — chờ Admin",
      show: (u) => kho(u) || admin(u),
      countKeys: ["kho_cho_ban_giao", "admin_cho_tiep_nhan_noi_bo"],
      hint: "Admin bảo hành xác nhận đã nhận thùng từ Kho",
      render: () => (admin(user) ? <ThungChoNhanNoiBoCard /> : <KhoTiepNhanScreen only="ban_giao" />),
    },
    {
      key: "tu_choi",
      label: "⛔ Từ chối",
      show: (u) => kho(u) || admin(u),
      countKeys: ["kho_thung_tu_choi"],
      hint: "Thùng Admin BH từ chối tiếp nhận — Kho / KTV phản hồi, Admin rút lại nếu nhầm",
      render: () => (
        <div className="space-y-3">
          <ThungTuChoiList user={user} tt="dang" />
          <ThungTuChoiList user={user} tt="da_huy" />
        </div>
      ),
    },
    { key: "gan_day", label: "Kho nhận gần đây", show: kho, render: () => <KhoTiepNhanScreen only="gan_day" /> },
  ];
  return <TabScreen user={user} title="📦 Thùng hàng" tabs={tabs} />;
}
