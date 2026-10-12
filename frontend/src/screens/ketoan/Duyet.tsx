import { useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Man "Duyet phieu tra" (Ke toan) - port dung renderKeToanDuyet(). KHONG co bulk-action (dung nguyen
// tac segregation of duties da chot: moi phieu phai mo va duyet rieng). Phan trang that (server
// LIMIT/OFFSET).

export function KeToanDuyetScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuTra>("/phieu-tra?trang_thai=cho_ke_toan_duyet", "phieu_tra");
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && rows.length === 0) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : <UserName email={r.ktv_nhan} />) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "loai", header: "Loại đối trừ", render: (r) => <Badge tone={r.loai_doi_tru === "tru_cong_no" ? "orange" : "blue"}>{LOAI_DOI_TRU_LABELS[r.loai_doi_tru]}</Badge> },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
  ];

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">💰 Chờ duyệt ({total})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào chờ duyệt." />
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
