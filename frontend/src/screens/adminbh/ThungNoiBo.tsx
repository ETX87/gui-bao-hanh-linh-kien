import { useEffect, useState } from "react";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, EmptyState } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { SlaBadge } from "../../ui/SlaBadge";
import { TiepNhanNoiBoModal } from "./TiepNhanNoiBoModal";
import { THUNG_DEFS, THUNG_PLACEHOLDER } from "./NhanHoKho";
import { FilterBar, useListFilters, withQuery } from "../../ui/FilterBar";
import { UserName } from "../../hooks/useUserNames";
import type { PhieuGui } from "../../lib/types";

// 31/10/2026: tach khoi "Thùng chờ tiếp nhận nội bộ" ra khoi man Xu ly don -> tab "Chờ Admin nhận" cua man
// chung "Thùng hàng". Man Xu ly don chi con 1 dong nhac (ThungChoNhanLink) de khong mat buoc nay.

export function ThungChoNhanLink() {
  const { counts } = useWorkload();
  const n = counts.admin_cho_tiep_nhan_noi_bo ?? 0;
  if (!n) return null;
  return (
    <a href="#/thung?tab=cho_admin" className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-1.5 text-sm font-semibold text-[var(--blue-800)] hover:bg-[var(--blue-100)]">
      📥 {n} thùng Kho đã nhận, chờ bạn xác nhận tiếp nhận nội bộ <span className="ml-auto text-xs underline">Mở Thùng hàng →</span>
    </a>
  );
}

export function ThungChoNhanNoiBoCard() {
  const { refresh } = useWorkload();
  const thungFlt = useListFilters("/admin/phieu-gui", THUNG_DEFS.map((d) => d.key));
  const {
    items: phieuGui,
    total: phieuGuiTotal,
    page: phieuGuiPage,
    pageCount: phieuGuiPageCount,
    setPage: setPhieuGuiPage,
    reload: reloadPhieuGui,
  } = usePagedApi<PhieuGui>(withQuery("/admin/phieu-gui", thungFlt.query), "phieu_gui");
  const afterChange = () => {
    reloadPhieuGui();
    refresh();
  };
  // Tiep nhan noi bo 1 hoac nhieu thung (12/10/2026) - qua modal de hoi ly do cham khi qua han.
  const [thungChon, setThungChon] = useState<Set<string>>(new Set());
  const [tiepNhanFor, setTiepNhanFor] = useState<PhieuGui[] | null>(null);
  const [viewThung, setViewThung] = useState<PhieuGui | null>(null);
  useEffect(() => setThungChon(new Set()), [phieuGuiPage]);
  const toggleThung = (id: string, on: boolean) =>
    setThungChon((prev) => {
      const n = new Set(prev);
      on ? n.add(id) : n.delete(id);
      return n;
    });

  return (
    <>
      {true && (
        <Card className="px-3 py-2">
          {(phieuGuiTotal > 5 || thungFlt.active > 0) && <FilterBar f={thungFlt} defs={THUNG_DEFS} placeholder={THUNG_PLACEHOLDER} />}
          <div className="flex flex-col md:flex-row md:items-start gap-2">
            <div className="shrink-0 flex flex-wrap items-center gap-2 md:pt-0.5">
              <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📥 Thùng chờ tiếp nhận nội bộ ({phieuGuiTotal})</h3>
              <label className="flex items-center gap-1 text-xs text-[var(--ink-soft)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={phieuGui.length > 0 && phieuGui.every((g) => thungChon.has(g.id))}
                  onChange={(e) => setThungChon(e.target.checked ? new Set(phieuGui.map((g) => g.id)) : new Set())}
                />
                Chọn tất cả
              </label>
              {thungChon.size > 0 && (
                <Btn variant="primary" size="sm" onClick={() => setTiepNhanFor(phieuGui.filter((g) => thungChon.has(g.id)))}>
                  Xác nhận đã nhận {thungChon.size} thùng
                </Btn>
              )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:flex-wrap gap-1.5">
              {phieuGui.map((g) => (
                <div key={g.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pl-2 pr-1 py-0.5 flex items-center gap-2 text-[13px] cursor-pointer hover:bg-[var(--surface)]" onClick={() => setViewThung(g)} title="Bấm để mở thùng xem bên trong">
                  <input type="checkbox" checked={thungChon.has(g.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggleThung(g.id, e.target.checked)} aria-label={`Chọn thùng ${g.id}`} />
                  <span className="font-mono text-xs font-semibold text-[var(--link)] shrink-0">{g.id}</span>
                  <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate max-w-[180px]" />
                  <span className="text-xs text-[var(--ink-soft)] shrink-0">{g.so_don ?? 0} đơn</span>
                  {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Sự cố</Badge>}
                  <span onClick={(e) => e.stopPropagation()}>
                    <SlaBadge since={g.thoi_gian_nhan_kho} entityType="phieu_gui" entityId={g.id} clickable />
                  </span>
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTiepNhanFor([g]);
                    }}
                    className="ml-auto shrink-0"
                  >
                    Xác nhận đã nhận
                  </Btn>
                </div>
              ))}
            </div>
          </div>
          <Pagination page={phieuGuiPage} pageCount={phieuGuiPageCount} total={phieuGuiTotal} onChange={setPhieuGuiPage} />
        </Card>
      )}

      {phieuGuiTotal === 0 && !thungFlt.active && <EmptyState text="Không có thùng nào chờ tiếp nhận nội bộ." />}
      {viewThung && (
        <PhieuGuiDetailModal
          guiId={viewThung.id}
          onClose={() => setViewThung(null)}
          onChanged={afterChange}
          actions={
            <Btn variant="primary" onClick={() => setTiepNhanFor([viewThung])}>
              ✔ Xác nhận đã nhận
            </Btn>
          }
        />
      )}
      {tiepNhanFor && (
        <TiepNhanNoiBoModal
          thung={tiepNhanFor}
          onClose={() => setTiepNhanFor(null)}
          onDone={() => {
            setTiepNhanFor(null);
            setViewThung(null);
            setThungChon(new Set());
            afterChange();
          }}
        />
      )}
    </>
  );
}
