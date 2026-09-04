import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { LOAI_DOI_TRU_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";

// Man "Dong goi & gui phieu tra bao hanh" (Kho) - port dung renderKhoDongGoi(): chua Ke toan duyet
// (da_duyet_ke_toan) can dong goi/gui, + "da_gui" cho Kho co the xac nhan ket thuc du phong (dung cho
// MOI phieu tra, khong chi khach le - dung "Phan hoi vong 2" da chot 21/08/2026).

export function KhoDongGoiScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const [choDongGoi, setChoDongGoi] = useState<PhieuTra[]>([]);
  const [daGui, setDaGui] = useState<PhieuTra[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([api.get<{ phieu_tra: PhieuTra[] }>("/phieu-tra?trang_thai=da_duyet_ke_toan"), api.get<{ phieu_tra: PhieuTra[] }>("/phieu-tra?trang_thai=da_gui")]);
    setChoDongGoi(a.phieu_tra);
    setDaGui(b.phieu_tra);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const afterChange = () => {
    load();
    refresh();
  };

  if (loading) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : r.ktv_nhan) },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "vandon", header: "Mã vận đơn", render: (r) => r.ma_van_don || "—" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">📦 Chờ đóng gói & gửi ({choDongGoi.length})</h3>
        <Table columns={cols} rows={choDongGoi} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào chờ đóng gói." />
      </Card>
      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">Đã gửi — chờ KTV xác nhận (Kho có thể xác nhận thay, dự phòng)</h3>
        <Table columns={cols} rows={daGui} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào đang chờ." />
      </Card>
      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
