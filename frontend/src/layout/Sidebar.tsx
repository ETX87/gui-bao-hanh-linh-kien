import { useRoute } from "../router/Router";
import { routesForUser, groupRoutes, countOf, countBreakdown, totalOf, GROUP_SHORT } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import { APP_VERSION } from "../lib/version";
import type { AppUser } from "../lib/types";

// Sidebar desktop (DESIGN_SYSTEM.md §4): nen gradient xanh la icon app, chu trang, logo + ten app o
// dau, menu chia NHOM (nhan 11px HOA trang 55%), khoi nguoi dung + phien ban o cuoi.
// Giu nguyen 2 quyet dinh da chot: mac dinh THU GON (03/09/2026) - thu gon thi huy hieu so viec chuyen
// thanh cham do o goc icon; phien ban hien goc duoi-trai (05/09/2026). State collapsed nam o Shell.

export function Sidebar({ user, collapsed, onToggle }: { user: AppUser; collapsed: boolean; onToggle: () => void }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);
  const groups = groupRoutes(items, counts);
  const grandTotal = totalOf(items, counts);

  return (
    <aside
      className={`hidden md:flex ${collapsed ? "w-[76px]" : "w-56"} shrink-0 h-screen sticky top-0 flex-col bg-sidebar text-white transition-[width] duration-200`}
    >
      <div className={`flex items-center gap-3 border-b border-white/10 py-2.5 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <img src="/icon-192.png" alt="3T" className="h-9 w-9 shrink-0 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.25)]" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">Bảo hành đổi trả 3T</p>
            <p className="truncate text-xs text-white/70">Gửi · Sửa · Trả bảo hành</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {groups.map((g) => (
          <div key={g.label} className="space-y-0.5">
            {!collapsed && g.label && (
              <p className="flex items-center gap-2 px-2.5 pt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
                <span className="truncate">{g.label}</span>
                {g.total > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-white/[0.18] px-1.5 text-[10.5px] font-bold normal-case tracking-normal text-white" title={`${g.label}: ${g.total} việc cần xử lý`}>
                    {g.total > 999 ? "999+" : g.total}
                  </span>
                )}
              </p>
            )}
            {collapsed && g.label && (
              <div className="mx-0.5 mt-1 border-t border-white/15 pt-1 flex items-center justify-center gap-1 leading-tight" title={`${g.label}${g.total > 0 ? ` · ${g.total} việc cần xử lý` : ""}`}>
                <span className="truncate text-[9px] font-semibold uppercase tracking-wide text-white/55">{GROUP_SHORT[g.label] ?? g.label}</span>
                {g.total > 0 && <span className="inline-block rounded-full bg-white/[0.18] px-1 text-[9px] font-bold text-white">{g.total > 99 ? "99+" : g.total}</span>}
              </div>
            )}
            {g.items.map((it) => {
              const active = path === it.hash;
              // Trang chu = tong moi viec cua nguoi dung; muc khac = so viec cua man do.
              const count = it.hash === "/home" ? grandTotal : countOf(it, counts);
              const breakdown = it.hash === "/home" ? "" : countBreakdown(it, counts);
              // Thu gon: icon + nhan ngan BEN DUOI (05/10/2026 - truoc day chi con icon, 16+ emoji khong nhan
              // khien khong biet muc nao dung de lam gi). Mo rong: nhan + mo ta 1 dong.
              const cls = `focus-ring relative w-full flex rounded-lg text-[13.5px] font-medium transition-colors ${
                collapsed ? `items-center justify-center px-1 ${count > 0 ? "pt-3 pb-1.5" : "py-1.5"} min-h-[34px]` : "items-center gap-2 px-2.5 py-1.5"
              } ${
                active ? "bg-white/[0.22] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`;
              // 11/10/2026 ("chi can ten va so luong don can xu ly"): bo icon + dong mo ta; moi muc 1 dong
              // TEN + so viec. Thu gon: ten ngan (toi da 2 dong) + so do o goc phai. Chi tiet hang doi o tooltip.
              const badge = count > 0 && (
                <span className={`shrink-0 min-w-[18px] h-[17px] px-1 rounded-full bg-[#EF4444] text-white text-[10.5px] font-bold flex items-center justify-center ${collapsed ? "absolute -top-1 -right-0.5 ring-2 ring-[#11663a]" : ""}`}>
                  {count > 99 ? "99+" : count}
                </span>
              );
              const body = collapsed ? (
                <>
                  <span className="w-full text-center text-[10.5px] font-semibold leading-[1.15] line-clamp-2 break-words">{it.short || it.label}</span>
                  {badge}
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-left">{it.label}</span>
                  {badge}
                </>
              );
              const title = `${g.label ? g.label + " › " : ""}${it.label}${it.desc ? " — " + it.desc : ""}${count > 0 ? `
${breakdown || count + " việc cần làm"}` : ""}`;
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
