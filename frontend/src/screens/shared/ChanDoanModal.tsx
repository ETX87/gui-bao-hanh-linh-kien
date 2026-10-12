import { useEffect, useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select } from "../../ui/primitives";
import { KET_QUA_NV_OPTIONS } from "../../lib/constants";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DeXuatLk, DonVi } from "../../lib/types";

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
  // 12/10/2026: de xuat linh kien con "cho cap" se tu huy khi nop ket qua - bao truoc cho NV.
  const [soChoCap, setSoChoCap] = useState(0);
  useEffect(() => {
    api
      .get<{ de_xuat: DeXuatLk[] }>(`/de-xuat/don-vi/${unit.id}`)
      .then((r) => setSoChoCap(r.de_xuat.filter((d) => d.trang_thai === "cho_cap").length))
      .catch(() => undefined);
  }, [unit.id]);

  const submit = async () => {
    setBusy(true);
    try {
      const [anh_truoc, anh_sau, anh_loi_thuc_te] = await Promise.all([filesToDataUrls(anhTruoc), filesToDataUrls(anhSau), filesToDataUrls(anhLoi)]);
      await api.post(`/nv/don-vi/${unit.id}/chan-doan`, { ket_qua_chan_doan: ketQua, anh_truoc, anh_sau, anh_loi_thuc_te, ly_do_cham: overdue ? lyDoCham : undefined });
      toast("Đã nộp kết quả sửa chữa.", "ok");
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
      title={`Nộp kết quả sửa chữa — ${unit.id}`}
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
        <Field label="Kết quả" required>
          <Select value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            <option value="">— Chọn —</option>
            {KET_QUA_NV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {soChoCap > 0 && (
          <p className="rounded-lg bg-[var(--amber-100)] px-3 py-2 text-xs font-semibold text-[var(--amber-800)]">
            Còn {soChoCap} đề xuất linh kiện chưa được cấp — nộp kết quả sẽ tự huỷ các đề xuất này.
          </p>
        )}
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
