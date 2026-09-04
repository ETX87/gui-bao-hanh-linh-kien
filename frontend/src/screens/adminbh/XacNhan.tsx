import { useState } from "react";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";

// Hang doi "Xac nhan hoan tat" (sau khi NV nop ket qua chan doan) - port dung GET /admin/xac-nhan.
// Click dong mo UnitDetailModal (da co san nut "Xac nhan hoan tat / Yeu cau lam lai" o footer). Phan
// trang that (server LIMIT/OFFSET).

export function AdminXacNhanScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>("/admin/xac-nhan", "don_vi");
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && rows.length === 0) return <Spinner />;

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "hxl", header: "Hướng xử lý", render: (r) => r.huong_xu_ly },
    { key: "nv", header: "NV phụ trách", render: (r) => r.nguoi_sua_chua },
    { key: "kq", header: "Kết quả chẩn đoán", render: (r) => r.ket_qua_chan_doan },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">✔️ Chờ Admin BH xác nhận hoàn tất ({total})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có đơn nào chờ xác nhận." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <UnitDetailModal
          unitId={detailId}
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
