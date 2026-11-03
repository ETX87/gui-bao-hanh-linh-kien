import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Textarea } from "../../ui/primitives";

// 03/11/2026: Admin BH lui lai 1 don vi (huy nham / da phan loai nham) khi giai doan sau chua thuc hien.
// Backend: POST /admin/don-vi/:id/hoan-tac {ly_do}.
export function HoanTacModal({
  unitId,
  trangThai,
  quaNv,
  phieuTraId,
  onClose,
  onDone,
}: {
  unitId: string;
  trangThai: string;
  quaNv: boolean;
  phieuTraId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const den = trangThai === "san_sang_gom_phieu_tra" && quaNv ? "Chờ xác nhận hoàn tất" : "Chờ phân loại";
  const moTa =
    trangThai === "ket_thuc_tu_choi" || trangThai === "ket_thuc_chuyen_kho"
      ? "Đơn đã huỷ / chuyển kho sẽ quay về Chờ phân loại, xoá hướng xử lý đã chọn."
      : trangThai === "cho_chan_doan"
        ? "Đơn đang chờ NV sửa sẽ quay về Chờ phân loại. Đề xuất linh kiện đang chờ cấp (nếu có) tự huỷ."
        : quaNv
          ? "Huỷ bước Admin xác nhận hoàn tất — đơn quay về Chờ xác nhận hoàn tất (giữ kết quả của NV)."
          : "Huỷ phân loại — đơn quay về Chờ phân loại, xoá hướng xử lý / loại đối trừ đã chọn.";
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${unitId}/hoan-tac`, { ly_do: lyDo });
      toast(`Đã lùi đơn về ${den}.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Lùi lại đơn ${unitId}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!lyDo.trim() || busy} onClick={submit}>
            ↩ Lùi về {den}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">{moTa}</p>
        {phieuTraId && <p className="text-sm text-[var(--ink-body)]">Đơn sẽ được gỡ khỏi phiếu trả nháp {phieuTraId}.</p>}
        <Field label="Lý do lùi lại" required>
          <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: Huỷ nhầm, chọn sai hướng xử lý…" autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
