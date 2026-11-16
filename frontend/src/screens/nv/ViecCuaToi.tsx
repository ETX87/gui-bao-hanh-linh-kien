import { useState } from "react";
import { ExcelToolbar, type FilterCol } from "../../ui/ColumnFilter";
import { useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Badge, Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_BAO_HANH_LABELS, HUONG_XU_LY_LABELS } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";
import { ExcelExportButton } from "../../ui/ExcelExport";
import { donViExportCols } from "../shared/exportCols";

// "Viec cua toi" (NV sua chua) - port dung renderNvViecCuaToi(). Click dong mo UnitDetailModal (da co
// san nut "Nop ket qua sua chua" + khoi "De xuat linh kien" trong chi tiet). Phan trang that (server LIMIT/OFFSET).

const KTV: FilterDef = { key: "ktv", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" };
const HUONG: FilterDef = { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS };
const LBH: FilterDef = { key: "loai_bao_hanh", label: "Loại BH", kind: "map", labels: LOAI_BAO_HANH_LABELS };
const DEFS: FilterDef[] = [KTV, ...LK_ABC_DEFS, HUONG, LBH, CANH_BAO_DEF, KHOANG_DEF];
const EXTRA_COLS: FilterCol[] = [
  { key: "ktv", label: "KTV gửi", filter: { type: "multi", def: KTV } },
  { key: "hxl", label: "Hướng xử lý", filter: { type: "multi", def: HUONG }, sortKey: "huong" },
  { key: "lk_a", label: "LK KTV chọn (A)", filter: { type: "multi", def: LK_A_DEF } },
  { key: "lk_c", label: "LK đổi mới (C)", filter: { type: "multi", def: LK_ABC_DEFS[2] } },
  { key: "tao", label: "Thời gian tạo", filter: { type: "date", key: "khoang" }, sortKey: "tao" },
];

export function NvViecCuaToiScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const flt = useListFilters("/nv/viec-cua-toi", [...DEFS.map((d) => d.key), "f_id", "f_mota"]);
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(withQuery("/nv/viec-cua-toi", flt.query), "don_vi");
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);

  if (loading && rows.length === 0 && !flt.active) return <Spinner />;

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", filter: { type: "text", key: "f_id", placeholder: "Mã đơn…" }, sortKey: "id", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "lbh", header: "Loại BH", filter: { type: "multi", def: LBH }, sortKey: "lbh", render: (r) => (r.loai_bao_hanh ? LOAI_BAO_HANH_LABELS[r.loai_bao_hanh] : "—") },
    { key: "lk", header: "Linh kiện", filter: { type: "multi", def: LK_B_DEF }, sortKey: "lk", render: (r) => nameOf(r.ma_lk_nhan || r.ma_lk) },
    {
      key: "dx",
      header: "Linh kiện xin cấp",
      render: (r) =>
        r.so_dx_cho_cap || r.so_dx_da_cap ? (
          <span className="flex gap-1">
            {!!r.so_dx_cho_cap && <Badge tone="amber">{r.so_dx_cho_cap} chờ cấp</Badge>}
            {!!r.so_dx_da_cap && <Badge tone="green">{r.so_dx_da_cap} đã cấp</Badge>}
          </span>
        ) : (
          "—"
        ),
    },
    { key: "mota", header: "Mô tả lỗi", filter: { type: "text", key: "f_mota", placeholder: "Từ trong mô tả…" }, sortKey: "mota", className: "max-w-[260px] truncate", render: (r) => r.mo_ta_loi || "—" },
    { key: "sla", header: "SLA", filter: { type: "single", def: CANH_BAO_DEF }, sortKey: "sla", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">🔧 Việc của tôi ({total})</h3>
      <ExcelToolbar flt={flt} cols={[...cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey })), ...EXTRA_COLS]} defs={DEFS} placeholder="Tìm mã đơn, case, linh kiện, lỗi, KTV, khách, serial…" total={total} unit="đơn" extra={<ExcelExportButton file="viec-sua-cua-toi" disabled={!total} sources={[{ path: withQuery("/nv/viec-cua-toi", flt.query), itemsKey: "don_vi", sheet: "Viec sua", cols: donViExportCols(nameOf) }]} />} />
      <Table flt={flt} columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có đơn nào khớp bộ lọc." : "Không có việc nào đang chờ."} />
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
