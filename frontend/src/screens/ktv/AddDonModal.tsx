import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { useLinhKien } from "../../hooks/useLinhKien";
import { CaseLookupPreviewCard } from "../shared/CaseLookupPreviewCard";

// KTV them 1 don vao phieu gui - port dung submitAddDon(). "Loai doi tru de xuat" la de xuat ban dau
// cua KTV (Admin BH xac nhan/co the ghi de lai luc phan loai - port dung "Phan hoi vong 4 muc 3").

export function AddDonModal({ guiId, onClose, onDone }: { guiId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const [caseId, setCaseId] = useState("");
  const [maLk, setMaLk] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [moTa, setMoTa] = useState("");
  const [loaiDoiTru, setLoaiDoiTru] = useState("doi_tra");
  const [busy, setBusy] = useState(false);

  const valid = moTa.trim() && Number(soLuong) >= 1;

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/phieu-gui/${guiId}/don`, {
        case_id: caseId.trim() || null,
        ma_lk: maLk || null,
        so_luong_khai: Number(soLuong),
        mo_ta_loi: moTa.trim(),
        loai_doi_tru_de_xuat: loaiDoiTru,
      });
      toast("Đã thêm đơn vào phiếu.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Thêm đơn bảo hành"
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Thêm vào phiếu
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Mã case (nếu có)">
          <Input value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Mã case bên hệ thống CRM/DVBH" />
        </Field>
        <CaseLookupPreviewCard caseId={caseId} maLk={maLk} linhKien={linhKien} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Linh kiện lỗi">
            <SearchableSelect options={linhKien.map((lk) => ({ value: lk.ma_lk, label: lk.ten_lk }))} value={maLk} onChange={setMaLk} />
          </Field>
          <Field label="Số lượng" required>
            <Input type="number" min={1} value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
          </Field>
        </div>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </Field>
        <Field label="Loại đối trừ đề xuất">
          <Select value={loaiDoiTru} onChange={(e) => setLoaiDoiTru(e.target.value)}>
            {Object.entries(LOAI_DOI_TRU_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
