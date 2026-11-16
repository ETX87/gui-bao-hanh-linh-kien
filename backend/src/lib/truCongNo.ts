import type { Env } from "../types";
import { goiLinhKien, moTaLoi, type DonSc } from "./donScLinhKien";

// 16/11/2026 - Tru cong no sua chua cho NV sua chua (xem migrations/0040_tieu_hao_tru_cong_no.sql). Sau khi Admin BH xac nhan tieu hao 1 lan
// cap (de_xuat lien_ket): gui sang linh-kien-app POST /api/suachua-partner/tru-cong-no tao don "TRỪ CÔNG NỢ - SỬA CHỮA" (sl_tru) va
// "TRẢ HÀNG CÔNG NỢ - SỬA CHỮA" (sl_tra). Ben kia chong tao trung theo lan cap goc + lan gui; trang thai keo ve qua GET /tru-cong-no.
// Goi ngay sau thao tac (waitUntil) + cron 15 phut gui lai dong loi.

interface DongCho {
  id: string;
  lk_ddh_id: string;
  sl_tru: number | null;
  sl_tra: number | null;
  tru_ddh_id: string | null;
  tra_ddh_id: string | null;
  xn_boi: string | null;
  xn_ghi_chu: string | null;
  cn_lan: number;
}

const DIEU_KIEN_CHO = `xn_luc IS NOT NULL AND lk_ddh_id IS NOT NULL
  AND ((COALESCE(sl_tru, 0) > 0 AND tru_ddh_id IS NULL) OR (COALESCE(sl_tra, 0) > 0 AND tra_ddh_id IS NULL))`;

export async function demTruCongNoCho(db: D1Database): Promise<{ cho: number; loi: number }> {
  const r = await db.prepare(`SELECT COUNT(*) AS cho, SUM(CASE WHEN cn_loi IS NOT NULL THEN 1 ELSE 0 END) AS loi FROM de_xuat_linh_kien_bh WHERE ${DIEU_KIEN_CHO}`)
    .first<{ cho: number; loi: number | null }>();
  return { cho: r?.cho ?? 0, loi: r?.loi ?? 0 };
}

export async function dayTruCongNo(env: Env, ids?: string[]): Promise<{ da_tao: number; loi: number }> {
  const { results } = ids?.length
    ? await env.DB.prepare(`SELECT * FROM de_xuat_linh_kien_bh WHERE ${DIEU_KIEN_CHO} AND id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all<DongCho>()
    : await env.DB.prepare(`SELECT * FROM de_xuat_linh_kien_bh WHERE ${DIEU_KIEN_CHO} ORDER BY xn_luc LIMIT 40`).all<DongCho>();
  let daTao = 0;
  let loi = 0;
  for (const d of results) {
    const viec: ("tru" | "tra")[] = [];
    if ((d.sl_tru ?? 0) > 0 && !d.tru_ddh_id) viec.push("tru");
    if ((d.sl_tra ?? 0) > 0 && !d.tra_ddh_id) viec.push("tra");
    let loiDong: string | null = null;
    for (const loai of viec) {
      const kq = await goiLinhKien<{ don?: DonSc | null }>(env, "/tru-cong-no", {
        method: "POST",
        body: {
          ddh_goc: d.lk_ddh_id,
          loai,
          so_luong: loai === "tru" ? d.sl_tru : d.sl_tra,
          nguoi_thao_tac: d.xn_boi,
          ghi_chu: `${d.id}${d.xn_ghi_chu ? ` · ${d.xn_ghi_chu}` : ""}`,
          lan: d.cn_lan,
        },
      });
      if (!kq.ok || !kq.data.don) {
        const conLai = kq.ok ? undefined : kq.body?.con_lai;
        loiDong = (kq.ok ? "Không đọc được đơn vừa tạo" : moTaLoi(kq)) + (conLai !== undefined ? ` (còn lại ${conLai})` : "");
        loi++;
        continue;
      }
      const don = kq.data.don;
      await env.DB.prepare(
        loai === "tru"
          ? "UPDATE de_xuat_linh_kien_bh SET tru_ddh_id = ?, tru_nhan = ?, tru_buoc = ? WHERE id = ?"
          : "UPDATE de_xuat_linh_kien_bh SET tra_ddh_id = ?, tra_nhan = ?, tra_buoc = ? WHERE id = ?",
      ).bind(don.id, don.nhan, don.buoc, d.id).run();
      daTao++;
    }
    await env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET cn_loi = ? WHERE id = ?").bind(loiDong, d.id).run();
  }
  return { da_tao: daTao, loi };
}

// Keo trang thai don tru / tra ve (mac dinh: cac don chua xong / chua huy).
export async function dongBoTruCongNo(env: Env, deXuatIds?: string[]): Promise<{ so_don: number; loi?: string }> {
  type R = { id: string; tru_ddh_id: string | null; tra_ddh_id: string | null };
  const { results } = deXuatIds?.length
    ? await env.DB.prepare("SELECT id, tru_ddh_id, tra_ddh_id FROM de_xuat_linh_kien_bh WHERE id IN (SELECT value FROM json_each(?)) AND (tru_ddh_id IS NOT NULL OR tra_ddh_id IS NOT NULL)")
        .bind(JSON.stringify(deXuatIds)).all<R>()
    : await env.DB.prepare(
        `SELECT id, tru_ddh_id, tra_ddh_id FROM de_xuat_linh_kien_bh
         WHERE (tru_ddh_id IS NOT NULL AND COALESCE(tru_buoc, '') NOT IN ('xong', 'dong')) OR (tra_ddh_id IS NOT NULL AND COALESCE(tra_buoc, '') NOT IN ('xong', 'dong'))
         LIMIT 400`,
      ).all<R>();
  const ddh = [...new Set(results.flatMap((r) => [r.tru_ddh_id, r.tra_ddh_id]).filter((x): x is string => !!x))];
  if (!ddh.length) return { so_don: 0 };
  const kq = await goiLinhKien<{ rows: DonSc[] }>(env, `/tru-cong-no?ids=${encodeURIComponent(ddh.join(","))}`);
  if (!kq.ok) return { so_don: 0, loi: kq.error };
  const theoId = new Map((kq.data.rows ?? []).map((r) => [r.id, r]));
  const stmts: D1PreparedStatement[] = [];
  for (const r of results) {
    const t = r.tru_ddh_id ? theoId.get(r.tru_ddh_id) : undefined;
    const a = r.tra_ddh_id ? theoId.get(r.tra_ddh_id) : undefined;
    if (t) stmts.push(env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET tru_nhan = ?, tru_buoc = ? WHERE id = ? AND (COALESCE(tru_nhan,'') <> ? OR COALESCE(tru_buoc,'') <> ?)").bind(t.nhan, t.buoc, r.id, t.nhan, t.buoc));
    if (a) stmts.push(env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET tra_nhan = ?, tra_buoc = ? WHERE id = ? AND (COALESCE(tra_nhan,'') <> ? OR COALESCE(tra_buoc,'') <> ?)").bind(a.nhan, a.buoc, r.id, a.nhan, a.buoc));
  }
  for (let i = 0; i < stmts.length; i += 100) await env.DB.batch(stmts.slice(i, i + 100));
  return { so_don: theoId.size };
}
