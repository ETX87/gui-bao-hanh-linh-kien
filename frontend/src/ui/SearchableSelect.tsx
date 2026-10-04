import { FIELD_CLASS } from "./primitives";
import { useEffect, useMemo, useRef, useState } from "react";

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
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
        className={`${FIELD_CLASS} text-left truncate pr-8 relative`}
      >
        {selected ? selected.label : <span className="text-[var(--ink-faint)]">{placeholder}</span>}
        <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-soft)]">▼</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-[var(--line)] bg-white shadow-pop overflow-hidden">
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
          <div className="max-h-56 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}
