import type { Env } from "../types";

// Day "Phan loai" (don_vi) sua tay o suachua nguoc ve linh-kien-app (2026-10-11). Goi qua Service
// Binding LINHKIEN_SERVICE (2 Worker cung tai khoan khong fetch() thang URL nhau duoc - loi 1042), xac
// thuc bang CHINH secret dong bo dung chung LINHKIEN_SYNC_API_KEY (ben kia la SUACHUA_SYNC_API_KEY).
// Chi day dong nguon_du_lieu='dong_bo' (dong noi_bo khong ton tai ben linh-kien-app). Best-effort:
// loi thi giu co don_vi_cho_day=1, cron 15 phut gui lai.
export async function pushPhanLoaiPending(env: Env): Promise<{ da_day: number; loi?: string }> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { da_day: 0, loi: "CHUA_CAU_HINH" };
  const { results } = await env.DB.prepare(
    "SELECT ma_lk, COALESCE(ma_lk_nguon, ma_lk) AS ma_nguon, don_vi FROM linh_kien_bh WHERE don_vi_cho_day = 1 AND nguon_du_lieu = 'dong_bo' LIMIT 500",
  ).all<{ ma_lk: string; ma_nguon: string; don_vi: string | null }>();
  if (!results.length) return { da_day: 0 };
  try {
    const res = await env.LINHKIEN_SERVICE.fetch("https://linhkien/api/suachua-partner/phan-loai", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
      body: JSON.stringify({ rows: results.map((r) => ({ ma_linh_kien: r.ma_nguon, don_vi: r.don_vi })) }),
    });
    if (!res.ok) return { da_day: 0, loi: `HTTP_${res.status}` };
    // Chi xoa co cho dung gia tri da gui (neu trong luc gui Admin sua tiep, giu co de lan sau gui lai).
    await env.DB.batch(
      results.map((r) => env.DB.prepare("UPDATE linh_kien_bh SET don_vi_cho_day = 0 WHERE ma_lk = ? AND COALESCE(don_vi, '') = COALESCE(?, '')").bind(r.ma_lk, r.don_vi)),
    );
    return { da_day: results.length };
  } catch (e) {
    return { da_day: 0, loi: e instanceof Error ? e.message : String(e) };
  }
}

export async function countPhanLoaiPending(db: D1Database): Promise<number> {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM linh_kien_bh WHERE don_vi_cho_day = 1 AND nguon_du_lieu = 'dong_bo'").first<{ n: number }>();
  return r?.n ?? 0;
}
