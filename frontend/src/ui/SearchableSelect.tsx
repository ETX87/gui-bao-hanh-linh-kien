import { FIELD_CLASS } from "./primitives";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// O chon co tim kiem (thay <select> thuong khi danh sach dai, vd linh kien ~400 dong that) - tinh
// nang da ghi nhan la "ton dong thuc can lam" tu vong redesign UI 22/08/2026 (prototype), CHUA tung
// duoc port sang React o Giai doan 4. Khong dung thu vien ngoai - tu viet don gian: input go-de-loc +
// dropdown danh sach, dieu huong ban phim co ban (Len/Xuong/Enter/Escape).

export interface SearchableOption {
  value: string;
  label: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "— Chọn —",
  allowEmpty = true,
}: {
  options: SearchableOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialCharRef = useRef<string>("");
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Danh sach xo xuong render qua portal + position:fixed - neu de "absolute" ben trong modal, vung than
  // modal (overflow-y-auto) cat mat danh sach (loi 05/10/2026: "danh sach KTV hien ra bi an").
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 8;
      const above = r.top - 8;
      const want = 300;
      if (below >= Math.min(want, 200) || below >= above) {
        setPos({ left: r.left, width: r.width, top: r.bottom + 4, maxH: Math.max(140, Math.min(want, below - 4)) });
      } else {
        setPos({ left: r.left, width: r.width, bottom: window.innerHeight - r.top + 4, maxH: Math.max(140, Math.min(want, above - 4)) });
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (open) {
      setQuery(initialCharRef.current);
      initialCharRef.current = "";
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)) : options;
    return list.slice(0, 200); // chan render qua nhieu dong neu danh sach rat dai
  }, [options, query]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Phat hien 10 vong ra soat UX: truoc day phai bam Space/Enter de MO roi moi go duoc - pha luong
  // "tab-nhap-tab". Nay Tab toi o -> go 1 phim bat ky (chu/Enter/mui ten) la o tu mo, gan giong
  // <select> native.
  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (open) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      initialCharRef.current = e.key; // useEffect([open]) se dung lam query ban dau
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={`${FIELD_CLASS} text-left truncate pr-8 relative`}
      >
        {selected ? selected.label : <span className="text-[var(--ink-faint)]">{placeholder}</span>}
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-soft)]">▼</span>
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          className="z-[200] flex flex-col rounded-lg border border-[var(--line)] bg-white shadow-pop overflow-hidden"
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Gõ để tìm…"
            className="w-full px-3 py-2.5 text-base lg:py-2 lg:text-sm border-b border-[var(--line)] bg-[var(--field-bg)] focus:bg-white focus:outline-none"
          />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {allowEmpty && (
              <div
                onClick={() => pick("")}
                className={`px-3 py-2.5 lg:py-2 text-base lg:text-sm cursor-pointer text-[var(--ink-soft)] ${highlight === -1 ? "bg-[var(--accent-soft)]" : ""} hover:bg-[var(--accent-soft)]`}
              >
                {placeholder}
              </div>
            )}
            {filtered.length === 0 && <div className="px-3 py-2 text-sm text-[var(--ink-faint)]">Không có kết quả.</div>}
            {filtered.map((o, i) => (
              <div
                key={o.value}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(o.value)}
                className={`px-3 py-2.5 lg:py-2 text-base lg:text-sm cursor-pointer truncate ${o.value === value ? "font-semibold text-[var(--accent-ink)]" : "text-[var(--ink-body)]"} ${
                  highlight === i ? "bg-[var(--accent-soft)]" : ""
                }`}
              >
                {o.label}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
