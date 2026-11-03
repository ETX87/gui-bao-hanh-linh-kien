import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useLinhKien, lkOptions } from "../../hooks/useLinhKien";

// 03/11/2026: Admin BH doi linh kien B (thuc te gui ve) va/hoac C (doi moi) cho nhieu don vi 1 lan.
// Moi linh kien co 3 lua chon: giu nguyen tung don / doi sang ma moi / bo ve mac dinh (B = A, C = B).
type Mode = "giu" | "doi" | "bo";

function LkPick({ label, mode, setMode, ma, setMa, boLabel }: { label: string; mode: Mode; setMode: (m: Mode) => void; ma: string; setMa: (v: string) => void; boLabel: string }) {
  const { items } = useLinhKien();
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-3 text-sm mb-1.5">
        {(
          [
            ["giu", "Giữ nguyên"],
            ["doi", "Đổi sang"],
            ["bo", boLabel],
          ] as [Mode, string][]
        ).map(([k, l]) => (
          <label key={k} className="flex items-center gap-1 cursor-pointer">
            <input type="radio" checked={mode === k} onChange={() => setMode(k)} />
            {l}
          </label>
        ))}
      </div>
      {mode === "doi" && <SearchableSelect options={lkOptions(items)} value={ma} onChange={setMa} placeholder="Chọn linh kiện" />}
    </Field>
  );
}

export function BulkDoiLinhKienModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [mB, setMB] = useState<Mode>("doi");
  const [b, setB] = useState("");
  const [mC, setMC] = useState<Mode>("giu");
  const [cc, setC] = useState("");
  const [busy, setBusy] = useState(false);
  const val = (m: Mode, v: string) => (m === "giu" ? undefined : m === "bo" ? "" : v);
  const valid = (mB !== "giu" || mC !== "giu") && (mB !== "doi" || !!b) && (mC !== "doi" || !!cc);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/admin/don-vi/linh-kien-hang-loat", { ids, ma_lk_nhan: val(mB, b), ma_lk_thuc_te: val(mC, cc) });
      toast(r.loi.length ? `Đã đổi ${r.ok}, ${r.loi.length} lỗi (${r.loi.map((x) => x.id).join(", ")}).` : `Đã đổi linh kiện cho ${r.ok} đơn.`, r.loi.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Đổi linh kiện hàng loạt — ${ids.length} đơn`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Đổi linh kiện {ids.length} đơn
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">Linh kiện KTV chọn (A) giữ nguyên. Mỗi thay đổi được ghi nhật ký từng đơn.</p>
        <LkPick label="Linh kiện thực tế gửi về (B)" mode={mB} setMode={setMB} ma={b} setMa={setB} boLabel="Bỏ (= LK KTV chọn)" />
        <LkPick label="Linh kiện đổi mới (C)" mode={mC} setMode={setMC} ma={cc} setMa={setC} boLabel="Bỏ (= LK gửi về)" />
      </div>
    </Modal>
  );
}
