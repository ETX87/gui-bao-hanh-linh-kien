import { useState } from "react";
import { useRoute } from "../router/Router";
import { useIsMobile } from "../hooks/useIsMobile";
import { useWorkload, type WorkloadCounts } from "../hooks/useWorkload";
import { routesForUser } from "../layout/routes";
import { Card, StatCard } from "../ui/primitives";
import type { AppUser } from "../lib/types";

// Trang chu - "Viec cua toi" (chi hien muc co viec, tone coral, port dung MyWorkloadStrip) + luoi
// StatCard day du moi hang doi theo dung vai tro dang dang nhap (ke ca muc =0, lam mo - nguyen tac
// "mute khi = 0" da chot xuyen suot du an, tranh bao dong gia khi quet nhanh nhieu the).

const LABELS: Record<keyof WorkloadCounts, string> = {
  ktv_phieu_nhap: "Phiếu gửi còn nháp",
  ktv_odoo_cho_gui: "Đơn Odoo chờ gửi sửa",
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
  ktv_odoo_cho_gui: "/ktv/tao-phieu",
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

const ICON_OF: Record<keyof WorkloadCounts, string> = {
  ktv_phieu_nhap: "📦",
  ktv_odoo_cho_gui: "🧾",
  ktv_cho_bo_sung: "✍️",
  ktv_nhan_hang: "📬",
  kho_cho_tiep_nhan: "📥",
  kho_cho_dong_goi: "📤",
  admin_cho_tiep_nhan_noi_bo: "🚚",
  admin_cho_xac_nhan_sl: "🔢",
  admin_cho_phan_loai: "🗂️",
  admin_cho_xac_nhan_hoan_tat: "✔️",
  admin_san_sang_gom: "↩️",
  nv_cho_chan_doan: "🔧",
  ketoan_cho_duyet: "💰",
};

// Tone KPI theo nhom nghiep vu (DESIGN_SYSTEM.md §2.5): viec dang CHO minh xu ly = amber, viec cua
// nguoi khac/tham khao = blue, sap xong/san sang = brand. So 0 tu chuyen slate (mo).
const TONE_OF: Record<keyof WorkloadCounts, "amber" | "blue" | "brand" | "red"> = {
  ktv_phieu_nhap: "amber",
  ktv_odoo_cho_gui: "red",
  ktv_cho_bo_sung: "red",
  ktv_nhan_hang: "brand",
  kho_cho_tiep_nhan: "amber",
  kho_cho_dong_goi: "amber",
  admin_cho_tiep_nhan_noi_bo: "blue",
  admin_cho_xac_nhan_sl: "blue",
  admin_cho_phan_loai: "amber",
  admin_cho_xac_nhan_hoan_tat: "amber",
  admin_san_sang_gom: "brand",
  nv_cho_chan_doan: "amber",
  ketoan_cho_duyet: "amber",
};

function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function HomeScreen({ user }: { user: AppUser }) {
  const { counts, loading } = useWorkload();
  const { nav } = useRoute();
  const routeHashes = new Set(routesForUser(user).map((r) => r.hash));
  const relevantKeys = (Object.keys(LABELS) as (keyof WorkloadCounts)[]).filter((k) => HASH_OF[k] && routeHashes.has(HASH_OF[k]!));
  const myWork = relevantKeys.filter((k) => counts[k] > 0).sort((a, b) => counts[b] - counts[a]);
  const total = myWork.reduce((s, k) => s + counts[k], 0);
  // DESIGN_SYSTEM.md §8.4: danh sach dai tren mobile chi hien vai muc dau + "Xem them".
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);
  const MOBILE_LIMIT = 4;
  const pills = isMobile && !showAll ? myWork.slice(0, MOBILE_LIMIT) : myWork;

  return (
    <>
      {/* Hero (DESIGN_SYSTEM.md §4) - "Viec cua toi" noi bat nhat trang, chi hien muc co viec. */}
      <section className="rounded-[14px] bg-hero text-white shadow-brand p-5 md:p-6">
        <p className="text-sm text-white/80 capitalize">{todayLabel()}</p>
        <h2 className="mt-1 text-xl md:text-[21px] font-bold">
          {loading ? "Đang tải việc của bạn…" : total > 0 ? `🔥 Bạn có ${total} việc cần làm` : "✨ Không có việc nào đang chờ bạn"}
        </h2>
        {!loading && myWork.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pills.map((k) => (
              <button
                key={k}
                onClick={() => nav(HASH_OF[k]!)}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 ring-1 ring-inset ring-white/25 px-3.5 py-2 text-sm font-semibold transition-colors"
              >
                <span>{ICON_OF[k]}</span>
                {LABELS[k]}
                <span className="rounded-full bg-white text-[var(--accent-ink)] min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-xs font-extrabold">{counts[k]}</span>
              </button>
            ))}
            {isMobile && myWork.length > MOBILE_LIMIT && (
              <button onClick={() => setShowAll((v) => !v)} className="focus-ring rounded-full px-3.5 py-2 text-sm font-semibold text-white underline underline-offset-2">
                {showAll ? "Thu gọn" : `Xem thêm ${myWork.length - MOBILE_LIMIT} mục`}
              </button>
            )}
          </div>
        )}
      </section>

      <Card className="p-4 md:p-5" title="Tổng quan hàng đợi">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {relevantKeys.map((k) =>
            loading ? (
              <div key={k} className="h-[128px] rounded-[14px] bg-[var(--surface-2)] animate-pulse" />
            ) : (
              <StatCard key={k} label={LABELS[k]} value={counts[k]} tone={TONE_OF[k]} icon={ICON_OF[k]} onClick={() => nav(HASH_OF[k]!)} />
            ),
          )}
        </div>
      </Card>
    </>
  );
}
