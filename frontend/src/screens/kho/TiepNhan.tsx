import { useEffect, useState } from "react";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { FilterBar, useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { HINH_THUC_GUI_LABELS } from "../../lib/constants";
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
import { KhoTuChoiThungModal } from "./KhoTuChoiThungModal";
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

const DEFS: FilterDef[] = [
  { key: "ktv", label: "KTV gửi", kind: "person" },
  { key: "tao_ho", label: "Người tạo hộ", kind: "person", noneLabel: "KTV tự tạo" },
  { key: "hinh_thuc_gui", label: "Hình thức gửi", kind: "map", labels: HINH_THUC_GUI_LABELS },
  { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" },
  CANH_BAO_DEF,
  KHOANG_DEF,
];

// 31/10/2026: dung lam noi dung tab o man chung "Thùng hàng" - only = phan can hien.
export type KhoPhan = "cho_nhan" | "ban_giao" | "gan_day";
export function KhoTiepNhanScreen({ only }: { only?: KhoPhan } = {}) {
  const hien = (k: KhoPhan) => !only || only === k;
  const toast = useToast();
  const { refresh } = useWorkload();
  const flt = useListFilters("/kho/phieu-gui?trang_thai=da_gui", DEFS.map((d) => d.key));
  const { items: pending, total: pendingTotal, page, pageCount, setPage, loading, reload: reloadPending } = usePagedApi<PhieuGui>(withQuery("/kho/phieu-gui?trang_thai=da_gui", flt.query), "phieu_gui");
  // 09/10/2026: "Vai tro kho thieu nhac giai doan cho ban giao cho Admin sua chua" - thung Kho da
  // nhan nhung Admin BH chua xac nhan tiep nhan noi bo (Kho can mang hang sang/nhac Admin BH).
  const banGiao = usePagedApi<PhieuGui>(withQuery("/kho/phieu-gui?trang_thai=cho_ban_giao", flt.query), "phieu_gui");
  const [recent, setRecent] = useState<PhieuGui[]>([]);
  const [suCoFor, setSuCoFor] = useState<PhieuGui | null>(null);
  const [tcFor, setTcFor] = useState<PhieuGui | null>(null);
  const [tiepNhanFor, setTiepNhanFor] = useState<PhieuGui | null>(null);
  const [logFor, setLogFor] = useState<string | null>(null);
  // 21/10/2026: "thùng hàng chờ tiếp nhận, cho phép click vào để mở nội dung thùng hàng ra để xem và tiếp
  // nhận bên trong luôn" - bam dong mo chi tiet thung (danh sach don ben trong), nut tiep nhan o footer.
  const [viewFor, setViewFor] = useState<PhieuGui | null>(null);
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

  if (hien("cho_nhan") && loading && pending.length === 0 && !flt.active) return <Spinner />;

  return (
    <div className="space-y-3">
      {only !== "gan_day" && <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã thùng, vận đơn, nhà xe, KTV, mã case, tên khách, linh kiện bên trong…" />}
      {hien("cho_nhan") && <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📥 Chờ tiếp nhận ({pendingTotal})</h3>
          <Btn onClick={() => setScanOpen(true)}>📷 Quét bằng camera</Btn>
        </div>
        {pending.length === 0 ? (
          <EmptyState text={flt.active ? "Không có thùng nào khớp bộ lọc." : "Không có thùng nào chờ tiếp nhận."} />
        ) : (
          <div className="space-y-1">
            {pending.map((g) => (
              // flex-col tren mobile (Phat hien 5 vong ra soat UX): ban cu la 1 hang flex cung nen
              // nut "Xac nhan tiep nhan" bi day ra ngoai man, Kho khong bam duoc tren dien thoai.
              <div key={g.id} className="rounded-lg border border-[var(--line)] px-2.5 py-1 flex flex-col sm:flex-row sm:items-center gap-2 text-[13px] cursor-pointer hover:bg-[var(--surface-2)]" onClick={() => setViewFor(g)} title="Bấm để mở thùng xem bên trong">
                {/* 09/10/2026: nut xu ly uu tien dat ngay sau ma ID (ben trai). */}
                <span className="font-mono text-xs font-semibold text-[var(--link)] sm:w-24 shrink-0">{g.id}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <DoiMienBadge kind="phieu-gui" id={g.id} mien={g.mien} ktvEmail={g.nguoi_tao} onDone={reloadPending} short />
                </span>
                <div className="flex flex-wrap gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Btn size="sm" variant="primary" onClick={() => setTiepNhanFor(g)}>
                    Xác nhận tiếp nhận
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => setSuCoFor(g)}>
                    Báo sự cố
                  </Btn>
                  <Btn size="sm" variant="ghost" className="text-[var(--red-700)]" title="Thực tế chưa nhận được thùng này — trả về KTV + cảnh báo" onClick={() => setTcFor(g)}>
                    ⛔ Chưa nhận được
                  </Btn>
                  <Btn size="sm" onClick={() => setLogFor(g.id)}>💬</Btn>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 flex-1 min-w-0">
                  <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate" />
                  {g.so_don != null && <span className="text-xs text-[var(--ink-soft)]">{g.so_don} đơn</span>}
                  {(g.kho_tc_lan ?? 0) > 0 && <Badge tone="red">⛔ Từng bị từ chối {g.kho_tc_lan} lần</Badge>}
                  <span className="text-xs text-[var(--ink-soft)]">{g.don_vi_van_chuyen}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <SlaBadge since={g.updated_at} entityType="phieu_gui" entityId={g.id} clickable />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={page} pageCount={pageCount} total={pendingTotal} onChange={setPage} />
      </Card>}

      {hien("ban_giao") && (banGiao.total > 0 || only === "ban_giao") && (
        <Card className="p-3 border-l-4 border-l-[var(--blue-500)]">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2 truncate">
            🤝 Chờ bàn giao cho Admin bảo hành ({banGiao.total})
            <span className="ml-2 hidden md:inline text-xs font-normal text-[var(--ink-soft)]">Kho đã nhận, Admin BH chưa bấm "Xác nhận đã nhận" — mang thùng sang và nhắc. Giờ tính từ lúc Kho nhận.</span>
          </h3>
          {banGiao.items.length === 0 && <EmptyState text="Không có thùng nào chờ bàn giao cho Admin." />}
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

      {hien("gan_day") && <Card className="p-3">
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
      </Card>}

      {viewFor && (
        <PhieuGuiDetailModal
          guiId={viewFor.id}
          onClose={() => setViewFor(null)}
          onChanged={afterChange}
          actions={
            viewFor.trang_thai === "da_gui" ? (
              <>
                <Btn variant="ghost" className="text-[var(--red-700)]" onClick={() => setTcFor(viewFor)}>
                  ⛔ Chưa nhận được hàng
                </Btn>
                <Btn variant="danger" onClick={() => setSuCoFor(viewFor)}>
                  Báo sự cố
                </Btn>
                <Btn variant="primary" onClick={() => setTiepNhanFor(viewFor)}>
                  ✔ Xác nhận tiếp nhận
                </Btn>
              </>
            ) : undefined
          }
        />
      )}
      {tcFor && <KhoTuChoiThungModal gui={tcFor} onClose={() => setTcFor(null)} onDone={() => { setTcFor(null); setViewFor(null); afterChange(); }} />}
      {suCoFor && <BaoSuCoModal gui={suCoFor} onClose={() => setSuCoFor(null)} onDone={() => { setSuCoFor(null); setViewFor(null); afterChange(); }} />}
      {tiepNhanFor && <TiepNhanModal gui={tiepNhanFor} onClose={() => setTiepNhanFor(null)} onDone={() => { setTiepNhanFor(null); setViewFor(null); afterChange(); }} />}
      {logFor && <GhiChuLogModal guiId={logFor} onClose={() => setLogFor(null)} />}
      {scanOpen && <CameraScanModal onClose={() => setScanOpen(false)} onScanned={handleScanned} />}
    </div>
  );
}
