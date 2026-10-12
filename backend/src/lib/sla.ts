// Cong SLA 24h - port dung isOverdue()/gateSla() trong prototype-html/index.html. Backend khong co
// khai niem "mo modal" nhu frontend - route chi tra loi 400 REQUIRE_LY_DO_CHAM neu qua han ma
// request khong kem "ly_do_cham", frontend se hien modal hoi lai.
//
// QUY TAC TINH GIO (chot 04/10/2026, nguyen van: "24h liên tục bỏ qua chủ nhật"): dem dong ho lien
// tuc (ca dem, ca thu 7) NHUNG tru tron moi khoang thoi gian roi vao Chu nhat (00:00-24:00 gio VN).
// Frontend (frontend/src/lib/format.ts) dung DUNG thuat toan nay - sua 1 ben phai sua ca 2.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Moi cot thoi gian luu dang "YYYY-MM-DD HH:MM:SS" gio VN (lib/vnTime.ts). Parse nhu UTC => epoch
// "gio VN ma hoa nhu UTC" - getUTCDay() chinh la thu trong tuan theo gio VN.
export function parseVn(dateStr: string): number {
  return new Date(dateStr.replace(" ", "T").replace(/Z$/i, "") + "Z").getTime();
}
function nowVnMs(): number {
  return Date.now() + 7 * HOUR;
}

// Tong so ms nam trong [a, b) roi vao Chu nhat.
function sundayOverlapMs(a: number, b: number): number {
  if (b <= a) return 0;
  let total = 0;
  let d = Math.floor(a / DAY) * DAY;
  const dow = new Date(d).getUTCDay();
  if (dow !== 0) d += (7 - dow) * DAY; // nhay toi Chu nhat dau tien >= ngay cua a
  else if (d < a) {
    total += Math.min(b, d + DAY) - a;
    d += 7 * DAY;
  }
  for (; d < b; d += 7 * DAY) total += Math.min(b, d + DAY) - Math.max(a, d);
  return total;
}

export function slaHoursBetween(fromMs: number, toMs: number): number {
  if (toMs <= fromMs) return (toMs - fromMs) / HOUR;
  return (toMs - fromMs - sundayOverlapMs(fromMs, toMs)) / HOUR;
}

export function hoursSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const then = parseVn(dateStr);
  if (Number.isNaN(then)) return 0;
  return slaHoursBetween(then, nowVnMs());
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  return hoursSince(dateStr) > 24;
}

// Moc cat cho truy van SQL "qua han": tra ve chuoi gio VN "YYYY-MM-DD HH:MM:SS" ma moi ban ghi co
// updated_at < moc nay thi da troi qua > `hours` gio SLA (khong tinh Chu nhat). Lui dan tu "now",
// bo qua phan Chu nhat - SQLite khong tu lam duoc viec nay bang datetime().
export function slaCutoffVn(hours = 24): string {
  let remaining = hours * HOUR;
  let t = nowVnMs();
  while (remaining > 0) {
    const dayStart = Math.floor((t - 1) / DAY) * DAY; // ngay chua thoi diem ngay truoc t
    const isSunday = new Date(dayStart).getUTCDay() === 0;
    const span = t - dayStart;
    if (isSunday) {
      t = dayStart;
      continue;
    }
    if (span >= remaining) {
      t -= remaining;
      remaining = 0;
    } else {
      remaining -= span;
      t = dayStart;
    }
  }
  return new Date(t).toISOString().slice(0, 19).replace("T", " ");
}
