import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { TestModeBanner } from "./TestMode";
import { HO_TRO, KtvMenu, showKtvMenu } from "./KtvMenu";
import { useRoute } from "../router/Router";
import type { AppUser } from "../lib/types";

// Khung trang (DESIGN_SYSTEM.md §4): Desktop = Sidebar gradient (h-screen) | cot phai (TopBar trang +
// noi dung p-6). Mobile = header gradient + noi dung p-4 pb-24 + BottomNav co dinh.
// Sidebar mac dinh THU GON (03/09/2026) - thu gon thi noi dung tu gian toi 1440px.
export function Shell({ user, children }: { user: AppUser; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const { path } = useRoute();
  return (
    <div className="min-h-full flex">
      <Sidebar user={user} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      {/* 04/11/2026: menu 2 - danh sach KTV dang co don can xu ly, bam ten de loc (desktop). */}
      {showKtvMenu(user) && HO_TRO.includes(path) && <KtvMenu user={user} />}
      <div className="flex-1 min-w-0 flex flex-col">
        <TestModeBanner />
        <TopBar user={user} />
        <main className="flex-1 min-w-0 px-3 md:px-4 py-3 pb-24 md:pb-4">
          <div className={`mx-auto space-y-3 transition-[max-width] duration-150 ${collapsed ? "max-w-[1600px]" : "max-w-[1440px]"}`}>{children}</div>
        </main>
      </div>
      <BottomNav user={user} />
    </div>
  );
}
