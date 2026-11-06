import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { FilterBar, useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
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
import { CapLinhKienModal, DeXuatBadge, KtTraLaiDeXuatModal, KtXacNhanDeXuatModal, TuChoiDeXuatModal } from "../shared/DeXuatLinhKien";
import { useRoute } from "../../router/Router";
import type { AppUser, DeXuatLk } from "../../lib/types";

// Man "Cap linh kien sua chua" (Admin BH, 12/10/2026): de xuat linh kien cua NV (don con cua don vi bao
// hanh). Admin len phieu xuat MISA roi bam "Cap" (1 hoac nhieu de xuat chung 1 ma MISA), hoac "Tu choi".

// 03/11/2026: them buoc "Cho KT xac nhan" - Admin dong y cap (ma don hang) -> Ke toan nhap MISA, duyet /
// tu choi / tra lai Admin. Ke toan chi thay 2 tab cho_ke_toan + da_cap.
// 04/11/2026 - "Phiếu cấp linh kiện sửa chữa tách thành các giai đoạn: Chờ KT, (KT xác nhận xong) => chờ kho in, kho đã in,
// Kho đã xuất (có 2 nút đã in hoặc đã xuất luôn cho kho) => Cho kho nhìn thấy đơn cấp lk": tab "Đã cấp" tach thanh 3 giai doan Kho.
const TABS = [
  { key: "cho_cap", label: "Chờ Admin cấp", kt: false, kho: false },
  { key: "cho_ke_toan", label: "Chờ KT xác nhận", kt: true, kho: false },
  { key: "cho_kho_in", label: "🖨 Chờ Kho in", kt: true, kho: true },
  { key: "kho_da_in", label: "📦 Kho đã in", kt: true, kho: true },
  { key: "kho_da_xuat", label: "✔ Kho đã xuất", kt: true, kho: true },
  { key: "tu_choi", label: "Từ chối", kt: false, kho: false },
  { key: "huy", label: "Đã huỷ", kt: false, kho: false },
];
const KHO_TABS = ["cho_kho_in", "kho_da_in"];
// 06/11/2026: 3 tab Kho gom theo phieu PXK (ma MISA).
const PXK_TABS = ["cho_kho_in", "kho_da_in", "kho_da_xuat"];
// Tab co viec cua nguoi xem -> so dem to do.
const VIEC_TAB: Record<string, (u: AppUser) => boolean> = {
  cho_cap: (u) => !!(u.la_admin_bh || u.la_qtri),
  cho_ke_toan: (u) => !!(u.la_ke_toan || u.la_qtri),
  cho_kho_in: (u) => !!(u.la_kho || u.la_qtri),
  kho_da_in: (u) => !!(u.la_kho || u.la_qtri),
};
type Dem = Record<string, { ca: number; pxk: number; dong: number }>;

const DEFS: FilterDef[] = [
  { key: "nguoi_de_xuat", label: "Người đề xuất", kind: "person" },
  { key: "nv", label: "NV sửa chữa", kind: "person" },
  { key: "ktv", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" },
  { key: "lk", label: "Linh kiện xin", kind: "lk" },
  LK_A_DEF,
  LK_B_DEF,
  { key: "nguoi_xu_ly", label: "Người xử lý", kind: "person", noneLabel: "Chưa xử lý" },
  CANH_BAO_DEF,
  KHOANG_DEF,
];

// ktOnly (04/11/2026): nhung vao man "Phiếu trả" cho Ke toan - chi 2 tab Cho KT xac nhan / Da cap, tab Cho KT
// xac nhan nhom theo case de duyet ca case hoac le tung don.
export function AdminDeXuatScreen({ user, ktOnly = false }: { user: AppUser; ktOnly?: boolean }) {
  const { refresh, counts } = useWorkload();
  const { nameOf } = useLkName();
  const { query } = useRoute();
  const isAdmin = user.la_admin_bh || user.la_qtri;
  const isKt = user.la_ke_toan || user.la_qtri;
  const isKho = user.la_kho || user.la_qtri;
  const tabs = TABS.filter((t) => (isAdmin && !ktOnly) || (isKt && t.kt) || (isKho && t.kho));
  const qTab = ktOnly ? null : query.get("tab");
  const macDinh = isAdmin && !ktOnly ? "cho_cap" : isKt && (!isKho || counts.ketoan_de_xuat_lk > 0) ? "cho_ke_toan" : counts.kho_lk_cho_in === 0 && counts.kho_lk_da_in > 0 ? "kho_da_in" : "cho_kho_in";
  const [tab, setTab] = useState(tabs.find((t) => t.key === qTab)?.key || macDinh);
  // 05/11/2026: ghi tab dang mo len URL (?dx=) de menu KTV dem dung theo tab.
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "");
    const [pth, qs] = raw.split("?");
    const p = new URLSearchParams(qs || "");
    if (p.get("dx") === tab) return;
    p.set("dx", tab);
    window.location.replace(`#${pth}?${p.toString()}`);
  }, [tab]);
  const [khoBusy, setKhoBusy] = useState(false);
  // 06/11/2026 - "các tab đang bị lỗi đếm số lượng ca tồn cần xử lý": so ca (tab Kho: so phieu PXK) cua MOI tab.
  const [dem, setDem] = useState<Dem>({});
  const loadDem = () => api.get<{ dem: Dem }>("/de-xuat/dem").then((r) => setDem(r.dem)).catch(() => {});
  // Chi tai khi mo man + sau moi thao tac (khong tai lai khi doi tab) - tiet kiem luot doc D1.
  useEffect(() => {
    loadDem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pxkTab = PXK_TABS.includes(tab);
  const toast = useToast();
  const [ktFor, setKtFor] = useState<DeXuatLk[] | null>(null);
  const [traLaiFor, setTraLaiFor] = useState<DeXuatLk | null>(null);
  const flt = useListFilters(`/de-xuat?trang_thai=${tab}`, DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<DeXuatLk>(withQuery(`/de-xuat?trang_thai=${tab}${pxkTab ? "&group=pxk" : ""}`, flt.query), "de_xuat", tab === "cho_ke_toan" ? 200 : undefined);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [capFor, setCapFor] = useState<DeXuatLk[] | null>(null);
  const [tuChoiFor, setTuChoiFor] = useState<DeXuatLk | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => setSelected(new Set()), [page, tab, flt.query]);
  const choKt = tab === "cho_ke_toan" && isKt;
  const khoTab = KHO_TABS.includes(tab) && isKho;
  const choCap = (tab === "cho_cap" && isAdmin) || choKt || khoTab;
  // Kho: da_in (in phieu) | chua_in (doi lai) | da_xuat (xuat luon, khong can in).
  // 06/11/2026: Kho xu ly ca phieu PXK (pxk[]) - backend gom moi de xuat cung ma PXK.
  const khoLam = async (pxk: string[], hanhDong: "da_in" | "chua_in" | "da_xuat") => {
    if (hanhDong === "da_xuat" && !window.confirm(`Xác nhận Kho đã xuất ${pxk.length} phiếu PXK (toàn bộ linh kiện bên trong)?`)) return;
    setKhoBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/de-xuat/kho", { pxk, hanh_dong: hanhDong });
      const nd = hanhDong === "da_in" ? "đã in phiếu" : hanhDong === "chua_in" ? "chuyển về chờ in" : "đã xuất";
      toast(r.loi.length ? `${pxk.length} PXK (${r.ok} linh kiện) ${nd}, ${r.loi.length} lỗi (${r.loi.map((x) => x.id).join(", ")})` : `${pxk.length} PXK (${r.ok} linh kiện) ${nd}.`, r.loi.length ? "error" : "ok");
      setSelected(new Set());
      after();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setKhoBusy(false);
    }
  };

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const n = new Set(prev);
      on ? n.add(id) : n.delete(id);
      return n;
    });
  const after = () => {
    reload();
    refresh();
    loadDem();
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
        r.trang_thai === "cho_ke_toan" && isKt ? (
          <span className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Btn size="sm" variant="success" onClick={() => setKtFor([r])}>
              Duyệt
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setTraLaiFor(r)}>
              ↩ Trả lại
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => setTuChoiFor(r)}>
              Từ chối
            </Btn>
          </span>
        ) : r.trang_thai === "cho_cap" && isAdmin ? (
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
    { key: "tt", header: "Trạng thái", render: (r) => <DeXuatBadge tt={r.trang_thai} khoTt={r.kho_tt ?? null} /> },
    { key: "unit", header: "Đơn bảo hành", render: (r) => <span className="font-mono text-xs">{r.unit_id}</span> },
    { key: "lk", header: "Linh kiện xin cấp", render: (r) => <span className="block max-w-[260px] truncate" title={nameOf(r.ma_lk)}>{nameOf(r.ma_lk)}</span> },
    { key: "sl", header: "SL", render: (r) => <b>×{r.so_luong}</b> },
    { key: "nv", header: "NV đề xuất", render: (r) => <UserName email={r.nguoi_de_xuat} /> },
    { key: "gc", header: "Ghi chú", render: (r) => <span className="block max-w-[220px] truncate" title={r.ghi_chu || ""}>{r.ghi_chu || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "ma", header: "Mã ĐH / MISA", render: (r) => <span className="text-xs">{[r.ma_don_hang && `ĐH ${r.ma_don_hang}`, r.ma_misa && `MISA ${r.ma_misa}`].filter(Boolean).join(" · ") || "—"}</span> },
    tab === "cho_cap" || tab === "cho_ke_toan"
      ? { key: "sla", header: "Chờ", render: (r) => <span className="flex items-center gap-1"><SlaBadge since={tab === "cho_ke_toan" ? r.xu_ly_luc || r.created_at : r.created_at} />{r.ly_do_tu_choi && tab === "cho_cap" && <span className="text-xs text-[var(--red-700,#b91c1c)] truncate max-w-[200px]" title={r.ly_do_tu_choi}>↩ {r.ly_do_tu_choi}</span>}</span> }
      : KHO_TABS.includes(tab)
        ? { key: "sla", header: "Chờ Kho", render: (r) => <SlaBadge since={(tab === "kho_da_in" ? r.kho_in_luc : null) || r.kt_luc || r.updated_at} /> }
        : tab === "kho_da_xuat"
          ? { key: "xl", header: "Kho xuất", render: (r) => <span className="text-xs">{r.kho_xuat_boi ? <UserName email={r.kho_xuat_boi} /> : "—"} · {fmtDate(r.kho_xuat_luc || r.kt_luc)}</span> }
          : { key: "xl", header: "Xử lý", render: (r) => <span className="text-xs">{r.ly_do_tu_choi || (r.kt_boi ? "KT đã xác nhận" : "—")} · {fmtDate(r.kt_luc || r.xu_ly_luc)}</span> },
  ];

  if (loading && rows.length === 0 && total === 0 && !flt.active) return <Spinner />;
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🔩 Cấp linh kiện sửa chữa</h3>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${tab === t.key ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-white text-[var(--ink-body)] border-[var(--line)]"}`}
            >
              {t.label}
              {dem[t.key] && (PXK_TABS.includes(t.key) ? dem[t.key].pxk : dem[t.key].ca) > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 text-[11px] font-bold ${tab === t.key ? "bg-white/25 text-white" : VIEC_TAB[t.key]?.(user) ? "bg-[var(--red-600,#dc2626)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-soft)]"}`}
                  title={`${PXK_TABS.includes(t.key) ? `${dem[t.key].pxk} phiếu PXK · ` : ""}${dem[t.key].ca} ca · ${dem[t.key].dong} linh kiện`}
                >
                  {PXK_TABS.includes(t.key) ? `${dem[t.key].pxk} PXK` : `${dem[t.key].ca} ca`}
                </span>
              )}
            </button>
          ))}
        </div>
        {choCap && !pxkTab && rows.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-[var(--ink-soft)] cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
            Chọn tất cả đang hiển thị
          </label>
        )}
        {selected.size > 0 && !pxkTab && (
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="blue">{selected.size} đã chọn</Badge>
            {choKt ? (
              <Btn variant="success" onClick={() => setKtFor(rows.filter((r) => selected.has(r.id)))}>
                ✔ Duyệt {selected.size} đề xuất (nhập MISA)
              </Btn>
            ) : (
              <Btn variant="success" onClick={() => setCapFor(rows.filter((r) => selected.has(r.id)))}>
                ✔ Đồng ý cấp {selected.size} đề xuất
              </Btn>
            )}
          </div>
        )}
      </div>
      {tab === "cho_cap" && <p className="text-xs text-[var(--ink-soft)] mb-2">NV sửa chữa xin cấp linh kiện để sửa. Bấm "Cấp", nhập mã đơn hàng (mã MISA tuỳ chọn) → đề xuất chuyển sang Kế toán xác nhận. Bấm dòng để mở đơn bảo hành.</p>}
      {tab === "cho_kho_in" && <p className="text-xs text-[var(--ink-soft)] mb-2">Kế toán đã xác nhận MISA — mỗi khối là 1 phiếu PXK. Bấm khối để xem các đơn bảo hành bên trong; "🖨 Đã in" / "📦 Đã xuất" áp cho toàn bộ phiếu.</p>}
      {tab === "kho_da_in" && <p className="text-xs text-[var(--ink-soft)] mb-2">Kho đã in phiếu PXK — xuất linh kiện cho NV sửa chữa rồi bấm "📦 Đã xuất" (in nhầm thì "↩ Chưa in"), áp cho toàn bộ phiếu.</p>}
      {tab === "cho_ke_toan" && <p className="text-xs text-[var(--ink-soft)] mb-2">Admin BH đã đồng ý cấp. Kế toán nhập mã phiếu xuất MISA rồi "Duyệt", hoặc "Trả lại" Admin BH sửa, hoặc "Từ chối" (kết thúc).</p>}
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã đề xuất, đơn, linh kiện, MISA, NV, KTV, case…" />
      {pxkTab ? (
        <PxkGroups rows={rows} nameOf={nameOf} canAct={isKho && KHO_TABS.includes(tab)} tab={tab} busy={khoBusy} onLam={khoLam} onOpen={setDetailId} />
      ) : choKt ? (
        <KtCaseGroups
          rows={rows}
          nameOf={nameOf}
          selected={selected}
          toggle={toggle}
          onDuyet={(l) => setKtFor(l)}
          onTraLai={setTraLaiFor}
          onTuChoi={setTuChoiFor}
          onOpen={setDetailId}
        />
      ) : (
        <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.unit_id)} emptyText="Không có đề xuất nào." />
      )}
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
      {ktFor && (
        <KtXacNhanDeXuatModal
          list={ktFor}
          onClose={() => setKtFor(null)}
          onDone={() => {
            setKtFor(null);
            setSelected(new Set());
            after();
          }}
        />
      )}
      {traLaiFor && (
        <KtTraLaiDeXuatModal
          dx={traLaiFor}
          onClose={() => setTraLaiFor(null)}
          onDone={() => {
            setTraLaiFor(null);
            after();
          }}
        />
      )}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={after} />}
    </Card>
  );
}

// 04/11/2026 - "nếu 1 đơn có nhiều linh kiện, có thể duyệt chung cả case hoặc duyệt lẻ từng đơn": nhom de xuat cho Ke toan
// theo case (khong co case thi theo don bao hanh), moi nhom co nut "Duyet ca case", moi dong co Duyet / Tra lai / Tu choi.
function KtCaseGroups({
  rows,
  nameOf,
  selected,
  toggle,
  onDuyet,
  onTraLai,
  onTuChoi,
  onOpen,
}: {
  rows: DeXuatLk[];
  nameOf: (ma: string | null | undefined) => string;
  selected: Set<string>;
  toggle: (id: string, on: boolean) => void;
  onDuyet: (list: DeXuatLk[]) => void;
  onTraLai: (d: DeXuatLk) => void;
  onTuChoi: (d: DeXuatLk) => void;
  onOpen: (unitId: string) => void;
}) {
  const groups: { key: string; items: DeXuatLk[] }[] = [];
  for (const r of rows) {
    const key = r.case_id || r.unit_id;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, items: [] }));
    g.items.push(r);
  }
  if (!rows.length) return <p className="text-sm text-[var(--ink-soft)] py-6 text-center">Không có đề xuất nào chờ Kế toán xác nhận.</p>;
  return (
    <div className="space-y-2">
      {groups.map((g) => {
        const all = g.items.every((r) => selected.has(r.id));
        const donVi = new Set(g.items.map((r) => r.unit_id)).size;
        return (
          <div key={g.key} className="rounded-lg border border-[var(--line)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 bg-[var(--surface-2)] px-2.5 py-1.5">
              <input type="checkbox" className="w-4 h-4" checked={all} onChange={(e) => g.items.forEach((r) => toggle(r.id, e.target.checked))} aria-label={`Chọn cả case ${g.key}`} />
              <span className="font-mono text-xs font-semibold text-[var(--ink)]">{g.items[0].case_id ? `Case ${g.key}` : `Đơn ${g.key}`}</span>
              {g.items[0].ktv && (
                <span className="text-xs text-[var(--ink-soft)]">
                  · KTV <UserName email={g.items[0].ktv} />
                </span>
              )}
              <span className="text-xs text-[var(--ink-soft)]">
                · {g.items.length} linh kiện{donVi > 1 ? ` / ${donVi} đơn` : ""}
              </span>
              <MienBadge mien={g.items[0].mien} short />
              {g.items.length > 1 && (
                <Btn size="sm" variant="success" className="ml-auto" onClick={() => onDuyet(g.items)}>
                  ✔ Duyệt cả case ({g.items.length})
                </Btn>
              )}
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {g.items.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-[13px] cursor-pointer hover:bg-[var(--surface-2)]" onClick={() => onOpen(r.unit_id)}>
                  <input type="checkbox" className="w-4 h-4" checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={`Chọn ${r.id}`} />
                  <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span>
                  <span className="min-w-0 max-w-[320px] truncate font-semibold text-[var(--ink)]" title={nameOf(r.ma_lk)}>
                    {nameOf(r.ma_lk)}
                  </span>
                  <b>×{r.so_luong}</b>
                  <span className="font-mono text-xs text-[var(--ink-soft)]">{r.unit_id}</span>
                  <span className="text-xs text-[var(--ink-soft)]">
                    <UserName email={r.nguoi_de_xuat} />
                  </span>
                  {(r.ma_don_hang || r.ma_misa) && <span className="text-xs">{[r.ma_don_hang && `ĐH ${r.ma_don_hang}`, r.ma_misa && `MISA ${r.ma_misa}`].filter(Boolean).join(" · ")}</span>}
                  <span className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Btn size="sm" variant="success" onClick={() => onDuyet([r])}>
                      Duyệt
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => onTraLai(r)}>
                      ↩ Trả lại
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => onTuChoi(r)}>
                      Từ chối
                    </Btn>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// 06/11/2026 - "tab chờ in phiếu, đã in phiếu, đã xuất, tổng hợp theo mã PXK => kho vào 1 phiếu pxk sẽ xem được danh sách các
// đơn bảo hành bên trong pxk đó, Kho sẽ xử lý tất cả các đơn trong cùng 1 phiếu."
function PxkGroups({
  rows,
  nameOf,
  canAct,
  tab,
  busy,
  onLam,
  onOpen,
}: {
  rows: DeXuatLk[];
  nameOf: (ma: string | null | undefined) => string;
  canAct: boolean;
  tab: string;
  busy: boolean;
  onLam: (pxk: string[], hd: "da_in" | "chua_in" | "da_xuat") => void;
  onOpen: (unitId: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSel(new Set());
  }, [rows]);
  const groups: { key: string; coMisa: boolean; items: DeXuatLk[] }[] = [];
  for (const r of rows) {
    const key = r.pxk || r.ma_misa || r.id;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, coMisa: !!(r.ma_misa && r.ma_misa.trim()), items: [] }));
    g.items.push(r);
  }
  if (!rows.length) return <p className="text-sm text-[var(--ink-soft)] py-6 text-center">Không có phiếu PXK nào.</p>;
  const flip = (set: Set<string>, k: string) => {
    const n = new Set(set);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    return n;
  };
  const allOpen = groups.every((g) => open.has(g.key));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {canAct && (
          <label className="flex items-center gap-1 text-[var(--ink-soft)] cursor-pointer">
            <input type="checkbox" checked={sel.size === groups.length} onChange={(e) => setSel(e.target.checked ? new Set(groups.map((g) => g.key)) : new Set())} />
            Chọn tất cả {groups.length} phiếu đang hiển thị
          </label>
        )}
        <button className="text-[var(--link)] font-semibold" onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.key)))}>
          {allOpen ? "▾ Thu gọn tất cả" : "▸ Mở tất cả"}
        </button>
        {canAct && sel.size > 0 && (
          <span className="ml-auto flex items-center gap-2">
            <Badge tone="blue">{sel.size} phiếu PXK</Badge>
            {tab === "cho_kho_in" ? (
              <Btn size="sm" disabled={busy} onClick={() => onLam([...sel], "da_in")}>
                🖨 Đã in {sel.size} phiếu
              </Btn>
            ) : (
              <Btn size="sm" variant="ghost" disabled={busy} onClick={() => onLam([...sel], "chua_in")}>
                ↩ Chưa in
              </Btn>
            )}
            <Btn size="sm" variant="success" disabled={busy} onClick={() => onLam([...sel], "da_xuat")}>
              📦 Đã xuất {sel.size} phiếu
            </Btn>
          </span>
        )}
      </div>
      {groups.map((g) => {
        const isOpen = open.has(g.key);
        const units = new Map<string, DeXuatLk[]>();
        g.items.forEach((r) => units.set(r.unit_id, [...(units.get(r.unit_id) || []), r]));
        const ktvs = [...new Set(g.items.map((r) => r.ktv).filter(Boolean))] as string[];
        const tongSl = g.items.reduce((a, r) => a + (r.so_luong || 0), 0);
        const r0 = g.items[0];
        const since = (tab === "kho_da_in" ? r0.kho_in_luc : null) || r0.kt_luc || r0.updated_at;
        return (
          <div key={g.key} className="rounded-lg border border-[var(--line)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 bg-[var(--surface-2)] px-2.5 py-1.5 cursor-pointer" onClick={() => setOpen((o) => flip(o, g.key))}>
              {canAct && <input type="checkbox" className="w-4 h-4" checked={sel.has(g.key)} onClick={(e) => e.stopPropagation()} onChange={() => setSel((x) => flip(x, g.key))} aria-label={`Chọn phiếu ${g.key}`} />}
              <span className="text-[var(--ink-soft)] w-3">{isOpen ? "▾" : "▸"}</span>
              <span className="font-mono text-[13px] font-bold text-[var(--ink)]">{g.coMisa ? `🧾 PXK ${g.key}` : `🧾 Chưa có mã PXK · ${g.key}`}</span>
              <span className="text-xs text-[var(--ink-soft)]">
                · {units.size} đơn bảo hành · {g.items.length} linh kiện{tongSl !== g.items.length ? ` (SL ${tongSl})` : ""}
              </span>
              {ktvs.length > 0 && (
                <span className="text-xs text-[var(--ink-soft)] min-w-0 truncate max-w-[260px]">
                  · KTV <UserName email={ktvs[0]} />
                  {ktvs.length > 1 ? ` +${ktvs.length - 1}` : ""}
                </span>
              )}
              <MienBadge mien={r0.mien} short />
              {tab === "kho_da_xuat" ? (
                <span className="text-xs text-[var(--ink-soft)]">
                  · Xuất {fmtDate(r0.kho_xuat_luc || r0.kt_luc)}
                  {r0.kho_xuat_boi ? (
                    <>
                      {" "}
                      · <UserName email={r0.kho_xuat_boi} />
                    </>
                  ) : null}
                </span>
              ) : (
                <SlaBadge since={since} />
              )}
              {canAct && (
                <span className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {tab === "cho_kho_in" ? (
                    <Btn size="sm" disabled={busy} onClick={() => onLam([g.key], "da_in")}>
                      🖨 Đã in
                    </Btn>
                  ) : (
                    <Btn size="sm" variant="ghost" disabled={busy} onClick={() => onLam([g.key], "chua_in")}>
                      ↩ Chưa in
                    </Btn>
                  )}
                  <Btn size="sm" variant="success" disabled={busy} onClick={() => onLam([g.key], "da_xuat")}>
                    📦 Đã xuất cả phiếu
                  </Btn>
                </span>
              )}
            </div>
            {!isOpen && (
              <p className="px-2.5 py-1 text-xs text-[var(--ink-soft)] truncate" title={g.items.map((r) => nameOf(r.ma_lk)).join(", ")}>
                {g.items.map((r) => `${nameOf(r.ma_lk)} ×${r.so_luong}`).join(" · ")}
              </p>
            )}
            {isOpen && (
              <ul className="divide-y divide-[var(--line)]">
                {[...units.entries()].map(([unitId, list]) => (
                  <li key={unitId} className="px-2.5 py-1.5 text-[13px] cursor-pointer hover:bg-[var(--surface-2)]" onClick={() => onOpen(unitId)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--link)]">{unitId}</span>
                      {list[0].case_id && <span className="font-mono text-xs text-[var(--ink-soft)]">Case {list[0].case_id}</span>}
                      {list[0].ktv && (
                        <span className="text-xs text-[var(--ink-soft)]">
                          · <UserName email={list[0].ktv} />
                        </span>
                      )}
                      {list[0].mo_ta_loi && (
                        <span className="text-xs text-[var(--ink-soft)] min-w-0 truncate max-w-[280px]" title={list[0].mo_ta_loi}>
                          · {list[0].mo_ta_loi}
                        </span>
                      )}
                    </div>
                    {list.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-2 pl-4 text-xs">
                        <span className="font-mono text-[var(--ink-soft)]">{r.id}</span>
                        <span className="min-w-0 max-w-[360px] truncate font-semibold text-[var(--ink)]" title={nameOf(r.ma_lk)}>
                          {nameOf(r.ma_lk)}
                        </span>
                        <b>×{r.so_luong}</b>
                        <span className="text-[var(--ink-soft)]">
                          NV <UserName email={r.nguoi_de_xuat} />
                        </span>
                        {r.ma_don_hang && <span className="text-[var(--ink-soft)]">ĐH {r.ma_don_hang}</span>}
                        {r.ghi_chu && (
                          <span className="text-[var(--ink-soft)] truncate max-w-[220px]" title={r.ghi_chu}>
                            · {r.ghi_chu}
                          </span>
                        )}
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
