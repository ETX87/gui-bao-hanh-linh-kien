import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_PHIEU_GUI_LABELS } from "../../lib/constants";
import { fmtDateOnly } from "../../lib/format";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import type { PhieuGui } from "../../lib/types";

// Man "Gui hang bao hanh" (KTV) - port dung renderKtvTaoPhieu(): danh sach phieu gui cua chinh minh,
// tao phieu nhap moi, mo chi tiet de them don/xac nhan gui. Phan trang that (server LIMIT/OFFSET, xem
// hooks/usePagedApi.ts) - port dung yeu cau "tat ca du lieu dang bang deu phan trang" (05/09/2026).

export function KtvTaoPhieuScreen() {
  const toast = useToast();
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuGui>("/phieu-gui", "phieu_gui");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const afterChange = () => {
    reload();
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

  if (loading && rows.length === 0) return <Spinner />;

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
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">📦 Phiếu gửi hàng của tôi ({total})</h3>
        <Btn variant="primary" disabled={creating} onClick={taoPhieu}>
          + Tạo phiếu mới
        </Btn>
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Chưa có phiếu gửi nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && <PhieuGuiDetailModal guiId={detailId} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </Card>
  );
}
