import { useAuth, type AppUser } from "./auth/AuthContext";

// Giai doan 1 (scaffold ha tang): CHUA port 13 man hinh nghiep vu tu prototype-html/index.html - chi
// dung de xac nhan toan bo day chuyen Auth (Google OAuth -> session cookie -> D1 users) hoat dong
// dung tren ha tang Cloudflare that. Port cac man hinh thuc (Trang chu/Tao phieu gui/Hang doi phan
// loai...) la viec cua Giai doan 3/4 (xem CLAUDE.md muc "Phan tich lien ket voi Dat mua linh kien...").

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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm p-8 text-center anim-in">{children}</div>;
}

function Brand() {
  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <img src="/icon.png" alt="" className="w-14 h-14 rounded-xl shadow-sm" />
      <div>
        <h1 className="font-display font-extrabold text-lg text-[var(--ink-900)]">Sửa chữa bảo hành</h1>
        <p className="text-xs text-[var(--ink-500)] mt-0.5">Dịch Vụ 3T</p>
      </div>
    </div>
  );
}

function LoginScreen() {
  return (
    <Shell>
      <Card>
        <Brand />
        <p className="text-sm text-[var(--ink-600)] mb-6">Đăng nhập bằng tài khoản Google được cấp để tiếp tục.</p>
        <a
          href="/api/auth/login"
          className="focus-ring inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--ocean-800)] text-white font-medium text-sm py-2.5 hover:bg-[var(--ocean-900)] transition-colors"
        >
          Đăng nhập với Google
        </a>
      </Card>
    </Shell>
  );
}

function StatusScreen({ title, body, tone }: { title: string; body: string; tone: "amber" | "coral" }) {
  const dot = tone === "amber" ? "bg-[var(--amber-500)]" : "bg-[var(--coral-500)]";
  return (
    <Shell>
      <Card>
        <Brand />
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h2 className="font-display font-bold text-base text-[var(--ink-900)]">{title}</h2>
        </div>
        <p className="text-sm text-[var(--ink-600)]">{body}</p>
      </Card>
    </Shell>
  );
}

function HomeScreen({ user }: { user: AppUser }) {
  const activeRoles = ROLE_LABELS.filter((r) => user[r.flag] === true);
  return (
    <div className="min-h-full bg-[var(--bg)]">
      <header className="bg-[var(--topbar-bg)] border-b border-[var(--line)] px-6 py-4 flex items-center gap-3">
        <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg" />
        <div>
          <p className="font-display font-bold text-sm text-[var(--ink-900)] leading-tight">Sửa chữa bảo hành</p>
          <p className="text-[11px] text-[var(--ink-500)] leading-tight">Dịch Vụ 3T</p>
        </div>
        <form action="/api/auth/logout" method="post" className="ml-auto">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              location.reload();
            }}
            className="focus-ring text-xs font-medium text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
          >
            Đăng xuất
          </button>
        </form>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm p-6 anim-in">
          <p className="text-xs uppercase tracking-wide text-[var(--ink-400)] font-mono mb-1">Đã đăng nhập</p>
          <h2 className="font-display font-bold text-lg text-[var(--ink-900)]">{user.ten || user.email}</h2>
          <p className="text-sm text-[var(--ink-500)] mt-0.5">{user.email}</p>

          <div className="mt-5 pt-5 border-t border-[var(--line)]">
            <p className="text-xs uppercase tracking-wide text-[var(--ink-400)] font-mono mb-2">Vai trò</p>
            {activeRoles.length === 0 ? (
              <p className="text-sm text-[var(--ink-500)]">Chưa được gán vai trò nào — liên hệ Admin hệ thống.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activeRoles.map((r) => (
                  <span key={r.flag} className="text-xs font-medium px-2.5 py-1 rounded-full bg-[var(--ocean-100)] text-[var(--ocean-700)]">
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--ink-400)] text-center mt-6">
          Giai đoạn 1: đã xác nhận Auth + D1 hoạt động đúng trên hạ tầng thật. Màn hình nghiệp vụ sẽ được port ở Giai đoạn 3/4.
        </p>
      </main>
    </div>
  );
}

export function App() {
  const auth = useAuth();

  if (auth.status === "loading") return null;
  if (auth.status === "anonymous") return <LoginScreen />;
  if (auth.status === "pending") return <StatusScreen tone="amber" title="Đang chờ duyệt" body="Tài khoản của bạn đã được tạo, đang chờ Admin hệ thống gán vai trò." />;
  if (auth.status === "rejected") return <StatusScreen tone="coral" title="Tài khoản bị từ chối" body="Liên hệ Admin hệ thống nếu bạn cho rằng đây là nhầm lẫn." />;
  if (auth.status === "disabled") return <StatusScreen tone="coral" title="Tài khoản bị khoá" body="Liên hệ Admin hệ thống để được hỗ trợ." />;

  return <HomeScreen user={auth.user} />;
}
