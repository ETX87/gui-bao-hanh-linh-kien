import { Btn } from "./primitives";

// Thanh phan trang dung chung cho moi bang du lieu - port dung mau da lam cho LinhKienScreen (QA
// vong 3, 04/09/2026), nay ap dung rong khap toan he thong. Tu an neu chi co 1 trang.
export function Pagination({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (p: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-sm lg:text-xs text-[var(--ink-soft)]">
      <span>
        Trang {page + 1}/{pageCount} — {total} dòng
      </span>
      <div className="flex items-center gap-1.5">
        <Btn onClick={() => onChange(Math.max(0, page - 1))} disabled={page <= 0} className="!py-1 !px-2.5">
          ‹ Trước
        </Btn>
        <Btn onClick={() => onChange(Math.min(pageCount - 1, page + 1))} disabled={page >= pageCount - 1} className="!py-1 !px-2.5">
          Sau ›
        </Btn>
      </div>
    </div>
  );
}
