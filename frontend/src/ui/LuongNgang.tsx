import type { ReactNode } from "react";
import { fmtDate } from "../lib/format";

// 25/11/2026 (v1.161) - Luong quy trinh NGANG dang duong dung chung cho man chi tiet (luat chu he thong 07/11/2026:
// "mặc định chỉ hiện 1 luồng quy trình nằm ngang dạng đường" + nut "▾ Xem chi tiết"). Mau dong bo thanh buoc cua chi tiet don
// (UnitDetailModal): moc da qua = xanh la + ngay gio ngan (+ khoang cach so voi moc truoc), moc dang xu ly = xanh duong noi (do neu `tre`),
// moc chua toi = xam, moc bo qua = gach ngang, moc loi = do. Re chuot vao moc xem nhan day du / gio / nguoi.
export interface MocLuong {
  label: string;
  at?: string | null;
  nguoi?: ReactNode;
  nguoiText?: string | null;
  done: boolean;
  skip?: boolean;
  red?: boolean;
  phu?: string; // dong phu khi la moc dang xu ly / moc loi (vd "KT trả lại")
}

function khoang(a?: string | null, b?: string | null): string | null {
  if (!a || !b) return null;
  const ms = new Date(b.replace(" ", "T")).getTime() - new Date(a.replace(" ", "T")).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const h = ms / 3600000;
  if (h < 1) return `+${Math.max(1, Math.round(h * 60))}p`;
  if (h < 48) return `+${Math.round(h)}h`;
  return `+${Math.round(h / 24)} ngày`;
}

export function LuongNgang({ moc, tre, ketThuc }: { moc: MocLuong[]; tre?: boolean; ketThuc?: boolean }) {
  const cur = ketThuc ? -1 : moc.findIndex((m) => !m.done && !m.skip);
  let truoc: string | null | undefined = null;
  return (
    <ol className="relative flex items-start overflow-x-auto pb-1">
      {moc.map((m, i) => {
        const dangXl = i === cur;
        const kc = m.done && m.at ? khoang(truoc, m.at) : null;
        if (m.done && m.at) truoc = m.at;
        const cham = m.red
          ? "bg-[var(--red-600)] text-white ring-[var(--red-100)]"
          : dangXl
            ? tre
              ? "bg-[var(--red-600)] text-white ring-4 ring-[var(--red-100)]"
              : "bg-[var(--blue-700)] text-white ring-4 ring-[var(--blue-100)]"
            : m.done
              ? "bg-[var(--brand-600)] text-white"
              : m.skip
                ? "bg-white text-[var(--ink-faint)] border border-dashed border-[var(--line)]"
                : "bg-[var(--surface-2)] text-[var(--ink-faint)]";
        const day = m.done || m.red ? "bg-[var(--brand-400)]" : "bg-[var(--line)]";
        const tip = [m.label, m.at ? fmtDate(m.at) : null, m.nguoiText, m.phu].filter(Boolean).join(" · ");
        return (
          <li key={i} className="relative min-w-[92px] flex-1 text-center" title={tip}>
            {i > 0 && <span className={`absolute right-1/2 top-[11px] h-[3px] w-full ${day}`} aria-hidden />}
            <span className={`relative z-[1] mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${cham}`}>
              {m.red ? "!" : m.done ? "✓" : m.skip ? "–" : i + 1}
            </span>
            <p className={`mt-1 truncate px-0.5 text-[11.5px] leading-tight ${dangXl ? "font-bold text-[var(--ink)]" : m.red ? "font-bold text-[var(--red-700)]" : m.skip ? "text-[var(--ink-faint)] line-through" : m.done ? "text-[var(--ink-body)]" : "text-[var(--ink-faint)]"}`}>{m.label}</p>
            <p className={`truncate px-0.5 text-[10.5px] ${dangXl && tre ? "font-bold text-[var(--red-700)]" : m.red ? "text-[var(--red-700)]" : "text-[var(--ink-faint)]"}`}>
              {(dangXl || m.red) && m.phu ? m.phu : m.done ? (m.at ? `${fmtDate(m.at).slice(0, 11)}${kc ? ` · ${kc}` : ""}` : "xong") : m.skip ? "bỏ qua" : dangXl ? "đang chờ" : "chưa tới"}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
