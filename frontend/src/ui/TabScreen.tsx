import { useEffect } from "react";
import { useRoute } from "../router/Router";
import { useWorkload, type WorkloadCounts } from "../hooks/useWorkload";
import type { AppUser } from "../lib/types";

// 31/10/2026 ("gộp các màn có chức năng tương tự ... chỉ tập trung vào 1 số giao diện chính và tái sử dụng
// cho các vai trò"): khung dung chung cho 4 man chinh (Thung hang / Don bao hanh / Phieu tra / Quan tri).
// Moi man = 1 tap tab theo giai doan; moi tab tu khai bao vai tro nao thay + hang doi nao dem so viec.
// Tab dang mo nam tren URL (#/phieu-tra?tab=cho_kt) -> link / F5 / nut Back giu dung tab. Khong co ?tab thi
// mo tab dau tien CO VIEC cua vai tro, khong co viec thi tab dau tien vai tro duoc thay.

export interface TabDef {
  key: string;
  label: string;
  show: (u: AppUser) => boolean;
  countKeys?: (keyof WorkloadCounts)[];
  hint?: string; // mo ta ngan (tooltip)
  render: () => React.ReactNode;
}

export function visibleTabs(tabs: TabDef[], u: AppUser): TabDef[] {
  return tabs.filter((t) => t.show(u));
}

export function TabScreen({ user, tabs, title }: { user: AppUser; tabs: TabDef[]; title: string }) {
  const { path, query, nav } = useRoute();
  const { counts } = useWorkload();
  const vis = visibleTabs(tabs, user);
  const countOf = (t: TabDef) => (t.countKeys ?? []).reduce((s, k) => s + (counts[k] ?? 0), 0);
  const want = query.get("tab") || "";
  const active = vis.find((t) => t.key === want) ?? vis.find((t) => countOf(t) > 0) ?? vis[0];

  // Giu cac tham so khac tren URL (vd ?trang_thai= cua Tra cuu) khi doi tab thi bo di.
  const go = (key: string) => nav(`${path}?tab=${key}`);
  // Chua co ?tab (vd bam menu) -> ghi tab mac dinh len URL de F5 / chia se link giu dung tab.
  useEffect(() => {
    if (active && want !== active.key && !vis.some((t) => t.key === want)) {
      const qs = new URLSearchParams(query);
      qs.set("tab", active.key);
      window.location.replace(`#${path}?${qs.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key, want, path]);

  if (!active) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-base md:text-[15px] font-bold text-[var(--ink)] shrink-0">{title}</h2>
        {vis.length > 1 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-thin -mx-1 px-1 max-w-full" role="tablist">
            {vis.map((t) => {
              const n = countOf(t);
              const on = t.key === active.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  title={t.hint || t.label}
                  onClick={() => go(t.key)}
                  className={`focus-ring shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] md:text-xs font-semibold border whitespace-nowrap ${
                    on ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {t.label}
                  {n > 0 && (
                    <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-extrabold flex items-center justify-center ${on ? "bg-white text-[var(--accent-ink)]" : "bg-[var(--red-600)] text-white"}`}>{n}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div key={active.key}>{active.render()}</div>
    </div>
  );
}
