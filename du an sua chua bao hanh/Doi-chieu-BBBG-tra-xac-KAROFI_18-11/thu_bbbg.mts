// Dung thu BBBG (lib/bbbgXlsx.ts) tu cac xac khop cua dot 18/11 (du lieu that da tra, khong dua len repo) -> BBBG_thu_TX.xlsx
// Chay: npx tsx thu_bbbg.ts (trong thu muc nay)
import { readFileSync, writeFileSync } from "node:fs";
import { ghepBbbg, type XacUngVien } from "../../backend/src/lib/ghepBbbg";

let blob: Blob | null = null;
(globalThis as any).document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };
(URL as any).createObjectURL = (b: Blob) => ((blob = b), "x");
(URL as any).revokeObjectURL = () => {};

const { taiBbbg } = await import("../../frontend/src/lib/bbbgXlsx");
const d1 = JSON.parse(readFileSync("d1.json", "utf8"));
const tach = JSON.parse(readFileSync("bbbg_tach.json", "utf8"));
const uv: XacUngVien[] = d1.units.map((u: any) => ({ id: u.unit_id, case_id: u.case_id.toUpperCase(), lk_b: u.lk_b || u.lk_a, lk_a: u.lk_a, lk_c: u.lk_c, huong_xu_ly: u.huong_xu_ly, xu_ly_xac: u.xu_ly_xac, trang_thai: u.trang_thai, xac_tt: u.xac_tt, thung_xac_id: u.thung_xac_id, mien: u.mien, doi_tac_id: 1, cho_gom: u.huong_xu_ly === "doi_moi" && u.xu_ly_xac === "tra_doi_tac" && !u.xac_tt ? 1 : 0 }));
const { rows } = ghepBbbg(tach.map((r: any) => ({ dong: r.dong, ma: r.ma.toUpperCase(), ma_hang: r.ma_hang, kien: String(r.thung || "").replace(/^Thùng\s*/i, "") })), uv);
const ten = new Map(tach.map((r: any) => [r.ma_hang, r.ten]));
const xac = rows.filter((r) => r.kl === "khop" || r.kl === "khop_ac").map((r) => ({ id: r.xac!.id, loai: "doi_moi", unit_id: r.xac!.id, so_luong: 1, ma_lk_xac: r.xac!.lk_b, case_id: r.xac!.case_id, kien: r.kien }));
const kq = taiBbbg({ id: "TX-THU", trang_thai: "da_duyet", doi_tac: "KAROFI", ma_eo: "EO-THU", ghi_chu: null, mien: "MB", kt_luc: "2026-11-26 10:00:00" }, xac, (m) => (ten.get(m || "") as string) || m || "", "Người lập thử");
writeFileSync("BBBG_thu_TX.xlsx", Buffer.from(await blob!.arrayBuffer()));
console.log(kq);
