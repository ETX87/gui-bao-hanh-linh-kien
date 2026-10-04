import { useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select } from "../../ui/primitives";
import { KET_QUA_CHAN_DOAN_LABELS } from "../../lib/constants";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DonVi } from "../../lib/types";

// NV nop ket qua chan doan - anh truoc/sau/loi thuc te luu base64 data URL truc tiep (KHONG dung R2 -
// quyet dinh da chot cho he nay). Anh KHONG bat buoc (form goc chua tung danh dau bat buoc - xem
// CLAUDE.md muc QA 31/08/2026, con lai la cau hoi nghiep vu chua chot).

async function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(Array.from(files).map(fileToDataUrl));
}

export function ChanDoanModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(unit.updated_at);
  const [ketQua, setKetQua] = useState("");
  const [anhTruoc, setAnhTruoc] = useState<FileList | null>(null);
  const [anhSau, setAnhSau] = useState<FileList | null>(null);
  const [anhLoi, setAnhLoi] = useState<FileList | null>(null);
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const [anh_truoc, anh_sau, anh_loi_thuc_te] = await Promise.all([filesToDataUrls(anhTruoc), filesToDataUrls(anhSau), filesToDataUrls(anhLoi)]);
      await api.post(`/nv/don-vi/${unit.id}/chan-doan`, { ket_qua_chan_doan: ketQua, anh_truoc, anh_sau, anh_loi_thuc_te, ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã nộp kết quả chẩn đoán.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const valid = ketQua && (!overdue || lyDoCham);

  return (
    <Modal
      title={`Chẩn đoán — ${unit.id}`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Nộp kết quả
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        <Field label="Kết quả chẩn đoán" required>
          <Select value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            <option value="">— Chọn —</option>
            {Object.entries(KET_QUA_CHAN_DOAN_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Ảnh trước sửa">
            <ImagePicker compact onChange={setAnhTruoc} />
          </Field>
          <Field label="Ảnh sau sửa">
            <ImagePicker compact onChange={setAnhSau} />
          </Field>
          <Field label="Ảnh lỗi thực tế">
            <ImagePicker compact onChange={setAnhLoi} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
