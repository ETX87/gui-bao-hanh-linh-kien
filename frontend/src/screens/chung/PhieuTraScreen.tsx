import { useState } from "react";
import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { Btn } from "../../ui/primitives";
import { OdooImportExportModal } from "../shared/OdooImportExportModal";
import { PhieuTraListCard } from "../adminbh/PhieuTraList";
import { AdminPhieuTraScreen } from "../adminbh/PhieuTra";
import { KtDaXuLyCard } from "../ketoan/Duyet";
import { AdminDeXuatScreen } from "../adminbh/DeXuatLinhKien";
import type { AppUser } from "../../lib/types";

// 31/10/2026 - MAN CHUNG "Phiếu trả" (#/phieu-tra) thay 5 man cu: Admin "Phiếu trả bảo hành" + "Phiếu đã
// gửi kế toán", Kế toán "Duyệt phiếu trả", Kho "Đóng gói & gửi trả" (+ KTV xem tren may tinh). Cung 1
// danh sach (GET /phieu-tra), tab theo giai doan; nut thao tac nam trong UI chi tiet phieu tra va tu doi
// theo vai tro + trang thai (PhieuTraDetailModal) nen khong can man rieng cho tung vai tro.

const admin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const kt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
const kho = (u: AppUser) => u.la_kho || u.la_qtri;
const xem = (u: AppUser) => admin(u) || kt(u) || kho(u) || u.la_view;

function list(user: AppUser, value: string, emptyText: string, opts: { extraKhieuNai?: boolean; khoIn?: 0 | 1 } = {}) {
  return (
    <PhieuTraListCard
      key={`${value}|${opts.khoIn ?? ""}`}
      khoIn={opts.khoIn}
      user={user}
      title="Danh sách"
      tabs={[{ value, label: "" }]}
      emptyText={emptyText}
      extraCols={
        opts.extraKhieuNai
          ? [{ key: "kn", header: "Nội dung KTV báo", render: (r) => <span className="block max-w-[280px] truncate" title={r.khong_nhan_duoc_ghi_chu || ""}>{r.khong_nhan_duoc_ghi_chu || "—"}</span> }]
          : undefined
      }
    />
  );
}

export function PhieuTraScreen({ user }: { user: AppUser }) {
  const [odooOpen, setOdooOpen] = useState(false);
  const tabs: TabDef[] = [
    { key: "cho_tao", label: "Chờ tạo phiếu", show: admin, countKeys: ["admin_san_sang_gom"], hint: "Đơn đã xử lý xong, chờ gộp phiếu trả", render: () => <AdminPhieuTraScreen user={user} /> },
    { key: "nhap", label: "Nháp", show: admin, render: () => list(user, "nhap", "Không có phiếu trả nháp nào.") },
    { key: "tu_choi_kt", label: "↩ KT trả lại", show: admin, countKeys: ["admin_phieu_tra_tu_choi"], render: () => list(user, "tu_choi_kt", "Không có phiếu nào bị Kế toán trả lại.") },
    { key: "cho_kt", label: "Chờ KT duyệt", show: (u) => admin(u) || kt(u), countKeys: ["ketoan_cho_duyet"], hint: "Kế toán mở từng phiếu để duyệt / từ chối", render: () => list(user, "cho_ke_toan_duyet", "Không có phiếu trả nào chờ duyệt.") },
    // 04/11/2026 - "gộp các công việc cần xử lý của kế toán vào chung 1 side bar => chuyển phiếu cấp linh kiện về chung
    // menu Phiếu trả": de xuat linh kien cho Ke toan xac nhan MISA (duyet ca case hoac le tung don).
    { key: "cap_lk", label: "🔩 Cấp linh kiện", show: (u) => kt(u) || kho(u), countKeys: ["ketoan_de_xuat_lk", "kho_lk_cho_in", "kho_lk_da_in"], hint: "Phiếu cấp linh kiện: Kế toán nhập MISA, duyệt → Kho in phiếu → Kho xuất", render: () => <AdminDeXuatScreen user={user} ktOnly /> },
    { key: "kt_da", label: "KT đã xử lý", show: kt, render: () => <KtDaXuLyCard user={user} /> },
    // 04/11/2026 - "Bổ sung 1 trạng trung gian cho KHO là trạng thái Kho đã in phiếu, Chờ kho in phiếu, có thể đổi qua lại,
    // và tách Chờ kho gửi thành 2 tab theo 2 trạng thái này."
    { key: "cho_in", label: "🖨 Chờ Kho in phiếu", show: xem, countKeys: ["kho_cho_in"], hint: "Kế toán đã duyệt — Kho in phiếu xuất", render: () => list(user, "da_duyet_ke_toan", "Không có phiếu trả nào chờ in.", { khoIn: 0 }) },
    { key: "da_in", label: "📦 Kho đã in phiếu", show: xem, countKeys: ["kho_da_in"], hint: "Đã in phiếu — Kho đóng gói & gửi", render: () => list(user, "da_duyet_ke_toan", "Không có phiếu trả nào đã in chờ gửi.", { khoIn: 1 }) },
    { key: "khieu_nai", label: "⚠ KTV báo không nhận", show: (u) => admin(u) || kho(u), countKeys: ["kho_khieu_nai"], hint: "Kho đánh giá: gửi thành công / thất bại (thất lạc)", render: () => list(user, "khieu_nai_van_chuyen", "Không có khiếu nại nào.", { extraKhieuNai: true }) },
    { key: "dang_gui", label: "Đang gửi KTV", show: xem, hint: "Đã gửi — chờ KTV xác nhận (Kho có thể xác nhận thay)", render: () => list(user, "da_gui", "Không có phiếu trả nào đang gửi.") },
    { key: "xong", label: "Đã kết thúc", show: xem, render: () => list(user, "ktv_da_nhan,gui_that_bai,ket_thuc_khong_gui", "Chưa có phiếu trả nào kết thúc.") },
    { key: "tat_ca", label: "Tất cả", show: xem, render: () => list(user, "", "Chưa có phiếu trả nào.") },
  ];
  // 01/11/2026 ("nút tải file import odoo ... thường là file đã xử lý mới cần import lên odoo"): nut chuyen tu
  // man Xu ly don (dang xu ly) sang day - noi Admin theo doi don da xu ly xong / dang tra / da ket thuc.
  return (
    <>
      <TabScreen
        user={user}
        title="↩️ Phiếu trả"
        tabs={tabs}
        actions={
          admin(user) && (
            <Btn onClick={() => setOdooOpen(true)} title="File ID / Trạng thái / Ngày hoàn thành / Ghi chú của đơn đã xử lý xong để import ngược về Odoo">
              📤 File import Odoo
            </Btn>
          )
        }
      />
      {odooOpen && <OdooImportExportModal onClose={() => setOdooOpen(false)} />}
    </>
  );
}
