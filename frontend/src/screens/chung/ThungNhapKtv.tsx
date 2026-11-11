import { useState } from "react";
import { usePagedApi } from "../../hooks/usePagedApi";
import { FilterBar, useListFilters, withQuery, type FilterDef, KHOANG_DEF } from "../../ui/FilterBar";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { MienBadge } from "../../ui/MienBadge";
import { UserName } from "../../hooks/useUserNames";
import { useWorkload } from "../../hooks/useWorkload";
import { HINH_THUC_GUI_LABELS } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import type { PhieuGui } from "../../lib/types";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";

// 11/11/2026 ("sao tôi là admin nhưng không tìm thấy thùng hàng này" - thung nhap BH-001000 KTV tu tao,
// 42 don, chua bam gui): truoc day tab "Thùng nháp / tạo hộ" chi liet ke thung CHINH MINH tao ho, thung
// nhap KTV tu tao khong hien o danh sach nao cua Admin / Kho. Tab nay liet ke moi thung nhap KTV dang lam
// (theo mien; Giam sat theo khu vuc) - mo chi tiet de xem, in phieu, hoac Kho / Admin BH nhan truc tiep.
const DEFS: FilterDef[] = [
  { key: "ktv", label: "KTV", kind: "person" },
  { key: "hinh_thuc_gui", label: "Hình thức gửi", kind: "map", labels: HINH_THUC_GUI_LABELS },
  { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" },
  KHOANG_DEF,
];

export function ThungNhapKtvList() {
  const { refresh } = useWorkload();
  const base = "/phieu-gui?pham_vi=nhap_ktv";
  const flt = useListFilters(base, DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuGui>(withQuery(base, flt.query), "phieu_gui");
  const [detailId, setDetailId] = useState<string | null>(null);
  const soDon = (r: PhieuGui) => (r as PhieuGui & { so_don?: number }).so_don ?? 0;
  const cols: Column<PhieuGui>[] = [
    { key: "id", header: "Mã thùng", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "ktv", header: "KTV", render: (r) => <UserName email={r.nguoi_tao} className="text-xs" /> },
    { key: "sodon", header: "Số đơn", render: (r) => (soDon(r) ? <b>{soDon(r)}</b> : <span className="text-[var(--ink-faint)]">0</span>) },
    { key: "tao", header: "Tạo lúc", render: (r) => <span className="text-xs">{fmtDate(r.created_at)}</span> },
    { key: "cho", header: "Để nháp", render: (r) => <SlaBadge since={r.created_at} /> },
    { key: "hinhthuc", header: "Hình thức gửi", render: (r) => (r.hinh_thuc_gui ? HINH_THUC_GUI_LABELS[r.hinh_thuc_gui] || r.hinh_thuc_gui : "—") },
    { key: "ho", header: "Tạo hộ bởi", render: (r) => (r.nguoi_tao_ho ? <UserName email={r.nguoi_tao_ho} className="text-xs" /> : "—") },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
  ];
  if (loading && rows.length === 0 && !flt.active) return <Spinner />;
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-[var(--ink)]">🗃️ Thùng nháp KTV đang làm ({total})</h3>
        <span className="text-xs text-[var(--ink-soft)]">KTV chưa bấm “Xác nhận đã gửi xe”. Mở thùng để xem đơn, in phiếu, hoặc nhận trực tiếp nếu hàng đã về.</span>
      </div>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã thùng, KTV, mã case, tên khách, linh kiện bên trong…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có thùng nào khớp bộ lọc." : "Không có thùng nháp nào."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <PhieuGuiDetailModal
          guiId={detailId}
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
