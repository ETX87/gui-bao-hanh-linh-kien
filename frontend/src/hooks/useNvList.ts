import { useEffect, useState } from "react";
import { api } from "../lib/api";

export interface NvUser {
  email: string;
  ten: string | null;
}

// Danh sach NV sua chua (rut gon) - dung cho Admin BH chon "nguoi sua chua" o form Phan loai/FAST.
export function useNvList() {
  const [items, setItems] = useState<NvUser[]>([]);
  useEffect(() => {
    api.get<{ users: NvUser[] }>("/users/nv-sua-chua").then((r) => setItems(r.users));
  }, []);
  return items;
}
