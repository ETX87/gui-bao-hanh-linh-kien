import { useRoute } from "../router/Router";
import { routesForUser } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import type { AppUser } from "../lib/types";

// Sidebar - danh sach man hinh theo vai tro, huy hieu so viec can lam tren tung muc (dung
// WorkloadCounts). O mobile (<768px) an han, thay bang thanh chon man hinh ngang cuon duoc trong
// TopBar (don gian hoa so voi bottom-nav/drawer day du cua prototype - du dung cho 1 Worker doc lap
// moi, co the nang cap sau neu can).

export function Sidebar({ user }: { user: AppUser }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-gradient-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] border-r border-[var(--line)] py-4">
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = path === it.hash;
          const count = it.workloadKey ? counts[it.workloadKey] : 0;
          return (
            <button
              key={it.hash}
              onClick={() => nav(it.hash)}
              title={it.label}
              className={`focus-ring w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-[var(--sidebar-highlight)] text-[var(--ocean-800)]" : "text-[var(--sidebar-ink-mid)] hover:bg-[var(--surface-100)]"
              }`}
            >
              <span className="text-base leading-none">{it.icon}</span>
              <span className="flex-1 text-left truncate">{it.label}</span>
              {count > 0 && <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--coral-600)] text-white text-[10px] font-bold flex items-center justify-center">{count}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNavStrip({ user }: { user: AppUser }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);
  return (
    <div className="md:hidden flex gap-1.5 overflow-x-auto px-3 py-2 bg-[var(--surface)] border-b border-[var(--line)] scrollbar-thin">
      {items.map((it) => {
        const active = path === it.hash;
        const count = it.workloadKey ? counts[it.workloadKey] : 0;
        return (
          <button
            key={it.hash}
            onClick={() => nav(it.hash)}
            className={`focus-ring relative shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              active ? "bg-[var(--ocean-800)] text-white" : "bg-[var(--surface-100)] text-[var(--ink-600)]"
            }`}
          >
            <span>{it.icon}</span>
            <span>{it.label}</span>
            {count > 0 && <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--coral-600)] text-white text-[9px] font-bold flex items-center justify-center">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
