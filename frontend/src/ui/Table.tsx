import type { ReactNode } from "react";
import { EmptyState } from "./primitives";

// Bang du lieu dung chung - luon 1 dong khong xuong dong (nowrap + cuon ngang, port dung quyet dinh
// "bang luon 1 dong" da chot 02/09/2026), click vao dong de mo chi tiet (port dung "click-de-mo" da
// chot 01/09/2026) - moi cot co the tu chan click lan len dong bang stopPropagation() (dung cho
// checkbox/nut hanh dong long trong dong).

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, emptyText }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; emptyText?: string }) {
  if (rows.length === 0) return <EmptyState text={emptyText || "Không có dữ liệu."} />;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] scrollbar-thin">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-[var(--surface-100)] border-b border-[var(--line)]">
            {columns.map((c) => (
              <th key={c.key} className={`text-left font-semibold text-[var(--ink-600)] px-3 py-2.5 text-xs uppercase tracking-wide ${c.className || ""}`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-[var(--line)] last:border-0 ${onRowClick ? "cursor-pointer hover:bg-[var(--ocean-100)]/40" : ""} transition-colors`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 align-middle ${c.className || ""}`}>
                  {c.render(row)}
                </td>
              ))}
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
