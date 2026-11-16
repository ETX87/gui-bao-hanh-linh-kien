import { useState } from "react";
import { useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, LK_C_DEF } from "../../ui/FilterBar";
import { ExcelToolbar } from "../../ui/ColumnFilter";
import { api } from "../../lib/api";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { fmtDate, hoursSince } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { displayName } from "../../hooks/useUserNames";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useRoute } from "../../router/Router";
import { Card, Badge, Spinner, Btn } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { GIAI_DOAN_MAP, HUONG_XU_LY_LABELS, KHACH_LE_KEY, NHOM_GD, NHOM_CUA_GD } from "../../lib/constants";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { MienBadge } from "../../ui/MienBadge";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { buocOf, useBuoc, fmtGio, CHU_BUOC_LABEL } from "../../lib/buoc";
import { GroupedDonView, DonViewToggle, useDonViewMode, type GroupRow } from "../../ui/GroupedDonView";
import type { AppUser } from "../../lib/types";

// 20/10/2026: moi dong la 1 don vi HOAC 1 don cha chua tach (thung chua ve / chua xac nhan SL), kem
// "giai_doan" = buoc thuc te trong toan luong (xem backend/src/routes/traCuu.ts).
interface TraCuuRow {
  id: string;
  parent_id: string;
  loai: "unit" | "parent";
  giai_doan: string;
  trang_thai: string;
  updated_at: string;
  buoc_tu?: string | null;
  case_id: string | null;
  ma_lk: string | null;
  lk_a: string | null;
  lk_b: string | null;
  mo_ta_loi: string | null;
  ten_khach_hang: string | null;
  phieu_gui_id: string | null;
  phieu_tra_id: string | null;
  mien: "MB" | "MN" | null;
  ktv: string | null;
  so_luong: number;
  sl_dat?: number | null;
  sl_duyet?: number | null;
  created_at?: string | null;
  nguoi_sua_chua?: string | null;
  huong_xu_ly?: string | null;
  serial?: string | null;
  ngay_mua?: string | null;
  ngay_sx?: string | null;
}
import { UserName } from "../../hooks/useUserNames";

// 14/11/2026: cot "Giai đoạn" loc theo 9 NHOM theo luong (NHOM_GD) thay vi 21 giai doan chi tiet.
const NHOM_DEF: FilterDef = {
  key: "nhom",
  label: "Giai đoạn",
  static: NHOM_GD.map((n) => ({ value: n.key, label: `${n.icon} ${n.label}` })),
};

// 01/11/2026: danh gia lech linh kien A (KTV chon) / B (thuc te gui ve) / C (doi moi).
const LECH_LK_DEF: FilterDef = {
  key: "lech_lk",
  label: "Đánh giá LK",
  static: [
    { value: "bat_ky", label: "Có lệch (A≠B hoặc B≠C)" },
    { value: "ab", label: "A≠B — KTV chọn sai linh kiện" },
    { value: "bc", label: "B≠C — đổi sang linh kiện khác" },
    { value: "ab_bc", label: "Lệch cả A≠B và B≠C" },
    { value: "khop", label: "Khớp hết (A = B = C)" },
  ],
};
const TIP_AB = "A≠B: linh kiện KTV chọn khi gửi (A) khác linh kiện Admin xác nhận thực tế gửi về (B) — KTV khai sai mã. Xác (trả đối tác / tiêu huỷ) tính theo B.";
const TIP_BC = "B≠C: linh kiện đổi mới / thay thế (C) khác linh kiện gửi về (B) — đổi sang mã khác (tương đương, nâng cấp, hoặc hết hàng mã cũ). Phiếu trả KTV xuất theo C.";

function LechLkBadges({ r }: { r: TraCuuRow }) {
  if (r.loai !== "unit") return <span className="text-[var(--ink-faint)]">—</span>;
  const ab = !!r.lk_a && !!r.lk_b && r.lk_a !== r.lk_b;
  const bc = !!r.lk_b && !!r.ma_lk && r.lk_b !== r.ma_lk;
  if (!ab && !bc) return <span className="text-xs text-[var(--green-700)]" title="A = B = C: linh kiện KTV chọn, thực tế gửi về và đổi mới trùng nhau.">✓ Khớp</span>;
  return (
    <span className="inline-flex gap-1">
      {ab && <span title={TIP_AB}><Badge tone="orange">A≠B</Badge></span>}
      {bc && <span title={TIP_BC}><Badge tone="violet">B≠C</Badge></span>}
    </span>
  );
}

const KTV_DEF: FilterDef = { key: "ktv", label: "KTV gửi", fmt: (v) => (v === KHACH_LE_KEY ? "Khách lẻ" : displayName(v)), noneLabel: "Khách lẻ" };
const NV_DEF: FilterDef = { key: "nv", label: "NV sửa chữa", kind: "person", noneLabel: "Chưa gán" };
const HUONG_DEF: FilterDef = { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS, noneLabel: "Chưa phân loại" };
const MIEN_DEF: FilterDef = { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" };
// Tham so loc gui len server (khop cac cot loc ben duoi).
const FILTER_KEYS = ["f_id", "nhom", "giai_doan", "buoc_tt", "f_gui", "mien", "ktv", "f_case", "lk", "lech_lk", "nv", "huong_xu_ly", "f_mota", "sl_tu", "sl_den", "khoang", "canh_bao"];

// 15/11/2026 (doi tac: "bộ lọc theo TỪNG BƯỚC ĐANG DỪNG"): loc theo buoc chi tiet + tinh trang SLA cua buoc.
const BUOC_TT_DEF: FilterDef = {
  key: "buoc_tt",
  label: "SLA bước",
  static: [
    { value: "qua_han", label: "🔴 Quá SLA bước" },
    { value: "chua_gt", label: "📝 Quá SLA — chưa giải trình" },
    { value: "da_gt", label: "✔ Đã giải trình" },
    { value: "trong_han", label: "🟢 Trong SLA bước" },
  ],
};

function BuocCell({ r }: { r: TraCuuRow }) {
  const b = buocOf(r.giai_doan);
  if (!b || b.ket_thuc) return <span className="text-[var(--ink-faint)] text-xs">—</span>;
  const tu = r.buoc_tu || r.updated_at;
  const h = hoursSince(tu);
  const qua = h - b.sla;
  return (
    <span className="inline-flex flex-col leading-tight" title={`${b.so}. ${b.ten} — chủ bước: ${CHU_BUOC_LABEL[b.chu]} — SLA ${b.sla}h`}>
      <span className="text-xs font-semibold text-[var(--ink)] truncate max-w-[200px]">{b.so}. {b.ten}</span>
      <span className={`text-[11px] ${qua > 0 ? "font-bold text-[var(--red-700)]" : "text-[var(--ink-soft)]"}`}>
        {CHU_BUOC_LABEL[b.chu]} · {fmtGio(h)} / {b.sla}h{qua > 0 ? ` · quá ${fmtGio(qua)}` : ""}
      </span>
    </span>
  );
}

function NhomGdBadge({ gd }: { gd: string }) {
  const n = NHOM_CUA_GD[gd];
  const g = GIAI_DOAN_MAP[gd];
  return (
    <span className="inline-flex flex-col leading-tight" title={g?.label || gd}>
      <Badge tone={n?.tone || "gray"}>{n ? `${n.icon} ${n.label}` : gd}</Badge>
      {g && <span className="mt-0.5 text-[11px] text-[var(--ink-soft)] truncate max-w-[190px]">{g.label}</span>}
    </span>
  );
}

// "Tra cuu moi don hang trong pham vi" (Giam sat/View) - THUAN CHI XEM. Phan trang that.
// Phat hien 12 vong ra soat UX: nhan ?trang_thai= tu man Tong quan (bam 1 o dem) -> loc san + hien
// chip "dang loc" bo duoc.

// 16/11/2026: 3 tab ket thuc dung chung man nay - loc co dinh o server (?ket_thuc=), 20 dong / trang, khong dem tren menu.
export type KetThucTab = "hom_nay" | "xong" | "huy";
const KT_TITLE: Record<KetThucTab, string> = {
  hom_nay: "✅ Đơn xong trong ngày — hoàn tất, huỷ, từ chối hôm nay",
  xong: "🏁 Đơn đã xong — KTV đã nhận, kết thúc không gửi, chuyển kho, thất lạc",
  huy: "🚫 Đơn huỷ / từ chối — thùng bị huỷ, Admin từ chối / huỷ bảo hành",
};

export function QuanLyTraCuuScreen({ user, ketThuc }: { user: AppUser; ketThuc?: KetThucTab }) {
  const { query: rq, nav } = useRoute();
  const toast = useToast();
  const stFilter = ketThuc ? "" : rq.get("trang_thai") || "";
  const bttUrl = ketThuc ? "" : rq.get("buoc_tt") || "";
  const flt = useListFilters(ketThuc ? `/tra-cuu/don-vi?ket_thuc=${ketThuc}` : "/tra-cuu/don-vi", FILTER_KEYS);
  const { buoc } = useBuoc();
  const BUOC_DEF: FilterDef = {
    key: "giai_doan",
    label: "Bước đang dừng",
    static: buoc.filter((b) => !b.ket_thuc).map((b) => ({ value: b.gd, label: `${b.so}. ${b.ten} (${CHU_BUOC_LABEL[b.chu]})` })),
  };
  const baseQ = [ketThuc ? `ket_thuc=${ketThuc}` : "", stFilter ? `trang_thai=${encodeURIComponent(stFilter)}` : "", bttUrl && !/(^|&)buoc_tt=/.test(flt.query) ? `buoc_tt=${encodeURIComponent(bttUrl)}` : ""].filter(Boolean).join("&");
  const base = baseQ ? `/tra-cuu/don-vi?${baseQ}` : "/tra-cuu/don-vi";
  // 02/11/2026: 3 che do xem (danh sach / nhom theo KTV / nhom theo linh kien) - che do nhom lay toi da 1000 dong 1 lan.
  const [mode, setMode] = useDonViewMode(ketThuc ? `don_view_kt_${ketThuc}` : "don_view_tat_ca");
  const grouped = mode !== "list";
  const listPath = withQuery(base, flt.query);
  const path = grouped ? `${listPath}${listPath.includes("?") ? "&" : "?"}view=nhom` : listPath;
  const { items: rows, total, page, pageCount, setPage, loading, reload, raw } = usePagedApi<TraCuuRow>(path, "don_vi", grouped ? 1000 : 20);
  const totalAll = typeof raw.total_all === "number" ? (raw.total_all as number) : null;
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [guiId, setGuiId] = useState<string | null>(null);
  const [dl, setDl] = useState<string | null>(null);

  const stLabel =
    stFilter === "qua_han"
      ? "Quá SLA bước"
      : NHOM_GD.find((n) => n.gds.join(",") === stFilter)?.label || GIAI_DOAN_MAP[stFilter]?.label || stFilter;

  // 14/11/2026 (bang kieu Excel): loc + sap xep tren tieu de cot, gui len server.
  const cols: Column<TraCuuRow>[] = [
    {
      key: "id",
      header: "ID",
      filter: { type: "text", key: "f_id", placeholder: "Mã đơn…" },
      sortKey: "id",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[var(--link)]">
          {r.id}
          {r.loai === "parent" && r.so_luong > 1 ? <span className="text-[var(--ink-soft)]"> ×{r.so_luong}</span> : null}
        </span>
      ),
    },
    { key: "st", header: "Giai đoạn", filter: { type: "multi", def: NHOM_DEF }, sortKey: "gd", render: (r) => <NhomGdBadge gd={r.giai_doan} /> },
    // Tab don da ket thuc: khong co buoc dang dung / SLA -> an 2 cot nay.
    ...(ketThuc
      ? []
      : ([
          { key: "buoc", header: "Bước đang dừng", filter: { type: "multi", def: BUOC_DEF }, render: (r) => <BuocCell r={r} /> },
          { key: "sla", header: "SLA bước", filter: { type: "single", def: BUOC_TT_DEF }, sortKey: "sla", render: (r) => <SlaBadge since={r.buoc_tu || r.updated_at} gd={r.giai_doan} /> },
        ] as Column<TraCuuRow>[])),
    {
      key: "gui",
      header: "Thùng / Phiếu trả",
      filter: { type: "text", key: "f_gui", placeholder: "BH-… / TR-…" },
      sortKey: "gui",
      render: (r) => <span className="font-mono text-xs">{[r.phieu_gui_id, r.phieu_tra_id].filter(Boolean).join(" · ") || "—"}</span>,
    },
    { key: "mien", header: "Miền", filter: { type: "multi", def: MIEN_DEF }, sortKey: "mien", render: (r) => <MienBadge mien={r.mien} short /> },
    {
      key: "ktv",
      header: "KTV / Nguồn",
      filter: { type: "multi", def: KTV_DEF },
      sortKey: "ktv",
      render: (r) => (r.ktv && r.ktv !== KHACH_LE_KEY ? <UserName email={r.ktv} /> : <Badge tone="violet">Khách lẻ{r.ten_khach_hang ? ` · ${r.ten_khach_hang}` : ""}</Badge>),
    },
    { key: "case", header: "Case", filter: { type: "text", key: "f_case", placeholder: "Mã case…" }, sortKey: "case", render: (r) => <span className="font-mono text-xs">{r.case_id || "—"}</span> },
    { key: "lk", header: "Linh kiện", filter: { type: "multi", def: LK_C_DEF }, sortKey: "lk", className: "max-w-[240px] truncate", render: (r) => nameOf(r.ma_lk) },
    { key: "sl", header: "SL", filter: { type: "number", key: "sl" }, sortKey: "sl", render: (r) => r.sl_dat ?? "—" },
    { key: "lech", header: "Đánh giá LK", filter: { type: "single", def: LECH_LK_DEF }, render: (r) => <LechLkBadges r={r} /> },
    {
      key: "huong",
      header: "Hướng xử lý",
      filter: { type: "multi", def: HUONG_DEF },
      sortKey: "huong",
      render: (r) => (r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "—"),
    },
    { key: "nv", header: "NV sửa", filter: { type: "multi", def: NV_DEF }, sortKey: "nv", render: (r) => (r.nguoi_sua_chua ? <UserName email={r.nguoi_sua_chua} /> : "—") },
    { key: "mota", header: "Mô tả lỗi", filter: { type: "text", key: "f_mota", placeholder: "Từ trong mô tả…" }, sortKey: "mota", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    ...(ketThuc
      ? [{ key: "xong", header: "Xong lúc", sortKey: "sla", render: (r: TraCuuRow) => <span className="text-xs">{fmtDate(r.buoc_tu || r.updated_at)}</span> } as Column<TraCuuRow>]
      : []),
    { key: "tao", header: "Tạo lúc", filter: { type: "date", key: "khoang" }, sortKey: "tao", render: (r) => <span className="text-xs">{fmtDate(r.created_at)}</span> },
  ];

  // 14/11/2026 ("thêm nút tải"): tai Excel TOAN BO danh sach dang loc / sap xep (moi lan 1000 dong, toi da 20.000).
  const taiExcel = async () => {
    if (dl) return;
    try {
      const all: TraCuuRow[] = [];
      const sep = listPath.includes("?") ? "&" : "?";
      for (let off = 0; off < 20000; off += 1000) {
        setDl(`Đang tải ${all.length}/${total}…`);
        const r = await api.get<{ don_vi: TraCuuRow[]; total: number }>(`${listPath}${sep}limit=1000&offset=${off}`);
        all.push(...r.don_vi);
        if (r.don_vi.length < 1000 || all.length >= r.total) break;
      }
      const head = [
        "ID", "Loại", "Giai đoạn", "Bước chi tiết", "Thùng", "Phiếu trả", "Miền", "KTV / Nguồn", "Khách lẻ", "Case", "Serial",
        "LK KTV chọn (A)", "LK gửi về (B)", "LK đổi mới (C)", "SL đặt", "SL duyệt", "Hướng xử lý", "NV sửa", "Mô tả lỗi", "Tạo lúc", "Cập nhật", "Bước đang dừng", "Chủ bước", "Giờ dừng ở bước", "SLA bước (giờ)",
      ];
      const body = all.map((r) => [
        r.id,
        r.loai === "unit" ? "Đơn vị" : "Đơn cha (chưa tách)",
        NHOM_CUA_GD[r.giai_doan]?.label || "",
        GIAI_DOAN_MAP[r.giai_doan]?.label || r.giai_doan,
        r.phieu_gui_id || "",
        r.phieu_tra_id || "",
        r.mien === "MB" ? "Miền Bắc" : r.mien === "MN" ? "Miền Nam" : "Chưa khai báo",
        r.ktv && r.ktv !== KHACH_LE_KEY ? displayName(r.ktv) : "Khách lẻ",
        r.ten_khach_hang || "",
        r.case_id || "",
        r.serial || "",
        r.lk_a ? nameOf(r.lk_a) : "",
        r.lk_b ? nameOf(r.lk_b) : "",
        r.ma_lk ? nameOf(r.ma_lk) : "",
        r.sl_dat != null ? String(r.sl_dat) : "",
        r.sl_duyet != null ? String(r.sl_duyet) : "",
        r.huong_xu_ly ? HUONG_XU_LY_LABELS[r.huong_xu_ly] || r.huong_xu_ly : "",
        r.nguoi_sua_chua ? displayName(r.nguoi_sua_chua) : "",
        r.mo_ta_loi || "",
        fmtDate(r.created_at),
        fmtDate(r.updated_at),
        buocOf(r.giai_doan) && !buocOf(r.giai_doan)!.ket_thuc ? `${buocOf(r.giai_doan)!.so}. ${buocOf(r.giai_doan)!.ten}` : "",
        buocOf(r.giai_doan) && !buocOf(r.giai_doan)!.ket_thuc ? CHU_BUOC_LABEL[buocOf(r.giai_doan)!.chu] : "",
        buocOf(r.giai_doan)?.ket_thuc ? "" : String(Math.round(hoursSince(r.buoc_tu || r.updated_at))),
        buocOf(r.giai_doan)?.ket_thuc ? "" : String(buocOf(r.giai_doan)?.sla ?? ""),
      ]);
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      downloadBlob(
        buildXlsx([{ name: "Don bao hanh", rows: [head, ...body], widths: [16, 12, 16, 28, 12, 12, 12, 30, 20, 16, 16, 30, 30, 30, 8, 8, 16, 24, 40, 16, 16, 32, 14, 10, 10] }]),
        `don-bao-hanh_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.xlsx`,
      );
      toast(`Đã tải ${all.length} dòng.`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không tải được danh sách.", "error");
    } finally {
      setDl(null);
    }
  };

  const openRow = (r: TraCuuRow) => (r.loai === "unit" ? setDetailId(r.id) : r.phieu_gui_id ? setGuiId(r.phieu_gui_id) : undefined);
  const gRows: GroupRow[] = grouped
    ? rows.map((r) => ({
        id: r.id,
        parentId: r.parent_id,
        ktv: r.ktv,
        lk: r.lk_b || r.ma_lk,
        caseId: r.case_id,
        slDat: r.sl_dat,
        slDuyet: r.sl_duyet,
        laDonVi: r.loai === "unit",
        serial: r.serial,
        ngayMua: r.ngay_mua,
        ngaySx: r.ngay_sx,
        moTa: r.mo_ta_loi,
        status: <NhomGdBadge gd={r.giai_doan} />,
        sla: ketThuc ? <span className="text-xs text-[var(--ink-soft)]">{fmtDate(r.buoc_tu || r.updated_at)}</span> : <SlaBadge since={r.buoc_tu || r.updated_at} gd={r.giai_doan} />,
        badge: r.loai === "parent" && r.so_luong > 1 ? <span className="text-xs text-[var(--ink-soft)]">×{r.so_luong}</span> : undefined,
        onClick: () => openRow(r),
      }))
    : [];

  if (loading && rows.length === 0 && !flt.active && !stFilter && !flt.sort) return <Spinner />;

  return (
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">{ketThuc ? KT_TITLE[ketThuc] : "🔍 Tra cứu mọi đơn — mọi giai đoạn"}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Btn size="sm" onClick={taiExcel} disabled={!!dl || total === 0} title="Tải toàn bộ danh sách đang lọc / sắp xếp ra file Excel">
            {dl || "⬇ Tải Excel"}
          </Btn>
          <DonViewToggle value={mode} onChange={setMode} />
        </div>
      </div>
      <ExcelToolbar
        flt={flt}
        cols={cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey }))}
        placeholder="Mã đơn, thùng, phiếu trả, case, KTV, khách, serial, linh kiện…"
        total={total}
        totalAll={totalAll}
        unit="đơn"
        colButtons={grouped}
        extra={
          (stFilter || bttUrl) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-semibold px-2.5 py-1 whitespace-nowrap">
              Lọc: {[stFilter && stLabel, bttUrl && BUOC_TT_DEF.static?.find((x) => x.value === bttUrl)?.label].filter(Boolean).join(" · ")}
              <button onClick={() => nav("/don?tab=tat_ca")} className="focus-ring hover:text-[var(--blue-800)]" aria-label="Bỏ lọc">
                ✕
              </button>
            </span>
          )
        }
      />
      <details className="mb-2 text-xs text-[var(--ink-soft)]">
        <summary className="cursor-pointer select-none font-semibold text-[var(--link)]">ℹ Giai đoạn và đánh giá linh kiện A / B / C là gì?</summary>
        <div className="mt-1.5 space-y-1 rounded-lg bg-[var(--surface-2)] p-2 leading-relaxed">
          <p>
            <b>Giai đoạn</b> theo luồng: {NHOM_GD.map((n) => `${n.icon} ${n.label}`).join(" → ")}. Dòng nhỏ dưới nhãn là bước chi tiết hiện tại.
          </p>
          <p><b>A</b> = linh kiện KTV chọn khi gửi. <b>B</b> = linh kiện Admin xác nhận thực tế gửi về (để trống = giống A). <b>C</b> = linh kiện đổi mới / thay thế (để trống = giống B).</p>
          <p><Badge tone="orange">A≠B</Badge> KTV khai sai mã linh kiện. Xác linh kiện (trả đối tác / tiêu huỷ) tính theo <b>B</b>.</p>
          <p><Badge tone="violet">B≠C</Badge> Trả cho KTV linh kiện khác với linh kiện gửi về. Phiếu trả xuất theo <b>C</b>.</p>
        </div>
      </details>
      {grouped ? (
        <>
          {total > rows.length && <p className="mb-1.5 text-xs font-semibold text-[var(--orange-700)]">Đang nhóm {rows.length}/{total} đơn mới nhất — lọc thêm để xem đủ.</p>}
          <GroupedDonView rows={gRows} mode={mode as "ktv" | "lk"} emptyText="Không tìm thấy đơn nào." />
        </>
      ) : (
        <>
          <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={openRow} emptyText="Không tìm thấy đơn nào." flt={flt} />
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </>
      )}
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={reload} />}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={reload} />}
    </Card>
  );
}
