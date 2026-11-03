import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EmptyState } from "./primitives";
import { Pagination } from "./Pagination";
import { useClientPage } from "../hooks/useClientPage";
import { useIsMobile } from "../hooks/useIsMobile";
import { useLkName } from "../hooks/useLinhKien";
import { UserName } from "../hooks/useUserNames";
import { KHACH_LE_KEY } from "../lib/constants";
import { fmtDateOnly } from "../lib/format";

// 02/11/2026 ("Ở danh sách 'Đơn bh' bổ sung thêm dạng xem nhóm theo KTV => bên dưới nhóm theo Linh kiện
// để Admin BH dễ xử lý (có thể tắt bật giữa 3 chế độ xem => lọc theo KTV, Lọc theo linh kiện)"):
//   Danh sách (bảng cũ) | Theo KTV (KTV -> linh kiện -> đơn) | Theo linh kiện (linh kiện -> KTV -> đơn).
// Mỗi dòng đơn có thêm SL đặt (KTV khai), SL duyệt (Admin xác nhận thực nhận), serial, ngày mua, ngày sản
// xuất (lấy từ bằng chứng case dvbh). Linh kiện nhóm theo B (thực tế gửi về, mặc định = A KTV chọn).

export type DonViewMode = "list" | "ktv" | "lk";

export function useDonViewMode(storageKey: string): [DonViewMode, (m: DonViewMode) => void] {
  const [mode, setMode] = useState<DonViewMode>(() => {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(storageKey) : null;
    return v === "ktv" || v === "lk" ? v : "list";
  });
  const set = (m: DonViewMode) => {
    setMode(m);
    try {
      localStorage.setItem(storageKey, m);
    } catch {
      /* bo qua */
    }
  };
  return [mode, set];
}

const MODES: { key: DonViewMode; label: string; short: string }[] = [
  { key: "list", label: "☰ Danh sách", short: "☰ DS" },
  { key: "ktv", label: "👷 Theo KTV", short: "👷 KTV" },
  { key: "lk", label: "🔩 Theo linh kiện", short: "🔩 LK" },
];

export function DonViewToggle({ value, onChange }: { value: DonViewMode; onChange: (m: DonViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-0.5" role="tablist" aria-label="Chế độ xem">
      {MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          role="tab"
          aria-selected={value === m.key}
          onClick={() => onChange(m.key)}
          className={`focus-ring rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${value === m.key ? "bg-[var(--surface)] text-[var(--accent)] shadow-card" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"}`}
        >
          <span className="hidden sm:inline">{m.label}</span>
          <span className="sm:hidden">{m.short}</span>
        </button>
      ))}
    </div>
  );
}

export interface GroupRow {
  id: string;
  parentId?: string; // don cha - tong SL dat cua nhom chi cong 1 lan / don cha
  ktv: string | null; // email KTV, KHACH_LE_KEY hoac null = khach le
  lk: string | null; // ma linh kien dung de nhom (B)
  caseId?: string | null;
  slDat?: number | null;
  slDuyet?: number | null;
  // 03/11/2026: dong la 1 DON VI tach tu don cha (moi don vi = 1 linh kien) -> SL hien 1, kem "/N" cua don cha.
  laDonVi?: boolean;
  serial?: string | null;
  ngayMua?: string | null;
  ngaySx?: string | null;
  moTa?: string | null;
  status?: ReactNode;
  sla?: ReactNode;
  actions?: ReactNode; // nut thao tac tren dong (tu chan click lan len dong)
  selectable?: boolean;
  badge?: ReactNode; // nhan phu canh ID (VD "Odoo", "×3")
  onClick?: () => void;
}

interface Group {
  key: string;
  rows: GroupRow[];
  subs: { key: string; rows: GroupRow[] }[];
}

const ktvKey = (r: GroupRow) => r.ktv || KHACH_LE_KEY;
const lkKey = (r: GroupRow) => r.lk || "";

function buildGroups(rows: GroupRow[], mode: "ktv" | "lk"): Group[] {
  const k1 = mode === "ktv" ? ktvKey : lkKey;
  const k2 = mode === "ktv" ? lkKey : ktvKey;
  const map = new Map<string, Map<string, GroupRow[]>>();
  for (const r of rows) {
    const a = k1(r);
    const b = k2(r);
    if (!map.has(a)) map.set(a, new Map());
    const m = map.get(a)!;
    if (!m.has(b)) m.set(b, []);
    m.get(b)!.push(r);
  }
  const out: Group[] = [];
  for (const [key, m] of map) {
    const subs = [...m.entries()].map(([k, rs]) => ({ key: k, rows: rs.sort((x, y) => x.id.localeCompare(y.id)) })).sort((x, y) => y.rows.length - x.rows.length);
    out.push({ key, subs, rows: subs.flatMap((s) => s.rows) });
  }
  return out.sort((x, y) => y.rows.length - x.rows.length);
}

// So luong hien tren dong: don vi tach = 1 cai (kem /N cua don cha); don cha chua tach = SL khai / thuc nhan.
function SlCell({ r, kind }: { r: GroupRow; kind: "dat" | "duyet" }) {
  const v = kind === "dat" ? r.slDat : r.slDuyet;
  if (v == null) return <span className="text-[var(--ink-faint)]">—</span>;
  if (r.laDonVi && Number(v) > 1)
    return (
      <span title={`1 đơn vị trong đơn cha ${r.parentId ?? ""} (${kind === "dat" ? "KTV khai" : "thực nhận"} ${v})`}>
        1<span className="text-[var(--ink-faint)] text-xs">/{v}</span>
      </span>
    );
  return <>{v}</>;
}

const sumDat = (rs: GroupRow[]) => {
  const seen = new Set<string>();
  let n = 0;
  for (const r of rs) {
    const k = r.parentId || r.id;
    if (seen.has(k)) continue;
    seen.add(k);
    n += Number(r.slDat) || 0;
  }
  return n;
};

function GroupCheck({ rows, selected, onToggle }: { rows: GroupRow[]; selected?: Set<string>; onToggle?: (ids: string[], checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const ids = rows.filter((r) => r.selectable).map((r) => r.id);
  const n = selected ? ids.filter((id) => selected.has(id)).length : 0;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = n > 0 && n < ids.length;
  }, [n, ids.length]);
  if (!selected || !onToggle || ids.length === 0) return null;
  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 accent-[var(--accent)]"
      checked={n === ids.length}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onToggle(ids, e.target.checked)}
      title={`Chọn ${ids.length} đơn trong nhóm`}
    />
  );
}

function Dash({ v }: { v: ReactNode }) {
  return v === null || v === undefined || v === "" ? <span className="text-[var(--ink-faint)]">—</span> : <>{v}</>;
}

export function GroupedDonView({
  rows,
  mode,
  selected,
  onToggle,
  emptyText,
}: {
  rows: GroupRow[];
  mode: "ktv" | "lk";
  selected?: Set<string>;
  onToggle?: (ids: string[], checked: boolean) => void;
  emptyText?: string;
}) {
  const isMobile = useIsMobile();
  const { nameOf } = useLkName();
  const groups = useMemo(() => buildGroups(rows, mode), [rows, mode]);
  const { pageItems, page, pageCount, total, setPage } = useClientPage(groups);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  useEffect(() => setClosed(new Set()), [mode]);
  const toggleOpen = (k: string) =>
    setClosed((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const allClosed = pageItems.length > 0 && pageItems.every((g) => closed.has(g.key));
  const hasSelect = !!selected && !!onToggle;

  const ktvLabel = (k: string) => (k === KHACH_LE_KEY ? <span className="text-[var(--violet-700)]">Khách lẻ</span> : <UserName email={k} />);
  const lkLabelOf = (k: string) => (k ? nameOf(k) : "Cả sản phẩm / chưa rõ linh kiện");
  const l1Label = (k: string) => (mode === "ktv" ? <>👷 {ktvLabel(k)}</> : <>🔩 {lkLabelOf(k)}</>);
  const l2Label = (k: string) => (mode === "ktv" ? <>🔩 {lkLabelOf(k)}</> : <>👷 {ktvLabel(k)}</>);
  const countTxt = (rs: GroupRow[]) => {
    const sl = sumDat(rs);
    return (
      <span className="font-normal text-[var(--ink-soft)]">
        ({rs.length}){sl > rs.length ? <span className="text-xs"> · SL {sl}</span> : null}
      </span>
    );
  };

  if (rows.length === 0) return <EmptyState text={emptyText || "Không có đơn nào."} />;

  const toolbar = (
    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-[var(--ink-soft)]">
      <span>
        {total} nhóm {mode === "ktv" ? "KTV" : "linh kiện"} · {rows.length} đơn
      </span>
      <button type="button" className="focus-ring font-semibold text-[var(--link)]" onClick={() => setClosed(allClosed ? new Set() : new Set(pageItems.map((g) => g.key)))}>
        {allClosed ? "▾ Mở tất cả" : "▸ Thu gọn tất cả"}
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <div>
        {toolbar}
        <div className="space-y-2">
          {pageItems.map((g) => (
            <div key={g.key} className="min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-card">
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] rounded-t-xl cursor-pointer" onClick={() => toggleOpen(g.key)}>
                <GroupCheck rows={g.rows} selected={selected} onToggle={onToggle} />
                <span className="min-w-0 flex-1 truncate font-bold text-[var(--ink)]">
                  {l1Label(g.key)} {countTxt(g.rows)}
                </span>
                <span className="text-[var(--ink-soft)]">{closed.has(g.key) ? "▸" : "▾"}</span>
              </div>
              {!closed.has(g.key) &&
                g.subs.map((s) => (
                  <div key={s.key} className="border-t border-[var(--line)]">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[var(--ink-body)]">
                      <GroupCheck rows={s.rows} selected={selected} onToggle={onToggle} />
                      <span className="min-w-0 flex-1 truncate">
                        {l2Label(s.key)} {countTxt(s.rows)}
                      </span>
                    </div>
                    {s.rows.map((r) => (
                      <div key={r.id} onClick={r.onClick} className={`mx-2 mb-1.5 rounded-lg border border-[var(--line)] p-2 text-[13px] ${r.onClick ? "cursor-pointer active:bg-[var(--accent-soft)]" : ""}`}>
                        <div className="flex items-center gap-2">
                          {hasSelect && r.selectable && (
                            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={selected!.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={(e) => onToggle!([r.id], e.target.checked)} />
                          )}
                          <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span>
                          {r.badge}
                          <span className="ml-auto">{r.status}</span>
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-[var(--ink-soft)]">
                          <span>Case: <b className="font-mono text-[var(--ink-body)]">{r.caseId || "—"}</b></span>
                          <span>SL đặt / duyệt: <b className="text-[var(--ink-body)]"><SlCell r={r} kind="dat" /> / <SlCell r={r} kind="duyet" /></b></span>
                          <span>Serial: <b className="text-[var(--ink-body)]">{r.serial || "—"}</b></span>
                          <span>Ngày mua: <b className="text-[var(--ink-body)]">{r.ngayMua ? fmtDateOnly(r.ngayMua) : "—"}</b></span>
                          <span>Ngày SX: <b className="text-[var(--ink-body)]">{r.ngaySx ? fmtDateOnly(r.ngaySx) : "—"}</b></span>
                          {r.sla && <span>SLA: {r.sla}</span>}
                        </div>
                        {r.moTa && <p className="mt-1 truncate text-xs text-[var(--ink-body)]">{r.moTa}</p>}
                        {r.actions && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {r.actions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
        <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      </div>
    );
  }

  const nCols = (hasSelect ? 1 : 0) + 11 + (rows.some((r) => r.actions) ? 1 : 0);
  const hasActions = rows.some((r) => r.actions);
  return (
    <div>
      {toolbar}
      <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
        <table className="tbl w-full whitespace-nowrap">
          <thead className="bg-[var(--surface-2)] text-left text-[var(--ink-soft)]">
            <tr>
              {hasSelect && <th className="w-8" />}
              <th>ID đơn</th>
              {hasActions && <th>Thao tác</th>}
              <th>Trạng thái</th>
              <th>Mã case</th>
              <th className="text-right">SL đặt</th>
              <th className="text-right">SL duyệt</th>
              <th>Serial</th>
              <th>Ngày mua</th>
              <th>Ngày SX</th>
              <th>Mô tả lỗi</th>
              <th>SLA</th>
              <th className="w-full" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((g) => (
              <Fragment key={g.key}>
                <tr className="cursor-pointer bg-[var(--brand-50)] hover:bg-[var(--brand-100)]" onClick={() => toggleOpen(g.key)}>
                  {hasSelect && (
                    <td>
                      <GroupCheck rows={g.rows} selected={selected} onToggle={onToggle} />
                    </td>
                  )}
                  <td colSpan={nCols - (hasSelect ? 1 : 0)} className="font-bold text-[var(--ink)]">
                    <span className="mr-1 text-[var(--ink-soft)]">{closed.has(g.key) ? "▸" : "▾"}</span>
                    {l1Label(g.key)} {countTxt(g.rows)}
                  </td>
                </tr>
                {!closed.has(g.key) &&
                  g.subs.map((s) => (
                    <Fragment key={s.key}>
                      <tr className="bg-[var(--surface-2)]">
                        {hasSelect && (
                          <td className="!pl-5">
                            <GroupCheck rows={s.rows} selected={selected} onToggle={onToggle} />
                          </td>
                        )}
                        <td colSpan={nCols - (hasSelect ? 1 : 0)} className="!pl-6 font-semibold text-[var(--ink-body)]">
                          {l2Label(s.key)} {countTxt(s.rows)}
                        </td>
                      </tr>
                      {s.rows.map((r) => (
                        <tr key={r.id} onClick={r.onClick} className={r.onClick ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""}>
                          {hasSelect && (
                            <td className="!pl-8" onClick={(e) => e.stopPropagation()}>
                              {r.selectable && <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={selected!.has(r.id)} onChange={(e) => onToggle!([r.id], e.target.checked)} />}
                            </td>
                          )}
                          <td className="!pl-10">
                            <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> {r.badge}
                          </td>
                          {hasActions && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1">{r.actions}</div>
                            </td>
                          )}
                          <td>
                            <Dash v={r.status} />
                          </td>
                          <td className="font-mono text-xs">
                            <Dash v={r.caseId} />
                          </td>
                          <td className="text-right">
                            <SlCell r={r} kind="dat" />
                          </td>
                          <td className={`text-right ${r.slDuyet != null && r.slDat != null && Number(r.slDuyet) !== Number(r.slDat) ? "font-bold text-[var(--orange-700)]" : ""}`}>
                            <SlCell r={r} kind="duyet" />
                          </td>
                          <td className="font-mono text-xs">
                            <Dash v={r.serial} />
                          </td>
                          <td>
                            <Dash v={r.ngayMua ? fmtDateOnly(r.ngayMua) : null} />
                          </td>
                          <td>
                            <Dash v={r.ngaySx ? fmtDateOnly(r.ngaySx) : null} />
                          </td>
                          <td className="max-w-[240px] truncate" title={r.moTa || undefined}>
                            <Dash v={r.moTa} />
                          </td>
                          <td>
                            <Dash v={r.sla} />
                          </td>
                          <td />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
    </div>
  );
}
