import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { useLinhKien } from "../../hooks/useLinhKien";
import { LY_DO_BO_SUNG_OPTIONS } from "../../lib/constants";
import type { DonVi } from "../../lib/types";

// KTV bo sung thong tin theo yeu cau Admin BH - port dung openBoSungModal(): hien ro ly do Admin da
// yeu cau + cho doi ca linh kien (khong chi sua mo ta) - port dung "Phan hoi vong 4 muc 1".

export function KtvBoSungModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const [moTa, setMoTa] = useState(unit.mo_ta_loi || "");
  const [maLk, setMaLk] = useState(unit.ma_lk || "");
  const [busy, setBusy] = useState(false);

  const lyDoRaw = unit.ly_do_bo_sung || "";
  const lyDoCode = lyDoRaw.split(":")[0];
  const lyDoLabel = LY_DO_BO_SUNG_OPTIONS.find((o) => o.value === lyDoCode)?.label || lyDoCode;

  const submit = async () => {
    setBusy(true);
    try {
      await api.patch(`/phieu-gui/don-vi/${unit.id}/bo-sung`, { mo_ta_loi: moTa, ma_lk: maLk });
      toast("Đã gửi bổ sung.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Bổ sung thông tin theo yêu cầu Admin bảo hành"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!moTa.trim() || busy} onClick={submit}>
            Gửi bổ sung
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-[var(--amber-100)] text-[var(--amber-700)] text-xs font-bold px-3 py-2">Admin bảo hành yêu cầu bổ sung: {lyDoLabel}{lyDoRaw.includes(":") ? ` — ${lyDoRaw.split(":").slice(1).join(":").trim()}` : ""}</p>
        <Field label="Linh kiện lỗi">
          <Select value={maLk} onChange={(e) => setMaLk(e.target.value)}>
            <option value="">— Chọn —</option>
            {linhKien.map((lk) => (
              <option key={lk.ma_lk} value={lk.ma_lk}>
                {lk.ten_lk}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
