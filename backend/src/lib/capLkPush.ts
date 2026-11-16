import type { Env } from "../types";

// 12/11/2026 (v1.112) - nguyen van: "luồng "Cấp lk" hiện tại sẽ bổ sung bắn api cho đối tác app linh kiện => khi đơn cấp Lk đến bước
// kế toán xác nhận xong / kho in, kho xuất... => sẽ bắn API sang linnh-kien-app để tạo 1 lịch sử đơn đặt ... khi đơn cấp đó đổi trạng
// thái sẽ bắn lại về linh-kien-app".
// Day TRANG THAI HIEN TAI cua tung de xuat (khong day tung su kien) sang POST /api/suachua-partner/cap-lk qua Service Binding
// LINHKIEN_SERVICE + secret dong bo dung chung. Ben kia tao / cap nhat 1 don "SỬA CHỮA TẠI KHO" chi xem va tu ghi nhat ky chong trung.
// Dong can day: (da Ke toan xac nhan va dang da_cap) hoac da tung day, va updated_at khac lan day thanh cong gan nhat
// (moi route doi de xuat deu ghi updated_at -> khong phai sua tung route). Gui ngay sau thao tac (index.ts) + cron 15 phut gui lai.

// 16/11/2026 (v1.133): CHI de xuat luong cu (nguon NULL) - de xuat moi la don that ben linh-kien-app (lib/donScLinhKien.ts).
const CAN_DAY_SQL = `d.nguon IS NULL AND ((d.trang_thai = 'da_cap' AND d.kt_luc IS NOT NULL) OR d.lk_ddh_id IS NOT NULL)
  AND COALESCE(d.lk_day_luc, '') <> d.updated_at`;

export async function demCapLkCho(db: D1Database): Promise<{ cho: number; loi: number }> {
  const r = await db
    .prepare(`SELECT COUNT(*) AS cho, SUM(CASE WHEN d.lk_loi IS NOT NULL THEN 1 ELSE 0 END) AS loi FROM de_xuat_linh_kien_bh d WHERE ${CAN_DAY_SQL}`)
    .first<{ cho: number; loi: number | null }>();
  return { cho: r?.cho ?? 0, loi: r?.loi ?? 0 };
}

// Khoa trong 1 isolate (tranh 2 luot gui trung) - CO HAN 90s: neu 1 luot bi treo (service binding khong tra loi) thi luot sau van chay.
let dangDayDen = 0;
const KHOA_MS = 90_000;
const GIOI_HAN_MS = 25_000;

// AbortSignal khong chac duoc ton trong tren service binding -> tu dat gioi han bang Promise.race.
function coHan<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms))]);
}

export async function dayCapLkCho(env: Env, toiDa = 300): Promise<{ da_day: number; loi?: string }> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { da_day: 0, loi: "CHUA_CAU_HINH" };
  if (Date.now() < dangDayDen) return { da_day: 0, loi: "DANG_GUI" };
  dangDayDen = Date.now() + KHOA_MS;
  try {
    let daDay = 0;
    for (let vong = 0; vong < Math.ceil(toiDa / 100); vong++) {
      const { results } = await env.DB.prepare(
        `SELECT d.id, d.updated_at, d.trang_thai, d.kho_tt, d.ma_lk, d.so_luong, d.ma_misa, d.ma_don_hang, d.ghi_chu, d.created_at,
                d.nguoi_de_xuat, d.kt_boi, d.kt_luc, d.kho_in_boi, d.kho_in_luc, d.kho_xuat_boi, d.kho_xuat_luc,
                u.id AS don_vi_id, u.parent_id AS don_cha_id, u.nguoi_sua_chua, p.case_id, p.mien, g.nguoi_tao AS ktv_email,
                COALESCE(lk.ten_lk, d.ma_lk) AS ten_lk, lk.don_vi AS phan_loai, COALESCE(lk.ma_lk_nguon, d.ma_lk) AS ma_lk_nguon,
                (SELECT ten FROM users WHERE email = u.nguoi_sua_chua) AS nv_ten,
                (SELECT ten FROM users WHERE email = d.nguoi_de_xuat) AS de_xuat_ten,
                (SELECT ten FROM users WHERE email = d.kt_boi) AS kt_ten,
                (SELECT ten FROM users WHERE email = d.kho_in_boi) AS kho_in_ten,
                (SELECT ten FROM users WHERE email = d.kho_xuat_boi) AS kho_xuat_ten,
                (SELECT ten FROM users WHERE email = g.nguoi_tao) AS ktv_ten
         FROM de_xuat_linh_kien_bh d
         JOIN phieu_sua_chua_bh_ct u ON u.id = d.unit_id
         JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
         LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
         LEFT JOIN linh_kien_bh lk ON lk.ma_lk = d.ma_lk
         WHERE ${CAN_DAY_SQL}
         ORDER BY (d.lk_loi IS NOT NULL), d.updated_at, d.id LIMIT 100`,
      ).all<Record<string, string | number | null>>();
      if (!results.length) break;
      const items = results.map((r) => ({
        nguon_id: r.id,
        cap_nhat_luc: r.updated_at,
        trang_thai: r.trang_thai,
        kho_tt: r.kho_tt,
        ma_lk: r.ma_lk_nguon,
        ten_lk: r.ten_lk,
        phan_loai: r.phan_loai,
        so_luong: r.so_luong,
        ma_misa: r.ma_misa,
        ma_don_hang: r.ma_don_hang,
        ghi_chu: r.ghi_chu,
        case_id: r.case_id,
        don_vi_id: r.don_vi_id,
        don_cha_id: r.don_cha_id,
        ktv_email: r.ktv_email,
        ktv_ten: r.ktv_ten,
        nv_email: r.nguoi_sua_chua ?? r.nguoi_de_xuat,
        nv_ten: r.nguoi_sua_chua ? r.nv_ten : r.de_xuat_ten,
        mien: r.mien,
        nguoi_de_xuat: r.nguoi_de_xuat,
        nguoi_de_xuat_ten: r.de_xuat_ten,
        de_xuat_luc: r.created_at,
        kt_boi: r.kt_boi,
        kt_ten: r.kt_ten,
        kt_luc: r.kt_luc,
        kho_in_boi: r.kho_in_boi,
        kho_in_ten: r.kho_in_ten,
        kho_in_luc: r.kho_in_luc,
        kho_xuat_boi: r.kho_xuat_boi,
        kho_xuat_ten: r.kho_xuat_ten,
        kho_xuat_luc: r.kho_xuat_luc,
      }));
      let rows: { nguon_id: string; ddh_id?: string; ok: boolean; loi?: string }[];
      try {
        const res = await coHan(
          env.LINHKIEN_SERVICE.fetch("https://linhkien/api/suachua-partner/cap-lk", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
            body: JSON.stringify({ items }),
          }),
          GIOI_HAN_MS,
        );
        if (!res.ok) return { da_day: daDay, loi: await ghiLoi(env, results, `HTTP_${res.status}`) };
        rows = ((await coHan(res.json(), GIOI_HAN_MS)) as { rows?: typeof rows }).rows ?? [];
      } catch (e) {
        return { da_day: daDay, loi: await ghiLoi(env, results, e instanceof Error ? e.message : String(e)) };
      }
      const theoId = new Map(rows.map((r) => [r.nguon_id, r]));
      const capNhatTheoId = new Map(results.map((r) => [r.id as string, r.updated_at as string]));
      const stmts: D1PreparedStatement[] = [];
      let loiVong = 0;
      for (const [id, upd] of capNhatTheoId) {
        const k = theoId.get(id);
        if (k?.ok) {
          // Chi danh dau da day dung ban da gui (trong luc gui ma de xuat doi tiep -> updated_at khac -> lan sau gui lai).
          stmts.push(env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET lk_day_luc = ?, lk_ddh_id = COALESCE(?, lk_ddh_id), lk_loi = NULL WHERE id = ? AND updated_at = ?").bind(upd, k.ddh_id ?? null, id, upd));
          daDay++;
        } else {
          loiVong++;
          stmts.push(env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET lk_loi = ? WHERE id = ?").bind((k?.loi ?? "KHONG_CO_KET_QUA").slice(0, 300), id));
        }
      }
      if (stmts.length) await env.DB.batch(stmts);
      // Dong loi khong duoc danh dau -> van nam trong CAN_DAY_SQL; dung vong lai de khong lap vo han tren cung dong loi.
      if (loiVong || results.length < 100) break;
    }
    return { da_day: daDay };
  } finally {
    dangDayDen = 0;
  }
}

// Loi ca lo (mang / HTTP / het gio) -> ghi lk_loi cho cac dong cua lo de man Cap linh kien hien canh bao + nut "Gui lai".
async function ghiLoi(env: Env, rows: Record<string, unknown>[], loi: string): Promise<string> {
  await env.DB.batch(rows.map((r) => env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET lk_loi = ? WHERE id = ?").bind(loi.slice(0, 300), r.id as string))).catch(() => undefined);
  return loi;
}
