import { useRoute } from "../router/Router";
import { routesForUser } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import { APP_VERSION } from "../lib/version";
import type { AppUser } from "../lib/types";

// Sidebar - danh sach man hinh theo vai tro, huy hieu so viec can lam tren tung muc (dung
// WorkloadCounts). Port dung renderSidebar() cua prototype-html (yeu cau 03/09/2026): mac dinh THU
// GON (72px, chi icon), bam nut o day de mo rong (248px, hien nhan), khi thu gon huy hieu so viec
// chuyen thanh 1 cham nho o goc icon (nhu icon app dien thoai bao tin nhan chua doc) thay vi an het.
// State collapsed nam o Shell.tsx (dieu khien luon do rong noi dung <main> gian ra tuong ung, giong
// `body.sidebar-collapsed .wrap{max-width:1440px}` cua ban goc) - Sidebar chi nhan qua props.

export function Sidebar({ user, collapsed, onToggle }: { user: AppUser; collapsed: boolean; onToggle: () => void }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);

  return (
    <aside className={`hidden md:flex ${collapsed ? "w-[72px]" : "w-56"} shrink-0 flex-col bg-gradient-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] border-r border-[var(--line)] py-4 transition-[width] duration-150`}>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {items.map((it) => {
          const active = path === it.hash;
          const count = it.workloadKey ? counts[it.workloadKey] : 0;
          const itemClassName = `focus-ring relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            active ? "bg-[var(--sidebar-highlight)] text-[var(--ocean-800)]" : "text-[var(--sidebar-ink-mid)] hover:bg-[var(--surface-100)]"
          }`;
          const itemContent = (
            <>
              <span className="relative text-base leading-none shrink-0">
                {it.icon}
                {collapsed && count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-[var(--coral-600)] text-white text-[8px] font-bold flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              {!collapsed && <span className="flex-1 text-left truncate">{it.label}</span>}
              {!collapsed && count > 0 && (
                <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--coral-600)] text-white text-[10px] font-bold flex items-center justify-center">{count > 99 ? "99+" : count}</span>
              )}
            </>
          );
          // Muc "href" (lien ket ra ngoai, xem routes.ts) - dung <a> chuan de trinh duyet tu dieu
          // huong "mượt" sang app khac, giu nguyen tab hien tai (khong target=_blank).
          if (it.href) {
            return (
              <a key={it.hash} href={it.href} title={it.label} className={itemClassName}>
                {itemContent}
              </a>
            );
          }
          return (
            <button key={it.hash} onClick={() => nav(it.hash)} title={`${it.label}${count > 0 ? ` (${count} việc cần làm)` : ""}`} className={itemClassName}>
              {itemContent}
            </button>
          );
        })}
      </nav>
      <button onClick={onToggle} className="focus-ring mx-2 mt-1 rounded-lg px-2 py-2 text-xs font-semibold text-[var(--sidebar-ink-dim)] hover:bg-[var(--sidebar-highlight)] hover:text-[var(--sidebar-ink)] transition-colors">
        {collapsed ? "»" : "« Thu gọn"}
      </button>
      <div className={`mx-2 mt-2 px-2 text-[10px] font-mono text-[var(--sidebar-ink-dim)] ${collapsed ? "text-center" : ""}`} title={`Phiên bản hệ thống ${APP_VERSION}`}>
        v{APP_VERSION}
      </div>
    </aside>
  );
}
