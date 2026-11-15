import { Field, Select } from "../../ui/primitives";
import { useLyDoCham } from "../../hooks/useSettings";
import { isOverdue } from "../../lib/format";
import { buocOf, lyDoHopBuoc } from "../../lib/buoc";

// Truong "Ly do cham" - chi hien khi doi tuong dang qua han SLA 24h, dat O DAU form (port dung QA
// 31/08/2026 diem #4: chuyen banner/truong SLA len dau thay vi cuoi cung). Dung chung cho moi form co
// cong SLA (tiep nhan/phan loai/xac nhan hoan tat/chan doan/yeu cau lam lai/FAST actions...).

export function useSlaGate(since: string | null | undefined, gd?: string | null) {
  return isOverdue(since, gd);
}

// 16/11/2026: gd = buoc dang dung -> chi hien ly do hop buoc + goi y loi hay gap.
export function LyDoChamGateField({ overdue, value, onChange, gd }: { overdue: boolean; value: string; onChange: (v: string) => void; gd?: string | null }) {
  const items = lyDoHopBuoc(useLyDoCham().items, gd);
  const b = buocOf(gd);
  if (!overdue) return null;
  return (
    <div className="rounded-lg border border-[var(--red-500)] bg-[var(--red-100)] p-3">
      <p className="text-xs font-bold text-[var(--red-700)] mb-2">⚠ Bước này đã quá SLA — vui lòng chọn lý do chậm (giải trình) để tiếp tục.</p>
      <Field label="Lý do chậm" required>
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Chọn lý do —</option>
          {items.map((l) => (
            <option key={l.id} value={l.noi_dung}>
              {l.noi_dung}
            </option>
          ))}
        </Select>
      </Field>
      {b && b.loi.length > 0 && <p className="mt-1 text-[11px] text-[var(--ink-soft)]">Lỗi hay gặp ở bước {b.so}: {b.loi.join(" · ")}</p>}
    </div>
  );
}
