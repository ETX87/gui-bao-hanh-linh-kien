import { useState } from "react";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_BAO_HANH_LABELS } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";

// "Viec cua toi" (NV sua chua) - port dung renderNvViecCuaToi(). Click dong mo UnitDetailModal (da co
// san nut "Chan doan" o footer). Phan trang that (server LIMIT/OFFSET).

export function NvViecCuaToiScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>("/nv/viec-cua-toi", "don_vi");
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && rows.length === 0) return <Spinner />;

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "lbh", header: "Loại BH", render: (r) => (r.loai_bao_hanh ? LOAI_BAO_HANH_LABELS[r.loai_bao_hanh] : "—") },
    { key: "lk", header: "Linh kiện", render: (r) => nameOf(r.ma_lk_thuc_te || r.ma_lk) },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[260px] truncate", render: (r) => r.mo_ta_loi || "—" },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔧 Việc của tôi ({total})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có việc nào đang chờ." />
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
