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
    const vals = raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 30);
    if (vals.length === 1) {
      sql += ` AND ${expr} = ?`;
      binds.push(vals[0]);
    } else if (vals.length > 1) {
      sql += ` AND ${expr} IN (${vals.map(() => "?").join(",")})`;
      binds.push(...vals);
    }
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
  const out: Record<string, string[]> = {};
  await Promise.all(
    Object.entries(exprs).map(async ([k, expr]) => {
      const { results } = await db
        .prepare(`SELECT DISTINCT COALESCE(${expr}, '') AS v ${fromWhere} ORDER BY v LIMIT 500`)
        .bind(...binds)
        .all<{ v: string | number }>();
      out[k] = results.map((r) => String(r.v ?? ""));
    }),
  );
  return out;
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
  else return { sql: "", binds: [] };
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

// Gop nhieu bo loc {sql, binds}.
export function joinF(...fs: { sql: string; binds: unknown[] }[]): { sql: string; binds: unknown[] } {
  return { sql: fs.map((f) => f.sql).join(""), binds: fs.flatMap((f) => f.binds) };
}
