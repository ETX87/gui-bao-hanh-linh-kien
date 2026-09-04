// Tien ich dinh dang dung chung - SLA 24h (port dung isOverdue()/slaBadge() cua prototype, 3 muc
// khan cap da chot: <=24h xanh la, 24-72h vang, >72h do dac + icon).

export function hoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z")).getTime();
  if (Number.isNaN(then)) return 0;
  return (Date.now() - then) / 3_600_000;
}

export function isOverdue(iso: string | null | undefined): boolean {
  return hoursSince(iso) > 24;
}

export type SlaLevel = "ok" | "warn" | "critical";

export function slaLevel(iso: string | null | undefined): SlaLevel {
  const h = hoursSince(iso);
  if (h > 72) return "critical";
  if (h > 24) return "warn";
  return "ok";
}

export function fmtHours(iso: string | null | undefined): string {
  const h = Math.floor(hoursSince(iso));
  return `${h}h`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.slice(0, 10).split("-").reverse().join("/");
}

// Doc anh -> base64 data URL (KHONG dung R2 - quyet dinh da chot cho he nay, xem CLAUDE.md).
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
