import { useLkName } from "../../hooks/useLinhKien";

// 31/10/2026: KTV bao thieu THEO TUNG MON khi nhan hang tra (thung 10 mon chi thieu 1, van dien tu x2 chi
// nhan x1). Moi dong = 1 mon (1 don vi). Mon khong tich = KTV da nhan.
export interface MonTra {
  id: string;
  ma_lk?: string | null;
  khach?: string | null;
}

export function ChonMonThieu({ units, value, onChange }: { units: MonTra[]; value: string[]; onChange: (v: string[]) => void }) {
  const { nameOf } = useLkName();
  const all = value.length === units.length && units.length > 0;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-[var(--ink)]">Tích các món bạn KHÔNG nhận được</p>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5 accent-[var(--red-500)]" checked={all} onChange={() => onChange(all ? [] : units.map((u) => u.id))} />
        Không nhận được cả thùng ({units.length} món)
      </label>
      <div className="max-h-[40vh] space-y-1 overflow-y-auto">
        {units.map((u) => {
          const on = value.includes(u.id);
          return (
            <label
              key={u.id}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${on ? "border-[var(--red-500)] bg-[var(--red-50)]" : "border-[var(--line)] bg-[var(--surface)]"}`}
            >
              <input type="checkbox" className="h-5 w-5 shrink-0 accent-[var(--red-500)]" checked={on} onChange={() => toggle(u.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-[var(--ink)]">{nameOf(u.ma_lk)}</span>
                <span className="block truncate text-xs text-[var(--ink-soft)]">
                  {u.id}
                  {u.khach ? ` · ${u.khach}` : ""}
                </span>
              </span>
              {on && <span className="shrink-0 text-xs font-bold text-[var(--red-700)]">Thiếu</span>}
            </label>
          );
        })}
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        {value.length === 0 ? "Chưa chọn món nào." : `Báo thiếu ${value.length}/${units.length} món — các món còn lại được tính là bạn đã nhận.`}
      </p>
    </div>
  );
}
