import { useState, type ReactNode } from "react";
import { fmtDate } from "../../lib/format";
import type { LogRow } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Nhat ky gop 4 nguon (10/10/2026, thiet ke lai UI chi tiet don bao hanh): truoc day 4 hop log rieng
// xep luoi 2 cot - hop it dong de trong 1 vung lon. Nay 1 dong thoi gian duy nhat (moi nhat len dau),
// moi dong co the nguon; VAN tach duoc tung nguon qua tab loc (giu y "tach thanh cac mang du lieu rieng
// biet, co vung hien log rieng" da chot 02/09/2026).

export interface LogSource {
  key: string;
  label: string;
  icon: string;
  logs: LogRow[];
}

export function LogTimeline({ sources, className = "", footer, alwaysTabs = [] }: { sources: LogSource[]; className?: string; footer?: (tab: string) => ReactNode; alwaysTabs?: string[] }) {
  // alwaysTabs: nguon luon co tab ke ca khi rong (VD "Trao doi" de bat dau viet).
  const present = sources.filter((s) => s.logs.length > 0 || alwaysTabs.includes(s.key));
  const [tab, setTab] = useState<string>("all");
  const all = present.flatMap((s) => s.logs.map((l) => ({ ...l, _src: s })));
  const shown = (tab === "all" ? all : all.filter((l) => l._src.key === tab)).sort((a, b) => (b.thoi_gian > a.thoi_gian ? 1 : b.thoi_gian < a.thoi_gian ? -1 : b.id - a.id));

  const tabCls = (on: boolean) =>
    `focus-ring shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${on ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]"}`;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {present.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        <button className={tabCls(tab === "all")} onClick={() => setTab("all")}>
          Tất cả · {all.length}
        </button>
        {present.map((s) => (
          <button key={s.key} className={tabCls(tab === s.key)} onClick={() => setTab(s.key)} title={s.label}>
            {s.icon} {s.label} · {s.logs.length}
          </button>
        ))}
      </div>
      )}
      {shown.length === 0 ? (
        <p className="text-xs text-[var(--ink-faint)] py-2">{tab === "all" ? "Chưa có nhật ký." : "Chưa có mục nào."}</p>
      ) : (
        <ol className="relative flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin">
          {shown.map((l) => (
            <li key={`${l._src.key}-${l.id}`} className="relative pl-5 pb-3 last:pb-0">
              <span className="absolute left-[5px] top-2 bottom-0 w-px bg-[var(--line)]" />
              <span className="absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-white bg-[var(--brand-500)] shadow-[0_0_0_1px_var(--brand-200)]" />
              <p className="text-[13px] leading-snug text-[var(--ink-body)]">{l.ghi_chu || `${l.tu_trang_thai ?? "—"} → ${l.den_trang_thai ?? "—"}`}</p>
              <p className="mt-0.5 text-[11px] text-[var(--ink-faint)]">
                <span title={l._src.label}>{l._src.icon}</span> <UserName email={l.nguoi_thuc_hien} /> · <span className="font-mono">{fmtDate(l.thoi_gian)}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
      {footer?.(tab)}
    </div>
  );
}
