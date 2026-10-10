import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// Bo primitive dung chung - theo DESIGN_SYSTEM.md §6 (port tu App Khieu nai, gam xanh la icon app).
// Quy tac "to tren mobile, gon tren desktop" (§3.2): class to la mac dinh, `lg:` tra ve kich thuoc gon.
// Giu nguyen API props cu (Card/Btn/Badge/StatCard...) de khong phai sua hang loat noi goi.

export function Card({ children, className = "", title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          {title && <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">{title}</h3>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-[var(--accent)] text-white shadow-brand hover:bg-[var(--accent-dark)] disabled:shadow-none",
  secondary:
    "bg-[var(--surface)] text-[var(--ink-body)] border border-[var(--line-strong)] hover:border-[var(--brand-300)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]",
  danger: "bg-[var(--red-600)] text-white hover:bg-[var(--red-700)]",
  // success giu lai cho tuong thich nguoc - cung tong xanh la thuong hieu (nut "xac nhan/hoan tat").
  success: "bg-[var(--accent)] text-white shadow-brand hover:bg-[var(--accent-dark)] disabled:shadow-none",
  ghost: "bg-transparent text-[var(--ink-body)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]",
};
type BtnSize = "sm" | "md" | "touch";
const BTN_SIZES: Record<BtnSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  touch: "px-5 py-3 text-base lg:px-3.5 lg:py-2 lg:text-sm",
};
export function Btn({ variant = "secondary", size = "md", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button
      {...rest}
      className={`focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}
    />
  );
}

type BadgeTone = "gray" | "green" | "blue" | "red" | "red-solid" | "violet" | "orange" | "amber" | "brand";
const BADGE_TONES: Record<BadgeTone, string> = {
  gray: "bg-[var(--slate-100)] text-[var(--slate-500)] ring-[var(--slate-200)]",
  green: "bg-[var(--green-50)] text-[var(--green-700)] ring-[var(--green-200)]",
  blue: "bg-[var(--blue-50)] text-[var(--blue-700)] ring-[var(--blue-200)]",
  red: "bg-[var(--red-50)] text-[var(--red-700)] ring-[var(--red-200)]",
  "red-solid": "bg-[var(--red-600)] text-white ring-[var(--red-600)]",
  violet: "bg-[var(--violet-50)] text-[var(--violet-700)] ring-[var(--violet-200)]",
  orange: "bg-[var(--orange-50)] text-[var(--orange-700)] ring-[var(--orange-200)]",
  amber: "bg-[var(--amber-50)] text-[var(--amber-700)] ring-[var(--amber-200)]",
  brand: "bg-[var(--brand-50)] text-[var(--brand-700)] ring-[var(--brand-200)]",
};
export function Badge({ tone = "gray", dot, children, className = "" }: { tone?: BadgeTone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${BADGE_TONES[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Label({ required, children, ...rest }: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label {...rest} className="block text-xs font-semibold text-[var(--ink-body)] mb-1">
      {children}
      {required && <span className="text-[var(--red-600)] font-extrabold ml-0.5">*</span>}
    </label>
  );
}

// O nhap (§6.2): nen lom field-bg + vien field-border RO; focus vien accent + nen trang + glow.
// Mobile cao ~44px, chu 16px (tranh iOS tu zoom khi focus); desktop (lg:) tra ve kich thuoc gon.
export const FIELD_CLASS =
  "w-full rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-base text-[var(--ink)] lg:px-2.5 lg:py-1.5 lg:text-sm " +
  "placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[rgba(21,128,63,0.15)] " +
  "disabled:cursor-default disabled:border-[var(--line)] disabled:bg-[var(--surface-2)] disabled:text-[var(--ink-body)]";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_CLASS} ${props.className || ""}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD_CLASS} ${props.className || ""}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD_CLASS} ${props.className || ""}`} />;
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label required={required}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs leading-tight text-[var(--ink-faint)] lg:text-[11px]">{hint}</p>}
    </div>
  );
}

export function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--ink-soft)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--ink)]">{value ?? "—"}</p>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-wide border-b-2 border-[var(--brand-100)] pb-1.5 mb-1">{children}</p>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-10 text-sm text-[var(--ink-faint)]">{text}</div>;
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// The KPI (§6.4): nen gradient pastel theo tone + icon tron + so 28px dam. Giu nguyen tac "mo khi = 0"
// (so 0 -> tone slate, khong bao dong gia) da chot xuyen suot du an.
const KPI_TONES: Record<string, { card: string; icon: string; value: string }> = {
  brand: { card: "from-[var(--brand-50)] to-[var(--brand-100)]", icon: "bg-[var(--brand-600)]", value: "text-[var(--brand-800)]" },
  blue: { card: "from-[#EEF5FE] to-[#DCEBFD]", icon: "bg-[var(--blue-500)]", value: "text-[var(--blue-800)]" },
  amber: { card: "from-[#FFF9E7] to-[#FEF0C7]", icon: "bg-[var(--amber-500)]", value: "text-[var(--amber-800)]" },
  green: { card: "from-[#EAFBF1] to-[#D4F5E2]", icon: "bg-[var(--green-500)]", value: "text-[var(--green-700)]" },
  red: { card: "from-[#FEF1F1] to-[#FDE0E0]", icon: "bg-[var(--red-500)]", value: "text-[var(--red-700)]" },
  violet: { card: "from-[var(--violet-50)] to-[var(--violet-100)]", icon: "bg-[var(--violet-500)]", value: "text-[var(--violet-700)]" },
  orange: { card: "from-[var(--orange-50)] to-[var(--orange-100)]", icon: "bg-[var(--orange-500)]", value: "text-[var(--orange-700)]" },
  gray: { card: "from-[#F4F5F8] to-[#E8EAF0]", icon: "bg-[var(--slate-500)]", value: "text-[var(--slate-700)]" },
};
export function StatCard({ label, value, tone = "gray", icon, onClick }: { label: string; value: number; tone?: BadgeTone; icon?: ReactNode; onClick?: () => void }) {
  const active = value > 0;
  const key = !active ? "gray" : tone === "red-solid" ? "red" : tone;
  const t = KPI_TONES[key] || KPI_TONES.gray;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`focus-ring relative h-full w-full overflow-hidden rounded-[14px] border border-white/70 bg-gradient-to-br p-4 md:p-3 text-left shadow-card ${t.card} ${
        onClick ? "transition hover:-translate-y-0.5 hover:shadow-pop" : "cursor-default"
      } ${active ? "" : "opacity-75"}`}
    >
      {icon && (
        <>
          <span className={`flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full text-white text-lg md:text-base shadow-[0_2px_8px_rgba(0,0,0,0.15)] ${t.icon}`}>{icon}</span>
          <span className={`pointer-events-none absolute -bottom-2 -right-1 text-[48px] leading-none opacity-[0.12] grayscale`}>{icon}</span>
        </>
      )}
      <p className={`${icon ? "mt-3 md:mt-2" : ""} text-sm lg:text-xs font-semibold leading-tight text-[var(--ink-body)]`}>{label}</p>
      <p className={`mt-1 text-[28px] md:text-[24px] font-extrabold leading-none ${t.value}`}>{value}</p>
    </button>
  );
}
