import { buocOf } from "../../lib/buoc";
import { useDangDung } from "../../hooks/useDangDung";

// 16/11/2026: chip loc theo BUOC DANG DUNG cho man gop nhieu buoc trong 1 tab (VD tab "Chờ phân loại" = buoc 4 / 5 / 5B).
// Moi chip: so buoc + ten + so don dang dung (+ so qua SLA do). value = giai_doan dang chon ("" = tat ca).
export function BuocChips({ gds, value, onChange, nhan }: { gds: string[]; value: string; onChange: (gd: string) => void; nhan?: Record<string, string> }) {
  const dd = useDangDung(true);
  const chip = (gd: string, label: string, tong: number, qua: number) => {
    const on = value === gd;
    return (
      <button
        key={gd || "all"}
        type="button"
        onClick={() => onChange(gd)}
        className={`focus-ring shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
          on ? "bg-[var(--ink)] text-white border-[var(--ink)]" : "bg-white border-[var(--line-strong)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"
        }`}
      >
        {label}
        {tong > 0 && <span className={`tabular-nums ${on ? "text-white/80" : "text-[var(--ink-soft)]"}`}>{tong}</span>}
        {qua > 0 && <span className={`px-1 rounded-full text-[10.5px] font-bold ${on ? "bg-white text-[var(--red-700)]" : "bg-[var(--red-600)] text-white"}`}>⏰{qua}</span>}
      </button>
    );
  };
  const tong = dd.of(gds);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
      <span className="shrink-0 text-xs text-[var(--ink-soft)]">Bước đang dừng:</span>
      {chip("", "Tất cả", tong.tong, tong.qua_han)}
      {gds.map((gd) => {
        const b = buocOf(gd);
        const r = dd.of([gd]);
        return chip(gd, `${b?.so ?? ""} · ${nhan?.[gd] ?? b?.ten ?? gd}`, r.tong, r.qua_han);
      })}
    </div>
  );
}
