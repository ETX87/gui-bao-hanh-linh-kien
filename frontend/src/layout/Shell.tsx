import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import type { AppUser } from "../lib/types";

// Dieu huong mobile la BottomNav co dinh o day man hinh (<=767px, xem BottomNav.tsx) - THAY the
// MobileNavStrip (dai cuon ngang o dau) da dung tam o Giai doan 4, port dung yeu cau 02/09/2026 cua
// prototype "giao dien mobile chuyen menu xuong bottom". <main> can them khoang trong duoi tren mobile
// (pb-20, ~80px) de noi dung khong bi thanh co dinh nay de len tren - khop dung
// `.main-col{padding-bottom:calc(60px + env(safe-area-inset-bottom));}` cua ban goc.
//
// Sidebar mac dinh THU GON (yeu cau 03/09/2026, xem Sidebar.tsx) - state nam o day (khong o Sidebar)
// vi noi dung <main> can biet de tu gian max-width tuong ung khi sidebar thu gon, giong dung
// `body.sidebar-collapsed .wrap{max-width:1440px}` cua ban goc (mac dinh 1152px/max-w-6xl).
export function Shell({ user, children }: { user: AppUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="min-h-full flex flex-col">
      <TopBar user={user} />
      <div className="flex-1 flex min-h-0">
        <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-6 py-6 pb-20 md:pb-6">
          <div className={`mx-auto transition-[max-width] duration-150 ${collapsed ? "max-w-[1440px]" : "max-w-6xl"}`}>{children}</div>
        </main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}
