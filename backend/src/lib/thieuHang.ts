import type { Env } from "../types";
import { nowVN } from "./vnTime";
import { normVi } from "./timKiem";
import { sendPushToUser } from "./webPush";

// THIEU HANG BAO HANH -> ticket ben linh-kien-app (04/11/2026, migration 0026; ben kia migration 0106, routes/thieuHangBh.ts).
//   - Tu dong: moi dong nhat ky co "Ly do cham: Khong co linh kien | Het hang ton kho" (addLog - xem lib/logs.ts) tren don vi / don cha /
//     phieu tra -> 1 yeu cau thieu hang cho tung don vi lien quan (linh kien = de xuat NV dang cho cap, khong co thi linh kien hieu luc
//     C -> B -> A, SL 1). Bam tay "Bao thieu hang" o UI chi tiet don cung duoc.
//   - Gui sang linh-kien-app ngay sau request (index.ts middleware) + cron 15 phut gui lai dong loi.
//   - Phan hoi: linh-kien-app day ve POST /api/partner/sync/thieu-hang moi lan Kho / Mua hang doi trang thai; cron keo lai theo con tro.

export const THB_LABEL: Record<string, string> = {
  "Cho gui": "Chưa gửi được sang Kho",
  "Cho kho xu ly": "Chờ Kho xử lý",
  "Kho da tiep nhan": "Kho đã tiếp nhận — chờ hàng về",
  "Cho mua hang": "Chờ Mua hàng đặt",
  "Mua hang da dat": "Mua hàng đã đặt",
  "Kho xac nhan hang da ve": "Hàng đã về",
  "Kho tu choi": "Kho từ chối",
  "Mua hang tu choi": "Không mua được",
  "Da huy": "Đã rút lại",
};
export const THB_MO_LOCAL = ["Cho gui", "Cho kho xu ly", "Kho da tiep nhan", "Cho mua hang", "Mua hang da dat"];

// HANG DA VE -> CHO DE XUAT LINH KIEN (26/11/2026, v1.164). Nguyen van: "vậy thì phải tạo cảnh báo cho các bên biết đơn đó hàng đã về, có
// thể đặt để sửa chữa". Ticket "Hang da ve" KHONG tu tao de xuat / don cap LK - chi canh bao: ticket da ve + don vi con dang sua
// (cho_chan_doan - buoc duy nhat tao duoc de xuat, routes/deXuat.ts) + CHUA co de xuat CUNG ma LK (khong huy / tu choi) tao sau luc bao
// thieu. Tu het canh bao khi da de xuat ma do, hoac don vi roi buoc dang sua (nop ket qua / doi huong). Dung chung: workload (menu + thong
// bao 12h), routes/thieuHang.ts (nhom "cho_de_xuat", co cho_de_xuat tung dong). t = thieu_hang_bh, u = phieu_sua_chua_bh_ct.
export const HANG_VE_CHO_DX_SQL = (t = "t", u = "u") =>
  `(${t}.trang_thai = 'Kho xac nhan hang da ve' AND ${u}.trang_thai = 'cho_chan_doan' AND NOT EXISTS (SELECT 1 FROM de_xuat_linh_kien_bh dx
    WHERE dx.unit_id = ${t}.unit_id AND dx.ma_lk = ${t}.ma_lk AND dx.trang_thai NOT IN ('huy', 'tu_choi') AND dx.created_at >= ${t}.ngay_bao))`;

/** Ly do cham thuoc nhom thieu hang (so khop khong dau, chiu duoc ten danh muc co / khong dau). */
export function laLyDoThieuHang(lyDo: string | null | undefined): boolean {
  const n = normVi(lyDo);
  return n.includes("khong co linh kien") || n.includes("het hang ton kho");
}

// Danh dau trong isolate: co yeu cau moi cho gui -> middleware index.ts goi guiThieuHangCho trong waitUntil.
let coYeuCauMoi = false;
export function layVaXoaCoYeuCauMoi(): boolean {
  const v = coYeuCauMoi;
  coYeuCauMoi = false;
  return v;
}

/** Tach ly do cham tu ghi chu nhat ky ("... | Lý do chậm: X" hoac "⏱ Ghi nhận lý do chậm (...): X"). */
function lyDoChamTuGhiChu(ghiChu: string): string | null {
  const m = ghiChu.match(/l[ýy] do ch[ậa]m[^:]*:\s*([^|]+)/i);
  return m ? m[1].trim() : null;
}

export async function ghiNhanThieuHangTuLog(db: D1Database, entityType: string, entityId: string, actor: string, ghiChu: string): Promise<void> {
  if (!/ch[ậa]m/i.test(ghiChu)) return;
  const lyDo = lyDoChamTuGhiChu(ghiChu);
  if (!lyDo || !laLyDoThieuHang(lyDo)) return;
  let unitIds: string[] = [];
  if (entityType === "phieu_sc_ct") unitIds = [entityId];
  else if (entityType === "phieu_tra" || entityType === "phieu_sc") {
    const col = entityType === "phieu_tra" ? "phieu_tra_id" : "parent_id";
    const { results } = await db.prepare(`SELECT id FROM phieu_sua_chua_bh_ct WHERE ${col} = ? LIMIT 50`).bind(entityId).all<{ id: string }>();
    unitIds = results.map((r) => r.id);
  }
  for (const u of unitIds) await taoYeuCauThieuHang(db, u, null, lyDo, actor, "tu_dong");
}

/** Tao yeu cau thieu hang cho 1 don vi. items null = tu suy (de xuat NV dang cho cap, khong co thi linh kien hieu luc). */
export async function taoYeuCauThieuHang(
  db: D1Database,
  unitId: string,
  items: { ma_lk: string; so_luong: number }[] | null,
  lyDo: string,
  actor: string,
  nguon: "tu_dong" | "tay",
  ghiChu?: string | null,
): Promise<number> {
  let ds = items;
  if (!ds) {
    const { results: dx } = await db
      .prepare("SELECT ma_lk, so_luong FROM de_xuat_linh_kien_bh WHERE unit_id = ? AND trang_thai = 'cho_cap'")
      .bind(unitId)
      .all<{ ma_lk: string; so_luong: number }>();
    if (dx.length) ds = dx;
    else {
      const u = await db
        .prepare(
          `SELECT COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk) AS ma_lk FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?`,
        )
        .bind(unitId)
        .first<{ ma_lk: string | null }>();
      ds = u?.ma_lk ? [{ ma_lk: u.ma_lk, so_luong: 1 }] : [];
    }
  }
  const now = nowVN();
  let n = 0;
  for (const it of ds) {
    const co = await db
      .prepare(`SELECT id FROM thieu_hang_bh WHERE unit_id = ? AND ma_lk = ? AND trang_thai IN (${THB_MO_LOCAL.map(() => "?").join(",")}) LIMIT 1`)
      .bind(unitId, it.ma_lk, ...THB_MO_LOCAL)
      .first();
    if (co) continue;
    await db
      .prepare(
        "INSERT INTO thieu_hang_bh (unit_id, ma_lk, so_luong, ly_do, ghi_chu, nguon, nguoi_bao, ngay_bao, trang_thai, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Cho gui', ?)",
      )
      .bind(unitId, it.ma_lk, Math.max(1, Math.min(999, Math.round(it.so_luong) || 1)), lyDo, ghiChu ?? null, nguon, actor, now, now)
      .run();
    n++;
  }
  if (n) coYeuCauMoi = true;
  return n;
}

async function logDonVi(db: D1Database, unitId: string, actor: string, ghiChu: string) {
  const u = await db.prepare("SELECT trang_thai FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(unitId).first<{ trang_thai: string }>();
  await db
    .prepare("INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu) VALUES ('phieu_sc_ct', ?, ?, ?, ?, ?, ?)")
    .bind(unitId, u?.trang_thai ?? null, u?.trang_thai ?? null, actor, nowVN(), ghiChu)
    .run();
}

interface ChoGuiRow {
  id: number;
  unit_id: string;
  ma_lk: string;
  ma_nguon: string;
  ten_lk: string | null;
  so_luong: number;
  ly_do: string | null;
  ghi_chu: string | null;
  nguoi_bao: string;
  nguoi_bao_ten: string | null;
  case_id: string | null;
  mien: string | null;
  ktv_email: string | null;
  ktv_ten: string | null;
}

/** Gui cac yeu cau chua co ticket sang linh-kien-app. */
export async function guiThieuHangCho(env: Env): Promise<{ da_gui: number; loi?: string }> {
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { da_gui: 0, loi: "CHUA_CAU_HINH" };
  const db = env.DB;
  const { results } = await db
    .prepare(
      `SELECT t.id, t.unit_id, t.ma_lk, COALESCE(l.ma_lk_nguon, t.ma_lk) AS ma_nguon, l.ten_lk, t.so_luong, t.ly_do, t.ghi_chu, t.nguoi_bao,
              ub.ten AS nguoi_bao_ten, p.case_id, p.mien, g.nguoi_tao AS ktv_email,
              COALESCE((SELECT k.ten_hien_thi FROM ktv_lien_he_bh k WHERE k.email_dang_nhap = g.nguoi_tao LIMIT 1), uk.ten) AS ktv_ten
       FROM thieu_hang_bh t
       JOIN phieu_sua_chua_bh_ct u ON u.id = t.unit_id
       JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       LEFT JOIN linh_kien_bh l ON l.ma_lk = t.ma_lk
       LEFT JOIN users ub ON ub.email = t.nguoi_bao
       LEFT JOIN users uk ON uk.email = g.nguoi_tao
       WHERE t.ticket_id IS NULL AND t.trang_thai = 'Cho gui' ORDER BY t.id LIMIT 100`,
    )
    .all<ChoGuiRow>();
  if (!results.length) return { da_gui: 0 };
  const now = nowVN();
  try {
    const res = await env.LINHKIEN_SERVICE.fetch("https://linhkien/api/suachua-partner/thieu-hang-bh", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
      body: JSON.stringify({
        items: results.map((r) => ({
          nguon_id: r.unit_id, ma_lk: r.ma_nguon, ten_lk: r.ten_lk, so_luong: r.so_luong, ly_do: r.ly_do, ghi_chu: r.ghi_chu,
          mien: r.mien, case_id: r.case_id, ktv_email: r.ktv_email, ktv_ten: r.ktv_ten, nguoi_bao: r.nguoi_bao, nguoi_bao_ten: r.nguoi_bao_ten,
        })),
      }),
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const data = (await res.json()) as { rows?: { nguon_id: string; ma_lk: string; id: string; trang_thai: string; moi: boolean }[] };
    const map = new Map((data.rows ?? []).map((x) => [`${x.nguon_id}|${x.ma_lk}`, x]));
    let n = 0;
    for (const r of results) {
      const x = map.get(`${r.unit_id}|${r.ma_nguon}`);
      if (!x) continue;
      await db
        .prepare("UPDATE thieu_hang_bh SET ticket_id = ?, trang_thai = ?, loi_gui = NULL, cap_nhat_lk = ?, updated_at = ? WHERE id = ? AND ticket_id IS NULL")
        .bind(x.id, x.trang_thai, now, now, r.id)
        .run();
      await logDonVi(db, r.unit_id, r.nguoi_bao, `📦 Đã báo thiếu hàng sang Kho / Mua hàng (app Đặt mua linh kiện): ${r.ten_lk ?? r.ma_lk} × ${r.so_luong} — ticket ${x.id}${x.moi ? "" : " (ticket đang mở sẵn)"}`);
      n++;
    }
    return { da_gui: n };
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e);
    await db.batch(results.map((r) => db.prepare("UPDATE thieu_hang_bh SET loi_gui = ?, updated_at = ? WHERE id = ?").bind(loi.slice(0, 200), now, r.id)));
    return { da_gui: 0, loi };
  }
}

export interface TicketLk {
  id: string;
  nguon_id: string;
  trang_thai: string;
  ngay_du_kien: string | null;
  ma_eo_mua: string | null;
  ghi_chu_xu_ly: string | null;
  nguoi_xu_ly: string | null;
  nguoi_xu_ly_ten?: string | null;
  ngay_cap_nhat: string;
}

/** Ap ban tin ticket tu linh-kien-app vao dong local + ghi nhat ky don vi khi co thay doi. */
/** Push "hang da ve - de xuat linh kien de sua" cho NV sua chua cua don vi (chi khi don vi dang o buoc sua). */
async function baoHangVe(env: Env, unitId: string, maLk: string): Promise<number> {
  const u = await env.DB
    .prepare(
      `SELECT u.nguoi_sua_chua, u.trang_thai, p.case_id, (SELECT ten_lk FROM linh_kien_bh WHERE ma_lk = ?) AS ten
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?`,
    )
    .bind(maLk, unitId)
    .first<{ nguoi_sua_chua: string | null; trang_thai: string; case_id: string | null; ten: string | null }>();
  if (!u?.nguoi_sua_chua || u.trang_thai !== "cho_chan_doan") return 0;
  return sendPushToUser(env, u.nguoi_sua_chua, {
    title: `📦 Hàng đã về — ${unitId}`,
    body: `${u.ten ?? maLk}${u.case_id ? ` (case ${u.case_id})` : ""} đã về kho. Vào đơn bấm "+ Đề xuất linh kiện" để đặt sửa chữa.`,
    url: "/don?tab=nv",
  });
}

export async function apDungTicketLk(env: Env, rows: TicketLk[]): Promise<number> {
  const db = env.DB;
  let n = 0;
  for (const t of rows) {
    if (!t?.id || !t.trang_thai) continue;
    const cur = await db
      .prepare("SELECT id, unit_id, ma_lk, trang_thai, ngay_du_kien, ma_eo_mua, cap_nhat_lk FROM thieu_hang_bh WHERE ticket_id = ?")
      .bind(t.id)
      .first<{ id: number; unit_id: string; ma_lk: string; trang_thai: string; ngay_du_kien: string | null; ma_eo_mua: string | null; cap_nhat_lk: string | null }>();
    if (!cur) continue;
    if (cur.cap_nhat_lk && t.ngay_cap_nhat && cur.cap_nhat_lk > t.ngay_cap_nhat) continue; // ban tin cu den muon
    const doi = cur.trang_thai !== t.trang_thai || (cur.ngay_du_kien ?? "") !== (t.ngay_du_kien ?? "") || (cur.ma_eo_mua ?? "") !== (t.ma_eo_mua ?? "");
    const now = nowVN();
    await db
      .prepare(
        `UPDATE thieu_hang_bh SET trang_thai = ?, ngay_du_kien = ?, ma_eo_mua = ?, ghi_chu_xu_ly = ?, nguoi_xu_ly = ?, cap_nhat_lk = ?,
           da_xem = CASE WHEN ? THEN 0 ELSE da_xem END, updated_at = ? WHERE id = ?`,
      )
      .bind(t.trang_thai, t.ngay_du_kien, t.ma_eo_mua, t.ghi_chu_xu_ly, t.nguoi_xu_ly_ten || t.nguoi_xu_ly, t.ngay_cap_nhat, doi ? 1 : 0, now, cur.id)
      .run();
    if (doi) {
      const parts = [
        `📦 Thiếu hàng ${t.id}: ${THB_LABEL[t.trang_thai] ?? t.trang_thai}`,
        t.ngay_du_kien ? `Dự kiến có hàng: ${t.ngay_du_kien}` : null,
        t.ma_eo_mua ? `Mã EO: ${t.ma_eo_mua}` : null,
        t.ghi_chu_xu_ly ? `Ghi chú: ${t.ghi_chu_xu_ly}` : null,
      ].filter(Boolean);
      await logDonVi(db, cur.unit_id, t.nguoi_xu_ly_ten || t.nguoi_xu_ly || "Kho (app Đặt mua LK)", parts.join(" | "));
      n++;
      // v1.164: vua chuyen sang "Hang da ve" -> push ngay cho NV sua chua duoc giao (don vi con dang sua) de vao de xuat linh kien.
      if (t.trang_thai === "Kho xac nhan hang da ve" && cur.trang_thai !== t.trang_thai) await baoHangVe(env, cur.unit_id, cur.ma_lk).catch(() => 0);
    }
  }
  return n;
}

/** Cron: gui yeu cau con cho + keo thay doi ticket theo con tro. */
export async function dongBoThieuHang(env: Env): Promise<{ da_gui: number; cap_nhat: number; loi?: string }> {
  const gui = await guiThieuHangCho(env);
  if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { ...gui, cap_nhat: 0 };
  const coTicket = await env.DB.prepare("SELECT 1 FROM thieu_hang_bh WHERE ticket_id IS NOT NULL LIMIT 1").first();
  if (!coTicket) return { ...gui, cap_nhat: 0 };
  const st = await env.DB.prepare("SELECT key, value FROM sync_state WHERE key IN ('thb_since', 'thb_after')").all<{ key: string; value: string }>();
  let since = st.results.find((r) => r.key === "thb_since")?.value ?? "";
  let after = st.results.find((r) => r.key === "thb_after")?.value ?? "";
  let capNhat = 0;
  try {
    for (let vong = 0; vong < 5; vong++) {
      const res = await env.LINHKIEN_SERVICE.fetch(
        `https://linhkien/api/suachua-partner/thieu-hang-bh?since=${encodeURIComponent(since)}&after_id=${encodeURIComponent(after)}&limit=200`,
        { headers: { "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY } },
      );
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const data = (await res.json()) as { rows?: TicketLk[]; het?: boolean };
      const rows = data.rows ?? [];
      capNhat += await apDungTicketLk(env, rows);
      if (rows.length) {
        since = rows[rows.length - 1].ngay_cap_nhat;
        after = rows[rows.length - 1].id;
      }
      if (data.het !== false || !rows.length) break;
    }
    const now = nowVN();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('thb_since', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(since, now),
      env.DB.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('thb_after', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(after, now),
    ]);
    return { ...gui, cap_nhat: capNhat };
  } catch (e) {
    return { ...gui, cap_nhat: capNhat, loi: e instanceof Error ? e.message : String(e) };
  }
}

/** Admin BH rut lai bao thieu (ticket dang mo). */
export async function huyThieuHang(env: Env, id: number, actor: string, lyDo: string): Promise<{ error?: string }> {
  const row = await env.DB.prepare("SELECT id, unit_id, ticket_id, trang_thai FROM thieu_hang_bh WHERE id = ?").bind(id).first<{ id: number; unit_id: string; ticket_id: string | null; trang_thai: string }>();
  if (!row) return { error: "NOT_FOUND" };
  if (!THB_MO_LOCAL.includes(row.trang_thai)) return { error: "WRONG_STATE" };
  const now = nowVN();
  if (row.ticket_id) {
    if (!env.LINHKIEN_SERVICE || !env.LINHKIEN_SYNC_API_KEY) return { error: "LINHKIEN_CHUA_CAU_HINH" };
    const res = await env.LINHKIEN_SERVICE.fetch(`https://linhkien/api/suachua-partner/thieu-hang-bh/${encodeURIComponent(row.ticket_id)}/huy`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Sync-Key": env.LINHKIEN_SYNC_API_KEY },
      body: JSON.stringify({ nguoi: actor, ly_do: lyDo }),
    }).catch(() => null);
    if (!res) return { error: "LINHKIEN_KHONG_PHAN_HOI" };
    const data = (await res.json().catch(() => ({}))) as { rows?: TicketLk[]; error?: string };
    if (!res.ok) {
      // Ticket da dong ben kia (vd Kho vua xac nhan hang ve) -> keo trang thai moi ve, bao loi de nguoi dung thay.
      if (data.error === "WRONG_STATE") await dongBoThieuHang(env).catch(() => undefined);
      return { error: data.error === "WRONG_STATE" ? "TICKET_DA_DONG" : data.error ?? `HTTP_${res.status}` };
    }
    await apDungTicketLk(env, data.rows ?? []);
  } else {
    await env.DB.prepare("UPDATE thieu_hang_bh SET trang_thai = 'Da huy', ghi_chu_xu_ly = ?, nguoi_xu_ly = ?, updated_at = ?, da_xem = 1 WHERE id = ?").bind(lyDo || null, actor, now, id).run();
    await logDonVi(env.DB, row.unit_id, actor, `📦 Rút lại báo thiếu hàng (chưa gửi sang Kho)${lyDo ? `: ${lyDo}` : ""}`);
  }
  await env.DB.prepare("UPDATE thieu_hang_bh SET da_xem = 1 WHERE id = ?").bind(id).run();
  return {};
}
