import { useState } from "react";
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

export function KtvNhanHangScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuTra>("/phieu-tra?trang_thai=da_gui", "phieu_tra");
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && rows.length === 0) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "vandon", header: "Mã vận đơn", render: (r) => r.ma_van_don || "—" },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">📬 Hàng trả đang chờ xác nhận nhận ({total})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào đang chờ." />
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
