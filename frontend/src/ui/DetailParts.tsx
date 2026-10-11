import { useState, type ReactNode } from "react";

// Khoi dung chung cho moi "UI chi tiet" (don bao hanh / phieu gui / phieu tra) - thiet ke lai 10/10/2026
// (phan hoi "UI chi tiet ... dang trong va thua qua nhieu vung", roi "xu ly lai toan bo cac giao dien UI
// chi tiet"): modal cao theo noi dung (max-w-6xl), 2 cot `DetailGrid` (trai thong tin, phai nhat ky /
// trao doi), khoi tom tat nen xam nhat, cac khoi phu vien mong, nhan/gia tri gon chi hien khi co du lieu.

export const DETAIL_MAX_W = "max-w-6xl";

export function DetailGrid({ children, side }: { children: ReactNode; side: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3 min-w-0">{children}</div>
      <aside className="min-w-0 space-y-4 lg:border-l lg:border-[var(--line)] lg:pl-4">{side}</aside>
    </div>
  );
}

export function SummaryBox({ children }: { children: ReactNode }) {
  return <section className="rounded-xl bg-[var(--surface-2)] px-3.5 py-3 space-y-2">{children}</section>;
}

export function Section({ title, right, tone = "accent", children }: { title: ReactNode; right?: ReactNode; tone?: "accent" | "red"; children: ReactNode }) {
  return (
    <section className={`rounded-xl border px-3 py-2.5 ${tone === "red" ? "border-[var(--red-100)]" : "border-[var(--line)]"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <SectionTitle tone={tone}>{title}</SectionTitle>
        {right && <div className="ml-auto flex items-center gap-2 shrink-0">{right}</div>}
      </div>
      {children}
    </section>
  );
}

export function SectionTitle({ children, tone = "accent", className = "" }: { children: ReactNode; tone?: "accent" | "red"; className?: string }) {
  return <p className={`text-xs font-bold uppercase tracking-wide ${className} ${tone === "red" ? "text-[var(--red-700)]" : "text-[var(--accent-ink)]"}`}>{children}</p>;
}

export function KvGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">{children}</dl>;
}

export function Kv({ k, v, wide }: { k: string; v: ReactNode; wide?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-full" : ""}`}>
      <dt className="text-[11px] text-[var(--ink-faint)]">{k}</dt>
      <dd className="text-[13px] text-[var(--ink)] break-words">{v ?? "—"}</dd>
    </div>
  );
}

export function Chip({ icon, children, title }: { icon: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex max-w-full items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs text-[var(--ink-body)] ring-1 ring-[var(--line)]">
      <span>{icon}</span>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Banner({ tone, children }: { tone: "red" | "amber" | "blue"; children: ReactNode }) {
  const cls = tone === "red" ? "bg-[var(--red-100)] text-[var(--red-700)]" : tone === "amber" ? "bg-[var(--amber-100)] text-[var(--amber-800)]" : "bg-[var(--blue-100)] text-[var(--blue-700)]";
  return <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${cls}`}>{children}</div>;
}

export function Thumbs({ urls }: { urls: { key: string; url: string; title?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((a) => (
        <a key={a.key} href={a.url} target="_blank" rel="noreferrer">
          <img src={a.url} title={a.title} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)] hover:opacity-85" />
        </a>
      ))}
    </div>
  );
}

// Nut sao chep nho (11/10/2026): ma don / serial / ma case hay phai chep sang Zalo, Odoo.
export function CopyBtn({ text, title = "Sao chép" }: { text: string | null | undefined; title?: string }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        });
      }}
      className="focus-ring inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] text-[var(--ink-faint)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]"
    >
      {ok ? "✓" : "⧉"}
    </button>
  );
}
