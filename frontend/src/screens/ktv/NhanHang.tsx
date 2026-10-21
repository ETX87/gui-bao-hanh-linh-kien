import { useState } from "react";
import { FilterBar, useListFilters, withQuery } from "../../ui/FilterBar";
import { phieuTraDefs } from "../shared/phieuTraFilters";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";

// "Xac nhan nhan hang tra" (KTV) - port dung renderKtvNhanHang().
// Phan trang that (Phat hien 7 vong ra soat UX): ban cu doc thang r.phieu_tra roi hien {rows.length}
// KHONG co nut trang - KTV co >20 phieu tra cho nhan thi 20 phieu con lai vo hinh (endpoint bi cat
// o limit=20). Nay dung usePagedApi + Pagination nhu phan con lai cua app.

export function KtvNhanHangScreen({ user, initialDetailId }: { user: AppUser; initialDetailId?: string }) {
  const { refresh } = useWorkload();
  const DEFS = phieuTraDefs({ nguoiNhan: false });
  const flt = useListFilters("/phieu-tra?trang_thai=da_gui", DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuTra>(withQuery("/phieu-tra?trang_thai=da_gui", flt.query), "phieu_tra");
  // Link truy cap truc tiep theo ID (them 2026-09-09, xem App.tsx::Routed + lib/deepLink.ts) - mo San
  // modal chi tiet ngay khi mount, KHONG phu thuoc phieu do co nam trong trang hien tai cua danh sach
  // hay khong (PhieuTraDetailModal tu GET /phieu-tra/:id rieng, doc lap voi usePagedApi o tren).
  const [detailId, setDetailId] = useState<string | null>(initialDetailId ?? null);

  if (loading && rows.length === 0 && !flt.active) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "vandon", header: "Mã vận đơn", render: (r) => r.ma_van_don || "—" },
  ];

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">📬 Hàng trả đang chờ xác nhận nhận ({total})</h3>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã phiếu, mã ĐH, vận đơn, mã đơn / case / linh kiện bên trong…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có phiếu nào khớp bộ lọc." : "Không có phiếu trả nào đang chờ."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <PhieuTraDetailModal
          traId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            reload();
            refresh();
          }}
        />
      )}
    </Card>
  );
}
