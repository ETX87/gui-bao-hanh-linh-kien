import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Adapted tu linh-kien-app/frontend/src/auth/AuthContext.tsx - mo hinh vai tro rieng cua bao hanh (7
// co nghiep vu + Admin he thong "qtri"), KHONG dung enum "vai_tro" nhu linh-kien-app (xem
// backend/src/types.ts). Giai doan 1 BO "xem thu vai tro" (view-as) - co the them lai sau.

export interface AppUser {
  email: string;
  ten: string | null;
  trang_thai_duyet: "Cho duyet" | "Da duyet" | "Tu choi";
  bi_khoa: boolean;
  la_ktv_dvbh: boolean;
  la_ve_tinh: boolean;
  la_kho: boolean;
  la_admin_bh: boolean;
  la_nv_sua_chua: boolean;
  la_ke_toan: boolean;
  la_giam_sat: boolean;
  la_view: boolean;
  la_qtri: boolean;
}

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "pending" }
  | { status: "rejected" }
  | { status: "disabled" }
  | { status: "authenticated"; user: AppUser };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const { user } = (await res.json()) as { user: AppUser };
          setState({ status: "authenticated", user });
          return;
        }
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "PENDING_APPROVAL") setState({ status: "pending" });
        else if (body.error === "REJECTED") setState({ status: "rejected" });
        else if (body.error === "DISABLED") setState({ status: "disabled" });
        else setState({ status: "anonymous" });
      } catch {
        if (!cancelled) setState({ status: "anonymous" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phai dung trong AuthProvider");
  return ctx;
}
