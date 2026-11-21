import { Modal } from "../../ui/Modal";
import { UploadBar, uploadBtnText } from "../../ui/UploadBar";
import { ImagePicker } from "../../ui/ImagePicker";
import { Btn, Field, Input, Select, Textarea } from "../../ui/primitives";
import { LkDaDatNote } from "../shared/LkDaDatNote";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { CaseIdField } from "../shared/CaseLookupPreviewCard";
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
          {f.lyDoKhoa && !f.busy && <span className="mr-auto text-xs font-semibold text-[var(--amber-800)]">⚠ {f.lyDoKhoa}</span>}
          {f.tienDo && <UploadBar p={f.tienDo} className="mr-auto w-64" />}
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!f.valid || f.busy} onClick={f.submit}>
            {uploadBtnText(f.busy, f.tienDo, "Thêm vào phiếu")}
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <CaseIdField
          label="Mã yêu cầu (case SC… hoặc mã Lada)"
          required
          placeholder="VD: SC2611200123 hoặc D1154680"
          caseId={f.caseId}
          setCaseId={f.setCaseId}
          maLk={f.maLk}
          linhKien={f.linhKien}
          ktvEmail={f.ktvEmail}
          onValidityChange={f.setCaseValid}
          allowOverride={f.allowOverride}
          override={f.override}
          onOverrideChange={f.setOverride}
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Linh kiện lỗi">
              <SearchableSelect options={f.lkOpts} value={f.maLk} onChange={f.setMaLk} />
          <LkDaDatNote n={f.lkDaDat.length} />
              {f.trung && (
                <p className="mt-1 rounded-lg border border-[var(--red-200)] bg-[var(--red-50)] px-2 py-1.5 text-xs font-semibold text-[var(--red-600)]">
                  ⛔ Mã case này đã có đơn {f.trung.id}{f.trung.phieu_gui_id ? ` (thùng ${f.trung.phieu_gui_id})` : ""} cùng linh kiện — không thể tạo trùng. Chỉ tạo lại được khi đơn cũ bị từ chối / huỷ.
                </p>
              )}
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
