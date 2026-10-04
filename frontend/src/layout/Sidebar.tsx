import { useRoute } from "../router/Router";
import { routesForUser, type RouteItem } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import { APP_VERSION } from "../lib/version";
import type { AppUser } from "../lib/types";

// Sidebar desktop (DESIGN_SYSTEM.md §4): nen gradient xanh la icon app, chu trang, logo + ten app o
// dau, menu chia NHOM (nhan 11px HOA trang 55%), khoi nguoi dung + phien ban o cuoi.
// Giu nguyen 2 quyet dinh da chot: mac dinh THU GON (03/09/2026) - thu gon thi huy hieu so viec chuyen
// thanh cham do o goc icon; phien ban hien goc duoi-trai (05/09/2026). State collapsed nam o Shell.

function groupItems(items: RouteItem[]) {
  const groups: { label: string; items: RouteItem[] }[] = [];
  for (const it of items) {
    const label = it.group || "";
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(it);
    else groups.push({ label, items: [it] });
  }
  return groups;
}

export function Sidebar({ user, collapsed, onToggle }: { user: AppUser; collapsed: boolean; onToggle: () => void }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const groups = groupItems(routesForUser(user));

  return (
    <aside
      className={`hidden md:flex ${collapsed ? "w-16" : "w-64"} shrink-0 h-screen sticky top-0 flex-col bg-sidebar text-white transition-[width] duration-200`}
    >
      <div className={`flex items-center gap-3 border-b border-white/10 py-4 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <img src="/icon-192.png" alt="3T" className="h-10 w-10 shrink-0 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-1 ring-white/30" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">Sửa chữa 3T</p>
            <p className="truncate text-xs text-white/70">Gửi · Sửa · Trả bảo hành</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {groups.map((g) => (
          <div key={g.label} className="space-y-0.5">
            {!collapsed && g.label && g.label !== "Chung" && <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">{g.label}</p>}
            {collapsed && g.label !== "Chung" && <div className="mx-3 my-1.5 border-t border-white/10" />}
            {g.items.map((it) => {
              const active = path === it.hash;
              const count = it.workloadKey ? counts[it.workloadKey] : 0;
              const cls = `focus-ring relative w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${collapsed ? "justify-center" : ""} ${
                active ? "bg-white/[0.22] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`;
              const body = (
                <>
                  <span className="relative text-[17px] leading-none shrink-0">
                    {it.icon}
                    {collapsed && count > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#EF4444] ring-2 ring-[#11663a] text-white text-[9px] font-bold flex items-center justify-center">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </span>
                  {!collapsed && <span className="flex-1 text-left truncate">{it.label}</span>}
                  {!collapsed && count > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] ring-1 ring-white/80 text-white text-[11px] font-bold flex items-center justify-center">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </>
              );
              const title = `${it.label}${count > 0 ? ` (${count} việc cần làm)` : ""}`;
              return it.href ? (
                <a key={it.hash} href={it.href} title={title} className={cls}>
                  {body}
                </a>
              ) : (
                <button key={it.hash} onClick={() => nav(it.hash)} title={title} className={cls}>
                  {body}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2 space-y-1">
        <button
          onClick={onToggle}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="focus-ring w-full rounded-lg px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/10 hover:text-white transition-colors"
        >
          {collapsed ? "»" : "« Thu gọn"}
        </button>
        <p className={`px-3 text-[10px] font-mono text-white/55 ${collapsed ? "text-center px-0" : ""}`} title={`Phiên bản hệ thống ${APP_VERSION} · ${user.email}`}>
          v{APP_VERSION}
        </p>
      </div>
    </aside>
  );
}
