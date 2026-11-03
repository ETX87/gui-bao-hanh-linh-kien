import { conChoDongBo } from "./caseNgay";
import type { Env } from "../types";
import { lookupCase, lookupCaseEx } from "./caseLookupClient";
import { extractMaKtv } from "./ktvCode";
import { addLog } from "./logs";
import { nowVN } from "./vnTime";
import { capNhatTimKiem } from "./timKiem";

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
  // 31/10/2026: don vua tao (+ bang chung moi) -> tinh ngay chuoi tim kiem khong dau.
  await capNhatTimKiem(env.DB, null, 100).catch(() => 0);
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

// 02/11/2026: dvbh (v1.516) bat dau tra "ngay_san_xuat" trong case-lookup - lam moi dan bang chung cu chua co
// truong nay (khoa vang hoan toan trong JSON). Con tro theo case_id de case dvbh khong con / loi khong chan
// cac case sau; het vong thi quay lai dau. Toi da `max` case / lan cron.
export async function refreshSnapshotsThieuNsx(env: Env, max = 80): Promise<{ hoi: number; luu: number }> {
  const cur = await env.DB.prepare("SELECT value FROM sync_state WHERE key = 'nsx_after'").first<{ value: string }>();
  const after = cur?.value || "";
  const { results } = await env.DB.prepare(
    "SELECT case_id FROM case_lookup_snapshot WHERE json_type(data, '$.ngay_san_xuat') IS NULL AND case_id > ? ORDER BY case_id LIMIT ?",
  )
    .bind(after, max)
    .all<{ case_id: string }>();
  const ids = results.map((r) => r.case_id);
  const luu = ids.length ? await syncCaseSnapshots(env, ids) : 0;
  const next = ids.length < max ? "" : ids[ids.length - 1];
  await env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('nsx_after', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(next, nowVN())
    .run();
  return { hoi: ids.length, luu };
}

// 30/10/2026: xac minh lai cac don tao luc he DVBH loi (case_xac_minh = 1, xem POST /phieu-gui/:id/don).
// Khop dung KTV so huu thung -> 0 + luu bang chung; khong tim thay case / lech KTV -> 2 + ly do, ghi nhat
// ky (Admin BH thay canh bao o bang xu ly + UI chi tiet). DVBH van loi -> giu nguyen 1, lan cron sau hoi lai.
export async function verifyPendingCases(env: Env, max = 30): Promise<{ hoi: number; ok: number; sai: number }> {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.case_id, p.trang_thai_cha, g.nguoi_tao FROM phieu_sua_chua_bh p JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
     WHERE p.case_xac_minh = 1 ORDER BY p.created_at LIMIT ?`,
  )
    .bind(max)
    .all<{ id: string; case_id: string; trang_thai_cha: string; nguoi_tao: string }>();
  let ok = 0;
  let sai = 0;
  for (const r of results) {
    const res = await lookupCaseEx(r.case_id, env);
    if (res.status === "error") break; // DVBH van loi - thu lai lan sau
    // 03/11/2026: case trong ngay chua dong bo kip -> cho toi het ngay hom sau moi danh dau that bai.
    if (res.status === "not_found" && conChoDongBo(r.case_id)) continue;
    let loi: string | null = null;
    if (res.status === "not_found") loi = "Không tìm thấy case này bên hệ DVBH";
    else {
      const maKtvCase = extractMaKtv(res.preview.ky_thuat_vien);
      const ktvRow = await env.DB.prepare("SELECT ma_ktv FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(r.nguoi_tao).first<{ ma_ktv: string }>();
      if (!maKtvCase || !ktvRow || ktvRow.ma_ktv !== maKtvCase) loi = `Case không thuộc KTV gửi hàng (KTV trên case: ${res.preview.ky_thuat_vien || "không xác định"})`;
      await env.DB.prepare(
        "INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at",
      )
        .bind(r.case_id, JSON.stringify(res.preview), nowVN())
        .run();
    }
    await env.DB.prepare("UPDATE phieu_sua_chua_bh SET case_xac_minh = ?, case_xac_minh_loi = ?, ktv_tren_case = COALESCE(?, ktv_tren_case) WHERE id = ?")
      .bind(loi ? 2 : 0, loi, res.status === "found" ? res.preview.ky_thuat_vien : null, r.id)
      .run();
    await addLog(env.DB, "phieu_sc", r.id, r.trang_thai_cha, r.trang_thai_cha, "Hệ thống", loi ? `⚠ Xác minh mã case ${r.case_id} THẤT BẠI: ${loi}` : `Đã xác minh mã case ${r.case_id} (đúng KTV)`);
    if (loi) sai++;
    else ok++;
  }
  return { hoi: results.length, ok, sai };
}
