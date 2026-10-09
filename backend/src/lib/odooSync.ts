import type { Env } from "../types";
import { nowVN } from "./vnTime";
import { extractMaKtv } from "./ktvCode";

// Don bao hanh Odoo <-> dvbh <-> suachua (yeu cau 04/10/2026, xem CLAUDE.md muc "Keo don bao hanh
// Odoo"). CHOT: suachua TU XIN dinh ky (cron 15 phut) thay vi dvbh day - chi phi doc/ghi 2 huong xap
// xi nhau (vai tram dong/ngay), nhung pull co con tro nen tu phuc hoi khi suachua loi/deploy, va khong
// them rui ro vao luong external-import cua dvbh. Chieu nguoc (trang thai gui sua) suachua GOM DAY
// THEO LO trong cung lan chay cron, chi day phan thay doi so voi lan gui truoc.

export const ODOO_CHO_GUI_STATES = ["new", "repairing"] as const;
const PAGE_LIMIT = 500;
const MAX_PAGES_PER_RUN = 20;
const PUSH_BATCH = 200; // = SYNC_MAX_ROWS ben dvbh

interface OdooRow {
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  ma_linh_kien: string | null;
  ten_linh_kien: string | null;
  so_luong: number | null;
  trang_thai: string | null;
  tinh_trang_loi: string | null;
  ghi_chu: string | null;
  ngay_tao: string | null;
  ngay_hoan_thanh: string | null;
  ngay_cap_nhat_odoo: string | null;
  con_hieu_luc: number;
  ngay_dong_bo: string | null;
  ky_thuat_vien: string | null;
}

function partnerUrl(env: Env, path: string) {
  return `${env.CASE_LOOKUP_BASE_URL.replace(/\/$/, "")}/api/partner/${path}`;
}

async function callDvbh<T>(env: Env, path: string, init?: RequestInit): Promise<T> {
  const res = await env.CASE_LOOKUP_SERVICE.fetch(partnerUrl(env, path), {
    ...init,
    headers: { "X-API-Key": env.CASE_LOOKUP_API_KEY, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`dvbh ${path} -> HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json<T>();
}

async function getState(db: D1Database, key: string): Promise<string | null> {
  const r = await db.prepare("SELECT value FROM sync_state WHERE key = ?").bind(key).first<{ value: string | null }>();
  return r?.value ?? null;
}
async function setState(db: D1Database, key: string, value: string) {
  await db
    .prepare("INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(key, value, nowVN())
    .run();
}

function upsertStmt(db: D1Database, r: OdooRow, now: string) {
  return db
    .prepare(
      `INSERT INTO don_bh_odoo (odoo_id, ma_don, case_id, ma_linh_kien, ten_linh_kien, so_luong, trang_thai, tinh_trang_loi, ghi_chu, ngay_tao, ngay_hoan_thanh, ngay_cap_nhat_odoo, con_hieu_luc, ky_thuat_vien, ma_ktv, ngay_dong_bo, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(odoo_id) DO UPDATE SET ma_don = excluded.ma_don, case_id = excluded.case_id, ma_linh_kien = excluded.ma_linh_kien,
         ten_linh_kien = excluded.ten_linh_kien, so_luong = excluded.so_luong, trang_thai = excluded.trang_thai, tinh_trang_loi = excluded.tinh_trang_loi,
         ghi_chu = excluded.ghi_chu, ngay_tao = excluded.ngay_tao, ngay_hoan_thanh = excluded.ngay_hoan_thanh, ngay_cap_nhat_odoo = excluded.ngay_cap_nhat_odoo,
         con_hieu_luc = excluded.con_hieu_luc, ky_thuat_vien = excluded.ky_thuat_vien, ma_ktv = excluded.ma_ktv, ngay_dong_bo = excluded.ngay_dong_bo,
         synced_at = excluded.synced_at`,
    )
    .bind(
      r.odoo_id,
      r.ma_don,
      r.case_id,
      r.ma_linh_kien,
      r.ten_linh_kien,
      r.so_luong,
      r.trang_thai,
      r.tinh_trang_loi,
      r.ghi_chu,
      r.ngay_tao,
      r.ngay_hoan_thanh,
      r.ngay_cap_nhat_odoo,
      r.con_hieu_luc ? 1 : 0,
      r.ky_thuat_vien,
      extractMaKtv(r.ky_thuat_vien),
      r.ngay_dong_bo,
      now,
    );
}

async function upsertRows(db: D1Database, rows: OdooRow[]) {
  const now = nowVN();
  for (let i = 0; i < rows.length; i += 100) await db.batch(rows.slice(i, i + 100).map((r) => upsertStmt(db, r, now)));
}

// 1) Keo don moi/doi theo con tro (ngay_dong_bo, odoo_id) - chi advance con tro sau khi ghi xong trang.
async function pullOdoo(env: Env): Promise<number> {
  const raw = await getState(env.DB, "odoo_cursor");
  let cursor: { since: string; after_id: number } = raw ? JSON.parse(raw) : { since: "", after_id: 0 };
  let total = 0;
  for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
    const q = `don-bao-hanh-odoo?since=${encodeURIComponent(cursor.since)}&after_id=${cursor.after_id}&limit=${PAGE_LIMIT}`;
    const body = await callDvbh<{ rows: OdooRow[]; has_more: boolean; next: { since: string; after_id: number } | null }>(env, q);
    if (body.rows.length === 0 || !body.next) break;
    await upsertRows(env.DB, body.rows);
    total += body.rows.length;
    cursor = body.next;
    await setState(env.DB, "odoo_cursor", JSON.stringify(cursor));
    if (!body.has_more) break;
  }
  return total;
}

// 2) Don ve dvbh TRUOC case (chua biet KTV) -> khi case ve sau, ban than don khong doi nen con tro khong
// keo lai. Hoi lai rieng cac don con mo ma chua co ma_ktv (toi da 200/lan).
async function resolveMissingKtv(env: Env): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT odoo_id FROM don_bh_odoo WHERE ma_ktv IS NULL AND con_hieu_luc = 1 AND trang_thai IN ('new','repairing') AND khong_gui_boi IS NULL LIMIT 200`,
  ).all<{ odoo_id: number }>();
  if (results.length === 0) return 0;
  const body = await callDvbh<{ rows: OdooRow[] }>(env, `don-bao-hanh-odoo?ids=${results.map((r) => r.odoo_id).join(",")}`);
  const withKtv = body.rows.filter((r) => extractMaKtv(r.ky_thuat_vien));
  if (withKtv.length > 0) await upsertRows(env.DB, withKtv);
  return withKtv.length;
}

// Trang thai gui sua suy ra tu du lieu suachua (thu tu tang dan theo tien do).
const STAGE_ORDER = ["cho_gui", "dang_gui", "kho_da_nhan", "dang_xu_ly", "cho_tra", "dang_tra"] as const;
const TERMINAL = new Set(["hoan_tat", "tu_choi"]);

function unitStage(unitTt: string, traTt: string | null): string {
  if (unitTt === "ket_thuc_tu_choi" || unitTt === "ket_thuc_chuyen_kho") return "tu_choi";
  if (unitTt !== "san_sang_gom_phieu_tra") return "dang_xu_ly";
  if (traTt === "ktv_da_nhan") return "hoan_tat";
  if (traTt === "da_gui" || traTt === "khieu_nai_van_chuyen") return "dang_tra";
  return "cho_tra";
}

interface DerivedStatus {
  odoo_id: number;
  status: string | null;
  detail: string | null;
  ma_phieu: string | null;
}

export async function computeDerivedStatuses(db: D1Database): Promise<DerivedStatus[]> {
  // Chi tinh cac don CHUA ket thuc theo lan gui truoc (hoan_tat/tu_choi la trang thai cuoi) - giu so
  // dong doc moi lan cron ty le voi so don dang xu ly, khong phinh theo toan bo lich su.
  const { results: parents } = await db
    .prepare(
      `SELECT p.odoo_id, p.id AS don_id, p.phieu_gui_id, p.trang_thai_cha, g.trang_thai AS gui_tt
       FROM phieu_sua_chua_bh p
       LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       LEFT JOIN odoo_status_sync s ON s.odoo_id = p.odoo_id
       WHERE p.odoo_id IS NOT NULL AND (s.last_status IS NULL OR s.last_status NOT IN ('hoan_tat','tu_choi'))`,
    )
    .all<{ odoo_id: number; don_id: string; phieu_gui_id: string | null; trang_thai_cha: string; gui_tt: string | null }>();
  if (parents.length === 0) return [];

  const units = new Map<string, { tt: string; tra: string | null }[]>();
  const ids = parents.map((p) => p.don_id);
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const { results } = await db
      .prepare(
        `SELECT c.parent_id, c.trang_thai, t.trang_thai AS tra_tt FROM phieu_sua_chua_bh_ct c
         LEFT JOIN phieu_tra_bh t ON t.id = c.phieu_tra_id WHERE c.parent_id IN (${chunk.map(() => "?").join(",")})`,
      )
      .bind(...chunk)
      .all<{ parent_id: string; trang_thai: string; tra_tt: string | null }>();
    for (const r of results) {
      const arr = units.get(r.parent_id) ?? [];
      arr.push({ tt: r.trang_thai, tra: r.tra_tt });
      units.set(r.parent_id, arr);
    }
  }

  return parents.map((p) => {
    const maPhieu = p.phieu_gui_id ? `${p.don_id} / ${p.phieu_gui_id}` : p.don_id;
    const us = units.get(p.don_id) ?? [];
    if (us.length === 0) {
      const status = p.gui_tt === "da_tiep_nhan" ? "kho_da_nhan" : p.gui_tt === "da_gui" ? "dang_gui" : "cho_gui";
      return { odoo_id: p.odoo_id, status, detail: null, ma_phieu: maPhieu };
    }
    const stages = us.map((u) => unitStage(u.tt, u.tra));
    const open = stages.filter((s) => !TERMINAL.has(s));
    const done = stages.filter((s) => s === "hoan_tat").length;
    const status = open.length > 0 ? STAGE_ORDER.find((s) => open.includes(s))! : done > 0 ? "hoan_tat" : "tu_choi";
    const detail = us.length > 1 ? `${done}/${us.length} hoàn tất` : null;
    return { odoo_id: p.odoo_id, status, detail, ma_phieu: maPhieu };
  });
}

// 3) Day trang thai gui sua ve dvbh - chi phan khac lan gui truoc. Don bi go khoi thung (chi xay ra khi
// phieu con "nhap", tuc lan gui truoc = cho_gui) -> gui trang_thai = null de dvbh xoa.
async function pushStatuses(env: Env): Promise<number> {
  const derived = await computeDerivedStatuses(env.DB);
  // Don go khoi thung nhap, hoac don "khong gui" vua duoc mo lai -> null (dvbh xoa trang thai gui sua).
  const { results: removed } = await env.DB.prepare(
    `SELECT s.odoo_id FROM odoo_status_sync s LEFT JOIN don_bh_odoo o ON o.odoo_id = s.odoo_id
     WHERE s.last_status IN ('cho_gui','khong_gui') AND o.khong_gui_boi IS NULL
     AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.odoo_id = s.odoo_id)`,
  ).all<{ odoo_id: number }>();
  // KTV xac nhan "khong gui" (tao nham tren Odoo, 09/10/2026) - chi lay don chua bao / bao loi / doi ly do.
  const { results: khongGui } = await env.DB.prepare(
    `SELECT o.odoo_id, o.khong_gui_ly_do FROM don_bh_odoo o LEFT JOIN odoo_status_sync s ON s.odoo_id = o.odoo_id
     WHERE o.khong_gui_boi IS NOT NULL AND NOT EXISTS (SELECT 1 FROM phieu_sua_chua_bh p WHERE p.odoo_id = o.odoo_id)
       AND (s.odoo_id IS NULL OR s.last_status IS NOT 'khong_gui' OR s.last_error IS NOT NULL OR s.last_detail IS NOT o.khong_gui_ly_do)`,
  ).all<{ odoo_id: number; khong_gui_ly_do: string | null }>();
  const all: DerivedStatus[] = [
    ...derived,
    ...removed.map((r) => ({ odoo_id: r.odoo_id, status: null, detail: null, ma_phieu: null })),
    ...khongGui.map((r) => ({ odoo_id: r.odoo_id, status: "khong_gui", detail: r.khong_gui_ly_do, ma_phieu: null })),
  ];
  if (all.length === 0) return 0;

  const prev = new Map<number, string>();
  const allIds = all.map((d) => d.odoo_id);
  for (let i = 0; i < allIds.length; i += 90) {
    const chunk = allIds.slice(i, i + 90);
    const { results } = await env.DB.prepare(
      `SELECT odoo_id, last_status, last_detail, last_ma_phieu, last_error FROM odoo_status_sync WHERE odoo_id IN (${chunk.map(() => "?").join(",")})`,
    )
      .bind(...chunk)
      .all<{ odoo_id: number; last_status: string | null; last_detail: string | null; last_ma_phieu: string | null; last_error: string | null }>();
    for (const r of results) prev.set(r.odoo_id, r.last_error ? "__retry__" : `${r.last_status}|${r.last_detail}|${r.last_ma_phieu}`);
  }
  const changed = all.filter((d) => prev.get(d.odoo_id) !== `${d.status}|${d.detail}|${d.ma_phieu}`);
  if (changed.length === 0) return 0;

  let sent = 0;
  for (let i = 0; i < changed.length; i += PUSH_BATCH) {
    const batch = changed.slice(i, i + PUSH_BATCH);
    const now = nowVN();
    let err: string | null = null;
    try {
      await callDvbh(env, "sync/sua-chua-trang-thai", {
        method: "POST",
        body: JSON.stringify({ rows: batch.map((d) => ({ odoo_id: d.odoo_id, trang_thai: d.status, ma_phieu: d.ma_phieu, chi_tiet: d.detail, thoi_diem: now })) }),
      });
      sent += batch.length;
    } catch (e) {
      err = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    }
    // Loi -> ghi last_error de lan cron sau gui lai (prev = "__retry__" luon khac gia tri moi).
    await env.DB.batch(
      batch.map((d) =>
        env.DB.prepare(
          `INSERT INTO odoo_status_sync (odoo_id, last_status, last_detail, last_ma_phieu, last_sent_at, last_error) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(odoo_id) DO UPDATE SET last_status = excluded.last_status, last_detail = excluded.last_detail,
             last_ma_phieu = excluded.last_ma_phieu, last_sent_at = excluded.last_sent_at, last_error = excluded.last_error`,
        ).bind(d.odoo_id, d.status, d.detail, d.ma_phieu, now, err),
      ),
    );
    if (err) throw new Error(err);
  }
  return sent;
}

export interface OdooSyncResult {
  ok: boolean;
  keo_ve: number;
  bo_sung_ktv: number;
  day_trang_thai: number;
  loi: string[];
  luc: string;
}

// Chay ca 3 buoc, moi buoc doc lap (1 buoc loi khong chan buoc khac). Ghi ket qua vao sync_state de
// man Cai dat hien "lan dong bo gan nhat".
export async function runOdooSync(env: Env): Promise<OdooSyncResult> {
  const res: OdooSyncResult = { ok: true, keo_ve: 0, bo_sung_ktv: 0, day_trang_thai: 0, loi: [], luc: nowVN() };
  const step = async (name: string, fn: () => Promise<number>, key: "keo_ve" | "bo_sung_ktv" | "day_trang_thai") => {
    try {
      res[key] = await fn();
    } catch (e) {
      res.ok = false;
      res.loi.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  await step("Kéo đơn Odoo", () => pullOdoo(env), "keo_ve");
  await step("Bổ sung KTV", () => resolveMissingKtv(env), "bo_sung_ktv");
  await step("Đẩy trạng thái", () => pushStatuses(env), "day_trang_thai");
  await setState(env.DB, "odoo_last_run", JSON.stringify(res));
  if (!res.ok) console.error("[odooSync]", res.loi.join(" | "));
  return res;
}
