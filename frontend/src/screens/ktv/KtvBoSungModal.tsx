import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { ImagePicker } from "../../ui/ImagePicker";
import { fileToDataUrl } from "../../lib/format";
import { useLinhKien, lkOptions } from "../../hooks/useLinhKien";
import { LY_DO_BO_SUNG_OPTIONS } from "../../lib/constants";
import type { DonVi } from "../../lib/types";

// KTV bo sung thong tin theo yeu cau Admin BH - port dung openBoSungModal(): hien ro ly do Admin da
// yeu cau + cho doi ca linh kien (khong chi sua mo ta) - port dung "Phan hoi vong 4 muc 1".

export function KtvBoSungModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const [moTa, setMoTa] = useState(unit.mo_ta_loi || "");
  const [maLk, setMaLk] = useState(unit.ma_lk || "");
  const [anhFiles, setAnhFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const lyDoRaw = unit.ly_do_bo_sung || "";
  const lyDoCode = lyDoRaw.split(":")[0];
  const lyDoLabel = LY_DO_BO_SUNG_OPTIONS.find((o) => o.value === lyDoCode)?.label || lyDoCode;

  const submit = async () => {
    setBusy(true);
    try {
      const anh = anhFiles && anhFiles.length > 0 ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      await api.patch(`/phieu-gui/don-vi/${unit.id}/bo-sung`, { mo_ta_loi: moTa, ma_lk: maLk, anh });
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
        <p className="rounded-lg bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-bold px-3 py-2">Admin bảo hành yêu cầu bổ sung: {lyDoLabel}{lyDoRaw.includes(":") ? ` — ${lyDoRaw.split(":").slice(1).join(":").trim()}` : ""}</p>
        <Field label="Linh kiện lỗi">
          <SearchableSelect options={lkOptions(linhKien)} value={maLk} onChange={setMaLk} />
        </Field>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </Field>
        <Field label="Ảnh chụp lại (tuỳ chọn)">
          <ImagePicker onChange={setAnhFiles} compact />
        </Field>
      </div>
    </Modal>
  );
}
