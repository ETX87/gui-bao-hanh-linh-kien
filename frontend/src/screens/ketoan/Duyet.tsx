import { useState } from "react";
import { FilterBar, useListFilters, withQuery, type FilterDef } from "../../ui/FilterBar";
import { phieuTraDefs } from "../shared/phieuTraFilters";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { fmtDate } from "../../lib/format";
import { LOAI_DOI_TRU_LABELS, KHACH_LE_KEY, TRANG_THAI_PHIEU_TRA_LABELS } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Man "Duyet phieu tra" (Ke toan) - port dung renderKeToanDuyet(). KHONG co bulk-action (dung nguyen
// tac segregation of duties da chot: moi phieu phai mo va duyet rieng). Phan trang that (server
// LIMIT/OFFSET).
// 21/10/2026: "vai trò kế toán thiếu tab các đơn đã từng xử lý" - them tab "Đã xử lý" (phieu KT da duyet /
// tu choi / day nguoc, GET /phieu-tra?kt_da_xu_ly=1), kem ket qua + nguoi + thoi diem xu ly gan nhat.

type Row = PhieuTra & { kt_luc?: string | null; kt_boi?: string | null; kt_kq?: string | null };

const KT_KQ_LABELS: Record<string, string> = { duyet: "Đã duyệt", tu_choi: "Từ chối", day_nguoc: "Đẩy ngược", appsheet: "Duyệt trên AppSheet" };
const KT_KQ_TONE: Record<string, "green" | "red" | "orange" | "gray"> = { duyet: "green", tu_choi: "red", day_nguoc: "orange", appsheet: "gray" };

const BASE_CHO = "/phieu-tra?trang_thai=cho_ke_toan_duyet";
const BASE_DA = "/phieu-tra?kt_da_xu_ly=1";

export function KeToanDuyetScreen({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<"cho" | "da">("cho");
  const { counts } = useWorkload();
  const soCho = counts.ketoan_cho_duyet ?? 0;
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">💰 Duyệt phiếu trả</h3>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["cho", `Chờ duyệt${soCho ? ` · ${soCho}` : ""}`],
              ["da", "Đã xử lý"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${tab === v ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "cho" ? <ChoDuyetList key="cho" user={user} /> : <DaXuLyList key="da" user={user} />}
    </Card>
  );
}

function baseCols(): Column<Row>[] {
  return [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : <UserName email={r.ktv_nhan} />) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "loai", header: "Loại đối trừ", render: (r) => <Badge tone={r.loai_doi_tru === "tru_cong_no" ? "orange" : "blue"}>{LOAI_DOI_TRU_LABELS[r.loai_doi_tru]}</Badge> },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
  ];
}

function ChoDuyetList({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const DEFS = phieuTraDefs();
  const flt = useListFilters(BASE_CHO, DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<Row>(withQuery(BASE_CHO, flt.query), "phieu_tra");
  const [detailId, setDetailId] = useState<string | null>(null);
  if (loading && rows.length === 0 && !flt.active) return <Spinner />;
  return (
    <>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã phiếu, mã ĐH, MISA, KTV, mã đơn / case / linh kiện bên trong…" />
      <Table columns={baseCols()} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có phiếu nào khớp bộ lọc." : "Không có phiếu trả nào chờ duyệt."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <PhieuTraDetailModal
          traId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            reload();
            refresh();
          }}
        />
      )}
    </>
  );
}

function DaXuLyList({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const DEFS: FilterDef[] = [
    { key: "kt_kq", label: "Kết quả KT", kind: "map", labels: KT_KQ_LABELS },
    { key: "kt_boi", label: "Người xử lý", kind: "person" },
    { key: "trang_thai", label: "Trạng thái hiện tại", kind: "map", labels: TRANG_THAI_PHIEU_TRA_LABELS },
    ...phieuTraDefs(),
  ];
  const flt = useListFilters(BASE_DA, DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<Row>(withQuery(BASE_DA, flt.query), "phieu_tra");
  const [detailId, setDetailId] = useState<string | null>(null);
  if (loading && rows.length === 0 && !flt.active) return <Spinner />;
  const cols: Column<Row>[] = [
    baseCols()[0],
    { key: "kq", header: "Kết quả KT", render: (r) => <Badge tone={KT_KQ_TONE[r.kt_kq || ""] || "gray"}>{KT_KQ_LABELS[r.kt_kq || ""] || "—"}</Badge> },
    { key: "luc", header: "Xử lý lúc", render: (r) => (r.kt_luc ? fmtDate(r.kt_luc) : "—") },
    { key: "boi", header: "Người xử lý", render: (r) => (r.kt_boi ? <UserName email={r.kt_boi} /> : "—") },
    { key: "tt", header: "Trạng thái hiện tại", render: (r) => <StatusBadge kind="tra" value={r.trang_thai} /> },
    ...baseCols().slice(1),
    { key: "lydo", header: "Lý do từ chối", render: (r) => <span className="block max-w-[220px] truncate" title={r.ly_do_tu_choi_kt || ""}>{r.ly_do_tu_choi_kt || "—"}</span> },
  ];
  return (
    <>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã phiếu, mã ĐH, MISA, KTV, mã đơn / case / linh kiện bên trong…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có phiếu nào khớp bộ lọc." : "Chưa có phiếu nào Kế toán đã xử lý."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <PhieuTraDetailModal
          traId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            reload();
            refresh();
          }}
        />
      )}
    </>
  );
}
