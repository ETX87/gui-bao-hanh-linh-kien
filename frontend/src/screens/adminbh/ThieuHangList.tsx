import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Badge, Btn, Card, Input } from "../../ui/primitives";
import { ExcelExportButton, type ExportCol } from "../../ui/ExcelExport";
import { displayName } from "../../hooks/useUserNames";
import { fmtDate as fmtD } from "../../lib/format";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName } from "../../hooks/useUserNames";
import { useWorkload } from "../../hooks/useWorkload";
import { fmtDate } from "../../lib/format";
import type { AppUser } from "../../lib/types";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { ChiTietDong, THIEU_HANG_MO, ThieuHangBadge, type ThieuHangRow } from "../shared/ThieuHang";

const NHOM = [
  { k: "can_xem", label: "Có kết quả, chưa nắm" },
  { k: "mo", label: "Đang chờ hàng" },
  { k: "cho_de_xuat", label: "Đã về — chờ đề xuất LK" },
  { k: "da_ve", label: "Hàng đã về" },
  { k: "dong", label: "Đã đóng" },
  { k: "tat_ca", label: "Tất cả" },
];

// Tab "📦 Thiếu hàng" trong man Don bao hanh - Admin BH theo doi hang da ve.
export function ThieuHangListScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const { nameOf } = useLkName();
  const [nhom, setNhom] = useState(() => localStorage.getItem("thieu_hang_nhom") || "mo");
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [mo, setMo] = useState<string | null>(null);
  const [chon, setChon] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);
  const path = `/thieu-hang?nhom=${nhom}${qDeb ? `&q=${encodeURIComponent(qDeb)}` : ""}`;
  const pg = usePagedApi<ThieuHangRow>(path, "rows");
  const counts = (pg.raw.counts as Record<string, number> | undefined) ?? {};
  const quanLy = user.la_admin_bh || user.la_qtri;
  useEffect(() => setChon(new Set()), [path, pg.page]);
  const doiNhom = (k: string) => {
    setNhom(k);
    localStorage.setItem("thieu_hang_nhom", k);
  };
  const reload = () => {
    pg.reload();
    refresh();
  };
  const daNam = async (ids: number[]) => {
    try {
      const r = await api.post<{ cap_nhat: number }>("/thieu-hang/da-xem", { ids });
      toast(`Đã đánh dấu đã nắm ${r.cap_nhat} yêu cầu.`, "ok");
      reload();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const dongBo = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ da_gui: number; cap_nhat: number; loi?: string }>("/thieu-hang/dong-bo");
      toast(r.loi ? `Lỗi đồng bộ: ${r.loi}` : `Đã gửi ${r.da_gui} yêu cầu, cập nhật ${r.cap_nhat} ticket.`, r.loi ? "error" : "ok");
      reload();
    } finally {
      setBusy(false);
    }
  };
  const coTheXem = (r: ThieuHangRow) => !r.da_xem && !THIEU_HANG_MO.includes(r.trang_thai) && r.trang_thai !== "Da huy";
  const cols: Column<ThieuHangRow>[] = [
    {
      key: "unit",
      header: "Đơn bảo hành",
      render: (r) => (
        <span className="whitespace-nowrap">
          {quanLy && coTheXem(r) && (
            <input
              type="checkbox"
              className="mr-1.5 align-middle"
              checked={chon.has(r.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setChon((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })}
            />
          )}
          <span className="font-mono font-semibold text-[var(--link)]">{r.unit_id}</span>
        </span>
      ),
    },
    { key: "tt", header: "Trạng thái", render: (r) => <span className="inline-flex items-center gap-1"><ThieuHangBadge tt={r.trang_thai} />{!!r.cho_de_xuat && <Badge tone="green">Chờ đề xuất LK</Badge>}{coTheXem(r) && <Badge tone="red">Mới</Badge>}</span> },
    { key: "lk", header: "Linh kiện thiếu", render: (r) => <span className="truncate block max-w-[260px]" title={r.ma_lk}>{r.ten_lk || nameOf(r.ma_lk)} × {r.so_luong}</span> },
    { key: "ticket", header: "Ticket / dự kiến", render: (r) => <ChiTietDong r={r} /> },
    { key: "ktv", header: "KTV", render: (r) => (r.ktv ? <UserName email={r.ktv} /> : "Khách lẻ") },
    { key: "case", header: "Case", render: (r) => r.case_id || "—" },
    { key: "bao", header: "Báo lúc", render: (r) => <span className="whitespace-nowrap">{fmtDate(r.ngay_bao)}</span> },
  ];
  return (
    <Card
      title="📦 Thiếu hàng — yêu cầu gửi Kho / Mua hàng"
      actions={
        quanLy && (
          <Btn size="sm" disabled={busy} onClick={dongBo}>
            ↻ Đồng bộ ngay
          </Btn>
        )
      }
    >
      <div className="p-3 space-y-3">
        <p className="text-xs text-[var(--ink-soft)]">
          Tự tạo khi ghi lý do chậm "Không có linh kiện" / "Hết hàng tồn kho" (hoặc bấm "Báo thiếu hàng" trong chi tiết đơn). Kho / Mua hàng xử lý bên app Đặt mua linh kiện; trạng thái cập nhật về đây ngay khi họ thao tác.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {NHOM.map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => doiNhom(o.k)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${nhom === o.k ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--line)] text-[var(--ink-body)]"}`}
            >
              {o.label} <span className="opacity-75">({counts[o.k] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã đơn, ticket, linh kiện, case, khách…" className="w-full sm:w-80" />
          <ExcelExportButton
            file={`thieu-hang_${nhom}`}
            disabled={!pg.total}
            sources={[{ path, itemsKey: "rows", sheet: "Thieu hang", cols: THIEU_HANG_EXPORT }]}
          />
          {quanLy && chon.size > 0 && (
            <Btn size="sm" variant="primary" onClick={() => daNam([...chon])}>
              ✔ Đã nắm {chon.size}
            </Btn>
          )}
          {quanLy && nhom === "can_xem" && pg.items.some(coTheXem) && chon.size === 0 && (
            <Btn size="sm" onClick={() => daNam(pg.items.filter(coTheXem).map((r) => r.id))}>
              ✔ Đã nắm cả trang
            </Btn>
          )}
        </div>
        <Table columns={cols} rows={pg.items} rowKey={(r) => String(r.id)} onRowClick={(r) => setMo(r.unit_id)} emptyText={pg.loading ? "Đang tải…" : "Không có yêu cầu thiếu hàng nào."} />
        <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
      </div>
      {mo && <UnitDetailModal unitId={mo} user={user} onClose={() => setMo(null)} onChanged={reload} />}
    </Card>
  );
}

// 16/11/2026: cot file Excel "tải theo bộ lọc" tab Thiếu hàng.
const THIEU_HANG_EXPORT: ExportCol<ThieuHangRow>[] = [
  { header: "Đơn vị BH", value: (r) => r.unit_id, width: 16 },
  { header: "Ticket", value: (r) => r.ticket_id, width: 14 },
  { header: "Trạng thái", value: (r) => r.trang_thai, width: 22 },
  { header: "Mã LK", value: (r) => r.ma_lk, width: 14 },
  { header: "Tên linh kiện", value: (r) => r.ten_lk, width: 34 },
  { header: "SL", value: (r) => r.so_luong, width: 6 },
  { header: "Mã case", value: (r) => r.case_id, width: 16 },
  { header: "KTV", value: (r) => (r.ktv ? displayName(r.ktv) : ""), width: 28 },
  { header: "Miền", value: (r) => (r.mien === "MB" ? "Miền Bắc" : r.mien === "MN" ? "Miền Nam" : ""), width: 12 },
  { header: "Lý do", value: (r) => r.ly_do, width: 24 },
  { header: "Người báo", value: (r) => (r.nguoi_bao ? displayName(r.nguoi_bao) : ""), width: 24 },
  { header: "Ngày báo", value: (r) => fmtD(r.ngay_bao), width: 16 },
  { header: "Ngày dự kiến", value: (r) => r.ngay_du_kien, width: 14 },
  { header: "Mã EO mua", value: (r) => r.ma_eo_mua, width: 14 },
  { header: "Ghi chú xử lý", value: (r) => r.ghi_chu_xu_ly, width: 30 },
];
