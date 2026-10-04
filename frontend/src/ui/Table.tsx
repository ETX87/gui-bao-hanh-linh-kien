import type { ReactNode } from "react";
import { EmptyState } from "./primitives";
import { useIsMobile } from "../hooks/useIsMobile";

// Bang du lieu dung chung.
// - Desktop (>=768px): 1 dong khong xuong dong (nowrap + cuon ngang), click dong mo chi tiet.
// - Mobile (<768px): moi dong render thanh 1 THE xep doc (cot dau la tieu de, cac cot con lai la
//   cap nhan-gia tri) - Phat hien 6 vong ra soat UX: truoc day chi cuon ngang, tren dien thoai
//   giau 4/6 cot ra ngoai man, KTV/Giam sat tra cuu khong thay SLA/mo ta loi.
// Moi cot co the tu chan click lan len dong bang <StopClick> (dung cho checkbox/nut long trong dong).

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  // hideOnMobileCard: khong hien cap nhan-gia tri nay trong the mobile (vd cot rong toan "—", hoac
  // cot dieu khien khong co header).
  hideOnMobileCard?: boolean;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, emptyText }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; emptyText?: string }) {
  const isMobile = useIsMobile();
  if (rows.length === 0) return <EmptyState text={emptyText || "Không có dữ liệu."} />;

  if (isMobile) {
    const [head, ...rest] = columns;
    const labelled = rest.filter((c) => c.header && !c.hideOnMobileCard);
    // Cot khong co header = cot dieu khien (nut hanh dong tren dong) - render o cuoi the, khong nhan.
    const actionCols = rest.filter((c) => !c.header && !c.hideOnMobileCard);
    return (
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-card p-3.5 ${onRowClick ? "cursor-pointer active:bg-[var(--accent-soft)]" : ""}`}
          >
            {head && <div className="font-semibold text-[var(--ink)] text-[15px] mb-2">{head.render(row)}</div>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              {labelled.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-[var(--ink-soft)] text-xs font-semibold pt-0.5">{c.header}</dt>
                  <dd className="text-[var(--ink-body)] min-w-0 break-words">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
            {actionCols.some((c) => c.render(row)) && (
              <div className="flex flex-wrap gap-2 mt-2.5 pt-2.5 border-t border-[var(--line)]">
                {actionCols.map((c) => (
                  <span key={c.key}>{c.render(row)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    // Phat hien 11 vong ra soat UX: <table class="w-full"> don toan bo khoang du cho cot CUOI -> SLA
    // cach "Mo ta loi" ~600px trong, kho ra 1 dong. Nay them 1 cot dem cuoi (w-full) hut het khoang
    // du - cac cot that xit nhau canh trai, ma header/vien van kin ca chieu rong the.
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] scrollbar-thin">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-[var(--surface-2)] border-b border-[var(--line)]">
            {columns.map((c) => (
              <th key={c.key} className={`text-left font-semibold text-[var(--ink-soft)] px-3 py-2.5 text-xs ${c.className || ""}`}>
                {c.header}
              </th>
            ))}
            <th className="w-full" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-[var(--line)] last:border-0 ${onRowClick ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""} transition-colors`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2 align-middle text-[var(--ink-body)] ${c.className || ""}`}>
                  {c.render(row)}
                </td>
              ))}
              <td aria-hidden="true" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Boc control (checkbox/nut) trong 1 o de KHONG kich hoat onRowClick cua dong cha.
export function StopClick({ children }: { children: ReactNode }) {
  return <span onClick={(e) => e.stopPropagation()}>{children}</span>;
}
