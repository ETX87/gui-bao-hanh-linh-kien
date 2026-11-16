import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { KHOANG_DEF, NONE, useOptsOf, QuickFilterGrid, type FilterDef, type ListFilters } from "./FilterBar";
import { Input } from "./primitives";
import { normalizeVi } from "../lib/normalizeVi";
import { useIsMobile } from "../hooks/useIsMobile";

// 13/11/2026 - BANG KIEU EXCEL ("Bảng dữ liệu: kiểu bảng Excel (lọc + sắp xếp trên tiêu đề cột)", CLAUDE.md chung):
//   - moi tieu de cot co bo loc theo kieu du lieu: chu -> o tim theo tu (khong phan biet dau / hoa thuong);
//     it gia tri lap -> tich chon 1 hoac nhieu (co o tim, chon tat ca / bo chon); ngay -> 1 ngay hoac khoang;
//     so -> khoang tu - den;
//   - bam tieu de de sap xep tang / giam, co mui ten bao cot + chieu dang sap;
//   - cot dang loc co dau hieu (nut loc to mau) + xoa nhanh; hien so dong sau loc / tong.
// Trang thai loc + sap xep nam trong useListFilters (FilterBar.tsx) -> gui len server (bang phan trang server).

export type ColFilter =
  | { type: "text"; key: string; placeholder?: string }
  | { type: "multi"; def: FilterDef; groups?: { label: string; values: string[] }[] }
  | { type: "single"; def: FilterDef }
  | { type: "date"; key: string }
  | { type: "number"; key: string };

// Mo ta 1 cot co the loc / sap xep (dung cho tieu de bang, chip dang loc, nut loc tren dien thoai).
export interface FilterCol {
  key: string;
  label: string;
  filter?: ColFilter;
  sortKey?: string;
}

// Cac tham so query ma 1 bo loc dung (de khai bao cho useListFilters).
export function filterKeys(f: ColFilter): string[] {
  if (f.type === "multi" || f.type === "single") return [f.def.key];
  if (f.type === "number") return [`${f.key}_tu`, `${f.key}_den`];
  return [f.key];
}
export function colsFilterKeys(cols: { filter?: ColFilter }[]): string[] {
  return cols.flatMap((c) => (c.filter ? filterKeys(c.filter) : []));
}

function isActive(flt: ListFilters, f: ColFilter): boolean {
  return filterKeys(f).some((k) => !!flt.values[k]);
}

const KHOANG_PRESETS = (KHOANG_DEF.static || []).filter((o) => !o.value.startsWith("tu:"));
function fmtD(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y.slice(2)}`;
}

// Tom tat gia tri dang loc cua 1 cot (cho chip).
function summary(flt: ListFilters, f: ColFilter, optsOf: (d: FilterDef) => { value: string; label: string }[]): string {
  if (f.type === "text" || f.type === "date") {
    const v = flt.values[f.key] || "";
    if (f.type === "date") {
      if (v.startsWith("tu:")) {
        const [, tu = "", den = ""] = v.split(":");
        return tu && tu === den ? fmtD(tu) : `${tu ? fmtD(tu) : "…"} → ${den ? fmtD(den) : "…"}`;
      }
      return KHOANG_PRESETS.find((o) => o.value === v)?.label || v;
    }
    return `"${v}"`;
  }
  if (f.type === "number") {
    const tu = flt.values[`${f.key}_tu`] || "";
    const den = flt.values[`${f.key}_den`] || "";
    return tu && den ? `${tu} – ${den}` : tu ? `≥ ${tu}` : `≤ ${den}`;
  }
  const v = flt.values[f.def.key] || "";
  const vals = v.split(",").filter(Boolean);
  const opts = optsOf(f.def);
  if (vals.length === 1) return opts.find((o) => o.value === vals[0])?.label || (vals[0] === NONE ? f.def.noneLabel || "(Trống)" : vals[0]);
  return `${vals.length} giá trị`;
}

function clearCol(flt: ListFilters, f: ColFilter) {
  flt.setMany(Object.fromEntries(filterKeys(f).map((k) => [k, ""])));
}

// ---------- Tieu de cot: chu (bam de sap xep) + mui ten + nut loc ----------
export function ColHeader({ col, flt, children }: { col: FilterCol; flt?: ListFilters; children?: ReactNode }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const label = children ?? col.label;
  if (!flt || (!col.filter && !col.sortKey)) return <>{label}</>;
  const sorted = !!col.sortKey && flt.sort === col.sortKey;
  const active = !!col.filter && isActive(flt, col.filter);
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      {col.sortKey ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            flt.setSort(col.sortKey!);
          }}
          className={`inline-flex items-center gap-0.5 min-w-0 hover:text-[var(--ink)] ${sorted ? "text-[var(--accent-ink)]" : ""}`}
          title={sorted ? (flt.dir === "asc" ? "Đang sắp tăng dần — bấm để sắp giảm dần" : "Đang sắp giảm dần — bấm để bỏ sắp xếp") : "Bấm để sắp xếp tăng dần"}
        >
          <span className="truncate">{label}</span>
          <span className={`text-[10px] ${sorted ? "" : "opacity-30"}`}>{sorted ? (flt.dir === "asc" ? "▲" : "▼") : "↕"}</span>
        </button>
      ) : (
        <span className="truncate">{label}</span>
      )}
      {col.filter && (
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          draggable={false}
          className={`shrink-0 inline-flex h-5 w-5 items-center justify-center rounded ${active ? "bg-[var(--accent)] text-white" : "text-[var(--ink-faint)] hover:bg-[var(--line)] hover:text-[var(--ink)]"}`}
          title={active ? "Đang lọc cột này — bấm để sửa / xoá lọc" : "Lọc cột này"}
          aria-label={`Lọc cột ${col.label}`}
        >
          <FunnelIcon />
        </button>
      )}
      {open && col.filter && <FilterPopover anchor={btnRef.current} col={col} flt={flt} onClose={() => setOpen(false)} />}
    </span>
  );
}

function FunnelIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.5 2h13a.5.5 0 0 1 .4.8L10 9v4.5a.5.5 0 0 1-.28.45l-3 1.5A.5.5 0 0 1 6 15V9L1.1 2.8A.5.5 0 0 1 1.5 2z" />
    </svg>
  );
}

// ---------- Hop loc bat ra (portal, vi tri co dinh duoi nut) ----------
export function FilterPopover({ anchor, col, flt, onClose }: { anchor: HTMLElement | null; col: FilterCol; flt: ListFilters; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const W = 288;
  useLayoutEffect(() => {
    const place = () => {
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.left - 8), window.innerWidth - W - 8);
      let top = r.bottom + 4;
      const h = ref.current?.offsetHeight || 380;
      if (top + h > window.innerHeight - 8 && r.top - h - 4 > 8) top = r.top - h - 4;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      // O chon tim (SearchableSelect) / lich ngay co the ve ngoai hop - bo qua cac portal khac.
      if ((t as HTMLElement).closest?.("[data-popover-keep]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  const f = col.filter;
  const style: React.CSSProperties = isMobile
    ? { position: "fixed", left: 8, right: 8, bottom: 8, zIndex: 210 }
    : { position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: W, zIndex: 210 };
  return createPortal(
    <div
      ref={ref}
      style={style}
      className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-pop text-left font-normal text-[var(--ink-body)] whitespace-normal"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2">
        <span className="text-[13px] font-bold text-[var(--ink)] truncate">{col.label}</span>
        <button type="button" onClick={onClose} className="text-[var(--ink-faint)] hover:text-[var(--ink)] text-sm" aria-label="Đóng">
          ✕
        </button>
      </div>
      {col.sortKey && (
        <div className="flex gap-1 border-b border-[var(--line)] px-3 py-2">
          {(["asc", "desc"] as const).map((d) => {
            const on = flt.sort === col.sortKey && flt.dir === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  flt.setSort(col.sortKey!, on ? "" : d);
                  onClose();
                }}
                className={`flex-1 rounded-md border px-2 py-1 text-xs font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--line)] hover:bg-[var(--surface-2)]"}`}
              >
                {d === "asc" ? "▲ Sắp tăng dần" : "▼ Sắp giảm dần"}
              </button>
            );
          })}
        </div>
      )}
      {f && f.type === "text" && <TextBody flt={flt} f={f} onClose={onClose} />}
      {f && f.type === "number" && <NumberBody flt={flt} f={f} onClose={onClose} />}
      {f && f.type === "date" && <DateBody flt={flt} f={f} onClose={onClose} />}
      {f && (f.type === "multi" || f.type === "single") && <ChoiceBody flt={flt} f={f} onClose={onClose} />}
    </div>,
    document.body,
  );
}

function Footer({ onClear, onApply, canApply = true }: { onClear: () => void; onApply: () => void; canApply?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-3 py-2">
      <button type="button" onClick={onClear} className="text-xs font-semibold text-[var(--link)] hover:underline">
        Xoá lọc cột
      </button>
      <button type="button" disabled={!canApply} onClick={onApply} className="rounded-md bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-40">
        Áp dụng
      </button>
    </div>
  );
}

function TextBody({ flt, f, onClose }: { flt: ListFilters; f: Extract<ColFilter, { type: "text" }>; onClose: () => void }) {
  const [v, setV] = useState(flt.values[f.key] || "");
  const apply = () => {
    flt.set(f.key, v.trim());
    onClose();
  };
  return (
    <>
      <div className="px-3 py-2">
        <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder={f.placeholder || "Chứa các từ…"} />
        <p className="mt-1 text-[11px] text-[var(--ink-faint)]">Mỗi từ phải có trong cột, không phân biệt hoa / thường.</p>
      </div>
      <Footer
        onClear={() => {
          flt.set(f.key, "");
          onClose();
        }}
        onApply={apply}
      />
    </>
  );
}

function NumberBody({ flt, f, onClose }: { flt: ListFilters; f: Extract<ColFilter, { type: "number" }>; onClose: () => void }) {
  const [tu, setTu] = useState(flt.values[`${f.key}_tu`] || "");
  const [den, setDen] = useState(flt.values[`${f.key}_den`] || "");
  const apply = () => {
    flt.setMany({ [`${f.key}_tu`]: tu.trim(), [`${f.key}_den`]: den.trim() });
    onClose();
  };
  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2">
        <Input type="number" autoFocus value={tu} onChange={(e) => setTu(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="Từ" />
        <span className="text-xs text-[var(--ink-soft)]">–</span>
        <Input type="number" value={den} onChange={(e) => setDen(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="Đến" />
      </div>
      <Footer
        onClear={() => {
          clearCol(flt, f);
          onClose();
        }}
        onApply={apply}
      />
    </>
  );
}

function DateBody({ flt, f, onClose }: { flt: ListFilters; f: Extract<ColFilter, { type: "date" }>; onClose: () => void }) {
  const cur = flt.values[f.key] || "";
  const [, cTu = "", cDen = ""] = cur.startsWith("tu:") ? cur.split(":") : [];
  const [mode, setMode] = useState<"ngay" | "khoang">(cTu && cTu === cDen ? "ngay" : "khoang");
  const [tu, setTu] = useState(cTu);
  const [den, setDen] = useState(cDen);
  const set = (v: string) => {
    flt.set(f.key, v);
    onClose();
  };
  const apply = () => {
    if (mode === "ngay") set(tu ? `tu:${tu}:${tu}` : "");
    else set(tu || den ? `tu:${tu}:${den}` : "");
  };
  return (
    <>
      <div className="px-3 py-2 space-y-2">
        <div className="flex flex-wrap gap-1">
          {KHOANG_PRESETS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => set(o.value)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cur === o.value ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--line)] hover:bg-[var(--surface-2)]"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={mode === "ngay"} onChange={() => setMode("ngay")} /> 1 ngày
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={mode === "khoang"} onChange={() => setMode("khoang")} /> Từ ngày – đến ngày
          </label>
        </div>
        {mode === "ngay" ? (
          <Input type="date" value={tu} onChange={(e) => setTu(e.target.value)} />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input type="date" aria-label="Từ ngày" value={tu} max={den || undefined} onChange={(e) => setTu(e.target.value)} />
            <span className="text-xs text-[var(--ink-soft)]">→</span>
            <Input type="date" aria-label="Đến ngày" value={den} min={tu || undefined} onChange={(e) => setDen(e.target.value)} />
          </div>
        )}
      </div>
      <Footer
        onClear={() => set("")}
        onApply={apply}
        canApply={mode === "ngay" ? !!tu : !!(tu || den)}
      />
    </>
  );
}

function ChoiceBody({ flt, f, onClose }: { flt: ListFilters; f: Extract<ColFilter, { type: "multi" | "single" }>; onClose: () => void }) {
  const optsOf = useOptsOf(flt);
  const opts = optsOf(f.def);
  const multi = f.type === "multi";
  const cur = (flt.values[f.def.key] || "").split(",").filter(Boolean);
  const [sel, setSel] = useState<Set<string>>(() => new Set(cur));
  const [kw, setKw] = useState("");
  const index = useMemo(() => opts.map((o) => normalizeVi(`${o.label} ${o.value}`)), [opts]);
  const words = normalizeVi(kw).split(/\s+/).filter(Boolean);
  const shown = opts.filter((_, i) => words.every((w) => index[i].includes(w)));
  const allShownOn = shown.length > 0 && shown.every((o) => sel.has(o.value));
  const apply = (next: Set<string> = sel) => {
    // Chon het moi lua chon = khong loc.
    const vals = opts.filter((o) => next.has(o.value)).map((o) => o.value);
    flt.set(f.def.key, vals.length === 0 || vals.length === opts.length ? "" : vals.join(","));
    onClose();
  };
  if (!multi) {
    const v = flt.values[f.def.key] || "";
    return (
      <div className="max-h-72 overflow-y-auto py-1">
        {[{ value: "", label: "Tất cả" }, ...opts].map((o) => (
          <button
            key={o.value || "_all"}
            type="button"
            onClick={() => {
              flt.set(f.def.key, o.value);
              onClose();
            }}
            className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--surface-2)] ${v === o.value ? "font-semibold text-[var(--accent-ink)]" : ""}`}
          >
            {v === o.value ? "✓ " : ""}
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="px-3 pt-2 space-y-1.5">
        {opts.length > 6 && <Input autoFocus type="search" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="🔍 Tìm trong danh sách…" />}
        {f.groups && !kw && (
          <div className="flex flex-wrap gap-1">
            {f.groups.map((g) => (
              <button key={g.label} type="button" onClick={() => apply(new Set(g.values))} className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[11px] font-semibold hover:bg-[var(--surface-2)]">
                {g.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <label className="inline-flex items-center gap-1.5 font-semibold">
            <input
              type="checkbox"
              checked={allShownOn}
              onChange={(e) =>
                setSel((s) => {
                  const n = new Set(s);
                  shown.forEach((o) => (e.target.checked ? n.add(o.value) : n.delete(o.value)));
                  return n;
                })
              }
            />
            {kw ? `Chọn tất cả kết quả (${shown.length})` : "Chọn tất cả"}
          </label>
          <button type="button" className="font-semibold text-[var(--link)] hover:underline" onClick={() => setSel(new Set())}>
            Bỏ chọn
          </button>
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto px-3 py-1">
        {shown.length === 0 && <p className="py-2 text-xs text-[var(--ink-faint)]">Không có lựa chọn nào.</p>}
        {shown.map((o) => (
          <label key={o.value} className="flex items-start gap-2 py-1 text-[13px] leading-snug cursor-pointer hover:bg-[var(--surface-2)] rounded">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={sel.has(o.value)}
              onChange={(e) =>
                setSel((s) => {
                  const n = new Set(s);
                  if (e.target.checked) n.add(o.value);
                  else n.delete(o.value);
                  return n;
                })
              }
            />
            <span className="min-w-0 break-words">{o.label}</span>
          </label>
        ))}
      </div>
      <Footer
        onClear={() => {
          flt.set(f.def.key, "");
          onClose();
        }}
        onApply={() => apply()}
      />
    </>
  );
}

// ---------- Thanh tren bang: o tim + chip cot dang loc + so dong + nut loc tren dien thoai ----------
export function ExcelToolbar({
  flt,
  cols,
  placeholder,
  total,
  totalAll,
  unit = "dòng",
  extra,
  defs,
  colButtons,
}: {
  flt: ListFilters;
  cols: FilterCol[];
  placeholder: string;
  total: number;
  totalAll?: number | null;
  unit?: string;
  extra?: ReactNode;
  // 16/11/2026: bo loc nhanh (luoi o chon) - AN mac dinh, nut "⚙ Bộ lọc nhanh" mo ra (trung voi loc tieu de cot).
  defs?: FilterDef[];
  // Hien hang nut loc theo cot ca tren may tinh (che do xem nhom Theo KTV / Theo linh kien khong co tieu de cot).
  colButtons?: boolean;
}) {
  const isMobile = useIsMobile();
  const [quickOpen, setQuickOpen] = useState(false);
  const optsOf = useOptsOf(flt);
  const activeCols = cols.filter((c) => c.filter && isActive(flt, c.filter));
  const sortCol = cols.find((c) => c.sortKey && c.sortKey === flt.sort);
  const anyActive = activeCols.length > 0 || !!flt.q;
  const [mobileCol, setMobileCol] = useState<{ col: FilterCol; el: HTMLElement } | null>(null);
  return (
    <div className="mb-2 space-y-1.5">
      <div className="flex flex-col md:flex-row md:items-center gap-1.5">
        <div className="flex-1 min-w-0">
          <Input type="search" value={flt.qInput} onChange={(e) => flt.setQ(e.target.value)} placeholder={`🔍 ${placeholder}`} />
        </div>
        {extra}
        {defs && defs.length > 0 && (
          <button
            type="button"
            onClick={() => setQuickOpen((v) => !v)}
            className="shrink-0 self-start md:self-auto rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-body)] hover:bg-[var(--surface-2)]"
            title="Bộ lọc dạng ô chọn (trùng với lọc trên tiêu đề cột)"
          >
            ⚙ Bộ lọc nhanh {quickOpen ? "▴" : "▾"}
          </button>
        )}
        <span className="shrink-0 text-xs font-semibold text-[var(--ink-soft)]" title="Số dòng sau khi lọc / tổng số dòng">
          {anyActive && totalAll != null && totalAll !== total ? (
            <>
              <span className="text-[var(--accent-ink)]">{total}</span> / {totalAll} {unit}
            </>
          ) : (
            <>
              {total} {unit}
            </>
          )}
        </span>
      </div>
      {quickOpen && defs && (
        <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5">
          <QuickFilterGrid f={flt} defs={defs} />
        </div>
      )}
      {(isMobile || colButtons) && (
        // Dien thoai / che do nhom: khong co tieu de cot -> nut loc / sap xep theo cot.
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
          {cols
            .filter((c) => c.filter || c.sortKey)
            .map((c) => {
              const on = (c.filter && isActive(flt, c.filter)) || (c.sortKey && flt.sort === c.sortKey);
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={(e) => setMobileCol({ col: c, el: e.currentTarget })}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${on ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]" : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-body)]"}`}
                >
                  {c.label}
                  {c.sortKey && flt.sort === c.sortKey ? (flt.dir === "asc" ? " ▲" : " ▼") : ""} ▾
                </button>
              );
            })}
        </div>
      )}
      {mobileCol && (
        <FilterPopover
          anchor={mobileCol.el}
          col={mobileCol.col}
          flt={flt}
          onClose={() => setMobileCol(null)}
        />
      )}
      {(activeCols.length > 0 || sortCol) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeCols.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-ink)]">
              <FunnelIcon /> {c.label}: <span className="font-normal max-w-[220px] truncate">{summary(flt, c.filter!, optsOf)}</span>
              <button type="button" onClick={() => clearCol(flt, c.filter!)} className="ml-0.5 hover:text-[var(--ink)]" aria-label={`Bỏ lọc ${c.label}`}>
                ✕
              </button>
            </span>
          ))}
          {sortCol && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--blue-100)] px-2.5 py-0.5 text-xs font-semibold text-[var(--blue-700)]">
              Sắp xếp: {sortCol.label} {flt.dir === "asc" ? "▲ tăng" : "▼ giảm"}
              <button type="button" onClick={() => flt.setSort("", "")} className="ml-0.5" aria-label="Bỏ sắp xếp">
                ✕
              </button>
            </span>
          )}
          {anyActive && (
            <button type="button" onClick={flt.clear} className="text-xs font-semibold text-[var(--link)] hover:underline">
              ✕ Xoá tất cả lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}
