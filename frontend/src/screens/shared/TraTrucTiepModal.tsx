import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input } from "../../ui/primitives";

// "Tra truc tiep KTV" / "Giao truc tiep Kho" - duong tat BO QUA gom nhom + duyet ke toan (co chu
// dich, port dung openTaoPhieuTraNhanhModal()). Ma don hang/MISA sinh ngau nhien phia backend neu de
// trong, nhung Admin xem/sua duoc TRUOC khi tao that (nhap tay se ghi de gia tri ngau nhien).

export function TraTrucTiepModal({ unitId, mode, onClose, onDone }: { unitId: string; mode: "ktv" | "kho"; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [maDonHang, setMaDonHang] = useState("");
  const [maMisa, setMaMisa] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/phieu-tra/nhanh/${unitId}`, { mode, ma_don_hang: maDonHang || undefined, ma_misa: maMisa || undefined });
      toast(mode === "ktv" ? "Đã tạo phiếu trả trực tiếp cho KTV." : "Đã giao trực tiếp cho Kho.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={mode === "ktv" ? "⚡ Trả trực tiếp KTV" : "⚡ Giao trực tiếp Kho"}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            Tạo phiếu trả
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--ink-500)]">
          Bỏ qua bước gộm nhóm và duyệt kế toán, tạo thẳng 1 phiếu trả cho đúng đơn vị này —{" "}
          {mode === "ktv" ? "chuyển ngay sang chờ KTV xác nhận nhận." : "chuyển ngay sang chờ Kho đóng gói."}
        </p>
        <Field label="Mã đơn hàng (để trống sẽ tự sinh)">
          <Input value={maDonHang} onChange={(e) => setMaDonHang(e.target.value)} placeholder="DH-123456" />
        </Field>
        <Field label="Mã MISA / PXK (để trống sẽ tự sinh)">
          <Input value={maMisa} onChange={(e) => setMaMisa(e.target.value)} placeholder="PXK-123456" />
        </Field>
      </div>
    </Modal>
  );
}
