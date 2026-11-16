import { useState } from "react";
import { Btn } from "./primitives";
import { useToast } from "./Toast";
import { api, errorMessage } from "../lib/api";
import { buildXlsx, downloadBlob } from "../lib/xlsx";

// 16/11/2026 - nguyen van: "Thêm tính năng tải danh sách theo filter đang chọn cho các màn Đơn bh, Trả xác, cấp lk".
// Tai TOAN BO danh sach dang loc / sap xep (khong chi trang dang xem): goi lan luot path?limit=&offset= toi khi du total
// (backend co the cap limit nho hon -> buoc offset theo so dong thuc nhan), toi da `max` dong, ghi ra 1 file .xlsx.

export interface ExportCol<T> {
  header: string;
  value: (r: T) => string | number | null | undefined;
  width?: number;
}
export interface ExportSource<T> {
  path: string; // duong dan danh sach DA kem bo loc (withQuery(...))
  itemsKey: string; // ten mang trong response (vd "don_vi", "xac", "de_xuat")
  cols: ExportCol<T>[];
  sheet: string; // ten sheet (khong dau, <= 31 ky tu)
}

export async function taiTheoLoc<T>(src: ExportSource<T>, onProgress?: (n: number, total: number) => void, max = 20000): Promise<string[][]> {
  const all: T[] = [];
  const sep = src.path.includes("?") ? "&" : "?";
  let total = 0;
  for (let guard = 0; guard < 400 && all.length < max; guard++) {
    const r = await api.get<Record<string, unknown>>(`${src.path}${sep}limit=1000&offset=${all.length}`);
    const items = (r[src.itemsKey] as T[] | undefined) || [];
    total = Number(r.total ?? all.length + items.length);
    all.push(...items);
    onProgress?.(all.length, total);
    if (!items.length || all.length >= total) break;
  }
  return [src.cols.map((c) => c.header), ...all.map((r) => src.cols.map((c) => {
    const v = c.value(r);
    return v === null || v === undefined ? "" : String(v);
  }))];
}

export function tenFile(prefix: string) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.xlsx`;
}

// Nut "⬇ Tải Excel" - 1 hoac nhieu nguon (moi nguon 1 sheet), theo dung bo loc dang chon.
export function ExcelExportButton({ sources, file, disabled, label = "⬇ Tải Excel", size = "sm" }: { sources: ExportSource<any>[]; file: string; disabled?: boolean; label?: string; size?: "sm" | "md" }) {
  const toast = useToast();
  const [dl, setDl] = useState<string | null>(null);
  const run = async () => {
    if (dl) return;
    try {
      const sheets: { name: string; rows: string[][]; widths?: number[] }[] = [];
      let n = 0;
      for (const s of sources) {
        const rows = await taiTheoLoc(s, (a, t) => setDl(`Đang tải ${a}/${t}…`));
        n += rows.length - 1;
        sheets.push({ name: s.sheet, rows, widths: s.cols.map((c) => c.width ?? 18) });
      }
      downloadBlob(buildXlsx(sheets), tenFile(file));
      toast(`Đã tải ${n} dòng.`, "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDl(null);
    }
  };
  return (
    <Btn size={size} variant="secondary" onClick={run} disabled={disabled || !!dl} title="Tải toàn bộ danh sách đang lọc / sắp xếp ra file Excel">
      {dl || label}
    </Btn>
  );
}
