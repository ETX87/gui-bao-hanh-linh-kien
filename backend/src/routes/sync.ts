import { HANG_SQL, DOI_TAC_TEN_SQL, DOI_TAC_KAROFI_SQL } from "../lib/doiTac";
import { dongBoTaiKhoan } from "../lib/taiKhoan";
import { bumpLinhKienVersion } from "../lib/linhKienVersion";
import { Hono } from "hono";
import type { Env } from "../types";
import { nowVN } from "../lib/vnTime";
import { apDungTicketLk, type TicketLk } from "../lib/thieuHang";

// Giai doan 5: nhan du lieu "day" (push) tu linh-kien-app - KTV/Khu vuc/danh muc linh kien. Mirror
// dung khuon POST /api/partner/sync/ktv|linh-kien da co that ben dvbh (routes/partnerApi.ts cua
// cloudflare smarttrade base) + THEM entity "khu-vuc" (chua co san ben dvbh). Xac thuc bang 1 secret
// dung chung don gian (X-Sync-Key header, Env.LINHKIEN_SYNC_API_KEY) - khong dung bang nhieu-key vi
// day la quan he 1-1 co dinh. Mount o "/api/partner/sync" (xem index.ts), tach biet session cookie.
//
// LUU Y (Giai doan 5 CHUA hoan tat): route nay san sang NHAN, nhung ben PHAT (linh-kien-app) CHUA
// duoc sua de goi sang day (can them Service Binding + nhan ban dvbhSyncClient.ts o repo do - xem
// CLAUDE.md muc "Chot 5 cau hoi mo..."). Chua co du lieu that se day toi day cho tro trien khai xong
// ben linh-kien-app.

const sync = new Hono<{ Bindings: Env }>();

sync.use("*", async (c, next) => {
  const key = c.req.header("X-Sync-Key");
  if (!key || !c.env.LINHKIEN_SYNC_API_KEY || key !== c.env.LINHKIEN_SYNC_API_KEY) {
    return c.json({ error: "INVALID_SYNC_KEY" }, 401);
  }
  await next();
});

interface KtvSyncRow {
  ma_ktv?: string;
  ten_hien_thi?: string;
  sdt?: string;
  gmail?: string;
  email_dang_nhap?: string;
  vai_tro_ktv?: string;
  khu_vuc_ma?: string;
  ktv_cap1_phu_trach?: string;
}

// POST /api/partner/sync/ktv - { rows: KtvSyncRow[] } - upsert ktv_lien_he_bh theo ma_ktv.
sync.post("/ktv", async (c) => {
  const body = await c.req.json<{ rows?: KtvSyncRow[] }>().catch(() => ({}) as { rows?: KtvSyncRow[] });
  if (!Array.isArray(body.rows)) return c.json({ error: "INVALID_BODY" }, 400);
  const now = nowVN();
  const statements = [];
  let skipped = 0;
  for (const row of body.rows) {
    if (!row.ma_ktv) {
      skipped++;
      continue;
    }
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO ktv_lien_he_bh (ma_ktv, ten_hien_thi, sdt, gmail, email_dang_nhap, vai_tro_ktv, khu_vuc_ma, ktv_cap1_phu_trach, nguon_du_lieu, dong_bo_luc)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dong_bo', ?)
         ON CONFLICT(ma_ktv) DO UPDATE SET
           ten_hien_thi = excluded.ten_hien_thi, sdt = excluded.sdt, gmail = excluded.gmail,
           email_dang_nhap = excluded.email_dang_nhap, vai_tro_ktv = excluded.vai_tro_ktv,
           khu_vuc_ma = excluded.khu_vuc_ma, ktv_cap1_phu_trach = excluded.ktv_cap1_phu_trach,
           nguon_du_lieu = 'dong_bo', dong_bo_luc = excluded.dong_bo_luc`,
      ).bind(row.ma_ktv, row.ten_hien_thi ?? null, row.sdt ?? null, row.gmail ?? null, row.email_dang_nhap ?? null, row.vai_tro_ktv ?? null, row.khu_vuc_ma ?? null, row.ktv_cap1_phu_trach ?? null, now),
    );
  }
  if (statements.length) {
    await c.env.DB.batch(statements);
  }
  // 16/10/2026: KTV moi ve danh ba (linh-kien-app tu tao tu ETX) -> tai khoan dang "Cho duyet" cung Gmail duoc duyet ngay,
  // khong doi lan dang nhap sau.
  // 04/11/2026: dong bo luon ten cong ty + co KTV cho tai khoan chua co vai tro (lib/taiKhoan.ts).
  const tuDuyet = statements.length ? (await dongBoTaiKhoan(c.env.DB)).tu_duyet : 0;
  return c.json({ upserted: statements.length, skipped, tu_duyet: tuDuyet });
});

interface KhuVucSyncRow {
  ma?: string;
  ten?: string;
  gs_email?: string;
}

// POST /api/partner/sync/khu-vuc - { rows: KhuVucSyncRow[] } - upsert khu_vuc_bh theo ma.
sync.post("/khu-vuc", async (c) => {
  const body = await c.req.json<{ rows?: KhuVucSyncRow[] }>().catch(() => ({}) as { rows?: KhuVucSyncRow[] });
  if (!Array.isArray(body.rows)) return c.json({ error: "INVALID_BODY" }, 400);
  const now = nowVN();
  const statements = [];
  let skipped = 0;
  let upserted = 0;
  for (const row of body.rows) {
    if (!row.ma || !row.ten) {
      skipped++;
      continue;
    }
    // 01/11/2026: danh sach GS cua Khu vuc (khu_vuc_gs_bh). GS chinh cu (nguon 'linhkien') khong con la GS chinh -> bo (CHAY
    // TRUOC khi ghi de khu_vuc_bh.gs_email de subquery doc dung GS cu); neu nguoi do van la GS phu ben linh-kien-app, lan dong bo
    // user_khu_vuc ke tiep (lib/userKhuVucSync.ts, moi gio) them lai. GS qtri gan tay ben nay (nguon 'tay') giu nguyen.
    const gsMoi = row.gs_email?.trim().toLowerCase() || null;
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM khu_vuc_gs_bh WHERE khu_vuc_ma = ? AND nguon = 'linhkien' AND gs_email IN (SELECT LOWER(TRIM(gs_email)) FROM khu_vuc_bh WHERE ma = ? AND gs_email IS NOT NULL) AND gs_email <> COALESCE(?, '')",
      ).bind(row.ma, row.ma, gsMoi),
    );
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO khu_vuc_bh (ma, ten, gs_email, dong_bo_luc) VALUES (?, ?, ?, ?)
         ON CONFLICT(ma) DO UPDATE SET ten = excluded.ten, gs_email = excluded.gs_email, dong_bo_luc = excluded.dong_bo_luc`,
      ).bind(row.ma, row.ten, row.gs_email ?? null, now),
    );
    if (gsMoi) statements.push(c.env.DB.prepare("INSERT OR IGNORE INTO khu_vuc_gs_bh (khu_vuc_ma, gs_email, nguon) VALUES (?, ?, 'linhkien')").bind(row.ma, gsMoi));
    upserted++;
  }
  if (statements.length) {
    await c.env.DB.batch(statements);
  }
  return c.json({ upserted, skipped });
});

interface LinhKienSyncRow {
  ma_linh_kien?: string;
  ten_linh_kien?: string;
  don_vi?: string;
  ghi_chu?: string;
  anh_demo?: string;
  bat_tat?: boolean;
}

// POST /api/partner/sync/linh-kien - { rows: LinhKienSyncRow[] } - upsert linh_kien_bh theo
// ma_lk_nguon, CHI cac dong co bat_tat=1 (chot 03/09/2026: "Lay toan bo danh sach linh kien ban
// bat_tat=1", khong loc chi_sua_chua). GHI DE cac cot chung tu linh-kien-app - GIU NGUYEN 2 cot rieng
// cua bao hanh (so_thang_bao_hanh, duoc_dung_bao_hanh) neu dong da ton tai (Admin BH tu chinh).
sync.post("/linh-kien", async (c) => {
  const body = await c.req.json<{ rows?: LinhKienSyncRow[] }>().catch(() => ({}) as { rows?: LinhKienSyncRow[] });
  if (!Array.isArray(body.rows)) return c.json({ error: "INVALID_BODY" }, 400);
  const now = nowVN();
  const statements = [];
  let skipped = 0;
  for (const row of body.rows) {
    if (!row.ma_linh_kien || !row.ten_linh_kien) {
      skipped++;
      continue;
    }
    if (row.bat_tat === false) {
      // Linh kien vua bi tat ben linh-kien-app - KHONG xoa (co the da dung trong don bao hanh cu),
      // chi ngung dong bo tiep (bo qua dong nay, giu nguyen ban sao hien co).
      skipped++;
      continue;
    }
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO linh_kien_bh (ma_lk, ten_lk, don_vi, ghi_chu, anh_demo, nguon_du_lieu, ma_lk_nguon, dong_bo_luc, ngay_cap_nhat)
         VALUES (?, ?, ?, ?, ?, 'dong_bo', ?, ?, ?)
         ON CONFLICT(ma_lk) DO UPDATE SET
           ten_lk = excluded.ten_lk, don_vi = CASE WHEN linh_kien_bh.don_vi_cho_day = 1 THEN linh_kien_bh.don_vi ELSE excluded.don_vi END, ghi_chu = excluded.ghi_chu,
           anh_demo = excluded.anh_demo, ma_lk_nguon = excluded.ma_lk_nguon, dong_bo_luc = excluded.dong_bo_luc, ngay_cap_nhat = excluded.ngay_cap_nhat`,
      ).bind(row.ma_linh_kien, row.ten_linh_kien, row.don_vi ?? null, row.ghi_chu ?? null, row.anh_demo ?? null, row.ma_linh_kien, now, now),
    );
  }
  if (statements.length) {
    await c.env.DB.batch(statements);
    await bumpLinhKienVersion(c.env.DB);
  }
  return c.json({ upserted: statements.length, skipped });
});

// POST /api/partner/sync/thieu-hang - { rows: TicketLk[] } (04/11/2026) - linh-kien-app bao trang thai moi cua ticket thieu hang bao hanh.
sync.post("/thieu-hang", async (c) => {
  const body = await c.req.json<{ rows?: TicketLk[] }>().catch(() => ({}) as { rows?: TicketLk[] });
  if (!Array.isArray(body.rows) || body.rows.length > 500) return c.json({ error: "INVALID_BODY" }, 400);
  return c.json({ cap_nhat: await apDungTicketLk(c.env.DB, body.rows) });
});


// GET /api/partner/sync/don-vi-sua-chua?email=&q=&ma= (16/11/2026, v1.131 + linh-kien-app v1.496) - linh-kien-app goi qua Service Binding de
// GOI Y "Mã đơn bảo hành" khi NV sua chua dat loai "CÔNG NỢ SỬA CHỮA" (o chon co goi y, van cho nhap tay ma ngoai app nay).
//  - ma=<id>: tra dung 1 don vi (hoac don cha) - linh-kien-app xac minh lien ket luc tao don.
//  - q (>= 2 ky tu): tim theo ma don vi / ma don cha / ma case o MOI trang thai (TN / GS dat ho, don da qua buoc sua), toi da 20.
//  - mac dinh: don vi NV (email) dang sua (trang_thai 'cho_chan_doan'), moi cap nhat truoc, toi da 100.
// CHI DOC, khong ghi gi. v1.132: san pham / ten khach cua don co case lay tu bang chung case (case_lookup_snapshot), khach le
// tu danh ba khach_hang_bh - 2 cot tren don cha chi dien voi don khach le nhap tay nen truoc day hau het tra NULL.
const DON_VI_COT = `u.id, u.parent_id, p.case_id, COALESCE(u.ma_lk_thuc_te, p.ma_lk) AS ma_lk,
  (SELECT l.ten_lk FROM linh_kien_bh l WHERE l.ma_lk = COALESCE(u.ma_lk_thuc_te, p.ma_lk)) AS ten_lk,
  COALESCE(NULLIF(TRIM(p.san_pham_bh), ''), CASE WHEN json_valid(s.data) THEN json_extract(s.data, '$.san_pham_bao_hanh') END) AS san_pham_bh,
  COALESCE(NULLIF(TRIM(p.ten_khach_hang), ''), (SELECT kh.ten FROM khach_hang_bh kh WHERE kh.id = p.khach_hang_id),
    CASE WHEN json_valid(s.data) THEN json_extract(s.data, '$.khach_hang') END) AS ten_khach_hang,
  u.trang_thai, u.nguoi_sua_chua,
  ${HANG_SQL("p")} AS hang, ${DOI_TAC_TEN_SQL("p")} AS doi_tac, ${DOI_TAC_KAROFI_SQL("p")} AS doi_tac_karofi, u.loai_bao_hanh, u.huong_xu_ly`;
// 16/11/2026 (v1.142): + hang / doi_tac / doi_tac_karofi / loai_bao_hanh -> linh-kien-app tu chon loai de xuat cap linh kien (Karofi con BH =
// HỖ TRỢ SỬA CHỮA 0 ĐỒNG, doi tac khac con BH = CÔNG NỢ SỬA CHỮA, het BH = MUA HÀNG SỬA CHỮA - lib/doiTac.ts loaiDeXuatSuaChua).
sync.get("/don-vi-sua-chua", async (c) => {
  const email = (c.req.query("email") ?? "").trim().toLowerCase();
  const q = (c.req.query("q") ?? "").trim().toUpperCase();
  const ma = (c.req.query("ma") ?? "").trim().toUpperCase();
  const tu = "FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN case_lookup_snapshot s ON s.case_id = p.case_id";
  if (ma) {
    const r =
      (await c.env.DB.prepare(`SELECT ${DON_VI_COT} ${tu} WHERE u.id = ?`).bind(ma).first()) ??
      (await c.env.DB.prepare(`SELECT ${DON_VI_COT} ${tu} WHERE u.parent_id = ? ORDER BY u.so_thu_tu LIMIT 1`).bind(ma).first());
    return c.json({ row: r ?? null });
  }
  if (q.length >= 2) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const { results } = await c.env.DB.prepare(
      `SELECT ${DON_VI_COT} ${tu} WHERE u.id LIKE ? OR UPPER(COALESCE(p.case_id, '')) LIKE ?
       ORDER BY (u.trang_thai = 'cho_chan_doan') DESC, u.updated_at DESC LIMIT 20`,
    ).bind(like, like).all();
    return c.json({ rows: results });
  }
  if (!email) return c.json({ rows: [] });
  const { results } = await c.env.DB.prepare(
    `SELECT ${DON_VI_COT} ${tu} WHERE u.trang_thai = 'cho_chan_doan' AND LOWER(u.nguoi_sua_chua) = ? ORDER BY u.updated_at DESC LIMIT 100`,
  ).bind(email).all();
  return c.json({ rows: results });
});

export default sync;
