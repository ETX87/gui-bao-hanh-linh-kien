// Bo loc danh sach dung chung (21/10/2026: "tất cả các giao diện có table danh sách đơn, phiếu... đều phải
// bổ sung các filter phù hợp (người tạo, người xử lý, người sửa chữa, người gửi sửa, trạng thái...) + công cụ
// tìm kiếm"). Moi route khai bao map "ten tham so query -> bieu thuc SQL"; gia tri:
//   - "__none__"      -> bieu thuc rong (NULL hoac '')
//   - "a,b,c"         -> IN (a,b,c)
//   - "x"             -> = x
// Tra ve doan " AND ..." + binds de noi vao cuoi WHERE (binds dat theo dung thu tu doan sql).
import type { Context } from "hono";

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
