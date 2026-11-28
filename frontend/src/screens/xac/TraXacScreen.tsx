import { useEffect, useMemo, useRef, useState } from "react";
import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { useListFilters, withQuery, KHOANG_DEF, LK_A_DEF, LK_B_DEF, LK_C_DEF, type FilterDef } from "../../ui/FilterBar";
import { ExcelToolbar, colsFilterKeys, type FilterCol } from "../../ui/ColumnFilter";
import { GroupedDonView, DonViewToggle, useDonViewMode, type GroupRow } from "../../ui/GroupedDonView";
import { Card, Badge, Btn, Input, Textarea, Field, Spinner, EmptyState } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { MienBadge } from "../../ui/MienBadge";
import { DETAIL_MAX_W, DetailGrid, SummaryBox, Section, KvGrid, Kv, Banner, CopyBtn } from "../../ui/DetailParts";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName, displayName, useUserNames } from "../../hooks/useUserNames";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { fmtDate } from "../../lib/format";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser } from "../../lib/types";
import { ExcelExportButton, type ExportCol } from "../../ui/ExcelExport";
import { ImportXacModal } from "./ImportXac";
import { DoiTacSelect } from "../qtri/DoiTac";
import { LuongNgang, type MocLuong } from "../../ui/LuongNgang";
import { taiBbbg } from "../../lib/bbbgXlsx";
import { ImportBbbgModal } from "./ImportBbbg";
import { useIsMobile } from "../../hooks/useIsMobile";

// 13/11/2026 - Module quan ly tra xac linh kien. Nguyen van: "linh kiện được gửi về bh, admin bh duyệt đổi mới =>
// xác nhận trạng thái trả xác => admin bh định kỳ sẽ gom nhiều xác linh kiện và trả về 1 đợt cho nhà máy => tạo
// thùng trả xác => add linh kiện => thêm thông tin (mã EO) => kế toán và kiểm tra thông tin => phê duyệt => kết thúc
// luồng trả xác. (có đủ các bước thêm, bớt linh kiện xác". Backend: routes/xac.ts (/api/tra-xac).

export interface XacRow {
  id: string; // ma don vi (xac Doi moi) hoac ma de xuat DX-... (xac sua chua)
  loai: "doi_moi" | "tru_no" | "sua_chua"; // v1.166: tru_no = don Xac nhan tru cong no
  unit_id: string; // don vi bao hanh chua xac (mo UI chi tiet)
  so_luong: number;
  xac_xl_boi: string | null;
  xac_xl_luc: string | null;
  xac_xl_ghi_chu: string | null;
  ngay_xl: string | null;
  parent_id: string;
  trang_thai: string;
  xac_tt: string | null;
  thung_xac_id: string | null;
  ma_lk: string | null;
  ma_lk_nhan: string | null;
  ma_lk_thuc_te: string | null;
  ma_lk_xac: string | null;
  case_id: string | null;
  mien: "MB" | "MN" | null;
  mo_ta_loi: string | null;
  ktv: string | null;
  khach_hang: string | null;
  updated_at: string;
  doi_tac_id?: number | null; // 16/11/2026 (v1.142): doi tac cua don bao hanh (Admin chot > CRM)
  doi_tac?: string | null;
  kien?: string | null; // 26/11/2026 (v1.162): so kien (thung vat ly) khi xac nam trong thung TX
}
interface ThungXac {
  id: string;
  trang_thai: "nhap" | "cho_ke_toan" | "da_duyet";
  doi_tac: string | null;
  doi_tac_id?: number | null;
  ma_eo: string | null;
  ghi_chu: string | null;
  mien: "MB" | "MN" | null;
  nguoi_tao: string | null;
  created_at: string;
  updated_at: string;
  gui_kt_boi: string | null;
  gui_kt_luc: string | null;
  kt_boi: string | null;
  kt_luc: string | null;
  ly_do_tra_lai: string | null;
  tra_lai_boi: string | null;
  tra_lai_luc: string | null;
  so_xac?: number;
}
interface ThungLog {
  id: number;
  tu_trang_thai: string | null;
  den_trang_thai: string | null;
  nguoi_thuc_hien: string;
  thoi_gian: string;
  ghi_chu: string;
}

const TT_LABEL: Record<string, string> = { nhap: "Nháp", cho_ke_toan: "Chờ KT duyệt", da_duyet: "KT đã duyệt — kết thúc" };
const TT_TONE: Record<string, "gray" | "amber" | "green"> = { nhap: "gray", cho_ke_toan: "amber", da_duyet: "green" };
const ERR: Record<string, string> = {
  NGOAI_DOI_TAC_DUOC_GAN: "Không thuộc đối tác bạn được gán",
  DOI_TAC_MISMATCH: "Khác đối tác của thùng (1 thùng 1 đối tác)",
  REQUIRE_MA_EO: "Cần nhập mã EO trước khi gửi / duyệt.",
  THUNG_RONG: "Thùng chưa có xác nào.",
  THUNG_CON_XAC: "Thùng còn xác — bỏ hết xác trước khi xoá.",
  XAC_KHONG_CHO_GOM: "Xác không còn ở danh sách chờ gom (đã vào thùng khác / đổi xử lý xác).",
  MIEN_MISMATCH: "Xác khác miền với thùng.",
  XAC_TRONG_THUNG: "Xác đang trong thùng trả xác — bỏ khỏi thùng trước.",
};
const err = (e: unknown) => ERR[(e as { code?: string })?.code || ""] || errorMessage(e);

// 16/11/2026 (v1.142): vai tro "Tra xac" lam phan viec cua Admin BH o man nay voi xac / thung cua doi tac duoc gan (backend loc + chan).
const admin = (u: AppUser) => u.la_admin_bh || u.la_qtri || !!u.la_tra_xac;
const quanTri = (u: AppUser) => u.la_admin_bh || u.la_qtri; // import ket qua hang loat: chi Admin BH
const kt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
const xem = (u: AppUser) => admin(u) || kt(u) || u.la_view || u.la_giam_sat;

const NGUOI_GUI: FilterDef = { key: "nguoi_gui", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" };
const MIEN_DEF: FilterDef = { key: "mien", label: "Miền", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, kind: "map", noneLabel: "Chưa khai báo" };
const LK_XAC_DEF: FilterDef = { ...LK_B_DEF, label: "LK xác (B)" };
// 16/11/2026: loc giong Don BH - LK A (KTV chon) / B (xac thuc te gui ve) / C (doi moi), KTV gui, mien, thoi gian
// + loc chu tren cot ID / case / mo ta loi + sap xep (backend routes/xac.ts TXT_UNIT / SORT_UNIT).
export const XAC_KQ_LABEL: Record<string, string> = { ngoai: "Đã xử lý ngoài hệ thống", tieu_huy: "Xác đã tiêu huỷ", that_lac: "Xác thất lạc", khong_co: "Không có xác", luu_kho: "Lưu kho" }; // v1.159: them luu_kho (= BE lib/xac.ts XAC_KQ_LABEL)
const LOAI_DEF: FilterDef = { key: "loai", label: "Loại xác", kind: "map", labels: { doi_moi: "Đổi mới (KTV gửi về)", tru_no: "Trừ công nợ (KTV gửi về)", sua_chua: "Sau sửa chữa (LK cấp)" } };
const KQ_DEF: FilterDef = { key: "kq", label: "Kết quả", kind: "map", labels: XAC_KQ_LABEL };
const NV_DEF: FilterDef = { key: "nv", label: "NV sửa chữa", kind: "person", noneLabel: "Chưa gán" };
// 16/11/2026 ("Bộ lọc nhanh thêm lọc theo từ ngày đến ngày xử lý"): ngay xu ly = luc danh dau ket qua (tieu huy / that lac...)
// hoac luc xac phat sinh (Admin chot doi moi / Kho xuat linh kien sua chua) - backend x.ngay_xl, tham so ?xl=tu:..:..
const XL_DEF: FilterDef = { key: "xl", label: "Ngày xử lý (từ → đến)", range: true };
const DOI_TAC_DEF: FilterDef = { key: "doi_tac", label: "Đối tác", noneLabel: "Chưa có đối tác" };
const XAC_DEFS: FilterDef[] = [XL_DEF, DOI_TAC_DEF, LOAI_DEF, KQ_DEF, NGUOI_GUI, NV_DEF, LK_A_DEF, LK_XAC_DEF, LK_C_DEF, MIEN_DEF, { ...KHOANG_DEF, label: "Cập nhật" }];
const XAC_KEYS = [...XAC_DEFS.map((d) => d.key), "f_id", "f_case", "f_mota"];
// Cot khong hien tren bang nhung van loc duoc (chip + nut cot o che do nhom).
const XAC_EXTRA_COLS: FilterCol[] = [
  { key: "lk_a", label: "LK KTV chọn (A)", filter: { type: "multi", def: LK_A_DEF } },
  { key: "nv", label: "NV sửa chữa", filter: { type: "multi", def: NV_DEF } },
  { key: "mota", label: "Mô tả lỗi", filter: { type: "text", key: "f_mota", placeholder: "Từ trong mô tả…" } },
];

function useXacCols(selected?: Set<string>, onToggle?: (id: string) => void, ngoai?: boolean): Column<XacRow>[] {
  const { nameOf } = useLkName();
  const cols: Column<XacRow>[] = [
    {
      key: "id",
      header: "ID đơn",
      filter: { type: "text", key: "f_id", placeholder: "Mã đơn…" },
      sortKey: "id",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {selected && onToggle && <input type="checkbox" checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(r.id)} />}
          <span className="font-mono font-semibold text-[var(--link)]">{r.id}</span>
          {r.loai === "sua_chua" && <span className="font-mono text-[11px] text-[var(--ink-soft)]" title="Đơn bảo hành chứa xác">{r.unit_id}</span>}
        </span>
      ),
    },
    { key: "loai", header: "Loại", filter: { type: "multi", def: LOAI_DEF }, sortKey: "loai", render: (r) => <LoaiBadge r={r} /> },
    { key: "lk", header: "Linh kiện xác (B)", filter: { type: "multi", def: LK_XAC_DEF }, sortKey: "lk", render: (r) => <span className="block max-w-[300px] truncate" title={nameOf(r.ma_lk_xac)}>{nameOf(r.ma_lk_xac)}</span> },
    { key: "c", header: "Đổi mới (C)", filter: { type: "multi", def: LK_C_DEF }, sortKey: "c", render: (r) => (r.ma_lk_thuc_te && r.ma_lk_thuc_te !== r.ma_lk_xac ? <span className="text-xs" title={nameOf(r.ma_lk_thuc_te)}>{r.ma_lk_thuc_te}</span> : <span className="text-[var(--ink-faint)]">=B</span>) },
    { key: "sl", header: "SL", sortKey: "sl", render: (r) => <span className="font-semibold">{r.so_luong ?? 1}</span> },
    { key: "ktv", header: "KTV gửi", filter: { type: "multi", def: NGUOI_GUI }, sortKey: "ktv", render: (r) => (r.ktv ? <UserName email={r.ktv} /> : "Khách lẻ") },
    { key: "case", header: "Case · Khách", filter: { type: "text", key: "f_case", placeholder: "Mã case / tên khách…" }, sortKey: "case", render: (r) => <span className="text-xs">{[r.case_id, r.khach_hang].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "mien", header: "Miền", filter: { type: "multi", def: MIEN_DEF }, sortKey: "mien", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "doi_tac", header: "Đối tác", filter: { type: "multi", def: DOI_TAC_DEF }, sortKey: "doi_tac", render: (r) => <span className="block max-w-[180px] truncate text-xs" title={r.doi_tac || undefined}>{r.doi_tac || "—"}</span> },
    { key: "xl", header: "Ngày xử lý", filter: { type: "date", key: "xl" }, sortKey: "xl", render: (r) => <span className="text-xs">{r.ngay_xl ? fmtDate(r.ngay_xl) : "—"}</span> },
  ];
  if (ngoai)
    cols.splice(2, 0, {
      key: "kq",
      header: "Kết quả",
      filter: { type: "multi", def: KQ_DEF },
      sortKey: "kq",
      render: (r) => (
        <span title={[r.xac_xl_boi && displayName(r.xac_xl_boi), r.xac_xl_ghi_chu].filter(Boolean).join(" · ") || undefined}>
          <Badge tone={r.xac_tt === "that_lac" ? "red" : r.xac_tt === "tieu_huy" ? "orange" : "gray"}>{XAC_KQ_LABEL[r.xac_tt || ""] || r.xac_tt}</Badge>
        </span>
      ),
    });
  return cols;
}

// 16/11/2026: cot file Excel "tải theo bộ lọc" cua danh sach xac.
function xacExportCols(nameOf: (m: string | null | undefined) => string): ExportCol<XacRow>[] {
  const mienTxt = (v: string | null) => (v === "MB" ? "Miền Bắc" : v === "MN" ? "Miền Nam" : "Chưa khai báo");
  return [
    { header: "Mã xác", value: (r) => r.id, width: 16 },
    { header: "Loại", value: (r) => (r.loai === "sua_chua" ? "Sau sửa chữa" : r.loai === "tru_no" ? "Trừ công nợ" : "Đổi mới"), width: 14 },
    { header: "Đơn vị BH", value: (r) => r.unit_id, width: 16 },
    { header: "Mã LK xác (B)", value: (r) => r.ma_lk_xac, width: 14 },
    { header: "Linh kiện xác (B)", value: (r) => nameOf(r.ma_lk_xac), width: 34 },
    { header: "LK KTV chọn (A)", value: (r) => (r.ma_lk ? nameOf(r.ma_lk) : ""), width: 30 },
    { header: "LK đổi mới (C)", value: (r) => (r.ma_lk_thuc_te ? nameOf(r.ma_lk_thuc_te) : ""), width: 30 },
    { header: "SL", value: (r) => r.so_luong ?? 1, width: 6 },
    { header: "KTV gửi", value: (r) => (r.ktv ? displayName(r.ktv) : "Khách lẻ"), width: 28 },
    { header: "Mã case", value: (r) => r.case_id, width: 16 },
    { header: "Khách hàng", value: (r) => r.khach_hang, width: 22 },
    { header: "Mô tả lỗi", value: (r) => r.mo_ta_loi, width: 36 },
    { header: "Miền", value: (r) => mienTxt(r.mien), width: 12 },
    { header: "Đối tác", value: (r) => r.doi_tac, width: 24 },
    { header: "Kết quả", value: (r) => (r.thung_xac_id ? `Trong thùng ${r.thung_xac_id}` : r.xac_tt ? XAC_KQ_LABEL[r.xac_tt] || r.xac_tt : "Chờ gom"), width: 22 },
    { header: "Người ghi kết quả", value: (r) => (r.xac_xl_boi ? displayName(r.xac_xl_boi) : ""), width: 24 },
    { header: "Ghi chú kết quả", value: (r) => r.xac_xl_ghi_chu, width: 30 },
    { header: "Ngày xử lý", value: (r) => (r.ngay_xl ? fmtDate(r.ngay_xl) : ""), width: 16 },
    { header: "Cập nhật", value: (r) => fmtDate(r.updated_at), width: 16 },
  ];
}

const THUNG_EXPORT: ExportCol<ThungXac>[] = [
  { header: "Mã thùng", value: (r) => r.id, width: 14 },
  { header: "Trạng thái", value: (r) => TT_LABEL[r.trang_thai] || r.trang_thai, width: 20 },
  { header: "Đối tác", value: (r) => r.doi_tac, width: 26 },
  { header: "Mã EO", value: (r) => r.ma_eo, width: 16 },
  { header: "Miền", value: (r) => (r.mien === "MB" ? "Miền Bắc" : r.mien === "MN" ? "Miền Nam" : ""), width: 12 },
  { header: "Số xác", value: (r) => r.so_xac ?? 0, width: 8 },
  { header: "Người tạo", value: (r) => (r.nguoi_tao ? displayName(r.nguoi_tao) : ""), width: 24 },
  { header: "Tạo lúc", value: (r) => fmtDate(r.created_at), width: 16 },
  { header: "Gửi KT lúc", value: (r) => (r.gui_kt_luc ? fmtDate(r.gui_kt_luc) : ""), width: 16 },
  { header: "KT duyệt", value: (r) => (r.kt_luc ? `${fmtDate(r.kt_luc)} · ${r.kt_boi ? displayName(r.kt_boi) : ""}` : ""), width: 28 },
  { header: "Lý do KT trả lại", value: (r) => r.ly_do_tra_lai, width: 30 },
  { header: "Ghi chú", value: (r) => r.ghi_chu, width: 30 },
];

function LoaiBadge({ r }: { r: XacRow }) {
  return r.loai === "sua_chua" ? <Badge tone="violet">Sau sửa chữa</Badge> : r.loai === "tru_no" ? <Badge tone="amber">Trừ công nợ</Badge> : <Badge tone="blue">Đổi mới</Badge>;
}

// ---- Bang xac don gian (chi tiet thung) ----
function XacTable({ rows, selected, onToggle, onOpen, extra, extras }: { rows: XacRow[]; selected?: Set<string>; onToggle?: (id: string) => void; onOpen?: (r: XacRow) => void; extra?: Column<XacRow>; extras?: Column<XacRow>[] }) {
  const cols = useXacCols(selected, onToggle);
  return <Table columns={[...cols, ...(extras || []), ...(extra ? [extra] : [])]} rows={rows} rowKey={(r) => r.id} onRowClick={onOpen} emptyText="Không có xác nào." />;
}

type SetSel = (fn: (s: Set<string>) => Set<string>) => void;

// ---- Danh sach xac co 3 che do xem (Danh sach / Theo KTV / Theo linh kien) + loc kieu Excel ----
// 16/11/2026, nguyen van: "Menu trả xác: cho tạo logic gom linh kiện, gom ktv giống bên Đơn BH, bổ sung thêm
// các bộ lọc tương tự". Che do nhom lay toi da 500 xac / lan (nhom tren may), nhom linh kien theo B (xac).
function XacBrowser({
  base,
  viewKey,
  placeholder,
  sel,
  setSel,
  onOpen,
  extra,
  reloadRef,
  ngoai,
  pathRef,
  file = "tra-xac",
}: {
  ngoai?: boolean;
  pathRef?: { current: string };
  file?: string;
  base: string;
  viewKey: string;
  placeholder: string;
  sel?: Set<string>;
  setSel?: SetSel;
  onOpen: (r: XacRow) => void;
  extra?: Column<XacRow>;
  reloadRef?: { current: (() => void) | null };
}) {
  const flt = useListFilters(base, XAC_KEYS);
  const [mode, setMode] = useDonViewMode(viewKey);
  const grouped = mode !== "list";
  const { items, total, page, pageCount, setPage, reload, loading, raw } = usePagedApi<XacRow>(withQuery(base, flt.query), "xac", grouped ? 500 : 50);
  const tongSl = Number(raw.tong_sl ?? 0);
  if (reloadRef) reloadRef.current = reload;
  const listPath = withQuery(base, flt.query);
  if (pathRef) pathRef.current = listPath;
  const { nameOf } = useLkName();
  const toggleOne = setSel ? (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }) : undefined;
  const cols = useXacCols(sel, toggleOne, ngoai);
  useEffect(() => setSel?.(() => new Set()), [flt.query, page, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const allOn = items.length > 0 && items.every((r) => sel?.has(r.id));
  const groupRows: GroupRow[] = useMemo(
    () =>
      items.map((r) => ({
        id: r.id,
        ktv: r.ktv,
        lk: r.ma_lk_xac,
        caseId: r.case_id,
        slDat: r.so_luong ?? 1,
        moTa: [r.khach_hang, r.mo_ta_loi].filter(Boolean).join(" · ") || null,
        status: r.loai === "sua_chua" ? <span className="text-xs text-[var(--ink-soft)]">Sửa chữa · {r.unit_id}</span> : r.loai === "tru_no" ? <span className="text-xs text-[var(--ink-faint)]">Trừ công nợ KTV</span> : r.ma_lk_thuc_te && r.ma_lk_thuc_te !== r.ma_lk_xac ? <span className="text-xs" title="Linh kiện đổi mới (C)">Đổi: {r.ma_lk_thuc_te}</span> : <span className="text-xs text-[var(--ink-faint)]">Đổi mới = B</span>,
        sla: <span className="text-xs">{r.ngay_xl ? fmtDate(r.ngay_xl) : "—"}</span>,
        actions: extra ? extra.render(r) : undefined,
        selectable: !!sel,
        badge: (
          <>
            <LoaiBadge r={r} /> {ngoai && r.xac_tt ? <Badge tone={r.xac_tt === "that_lac" ? "red" : r.xac_tt === "tieu_huy" ? "orange" : "gray"}>{XAC_KQ_LABEL[r.xac_tt] || r.xac_tt}</Badge> : null} <MienBadge mien={r.mien} short />
          </>
        ),
        onClick: () => onOpen(r),
      })),
    [items, sel, extra], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const empty = flt.active ? "Không có xác nào khớp bộ lọc." : "Không có xác nào.";
  return (
    <div>
      <ExcelToolbar
        flt={flt}
        cols={[...cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey })), ...XAC_EXTRA_COLS]}
        defs={ngoai ? XAC_DEFS : XAC_DEFS.filter((d) => d.key !== "kq")}
        placeholder={placeholder}
        total={total}
        unit={tongSl > total ? `xác · SL ${tongSl}` : "xác"}
        colButtons={grouped}
        compactSearch
        extra={
          <>
            <ExcelExportButton file={file} disabled={!total} sources={[{ path: listPath, itemsKey: "xac", sheet: ngoai ? "Xac da xu ly khac" : "Xac", cols: xacExportCols(nameOf) }]} />
            <DonViewToggle value={mode} onChange={setMode} modes={["list", "ktv", "lk", "sc"]} />
          </>
        }
      />
      {sel && setSel && (
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <Btn size="sm" variant="ghost" disabled={!items.length} onClick={() => setSel((s) => { const n = new Set(s); items.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n; })}>
            {allOn ? "☐ Bỏ chọn tất cả đang hiện" : `☑ Chọn tất cả đang hiện (${items.length})`}
          </Btn>
          {grouped && total > items.length && <span className="text-xs text-[var(--amber-700)]">Đang nhóm {items.length}/{total} xác — lọc thêm để xem đủ.</span>}
        </div>
      )}
      {loading && !items.length ? (
        <Spinner />
      ) : grouped ? (
        <GroupedDonView
          rows={groupRows}
          mode={mode as "ktv" | "lk" | "sc"}
          selected={sel}
          onToggle={setSel ? (ids, on) => setSel((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; }) : undefined}
          emptyText={empty}
          xac
        />
      ) : (
        <>
          <Table flt={flt} columns={extra ? [...cols, extra] : cols} rows={items} rowKey={(r) => r.id} onRowClick={onOpen} emptyText={empty} />
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// Tom tat theo linh kien xac (de nhap phieu EO / gui nha may).
function tomTat(rows: XacRow[], nameOf: (m: string | null) => string): { ma: string | null; ten: string; n: number }[] {
  const m = new Map<string, { ma: string | null; ten: string; n: number }>();
  for (const r of rows) {
    const k = r.ma_lk_xac || "";
    const cur = m.get(k) || { ma: r.ma_lk_xac, ten: nameOf(r.ma_lk_xac), n: 0 };
    cur.n += Number(r.so_luong) || 1;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

// ---- Tab: xac cho gom ----
function XacChoGom({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const toast = useToast();
  const base = "/tra-xac/xac?nhom=cho_gom";
  const reloadRef = useRef<(() => void) | null>(null);
  const reload = () => reloadRef.current?.();
  const pathRef = useRef(base);
  const [imp, setImp] = useState(false);
  const [impBbbg, setImpBbbg] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tao, setTao] = useState(false);
  const [themVao, setThemVao] = useState(false);
  const [ngoai, setNgoai] = useState<string | null>(null); // ket qua dang xac nhan: ngoai | tieu_huy | that_lac | khong_co
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [openThung, setOpenThung] = useState<string | null>(null);
  const done = () => { setSel(new Set()); reload(); onChanged(); };
  const isA = admin(user);
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">♻️ Xác chờ gom thùng</h3>
        <span className="text-xs text-[var(--ink-soft)]">Xác KTV gửi về (đơn Đổi mới, "Trả đối tác") + xác linh kiện thay khi sửa chữa (linh kiện cấp đã xuất) — chưa vào thùng trả xác.</span>
        {isA && (
          <Btn size="sm" variant="secondary" className="ml-auto" onClick={() => setImpBbbg(true)} title="Đối chiếu biên bản bàn giao lập tay (mã case + mã hàng) với xác trong app rồi đưa các xác khớp vào thùng trả xác">
            ⬆ Import BBBG
          </Btn>
        )}
        {quanTri(user) && (
          <Btn size="sm" variant="secondary" className={isA ? "" : "ml-auto"} onClick={() => setImp(true)} title="Ghi kết quả / đưa vào thùng cho nhiều xác bằng file Excel">
            ⬆ Import kết quả
          </Btn>
        )}
      </div>
      {imp && <ImportXacModal listPath={pathRef.current} onClose={() => setImp(false)} onDone={() => { setImp(false); done(); }} />}
      {impBbbg && <ImportBbbgModal onClose={() => setImpBbbg(false)} onDone={(tid) => { setImpBbbg(false); done(); setOpenThung(tid); }} />}
      {isA && sel.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 mb-2 rounded-lg px-2.5 py-1.5 bg-[var(--brand-50)] border border-[var(--brand-200)]">
          {(
            <>
              <span className="text-sm font-semibold">Đã chọn {sel.size} xác</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setNgoai("tieu_huy")}>🔥 Xác đã tiêu huỷ</Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setNgoai("that_lac")}>❓ Xác thất lạc</Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setNgoai("khong_co")}>∅ Không có xác</Btn>
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setNgoai("ngoai")}>Đã trả ngoài hệ thống</Btn>
                <Btn size="sm" variant="secondary" disabled={busy} onClick={() => setThemVao(true)}>Thêm vào thùng nháp…</Btn>
                <Btn size="sm" variant="primary" disabled={busy} onClick={() => setTao(true)}>＋ Tạo thùng trả xác ({sel.size})</Btn>
              </span>
            </>
          )}
        </div>
      )}
      <XacBrowser
        base={base}
        viewKey="xac_view_cho_gom"
        file="xac-cho-gom"
        pathRef={pathRef}
        placeholder="Tìm mã đơn, case, linh kiện, KTV, khách…"
        sel={isA ? sel : undefined}
        setSel={isA ? setSel : undefined}
        onOpen={(r) => setOpenUnit(r.unit_id)}
        reloadRef={reloadRef}
      />
      {tao && (
        <TaoThungModal
          ids={[...sel]}
          onClose={() => setTao(false)}
          onDone={(id) => { setTao(false); done(); setOpenThung(id); }}
        />
      )}
      {themVao && <ChonThungNhapModal ids={[...sel]} onClose={() => setThemVao(false)} onDone={(id) => { setThemVao(false); done(); setOpenThung(id); }} />}
      {ngoai && (
        <NgoaiModal
          n={sel.size}
          kq={ngoai}
          onClose={() => setNgoai(null)}
          onOk={async (lyDo) => {
            setBusy(true);
            try {
              const r = await api.post<{ ok: number; bo_qua: number }>("/tra-xac/xac/ngoai", { ids: [...sel], ly_do: lyDo, kq: ngoai });
              toast(`${XAC_KQ_LABEL[ngoai]}: ${r.ok} xác${r.bo_qua ? ` (${r.bo_qua} bỏ qua)` : ""}.`, "ok");
              setNgoai(null);
              done();
            } catch (e) {
              toast(err(e), "error");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={reload} />}
      {openThung && <ThungXacDetailModal id={openThung} user={user} onClose={() => setOpenThung(null)} onChanged={() => { reload(); onChanged(); }} />}
    </Card>
  );
}

function NgoaiModal({ n, kq, onClose, onOk }: { n: number; kq: string; onClose: () => void; onOk: (lyDo: string) => void }) {
  const [lyDo, setLyDo] = useState("");
  return (
    <Modal title={`Xác nhận: ${XAC_KQ_LABEL[kq]}`} onClose={onClose} maxWidthClass="max-w-md" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" onClick={() => onOk(lyDo)}>Xác nhận {n} xác</Btn></>}>
      <p className="text-sm mb-2">{n} xác được ghi kết quả "<b>{XAC_KQ_LABEL[kq]}</b>" và rời danh sách chờ gom (vẫn đưa lại được ở tab "Đã xử lý khác").</p>
      <Field label="Ghi chú (tuỳ chọn)"><Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: đã trả nhà máy theo đợt tháng 10" /></Field>
    </Modal>
  );
}

function TaoThungModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const [doiTac, setDoiTac] = useState<number | null>(null);
  const [eo, setEo] = useState("");
  const [ghi, setGhi] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ id: string; ok: number; loi: { id: string; error: string }[] }>("/tra-xac/thung", { unit_ids: ids, doi_tac_id: doiTac, ma_eo: eo, ghi_chu: ghi });
      toast(`Đã tạo ${r.id} với ${r.ok} xác${r.loi.length ? ` — ${r.loi.length} xác không thêm được (${r.loi.map((l) => `${l.id}: ${ERR[l.error] || l.error}`).join("; ")})` : ""}.`, r.loi.length ? "error" : "ok");
      onDone(r.id);
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Tạo thùng trả xác (${ids.length} xác)`} onClose={onClose} maxWidthClass="max-w-lg" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" disabled={busy} onClick={submit}>Tạo thùng</Btn></>}>
      <div className="space-y-2">
        <Field label="Đối tác nhận xác" hint="Bỏ trống = lấy theo đối tác của xác đầu tiên. 1 thùng chỉ chứa xác của 1 đối tác."><DoiTacSelect value={doiTac} onChange={setDoiTac} /></Field>
        <Field label="Mã EO" hint="Có thể nhập sau — bắt buộc trước khi gửi Kế toán"><Input value={eo} onChange={(e) => setEo(e.target.value)} /></Field>
        <Field label="Ghi chú"><Textarea rows={2} value={ghi} onChange={(e) => setGhi(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ChonThungNhapModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const [list, setList] = useState<ThungXac[] | null>(null);
  useEffect(() => {
    api.get<{ thung: ThungXac[] }>("/tra-xac/thung?trang_thai=nhap,cho_ke_toan&limit=100").then((r) => setList(r.thung)).catch(() => setList([]));
  }, []);
  const them = async (t: ThungXac) => {
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>(`/tra-xac/thung/${t.id}/xac`, { unit_ids: ids });
      toast(`Đã thêm ${r.ok} xác vào ${t.id}${r.loi.length ? ` — ${r.loi.length} xác không thêm được (${r.loi.map((l) => `${l.id}: ${ERR[l.error] || l.error}`).join("; ")})` : ""}.`, r.loi.length ? "error" : "ok");
      onDone(t.id);
    } catch (e) {
      toast(err(e), "error");
    }
  };
  return (
    <Modal title={`Thêm ${ids.length} xác vào thùng`} onClose={onClose} maxWidthClass="max-w-lg">
      {!list ? <Spinner /> : !list.length ? <EmptyState text="Chưa có thùng nháp nào — dùng “Tạo thùng trả xác”." /> : (
        <div className="space-y-1.5">
          {list.map((t) => (
            <button key={t.id} type="button" onClick={() => them(t)} className="focus-ring w-full text-left rounded-lg border border-[var(--line)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono font-semibold text-[var(--link)]">{t.id}</span> <Badge tone={TT_TONE[t.trang_thai]}>{TT_LABEL[t.trang_thai]}</Badge> <MienBadge mien={t.mien} short />
              <span className="block text-xs text-[var(--ink-soft)]">{t.doi_tac || "Chưa có đối tác"} · EO {t.ma_eo || "—"} · {t.so_xac ?? 0} xác</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---- Danh sach thung ----
// 25/11/2026 (v1.161): bang thung loc + sap xep kieu Excel tren tieu de cot (bo loc chon nhieu) thay thanh o <select> chon 1.
const TT_THUNG_DEF: Record<string, FilterDef> = {
  doi_tac: { key: "doi_tac", label: "Đối tác", noneLabel: "Chưa có đối tác" },
  nguoi_tao: { key: "nguoi_tao", label: "Người tạo", kind: "person" },
  mien: MIEN_DEF,
  kt_boi: { key: "kt_boi", label: "KT duyệt", kind: "person" },
};
function ThungList({ user, tt, traLai, title, empty, onChanged }: { user: AppUser; tt: string; traLai?: boolean; title: string; empty: string; onChanged: () => void }) {
  const base = `/tra-xac/thung?trang_thai=${tt}${traLai ? "&tra_lai=1" : ""}`;
  const daDuyet = tt === "da_duyet";
  const cols: Column<ThungXac>[] = [
    { key: "id", header: "Mã thùng", filter: { type: "text", key: "f_id", placeholder: "Mã thùng…" }, sortKey: "id", render: (r) => <span className="font-mono font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "tt", header: "Trạng thái", render: (r) => <span className="inline-flex gap-1"><Badge tone={TT_TONE[r.trang_thai]}>{TT_LABEL[r.trang_thai]}</Badge>{r.ly_do_tra_lai && r.trang_thai === "nhap" && <Badge tone="red">↩ KT trả lại</Badge>}</span> },
    { key: "n", header: "Số xác", filter: { type: "number", key: "n" }, sortKey: "n", render: (r) => <b>{r.so_xac ?? 0}</b> },
    { key: "dt", header: "Đối tác", filter: { type: "multi", def: TT_THUNG_DEF.doi_tac }, sortKey: "dt", render: (r) => r.doi_tac || "—" },
    { key: "eo", header: "Mã EO", filter: { type: "text", key: "f_eo", placeholder: "Mã EO…" }, sortKey: "eo", render: (r) => (r.ma_eo ? <span className="font-mono">{r.ma_eo}</span> : <span className="text-[var(--red-600)]">Chưa có</span>) },
    { key: "mien", header: "Miền", filter: { type: "multi", def: TT_THUNG_DEF.mien }, sortKey: "mien", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "nt", header: "Người tạo", filter: { type: "multi", def: TT_THUNG_DEF.nguoi_tao }, sortKey: "nt", render: (r) => <UserName email={r.nguoi_tao} /> },
    ...(daDuyet ? [{ key: "ktb", header: "KT duyệt", filter: { type: "multi", def: TT_THUNG_DEF.kt_boi }, render: (r: ThungXac) => <UserName email={r.kt_boi} /> } as Column<ThungXac>] : []),
    daDuyet
      ? { key: "kt", header: "KT duyệt lúc", filter: { type: "date", key: "kt" }, sortKey: "kt", render: (r) => <span className="text-xs">{fmtDate(r.kt_luc)}</span> }
      : { key: "cn", header: "Cập nhật", filter: { type: "date", key: "cn" }, sortKey: "cn", render: (r) => <span className="text-xs">{fmtDate(r.updated_at)}</span> },
    { key: "ld", header: "Ghi chú", filter: { type: "text", key: "f_gc", placeholder: "Từ trong ghi chú / lý do…" }, render: (r) => <span className="block max-w-[260px] truncate text-xs" title={r.ly_do_tra_lai || r.ghi_chu || ""}>{(r.trang_thai === "nhap" && r.ly_do_tra_lai) || r.ghi_chu || "—"}</span> },
  ];
  const DEFS: FilterDef[] = [TT_THUNG_DEF.doi_tac, TT_THUNG_DEF.nguoi_tao, TT_THUNG_DEF.mien, ...(daDuyet ? [TT_THUNG_DEF.kt_boi] : []), { ...KHOANG_DEF, label: "Thời gian tạo" }];
  const flt = useListFilters(base, [...new Set([...DEFS.map((d) => d.key), ...colsFilterKeys(cols)])]);
  const { items, total, page, pageCount, setPage, reload, loading } = usePagedApi<ThungXac>(withQuery(base, flt.query), "thung");
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">{title}</h3>
      <ExcelToolbar
        flt={flt}
        cols={cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey }))}
        defs={DEFS}
        placeholder="Tìm mã thùng, EO, đối tác, mã đơn / case / linh kiện bên trong…"
        total={total}
        unit="thùng"
        compactSearch
        extra={<ExcelExportButton file={`thung-tra-xac_${tt}`} disabled={!total} sources={[{ path: withQuery(base, flt.query), itemsKey: "thung", sheet: "Thung tra xac", cols: THUNG_EXPORT }]} />}
      />
      {loading && !items.length ? <Spinner /> : <Table flt={flt} columns={cols} rows={items} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} emptyText={flt.active ? "Không có thùng nào khớp bộ lọc." : empty} />}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {open && <ThungXacDetailModal id={open} user={user} onClose={() => setOpen(null)} onChanged={() => { reload(); onChanged(); }} />}
    </Card>
  );
}

// ---- Xac da xu ly ngoai ----
function XacNgoai({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const toast = useToast();
  const base = "/tra-xac/xac?nhom=ngoai";
  const reloadRef = useRef<(() => void) | null>(null);
  const reload = () => reloadRef.current?.();
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const duaLai = async (id: string) => {
    try {
      await api.post("/tra-xac/xac/ngoai", { ids: [id], dua_lai: true });
      toast(`Đã đưa ${id} lại danh sách chờ gom.`, "ok");
      reload();
      onChanged();
    } catch (e) {
      toast(err(e), "error");
    }
  };
  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-1">Xác đã xử lý khác (không qua thùng)</h3>
      <p className="text-xs text-[var(--ink-soft)] mb-2">Xác đã tiêu huỷ / thất lạc / không có xác / đã trả ngoài hệ thống — gồm cả xác của đơn tạo trước 01/11/2026 (thời AppSheet).</p>
      <XacBrowser
        base={base}
        viewKey="xac_view_ngoai"
        file="xac-da-xu-ly-khac"
        placeholder="Tìm mã đơn, case, linh kiện, KTV…"
        ngoai
        onOpen={(r) => setOpenUnit(r.unit_id)}
        reloadRef={reloadRef}
        extra={admin(user) ? { key: "act", header: "", render: (r) => <Btn size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); duaLai(r.id); }}>↺ Đưa lại chờ gom</Btn> } : undefined}
      />
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={reload} />}
    </Card>
  );
}

// ---- Chi tiet thung tra xac ----
// 28/11/2026 (v1.167) - danh sach xac trong thung tren DIEN THOAI: "grouped list" iOS gon (3 dong / xac) thay the 10 o nhan-gia tri
// (~350px / xac). Nguyen van: "hoàn thiện lại giao diện UI chi tiết cho bản mobile" (man Thùng trả xác).
function XacListMobile({ rows, selected, onToggle, onOpen, onBo, busy }: { rows: XacRow[]; selected?: Set<string>; onToggle?: (id: string) => void; onOpen: (r: XacRow) => void; onBo?: (r: XacRow) => void; busy?: boolean }) {
  const { nameOf } = useLkName();
  if (!rows.length) return <EmptyState text="Không có xác nào." />;
  return (
    <ul className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-card divide-y divide-[var(--line)]">
      {rows.map((r) => {
        const chon = !!selected?.has(r.id);
        return (
          <li key={r.id} className={`flex items-start gap-2.5 px-3 py-2.5 ${chon ? "bg-[var(--accent-soft)]" : ""}`}>
            {selected && onToggle && (
              <label className="-m-2 flex shrink-0 items-center p-2" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={chon} onChange={() => onToggle(r.id)} aria-label={`Chọn ${r.id}`} />
              </label>
            )}
            <button type="button" className="min-w-0 flex-1 text-left active:opacity-70" onClick={() => onOpen(r)}>
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[13.5px] font-semibold text-[var(--link)]">{r.id}</span>
                <LoaiBadge r={r} />
                {(r.so_luong ?? 1) > 1 && <span className="text-xs font-semibold text-[var(--ink-body)]">× {r.so_luong}</span>}
              </span>
              <span className="mt-0.5 block truncate text-[14px] text-[var(--ink)]">{nameOf(r.ma_lk_xac)}</span>
              <span className="block truncate text-[12px] text-[var(--ink-soft)]">
                {[r.case_id, r.khach_hang, r.ktv ? displayName(r.ktv) : "Khách lẻ"].filter(Boolean).join(" · ")}
              </span>
            </button>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold tabular-nums ${r.kien ? "bg-[var(--surface-2)] text-[var(--ink)]" : "bg-[var(--amber-100)] text-[var(--amber-800)]"}`}>
                {r.kien ? `Kiện ${r.kien}` : "Chưa kiện"}
              </span>
              {onBo && (
                <button type="button" disabled={busy} className="rounded-full px-2 py-1 text-[12px] text-[var(--red-700)] active:bg-[var(--red-50)] disabled:opacity-40" onClick={() => onBo(r)}>
                  ✕ Bỏ
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ThungXacDetailModal({ id, user, onClose, onChanged }: { id: string; user: AppUser; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  useUserNames();
  const [d, setD] = useState<{ thung: ThungXac; xac: XacRow[]; logs: ThungLog[] } | null>(null);
  const [loi, setLoi] = useState("");
  const [f, setF] = useState<{ doi_tac_id: number | null; ma_eo: string; ghi_chu: string }>({ doi_tac_id: null, ma_eo: "", ghi_chu: "" });
  const [busy, setBusy] = useState(false);
  const [them, setThem] = useState(false);
  const [traLai, setTraLai] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  // 25/11/2026 (v1.161): mac dinh chi hien luong ngang + phan can thao tac; "▾ Xem chi tiết" xo tong hop, danh sach xac, nhat ky.
  const [mo, setMo] = useState(false);
  // 26/11/2026 (v1.162): chon xac trong thung de ghi so kien (thung vat ly).
  const [selK, setSelK] = useState<Set<string>>(new Set());
  const [kien, setKien] = useState("");
  const isMobile = useIsMobile();
  const load = async () => {
    try {
      const r = await api.get<{ thung: ThungXac; xac: XacRow[]; logs: ThungLog[] }>(`/tra-xac/thung/${id}`);
      setD(r);
      setF({ doi_tac_id: r.thung.doi_tac_id ?? null, ma_eo: r.thung.ma_eo || "", ghi_chu: r.thung.ghi_chu || "" });
    } catch (e) {
      setLoi(err(e));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const t = d?.thung;
  const isA = admin(user);
  const isK = kt(user);
  const suaXac = !!t && isA && (t.trang_thai === "nhap" || t.trang_thai === "cho_ke_toan");
  const suaTT = !!t && ((isA && (t.trang_thai === "nhap" || t.trang_thai === "cho_ke_toan")) || (isK && t.trang_thai === "cho_ke_toan"));
  const doiTT = !!t && (f.doi_tac_id !== (t.doi_tac_id ?? null) || f.ma_eo !== (t.ma_eo || "") || f.ghi_chu !== (t.ghi_chu || ""));
  const tt = useMemo(() => (d ? tomTat(d.xac, nameOf) : []), [d, nameOf]);
  const tomTatText = t && d ? `Thùng trả xác ${t.id}${t.ma_eo ? ` — EO ${t.ma_eo}` : ""}${t.doi_tac ? ` — ${t.doi_tac}` : ""}\nTổng: ${d.xac.length} xác (SL ${d.xac.reduce((a, r) => a + (Number(r.so_luong) || 1), 0)})\n${tt.map((x, i) => `${i + 1}) ${x.ten} × ${x.n}`).join("\n")}` : "";

  const thieuKien = d ? d.xac.filter((x) => !x.kien).length : 0;
  const taiBienBan = () => {
    if (!t || !d) return;
    const r = taiBbbg(t, d.xac, nameOf, displayName(user.email));
    toast(`Đã tải BBBG ${t.id}: ${r.tong} xác, ${r.maHang} mã hàng${r.thieuKien ? ` — ${r.thieuKien} xác chưa ghi kiện` : ""}${t.trang_thai !== "da_duyet" ? " (bản nháp — thùng chưa được Kế toán duyệt)" : ""}.`, "ok");
  };
  const toggleK = (xid: string) => setSelK((s) => { const n = new Set(s); if (n.has(xid)) n.delete(xid); else n.add(xid); return n; });

  const traLaiMoi = !!t && t.trang_thai === "nhap" && !!t.ly_do_tra_lai;
  const moc: MocLuong[] = t
    ? [
        { label: "Tạo thùng", at: t.created_at, nguoi: <UserName email={t.nguoi_tao} />, nguoiText: displayName(t.nguoi_tao), done: true },
        { label: `Gom xác (${d?.xac.length ?? 0})`, done: (d?.xac.length ?? 0) > 0, phu: (d?.xac.length ?? 0) ? undefined : "chưa có xác" },
        { label: "Nhập mã EO", done: !!t.ma_eo, phu: t.ma_eo ? undefined : "chưa có EO" },
        traLaiMoi
          ? { label: "KT trả lại", at: t.tra_lai_luc, nguoiText: displayName(t.tra_lai_boi), done: false, red: true, phu: "sửa rồi gửi lại" }
          : { label: "Gửi Kế toán", at: t.gui_kt_luc, nguoiText: t.gui_kt_boi ? displayName(t.gui_kt_boi) : null, done: t.trang_thai !== "nhap" },
        { label: "KT duyệt — đã trả đối tác", at: t.kt_luc, nguoiText: t.kt_boi ? displayName(t.kt_boi) : null, done: t.trang_thai === "da_duyet" },
      ]
    : [];
  const choAi = !t ? "" : t.trang_thai === "da_duyet" ? "Đã kết thúc" : t.trang_thai === "cho_ke_toan" ? "Đang chờ: Kế toán duyệt" : traLaiMoi ? "Đang chờ: người gom sửa theo lý do Kế toán trả lại" : !d?.xac.length ? "Đang chờ: thêm xác vào thùng" : !t.ma_eo ? "Đang chờ: nhập Mã EO" : "Đang chờ: gửi Kế toán";

  const run = async (fn: () => Promise<unknown>, msg: string, close?: boolean) => {
    setBusy(true);
    try {
      await fn();
      toast(msg, "ok");
      onChanged();
      if (close) onClose();
      else await load();
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const luu = () => api.patch(`/tra-xac/thung/${id}`, f);
  const ghiKien = (xoa?: boolean) =>
    run(async () => {
      await api.patch(`/tra-xac/thung/${id}/kien`, { ids: [...selK], kien: xoa ? "" : kien });
      setSelK(new Set());
    }, xoa ? `Đã xoá kiện của ${selK.size} xác.` : `Đã ghi kiện "${kien.trim()}" cho ${selK.size} xác.`);
  const luuNeuDoi = async () => { if (doiTT) await luu(); };

  const footer = t && (
    <>
      {isA && t.trang_thai === "nhap" && d && d.xac.length === 0 && <Btn variant="danger" disabled={busy} onClick={() => confirm(`Xoá thùng rỗng ${t.id}?`) && run(() => api.delete(`/tra-xac/thung/${id}`), `Đã xoá ${t.id}.`, true)}>🗑 Xoá thùng rỗng</Btn>}
      {isA && t.trang_thai === "cho_ke_toan" && <Btn variant="ghost" disabled={busy} onClick={() => run(() => api.post(`/tra-xac/thung/${id}/huy-gui`), "Đã huỷ gửi Kế toán.")}>↩ Huỷ gửi KT</Btn>}
      {isA && t.trang_thai === "nhap" && (!d?.xac.length || !f.ma_eo.trim()) && (
        <span className="mr-auto text-[12px] text-[var(--amber-800)]">{!d?.xac.length ? "Thêm xác vào thùng để gửi Kế toán" : "Nhập Mã EO để gửi Kế toán"}</span>
      )}
      {isA && t.trang_thai === "nhap" && (
        <Btn variant="primary" disabled={busy || !d?.xac.length || !f.ma_eo.trim()} title={!f.ma_eo.trim() ? "Cần nhập mã EO" : ""} onClick={() => run(async () => { await luuNeuDoi(); await api.post(`/tra-xac/thung/${id}/gui-kt`); }, `Đã gửi ${t.id} cho Kế toán duyệt.`)}>
          📤 Gửi Kế toán duyệt
        </Btn>
      )}
      {isK && t.trang_thai === "cho_ke_toan" && (
        <>
          <Btn variant="danger" disabled={busy} onClick={() => setTraLai(true)}>↩ Trả lại người gom thùng</Btn>
          <Btn variant="success" disabled={busy || !f.ma_eo.trim()} onClick={() => confirm(`Duyệt thùng ${t.id} (${d?.xac.length} xác)? Luồng trả xác sẽ kết thúc.`) && run(async () => { await luuNeuDoi(); await api.post(`/tra-xac/thung/${id}/kt-duyet`); }, `Đã duyệt ${t.id}.`)}>
            ✔ Duyệt — kết thúc trả xác
          </Btn>
        </>
      )}
    </>
  );

  return (
    <Modal title={`Thùng trả xác ${id}`} onClose={onClose} maxWidthClass={DETAIL_MAX_W} footerActions={footer}>
      {loi ? <p className="text-sm text-[var(--red-700)]">Không mở được thùng: {loi}</p> : !d || !t ? <Spinner /> : (
        <div className="space-y-3">
          <div className="rounded-2xl bg-[var(--surface)] px-3 py-2.5 shadow-card sm:rounded-xl sm:border sm:border-[var(--line)] sm:py-2 sm:shadow-none">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
              <b className={`text-[14px] sm:text-[12.5px] ${t.trang_thai === "da_duyet" ? "text-[var(--brand-700)]" : traLaiMoi ? "text-[var(--red-700)]" : "text-[var(--amber-800)] sm:text-[var(--ink)]"}`}>{choAi}</b>
              <span className="text-[var(--ink-soft)]">
                <span className="hidden sm:inline">· </span>{d.xac.length} xác · {t.doi_tac || "chưa có đối tác"}{t.ma_eo ? ` · EO ${t.ma_eo}` : ""}
              </span>
              {d.xac.length > 0 && thieuKien > 0 && <span className="text-[var(--amber-700)]">· {thieuKien} xác chưa ghi kiện</span>}
              <span className="hidden sm:ml-auto sm:flex sm:gap-1.5">
                <Btn size="sm" variant="secondary" disabled={!d.xac.length} onClick={taiBienBan} title={t.trang_thai === "da_duyet" ? "Tải biên bản bàn giao (Excel) để in, ký, giao vận" : "Tải bản nháp biên bản — bản chính thức sau khi Kế toán duyệt"}>⬇ Tải BBBG</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setMo((v) => !v)}>{mo ? "▴ Thu gọn" : "▾ Xem chi tiết"}</Btn>
              </span>
            </div>
            <LuongNgang moc={moc} ketThuc={t.trang_thai === "da_duyet"} />
            {/* Dien thoai: 2 nut chia doi, cao 40px, nam duoi luong (khong chen dong trang thai). */}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
              <button type="button" disabled={!d.xac.length} onClick={taiBienBan} className="h-10 rounded-full bg-[var(--surface-2)] text-[14px] font-medium text-[var(--ink)] active:scale-[.97] disabled:opacity-40">⬇ Tải BBBG</button>
              <button type="button" onClick={() => setMo((v) => !v)} className="h-10 rounded-full bg-[var(--accent-soft)] text-[14px] font-semibold text-[var(--accent-ink)] active:scale-[.97]">{mo ? "▴ Thu gọn" : "▾ Xem chi tiết"}</button>
            </div>
          </div>
          <SummaryBox>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-[var(--accent-ink)]">{t.id}</span>
              <Badge tone={TT_TONE[t.trang_thai]}>{TT_LABEL[t.trang_thai]}</Badge>
              <MienBadge mien={t.mien} />
              <span className="text-sm"><b>{d.xac.length}</b> xác · {tt.length} loại linh kiện</span>
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">
              Tạo bởi {displayName(t.nguoi_tao)} lúc {fmtDate(t.created_at)}
              {t.gui_kt_luc && ` · Gửi KT ${fmtDate(t.gui_kt_luc)}`}
              {t.kt_luc && ` · KT duyệt: ${displayName(t.kt_boi)} ${fmtDate(t.kt_luc)}`}
            </div>
          </SummaryBox>
          {t.trang_thai === "nhap" && t.ly_do_tra_lai && <Banner tone="red">↩ Kế toán trả lại ({displayName(t.tra_lai_boi)}, {fmtDate(t.tra_lai_luc)}): {t.ly_do_tra_lai}</Banner>}
          {t.trang_thai === "cho_ke_toan" && isA && <Banner tone="amber">Đang chờ Kế toán duyệt — vẫn thêm / bớt xác và sửa thông tin được, mọi thay đổi ghi nhật ký.</Banner>}

          {suaTT && (
          <Section title="🧾 Thông tin trả xác" right={suaTT && doiTT ? <Btn size="sm" variant="primary" disabled={busy} onClick={() => run(luu, "Đã lưu thông tin thùng.")}>Lưu</Btn> : undefined}>
            {suaTT ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Đối tác">{isA ? <DoiTacSelect value={f.doi_tac_id} onChange={(v) => setF({ ...f, doi_tac_id: v })} /> : <Input value={t.doi_tac || ""} disabled />}</Field>
                <Field label="Mã EO" required><Input value={f.ma_eo} onChange={(e) => setF({ ...f, ma_eo: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Ghi chú"><Textarea rows={2} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} /></Field></div>
              </div>
            ) : (
              <KvGrid>
                <Kv k="Đối tác" v={t.doi_tac || "—"} />
                <Kv k="Mã EO" v={t.ma_eo ? <span className="font-mono">{t.ma_eo}</span> : "—"} />
                <Kv k="Ghi chú" v={t.ghi_chu || "—"} wide />
              </KvGrid>
            )}
          </Section>

          )}
          {mo && (
            <DetailGrid
              side={
                <Section title={`🕘 Nhật ký (${d.logs.length})`}>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {d.logs.map((l) => (
                  <div key={l.id} className="text-xs border-l-2 border-[var(--brand-200)] pl-2">
                    <div className="text-[var(--ink-faint)]">{fmtDate(l.thoi_gian)} · {displayName(l.nguoi_thuc_hien)}</div>
                    <div className="text-[var(--ink-body)]">{l.ghi_chu}</div>
                  </div>
                ))}
              </div>
            </Section>
              }
            >
              {!suaTT && (
          <Section title="🧾 Thông tin trả xác" right={suaTT && doiTT ? <Btn size="sm" variant="primary" disabled={busy} onClick={() => run(luu, "Đã lưu thông tin thùng.")}>Lưu</Btn> : undefined}>
            {suaTT ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Đối tác">{isA ? <DoiTacSelect value={f.doi_tac_id} onChange={(v) => setF({ ...f, doi_tac_id: v })} /> : <Input value={t.doi_tac || ""} disabled />}</Field>
                <Field label="Mã EO" required><Input value={f.ma_eo} onChange={(e) => setF({ ...f, ma_eo: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Ghi chú"><Textarea rows={2} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} /></Field></div>
              </div>
            ) : (
              <KvGrid>
                <Kv k="Đối tác" v={t.doi_tac || "—"} />
                <Kv k="Mã EO" v={t.ma_eo ? <span className="font-mono">{t.ma_eo}</span> : "—"} />
                <Kv k="Ghi chú" v={t.ghi_chu || "—"} wide />
              </KvGrid>
            )}
          </Section>

              )}
          <Section title={`🔩 Tổng hợp theo linh kiện xác`} right={<CopyBtn text={tomTatText} title="Sao chép tổng hợp" />}>
            {tt.length ? (
              <div className="text-sm space-y-0.5">
                {tt.map((x) => (
                  <div key={x.ma || "_"} className="flex justify-between gap-2"><span className="truncate" title={x.ten}>{x.ten}</span><b>× {x.n}</b></div>
                ))}
              </div>
            ) : <p className="text-sm text-[var(--ink-soft)]">Chưa có xác nào trong thùng.</p>}
          </Section>

          <Section title={`♻️ Xác trong thùng (${d.xac.length})`} right={suaXac ? <Btn size="sm" variant="secondary" onClick={() => setThem(true)}>＋ Thêm xác</Btn> : undefined}>
            {suaXac && d.xac.length > 0 && isMobile && (
              <div className="mb-2.5 space-y-2 rounded-2xl bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold">📦 Ghi kiện</span>
                  <span className="text-[12px] tabular-nums text-[var(--ink-soft)]">Đã chọn {selK.size}/{d.xac.length}</span>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setSelK(selK.size === d.xac.length ? new Set() : new Set(d.xac.map((x) => x.id)))} className="h-9 flex-1 rounded-full bg-[var(--surface)] text-[13px] font-medium shadow-card active:scale-[.97]">
                    {selK.size === d.xac.length ? "Bỏ chọn" : "Chọn tất cả"}
                  </button>
                  <button type="button" disabled={!thieuKien} onClick={() => setSelK(new Set(d.xac.filter((x) => !x.kien).map((x) => x.id)))} className="h-9 flex-1 rounded-full bg-[var(--surface)] text-[13px] font-medium shadow-card active:scale-[.97] disabled:opacity-40">
                    Chưa có kiện ({thieuKien})
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <Input className="min-w-0 flex-1" value={kien} onChange={(e) => setKien(e.target.value)} placeholder="Số kiện: 1, 2, Để ngoài…" />
                  <Btn variant="primary" disabled={busy || !selK.size || !kien.trim()} onClick={() => ghiKien()}>Ghi</Btn>
                </div>
                {selK.size > 0 && (
                  <button type="button" disabled={busy} onClick={() => ghiKien(true)} className="text-[12.5px] text-[var(--red-700)] disabled:opacity-40">Xoá kiện của {selK.size} xác đã chọn</button>
                )}
              </div>
            )}
            {suaXac && d.xac.length > 0 && !isMobile && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] px-2.5 py-1.5 text-sm">
                <span className="font-semibold">📦 Ghi kiện</span>
                <Btn size="sm" variant="ghost" onClick={() => setSelK(selK.size === d.xac.length ? new Set() : new Set(d.xac.map((x) => x.id)))}>{selK.size === d.xac.length ? "Bỏ chọn" : "Chọn tất cả"}</Btn>
                <Btn size="sm" variant="ghost" disabled={!thieuKien} onClick={() => setSelK(new Set(d.xac.filter((x) => !x.kien).map((x) => x.id)))}>Chọn xác chưa có kiện ({thieuKien})</Btn>
                <span className="text-xs text-[var(--ink-soft)]">Đã chọn {selK.size}</span>
                <span className="w-32"><Input value={kien} onChange={(e) => setKien(e.target.value)} placeholder="VD 1, 2, Để ngoài" /></span>
                <Btn size="sm" variant="primary" disabled={busy || !selK.size || !kien.trim()} onClick={() => ghiKien()}>Ghi kiện</Btn>
                <Btn size="sm" variant="ghost" disabled={busy || !selK.size} onClick={() => ghiKien(true)}>Xoá kiện</Btn>
              </div>
            )}
            {isMobile ? (
              <XacListMobile
                rows={d.xac}
                selected={suaXac ? selK : undefined}
                onToggle={suaXac ? toggleK : undefined}
                onOpen={(r) => setOpenUnit(r.unit_id)}
                busy={busy}
                onBo={suaXac ? (r) => { if (confirm(`Bỏ ${r.id} khỏi thùng (về danh sách chờ gom)?`)) run(() => api.delete(`/tra-xac/thung/${id}/xac/${r.id}`), `Đã bỏ ${r.id} khỏi thùng (về danh sách chờ gom).`); } : undefined}
              />
            ) : (
            <XacTable
              rows={d.xac}
              selected={suaXac ? selK : undefined}
              onToggle={suaXac ? toggleK : undefined}
              extras={[{ key: "kien", header: "Kiện", render: (r) => (r.kien ? <b>{r.kien}</b> : <span className="text-[var(--ink-faint)]">—</span>) }]}
              onOpen={(r) => setOpenUnit(r.unit_id)}
              extra={suaXac ? { key: "bo", header: "", render: (r) => <Btn size="sm" variant="ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); run(() => api.delete(`/tra-xac/thung/${id}/xac/${r.id}`), `Đã bỏ ${r.id} khỏi thùng (về danh sách chờ gom).`); }}>✕ Bỏ</Btn> } : undefined}
            />
            )}
          </Section>
            </DetailGrid>
          )}
        </div>
      )}
      {them && t && <ThemXacModal thung={t} onClose={() => setThem(false)} onDone={() => { setThem(false); onChanged(); load(); }} />}
      {traLai && <TraLaiModal onClose={() => setTraLai(false)} onOk={(lyDo) => { setTraLai(false); run(() => api.post(`/tra-xac/thung/${id}/kt-tra-lai`, { ly_do: lyDo }), "Đã trả lại Admin BH."); }} />}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} nested onClose={() => setOpenUnit(null)} onChanged={load} />}
    </Modal>
  );
}

function TraLaiModal({ onClose, onOk }: { onClose: () => void; onOk: (lyDo: string) => void }) {
  const [lyDo, setLyDo] = useState("");
  return (
    <Modal title="Trả lại thùng cho Admin BH" onClose={onClose} maxWidthClass="max-w-md" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="danger" disabled={!lyDo.trim()} onClick={() => onOk(lyDo.trim())}>Trả lại</Btn></>}>
      <Field label="Lý do" required><Textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: sai mã EO, thiếu xác…" /></Field>
    </Modal>
  );
}

function ThemXacModal({ thung, onClose, onDone }: { thung: ThungXac; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const base = `/tra-xac/xac?nhom=cho_gom${thung.mien ? `&mien_thung=${thung.mien}` : ""}`;
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>(`/tra-xac/thung/${thung.id}/xac`, { unit_ids: [...sel] });
      toast(`Đã thêm ${r.ok} xác${r.loi.length ? ` — ${r.loi.length} không thêm được` : ""}.`, r.loi.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Thêm xác vào ${thung.id}`} onClose={onClose} maxWidthClass="max-w-5xl" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" disabled={busy || !sel.size} onClick={submit}>Thêm {sel.size} xác</Btn></>}>
      {thung.mien && <p className="text-xs text-[var(--ink-soft)] mb-1">Chỉ hiện xác cùng miền với thùng ({thung.mien}) hoặc chưa khai báo miền.</p>}
      <XacBrowser
        base={base}
        viewKey="xac_view_them"
        placeholder="Tìm mã đơn, case, linh kiện, KTV…"
        sel={sel}
        setSel={setSel}
        onOpen={(r) => setSel((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}
      />
    </Modal>
  );
}

// ---- Man chinh ----
export function TraXacScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const ch = () => refresh();
  const tabs: TabDef[] = [
    { key: "cho_gom", label: "♻️ Xác chờ gom", show: (u) => admin(u) || u.la_view || u.la_giam_sat, countKeys: ["admin_xac_cho_gom"], hint: "Xác Đổi mới 'Trả đối tác' chưa vào thùng", render: () => <XacChoGom user={user} onChanged={ch} /> },
    { key: "nhap", label: "📦 Thùng nháp", show: admin, countKeys: ["admin_thung_xac_tra_lai"], hint: "Thùng đang gom — thêm / bớt xác, nhập mã EO, gửi Kế toán", render: () => <ThungList key="nhap" user={user} tt="nhap" title="Thùng trả xác nháp" empty="Chưa có thùng nháp nào." onChanged={ch} /> },
    { key: "cho_kt", label: "⏳ Chờ KT duyệt", show: (u) => admin(u) || kt(u), countKeys: ["ketoan_thung_xac"], hint: "Kế toán kiểm tra thông tin, duyệt hoặc trả lại", render: () => <ThungList key="cho_kt" user={user} tt="cho_ke_toan" title="Thùng chờ Kế toán duyệt" empty="Không có thùng nào chờ duyệt." onChanged={ch} /> },
    { key: "da_duyet", label: "✔ Đã duyệt", show: xem, render: () => <ThungList key="da_duyet" user={user} tt="da_duyet" title="Thùng đã duyệt (kết thúc)" empty="Chưa có thùng nào được duyệt." onChanged={ch} /> },
    { key: "ngoai", label: "Đã xử lý khác", show: (u) => admin(u) || u.la_view, render: () => <XacNgoai user={user} onChanged={ch} /> },
  ];
  return <TabScreen user={user} tabs={tabs} title="Trả xác linh kiện" />;
}
