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

// Tra ten linh kien tu ma - dung o cac bang danh sach (KTV tra cuu, Giam sat tra cuu, hang doi NV)
// truoc day hien nguyen ma "LK011" thay vi ten (Phat hien 4 vong ra soat UX). Chua co / dang tai thi
// tra lai chinh ma (van co thong tin), khong render "undefined".
export function useLkName() {
  const { items, loading } = useLinhKien();
  const nameOf = (ma: string | null | undefined): string => {
    if (!ma) return "Cả sản phẩm";
    return items.find((lk) => lk.ma_lk === ma)?.ten_lk || ma;
  };
  return { nameOf, loading };
}
