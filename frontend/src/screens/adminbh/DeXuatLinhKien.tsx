import { useEffect, useState } from "react";
import { FilterBar, useListFilters, withQuery, type FilterDef } from "../../ui/FilterBar";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Badge, Btn, Card, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { MienBadge } from "../../ui/MienBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { fmtDate } from "../../lib/format";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { CapLinhKienModal, DeXuatBadge, TuChoiDeXuatModal } from "../shared/DeXuatLinhKien";
import type { AppUser, DeXuatLk } from "../../lib/types";

// Man "Cap linh kien sua chua" (Admin BH, 12/10/2026): de xuat linh kien cua NV (don con cua don vi bao
// hanh). Admin len phieu xuat MISA roi bam "Cap" (1 hoac nhieu de xuat chung 1 ma MISA), hoac "Tu choi".

const TABS = [
  { key: "cho_cap", label: "Chờ cấp" },
  { key: "da_cap", label: "Đã cấp" },
  { key: "tu_choi", label: "Từ chối" },
  { key: "huy", label: "Đã huỷ" },
];

const DEFS: FilterDef[] = [
  { key: "nguoi_de_xuat", label: "Người đề xuất", kind: "person" },
  { key: "nv", label: "NV sửa chữa", kind: "person" },
  { key: "ktv", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" },
  { key: "lk", label: "Linh kiện xin", kind: "lk" },
  { key: "nguoi_xu_ly", label: "Người xử lý", kind: "person", noneLabel: "Chưa xử lý" },
];

export function AdminDeXuatScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { nameOf } = useLkName();
  const [tab, setTab] = useState("cho_cap");
  const flt = useListFilters(`/de-xuat?trang_thai=${tab}`, DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DeXuatLk>(withQuery(`/de-xuat?trang_thai=${tab}`, flt.query), "de_xuat");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [capFor, setCapFor] = useState<DeXuatLk[] | null>(null);
  const [tuChoiFor, setTuChoiFor] = useState<DeXuatLk | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => setSelected(new Set()), [page, tab, flt.query]);
  const choCap = tab === "cho_cap";

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev);
      on ? n.add(id) : n.delete(id);
      return n;
    });
  const after = () => {
    reload();
    refresh();
  };

  const cols: Column<DeXuatLk>[] = [
    {
      key: "id",
      header: "Mã đề xuất",
      render: (r) => (
        <span className="flex items-center gap-2">
          {choCap && <input type="checkbox" className="w-4 h-4" checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={`Chọn ${r.id}`} />}
          <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span>
        </span>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.trang_thai === "cho_cap" ? (
          <span className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Btn size="sm" variant="success" onClick={() => setCapFor([r])}>
              Cấp
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setTuChoiFor(r)}>
              Từ chối
            </Btn>
          </span>
        ) : null,
    },
    { key: "tt", header: "Trạng thái", render: (r) => <DeXuatBadge tt={r.trang_thai} /> },
    { key: "unit", header: "Đơn bảo hành", render: (r) => <span className="font-mono text-xs">{r.unit_id}</span> },
    { key: "lk", header: "Linh kiện xin cấp", render: (r) => <span className="block max-w-[260px] truncate" title={nameOf(r.ma_lk)}>{nameOf(r.ma_lk)}</span> },
    { key: "sl", header: "SL", render: (r) => <b>×{r.so_luong}</b> },
    { key: "nv", header: "NV đề xuất", render: (r) => <UserName email={r.nguoi_de_xuat} /> },
    { key: "gc", header: "Ghi chú", render: (r) => <span className="block max-w-[220px] truncate" title={r.ghi_chu || ""}>{r.ghi_chu || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    choCap
      ? { key: "sla", header: "Chờ", render: (r) => <SlaBadge since={r.created_at} /> }
      : { key: "xl", header: "Xử lý", render: (r) => <span className="text-xs">{r.ma_misa ? `MISA ${r.ma_misa}` : r.ly_do_tu_choi || "—"} · {fmtDate(r.xu_ly_luc)}</span> },
  ];

  if (loading && rows.length === 0 && total === 0 && tab === "cho_cap" && !flt.active) return <Spinner />;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🔩 Cấp linh kiện sửa chữa</h3>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${tab === t.key ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-white text-[var(--ink-body)] border-[var(--line)]"}`}
            >
              {t.label}
              {tab === t.key ? ` (${total})` : ""}
            </button>
          ))}
        </div>
        {choCap && rows.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-[var(--ink-soft)] cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
            Chọn tất cả đang hiển thị
          </label>
        )}
        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="blue">{selected.size} đã chọn</Badge>
            <Btn variant="success" onClick={() => setCapFor(rows.filter((r) => selected.has(r.id)))}>
              ✔ Cấp {selected.size} đề xuất (chung 1 mã MISA)
            </Btn>
          </div>
        )}
      </div>
      {choCap && <p className="text-xs text-[var(--ink-soft)] mb-2">NV sửa chữa xin cấp linh kiện để sửa. Lên phiếu xuất MISA rồi bấm "Cấp" và nhập mã phiếu. Bấm dòng để mở đơn bảo hành.</p>}
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã đề xuất, đơn, linh kiện, MISA, NV, KTV, case…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.unit_id)} emptyText="Không có đề xuất nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {capFor && (
        <CapLinhKienModal
          list={capFor}
          onClose={() => setCapFor(null)}
          onDone={() => {
            setCapFor(null);
            setSelected(new Set());
            after();
          }}
        />
      )}
      {tuChoiFor && (
        <TuChoiDeXuatModal
          dx={tuChoiFor}
          onClose={() => setTuChoiFor(null)}
          onDone={() => {
            setTuChoiFor(null);
            after();
          }}
        />
      )}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={after} />}
    </Card>
  );
}
