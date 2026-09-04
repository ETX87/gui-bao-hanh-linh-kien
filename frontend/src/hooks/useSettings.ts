import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SettingItem } from "../lib/types";

// Hooks nap danh muc "Ly do cham"/"Ly do huy" (dung o nhieu form khac nhau - Field chon ly do khi gate
// SLA, form Phan loai khi huong_xu_ly='tu_choi'...). GET mo cho moi vai tro dang nhap (xem
// backend/src/routes/settings.ts).

function useSettingList(path: string) {
  const [items, setItems] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api
      .get<{ items: SettingItem[] }>(path)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false));
  }, [path]);
  return { items, loading };
}

export function useLyDoCham() {
  return useSettingList("/settings/ly-do-cham");
}
export function useLyDoTuChoi() {
  return useSettingList("/settings/ly-do-tu-choi");
}
