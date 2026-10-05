import { useEffect, useState } from "react";
import { PAGE_SIZE } from "./usePagedApi";

// Phan trang tren may cho cac danh sach DA tai ve san va nho (vai chuc - vai tram dong: Khu vuc, don
// Odoo cho gui cua 1 KTV, nhom "san sang gop phieu tra"...) - van gioi han 20 dong/trang theo yeu cau
// 05/10/2026 "Cac danh sach table dai phai phan trang, toi da 20 dong/trang". Danh sach co the lon
// that thi dung usePagedApi (phan trang server).
export function useClientPage<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);
  const p = Math.min(page, pageCount - 1);
  return { pageItems: items.slice(p * pageSize, (p + 1) * pageSize), page: p, pageCount, total: items.length, setPage };
}
