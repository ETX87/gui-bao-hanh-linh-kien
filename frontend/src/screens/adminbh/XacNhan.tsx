import { useLkName } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
import { ExcelToolbar, type FilterCol } from "../../ui/ColumnFilter";
import { useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Badge, Btn, Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { BulkXacNhanHoanTatModal } from "./BulkXacNhanHoanTatModal";
import { HUONG_XU_LY_LABELS, ketQuaLabel, KET_QUA_NV_OPTIONS } from "../../lib/constants";
const KET_QUA_NV_LABELS: Record<string, string> = Object.fromEntries(KET_QUA_NV_OPTIONS.map((o) => [o.value, o.label]));
import type { AppUser, DonVi } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";
import { ExcelExportButton } from "../../ui/ExcelExport";
import { donViExportCols } from "../shared/exportCols";

// Hang doi "Xac nhan hoan tat" (sau khi NV nop ket qua chan doan) - port dung GET /admin/xac-nhan.
// Click dong mo UnitDetailModal (da co san nut "Xac nhan hoan tat / Yeu cau lam lai" o footer). Phan
// trang that (server LIMIT/OFFSET). 12/10/2026 (de xuat #12): chon nhieu dong -> xac nhan hang loat.

const NV: FilterDef = { key: "nv", label: "NV sửa chữa", kind: "person", noneLabel: "Không qua NV" };
const KTV: FilterDef = { key: "ktv", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" };
const HUONG: FilterDef = { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS };
const KQ: FilterDef = { key: "ket_qua", label: "Kết quả NV", kind: "map", labels: KET_QUA_NV_LABELS, noneLabel: "Chưa có" };
const DEFS: FilterDef[] = [NV, KTV, HUONG, KQ, ...LK_ABC_DEFS, CANH_BAO_DEF, KHOANG_DEF];
const EXTRA_COLS: FilterCol[] = [
  { key: "ktv", label: "KTV gửi", filter: { type: "multi", def: KTV } },
  { key: "lk_a", label: "LK KTV chọn (A)", filter: { type: "multi", def: LK_A_DEF } },
  { key: "lk_b", label: "LK gửi về (B)", filter: { type: "multi", def: LK_B_DEF }, sortKey: "lk" },
  { key: "lk_c", label: "LK đổi mới (C)", filter: { type: "multi", def: LK_ABC_DEFS[2] } },
  { key: "tao", label: "Thời gian tạo", filter: { type: "date", key: "khoang" }, sortKey: "tao" },
];

export function AdminXacNhanScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const flt = useListFilters("/admin/xac-nhan", [...DEFS.map((d) => d.key), "f_id", "f_gc"]);
  const { nameOf } = useLkName();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(withQuery("/admin/xac-nhan", flt.query), "don_vi");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  useEffect(() => setSelected(new Set()), [page]);

  if (loading && rows.length === 0 && !flt.active) return <Spinner />;

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
      filter: { type: "text", key: "f_id", placeholder: "Mã đơn…" },
      sortKey: "id",
    },
    { key: "hxl", header: "Hướng xử lý", filter: { type: "multi", def: HUONG }, sortKey: "huong", render: (r) => (r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "—") },
    { key: "nv", header: "NV phụ trách", filter: { type: "multi", def: NV }, sortKey: "nv", render: (r) => <UserName email={r.nguoi_sua_chua} /> },
    { key: "kq", header: "Kết quả NV", filter: { type: "multi", def: KQ }, sortKey: "kq", render: (r) => ketQuaLabel(r) || "—" },
    { key: "gcnv", header: "Ghi chú NV", filter: { type: "text", key: "f_gc", placeholder: "Từ trong ghi chú…" }, render: (r) => <span className="block max-w-[240px] truncate" title={r.ghi_chu_nv || ""}>{r.ghi_chu_nv || "—"}</span> },
    { key: "sla", header: "SLA", filter: { type: "single", def: CANH_BAO_DEF }, sortKey: "sla", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
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
      <ExcelToolbar flt={flt} cols={[...cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey })), ...EXTRA_COLS]} defs={DEFS} placeholder="Tìm mã đơn, case, linh kiện, lỗi, KTV, khách, serial…" total={total} unit="đơn" extra={<ExcelExportButton file="cho-xac-nhan-hoan-tat" disabled={!total} sources={[{ path: withQuery("/admin/xac-nhan", flt.query), itemsKey: "don_vi", sheet: "Cho xac nhan hoan tat", cols: donViExportCols(nameOf) }]} />} />
      <Table flt={flt} columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có đơn nào khớp bộ lọc." : "Không có đơn nào chờ xác nhận."} />
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
