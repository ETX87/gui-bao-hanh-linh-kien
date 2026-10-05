import type { AppUser } from "../lib/types";
import { useState } from "react";
import { InstallAppButton } from "./InstallAppButton";
import { TestModeModal, useTestMode } from "./TestMode";

// TopBar (DESIGN_SYSTEM.md §4):
// - Mobile: header gradient xanh la (cung nen Sidebar) de nhan dien thuong hieu - icon + ten app + nut
//   "Cai dat" (05/09/2026) + Dang xuat.
// - Desktop: thanh trang mong trong cot noi dung - loi chao + vai tro (quyet dinh 03/09/2026 "loi chao
//   len topbar") + Dang xuat. Logo da nam tren Sidebar nen khong lap lai o day.

const ROLE_LABELS: Array<{ flag: keyof AppUser; label: string }> = [
  { flag: "la_ktv_dvbh", label: "KTV / CTV / Trạm" },
  { flag: "la_ve_tinh", label: "Vệ tinh" },
  { flag: "la_kho", label: "Kho" },
  { flag: "la_admin_bh", label: "Admin bảo hành" },
  { flag: "la_nv_sua_chua", label: "NV sửa chữa" },
  { flag: "la_ke_toan", label: "Kế toán" },
  { flag: "la_giam_sat", label: "Giám sát" },
  { flag: "la_view", label: "View" },
  { flag: "la_qtri", label: "Admin hệ thống" },
];

async function logout() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  location.reload();
}

export function TopBar({ user }: { user: AppUser }) {
  const roles = ROLE_LABELS.filter((r) => user[r.flag]).map((r) => r.label);
  const initial = (user.ten || user.email).trim().charAt(0).toUpperCase();
  const test = useTestMode();
  const [testOpen, setTestOpen] = useState(false);
  // Nut "Chế độ test" chi cho tai khoan THAT la Admin he thong (ke ca khi dang test duoi vai tro khac).
  const testBtn = (onDark: boolean) =>
    test?.realIsAdmin ? (
      <button
        onClick={() => setTestOpen(true)}
        title="Test theo vai trò hoặc xem như 1 người dùng thật"
        className={`focus-ring shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
          onDark ? "text-white/90 hover:bg-white/10" : "border border-[var(--line-strong)] text-[var(--ink-body)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]"
        }`}
      >
        🧪 <span className={onDark ? "sr-only" : ""}>Chế độ test</span>
      </button>
    ) : null;
  return (
    <>
      {testOpen && <TestModeModal onClose={() => setTestOpen(false)} />}
      <header className="md:hidden sticky top-0 z-40 bg-sidebar text-white shadow-brand px-4 py-2.5 flex items-center gap-3">
        <img src="/icon-192.png" alt="" className="w-9 h-9 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base leading-tight truncate">Sửa chữa 3T</p>
          <p className="text-xs text-white/75 leading-tight truncate">{user.ten || user.email}</p>
        </div>
        {testBtn(true)}
        <InstallAppButton onDark />
        <button onClick={logout} className="focus-ring shrink-0 rounded-lg px-2.5 py-2 text-sm font-semibold text-white/85 hover:bg-white/10">
          Thoát
        </button>
      </header>

      <header className="hidden md:flex sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--line)] px-6 py-2.5 items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] font-bold flex items-center justify-center shrink-0 ring-1 ring-[var(--brand-200)]">
          {initial}
        </span>
        <div className="min-w-0" title={`${roles.join(", ")} · ${user.email}`}>
          <p className="text-sm text-[var(--ink)] font-semibold truncate">Xin chào, {user.ten || user.email}</p>
          <p className="text-xs text-[var(--ink-soft)] truncate">{roles.join(" · ") || "Chưa gán vai trò"}</p>
        </div>
        <div className="ml-auto" />
        {testBtn(false)}
        <button
          onClick={logout}
          className="focus-ring shrink-0 rounded-lg border border-[var(--line-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-body)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] hover:border-[var(--brand-300)] transition-colors"
        >
          Đăng xuất
        </button>
      </header>
    </>
  );
}
