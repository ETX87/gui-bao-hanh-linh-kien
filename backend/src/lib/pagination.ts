// Doc ?limit=&offset= tu query string - dung cho MOI route liet ke 1 bang du lieu chinh (khong dung
// cho cac danh sach con bi gioi han san theo 1 entity - log/anh/ghi-chu cua 1 don, von da nho tu
// nhien). Gioi han cung max=100 de chan 1 request rong bat thuong tu client, mac dinh 20 (khop
// PAGE_SIZE da chon o frontend/src/ui/Pagination.tsx) - port dung yeu cau "tat ca du lieu dang bang
// deu phan trang... han che load qua nhieu du lieu ve may nguoi dung" (05/09/2026).
export interface PageParams {
  limit: number;
  offset: number;
}

export function parsePage(c: { req: { query(key: string): string | undefined } }, def = 20, max = 100): PageParams {
  const rawLimit = parseInt(c.req.query("limit") || "", 10);
  const rawOffset = parseInt(c.req.query("offset") || "", 10);
  const limit = Math.min(max, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : def));
  const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);
  return { limit, offset };
}
