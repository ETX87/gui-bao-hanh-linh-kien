import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { LinhKien } from "../lib/types";

// Danh muc linh kien dung cho o chon (KTV them don, Admin BH doi linh kien thuc te...) - chi lay dong
// "duoc_dung_bao_hanh=1" (mac dinh danh sach kho, tranh dai qua tren mobile).

export function useLinhKien() {
  const [items, setItems] = useState<LinhKien[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get<{ linh_kien: LinhKien[] }>("/linh-kien?duoc_dung_bao_hanh=1")
      .then((r) => setItems(r.linh_kien))
      .finally(() => setLoading(false));
  }, []);
  return { items, loading };
}
