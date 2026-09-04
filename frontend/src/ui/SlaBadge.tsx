import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import { fmtHours, hoursSince, slaLevel } from "../lib/format";
import { useToast } from "./Toast";
import { Modal } from "./Modal";
import { Btn, Field, Select } from "./primitives";
import type { LogEntityType } from "../lib/types";
import { useLyDoCham } from "../hooks/useSettings";

// Badge SLA - 3 muc (<=24h xanh la / 24-72h vang / >72h do dac+icon, port dung slaBadge() cua
// prototype, da bo chu "Qua han" chi con so gio). Khi truyen du entityType+entityId (mo cho vai tro
// xu ly, KHONG mo cho KTV/View - xem CLAUDE.md "Nut thao tac nhanh...") va dang qua han, badge bam
// duoc de ghi ly do cham NGAY (doc lap, khong doi trang thai) - port dung
// openQuickLyDoChamModal()/submitQuickLyDoCham().

export function SlaBadge({ since, entityType, entityId, clickable }: { since: string | null | undefined; entityType?: LogEntityType; entityId?: string; clickable?: boolean }) {
  const [open, setOpen] = useState(false);
  const level = slaLevel(since);
  const overdue = hoursSince(since) > 24;
  const canClick = clickable && overdue && entityType && entityId;

  const cls =
    level === "critical"
      ? "bg-[var(--coral-600)] text-white"
      : level === "warn"
        ? "bg-[var(--amber-100)] text-[var(--amber-700)]"
        : "bg-[var(--teal-100)] text-[var(--teal-700)]";

  const badge = (
    <span
      title={overdue ? "Đã quá hạn SLA 24h" : "Trong hạn SLA"}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${cls} ${canClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={canClick ? (e) => { e.stopPropagation(); setOpen(true); } : undefined}
    >
      {level === "critical" && "⚠ "}
      {fmtHours(since)}
    </span>
  );

  return (
    <>
      {badge}
      {open && entityType && entityId && <QuickLyDoChamModal entityType={entityType} entityId={entityId} onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickLyDoChamModal({ entityType, entityId, onClose }: { entityType: LogEntityType; entityId: string; onClose: () => void }) {
  const toast = useToast();
  const { items: lyDoCham } = useLyDoCham();
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!val) return;
    setBusy(true);
    try {
      await api.post(`/logs/${entityType}/${entityId}/ly-do-cham`, { ly_do_cham: val });
      toast("Đã ghi lý do chậm.", "ok");
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Ghi lý do chậm" onClose={onClose} maxWidthClass="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-[var(--ink-600)]">Đơn này đang quá hạn SLA 24h. Ghi nhận lý do chậm — không thay đổi trạng thái đơn.</p>
        <Field label="Lý do chậm" required>
          <Select value={val} onChange={(e) => setVal(e.target.value)}>
            <option value="">— Chọn lý do —</option>
            {lyDoCham.map((l) => (
              <option key={l.id} value={l.noi_dung}>
                {l.noi_dung}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!val || busy} onClick={submit}>
            Lưu
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
