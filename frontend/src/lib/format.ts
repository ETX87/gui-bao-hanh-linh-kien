// Tien ich dinh dang dung chung - SLA 24h (port dung isOverdue()/slaBadge() cua prototype, 3 muc
// khan cap da chot: <=24h xanh la, 24-72h vang, >72h do dac + icon).
//
// MUI GIO (sua 08/09/2026, Phat hien 1 vong ra soat UX): moi cot thoi gian trong D1 duoc backend ghi
// bang nowVN() = gio VN dang "YYYY-MM-DD HH:MM:SS" KHONG co hau to Z. Ban cu o day them "Z" (ep parse
// nhu UTC) roi so voi Date.now() (UTC that) => lech dung -7h o MOI badge SLA: don vua thao tac hien
// so AM ("-7h"), don qua han that 40h hien "33h" mau nhe, va cong SLA frontend/backend bat dong trong
// khung 24-31h (form be tac). Sua: ep parse chuoi nhu UTC (giu "Z") NHUNG cong 7h vao "now" - KHOP
// dung backend/src/lib/sla.ts (Worker local = UTC nen ben do khong can ep, o trinh duyet phai ep de
// khong phu thuoc mui gio may nguoi dung).
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Chuyen chuoi "YYYY-MM-DD HH:MM:SS[.sss][Z]" (gio VN) thanh mot instant epoch on dinh, doc lap mui
// gio trinh duyet: bo mọi hau to Z roi re-add "Z" (ep hieu cac chu so nhu gio UTC).
function parseVnWallClock(iso: string): number {
  return new Date(iso.replace(" ", "T").replace(/Z$/i, "") + "Z").getTime();
}

// QUY TAC (chot 04/10/2026, "24h liên tục bỏ qua chủ nhật"): dong ho lien tuc nhung TRU moi khoang roi
// vao Chu nhat (00:00-24:00 gio VN). Thuat toan GIONG HET backend/src/lib/sla.ts - sua 1 ben phai sua 2.
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
function sundayOverlapMs(a: number, b: number): number {
  if (b <= a) return 0;
  let total = 0;
  let d = Math.floor(a / DAY) * DAY;
  const dow = new Date(d).getUTCDay();
  if (dow !== 0) d += (7 - dow) * DAY;
  else if (d < a) {
    total += Math.min(b, d + DAY) - a;
    d += 7 * DAY;
  }
  for (; d < b; d += 7 * DAY) total += Math.min(b, d + DAY) - Math.max(a, d);
  return total;
}

export function hoursSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = parseVnWallClock(iso);
  if (Number.isNaN(then)) return 0;
  const now = Date.now() + VN_OFFSET_MS;
  if (now <= then) return (now - then) / HOUR;
  return (now - then - sundayOverlapMs(then, now)) / HOUR;
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
  const d = new Date(parseVnWallClock(iso));
  if (Number.isNaN(d.getTime())) return iso;
  // timeZone:"UTC" - hien nguyen cac chu so gio VN da luu, khong bi trinh duyet quy doi +7h nua
  // (may nguoi dung o VN truoc day thay moi moc thoi gian lech +7h).
  return d.toLocaleString("vi-VN", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
