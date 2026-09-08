import { useEffect, useState } from "react";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner, Input } from "../../ui/primitives";
import { Table, StopClick, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { Btn } from "../../ui/primitives";
import { TRANG_THAI_UNIT_LABELS } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { KtvBoSungModal } from "./KtvBoSungModal";
import type { DonVi } from "../../lib/types";

// "Tra cuu tien do cac don cua toi" (KTV) - port dung renderKtvTraCuu(): KHONG loc theo thoi gian
// (dung nguyen tac da chot: hang doi/tra cuu khong duoc de don qua han lau "bien mat"), co o tim
// kiem + phan trang that (server LIMIT/OFFSET, "q" loc bang SQL LIKE - xem backend routes/phieuGui.ts).

export function KtvTraCuuScreen() {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(`/phieu-gui/don-vi/tra-cuu${q ? `?q=${encodeURIComponent(q)}` : ""}`, "don_vi");
  const { nameOf } = useLkName();
  const [boSungFor, setBoSungFor] = useState<DonVi | null>(null);

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone={r.trang_thai === "cho_bo_sung_tt" ? "violet" : "blue"}>{TRANG_THAI_UNIT_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
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

  if (loading && rows.length === 0) return <Spinner />;

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔍 Tra cứu tiến độ đơn của tôi ({total})</h3>
      <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo mã đơn, case, mô tả lỗi..." className="mb-3 max-w-sm" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} emptyText="Không tìm thấy đơn nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {boSungFor && <KtvBoSungModal unit={boSungFor} onClose={() => setBoSungFor(null)} onDone={() => { setBoSungFor(null); reload(); }} />}
    </Card>
  );
}
