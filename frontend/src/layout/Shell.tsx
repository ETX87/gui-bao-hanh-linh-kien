import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import type { AppUser } from "../lib/types";

// Khung trang (DESIGN_SYSTEM.md §4): Desktop = Sidebar gradient (h-screen) | cot phai (TopBar trang +
// noi dung p-6). Mobile = header gradient + noi dung p-4 pb-24 + BottomNav co dinh.
// Sidebar mac dinh THU GON (03/09/2026) - thu gon thi noi dung tu gian toi 1440px.
export function Shell({ user, children }: { user: AppUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div className="min-h-full flex">
      <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar user={user} />
        <main className="flex-1 min-w-0 px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6">
          <div className={`mx-auto space-y-4 transition-[max-width] duration-150 ${collapsed ? "max-w-[1440px]" : "max-w-6xl"}`}>{children}</div>
        </main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}
