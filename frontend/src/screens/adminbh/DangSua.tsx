import { useEffect, useMemo, useState } from "react";
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

// Menu rieng "KTV đang sửa" (21/10/2026, nguyen van: "các đơn đang chờ nv sửa chữa xử lý tách riêng menu
// 'KTV đang sửa'") - don vi dang o buoc NV sua chua (cho_chan_doan). Admin BH theo doi: NV nao dang giu bao
// nhieu don, de xuat linh kien dang cho cap, qua han SLA; mo chi tiet de de xuat ho / cap linh kien.

type Row = DonVi & { ktv?: string | null; mo_ta_loi?: string | null; ten_khach_hang?: string | null; dx_cho_cap?: number; dx_da_cap?: number };

export function AdminDangSuaScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const { nameOf } = useLkName();
  useUserNames();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [nv, setNv] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  const path = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (nv) p.set("nv", nv);
    const s = p.toString();
    return `/admin/dang-sua${s ? `?${s}` : ""}`;
  }, [q, nv]);
  const { items: rows, total, page, pageCount, setPage, reload, raw } = usePagedApi<Row>(path, "don_vi");
  const theoNv = (raw.theo_nv as { nv: string | null; n: number }[] | undefined) || [];
  const tongTatCa = theoNv.reduce((s, x) => s + x.n, 0);

  const cols: Column<Row>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "nv", header: "NV sửa chữa", render: (r) => (r.nguoi_sua_chua ? <UserName email={r.nguoi_sua_chua} /> : <Badge tone="red">Chưa gán</Badge>) },
    { key: "lk", header: "Linh kiện", render: (r) => <span className="block max-w-[260px] truncate" title={nameOf(r.ma_lk_thuc_te || r.ma_lk || "")}>{nameOf(r.ma_lk_thuc_te || r.ma_lk || "")}</span> },
    { key: "hxl", header: "Hướng xử lý", render: (r) => (r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "—") },
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
    { key: "nguon", header: "Nguồn", render: (r) => (r.ktv ? <UserName email={r.ktv} /> : r.ten_khach_hang ? `Khách lẻ · ${r.ten_khach_hang}` : "—") },
    { key: "loi", header: "Mô tả lỗi", render: (r) => <span className="block max-w-[260px] truncate" title={r.mo_ta_loi || ""}>{r.mo_ta_loi || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
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
      <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-3 gap-y-1.5 items-center">
          <div className="lg:col-span-2 flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 [&>*:last-child]:flex-1">
            <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)]">Tìm</span>
            <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Mã đơn, case, linh kiện, lỗi, NV, KTV, khách…" />
          </div>
          <LocSelect
            label="NV"
            value={nv}
            onChange={setNv}
            options={[{ value: "", label: "Tất cả" }, ...theoNv.map((x) => ({ value: x.nv || "__chua_gan__", label: x.nv ? `${displayName(x.nv)} (${x.n})` : `Chưa gán NV (${x.n})` }))]}
          />
        </div>
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={q || nv ? "Không có đơn nào khớp bộ lọc." : "Không có đơn nào đang chờ NV sửa chữa."} />
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
