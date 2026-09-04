import type { ReactNode } from "react";
import { Sidebar, MobileNavStrip } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { AppUser } from "../lib/types";

export function Shell({ user, children }: { user: AppUser; children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <TopBar user={user} />
      <MobileNavStrip user={user} />
      <div className="flex-1 flex min-h-0">
        <Sidebar user={user} />
        <main className="flex-1 min-w-0 overflow-y-auto px-4 md:px-6 py-6">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
