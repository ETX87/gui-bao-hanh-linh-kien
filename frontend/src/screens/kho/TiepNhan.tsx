import { useEffect, useState } from "react";
import { DoiMienBadge } from "../../ui/MienBadge";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, EmptyState } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { SlaBadge } from "../../ui/SlaBadge";
import { fmtDate } from "../../lib/format";
import { BaoSuCoModal } from "./BaoSuCoModal";
import { TiepNhanModal } from "./TiepNhanModal";
import { CameraScanModal } from "./CameraScanModal";
import { GhiChuLogModal } from "../shared/GhiChuLogModal";
import type { PhieuGui } from "../../lib/types";
import { UserName, displayName } from "../../hooks/useUserNames";

// Man "Diem tiep nhan kho" - tiep nhan o muc THUNG (khong mo kiem tung linh kien), port dung
// khoXacNhanTiepNhan()/submitSuCo(). Quet camera (jsQR that, port lai o "QA vong 2" - da bo o Giai
// doan 4) chi dung de XAC DINH NHANH dung phieu (mo san TiepNhanModal), KHONG tu dong xac nhan nhan
// hang - van can nguoi dung chu dong bam "Xac nhan tiep nhan" trong modal, dung tinh than kiem soat
// noi bo da chot tu prototype. "Cho tiep nhan" phan trang that (co the dai) - "Da tiep nhan gan day"
// CO CHU DICH khong phan trang (backend luon tra dung 8 dong gan nhat, khong phai lich su day du).

export function KhoTiepNhanScreen() {
  const toast = useToast();
  const { refresh } = useWorkload();
  const { items: pending, total: pendingTotal, page, pageCount, setPage, loading, reload: reloadPending } = usePagedApi<PhieuGui>("/kho/phieu-gui?trang_thai=da_gui", "phieu_gui");
  // 09/10/2026: "Vai tro kho thieu nhac giai doan cho ban giao cho Admin sua chua" - thung Kho da
  // nhan nhung Admin BH chua xac nhan tiep nhan noi bo (Kho can mang hang sang/nhac Admin BH).
  const banGiao = usePagedApi<PhieuGui>("/kho/phieu-gui?trang_thai=cho_ban_giao", "phieu_gui");
  const [recent, setRecent] = useState<PhieuGui[]>([]);
  const [suCoFor, setSuCoFor] = useState<PhieuGui | null>(null);
  const [tiepNhanFor, setTiepNhanFor] = useState<PhieuGui | null>(null);
  const [logFor, setLogFor] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const loadRecent = () => api.get<{ phieu_gui: PhieuGui[] }>("/kho/phieu-gui?trang_thai=da_tiep_nhan").then((r) => setRecent(r.phieu_gui));
  useEffect(() => {
    loadRecent();
  }, []);

  const afterChange = () => {
    reloadPending();
    banGiao.reload();
    loadRecent();
    refresh();
  };

  const handleScanned = (text: string) => {
    setScanOpen(false);
    const code = text.trim();
    const found = pending.find((g) => g.id === code);
    if (found) {
      toast(`Đã quét đúng phiếu ${found.id} (${displayName(found.nguoi_tao)}).`, "ok");
      setTiepNhanFor(found);
    } else if (recent.some((g) => g.id === code)) {
      toast("Phiếu này đã được tiếp nhận rồi.", "error");
    } else {
      toast("Không khớp phiếu nào đang chờ tiếp nhận trên trang hiện tại — kiểm tra lại mã QR hoặc chuyển trang.", "error");
    }
  };

  if (loading && pending.length === 0) return <Spinner />;

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📥 Chờ tiếp nhận ({pendingTotal})</h3>
          <Btn onClick={() => setScanOpen(true)}>📷 Quét bằng camera</Btn>
        </div>
        {pending.length === 0 ? (
          <EmptyState text="Không có thùng nào chờ tiếp nhận." />
        ) : (
          <div className="space-y-1">
            {pending.map((g) => (
              // flex-col tren mobile (Phat hien 5 vong ra soat UX): ban cu la 1 hang flex cung nen
              // nut "Xac nhan tiep nhan" bi day ra ngoai man, Kho khong bam duoc tren dien thoai.
              <div key={g.id} className="rounded-lg border border-[var(--line)] px-2.5 py-1 flex flex-col sm:flex-row sm:items-center gap-2 text-[13px]">
                {/* 09/10/2026: nut xu ly uu tien dat ngay sau ma ID (ben trai). */}
                <span className="font-mono text-xs font-semibold text-[var(--link)] sm:w-24 shrink-0">{g.id}</span>
                <DoiMienBadge kind="phieu-gui" id={g.id} mien={g.mien} ktvEmail={g.nguoi_tao} onDone={reloadPending} short />
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  <Btn size="sm" variant="primary" onClick={() => setTiepNhanFor(g)}>
                    Xác nhận tiếp nhận
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => setSuCoFor(g)}>
                    Báo sự cố
                  </Btn>
                  <Btn size="sm" onClick={() => setLogFor(g.id)}>💬</Btn>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 flex-1 min-w-0">
                  <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate" />
                  <span className="text-xs text-[var(--ink-soft)]">{g.don_vi_van_chuyen}</span>
                  <SlaBadge since={g.updated_at} entityType="phieu_gui" entityId={g.id} clickable />
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} pageCount={pageCount} total={pendingTotal} onChange={setPage} />
      </Card>

      {banGiao.total > 0 && (
        <Card className="p-3 border-l-4 border-l-[var(--blue-500)]">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2 truncate">
            🤝 Chờ bàn giao cho Admin bảo hành ({banGiao.total})
            <span className="ml-2 hidden md:inline text-xs font-normal text-[var(--ink-soft)]">Kho đã nhận, Admin BH chưa bấm "Xác nhận đã nhận" — mang thùng sang và nhắc. Giờ tính từ lúc Kho nhận.</span>
          </h3>
          <div className="space-y-1">
            {banGiao.items.map((g) => (
              <div key={g.id} className="flex items-center flex-wrap gap-x-3 gap-y-1 rounded-lg border border-[var(--line)] px-2.5 py-1 text-[13px] hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => setLogFor(g.id)}>
                <span className="font-mono text-xs font-semibold text-[var(--link)]">{g.id}</span>
                <DoiMienBadge kind="phieu-gui" id={g.id} mien={g.mien} ktvEmail={g.nguoi_tao} onDone={banGiao.reload} short />
                <UserName email={g.nguoi_tao} className="flex-1 min-w-0 truncate text-[var(--ink-body)]" />
                {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Có sự cố</Badge>}
                <span className="text-xs text-[var(--ink-soft)]">Kho nhận: {fmtDate(g.thoi_gian_nhan_kho)}</span>
                <SlaBadge since={g.thoi_gian_nhan_kho} />
              </div>
            ))}
          </div>
          <Pagination page={banGiao.page} pageCount={banGiao.pageCount} total={banGiao.total} onChange={banGiao.setPage} />
        </Card>
      )}

      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">Đã tiếp nhận gần đây</h3>
        {recent.length === 0 ? (
          <EmptyState text="Chưa tiếp nhận thùng nào." />
        ) : (
          <div className="space-y-0.5">
            {recent.map((g) => (
              <div key={g.id} className="flex items-center flex-wrap gap-x-3 gap-y-1 rounded-lg px-2.5 py-1 text-[13px] hover:bg-[var(--surface-2)] cursor-pointer" onClick={() => setLogFor(g.id)}>
                <span className="font-mono text-xs font-semibold text-[var(--link)]">{g.id}</span>
                <DoiMienBadge kind="phieu-gui" id={g.id} mien={g.mien} ktvEmail={g.nguoi_tao} onDone={loadRecent} short />
                <UserName email={g.nguoi_tao} className="flex-1 min-w-0 truncate text-[var(--ink-soft)]" />
                {/* !! bat buoc - D1 tra ve so 0/1 chu khong phai true/false that, "0 && <Badge/>" se render chu "0" ra man hinh */}
                {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Có sự cố</Badge>}
                {!!g.admin_tiep_nhan && <Badge tone="green">Admin BH đã nhận</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {suCoFor && <BaoSuCoModal gui={suCoFor} onClose={() => setSuCoFor(null)} onDone={() => { setSuCoFor(null); afterChange(); }} />}
      {tiepNhanFor && <TiepNhanModal gui={tiepNhanFor} onClose={() => setTiepNhanFor(null)} onDone={() => { setTiepNhanFor(null); afterChange(); }} />}
      {logFor && <GhiChuLogModal guiId={logFor} onClose={() => setLogFor(null)} />}
      {scanOpen && <CameraScanModal onClose={() => setScanOpen(false)} onScanned={handleScanned} />}
    </div>
  );
}
