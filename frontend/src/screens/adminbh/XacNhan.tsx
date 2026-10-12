import { useEffect, useState } from "react";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Badge, Btn, Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { BulkXacNhanHoanTatModal } from "./BulkXacNhanHoanTatModal";
import { HUONG_XU_LY_LABELS, KET_QUA_CHAN_DOAN_LABELS } from "../../lib/constants";
import type { AppUser, DonVi } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Hang doi "Xac nhan hoan tat" (sau khi NV nop ket qua chan doan) - port dung GET /admin/xac-nhan.
// Click dong mo UnitDetailModal (da co san nut "Xac nhan hoan tat / Yeu cau lam lai" o footer). Phan
// trang that (server LIMIT/OFFSET). 12/10/2026 (de xuat #12): chon nhieu dong -> xac nhan hang loat.

export function AdminXacNhanScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>("/admin/xac-nhan", "don_vi");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  useEffect(() => setSelected(new Set()), [page]);

  if (loading && rows.length === 0) return <Spinner />;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev);
      on ? n.add(id) : n.delete(id);
      return n;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const afterChange = () => {
    reload();
    refresh();
  };

  const cols: Column<DonVi>[] = [
    {
      key: "id",
      header: "ID",
      render: (r) => (
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={selected.has(r.id)}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => toggle(r.id, e.target.checked)}
            aria-label={`Chọn ${r.id}`}
          />
          <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span>
        </span>
      ),
    },
    { key: "hxl", header: "Hướng xử lý", render: (r) => (r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "—") },
    { key: "nv", header: "NV phụ trách", render: (r) => <UserName email={r.nguoi_sua_chua} /> },
    { key: "kq", header: "Kết quả chẩn đoán", render: (r) => (r.ket_qua_chan_doan ? KET_QUA_CHAN_DOAN_LABELS[r.ket_qua_chan_doan] || r.ket_qua_chan_doan : "—") },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">✔️ Chờ Admin BH xác nhận hoàn tất ({total})</h3>
        {rows.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-[var(--ink-soft)] cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
            Chọn tất cả đang hiển thị
          </label>
        )}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="blue">{selected.size} đã chọn</Badge>
            <Btn onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
            <Btn variant="success" onClick={() => setBulkOpen(true)}>
              ✔️ Xác nhận hoàn tất {selected.size} đơn
            </Btn>
          </div>
        )}
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có đơn nào chờ xác nhận." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {bulkOpen && (
        <BulkXacNhanHoanTatModal
          units={rows.filter((r) => selected.has(r.id))}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
            setSelected(new Set());
            afterChange();
          }}
        />
      )}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </Card>
  );
}
