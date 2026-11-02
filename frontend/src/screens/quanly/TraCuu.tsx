import { useState } from "react";
import { FilterBar, useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { displayName } from "../../hooks/useUserNames";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useRoute } from "../../router/Router";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { GIAI_DOAN, GIAI_DOAN_MAP, HUONG_XU_LY_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { MienBadge } from "../../ui/MienBadge";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { UnitDetailModal } from "../shared/UnitDetailModal";
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
  serial?: string | null;
  ngay_mua?: string | null;
  ngay_sx?: string | null;
}
import { UserName } from "../../hooks/useUserNames";

// 01/11/2026 ("mọi trạng thái thiếu filter trạng thái => đơn đã sửa xong, đơn đang gửi đến KTV..."): nhom
// giai doan thuong tra (gia tri "a,b" -> backend loc IN) + tung giai doan rieng.
const NHOM_GIAI_DOAN: { value: string; label: string }[] = [
  { value: "thung_nhap,thung_dang_gui", label: "▸ Nhóm: Chưa về Kho (nháp / đang gửi)" },
  { value: "thung_cho_admin_nhan,cho_xac_nhan_so_luong,cho_phan_loai,admin_can_xem_lai,cho_bo_sung_tt,cho_chan_doan,cho_admin_xac_nhan", label: "▸ Nhóm: Đang xử lý tại trung tâm" },
  { value: "san_sang_gom_phieu_tra,tra_nhap,tra_cho_ke_toan_duyet,tra_da_duyet_ke_toan", label: "▸ Nhóm: Đã sửa / xử lý xong — chờ trả" },
  { value: "tra_da_gui", label: "▸ Nhóm: Đang gửi đến KTV" },
  { value: "tra_ktv_da_nhan,tra_ket_thuc_khong_gui", label: "▸ Nhóm: Hoàn tất" },
  { value: "tra_khieu_nai_van_chuyen,tra_gui_that_bai", label: "▸ Nhóm: KTV báo thiếu / thất lạc" },
  { value: "ket_thuc_tu_choi,ket_thuc_chuyen_kho", label: "▸ Nhóm: Đã huỷ / chuyển kho" },
];
const GIAI_DOAN_DEF: FilterDef = {
  key: "giai_doan",
  label: "Giai đoạn",
  static: [...NHOM_GIAI_DOAN, ...GIAI_DOAN.map((g) => ({ value: g.key, label: `${g.icon} ${g.label}` }))],
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

const DEFS: FilterDef[] = [
  GIAI_DOAN_DEF,
  LECH_LK_DEF,
  { key: "ktv", label: "KTV gửi", fmt: (v) => (v === KHACH_LE_KEY ? "Khách lẻ" : displayName(v)), noneLabel: "Khách lẻ" },
  { key: "nv", label: "NV sửa chữa", kind: "person", noneLabel: "Chưa gán" },
  { key: "huong_xu_ly", label: "Hướng xử lý", kind: "map", labels: HUONG_XU_LY_LABELS, noneLabel: "Chưa phân loại" },
  ...LK_ABC_DEFS,
  { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" },
  CANH_BAO_DEF,
  KHOANG_DEF,
];

// "Tra cuu moi don hang trong pham vi" (Giam sat/View) - THUAN CHI XEM. Phan trang that.
// Phat hien 12 vong ra soat UX: nhan ?trang_thai= tu man Tong quan (bam 1 o dem) -> loc san + hien
// chip "dang loc" bo duoc.

export function QuanLyTraCuuScreen({ user }: { user: AppUser }) {
  const { query, nav } = useRoute();
  const stFilter = query.get("trang_thai") || "";
  const flt = useListFilters("/tra-cuu/don-vi", DEFS.map((d) => d.key));
  const base = stFilter ? `/tra-cuu/don-vi?trang_thai=${encodeURIComponent(stFilter)}` : "/tra-cuu/don-vi";
  // 02/11/2026: 3 che do xem (danh sach / nhom theo KTV / nhom theo linh kien) - che do nhom lay toi da 1000 dong 1 lan.
  const [mode, setMode] = useDonViewMode("don_view_tat_ca");
  const grouped = mode !== "list";
  const listPath = withQuery(base, flt.query);
  const path = grouped ? `${listPath}${listPath.includes("?") ? "&" : "?"}view=nhom` : listPath;
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<TraCuuRow>(path, "don_vi", grouped ? 1000 : 20);
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [guiId, setGuiId] = useState<string | null>(null);

  const stLabel = stFilter === "qua_han" ? "Quá hạn SLA 24h" : GIAI_DOAN_MAP[stFilter]?.label || stFilter;

  const cols: Column<TraCuuRow>[] = [
    {
      key: "id",
      header: "ID",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[var(--link)]">
          {r.id}
          {r.loai === "parent" && r.so_luong > 1 ? <span className="text-[var(--ink-soft)]"> ×{r.so_luong}</span> : null}
        </span>
      ),
    },
    {
      key: "st",
      header: "Giai đoạn",
      render: (r) => {
        const g = GIAI_DOAN_MAP[r.giai_doan];
        return <Badge tone={g?.tone || "gray"}>{g ? `${g.icon} ${g.label}` : r.giai_doan}</Badge>;
      },
    },
    { key: "gui", header: "Thùng / Phiếu trả", render: (r) => <span className="font-mono text-xs">{[r.phieu_gui_id, r.phieu_tra_id].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "ktv", header: "KTV / Nguồn", render: (r) => (r.ktv && r.ktv !== KHACH_LE_KEY ? <UserName email={r.ktv} /> : <Badge tone="violet">Khách lẻ{r.ten_khach_hang ? ` · ${r.ten_khach_hang}` : ""}</Badge>) },
    { key: "case", header: "Case", render: (r) => <span className="font-mono text-xs">{r.case_id || "—"}</span> },
    { key: "lk", header: "Linh kiện", render: (r) => nameOf(r.ma_lk) },
    {
      key: "lech",
      header: "Đánh giá LK",
      render: (r) => <LechLkBadges r={r} />,
    },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} /> },
  ];

  const openRow = (r: TraCuuRow) => (r.loai === "unit" ? setDetailId(r.id) : r.phieu_gui_id ? setGuiId(r.phieu_gui_id) : undefined);
  const gRows: GroupRow[] = grouped
    ? rows.map((r) => {
        const g = GIAI_DOAN_MAP[r.giai_doan];
        return {
          id: r.id,
          parentId: r.parent_id,
          ktv: r.ktv,
          lk: r.lk_b || r.ma_lk,
          caseId: r.case_id,
          slDat: r.sl_dat,
          slDuyet: r.sl_duyet,
          serial: r.serial,
          ngayMua: r.ngay_mua,
          ngaySx: r.ngay_sx,
          moTa: r.mo_ta_loi,
          status: <Badge tone={g?.tone || "gray"}>{g ? `${g.icon} ${g.label}` : r.giai_doan}</Badge>,
          sla: <SlaBadge since={r.updated_at} />,
          badge: r.loai === "parent" && r.so_luong > 1 ? <span className="text-xs text-[var(--ink-soft)]">×{r.so_luong}</span> : undefined,
          onClick: () => openRow(r),
        };
      })
    : [];

  if (loading && rows.length === 0 && !flt.active && !stFilter) return <Spinner />;

  return (
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🔍 Tra cứu mọi đơn — mọi giai đoạn ({total})</h3>
        <DonViewToggle value={mode} onChange={setMode} />
      </div>
      <FilterBar
        f={flt}
        defs={DEFS}
        placeholder="Mã đơn, thùng, phiếu trả, case, KTV, khách, serial, linh kiện…"
        extra={
          stFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-semibold px-2.5 py-1">
            Lọc: {stLabel}
            <button onClick={() => nav("/don?tab=tat_ca")} className="focus-ring hover:text-[var(--blue-800)]" aria-label="Bỏ lọc">
              ✕
            </button>
          </span>
          )
        }
      />
      <details className="mb-2 text-xs text-[var(--ink-soft)]">
        <summary className="cursor-pointer select-none font-semibold text-[var(--link)]">ℹ Đánh giá linh kiện A / B / C là gì?</summary>
        <div className="mt-1.5 space-y-1 rounded-lg bg-[var(--surface-2)] p-2 leading-relaxed">
          <p><b>A</b> = linh kiện KTV chọn khi gửi. <b>B</b> = linh kiện Admin xác nhận thực tế gửi về (để trống = giống A). <b>C</b> = linh kiện đổi mới / thay thế (để trống = giống B).</p>
          <p><Badge tone="orange">A≠B</Badge> KTV khai sai mã linh kiện. Nên rà lại với KTV (có thể ghi "KTV báo cáo sai"). Xác linh kiện (trả đối tác / tiêu huỷ) tính theo <b>B</b>.</p>
          <p><Badge tone="violet">B≠C</Badge> Trả cho KTV linh kiện khác với linh kiện gửi về: mã tương đương, nâng cấp, hoặc mã cũ hết hàng. Phiếu trả xuất theo <b>C</b>, nên đối trừ / kho phải theo C.</p>
          <p>Đơn chưa tách (chưa xác nhận số lượng) chưa có B, C nên chưa đánh giá.</p>
        </div>
      </details>
      {grouped ? (
        <>
          {total > rows.length && <p className="mb-1.5 text-xs font-semibold text-[var(--orange-700)]">Đang nhóm {rows.length}/{total} đơn mới nhất — lọc thêm để xem đủ.</p>}
          <GroupedDonView rows={gRows} mode={mode as "ktv" | "lk"} emptyText="Không tìm thấy đơn nào." />
        </>
      ) : (
        <>
          <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={openRow} emptyText="Không tìm thấy đơn nào." />
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </>
      )}
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={reload} />}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={reload} />}
    </Card>
  );
}
