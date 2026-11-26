// Kiem lib/ghepBbbg.ts voi du lieu D1 that da tra (d1.json, bbbg_tach.json - khong dua len repo).
// Chay: npx tsx thu_ghep.ts (trong thu muc nay)
import { readFileSync } from "node:fs";
import { ghepBbbg, type XacUngVien } from "../../backend/src/lib/ghepBbbg";

const d1 = JSON.parse(readFileSync("d1.json", "utf8"));
const tach = JSON.parse(readFileSync("bbbg_tach.json", "utf8"));
const BAD = ["ket_thuc_tu_choi", "ket_thuc_chuyen_kho", "cho_phan_loai", "admin_can_xem_lai", "cho_bo_sung_tt"];
const uv: XacUngVien[] = [
  ...d1.units.map((u: any) => ({
    id: u.unit_id, case_id: u.case_id.toUpperCase(), lk_b: u.lk_b || u.lk_a, lk_a: u.lk_a, lk_c: u.lk_c, huong_xu_ly: u.huong_xu_ly, xu_ly_xac: u.xu_ly_xac,
    trang_thai: u.trang_thai, xac_tt: u.xac_tt, thung_xac_id: u.thung_xac_id, mien: u.mien, doi_tac_id: 1,
    cho_gom: u.huong_xu_ly === "doi_moi" && u.xu_ly_xac === "tra_doi_tac" && !u.thung_xac_id && !u.xac_tt && !BAD.includes(u.trang_thai) ? 1 : 0,
  })),
  ...d1.dx.map((x: any) => ({ id: x.dx_id, case_id: x.case_id.toUpperCase(), lk_b: x.ma_lk, lk_a: null, lk_c: null, huong_xu_ly: "sua_chua_cap_lk", xu_ly_xac: "tra_doi_tac", trang_thai: x.dx_tt, xac_tt: x.xac_tt, thung_xac_id: x.thung_xac_id, mien: "MB", doi_tac_id: 1, cho_gom: x.xac_tt || x.thung_xac_id ? 0 : 1 })),
];
const dongs = tach.map((r: any) => ({ dong: r.dong, ma: r.ma.toUpperCase(), ma_hang: r.ma_hang, kien: r.thung }));
const { rows, conLai } = ghepBbbg(dongs, uv);
const dem: Record<string, number> = {};
for (const r of rows) dem[r.kl] = (dem[r.kl] || 0) + 1;
console.log("tong", rows.length, dem, "app thieu", conLai.length);
const ids = rows.filter((r) => r.xac).map((r) => r.xac!.id);
console.log("ghep trung xac:", ids.length - new Set(ids).size);
for (const r of rows.filter((r) => r.kl === "lech_ma" || r.kl === "thua")) console.log(r.dong, r.ma_hang, r.ma, "->", r.xac?.id, r.xac?.lk_b);
