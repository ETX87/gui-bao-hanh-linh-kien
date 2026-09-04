import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";

// "Xac nhan nhan hang tra" (KTV) - port dung renderKtvNhanHang().

export function KtvNhanHangScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const [rows, setRows] = useState<PhieuTra[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = () => api.get<{ phieu_tra: PhieuTra[] }>("/phieu-tra?trang_thai=da_gui").then((r) => { setRows(r.phieu_tra); setLoading(false); });
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "vandon", header: "Mã vận đơn", render: (r) => r.ma_van_don || "—" },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">📬 Hàng trả đang chờ xác nhận nhận ({rows.length})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào đang chờ." />
      {detailId && (
        <PhieuTraDetailModal
          traId={detailId}
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
