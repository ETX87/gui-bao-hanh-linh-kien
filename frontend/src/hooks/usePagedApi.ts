import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

// Trang mac dinh 20 dong/trang - dung CHUNG cho moi bang du lieu trong app (port dung yeu cau "tat ca
// du lieu dang bang deu phan trang... han che load qua nhieu du lieu ve may nguoi dung", 05/09/2026).
export const PAGE_SIZE = 20;

// Goi API dang { [key]: T[], total: number } voi ?limit=&offset= that (server tra dung 1 trang, KHONG
// phai fetch het roi cat o client - day la diem khac biet quan trong voi ban phan trang client-side
// cu cua LinhKienScreen truoc do, dung dat lai theo dung tinh than yeu cau moi).
// `path` la phan URL CHUA ca query loc (vd "/tra-cuu/don-vi?q=abc") - doi `path` se tu dong reset ve
// trang 1 (khop hanh vi "doi bo loc thi ve dau danh sach" da quen thuoc trong app).
export function usePagedApi<T>(path: string, key: string, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (p: number) => {
      setLoading(true);
      const sep = path.includes("?") ? "&" : "?";
      const r = await api.get<Record<string, unknown>>(`${path}${sep}limit=${pageSize}&offset=${p * pageSize}`);
      setItems((r[key] as T[]) || []);
      setTotal((r.total as number) ?? 0);
      setLoading(false);
    },
    [path, key, pageSize],
  );

  // Doi path (bo loc/tim kiem) -> ve lai trang 1 + tai lai ngay (khong doi setPage rieng roi cho
  // effect khac chay tiep - gop lam 1 de tranh 1 lan fetch thua voi trang cu).
  useEffect(() => {
    setPage(0);
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const changePage = (p: number) => {
    setPage(p);
    load(p);
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageCount, setPage: changePage, loading, reload: () => load(page) };
}
