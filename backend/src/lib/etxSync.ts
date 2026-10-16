import type { Env } from "../types";
import { nowVN } from "./vnTime";

// Dong bo danh ba "ETX nhan su" (16/10/2026). Yeu cau nguyen van: "tuong tu he thong linh-kien-app => cac tai khoan tu
// duoc duyet neu co tren he thong ETX nhan su, tu khoa neu nghi viec, tu phan khu vuc dua theo khu vuc tren linh-kien-app
// keo ve".
//
// Nguon: linh-kien-app (da PULL API ETX hang tuan) - GET /api/suachua-partner/etx-nhan-su qua Service Binding
// LINHKIEN_SERVICE, xac thuc bang secret dong bo dung chung. Khong goi thang API ETX (khong them secret, khong tang tai).
// Chay 1 lan/ngay trong cron 15 phut (maybeRunEtxSync) + nut "Dong bo ngay" o Cai dat.
//
// Mot Gmail co the co nhieu ma nhan su (nghi roi vao lai) -> tinh theo Gmail, chi can 1 ma "on" la coi nhu dang lam.
//   - Tu DUYET: tai khoan "Cho duyet" co Gmail dang lam tren ETX -> "Da duyet" (kem co KTV neu Gmail la email dang nhap
//     cua 1 KTV trong danh ba). Ap dung moi lan chay + luc dang nhap (routes/auth.ts).
//   - Tu KHOA: Gmail chuyen dang lam -> nghi viec giua 2 lan dong bo -> users.bi_khoa = 1, danh dau khoa_boi_etx = 1.
//     Giong linh-kien-app: chi khi TRANG THAI DOI, lan dau dong bo khong khoa ai (co CTV ETX bao nghi nhung van lam) -
//     danh sach "dang mo nhung ETX bao nghi" hien o Cai dat de Admin tu quyet. Khong khoa tai khoan Admin he thong.
//   - Tu MO KHOA: nghi viec -> di lam lai, chi mo nhung tai khoan bi khoa boi ETX (khong mo tai khoan Admin khoa tay).
//   - Khu vuc: KHONG xu ly o day - KTV da mang khu_vuc_ma qua dong bo danh ba KTV tu linh-kien-app (ben do tu gan khu vuc
//     theo quan ly truc tiep tren ETX), mien suy tu khu vuc nhu cu (lib/mien.ts).

interface EtxRow {
  ma_nhan_su: string;
  ho_ten: string | null;
  chuc_danh: string | null;
  gmail: string | null;
  trang_thai_lam_viec: string;
  ma_ktv: string | null;
}

export interface EtxSyncResult {
  ok: boolean;
  luc: string;
  tong: number;
  dang_lam: number;
  nghi_viec: number;
  thay_doi: number;
  tu_duyet: number;
  khoa: number;
  mo_khoa: number;
  bo_qua_qtri: string[];
  lan_dau: boolean;
  etx_dong_bo_luc: string | null;
  loi: string | null;
}

const CHUNK = 400;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(e: string | null | undefined): string | null {
  const v = (e ?? "").trim().toLowerCase();
  return EMAIL_RE.test(v) ? v : null;
}

// Gmail -> 'on' | 'off' (chi can 1 ma nhan su 'on' la 'on').
function statusByGmail(rows: { gmail: string | null; trang_thai_lam_viec: string }[]): Map<string, "on" | "off"> {
  const m = new Map<string, "on" | "off">();
  for (const r of rows) {
    const g = normEmail(r.gmail);
    if (!g) continue;
    if (r.trang_thai_lam_viec === "on") m.set(g, "on");
    else if (!m.has(g)) m.set(g, "off");
  }
  return m;
}

async function batchAll(db: D1Database, stmts: D1PreparedStatement[]): Promise<D1Result[]> {
  const out: D1Result[] = [];
  for (let i = 0; i < stmts.length; i += CHUNK) out.push(...(await db.batch(stmts.slice(i, i + CHUNK))));
  return out;
}

async function fetchEtx(env: Env): Promise<{ rows: EtxRow[]; etx_dong_bo_luc: string | null }> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) throw new Error("Chưa cấu hình kết nối linh-kien-app");
  const res = await env.LINHKIEN_SERVICE.fetch("https://linhkien/api/suachua-partner/etx-nhan-su", {
    headers: { "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
  });
  if (!res.ok) throw new Error(`linh-kien-app trả lỗi ${res.status}`);
  const body = (await res.json()) as { rows?: EtxRow[]; etx_dong_bo_luc?: string | null };
  if (!Array.isArray(body.rows)) throw new Error("Dữ liệu ETX không hợp lệ");
  return { rows: body.rows, etx_dong_bo_luc: body.etx_dong_bo_luc ?? null };
}

// Tu duyet cac tai khoan "Cho duyet" co Gmail dang lam tren ETX hoac la email dang nhap cua KTV trong danh ba. Dung chung
// cho dong bo ETX + dong bo danh ba KTV (routes/sync.ts). Tra ve so tai khoan duoc duyet.
export async function tuDuyetTaiKhoanCho(db: D1Database): Promise<number> {
  const now = nowVN();
  const res = await db.batch([
    // KTV / Ve tinh trong danh ba: duyet + gan co vai tro.
    db
      .prepare(
        `UPDATE users SET trang_thai_duyet = 'Da duyet',
           la_ktv_dvbh = CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 0 ELSE 1 END,
           la_ve_tinh = CASE WHEN k.vai_tro_ktv = 'Ve tinh' THEN 1 ELSE 0 END,
           updated_at = ?
         FROM (SELECT LOWER(TRIM(email_dang_nhap)) AS em, MAX(vai_tro_ktv) AS vai_tro_ktv FROM ktv_lien_he_bh
               WHERE email_dang_nhap IS NOT NULL GROUP BY LOWER(TRIM(email_dang_nhap))) k
         WHERE users.trang_thai_duyet = 'Cho duyet' AND LOWER(users.email) = k.em`,
      )
      .bind(now),
    // Nhan su dang lam tren ETX (khong phai KTV): duyet, chua gan vai tro - Admin he thong gan sau.
    db
      .prepare(
        `UPDATE users SET trang_thai_duyet = 'Da duyet', updated_at = ?
         WHERE trang_thai_duyet = 'Cho duyet'
           AND LOWER(email) IN (SELECT LOWER(TRIM(gmail)) FROM etx_nhan_su_bh WHERE trang_thai_lam_viec = 'on' AND gmail IS NOT NULL)`,
      )
      .bind(now),
  ]);
  return res.reduce((n, r) => n + (r.meta?.changes ?? 0), 0);
}

export async function runEtxSync(env: Env): Promise<EtxSyncResult> {
  const db = env.DB;
  const luc = nowVN();
  const result: EtxSyncResult = {
    ok: true, luc, tong: 0, dang_lam: 0, nghi_viec: 0, thay_doi: 0, tu_duyet: 0, khoa: 0, mo_khoa: 0,
    bo_qua_qtri: [], lan_dau: false, etx_dong_bo_luc: null, loi: null,
  };
  try {
    const { rows, etx_dong_bo_luc } = await fetchEtx(env);
    result.etx_dong_bo_luc = etx_dong_bo_luc;
    // An toan: linh-kien-app tra rong (vd chua tung keo ETX / loi) thi KHONG dung lam can cu khoa ai.
    if (rows.length === 0) throw new Error("linh-kien-app chưa có dữ liệu ETX nhân sự");

    const { results: cu } = await db.prepare("SELECT ma_nhan_su, ho_ten, chuc_danh, gmail, trang_thai_lam_viec, ma_ktv FROM etx_nhan_su_bh").all<EtxRow>();
    result.lan_dau = cu.length === 0;
    const truoc = statusByGmail(cu);
    const cuMap = new Map(cu.map((r) => [r.ma_nhan_su, r]));

    const stmts: D1PreparedStatement[] = [];
    const moi: EtxRow[] = [];
    for (const r of rows) {
      const ma = (r.ma_nhan_su ?? "").trim();
      if (!ma) continue;
      const row: EtxRow = {
        ma_nhan_su: ma,
        ho_ten: r.ho_ten ?? null,
        chuc_danh: r.chuc_danh ?? null,
        gmail: normEmail(r.gmail),
        trang_thai_lam_viec: r.trang_thai_lam_viec === "on" ? "on" : "off",
        ma_ktv: r.ma_ktv ?? null,
      };
      moi.push(row);
      const e = cuMap.get(ma);
      if (e && e.ho_ten === row.ho_ten && e.chuc_danh === row.chuc_danh && e.gmail === row.gmail && e.trang_thai_lam_viec === row.trang_thai_lam_viec && e.ma_ktv === row.ma_ktv) continue;
      stmts.push(
        db
          .prepare(
            `INSERT INTO etx_nhan_su_bh (ma_nhan_su, ho_ten, chuc_danh, gmail, trang_thai_lam_viec, ma_ktv, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(ma_nhan_su) DO UPDATE SET ho_ten = excluded.ho_ten, chuc_danh = excluded.chuc_danh, gmail = excluded.gmail,
               trang_thai_lam_viec = excluded.trang_thai_lam_viec, ma_ktv = excluded.ma_ktv, updated_at = excluded.updated_at`,
          )
          .bind(row.ma_nhan_su, row.ho_ten, row.chuc_danh, row.gmail, row.trang_thai_lam_viec, row.ma_ktv, luc),
      );
    }
    result.thay_doi = stmts.length;
    result.tong = moi.length;
    if (stmts.length) await batchAll(db, stmts);

    const sau = statusByGmail(moi);
    for (const v of sau.values()) v === "on" ? result.dang_lam++ : result.nghi_viec++;

    if (!result.lan_dau) {
      const nghi: string[] = [];
      const diLamLai: string[] = [];
      for (const [g, st] of sau) {
        const prev = truoc.get(g);
        if (prev === "on" && st === "off") nghi.push(g);
        if (prev === "off" && st === "on") diLamLai.push(g);
      }
      if (nghi.length) {
        const { results: qtri } = await db
          .prepare("SELECT email FROM users WHERE la_qtri = 1 AND COALESCE(bi_khoa, 0) = 0 AND LOWER(email) IN (SELECT value FROM json_each(?))")
          .bind(JSON.stringify(nghi))
          .all<{ email: string }>();
        result.bo_qua_qtri = qtri.map((q) => q.email);
        const r = await db
          .prepare(
            `UPDATE users SET bi_khoa = 1, khoa_boi_etx = 1, updated_at = ?
             WHERE COALESCE(bi_khoa, 0) = 0 AND la_qtri = 0 AND email <> ? AND LOWER(email) IN (SELECT value FROM json_each(?))`,
          )
          .bind(luc, env.BOOTSTRAP_ADMIN_EMAIL ?? "", JSON.stringify(nghi))
          .run();
        result.khoa = r.meta?.changes ?? 0;
      }
      if (diLamLai.length) {
        const r = await db
          .prepare("UPDATE users SET bi_khoa = 0, khoa_boi_etx = 0, updated_at = ? WHERE khoa_boi_etx = 1 AND LOWER(email) IN (SELECT value FROM json_each(?))")
          .bind(luc, JSON.stringify(diLamLai))
          .run();
        result.mo_khoa = r.meta?.changes ?? 0;
      }
    }

    result.tu_duyet = await tuDuyetTaiKhoanCho(db);
  } catch (e) {
    result.ok = false;
    result.loi = e instanceof Error ? e.message : String(e);
  }
  await db
    .prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('etx_last', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(result), luc)
    .run();
  if (!result.ok) console.error("[etxSync]", result.loi);
  return result;
}

// Cron 15 phut: chay 1 lan/ngay tu 1h sang gio VN (linh-kien-app keo ETX 0h thu Hai hang tuan).
export async function maybeRunEtxSync(env: Env): Promise<void> {
  const now = nowVN();
  if (Number(now.slice(11, 13)) < 1) return;
  const last = await env.DB.prepare("SELECT value FROM sync_state WHERE key = 'etx_last'").first<{ value: string }>();
  if (last) {
    try {
      const v = JSON.parse(last.value) as { luc?: string; ok?: boolean };
      if (v.ok && v.luc && v.luc.slice(0, 10) === now.slice(0, 10)) return;
    } catch {
      // gia tri hong -> chay lai
    }
  }
  await runEtxSync(env);
}
