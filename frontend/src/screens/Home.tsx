import { useRoute } from "../router/Router";
import { useWorkload, type WorkloadCounts } from "../hooks/useWorkload";
import { routesForUser } from "../layout/routes";
import { Card, StatCard } from "../ui/primitives";
import type { AppUser } from "../lib/types";

// Trang chu - "Viec cua toi" (chi hien muc co viec, tone coral, port dung MyWorkloadStrip) + luoi
// StatCard day du moi hang doi theo dung vai tro dang dang nhap (ke ca muc =0, lam mo - nguyen tac
// "mute khi = 0" da chot xuyen suot du an, tranh bao dong gia khi quet nhanh nhieu the).

const LABELS: Record<keyof WorkloadCounts, string> = {
  ktv_phieu_nhap: "Phiếu gửi còn nháp",
  ktv_cho_bo_sung: "Đơn cần bổ sung thông tin",
  ktv_nhan_hang: "Hàng trả chờ xác nhận nhận",
  kho_cho_tiep_nhan: "Thùng chờ tiếp nhận",
  kho_cho_dong_goi: "Phiếu trả chờ đóng gói/gửi",
  admin_cho_tiep_nhan_noi_bo: "Thùng chờ tiếp nhận nội bộ",
  admin_cho_xac_nhan_sl: "Đơn cha chờ xác nhận SL",
  admin_cho_phan_loai: "Đơn vị chờ xử lý",
  admin_cho_xac_nhan_hoan_tat: "Chờ xác nhận hoàn tất",
  admin_san_sang_gom: "Đơn vị sẵn sàng gộp phiếu trả",
  nv_cho_chan_doan: "Việc chờ chẩn đoán",
  ketoan_cho_duyet: "Phiếu trả chờ duyệt",
};

const HASH_OF: Partial<Record<keyof WorkloadCounts, string>> = {
  ktv_phieu_nhap: "/ktv/tao-phieu",
  ktv_cho_bo_sung: "/ktv/tra-cuu",
  ktv_nhan_hang: "/ktv/nhan-hang",
  kho_cho_tiep_nhan: "/kho/tiep-nhan",
  kho_cho_dong_goi: "/kho/dong-goi",
  admin_cho_tiep_nhan_noi_bo: "/admin/phan-loai",
  admin_cho_xac_nhan_sl: "/admin/phan-loai",
  admin_cho_phan_loai: "/admin/phan-loai",
  admin_cho_xac_nhan_hoan_tat: "/admin/xac-nhan",
  admin_san_sang_gom: "/admin/phieu-tra",
  nv_cho_chan_doan: "/nv/viec-cua-toi",
  ketoan_cho_duyet: "/ketoan/duyet",
};

export function HomeScreen({ user }: { user: AppUser }) {
  const { counts, loading } = useWorkload();
  const { nav } = useRoute();
  const routeHashes = new Set(routesForUser(user).map((r) => r.hash));
  const relevantKeys = (Object.keys(LABELS) as (keyof WorkloadCounts)[]).filter((k) => HASH_OF[k] && routeHashes.has(HASH_OF[k]!));
  const myWork = relevantKeys.filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a]);

  // Phat hien 16: khong hien "0" gia lap luc dang tai - hien skeleton cho toi khi co so lieu that.
  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">Tổng quan hàng đợi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {relevantKeys.map((k) => (
              <div key={k} className="p-4 rounded-xl bg-[var(--surface-100)] animate-pulse">
                <div className="h-3 w-2/3 rounded bg-[var(--surface-200)] mb-3" />
                <div className="h-7 w-10 rounded bg-[var(--surface-200)]" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {myWork.length > 0 && (
        <Card className="p-5 border-l-4 !border-l-[var(--coral-600)]">
          <h3 className="font-display font-bold text-sm text-[var(--coral-700)] mb-3">🔥 Việc của tôi</h3>
          <div className="flex flex-wrap gap-2">
            {myWork.map((k) => (
              <button
                key={k}
                onClick={() => nav(HASH_OF[k]!)}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-[var(--coral-100)] text-[var(--coral-700)] px-3.5 py-1.5 text-xs font-bold hover:bg-[var(--coral-400)]/30 transition-colors"
              >
                {LABELS[k]} <span className="rounded-full bg-[var(--coral-600)] text-white w-5 h-5 flex items-center justify-center text-[10px]">{counts[k]}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">Tổng quan hàng đợi</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {relevantKeys.map((k) => (
            <StatCard key={k} label={LABELS[k]} value={counts[k]} tone={counts[k] > 0 ? "blue" : "gray"} onClick={() => nav(HASH_OF[k]!)} />
          ))}
        </div>
      </Card>
    </div>
  );
}
