import { useEffect, useState } from "react";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner, Input } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_UNIT_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { SlaBadge } from "../../ui/SlaBadge";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser, DonVi } from "../../lib/types";

// "Tra cuu moi don hang trong pham vi" (Giam sat/View) - THUAN CHI XEM (UnitDetailModal tu dong khong
// hien nut hanh dong nao vi cac dieu kien vai tro trong do khong khop la_giam_sat/la_view). Phan
// trang that (server LIMIT/OFFSET) - day la bang de phinh to nhat he thong (toan bo pham vi), uu tien
// cao nhat cho yeu cau "tat ca du lieu dang bang deu phan trang" (05/09/2026).

export function QuanLyTraCuuScreen({ user }: { user: AppUser }) {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DonVi>(`/tra-cuu/don-vi${q ? `?q=${encodeURIComponent(q)}` : ""}`, "don_vi");
  const [detailId, setDetailId] = useState<string | null>(null);

  const cols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_UNIT_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    { key: "ktv", header: "KTV / Nguồn", render: (r) => (r.ktv && r.ktv !== KHACH_LE_KEY ? r.ktv : <Badge tone="violet">Khách lẻ</Badge>) },
    { key: "lk", header: "Linh kiện", render: (r) => r.ma_lk },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} /> },
  ];

  if (loading && rows.length === 0) return <Spinner />;

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔍 Tra cứu mọi đơn hàng trong phạm vi ({total})</h3>
      <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo mã đơn, KTV, mô tả lỗi..." className="mb-3 max-w-sm" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không tìm thấy đơn nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={reload} />}
    </Card>
  );
}
