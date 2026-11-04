import { useEffect } from "react";
import { LichSuScreen } from "./screens/shared/LichSuBaoHanh";
import { useAuth } from "./auth/AuthContext";
import type { AppUser } from "./lib/types";
import { RouterProvider, useRoute } from "./router/Router";
import { consumePendingDeepLinkHash } from "./lib/deepLink";
import { WorkloadProvider } from "./hooks/useWorkload";
import { ToastProvider } from "./ui/Toast";
import { Shell } from "./layout/Shell";
import { HomeScreen } from "./screens/Home";
import { ThungHangScreen } from "./screens/chung/ThungHangScreen";
import { DonBaoHanhScreen } from "./screens/chung/DonBaoHanhScreen";
import { PhieuTraScreen } from "./screens/chung/PhieuTraScreen";
import { QuanTriScreen } from "./screens/chung/QuanTriScreen";
import { legacyTarget } from "./lib/legacyRoutes";
import { KtvTaoPhieuScreen } from "./screens/ktv/TaoPhieu";
import { KtvDonCuaToiScreen } from "./screens/ktv/DonCuaToi";
import { KtvHomeScreen } from "./screens/ktv/KtvHome";
import { isPureKtv } from "./layout/routes";
import { KtvNhanHangScreen } from "./screens/ktv/NhanHang";
import { AdminDeXuatScreen } from "./screens/adminbh/DeXuatLinhKien";

// Giai doan 4: port day du 13 man hinh nghiep vu cua prototype-html/index.html sang React that, dung
// backend Giai doan 3 (12 route file da kiem thu end-to-end 0 loi). Dispatch theo dung ROUTES_BY_ROLE
// (routesForUser) - moi hash chi render duoc khi user THAT SU co vai tro tuong ung, tranh truy cap
// truc tiep URL vao man khong co quyen.

function Routed({ user }: { user: AppUser }) {
  const { path, query } = useRoute();
  const legacy = legacyTarget(path, query);
  useEffect(() => {
    if (legacy) window.location.replace(`#${legacy}`);
  }, [legacy]);
  if (legacy) return null;

  if (path === "/home" || path === "/") return isPureKtv(user) ? <KtvHomeScreen user={user} /> : <HomeScreen user={user} />;
  if (path === "/lich-su") return <LichSuScreen />;

  // 31/10/2026: 4 man chung dung cho moi vai tro (tab theo giai doan, tu mo dung tab viec cua vai tro).
  if ((user.la_kho || user.la_admin_bh || user.la_giam_sat || user.la_qtri) && path === "/thung") return <ThungHangScreen user={user} />;
  if ((user.la_admin_bh || user.la_nv_sua_chua || user.la_giam_sat || user.la_view || user.la_qtri) && path === "/don") return <DonBaoHanhScreen user={user} />;
  if ((user.la_admin_bh || user.la_ke_toan || user.la_kho || user.la_view || user.la_qtri) && path === "/phieu-tra") return <PhieuTraScreen user={user} />;
  if ((user.la_admin_bh || user.la_qtri) && path === "/quan-tri") return <QuanTriScreen user={user} />;
  if ((user.la_admin_bh || user.la_ke_toan || user.la_kho || user.la_qtri) && path === "/admin/de-xuat") return <AdminDeXuatScreen user={user} />;

  // KTV: 3 man rieng (toi uu dien thoai, v1.048). Giam sat / Admin "tao ho" dung tab "Thùng nháp" cua man
  // Thùng hàng (cung component KtvTaoPhieuScreen).
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri || user.la_giam_sat || user.la_admin_bh) && path === "/ktv/tao-phieu") return <KtvTaoPhieuScreen user={user} />;
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri) && path === "/ktv/tra-cuu") return <KtvDonCuaToiScreen user={user} />;
  // Link truy cap truc tiep 1 phieu tra theo ID (#/ktv/nhan-hang/TR-000001) - xem lib/deepLink.ts.
  const nhanHangIdMatch = path.match(/^\/ktv\/nhan-hang\/(TR-\d+)$/i);
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri) && (path === "/ktv/nhan-hang" || nhanHangIdMatch)) {
    return <KtvNhanHangScreen user={user} initialDetailId={nhanHangIdMatch?.[1]} />;
  }

  return (
    <div className="text-center py-16 text-[var(--ink-soft)]">
      <p className="text-lg font-bold mb-1">Không tìm thấy trang</p>
      <p className="text-sm">Bạn không có quyền truy cập màn hình này, hoặc đường dẫn không tồn tại.</p>
    </div>
  );
}

function AuthedApp({ user }: { user: AppUser }) {
  // Link truy cap truc tiep (them 2026-09-09, xem lib/deepLink.ts) - luc component nay mount la luc
  // nguoi dung CHAC CHAN da dang nhap xong, nen day la diem doc lai an toan duy nhat. Gan lai
  // window.location.hash de RouterProvider (bao ngoai App, mount tu truoc do voi hash mac dinh "/home")
  // phat hien "hashchange" va tu dieu huong toi dung man - khong can dung useRoute()/nav() o day.
  useEffect(() => {
    const hash = consumePendingDeepLinkHash();
    if (hash) window.location.hash = hash;
  }, []);
  return (
    <WorkloadProvider user={user}>
      <Shell user={user}>
        <Routed user={user} />
      </Shell>
    </WorkloadProvider>
  );
}

function Shell_Login() {
  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-100)] via-[var(--bg)] to-[var(--brand-50)] px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-pop p-8 text-center anim-in">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src="/icon-192.png" alt="" className="w-16 h-16 rounded-2xl shadow-brand" />
          <div>
            <h1 className="font-bold text-xl text-[var(--ink)]">Bảo hành đổi trả 3T</h1>
            <p className="text-sm text-[var(--ink-soft)] mt-0.5">Gửi · Sửa · Trả linh kiện bảo hành</p>
          </div>
        </div>
        <p className="text-sm text-[var(--ink-soft)] mb-6">Đăng nhập bằng tài khoản Google được cấp để tiếp tục.</p>
        <a
          href="/api/auth/login"
          className="focus-ring inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--accent)] text-white font-semibold text-base lg:text-sm py-3 lg:py-2.5 shadow-brand hover:bg-[var(--accent-dark)] transition-colors"
        >
          Đăng nhập với Google
        </a>
      </div>
    </div>
  );
}

function StatusScreen({ title, body, tone }: { title: string; body: string; tone: "amber" | "coral" }) {
  const dot = tone === "amber" ? "bg-[var(--amber-500)]" : "bg-[var(--red-500)]";
  return (
    <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-[var(--brand-100)] via-[var(--bg)] to-[var(--brand-50)] px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-pop p-8 text-center anim-in">
        <img src="/icon-192.png" alt="" className="w-16 h-16 rounded-2xl shadow-brand mx-auto mb-4" />
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h2 className="font-bold text-base text-[var(--ink)]">{title}</h2>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">{body}</p>
      </div>
    </div>
  );
}

function Inner() {
  const auth = useAuth();
  if (auth.status === "loading") return null;
  if (auth.status === "anonymous") return <Shell_Login />;
  if (auth.status === "pending") return <StatusScreen tone="amber" title="Đang chờ duyệt" body="Tài khoản của bạn đã được tạo, đang chờ Admin hệ thống gán vai trò." />;
  if (auth.status === "rejected") return <StatusScreen tone="coral" title="Tài khoản bị từ chối" body="Liên hệ Admin hệ thống nếu bạn cho rằng đây là nhầm lẫn." />;
  if (auth.status === "disabled") return <StatusScreen tone="coral" title="Tài khoản bị khoá" body="Liên hệ Admin hệ thống để được hỗ trợ." />;
  return <AuthedApp user={auth.user} />;
}

export function App() {
  return (
    <RouterProvider>
      <ToastProvider>
        <Inner />
      </ToastProvider>
    </RouterProvider>
  );
}
