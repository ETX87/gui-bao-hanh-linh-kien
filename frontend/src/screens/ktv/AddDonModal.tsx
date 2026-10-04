import { Modal } from "../../ui/Modal";
import { ImagePicker } from "../../ui/ImagePicker";
import { Btn, Field, Input, Select, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { CaseLookupPreviewCard } from "../shared/CaseLookupPreviewCard";
import { useAddDonForm } from "./useAddDonForm";

// KTV them 1 don vao phieu gui (ban desktop - modal can giua) - port dung submitAddDon(). "Loai doi
// tru de xuat" la de xuat ban dau cua KTV (Admin BH xac nhan/co the ghi de lai luc phan loai - port
// dung "Phan hoi vong 4 muc 3"). Logic form dung chung voi AddDonMobileSheet.tsx qua useAddDonForm().

export function AddDonModal({ guiId, ktvEmail, onClose, onDone }: { guiId: string; ktvEmail: string; onClose: () => void; onDone: () => void }) {
  const f = useAddDonForm(guiId, onDone, ktvEmail);

  return (
    <Modal
      title="Thêm đơn bảo hành"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!f.valid || f.busy} onClick={f.submit}>
            Thêm vào phiếu
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mã case" required>
          <Input value={f.caseId} onChange={(e) => f.setCaseId(e.target.value)} placeholder="Mã case bên hệ thống CRM/DVBH" />
        </Field>
        <CaseLookupPreviewCard caseId={f.caseId} maLk={f.maLk} linhKien={f.linhKien} ktvEmail={f.ktvEmail} onValidityChange={f.setCaseValid} />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Linh kiện lỗi">
              <SearchableSelect options={f.linhKien.map((lk) => ({ value: lk.ma_lk, label: lk.ten_lk }))} value={f.maLk} onChange={f.setMaLk} />
            </Field>
          </div>
          <Field label="Số lượng" required>
            <Input type="number" min={1} value={f.soLuong} onChange={(e) => f.setSoLuong(e.target.value)} />
          </Field>
        </div>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={3} value={f.moTa} onChange={(e) => f.setMoTa(e.target.value)} />
        </Field>
        <Field label="Loại đối trừ đề xuất">
          <Select value={f.loaiDoiTru} onChange={(e) => f.setLoaiDoiTru(e.target.value)}>
            {Object.entries(LOAI_DOI_TRU_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ảnh linh kiện lỗi (tuỳ chọn)">
          <ImagePicker onChange={f.setAnhFiles} />
        </Field>
      </div>
    </Modal>
  );
}
