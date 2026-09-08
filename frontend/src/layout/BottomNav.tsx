import { useState } from "react";
import { createPortal } from "react-dom";
import { useRoute } from "../router/Router";
import { routesForUser } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import type { AppUser } from "../lib/types";

// Bottom tab bar cho dien thoai that (<=767px) - port dung renderBottomNav() cua prototype-html.
//
// Sua 08/09/2026 (Phat hien 5 vong ra soat UX): truoc day nhoi TAT CA muc menu (toi 16 voi qtri/
// nguoi da vai tro) vao 1 thanh co dinh - moi muc ~23px, nhan cat con 1 chu, khong doc noi. Nay
// GIOI HAN 5 muc dau + 1 nut "Thêm" mo bottom-sheet chua phan con lai. Vai tro <=5 muc (KTV=4,
// Kho=3, NV=2, Ke toan=2, Giam sat=5) khong doi gi.

const MAX_TABS = 5;

export function BottomNav({ user }: { user: AppUser }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);
  const [moreOpen, setMoreOpen] = useState(false);

  const needsMore = items.length > MAX_TABS;
  const primary = needsMore ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = needsMore ? items.slice(MAX_TABS - 1) : [];
  const overflowActive = overflow.some((it) => it.hash === path);

  const tabClass = (active: boolean) =>
    `focus-ring flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-lg text-[10px] font-bold ${
      active ? "text-[var(--sidebar-ink)] bg-[var(--sidebar-highlight)]" : "text-[var(--sidebar-ink-dim)]"
    }`;

  const renderItem = (it: (typeof items)[number]) => {
    const active = path === it.hash;
    const showDot = it.hash === "/home" && totalCount > 0;
    const content = (
      <>
        <span className="relative text-lg leading-none">
          {it.icon}
          {showDot && <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[var(--coral-500)] border border-[var(--sidebar-to)]" />}
        </span>
        <span className="max-w-full truncate">{it.label}</span>
      </>
    );
    if (it.href) {
      return (
        <a key={it.hash} href={it.href} className={tabClass(active)}>
          {content}
        </a>
      );
    }
    return (
      <button key={it.hash} onClick={() => nav(it.hash)} className={tabClass(active)}>
        {content}
      </button>
    );
  };

  return (
    <>
      <nav
        className="md:hidden fixed left-0 right-0 bottom-0 z-[60] flex bg-gradient-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] shadow-[0_-3px_12px_rgba(5,32,51,0.28)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map(renderItem)}
        {needsMore && (
          <button onClick={() => setMoreOpen(true)} className={tabClass(overflowActive)}>
            <span className="relative text-lg leading-none">
              ☰
              {overflow.some((it) => it.workloadKey && counts[it.workloadKey] > 0) && (
                <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[var(--coral-500)] border border-[var(--sidebar-to)]" />
              )}
            </span>
            <span className="max-w-full truncate">Thêm</span>
          </button>
        )}
      </nav>

      {moreOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[120] flex flex-col justify-end bg-black/40" onClick={() => setMoreOpen(false)}>
            <div
              className="anim-in bg-[var(--surface)] rounded-t-2xl max-h-[75vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
                <span className="font-display font-bold text-sm text-[var(--ink-900)]">Menu</span>
                <button onClick={() => setMoreOpen(false)} className="focus-ring w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-500)] hover:bg-[var(--surface-100)]">
                  ✕
                </button>
              </div>
              <div className="p-2">
                {overflow.map((it) => {
                  const active = path === it.hash;
                  const count = it.workloadKey ? counts[it.workloadKey] : 0;
                  const cls = `w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                    active ? "bg-[var(--sidebar-highlight)] text-[var(--ocean-800)]" : "text-[var(--ink-700)] hover:bg-[var(--surface-100)]"
                  }`;
                  const body = (
                    <>
                      <span className="text-lg leading-none shrink-0">{it.icon}</span>
                      <span className="flex-1 text-left">{it.label}</span>
                      {count > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-[var(--coral-600)] text-white text-[10px] font-bold flex items-center justify-center">
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </>
                  );
                  return it.href ? (
                    <a key={it.hash} href={it.href} className={cls} onClick={() => setMoreOpen(false)}>
                      {body}
                    </a>
                  ) : (
                    <button
                      key={it.hash}
                      className={cls}
                      onClick={() => {
                        nav(it.hash);
                        setMoreOpen(false);
                      }}
                    >
                      {body}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
