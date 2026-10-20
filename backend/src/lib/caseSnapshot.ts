import type { Env } from "../types";
import { lookupCase } from "./caseLookupClient";
import { nowVN } from "./vnTime";

// 20/10/2026 ("Khi đơn được tạo, tự đồng bộ data từ dvbh đẩy vào case"): luu "bang chung" case
// (case_lookup_snapshot) NGAY khi don duoc tao o MOI duong tao don - truoc day chi duong "Them don" thu
// cong (POST /phieu-gui/:id/don) luu, don tu Odoo / don dich vu / don nhap tu AppSheet thi khong.
// Best-effort: loi mang / case khong co tren dvbh thi bo qua, khong chan viec tao don.
export async function syncCaseSnapshots(env: Env, caseIds: (string | null | undefined)[]): Promise<number> {
  const ids = [...new Set(caseIds.map((x) => (x || "").trim()).filter(Boolean))];
  let n = 0;
  for (const id of ids) {
    try {
      const p = await lookupCase(id, env);
      if (!p) continue;
      await env.DB.prepare(
        "INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at",
      )
        .bind(id, JSON.stringify(p), nowVN())
        .run();
      n++;
    } catch {
      /* bo qua */
    }
  }
  return n;
}

// Cron 15 phut: bo sung bang chung cho don con dang xu ly ma chua co (VD 656 don nhap tu AppSheet
// 19/10/2026, don tao truoc khi co tinh nang nay). Toi da `max` case / lan; case khong tim thay tren
// dvbh ghi vao sync_state de khong hoi lai lien tuc (thu lai sau 7 ngay).
export async function backfillCaseSnapshots(env: Env, max = 40): Promise<{ hoi: number; luu: number }> {
  const missRow = await env.DB.prepare("SELECT value FROM sync_state WHERE key = 'case_snapshot_miss'").first<{ value: string }>();
  const miss: Record<string, string> = missRow?.value ? JSON.parse(missRow.value) : {};
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  for (const k of Object.keys(miss)) if (miss[k] < cutoff) delete miss[k];
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT p.case_id FROM phieu_sua_chua_bh p
     WHERE p.case_id IS NOT NULL AND p.case_id <> ''
       AND NOT EXISTS (SELECT 1 FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)
     ORDER BY p.created_at DESC LIMIT 400`,
  ).all<{ case_id: string }>();
  const todo = results.map((r) => r.case_id).filter((id) => !miss[id]).slice(0, max);
  let luu = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const id of todo) {
    const got = await syncCaseSnapshots(env, [id]);
    if (got) luu++;
    else miss[id] = today;
  }
  await env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('case_snapshot_miss', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(miss), nowVN())
    .run();
  return { hoi: todo.length, luu };
}
