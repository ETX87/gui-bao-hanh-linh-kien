import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn } from "../../ui/primitives";
import { useSlaGate, LyDoChamGateField } from "../shared/LyDoChamGateField";
import type { PhieuGui } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

export function TiepNhanModal({ gui, onClose, onDone }: { gui: PhieuGui; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(gui.updated_at);
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/kho/phieu-gui/${gui.id}/tiep-nhan`, { ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã tiếp nhận.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Xác nhận tiếp nhận — ${gui.id}`}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || (overdue && !lyDoCham)} onClick={submit}>
            Xác nhận
          </Btn>
        </>
      }
    >
      <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
      {!overdue && <p className="text-sm text-[var(--ink-soft)]">Xác nhận đã nhận thùng hàng từ KTV <b><UserName email={gui.nguoi_tao} /></b>?</p>}
    </Modal>
  );
}
