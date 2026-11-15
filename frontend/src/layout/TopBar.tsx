import type { AppUser } from "../lib/types";
import { useState } from "react";
import { InstallAppButton } from "./InstallAppButton";
import { TestModeModal, useTestMode } from "./TestMode";
import { useUserNames } from "../hooks/useUserNames";
import { ThongBaoBell } from "./ThongBaoBell";
import { useIsMobile } from "../hooks/useIsMobile";

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
  // Ten hien thi = ten tai khoan tren he thong (05/11/2026, "fix tên ktv theo tên tài khoản trên hệ thống" - loi chao tung hien ten Google
  // "kenvin thanh"): CUNG bang ten /users/ten (ho ten ETX nhan su > danh ba KTV > ten Google) nhu moi danh sach, khong co moi dung users.ten.
  const { nameOf } = useUserNames();
  const tenHt = nameOf(user.email);
  const ten = tenHt && tenHt !== user.email ? tenHt : user.ten || user.email;
  const initial = ten.trim().charAt(0).toUpperCase();
  const test = useTestMode();
  // Chuong chi gan 1 lan (header mobile / desktop deu render, an bang CSS) de khong tai thong bao 2 lan.
  const mobile = useIsMobile();
  const [testOpen, setTestOpen] = useState(false);
  // Nut "Chế độ test" chi cho tai khoan THAT la Admin he thong (ke ca khi dang test duoi vai tro khac).
  const testBtn = (onDark: boolean) =>
    test?.realIsAdmin ? (
      <button
        onClick={() => setTestOpen(true)}
        title="Test theo vai trò hoặc xem như 1 người dùng thật"
        className={`focus-ring shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${
          onDark ? "text-white/90 hover:bg-white/10" : "!py-1 !text-xs border border-[var(--line-strong)] text-[var(--ink-body)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]"
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
          <p className="font-bold text-base leading-tight truncate">Bảo hành đổi trả 3T</p>
          <p className="text-xs text-white/75 leading-tight truncate">{ten}</p>
        </div>
        {testBtn(true)}
        {mobile && <ThongBaoBell onDark />}
        <InstallAppButton onDark />
        <button onClick={() => window.confirm("Đăng xuất khỏi ứng dụng?") && logout()} className="focus-ring shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-white/70 hover:bg-white/10">
          Thoát
        </button>
      </header>

      <header className="hidden md:flex sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[var(--line)] px-4 h-10 items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] text-xs font-bold flex items-center justify-center shrink-0 ring-1 ring-[var(--brand-200)]">
          {initial}
        </span>
        <p className="min-w-0 truncate text-sm" title={`${roles.join(", ")} · ${user.email}`}>
          <span className="font-semibold text-[var(--ink)]">Xin chào, {ten}</span>
          <span className="text-xs text-[var(--ink-soft)]"> · {roles.join(" · ") || "Chưa gán vai trò"}</span>
        </p>
        <div className="ml-auto" />
        {!mobile && <ThongBaoBell />}
        {testBtn(false)}
        <button
          onClick={logout}
          className="focus-ring shrink-0 rounded-lg border border-[var(--line-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-body)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] hover:border-[var(--brand-300)] transition-colors"
        >
          Đăng xuất
        </button>
      </header>
    </>
  );
}
