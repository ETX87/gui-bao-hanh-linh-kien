import { useState } from "react";
import { createPortal } from "react-dom";
import { useRoute } from "../router/Router";
import { routesForUser, countOf, totalOf, groupRoutes } from "./routes";
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
  const totalCount = totalOf(items, counts);
  const [moreOpen, setMoreOpen] = useState(false);

  const needsMore = items.length > MAX_TABS;
  const primary = needsMore ? items.slice(0, MAX_TABS - 1) : items;
  const overflow = needsMore ? items.slice(MAX_TABS - 1) : [];
  const overflowActive = overflow.some((it) => it.hash === path);
  const overflowCount = totalOf(overflow, counts);

  // Huy hieu so (10/10/2026 - truoc day chi Trang chu co 1 cham do): moi tab hien so viec cua man do,
  // Trang chu = tong, "Thêm" = tong cac muc an trong sheet.
  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--red-600)] ring-2 ring-white text-white text-[10px] font-bold flex items-center justify-center">
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  // DESIGN_SYSTEM.md §4: nen trang mo + "vien nang" accent-soft sau icon cho muc dang chon.
  const tabClass = (active: boolean) =>
    `focus-ring flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] ${active ? "font-bold text-[var(--accent)]" : "font-medium text-[var(--ink-soft)]"}`;
  const capsule = (active: boolean) => `relative flex h-8 w-14 max-w-full items-center justify-center rounded-full text-xl leading-none transition-colors ${active ? "bg-[var(--accent-soft)]" : ""}`;

  const renderItem = (it: (typeof items)[number]) => {
    const active = path === it.hash;
    const n = it.hash === "/home" ? totalCount : countOf(it, counts);
    const content = (
      <>
        <span className={capsule(active)}>
          {it.icon}
          {badge(n)}
        </span>
        <span className="max-w-full truncate">{it.short || it.label}</span>
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
        className="md:hidden fixed left-0 right-0 bottom-0 z-[60] flex h-[4.5rem] border-t border-[var(--line)] bg-white/95 backdrop-blur shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primary.map(renderItem)}
        {needsMore && (
          <button onClick={() => setMoreOpen(true)} className={tabClass(overflowActive)}>
            <span className={capsule(overflowActive)}>
              ☰
              {badge(overflowCount)}
            </span>
            <span className="max-w-full truncate">Thêm</span>
          </button>
        )}
      </nav>

      {moreOpen &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[120] flex flex-col justify-end bg-black/40" onClick={() => setMoreOpen(false)}>
            <div
              className="anim-in bg-[var(--surface)] rounded-t-2xl max-h-[75vh] shadow-pop overflow-y-auto pb-[env(safe-area-inset-bottom)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
                <span className="font-bold text-base text-[var(--ink)]">Menu</span>
                <button onClick={() => setMoreOpen(false)} className="focus-ring w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-soft)] hover:bg-[var(--surface-2)]">
                  ✕
                </button>
              </div>
              <div className="p-2">
                {groupRoutes(overflow, counts).map((g) => ({ ...g, total: totalOf(items.filter((x) => (x.group || "") === g.label), counts) })).map((g) => (
                <div key={g.label} className="mb-1">
                {g.label && (
                  <p className="flex items-center px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                    <span className="flex-1">{g.label}</span>
                    {g.total > 0 && <span className="normal-case tracking-normal font-bold text-[var(--red-600)]">{g.total} việc</span>}
                  </p>
                )}
                {g.items.map((it) => {
                  const active = path === it.hash;
                  const count = countOf(it, counts);
                  const cls = `w-full flex items-center gap-3 px-3 py-3.5 rounded-lg text-base font-medium ${
                    active ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--ink-body)] hover:bg-[var(--surface-2)]"
                  }`;
                  const body = (
                    <>
                      <span className="text-lg leading-none shrink-0">{it.icon}</span>
                      <span className="flex-1 text-left">{it.label}</span>
                      {count > 0 && (
                        <span className="shrink-0 min-w-[20px] h-5 px-1 rounded-full bg-[var(--red-600)] text-white text-[10px] font-bold flex items-center justify-center">
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
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
