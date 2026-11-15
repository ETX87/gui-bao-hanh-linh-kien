import { useState } from "react";
import { api, errorMessage, ERROR_MESSAGES } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn } from "../../ui/primitives";
import { isOverdue } from "../../lib/format";
import { LyDoChamGateField } from "../shared/LyDoChamGateField";
import { UserName } from "../../hooks/useUserNames";
import type { PhieuGui } from "../../lib/types";

// Admin BH xac nhan tiep nhan noi bo 1 hoac nhieu thung (12/10/2026, de xuat #10 ra soat Admin BH).
// Truoc day nut "Xac nhan da nhan" goi API khong kem ly do cham -> thung qua han SLA luon bi tra
// REQUIRE_LY_DO_CHAM ma man hinh khong co o nao de chon (ket). Nay: co thung qua han thi hien o ly
// do cham (chon 1 lan, ap cho cac thung qua han).

export function TiepNhanNoiBoModal({ thung, onClose, onDone }: { thung: PhieuGui[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);
  const soQuaHan = thung.filter((g) => isOverdue(g.thoi_gian_nhan_kho, "thung_cho_admin_nhan")).length;
  const tongDon = thung.reduce((n, g) => n + (g.so_don ?? 0), 0);

  const submit = async () => {
    if (soQuaHan > 0 && !lyDoCham) return toast("Vui lòng chọn lý do chậm.", "error");
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/admin/phieu-gui/tiep-nhan-noi-bo-hang-loat", {
        ids: thung.map((g) => g.id),
        ly_do_cham: lyDoCham || undefined,
      });
      if (r.loi.length) toast(`Đã tiếp nhận ${r.ok} thùng. ${r.loi.length} thùng lỗi: ${r.loi.map((x) => `${x.id} — ${ERROR_MESSAGES[x.error] || x.error}`).join("; ")}`, "error");
      else toast(`Đã tiếp nhận ${r.ok} thùng.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={thung.length === 1 ? `Tiếp nhận nội bộ thùng ${thung[0].id}` : `Tiếp nhận nội bộ ${thung.length} thùng`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" onClick={submit} disabled={busy || (soQuaHan > 0 && !lyDoCham)}>
            {busy ? "Đang lưu…" : `Xác nhận đã nhận ${thung.length} thùng`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <LyDoChamGateField gd="thung_cho_admin_nhan" overdue={soQuaHan > 0} value={lyDoCham} onChange={setLyDoCham} />
        {soQuaHan > 0 && thung.length > 1 && <p className="text-xs text-[var(--ink-soft)]">Lý do chậm áp cho {soQuaHan} thùng quá hạn.</p>}
        <p className="text-sm text-[var(--ink-body)]">
          Xác nhận đã nhận từ Kho {thung.length} thùng{tongDon ? ` (${tongDon} đơn bảo hành)` : ""}. Sau bước này các đơn trong thùng hiện ở bảng xử lý để xác nhận số lượng.
        </p>
        <ul className="max-h-60 overflow-y-auto divide-y divide-[var(--line)] rounded-lg border border-[var(--line)] text-[13px]">
          {thung.map((g) => (
            <li key={g.id} className="px-2.5 py-1.5 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{g.id}</span>
              <UserName email={g.nguoi_tao} className="truncate" />
              <span className="ml-auto text-xs text-[var(--ink-soft)]">{g.so_don ?? 0} đơn</span>
              {isOverdue(g.thoi_gian_nhan_kho, "thung_cho_admin_nhan") && <span className="text-xs font-semibold text-[var(--red-700)]">quá hạn</span>}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}
