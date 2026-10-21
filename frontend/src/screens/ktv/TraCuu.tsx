import { useState } from "react";
import { FilterBar, useListFilters, withQuery, type FilterDef } from "../../ui/FilterBar";
import { StatusBadge } from "../../ui/StatusBadge";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, StopClick, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { Btn } from "../../ui/primitives";
import { TRANG_THAI_UNIT_LABELS, HUONG_XU_LY_LABELS } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { KtvBoSungModal } from "./KtvBoSungModal";
import type { DonVi } from "../../lib/types";

// "Tra cuu tien do cac don cua toi" (KTV) - port dung renderKtvTraCuu(): KHONG loc theo thoi gian
// (dung nguyen tac da chot: hang doi/tra cuu khong duoc de don qua han lau "bien mat"), co o tim
// kiem + phan trang that (server LIMIT/OFFSET, "q" loc bang SQL LIKE - xem backend routes/phieuGui.ts).

const DEFS: FilterDef[] = [
  { key: "trang_thai", label: "Trạng thái", kind: "map", labels: TRANG_THAI_UNIT_LABELS },
  { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS, noneLabel: "Chưa phân loại" },
  { key: "lk", label: "Linh kiện", kind: "lk" },
  { key: "phieu_gui", label: "Thùng", kind: "text" },
];

export function KtvTraCuuScreen() {
  const flt = useListFilters("/phieu-gui/don-vi/tra-cuu", DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(withQuery("/phieu-gui/don-vi/tra-cuu", flt.query), "don_vi");
  const { nameOf } = useLkName();
  const [boSungFor, setBoSungFor] = useState<DonVi | null>(null);

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <StatusBadge kind="unit" value={r.trang_thai} /> },
    { key: "case", header: "Case", render: (r) => r.case_id || "—" },
    { key: "lk", header: "Linh kiện", render: (r) => nameOf(r.ma_lk) },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} /> },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.trang_thai === "cho_bo_sung_tt" ? (
          <StopClick>
            <Btn variant="primary" onClick={() => setBoSungFor(r)}>
              Bổ sung
            </Btn>
          </StopClick>
        ) : null,
    },
  ];

  if (loading && rows.length === 0 && !flt.active) return <Spinner />;

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">🔍 Tra cứu tiến độ đơn của tôi ({total})</h3>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã đơn, case, linh kiện, mô tả lỗi, khách, serial…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} emptyText="Không tìm thấy đơn nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {boSungFor && <KtvBoSungModal unit={boSungFor} onClose={() => setBoSungFor(null)} onDone={() => { setBoSungFor(null); reload(); }} />}
    </Card>
  );
}
