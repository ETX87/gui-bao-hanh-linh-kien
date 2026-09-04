import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Textarea } from "../../ui/primitives";
import { useSlaGate, LyDoChamGateField } from "../shared/LyDoChamGateField";
import type { PhieuGui } from "../../lib/types";

// Kho bao su co tiep nhan - VAN chuyen "da_tiep_nhan" nhu binh thuong (port dung "bao loi CHI la canh
// bao, KHONG chan xu ly tiep").

export function BaoSuCoModal({ gui, onClose, onDone }: { gui: PhieuGui; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(gui.updated_at);
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/kho/phieu-gui/${gui.id}/bao-su-co`, { ly_do: lyDo, ghi_chu: ghiChu, ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã ghi nhận sự cố và tiếp nhận.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Báo sự cố tiếp nhận — ${gui.id}`}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="danger" disabled={!lyDo.trim() || busy || (overdue && !lyDoCham)} onClick={submit}>
            Ghi nhận & tiếp nhận
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        <Field label="Lý do sự cố" required>
          <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: thiếu hàng, hỏng vỡ do vận chuyển..." />
        </Field>
        <Field label="Ghi chú thêm">
          <Textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
