import { fmtDate } from "../../lib/format";
import type { LogRow } from "../../lib/types";

// 1 khoi log rieng biet (tieu de + so dem rieng, sort moi nhat len dau) - port dung renderLogBlock()/
// sortLogsDesc() cua prototype: 4 nguon (don vi/don cha/phieu gui/phieu tra) hien tach roi, KHONG gop
// chung 1 danh sach.

export function LogBlock({ title, logs }: { title: string; logs: LogRow[] }) {
  if (logs.length === 0) return null;
  const sorted = [...logs].sort((a, b) => new Date(b.thoi_gian).getTime() - new Date(a.thoi_gian).getTime());
  return (
    <div>
      <p className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-wide mb-2">
        {title} ({logs.length})
      </p>
      <div className="max-h-48 overflow-y-auto space-y-1.5 scrollbar-thin">
        {sorted.map((l) => (
          <div key={l.id} className="text-xs bg-[var(--surface-2)] rounded-lg px-2.5 py-1.5">
            <p className="text-[var(--ink-body)]">{l.ghi_chu || `${l.tu_trang_thai ?? "—"} → ${l.den_trang_thai ?? "—"}`}</p>
            <p className="mt-0.5 text-[10px] text-[var(--ink-faint)] font-mono">
              {l.nguoi_thuc_hien} · {fmtDate(l.thoi_gian)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
