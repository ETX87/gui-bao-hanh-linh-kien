import { useEffect, useMemo, useState } from "react";
import { FilterBar, FilterSelect, useListFilters, withQuery, type FilterDef } from "../../ui/FilterBar";
import { phieuTraDefs } from "../shared/phieuTraFilters";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Badge, Btn, Input, Select } from "../../ui/primitives";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";
import { nguoiNhanLabel } from "./ReturnUnitTable";

// Danh sach phieu tra co bo loc + tim (server) - dung chung cho man "Tao & quan ly phieu tra" (phieu
// Admin con dang lam) va man rieng "Phieu da gui ke toan" (20/10/2026: "tách riêng danh sách các phiếu
// đã gửi kế toán thành 1 menu riêng để tiện quản lý").

export interface TtTab {
  value: string; // trang_thai (nhieu gia tri cach dau phay) hoac "tu_choi_kt"
  label: string;
}

// khoIn (04/11/2026): tab Kho "Chờ in phiếu" (0) / "Đã in phiếu" (1) - loc kho_in + nut doi trang thai in tung dong / ca trang.
export function PhieuTraListCard({ user, title, tabs, reloadKey, onChanged, extraCols, emptyText, khoIn }: { user: AppUser; title: string; tabs: TtTab[]; reloadKey?: number; onChanged?: () => void; extraCols?: Column<PhieuTra>[]; emptyText?: string; khoIn?: 0 | 1 }) {
  const { refresh } = useWorkload();
  const toast = useToast();
  const [busyIn, setBusyIn] = useState(false);
  const [tab, setTab] = useState(tabs[0].value);
  const [detailId, setDetailId] = useState<string | null>(null);
  const basePath = (tab === "tu_choi_kt" ? "/phieu-tra?tu_choi_kt=1" : `/phieu-tra?trang_thai=${tab}`) + (khoIn !== undefined ? `&kho_in=${khoIn}` : "");
  const DEFS: FilterDef[] = [
    { key: "nguoi_nhan", label: "Loại người nhận", static: [{ value: "ktv", label: "KTV" }, { value: "khach_le", label: "Khách lẻ" }, { value: "doi_tac", label: "Đối tác (trả xác)" }] },
    ...phieuTraDefs(),
  ];
  const flt = useListFilters(basePath, DEFS.map((d) => d.key));
  const listPath = withQuery(basePath, flt.query);
  const { items: list, total, page, pageCount, setPage, reload } = usePagedApi<PhieuTra>(listPath, "phieu_tra");
  useEffect(() => {
    if (reloadKey) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  const soLoc = flt.active;
  const laKho = user.la_kho || user.la_qtri;
  const doiIn = async (ids: string[], daIn: boolean) => {
    if (!ids.length) return;
    setBusyIn(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/phieu-tra/kho-in", { ids, da_in: daIn });
      toast(r.loi.length ? `Đã cập nhật ${r.ok}, ${r.loi.length} phiếu lỗi (${r.loi.map((x) => x.id).join(", ")}).` : daIn ? `Đã đánh dấu in ${r.ok} phiếu.` : `Đã chuyển ${r.ok} phiếu về chờ in.`, r.loi.length ? "error" : "ok");
      reload();
      refresh();
      onChanged?.();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyIn(false);
    }
  };

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <StatusBadge kind="tra" value={r.trang_thai} /> },
    { key: "ktv", header: "Người nhận", render: (r) => nguoiNhanLabel(r.ktv_nhan) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
    { key: "vd", header: "Vận đơn", render: (r) => r.ma_van_don || "—" },
    { key: "up", header: "Cập nhật", render: (r) => <span className="text-xs whitespace-nowrap">{fmtDate(r.updated_at)}</span> },
    {
      key: "dn",
      header: "Ghi chú",
      render: (r) =>
        r.ly_do_day_nguoc && r.trang_thai === "nhap" ? (
          <Badge tone="red">↩ {r.day_nguoc_vai_tro === "kho" ? "Kho" : "KT"} đẩy ngược</Badge>
        ) : r.ly_do_tu_choi_kt && r.trang_thai === "nhap" ? (
          <span title={r.ly_do_tu_choi_kt}>
            <Badge tone="red">↩ KT từ chối: {r.ly_do_tu_choi_kt.slice(0, 40)}</Badge>
          </span>
        ) : (
          ""
        ),
    },
    ...(extraCols ?? []),
    ...(khoIn !== undefined && laKho
      ? [
          {
            key: "in",
            header: "",
            render: (r: PhieuTra) => (
              <span onClick={(e) => e.stopPropagation()}>
                <Btn size="sm" variant={khoIn ? "ghost" : "success"} disabled={busyIn} onClick={() => doiIn([r.id], !khoIn)}>
                  {khoIn ? "↩ Chưa in" : "🖨 Đã in"}
                </Btn>
              </span>
            ),
          } as Column<PhieuTra>,
        ]
      : []),
  ];

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">
          {title} ({total})
        </h3>
        {tabs.length > 1 && <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${tab === t.value ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>}
        {khoIn !== undefined && laKho && list.length > 0 && (
          <Btn size="sm" className="ml-auto" variant={khoIn ? "ghost" : "success"} disabled={busyIn} onClick={() => doiIn(list.map((r) => r.id), !khoIn)}>
            {khoIn ? `↩ Chuyển ${list.length} phiếu đang hiển thị về chờ in` : `🖨 Đánh dấu đã in ${list.length} phiếu đang hiển thị`}
          </Btn>
        )}
      </div>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã phiếu, mã ĐH, MISA, vận đơn, KTV, mã đơn, case, linh kiện…" />
      <Table columns={cols} rows={list} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={soLoc ? "Không có phiếu trả nào khớp bộ lọc." : emptyText || "Không có phiếu trả nào."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && (
        <PhieuTraDetailModal
          traId={detailId}
          user={user}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            reload();
            refresh();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
}

// 21/10/2026: >5 lua chon -> tu dung o chon co tim kiem (FilterSelect).
export function LocSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const real = options.filter((o) => o.value !== "");
  if (real.length > 5) return <FilterSelect label={label} value={value} onChange={onChange} options={real} />;
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:min-w-0">
      <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)] whitespace-nowrap">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
