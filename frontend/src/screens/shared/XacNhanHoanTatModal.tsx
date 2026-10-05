import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { XU_LY_XAC_LABELS } from "../../lib/constants";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DonVi } from "../../lib/types";

// Admin BH xac nhan hoan tat sau khi NV nop ket qua - rieng huong "doi_moi" BAT BUOC chon cach xu ly
// xac linh kien loi truoc (port dung openXacNhanTraXacModal()). "Yeu cau lam lai" la 1 lua chon thay
// the trong cung modal nay (2 hanh dong doi lap dat canh nhau, giong prototype).

export function XacNhanHoanTatModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(unit.updated_at);
  const needsXuLyXac = unit.huong_xu_ly === "doi_moi";

  // 05/10/2026: neu da chon xu ly xac luc phan loai thi dien san (van doi duoc), khong bat chon lai.
  const [xuLyXac, setXuLyXac] = useState(unit.xu_ly_xac || "");
  const [lyDoCham, setLyDoCham] = useState("");
  const [lamLai, setLamLai] = useState(false);
  const [lyDoLamLai, setLyDoLamLai] = useState("");
  const [busy, setBusy] = useState(false);

  const xacNhan = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${unit.id}/xac-nhan-hoan-tat`, { xu_ly_xac: needsXuLyXac ? xuLyXac : undefined, ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã xác nhận hoàn tất.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const yeuCauLamLai = async () => {
    if (!lyDoLamLai.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${unit.id}/yeu-cau-lam-lai`, { ly_do: lyDoLamLai, ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã yêu cầu NV làm lại.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const validXacNhan = (!needsXuLyXac || xuLyXac) && (!overdue || lyDoCham);
  const validLamLai = lyDoLamLai.trim() && (!overdue || lyDoCham);

  return (
    <Modal title={`Xác nhận hoàn tất — ${unit.id}`} onClose={onClose} maxWidthClass="max-w-md">
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />

        {needsXuLyXac && (
          <Field label="Xử lý xác linh kiện lỗi" required>
            <Select value={xuLyXac} onChange={(e) => setXuLyXac(e.target.value)}>
              <option value="">— Chọn —</option>
              {Object.entries(XU_LY_XAC_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={() => setLamLai((v) => !v)}>{lamLai ? "← Quay lại xác nhận" : "Yêu cầu làm lại"}</Btn>
          {!lamLai && (
            <Btn variant="success" disabled={!validXacNhan || busy} onClick={xacNhan}>
              ✔️ Xác nhận hoàn tất
            </Btn>
          )}
        </div>

        {lamLai && (
          <div className="space-y-3 pt-2 border-t border-[var(--line)]">
            <Field label="Lý do yêu cầu làm lại" required>
              <Textarea rows={3} value={lyDoLamLai} onChange={(e) => setLyDoLamLai(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Btn variant="danger" disabled={!validLamLai || busy} onClick={yeuCauLamLai}>
                Gửi yêu cầu làm lại
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
