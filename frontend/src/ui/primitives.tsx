import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Cac primitive dung chung toan he thong - port dung nguyen tac visual hierarchy da chot qua nhieu
// vong CLAUDE.md: vien mau xanh cho o nhap duoc, nhan nhom truong doc duoc ro (khong dung .fine mo),
// dau * bat buoc dam, badge tong nhat + so 0 lam mo (khong "bao dong gia").

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-sm ${className}`}>{children}</div>;
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-[var(--ocean-800)] text-white hover:bg-[var(--ocean-900)]",
  secondary: "bg-white text-[var(--ink-700)] border border-[var(--line)] hover:bg-[var(--surface-100)]",
  danger: "bg-[var(--coral-600)] text-white hover:bg-[var(--coral-700)]",
  success: "bg-[var(--teal-600)] text-white hover:bg-[var(--teal-700)]",
  ghost: "bg-transparent text-[var(--ink-600)] hover:bg-[var(--surface-100)]",
};
export function Btn({ variant = "secondary", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...rest}
      className={`focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${BTN_VARIANTS[variant]} ${className}`}
    />
  );
}

type BadgeTone = "gray" | "green" | "blue" | "red" | "red-solid" | "violet" | "orange";
const BADGE_TONES: Record<BadgeTone, string> = {
  gray: "bg-[var(--surface-100)] text-[var(--ink-600)]",
  green: "bg-[var(--teal-100)] text-[var(--teal-700)]",
  blue: "bg-[var(--amber-100)] text-[var(--amber-700)]",
  red: "bg-[var(--coral-100)] text-[var(--coral-700)]",
  "red-solid": "bg-[var(--coral-600)] text-white",
  violet: "bg-[var(--violet-100)] text-[var(--violet-700)]",
  orange: "bg-[var(--orange-100)] text-[var(--orange-700)]",
};
export function Badge({ tone = "gray", children, className = "" }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE_TONES[tone]} ${className}`}>{children}</span>;
}

export function Label({ required, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label {...rest} className="block text-xs font-semibold text-[var(--ink-600)] mb-1.5">
      {children}
      {required && <span className="text-[var(--coral-600)] font-extrabold ml-0.5">*</span>}
    </label>
  );
}

const editableInputClass = "w-full rounded-lg border border-[var(--ocean-400)] bg-white px-3 py-2 text-sm text-[var(--ink-900)] focus-ring disabled:bg-[var(--surface-100)] disabled:text-[var(--ink-700)] disabled:border-transparent disabled:cursor-default";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${editableInputClass} ${props.className || ""}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${editableInputClass} ${props.className || ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${editableInputClass} ${props.className || ""}`} />;
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
    </div>
  );
}

export function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--ink-500)] mb-1">{label}</p>
      <p className="text-sm text-[var(--ink-900)]">{value ?? "—"}</p>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide border-b-2 border-[var(--ocean-100)] pb-1.5 mb-1">{children}</p>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-[var(--ink-400)]">{text}</div>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-[var(--ocean-400)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function StatCard({ label, value, tone = "gray", onClick }: { label: string; value: number; tone?: BadgeTone; onClick?: () => void }) {
  const dotTone: Record<BadgeTone, string> = {
    gray: "bg-[var(--ink-400)]",
    green: "bg-[var(--teal-500)]",
    blue: "bg-[var(--amber-500)]",
    red: "bg-[var(--coral-500)]",
    "red-solid": "bg-[var(--coral-600)]",
    violet: "bg-[var(--violet-500)]",
    orange: "bg-[var(--orange-500)]",
  };
  const active = value > 0;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`focus-ring text-left p-4 rounded-xl border transition-colors ${active ? "bg-white border-[var(--line)] hover:border-[var(--ocean-400)]" : "bg-[var(--surface-100)] border-transparent"} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-2 h-2 rounded-full ${active ? dotTone[tone] : "bg-[var(--ink-400)]"} ${!active && "opacity-40"}`} />
        <span className={`text-xs font-medium truncate ${active ? "text-[var(--ink-600)]" : "text-[var(--ink-400)]"}`}>{label}</span>
      </div>
      <p className={`font-display font-extrabold text-2xl ${active ? "text-[var(--ink-900)]" : "text-[var(--ink-400)]"}`}>{value}</p>
    </button>
  );
}
