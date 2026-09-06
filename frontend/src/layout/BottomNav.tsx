import { useRoute } from "../router/Router";
import { routesForUser } from "./routes";
import { useWorkload } from "../hooks/useWorkload";
import type { AppUser } from "../lib/types";

// Bottom tab bar cho dien thoai that (<=767px) - port dung renderBottomNav() cua prototype-html
// (yeu cau 02/09/2026 "giao dien mobile chuyen menu xuong bottom") - THAY the hoan toan
// MobileNavStrip (dai cuon ngang o TRENcung TopBar) da dung tam o Giai doan 4. Dung LAI dung 1 nguon
// du lieu routesForUser()/useWorkload() voi Sidebar desktop, khong dinh nghia menu lan 2. Chi khac ve
// markup hien thi so voi Sidebar: icon+nhan xep DOC (khong phai hang ngang), va CHI "Trang chu" hien
// 1 cham do tong hop (co viec o BAT KY dau) thay vi so dem rieng tung muc - khop dung
// `[['#/home','Trang chủ','🏠', totalCount>0]].concat(routes.map(...=>[...,false]))` cua ban goc,
// vi 1 hang ngang qua chat de nhoi them so rieng tung o.

export function BottomNav({ user }: { user: AppUser }) {
  const { path, nav } = useRoute();
  const { counts } = useWorkload();
  const items = routesForUser(user);
  const totalCount = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 z-[60] flex bg-gradient-to-b from-[var(--sidebar-from)] to-[var(--sidebar-to)] shadow-[0_-3px_12px_rgba(5,32,51,0.28)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((it) => {
        const active = path === it.hash;
        const showDot = it.hash === "/home" && totalCount > 0;
        const itemClassName = `focus-ring flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-lg text-[10px] font-bold ${
          active ? "text-[var(--sidebar-ink)] bg-[var(--sidebar-highlight)]" : "text-[var(--sidebar-ink-dim)]"
        }`;
        const itemContent = (
          <>
            <span className="relative text-lg leading-none">
              {it.icon}
              {showDot && <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-[var(--coral-500)] border border-[var(--sidebar-to)]" />}
            </span>
            <span className="max-w-full truncate">{it.label}</span>
          </>
        );
        // Muc "href" (lien ket ra ngoai, xem routes.ts) - dung <a> chuan thay vi nav() noi bo.
        if (it.href) {
          return (
            <a key={it.hash} href={it.href} className={itemClassName}>
              {itemContent}
            </a>
          );
        }
        return (
          <button key={it.hash} onClick={() => nav(it.hash)} className={itemClassName}>
            {itemContent}
          </button>
        );
      })}
    </nav>
  );
}
