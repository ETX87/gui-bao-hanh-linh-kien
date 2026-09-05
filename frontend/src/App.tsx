import { useAuth } from "./auth/AuthContext";
import type { AppUser } from "./lib/types";
import { RouterProvider, useRoute } from "./router/Router";
import { WorkloadProvider } from "./hooks/useWorkload";
import { ToastProvider } from "./ui/Toast";
import { Shell } from "./layout/Shell";
import { HomeScreen } from "./screens/Home";
import { KtvTaoPhieuScreen } from "./screens/ktv/TaoPhieu";
import { KtvTraCuuScreen } from "./screens/ktv/TraCuu";
import { KtvNhanHangScreen } from "./screens/ktv/NhanHang";
import { KhoTiepNhanScreen } from "./screens/kho/TiepNhan";
import { KhoDongGoiScreen } from "./screens/kho/DongGoi";
import { AdminPhanLoaiScreen } from "./screens/adminbh/PhanLoai";
import { AdminXacNhanScreen } from "./screens/adminbh/XacNhan";
import { AdminPhieuTraScreen } from "./screens/adminbh/PhieuTra";
import { NvViecCuaToiScreen } from "./screens/nv/ViecCuaToi";
import { KeToanDuyetScreen } from "./screens/ketoan/Duyet";
import { QuanLyTongQuanScreen } from "./screens/quanly/TongQuan";
import { QuanLyTraCuuScreen } from "./screens/quanly/TraCuu";
import { QtriNguoiDungScreen } from "./screens/qtri/NguoiDung";
import { QtriKtvScreen } from "./screens/qtri/KtvLienHe";
import { QtriCaiDatScreen } from "./screens/qtri/CaiDat";
import { LinhKienScreen } from "./screens/shared/LinhKienScreen";

// Giai doan 4: port day du 13 man hinh nghiep vu cua prototype-html/index.html sang React that, dung
// backend Giai doan 3 (12 route file da kiem thu end-to-end 0 loi). Dispatch theo dung ROUTES_BY_ROLE
// (routesForUser) - moi hash chi render duoc khi user THAT SU co vai tro tuong ung, tranh truy cap
// truc tiep URL vao man khong co quyen.

function Routed({ user }: { user: AppUser }) {
  const { path } = useRoute();

  if (path === "/home" || path === "/") return <HomeScreen user={user} />;

  // la_qtri (Admin he thong) la superuser - phan hoi 04/09/2026 "Vai trò Admin cần nhìn được tất cả
  // các modules của hệ thống": moi cong duoi day mo them cho ca la_qtri, dong bo dung voi
  // routesForUser() (sidebar) va cac ham requireX() da sua ben backend - khong de sidebar hien muc
  // ma bam vao lai rot vao trang "Khong tim thay".
  // GS/Admin bao hanh cung mo duoc man nay de "tao ho" don bao hanh cho 1 KTV (yeu cau 05/09/2026
  // muc 1) - KtvTaoPhieuScreen tu re nhanh giao dien theo vai tro (xem hoMode trong file do).
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri || user.la_giam_sat || user.la_admin_bh) && path === "/ktv/tao-phieu") return <KtvTaoPhieuScreen user={user} />;
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri) && path === "/ktv/tra-cuu") return <KtvTraCuuScreen />;
  if ((user.la_ktv_dvbh || user.la_ve_tinh || user.la_qtri) && path === "/ktv/nhan-hang") return <KtvNhanHangScreen user={user} />;

  if ((user.la_kho || user.la_qtri) && path === "/kho/tiep-nhan") return <KhoTiepNhanScreen />;
  if ((user.la_kho || user.la_qtri) && path === "/kho/dong-goi") return <KhoDongGoiScreen user={user} />;

  if ((user.la_admin_bh || user.la_qtri) && path === "/admin/phan-loai") return <AdminPhanLoaiScreen user={user} />;
  if ((user.la_admin_bh || user.la_qtri) && path === "/admin/xac-nhan") return <AdminXacNhanScreen user={user} />;
  if ((user.la_admin_bh || user.la_qtri) && path === "/admin/phieu-tra") return <AdminPhieuTraScreen user={user} />;

  if ((user.la_nv_sua_chua || user.la_qtri) && path === "/nv/viec-cua-toi") return <NvViecCuaToiScreen user={user} />;

  if ((user.la_ke_toan || user.la_qtri) && path === "/ketoan/duyet") return <KeToanDuyetScreen user={user} />;

  if ((user.la_giam_sat || user.la_view || user.la_qtri) && path === "/quanly/tong-quan") return <QuanLyTongQuanScreen />;
  if ((user.la_giam_sat || user.la_view || user.la_qtri) && path === "/quanly/tra-cuu") return <QuanLyTraCuuScreen user={user} />;

  if (user.la_qtri && path === "/qtri/nguoi-dung") return <QtriNguoiDungScreen currentEmail={user.email} />;
  if (user.la_qtri && path === "/qtri/ktv") return <QtriKtvScreen />;
  if (user.la_qtri && path === "/qtri/cai-dat") return <QtriCaiDatScreen />;

  if ((user.la_admin_bh || user.la_qtri) && path === "/linh-kien") return <LinhKienScreen />;

  return (
    <div className="text-center py-16 text-[var(--ink-500)]">
      <p className="text-lg font-display font-bold mb-1">Không tìm thấy trang</p>
      <p className="text-sm">Bạn không có quyền truy cập màn hình này, hoặc đường dẫn không tồn tại.</p>
    </div>
  );
}

function AuthedApp({ user }: { user: AppUser }) {
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
    <div className="min-h-full flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm p-8 text-center anim-in">
        <div className="flex flex-col items-center gap-3 mb-6">
          <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-xl shadow-sm" />
          <div>
            <h1 className="font-display font-extrabold text-lg text-[var(--ink-900)]">Sửa chữa bảo hành</h1>
            <p className="text-xs text-[var(--ink-500)] mt-0.5">Dịch Vụ 3T</p>
          </div>
        </div>
        <p className="text-sm text-[var(--ink-600)] mb-6">Đăng nhập bằng tài khoản Google được cấp để tiếp tục.</p>
        <a
          href="/api/auth/login"
          className="focus-ring inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[var(--ocean-800)] text-white font-medium text-sm py-2.5 hover:bg-[var(--ocean-900)] transition-colors"
        >
          Đăng nhập với Google
        </a>
      </div>
    </div>
  );
}

function StatusScreen({ title, body, tone }: { title: string; body: string; tone: "amber" | "coral" }) {
  const dot = tone === "amber" ? "bg-[var(--amber-500)]" : "bg-[var(--coral-500)]";
  return (
    <div className="min-h-full flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm p-8 text-center anim-in">
        <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-xl shadow-sm mx-auto mb-4" />
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <h2 className="font-display font-bold text-base text-[var(--ink-900)]">{title}</h2>
        </div>
        <p className="text-sm text-[var(--ink-600)]">{body}</p>
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
