import { useEffect, useMemo, useState } from "react";
import { ExcelToolbar, type FilterCol } from "../../ui/ColumnFilter";
import { useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName, displayName, useUserNames } from "../../hooks/useUserNames";
import { Badge, Card, Input } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { MienBadge } from "../../ui/MienBadge";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { HUONG_XU_LY_LABELS } from "../../lib/constants";
import type { AppUser, DonVi } from "../../lib/types";
import { LocSelect } from "./PhieuTraList";
import { ExcelExportButton } from "../../ui/ExcelExport";
import { donViExportCols } from "../shared/exportCols";

// Menu rieng "KTV đang sửa" (21/10/2026, nguyen van: "các đơn đang chờ nv sửa chữa xử lý tách riêng menu
// 'KTV đang sửa'") - don vi dang o buoc NV sua chua (cho_chan_doan). Admin BH theo doi: NV nao dang giu bao
// nhieu don, de xuat linh kien dang cho cap, qua han SLA; mo chi tiet de de xuat ho / cap linh kien.

type Row = DonVi & { ktv?: string | null; mo_ta_loi?: string | null; ten_khach_hang?: string | null; dx_cho_cap?: number; dx_da_cap?: number };

const KTV: FilterDef = { key: "ktv", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" };
const HUONG: FilterDef = { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS };
const MIEN: FilterDef = { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" };
const DEFS: FilterDef[] = [KTV, ...LK_ABC_DEFS, HUONG, CANH_BAO_DEF, KHOANG_DEF];
// 16/11/2026: loc kieu Excel - cot khong hien tren bang (LK A / C, thoi gian tao) van loc duoc qua chip / nut cot.
const EXTRA_COLS: FilterCol[] = [
  { key: "lk_a", label: "LK KTV chọn (A)", filter: { type: "multi", def: LK_A_DEF } },
  { key: "lk_c", label: "LK đổi mới (C)", filter: { type: "multi", def: LK_ABC_DEFS[2] } },
  { key: "tao", label: "Thời gian tạo", filter: { type: "date", key: "khoang" }, sortKey: "tao" },
];

export function AdminDangSuaScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { nameOf } = useLkName();
  useUserNames();
  const flt = useListFilters("/admin/dang-sua", ["nv", ...DEFS.map((d) => d.key), "mien", "f_id", "f_mota"]);
  const nv = flt.values.nv || "";
  const setNv = (v: string) => flt.set("nv", v);
  const path = withQuery("/admin/dang-sua", flt.query);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { items: rows, total, page, pageCount, setPage, reload, raw } = usePagedApi<Row>(path, "don_vi");
  const theoNv = (raw.theo_nv as { nv: string | null; n: number }[] | undefined) || [];
  const tongTatCa = theoNv.reduce((s, x) => s + x.n, 0);

  const cols: Column<Row>[] = [
    { key: "id", header: "ID", filter: { type: "text", key: "f_id", placeholder: "Mã đơn…" }, sortKey: "id", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "nv", header: "NV sửa chữa", sortKey: "nv", render: (r) => (r.nguoi_sua_chua ? <UserName email={r.nguoi_sua_chua} /> : <Badge tone="red">Chưa gán</Badge>) },
    { key: "lk", header: "Linh kiện", filter: { type: "multi", def: LK_B_DEF }, sortKey: "lk", render: (r) => <span className="block max-w-[260px] truncate" title={nameOf(r.ma_lk_nhan || r.ma_lk || "")}>{nameOf(r.ma_lk_nhan || r.ma_lk || "")}</span> },
    { key: "hxl", header: "Hướng xử lý", filter: { type: "multi", def: HUONG }, sortKey: "huong", render: (r) => (r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "—") },
    {
      key: "dx",
      header: "Linh kiện xin cấp",
      render: (r) =>
        r.dx_cho_cap || r.dx_da_cap ? (
          <span className="flex gap-1">
            {!!r.dx_cho_cap && <Badge tone="amber">{r.dx_cho_cap} chờ cấp</Badge>}
            {!!r.dx_da_cap && <Badge tone="green">{r.dx_da_cap} đã cấp</Badge>}
          </span>
        ) : (
          "—"
        ),
    },
    { key: "nguon", header: "Nguồn", filter: { type: "multi", def: KTV }, sortKey: "ktv", render: (r) => (r.ktv ? <UserName email={r.ktv} /> : r.ten_khach_hang ? `Khách lẻ · ${r.ten_khach_hang}` : "—") },
    { key: "loi", header: "Mô tả lỗi", filter: { type: "text", key: "f_mota", placeholder: "Từ trong mô tả…" }, sortKey: "mota", render: (r) => <span className="block max-w-[260px] truncate" title={r.mo_ta_loi || ""}>{r.mo_ta_loi || "—"}</span> },
    { key: "mien", header: "Miền", filter: { type: "multi", def: MIEN }, sortKey: "mien", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "sla", header: "SLA", filter: { type: "single", def: CANH_BAO_DEF }, sortKey: "sla", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
  ];

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">🔧 KTV đang sửa ({total})</h3>
      {theoNv.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          <button type="button" onClick={() => setNv("")} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${nv === "" ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}>
            Tất cả · {tongTatCa}
          </button>
          {theoNv.map((x) => {
            const key = x.nv || "__chua_gan__";
            return (
              <button key={key} type="button" onClick={() => setNv(key)} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${nv === key ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}>
                {x.nv ? displayName(x.nv) : "Chưa gán NV"} · {x.n}
              </button>
            );
          })}
        </div>
      )}
      <ExcelToolbar flt={flt} cols={[...cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey })), ...EXTRA_COLS]} defs={DEFS} placeholder="Tìm mã đơn, case, linh kiện, lỗi, NV, KTV, khách, serial…" total={total} unit="đơn" extra={<ExcelExportButton file="dang-sua" disabled={!total} sources={[{ path, itemsKey: "don_vi", sheet: "Dang sua", cols: donViExportCols(nameOf) }]} />} />
      <Table flt={flt} columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có đơn nào khớp bộ lọc." : "Không có đơn nào đang chờ NV sửa chữa."} />
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
