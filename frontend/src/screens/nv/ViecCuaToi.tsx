import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { LOAI_BAO_HANH_LABELS } from "../../lib/constants";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";

// "Viec cua toi" (NV sua chua) - port dung renderNvViecCuaToi(). Click dong mo UnitDetailModal (da co
// san nut "Chan doan" o footer).

export function NvViecCuaToiScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const [rows, setRows] = useState<DonVi[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = () => api.get<{ don_vi: DonVi[] }>("/nv/viec-cua-toi").then((r) => { setRows(r.don_vi); setLoading(false); });
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner />;

  const effLk = (r: DonVi) => r.ma_lk_thuc_te || r.ma_lk;

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "lbh", header: "Loại BH", render: (r) => (r.loai_bao_hanh ? LOAI_BAO_HANH_LABELS[r.loai_bao_hanh] : "—") },
    { key: "lk", header: "Linh kiện", render: (r) => effLk(r) },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[260px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔧 Việc của tôi ({rows.length})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có việc nào đang chờ." />
      {detailId && (
        <UnitDetailModal
          unitId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            load();
            refresh();
          }}
        />
      )}
    </Card>
  );
}
