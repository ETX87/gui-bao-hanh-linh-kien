import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { LOAI_DOI_TRU_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";

// Man "Duyet phieu tra" (Ke toan) - port dung renderKeToanDuyet(). KHONG co bulk-action (dung nguyen
// tac segregation of duties da chot: moi phieu phai mo va duyet rieng).

export function KeToanDuyetScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const [rows, setRows] = useState<PhieuTra[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = () => api.get<{ phieu_tra: PhieuTra[] }>("/phieu-tra?trang_thai=cho_ke_toan_duyet").then((r) => { setRows(r.phieu_tra); setLoading(false); });
  useEffect(() => {
    load();
  }, []);

  if (loading) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : r.ktv_nhan) },
    { key: "loai", header: "Loại đối trừ", render: (r) => <Badge tone={r.loai_doi_tru === "tru_cong_no" ? "orange" : "blue"}>{LOAI_DOI_TRU_LABELS[r.loai_doi_tru]}</Badge> },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
  ];

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">💰 Chờ duyệt ({rows.length})</h3>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào chờ duyệt." />
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
