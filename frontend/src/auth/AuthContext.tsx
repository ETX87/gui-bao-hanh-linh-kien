import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppUser } from "../lib/types";

// Adapted tu linh-kien-app/frontend/src/auth/AuthContext.tsx - mo hinh vai tro rieng cua bao hanh (7
// co nghiep vu + Admin he thong "qtri"), KHONG dung enum "vai_tro" nhu linh-kien-app (xem
// backend/src/types.ts). Che do test Admin (view-as) them lai 05/10/2026. AppUser
// dinh nghia 1 lan duy nhat o lib/types.ts, import lai o day - tranh 2 nguon su that lech nhau.

export type { AppUser };

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "pending" }
  | { status: "rejected" }
  | { status: "disabled" }
  | { status: "authenticated"; user: AppUser; test: TestMode };

// Che do test cua Admin he thong (backend/src/lib/viewAs.ts) - realIsAdmin/realEmail la tai khoan THAT.
export interface TestMode {
  realIsAdmin: boolean;
  realEmail: string;
  viewAsRole: string | null;
  viewAsUser: { email: string; ten: string | null } | null;
}

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
          const body = (await res.json()) as { user: AppUser } & Partial<TestMode>;
          setState({
            status: "authenticated",
            user: body.user,
            test: { realIsAdmin: !!body.realIsAdmin, realEmail: body.realEmail || body.user.email, viewAsRole: body.viewAsRole ?? null, viewAsUser: body.viewAsUser ?? null },
          });
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
