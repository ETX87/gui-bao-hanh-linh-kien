import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { TRANG_THAI_PHIEU_GUI_LABELS } from "../../lib/constants";
import { fmtDateOnly } from "../../lib/format";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import type { PhieuGui } from "../../lib/types";

// Man "Gui hang bao hanh" (KTV) - port dung renderKtvTaoPhieu(): danh sach phieu gui cua chinh minh,
// tao phieu nhap moi, mo chi tiet de them don/xac nhan gui.

export function KtvTaoPhieuScreen() {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [rows, setRows] = useState<PhieuGui[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => api.get<{ phieu_gui: PhieuGui[] }>("/phieu-gui").then((r) => { setRows(r.phieu_gui); setLoading(false); });
  useEffect(() => {
    load();
  }, []);

  const afterChange = () => {
    load();
    refresh();
  };

  const taoPhieu = async () => {
    setCreating(true);
    try {
      const r = await api.post<{ id: string }>("/phieu-gui");
      toast("Đã tạo phiếu nháp mới.", "ok");
      afterChange();
      setDetailId(r.id);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <Spinner />;

  const cols: Column<PhieuGui>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_PHIEU_GUI_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    { key: "ngay", header: "Ngày tạo", render: (r) => fmtDateOnly(r.ngay_tao) },
    { key: "hinhthuc", header: "Hình thức gửi", render: (r) => r.hinh_thuc_gui || "—" },
    { key: "sucos", header: "Sự cố", render: (r) => (r.su_co_tiep_nhan ? <Badge tone="red">⚠ Có</Badge> : "—") },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">📦 Phiếu gửi hàng của tôi ({rows.length})</h3>
        <Btn variant="primary" disabled={creating} onClick={taoPhieu}>
          + Tạo phiếu mới
        </Btn>
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Chưa có phiếu gửi nào." />
      {detailId && <PhieuGuiDetailModal guiId={detailId} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </Card>
  );
}
