import { fmtKb, type UploadProgress } from "../lib/uploadProgress";

// 11/11/2026 - "cho hiện trạng tỷ lệ up ảnh lên server để ktv biết ảnh đang được up lên".
export function uploadPct(p: UploadProgress | null): number {
  if (!p || p.total <= 0) return 0;
  return p.done ? 100 : Math.min(99, Math.floor((p.loaded / p.total) * 100));
}

export function uploadBtnText(busy: boolean, p: UploadProgress | null, idle: string): string {
  if (!busy) return idle;
  if (!p) return "Đang chuẩn bị ảnh…";
  return p.done ? "Đang lưu đơn…" : `Đang tải lên ${uploadPct(p)}%`;
}

export function UploadBar({ p, className = "" }: { p: UploadProgress | null; className?: string }) {
  if (!p) return null;
  const pct = uploadPct(p);
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-xs font-semibold text-[var(--ink-soft)]">
        <span>{p.done ? "Đã tải lên xong — đang lưu đơn…" : `Đang tải lên ${fmtKb(p.loaded)} / ${fmtKb(p.total)}`}</span>
        <span className="text-[var(--accent-ink)]">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className={`h-full rounded-full bg-[var(--accent)] transition-[width] duration-300 ${p.done ? "animate-pulse" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
