// Bo loc danh sach dung chung (21/10/2026: "tất cả các giao diện có table danh sách đơn, phiếu... đều phải
// bổ sung các filter phù hợp (người tạo, người xử lý, người sửa chữa, người gửi sửa, trạng thái...) + công cụ
// tìm kiếm"). Moi route khai bao map "ten tham so query -> bieu thuc SQL"; gia tri:
//   - "__none__"      -> bieu thuc rong (NULL hoac '')
//   - "a,b,c"         -> IN (a,b,c)
//   - "x"             -> = x
// Tra ve doan " AND ..." + binds de noi vao cuoi WHERE (binds dat theo dung thu tu doan sql).
import type { Context } from "hono";
import { slaCutoffVn } from "./sla";
import { nowVN } from "./vnTime";
import { normVi } from "./timKiem";

export const NONE = "__none__";

export function eqFilters(c: Context, map: Record<string, string>): { sql: string; binds: string[] } {
  let sql = "";
  const binds: string[] = [];
  for (const [param, expr] of Object.entries(map)) {
    const raw = (c.req.query(param) || "").trim();
    if (!raw) continue;
    if (raw === NONE) {
      sql += ` AND (${expr} IS NULL OR ${expr} = '')`;
      continue;
    }
    const all = raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 60);
    // 13/11/2026: tich chon nhieu gia tri co the gom ca "(Trống)" (__none__) lan gia tri that.
    const coNone = all.includes(NONE);
    const vals = all.filter((v) => v !== NONE);
    const none = `(${expr} IS NULL OR ${expr} = '')`;
    let cond = "";
    if (vals.length === 1) {
      cond = `${expr} = ?`;
      binds.push(vals[0]);
    } else if (vals.length > 1) {
      cond = `${expr} IN (${vals.map(() => "?").join(",")})`;
      binds.push(...vals);
    }
    if (cond) sql += coNone ? ` AND (${cond} OR ${none})` : ` AND ${cond}`;
    else if (coNone) sql += ` AND ${none}`;
  }
  return { sql, binds };
}

// Gia tri phan biet cua tung bieu thuc trong pham vi co ban (khong ap cac bo loc khac) - de dung lua chon
// cho o loc. fromWhere = "FROM ... WHERE ...". Gia tri rong duoc tra ve la "" (frontend hien "Chưa có").
export async function distinctOpts(
  db: D1Database,
  exprs: Record<string, string>,
  fromWhere: string,
  binds: unknown[],
): Promise<Record<string, string[]>> {
  // 14/11/2026 (toi uu D1): truoc day 1 cau SELECT DISTINCT / bieu thuc -> N lan quet cung 1 tap dong. Gio 1 cau
  // duy nhat, moi bieu thuc 1 json_group_array(DISTINCT ...) (1 lan quet, tra 1 dong); sap xep + cat 500 o JS
  // giong "ORDER BY v LIMIT 500" cu (so dung truoc, chuoi sau).
  const entries = Object.entries(exprs);
  const out: Record<string, string[]> = {};
  if (!entries.length) return out;
  const cols = entries.map(([, expr], i) => `json_group_array(DISTINCT COALESCE(${expr}, '')) AS a${i}`).join(", ");
  const row = await db.prepare(`SELECT ${cols} ${fromWhere}`).bind(...binds).first<Record<string, string>>();
  entries.forEach(([k], i) => {
    out[k] = sapXepGiaTriLoc(JSON.parse(row?.[`a${i}`] || "[]") as (string | number)[]).slice(0, 500).map((v) => String(v ?? ""));
  });
  return out;
}

// Thu tu giong SQLite "ORDER BY v" (collation BINARY): so truoc (tang dan), chuoi sau (so theo ma ky tu).
export function sapXepGiaTriLoc(vals: (string | number)[]): (string | number)[] {
  return [...vals].sort((a, b) => {
    const sa = typeof a === "number", sb = typeof b === "number";
    if (sa !== sb) return sa ? -1 : 1;
    if (sa && sb) return (a as number) - (b as number);
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

// 31/10/2026: loc THOI GIAN theo 1 cot moc (vd ngay tao). ?khoang= hom_nay | 7n | 30n | thang_nay | thang_truoc.
export function timeFilter(c: Context, expr: string, param = "khoang"): { sql: string; binds: string[] } {
  const v = (c.req.query(param) || "").trim();
  if (!v) return { sql: "", binds: [] };
  const now = nowVN(); // "YYYY-MM-DD HH:MM:SS" gio VN
  const day = now.slice(0, 10);
  const shift = (d: string, n: number) => {
    const t = new Date(d + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + n);
    return t.toISOString().slice(0, 10);
  };
  let tu = "";
  let den = "";
  if (v === "hom_nay") tu = day;
  else if (v === "7n") tu = shift(day, -6);
  else if (v === "30n") tu = shift(day, -29);
  else if (v === "thang_nay") tu = day.slice(0, 8) + "01";
  else if (v === "thang_truoc") {
    const dau = day.slice(0, 8) + "01";
    den = shift(dau, -1);
    tu = den.slice(0, 8) + "01";
  } else if (v === "cu_hon_30n") den = shift(day, -30);
  else {
    // 01/11/2026 ("cho chọn khoảng thời gian filter"): khoang tu chon "tu:YYYY-MM-DD:YYYY-MM-DD" (1 trong 2
    // dau co the trong). Gop vao cung tham so de moi danh sach dang dung timeFilter tu nhan, khong them tham so.
    const m = /^tu:(\d{4}-\d{2}-\d{2})?:(\d{4}-\d{2}-\d{2})?$/.exec(v);
    if (!m || (!m[1] && !m[2])) return { sql: "", binds: [] };
    tu = m[1] || "";
    den = m[2] || "";
    if (tu && den && tu > den) [tu, den] = [den, tu];
  }
  let sql = "";
  const binds: string[] = [];
  if (tu) {
    sql += ` AND ${expr} >= ?`;
    binds.push(tu + " 00:00:00");
  }
  if (den) {
    sql += ` AND ${expr} <= ?`;
    binds.push(den + " 23:59:59");
  }
  return { sql, binds };
}

// 31/10/2026: loc CANH BAO SLA theo moc bat dau cho (gio SLA bo Chu nhat, cung thuat toan badge SLA).
// ?canh_bao= trong_han (<24h) | qua_han (>24h) | nguy_hiem (>72h) | qua_han_24_72.
export function slaFilter(c: Context, sinceExpr: string, param = "canh_bao"): { sql: string; binds: string[] } {
  const v = (c.req.query(param) || "").trim();
  if (v === "trong_han") return { sql: ` AND ${sinceExpr} >= ?`, binds: [slaCutoffVn(24)] };
  if (v === "qua_han") return { sql: ` AND ${sinceExpr} < ?`, binds: [slaCutoffVn(24)] };
  if (v === "nguy_hiem") return { sql: ` AND ${sinceExpr} < ?`, binds: [slaCutoffVn(72)] };
  if (v === "qua_han_24_72") return { sql: ` AND ${sinceExpr} < ? AND ${sinceExpr} >= ?`, binds: [slaCutoffVn(24), slaCutoffVn(72)] };
  return { sql: "", binds: [] };
}

// 18/11/2026: loc theo THOI GIAN TON (gio SLA bo Chu nhat) cho danh sach thung: ?ton=lt1|d1_2|d2_3|gt3.
export const TON_MUC: Record<string, [number, number | null]> = { lt1: [0, 24], d1_2: [24, 48], d2_3: [48, 72], gt3: [72, null] };
export function tonFilter(c: Context, sinceExpr: string, param = "ton"): { sql: string; binds: string[] } {
  const m = TON_MUC[(c.req.query(param) || "").trim()];
  if (!m) return { sql: "", binds: [] };
  const [tu, den] = m;
  let sql = "";
  const binds: string[] = [];
  if (tu > 0) { sql += ` AND ${sinceExpr} < ?`; binds.push(slaCutoffVn(tu)); }
  if (den != null) { sql += ` AND ${sinceExpr} >= ?`; binds.push(slaCutoffVn(den)); }
  return { sql, binds };
}

// Gop nhieu bo loc {sql, binds}.
export function joinF(...fs: { sql: string; binds: unknown[] }[]): { sql: string; binds: unknown[] } {
  return { sql: fs.map((f) => f.sql).join(""), binds: fs.flatMap((f) => f.binds) };
}

// ---- 13/11/2026: bang kieu Excel (loc + sap xep tren tieu de cot) ----
// "Bảng dữ liệu: kiểu bảng Excel (lọc + sắp xếp trên tiêu đề cột)": cot chu -> o tim theo tu; cot so -> khoang
// tu - den; sap xep gui len server (?sort=<khoa>&dir=asc|desc), khoa phai nam trong danh sach cho phep.

// Loc CHU theo cot: ?<param>=cum tu -> moi tu phai co trong cot (khong phan biet hoa thuong). normExpr (tuy chon):
// chuoi da bo dau (vd phieu_sua_chua_bh.tim_kiem) de go khong dau van khop.
export function textFilters(c: Context, map: Record<string, string | { expr: string; normExpr?: string }>): { sql: string; binds: string[] } {
  let sql = "";
  const binds: string[] = [];
  for (const [param, def] of Object.entries(map)) {
    const raw = (c.req.query(param) || "").trim().toLowerCase();
    if (!raw) continue;
    const { expr, normExpr } = typeof def === "string" ? { expr: def, normExpr: undefined } : def;
    for (const w of raw.split(/\s+/).filter(Boolean).slice(0, 6)) {
      if (normExpr) {
        sql += ` AND (LOWER(COALESCE(${expr},'')) LIKE ? OR COALESCE(${normExpr},'') LIKE ?)`;
        binds.push(`%${w}%`, `%${normVi(w)}%`);
      } else {
        sql += ` AND LOWER(COALESCE(${expr},'')) LIKE ?`;
        binds.push(`%${w}%`);
      }
    }
  }
  return { sql, binds };
}

// Loc SO theo khoang: ?<param>_tu=&<param>_den=.
export function numFilters(c: Context, map: Record<string, string>): { sql: string; binds: number[] } {
  let sql = "";
  const binds: number[] = [];
  for (const [param, expr] of Object.entries(map)) {
    const tu = parseFloat(c.req.query(`${param}_tu`) || "");
    const den = parseFloat(c.req.query(`${param}_den`) || "");
    if (Number.isFinite(tu)) {
      sql += ` AND ${expr} >= ?`;
      binds.push(tu);
    }
    if (Number.isFinite(den)) {
      sql += ` AND ${expr} <= ?`;
      binds.push(den);
    }
  }
  return { sql, binds };
}

// Sap xep: tra ve bieu thuc + chieu neu ?sort= nam trong whitelist, nguoc lai null (dung thu tu mac dinh).
export function sortParam(c: Context, map: Record<string, string>): { expr: string; dir: "ASC" | "DESC" } | null {
  const k = (c.req.query("sort") || "").trim();
  if (!k || !Object.prototype.hasOwnProperty.call(map, k)) return null;
  return { expr: map[k], dir: (c.req.query("dir") || "").toLowerCase() === "desc" ? "DESC" : "ASC" };
}

