import { useEffect, useMemo, useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Badge, Input, Select } from "../../ui/primitives";
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

export function PhieuTraListCard({ user, title, tabs, reloadKey, onChanged }: { user: AppUser; title: string; tabs: TtTab[]; reloadKey?: number; onChanged?: () => void }) {
  const { refresh } = useWorkload();
  const [tab, setTab] = useState(tabs[0].value);
  const [loaiPt, setLoaiPt] = useState("");
  const [nhanPt, setNhanPt] = useState("");
  const [mienPt, setMienPt] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  const listPath = useMemo(() => {
    const p = new URLSearchParams();
    if (tab === "tu_choi_kt") p.set("tu_choi_kt", "1");
    else if (tab) p.set("trang_thai", tab);
    if (loaiPt) p.set("loai_doi_tru", loaiPt);
    if (nhanPt) p.set("nguoi_nhan", nhanPt);
    if (mienPt) p.set("mien", mienPt);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/phieu-tra${s ? `?${s}` : ""}`;
  }, [tab, loaiPt, nhanPt, mienPt, q]);
  const { items: list, total, page, pageCount, setPage, reload } = usePagedApi<PhieuTra>(listPath, "phieu_tra");
  useEffect(() => {
    if (reloadKey) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);
  const soLoc = [loaiPt, nhanPt, mienPt, q].filter(Boolean).length;

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
  ];

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">
          {title} ({total})
        </h3>
        <div className="flex flex-wrap gap-1">
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
        </div>
      </div>
      <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-1.5 items-center">
          <div className="col-span-2 lg:col-span-1 flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 [&>*:last-child]:flex-1">
            <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)]">Tìm</span>
            <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Mã phiếu, mã ĐH, MISA, vận đơn, KTV, mã đơn, case…" />
          </div>
          <LocSelect label="Đối trừ" value={loaiPt} onChange={setLoaiPt} options={[{ value: "", label: "Tất cả" }, ...Object.entries(LOAI_DOI_TRU_LABELS).map(([value, label]) => ({ value, label }))]} />
          <LocSelect label="Người nhận" value={nhanPt} onChange={setNhanPt} options={[{ value: "", label: "Tất cả" }, { value: "ktv", label: "KTV" }, { value: "khach_le", label: "Khách lẻ" }, { value: "doi_tac", label: "Đối tác (trả xác)" }]} />
          <LocSelect label="Miền" value={mienPt} onChange={setMienPt} options={[{ value: "", label: "Tất cả" }, { value: "MB", label: "Miền Bắc" }, { value: "MN", label: "Miền Nam" }, { value: "none", label: "Chưa khai báo" }]} />
        </div>
        {soLoc > 0 && (
          <div className="flex justify-end mt-1.5">
            <button type="button" className="text-xs font-semibold text-[var(--link)] hover:underline" onClick={() => { setLoaiPt(""); setNhanPt(""); setMienPt(""); setQInput(""); setQ(""); }}>
              ✕ Xoá lọc ({soLoc})
            </button>
          </div>
        )}
      </div>
      <Table columns={cols} rows={list} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={soLoc ? "Không có phiếu trả nào khớp bộ lọc." : "Không có phiếu trả nào."} />
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

export function LocSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
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

// Man rieng "Phieu da gui ke toan" (#/admin/phieu-tra-ke-toan).
export function AdminPhieuTraKeToanScreen({ user }: { user: AppUser }) {
  return (
    <div className="space-y-3">
      <PhieuTraListCard
        user={user}
        title="Phiếu trả đã gửi kế toán"
        tabs={[
          { value: "cho_ke_toan_duyet", label: "Chờ KT duyệt" },
          { value: "tu_choi_kt", label: "↩ KT từ chối" },
          { value: "da_duyet_ke_toan", label: "KT đã duyệt — chờ Kho" },
          { value: "da_gui,khieu_nai_van_chuyen", label: "Đang gửi KTV" },
          { value: "ktv_da_nhan,gui_that_bai,ket_thuc_khong_gui", label: "Đã kết thúc" },
          { value: "cho_ke_toan_duyet,da_duyet_ke_toan,da_gui,khieu_nai_van_chuyen,ktv_da_nhan,gui_that_bai,ket_thuc_khong_gui", label: "Tất cả" },
        ]}
      />
    </div>
  );
}
