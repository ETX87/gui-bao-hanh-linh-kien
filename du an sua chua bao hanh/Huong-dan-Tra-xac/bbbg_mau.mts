// Dung BBBG mau (du lieu GIA) bang chinh ham taiBbbg cua app -> bbbg_mau.xlsx, roi xem_bbbg.py ve ra bbbg_xem.html de chup anh.
// Chay: npx tsx bbbg_mau.mts
import { writeFileSync } from "node:fs";

let blob: Blob | null = null;
(globalThis as any).document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
(URL as any).createObjectURL = (b: Blob) => ((blob = b), "x");
(URL as any).revokeObjectURL = () => {};
const { taiBbbg } = await import("../../frontend/src/lib/bbbgXlsx");

const TEN: Record<string, string> = {
  "3004090961": "Bình lạnh chip v2",
  "2008010401": "Bơm 24V 8369T",
  "2009010118": "Nguồn xung 24V/1.5A",
  "3004030309": "Mạch điều khiển v2",
  "2007030116": "Van điện từ 24V",
  "2013070090": "Dàn nóng",
};
const MAU: [string, number, string][] = [
  ["3004090961", 6, "1"], ["2008010401", 9, "2"], ["2009010118", 12, "3"], ["3004030309", 5, "4"], ["2007030116", 4, "4"], ["2013070090", 2, "Để ngoài"],
];
let n = 0;
const xac = MAU.flatMap(([ma, sl, kien]) => Array.from({ length: sl }, (_, i) => {
  n++;
  const cs = `SC26110${String(100 + ((n * 7) % 90)).padStart(3, "0")}${i % 3 === 0 && i ? "" : String(n % 10)}`;
  return { id: `DH-00${1000 + n}-1`, loai: "doi_moi", unit_id: `DH-00${1000 + n}-1`, so_luong: 1, ma_lk_xac: ma, case_id: i === 1 ? `SC2611000${n - 1}` : cs, kien };
}));
const kq = taiBbbg({ id: "TX-000123", trang_thai: "da_duyet", doi_tac: "KAROFI", ma_eo: "EO-2611-0042", ghi_chu: null, mien: "MB", kt_luc: "2026-11-26 10:00:00" }, xac, (m) => TEN[m || ""] || m || "", "Nguyễn Văn A");
writeFileSync("bbbg_mau.xlsx", Buffer.from(await blob!.arrayBuffer()));
console.log(kq);
