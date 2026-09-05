import { createPortal } from "react-dom";
import { Btn, Field, Input, Select, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { CaseLookupPreviewCard } from "../shared/CaseLookupPreviewCard";
import { useAddDonForm } from "./useAddDonForm";

// Man "Them don bao hanh" RIENG cho mobile - port dung 7 nguyen tac da chot o vong redesign UI
// (22/08/2026, TaoDonMobileScreen cua prototype), gap that phat hien o "QA vong 3" (Giai doan 4 chi
// dung Modal chung, khong co ban rieng nay): phu toan man hinh that (position:fixed;inset:0), chieu
// cao 100dvh (tru dung phan ban phim che, khac 100vh), nut +/- so luong 44x44px, nhan luon nam TREN o
// nhap (Field da lam san), thanh CTA dinh day co padding-bottom:env(safe-area-inset-bottom), input
// anh co capture="environment" goi y mo thang camera. Dung CHUNG 1 bo state + submit voi AddDonModal
// (desktop) qua useAddDonForm() - khong co 2 nguon su that.

export function AddDonMobileSheet({ guiId, ktvEmail, onClose, onDone }: { guiId: string; ktvEmail: string; onClose: () => void; onDone: () => void }) {
  const f = useAddDonForm(guiId, onDone, ktvEmail);

  // Dung functional updater (khong doc f.soLuong tu closure) - 2 lan bam lien tiep (double-tap
  // that tren dien thoai) co the roi vao CUNG 1 dot batch cua React 18, khien ca 2 handler doc chung
  // 1 gia tri "cu" trong closure neu tinh truc tiep tu f.soLuong => chi tang dung 1 lan thay vi 2.
  const stepSoLuong = (delta: number) => {
    f.setSoLuong((prev) => String(Math.max(1, (Number(prev) || 1) + delta)));
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-[var(--surface)] flex flex-col" style={{ height: "100dvh" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)] shrink-0">
        <h3 className="font-display font-bold text-base text-[var(--ink-900)] flex-1">Thêm đơn bảo hành</h3>
        <button onClick={onClose} className="focus-ring w-9 h-9 rounded-lg flex items-center justify-center text-[var(--ink-500)] hover:bg-[var(--surface-100)]">
          ✕
        </button>
      </div>

      <div className="px-4 py-4 overflow-y-auto flex-1 space-y-4">
        <Field label="Mã case" required>
          <Input value={f.caseId} onChange={(e) => f.setCaseId(e.target.value)} placeholder="Mã case bên hệ thống CRM/DVBH" />
        </Field>
        <CaseLookupPreviewCard caseId={f.caseId} maLk={f.maLk} linhKien={f.linhKien} ktvEmail={f.ktvEmail} onValidityChange={f.setCaseValid} />
        <Field label="Linh kiện lỗi">
          <SearchableSelect options={f.linhKien.map((lk) => ({ value: lk.ma_lk, label: lk.ten_lk }))} value={f.maLk} onChange={f.setMaLk} />
        </Field>
        <Field label="Số lượng" required>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepSoLuong(-1)}
              className="focus-ring w-11 h-11 shrink-0 rounded-lg border border-[var(--line)] bg-white text-lg font-bold text-[var(--ink-700)] flex items-center justify-center"
            >
              −
            </button>
            <Input type="number" min={1} value={f.soLuong} onChange={(e) => f.setSoLuong(e.target.value)} className="text-center flex-1" />
            <button
              type="button"
              onClick={() => stepSoLuong(1)}
              className="focus-ring w-11 h-11 shrink-0 rounded-lg border border-[var(--line)] bg-white text-lg font-bold text-[var(--ink-700)] flex items-center justify-center"
            >
              +
            </button>
          </div>
        </Field>
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
          <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => f.setAnhFiles(e.target.files)} className="text-sm" />
        </Field>
      </div>

      <div className="px-4 py-3 border-t border-[var(--line)] shrink-0 flex gap-2" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <Btn onClick={onClose} className="flex-1">
          Huỷ
        </Btn>
        <Btn variant="primary" disabled={!f.valid || f.busy} onClick={f.submit} className="flex-[2]">
          Thêm vào phiếu
        </Btn>
      </div>
    </div>,
    document.body,
  );
}
