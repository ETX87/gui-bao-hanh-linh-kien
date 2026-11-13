import type { ReactNode } from "react";
import { EmptyState } from "./primitives";
import { useIsMobile } from "../hooks/useIsMobile";
import { ColHeader, type ColFilter } from "./ColumnFilter";
import type { ListFilters } from "./FilterBar";

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
  // 13/11/2026 (bang kieu Excel): bo loc + khoa sap xep tren tieu de cot (can truyen `flt` cho Table).
  filter?: ColFilter;
  sortKey?: string;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, emptyText, flt }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; onRowClick?: (row: T) => void; emptyText?: string; flt?: ListFilters }) {
  const isMobile = useIsMobile();
  // Bang co bo loc tieu de cot: van ve tieu de khi rong (de bo loc / sap xep dang chon con nhin thay).
  if (rows.length === 0 && (isMobile || !flt)) return <EmptyState text={emptyText || "Không có dữ liệu."} />;

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
            className={`min-w-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-card p-3 ${onRowClick ? "cursor-pointer active:bg-[var(--accent-soft)]" : ""}`}
          >
            {head && <div className="font-semibold text-[var(--ink)] text-[15px] mb-1.5">{head.render(row)}</div>}
            {/* 31/10/2026: the gon - 2 cap nhan/gia tri moi hang, bo o trong ("—"); the cu 1 cap/dong dai
                ~320px, 20 dong = 6.600px tren dien thoai. */}
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {labelled.map((c) => {
                const v = c.render(row);
                if (v === null || v === undefined || v === "" || v === "—") return null;
                return (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] font-semibold text-[var(--ink-faint)]">{c.header}</dt>
                    <dd className="text-[13px] leading-snug text-[var(--ink-body)] min-w-0 break-words line-clamp-2">{v}</dd>
                  </div>
                );
              })}
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

  // 09/10/2026 ("Chuyen cac button xu ly cong viec uu tien o ben trai, sau cac ma ID don"): cot nut
  // hanh dong (cot khong header) dua len ngay sau cot dau tien (ma ID) tren bang desktop.
  const [first, ...others] = columns;
  const ordered = first ? [first, ...others.filter((c) => !c.header), ...others.filter((c) => c.header)] : columns;

  return (
    // Phat hien 11 vong ra soat UX: <table class="w-full"> don toan bo khoang du cho cot CUOI -> SLA
    // cach "Mo ta loi" ~600px trong, kho ra 1 dong. Nay them 1 cot dem cuoi (w-full) hut het khoang
    // du - cac cot that xit nhau canh trai, ma header/vien van kin ca chieu rong the.
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] scrollbar-thin">
      <table className="tbl w-full whitespace-nowrap">
        <thead>
          <tr className="bg-[var(--surface-2)] border-b border-[var(--line)]">
            {ordered.map((c) => (
              <th key={c.key} className={`text-left font-semibold text-[var(--ink-soft)] ${c.className || ""}`}>
                {c.header ? <ColHeader col={{ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey }} flt={flt} /> : c === first ? "" : "Thao tác"}
              </th>
            ))}
            <th className="w-full" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={ordered.length + 1} className="!py-6 text-center text-[var(--ink-faint)]">
                {emptyText || "Không có dữ liệu."}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-[var(--line)] last:border-0 ${onRowClick ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""} transition-colors`}
            >
              {ordered.map((c) => (
                <td key={c.key} className={`text-[var(--ink-body)] ${c.className || ""}`}>
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
