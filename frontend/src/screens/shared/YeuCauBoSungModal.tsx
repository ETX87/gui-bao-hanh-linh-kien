import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { LY_DO_BO_SUNG_OPTIONS } from "../../lib/constants";

// Admin BH gui yeu cau bo sung thong tin cho KTV - ap dung cho MOI don vi cua don cha dang
// "cho_phan_loai" (port dung openYeuCauBoSungModal()).

export function YeuCauBoSungModal({ parentId, onClose, onDone }: { parentId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ so_don_vi: number }>(`/admin/don-cha/${parentId}/yeu-cau-bo-sung`, { ly_do: lyDo, ghi_chu: ghiChu });
      toast(`Đã gửi yêu cầu bổ sung cho ${r.so_don_vi} đơn vị.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Yêu cầu KTV bổ sung thông tin"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!lyDo || busy} onClick={submit}>
            Gửi yêu cầu
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Lý do" required>
          <Select value={lyDo} onChange={(e) => setLyDo(e.target.value)}>
            <option value="">— Chọn lý do —</option>
            {LY_DO_BO_SUNG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú thêm">
          <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Mô tả cụ thể cần KTV bổ sung gì..." />
        </Field>
      </div>
    </Modal>
  );
}
