import type { Env } from "../types";
import { nowVN } from "./vnTime";
import { detectMien, loadTuKhoa, type Mien } from "./mien";

// Khu vuc phu trach cua tai khoan nhan su (21/10/2026). Yeu cau nguyen van: "chi can dong bo kiem tra 1 ngay 1 lan +
// bo sung dong bo thu cong".
//
// Nguon: bang user_khu_vuc ben linh-kien-app (Kho / Ke toan / View / Giam sat da gan san khu vuc) - doc qua
// GET /api/suachua-partner/user-khu-vuc (Service Binding LINHKIEN_SERVICE + secret dong bo dung chung). Chay cung lich
// dong bo ETX (1 lan/ngay, lib/etxSync.ts) + nut "Dong bo ngay" o Cai dat.
//   - user_khu_vuc_bh: ghi lai dung nhu nguon (chi email da co tai khoan ben nay + ma khu vuc da co trong khu_vuc_bh,
//     vi 2 cot co FOREIGN KEY). Dung cho pham vi xem cua vai tro View.
//   - users.mien tu suy: moi khu vuc deu MB -> MB, deu MN -> MN, co ca 2 -> ALL (ca 2 mien). Chi ap cho tai khoan
//     chua gan mien hoac mien do he thong tu suy (mien_tu_dong = 1) - KHONG ghi de mien Admin gan tay.

interface Row {
  user_email: string;
  khu_vuc_ma: string;
}

export interface UserKhuVucSyncResult {
  ok: boolean;
  luc: string;
  tong: number;
  so_tai_khoan: number;
  them: number;
  xoa: number;
  bo_qua_chua_co_tk: number;
  bo_qua_khu_vuc_la: number;
  mien_cap_nhat: number;
  loi: string | null;
}

const CHUNK = 400;

async function fetchRows(env: Env): Promise<Row[]> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) throw new Error("Chưa cấu hình kết nối linh-kien-app");
  const res = await env.LINHKIEN_SERVICE.fetch("https://linhkien/api/suachua-partner/user-khu-vuc", {
    headers: { "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
  });
  if (!res.ok) throw new Error(`linh-kien-app trả lỗi ${res.status}`);
  const body = (await res.json()) as { rows?: Row[] };
  if (!Array.isArray(body.rows)) throw new Error("Dữ liệu khu vực nhân sự không hợp lệ");
  return body.rows;
}

export async function runUserKhuVucSync(env: Env): Promise<UserKhuVucSyncResult> {
  const db = env.DB;
  const luc = nowVN();
  const result: UserKhuVucSyncResult = {
    ok: true, luc, tong: 0, so_tai_khoan: 0, them: 0, xoa: 0, bo_qua_chua_co_tk: 0, bo_qua_khu_vuc_la: 0, mien_cap_nhat: 0, loi: null,
  };
  try {
    const src = await fetchRows(env);
    // An toan: nguon rong (loi / chua gan) thi khong dung lam can cu xoa het khu vuc ben nay.
    if (src.length === 0) throw new Error("linh-kien-app chưa có dữ liệu khu vực nhân sự");
    result.tong = src.length;
    const [{ results: users }, { results: kvs }, { results: cu }, tk] = await Promise.all([
      db.prepare("SELECT email, mien, mien_tu_dong FROM users").all<{ email: string; mien: string | null; mien_tu_dong: number }>(),
      db.prepare("SELECT ma FROM khu_vuc_bh").all<{ ma: string }>(),
      db.prepare("SELECT user_email, khu_vuc_ma FROM user_khu_vuc_bh").all<Row>(),
      loadTuKhoa(db),
    ]);
    const userByLower = new Map(users.map((u) => [u.email.toLowerCase(), u]));
    const kvSet = new Set(kvs.map((k) => k.ma));

    // Tap mong muon (theo email trong bang users, dung hoa/thuong cua ben nay).
    const want = new Map<string, Set<string>>();
    for (const r of src) {
      const u = userByLower.get(String(r.user_email ?? "").trim().toLowerCase());
      const ma = String(r.khu_vuc_ma ?? "").trim();
      if (!u) { result.bo_qua_chua_co_tk++; continue; }
      if (!kvSet.has(ma)) { result.bo_qua_khu_vuc_la++; continue; }
      if (!want.has(u.email)) want.set(u.email, new Set());
      want.get(u.email)!.add(ma);
    }
    result.so_tai_khoan = want.size;

    const have = new Set(cu.map((r) => `${r.user_email}\u0001${r.khu_vuc_ma}`));
    const wantKeys = new Set<string>();
    for (const [e, s] of want) for (const ma of s) wantKeys.add(`${e}\u0001${ma}`);

    const stmts: D1PreparedStatement[] = [];
    for (const k of wantKeys) {
      if (have.has(k)) continue;
      const [e, ma] = k.split("\u0001");
      stmts.push(db.prepare("INSERT OR IGNORE INTO user_khu_vuc_bh (user_email, khu_vuc_ma) VALUES (?, ?)").bind(e, ma));
      result.them++;
    }
    for (const k of have) {
      if (wantKeys.has(k)) continue;
      const [e, ma] = k.split("\u0001");
      stmts.push(db.prepare("DELETE FROM user_khu_vuc_bh WHERE user_email = ? AND khu_vuc_ma = ?").bind(e, ma));
      result.xoa++;
    }

    // Mien tu suy.
    for (const u of users) {
      const tuDong = u.mien === null || u.mien_tu_dong === 1;
      if (!tuDong) continue;
      const s = want.get(u.email);
      let target: string | null = null;
      if (s && s.size) {
        const ms = new Set<Mien>();
        for (const ma of s) {
          const m = detectMien(ma, tk);
          if (m) ms.add(m);
        }
        target = ms.size === 2 ? "ALL" : ms.size === 1 ? [...ms][0] : null;
      }
      if (target) {
        if (u.mien !== target || u.mien_tu_dong !== 1) {
          stmts.push(db.prepare("UPDATE users SET mien = ?, mien_tu_dong = 1, updated_at = ? WHERE email = ?").bind(target, luc, u.email));
          result.mien_cap_nhat++;
        }
      } else if (u.mien_tu_dong === 1 && u.mien !== null) {
        // Khong con khu vuc nao suy duoc mien -> tra ve "chua gan".
        stmts.push(db.prepare("UPDATE users SET mien = NULL, mien_tu_dong = 0, updated_at = ? WHERE email = ?").bind(luc, u.email));
        result.mien_cap_nhat++;
      }
    }
    for (let i = 0; i < stmts.length; i += CHUNK) await db.batch(stmts.slice(i, i + CHUNK));
  } catch (e) {
    result.ok = false;
    result.loi = e instanceof Error ? e.message : String(e);
  }
  await db
    .prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('user_khu_vuc_last', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(result), luc)
    .run();
  if (!result.ok) console.error("[userKhuVucSync]", result.loi);
  return result;
}

// Cron 15 phut: 1 lan/ngay tu 1h sang gio VN (cung lich dong bo ETX). Lan loi thi lan cron sau thu lai.
export async function maybeRunUserKhuVucSync(env: Env): Promise<void> {
  const now = nowVN();
  if (Number(now.slice(11, 13)) < 1) return;
  const last = await env.DB.prepare("SELECT value FROM sync_state WHERE key = 'user_khu_vuc_last'").first<{ value: string }>();
  if (last) {
    try {
      const v = JSON.parse(last.value) as { luc?: string; ok?: boolean };
      if (v.ok && v.luc && v.luc.slice(0, 10) === now.slice(0, 10)) return;
    } catch {
      // gia tri hong -> chay lai
    }
  }
  await runUserKhuVucSync(env);
}
