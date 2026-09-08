import { useEffect, useState } from "react";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useRoute } from "../../router/Router";
import { Card, Badge, Spinner, Input } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_UNIT_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";

// "Tra cuu moi don hang trong pham vi" (Giam sat/View) - THUAN CHI XEM. Phan trang that.
// Phat hien 12 vong ra soat UX: nhan ?trang_thai= tu man Tong quan (bam 1 o dem) -> loc san + hien
// chip "dang loc" bo duoc.

export function QuanLyTraCuuScreen({ user }: { user: AppUser }) {
  const { query, nav } = useRoute();
  const stFilter = query.get("trang_thai") || "";
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (stFilter) params.set("trang_thai", stFilter);
  const qs = params.toString();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(`/tra-cuu/don-vi${qs ? `?${qs}` : ""}`, "don_vi");
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);

  const stLabel = stFilter === "qua_han" ? "Quá hạn SLA 24h" : TRANG_THAI_UNIT_LABELS[stFilter] || stFilter;

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_UNIT_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    { key: "ktv", header: "KTV / Nguồn", render: (r) => (r.ktv && r.ktv !== KHACH_LE_KEY ? r.ktv : <Badge tone="violet">Khách lẻ</Badge>) },
    { key: "lk", header: "Linh kiện", render: (r) => nameOf(r.ma_lk) },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} /> },
  ];

  if (loading && rows.length === 0) return <Spinner />;

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔍 Tra cứu mọi đơn hàng trong phạm vi ({total})</h3>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo mã đơn, KTV, mô tả lỗi..." className="max-w-sm" />
        {stFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--amber-100)] text-[var(--amber-700)] text-xs font-semibold px-2.5 py-1">
            Lọc: {stLabel}
            <button onClick={() => nav("/quanly/tra-cuu")} className="focus-ring hover:text-[var(--amber-800)]" aria-label="Bỏ lọc">
              ✕
            </button>
          </span>
        )}
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không tìm thấy đơn nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={reload} />}
    </Card>
  );
}
