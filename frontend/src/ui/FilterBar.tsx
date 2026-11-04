import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Input, Select } from "./primitives";
import { SearchableSelect } from "./SearchableSelect";
import { displayName, useUserNames } from "../hooks/useUserNames";
import { useLkName } from "../hooks/useLinhKien";
import { useIsMobile } from "../hooks/useIsMobile";
import { useRoute } from "../router/Router";
import { setUrlKtv } from "../layout/KtvMenu";

// Thanh loc dung chung cho moi bang danh sach (21/10/2026: "tất cả các giao diện có table danh sách đơn,
// phiếu... đều phải bổ sung các filter phù hợp ... + công cụ tìm kiếm. lựa chọn filter nhiều hơn 5 lựa chọn
// phải có tìm kiếm theo danh sách"). Moi o loc > 5 lua chon tu chuyen sang SearchableSelect (go de tim).
// Lua chon lay tu chinh du lieu dang co cua danh sach (backend: ?loc_only=1 -> {loc: {key: string[]}}).

export const NONE = "__none__";

export type LocKind = "person" | "lk" | "map" | "text";
export interface FilterDef {
  key: string; // ten tham so query gui len backend
  label: string;
  kind?: LocKind; // cach hien nhan cho gia tri lay tu backend
  labels?: Record<string, string>; // kind = "map"
  static?: { value: string; label: string }[]; // lua chon co dinh (khong lay tu backend)
  noneLabel?: string; // nhan cho gia tri rong (mac dinh "(Chưa có)")
  fmt?: (v: string) => string; // nhan tuy bien (uu tien hon kind)
}

// 31/10/2026 ("bổ sung thêm các công cụ filter theo các dạng trạng thái, cảnh báo, thời gian, linh kiện A, B,
// C..."): cac o loc dung chung cho moi danh sach. Backend: lib/filters.ts slaFilter / timeFilter.
export const CANH_BAO_DEF: FilterDef = {
  key: "canh_bao",
  label: "Cảnh báo",
  static: [
    { value: "trong_han", label: "🟢 Trong hạn 24h" },
    { value: "qua_han", label: "🟡 Quá hạn 24h" },
    { value: "qua_han_24_72", label: "🟠 Quá 24–72h" },
    { value: "nguy_hiem", label: "🔴 Quá 72h (nguy hiểm)" },
  ],
};
export const KHOANG_DEF: FilterDef = {
  key: "khoang",
  label: "Thời gian tạo",
  static: [
    { value: "hom_nay", label: "Hôm nay" },
    { value: "7n", label: "7 ngày qua" },
    { value: "30n", label: "30 ngày qua" },
    { value: "thang_nay", label: "Tháng này" },
    { value: "thang_truoc", label: "Tháng trước" },
    { value: "cu_hon_30n", label: "Cũ hơn 30 ngày" },
    { value: "tu::", label: "📅 Chọn khoảng ngày…" },
  ],
};

// 01/11/2026 ("cho chọn khoảng thời gian filter"): khoang tu chon ma hoa "tu:<tu ngay>:<den ngay>" trong chinh
// gia tri o loc (backend lib/filters.ts timeFilter). Chon "Chọn khoảng ngày…" -> hien 2 o ngay.
export function KhoangSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const custom = value.startsWith("tu:");
  const [, tu = "", den = ""] = custom ? value.split(":") : [];
  const sel = custom ? "tu::" : value;
  const opts = (KHOANG_DEF.static || []).map((o) => (o.value === "tu::" && custom && (tu || den) ? { ...o, label: `📅 ${tu ? fmtNgay(tu) : "…"} → ${den ? fmtNgay(den) : "…"}` } : o));
  return (
    <div className="min-w-0">
      <FilterSelect label={label} value={sel} onChange={(v) => onChange(v === "tu::" ? (custom ? value : "tu::") : v)} options={opts} />
      {custom && (
        <div className="mt-1 flex items-center gap-1">
          <input type="date" aria-label="Từ ngày" value={tu} max={den || undefined} onChange={(e) => onChange(`tu:${e.target.value}:${den}`)} className="min-w-0 flex-1 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-1.5 py-1 text-xs" />
          <span className="text-xs text-[var(--ink-soft)]">→</span>
          <input type="date" aria-label="Đến ngày" value={den} min={tu || undefined} onChange={(e) => onChange(`tu:${tu}:${e.target.value}`)} className="min-w-0 flex-1 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-1.5 py-1 text-xs" />
        </div>
      )}
    </div>
  );
}
function fmtNgay(d: string): string {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y.slice(2)}`;
}
// Linh kien A = KTV chon, B = thuc te gui ve (Admin xac nhan), C = doi moi (lk = C, khong co thi B, A).
export const LK_A_DEF: FilterDef = { key: "lk_a", label: "LK KTV chọn (A)", kind: "lk" };
export const LK_B_DEF: FilterDef = { key: "lk_b", label: "LK gửi về (B)", kind: "lk" };
export const LK_C_DEF: FilterDef = { key: "lk", label: "LK đổi mới (C)", kind: "lk" };
export const LK_ABC_DEFS: FilterDef[] = [LK_A_DEF, LK_B_DEF, LK_C_DEF];

export interface ListFilters {
  q: string;
  setQ: (v: string) => void;
  qInput: string;
  values: Record<string, string>;
  set: (k: string, v: string) => void;
  clear: () => void;
  active: number;
  query: string; // "a=b&c=d" (khong co dau ? dau)
  loc: Record<string, string[]>;
  reloadLoc: () => void;
}

// locPath: duong dan API danh sach (co the kem query co dinh, vd "/phieu-tra?trang_thai=nhap").
export function useListFilters(locPath: string | null, keys: string[]): ListFilters {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  // 04/11/2026: o loc "ktv" dong bo voi tham so ?ktv= tren URL (menu 2 danh sach KTV ben canh sidebar).
  const urlKtv = useRoute().query.get("ktv") || "";
  const hasKtv = keys.includes("ktv");
  const [values, setValues] = useState<Record<string, string>>(() => (hasKtv && urlKtv ? { ktv: urlKtv } : ({} as Record<string, string>)));
  const [loc, setLoc] = useState<Record<string, string[]>>({});
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (hasKtv) setValues((s) => (s.ktv === urlKtv || (!s.ktv && !urlKtv) ? s : { ...s, ktv: urlKtv }));
  }, [urlKtv, hasKtv]);
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  useEffect(() => {
    if (!locPath) return;
    const sep = locPath.includes("?") ? "&" : "?";
    let alive = true;
    api
      .get<{ loc?: Record<string, string[]> }>(`${locPath}${sep}loc_only=1&limit=1`)
      .then((r) => alive && setLoc(r.loc || {}))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [locPath, tick]);
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    for (const k of keys) if (values[k]) p.set(k, values[k]);
    return p.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, values, keys.join(",")]);
  return {
    q,
    setQ: setQInput,
    qInput,
    values,
    set: (k, v) => {
      setValues((s) => ({ ...s, [k]: v }));
      if (k === "ktv" && hasKtv) setUrlKtv(v);
    },
    clear: () => {
      setValues({});
      if (hasKtv && urlKtv) setUrlKtv("");
      setQInput("");
      setQ("");
    },
    active: Object.values(values).filter(Boolean).length + (q ? 1 : 0),
    query,
    loc,
    reloadLoc: () => setTick((t) => t + 1),
  };
}

// Ghep path + query loc.
export function withQuery(path: string, query: string): string {
  if (!query) return path;
  return path + (path.includes("?") ? "&" : "?") + query;
}

export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string; hint?: string }[] }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:min-w-0">
      <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)] whitespace-nowrap">{label}</span>
      {options.length > 5 ? (
        <SearchableSelect options={options} value={value} onChange={onChange} placeholder="Tất cả" />
      ) : (
        <Select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Tất cả</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

// collapsible (30/10/2026, UX mobile KTV): o loc thu vao 1 nut "Lọc" canh o tim (KTV it don, bo loc kieu
// may tinh chiem nua man hinh dau). Dang co loc thi tu mo de thay dang loc gi.
export function FilterBar({ f, defs, placeholder, extra, collapsible }: { f: ListFilters; defs: FilterDef[]; placeholder: string; extra?: React.ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(false);
  // 31/10/2026: tren dien thoai moi thanh loc deu thu vao nut "Lọc" (o loc chiem nua man hinh dau).
  const isMobile = useIsMobile();
  collapsible = collapsible || isMobile;
  useUserNames();
  const { nameOf } = useLkName();
  const optsOf = (d: FilterDef) => {
    if (d.static) return d.static;
    const cur = f.values[d.key];
    // Gia tri dang loc (vd ?ktv= tu menu KTV) khong co trong du lieu -> van hien dung ten thay vi "Tất cả".
    const raw = cur && cur !== NONE && !(f.loc[d.key] || []).includes(cur) ? [...(f.loc[d.key] || []), cur] : f.loc[d.key] || [];
    return raw
      .map((v) => {
        if (!v) return { value: NONE, label: d.noneLabel || "(Chưa có)" };
        const label = d.fmt ? d.fmt(v) : d.kind === "person" ? displayName(v) : d.kind === "lk" ? nameOf(v) : d.kind === "map" ? d.labels?.[v] || v : v;
        return { value: v, label }; // 03/11/2026: chi hien ten (van tim duoc theo email vi value nam trong chi muc tim)
      })
      .sort((a, b) => (a.value === NONE ? 1 : b.value === NONE ? -1 : a.label.localeCompare(b.label, "vi")));
  };
  const visible = defs.filter((d) => d.static || (f.loc[d.key] || []).length > 0 || f.values[d.key]);
  return (
    <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
      <div className="flex flex-col md:flex-row md:items-center gap-1.5">
        <div className="flex-1 min-w-0">
          <Input type="search" value={f.qInput} onChange={(e) => f.setQ(e.target.value)} placeholder={`🔍 ${placeholder}`} />
        </div>
        {extra}
        {collapsible && visible.length > 0 && (
          <button type="button" className="shrink-0 self-start md:self-auto rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-body)]" onClick={() => setOpen((v) => !v)}>
            ⚙ Lọc{f.active > 0 ? ` (${f.active})` : ""} {open ? "▴" : "▾"}
          </button>
        )}
        {f.active > 0 && (
          <button type="button" className="shrink-0 text-xs font-semibold text-[var(--link)] hover:underline" onClick={f.clear}>
            ✕ Xoá lọc ({f.active})
          </button>
        )}
      </div>
      {visible.length > 0 && (!collapsible || open) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-1.5 mt-1.5">
          {visible.map((d) => (
            d.key === "khoang" ? (
              <KhoangSelect key={d.key} label={d.label} value={f.values[d.key] || ""} onChange={(v) => f.set(d.key, v)} />
            ) : (
              <FilterSelect key={d.key} label={d.label} value={f.values[d.key] || ""} onChange={(v) => f.set(d.key, v)} options={optsOf(d)} />
            )
          ))}
        </div>
      )}
    </div>
  );
}
