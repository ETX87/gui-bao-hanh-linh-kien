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
      className={`hidden md:flex ${collapsed ? "w-[76px]" : "w-64"} shrink-0 h-screen sticky top-0 flex-col bg-sidebar text-white transition-[width] duration-200`}
    >
      <div className={`flex items-center gap-3 border-b border-white/10 py-4 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        <img src="/icon-192.png" alt="3T" className="h-10 w-10 shrink-0 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.25)]" />
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
            {!collapsed && g.label && (
              <p className="flex items-center gap-2 px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                <span className="truncate">{g.label}</span>
                {g.total > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-white/[0.18] px-1.5 text-[10.5px] font-bold normal-case tracking-normal text-white" title={`${g.label}: ${g.total} việc cần xử lý`}>
                    {g.total > 999 ? "999+" : g.total} việc
                  </span>
                )}
              </p>
            )}
            {collapsed && g.label && (
              <div className="mx-0.5 mt-2 mb-1 border-t border-white/15 pt-1 text-center leading-tight" title={`${g.label}${g.total > 0 ? ` · ${g.total} việc cần xử lý` : ""}`}>
                <span className="block truncate text-[9px] font-semibold uppercase tracking-wide text-white/55">{GROUP_SHORT[g.label] ?? g.label}</span>
                {g.total > 0 && <span className="inline-block rounded-full bg-white/[0.18] px-1 text-[9px] font-bold text-white">{g.total > 99 ? "99+" : g.total} việc</span>}
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
                collapsed ? "flex-col items-center gap-1 px-1 py-2" : "items-center gap-2.5 px-3 py-2"
              } ${
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
                  {collapsed && <span className="w-full text-center text-[10px] font-semibold leading-[1.15] line-clamp-2 break-words">{it.short || it.label}</span>}
                  {!collapsed && (
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate">{it.label}</span>
                      {/* Co viec: dong phu hien chi tiet tung hang doi (VD "2 thùng chờ nhận nội bộ · 5 đơn chờ phân loại") thay cho mo ta. */}
                      {breakdown ? (
                        <span className="block truncate text-[11px] font-semibold text-[#FDE68A]">{breakdown}</span>
                      ) : (
                        it.desc && <span className="block truncate text-[11px] font-normal text-white/60">{it.desc}</span>
                      )}
                    </span>
                  )}
                  {!collapsed && count > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#EF4444] ring-1 ring-white/80 text-white text-[11px] font-bold flex items-center justify-center">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
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
