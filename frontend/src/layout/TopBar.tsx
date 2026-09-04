import type { AppUser } from "../lib/types";

// TopBar - logo + loi chao (port dung quyet dinh "loi chao len topbar" 03/09/2026, chi hien desktop)
// + dang xuat.

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

export function TopBar({ user }: { user: AppUser }) {
  const roles = ROLE_LABELS.filter((r) => user[r.flag]).map((r) => r.label);
  return (
    <header className="sticky top-0 z-40 bg-[var(--topbar-bg)] border-b border-[var(--line)] px-4 md:px-6 py-3 flex items-center gap-3">
      <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg shrink-0" />
      <div className="min-w-0">
        <p className="font-display font-bold text-sm text-[var(--ink-900)] leading-tight truncate">Sửa chữa bảo hành</p>
        <p className="text-[11px] text-[var(--ink-500)] leading-tight">Dịch Vụ 3T</p>
      </div>
      <div className="hidden md:block ml-4 pl-4 border-l border-[var(--line)] min-w-0" title={`${roles.join(", ")} · ${user.email}`}>
        <p className="text-sm text-[var(--ink-900)] font-medium truncate">Xin chào, {user.ten || user.email}</p>
        <p className="text-[11px] text-[var(--ink-500)] truncate">{roles.join(" · ") || "Chưa gán vai trò"}</p>
      </div>
      <div className="ml-auto flex items-center gap-3 shrink-0">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            location.reload();
          }}
          className="focus-ring text-xs font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
