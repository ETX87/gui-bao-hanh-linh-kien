import { caseThuocKtv } from "../lib/ktvMa";
import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { lookupCase, lookupCaseEx } from "../lib/caseLookupClient";
import { nowVN } from "../lib/vnTime";
import { goiLinhKien } from "../lib/donScLinhKien";

// GET /api/case-lookup?id=... - proxy tra cuu 1 case_dvbh THEO ID sang he DVBH goc (chi doc), dung
// chung cho autocomplete o form "Them don bao hanh" (KTV) va "Tao don dich vu tinh phi" (Admin BH) -
// xem CLAUDE.md muc "Giai doan 4" (diem da don gian hoa "Bo tra cuu case CRM tu dong", nay bo sung
// lai theo yeu cau "QA vong 2"). Mo cho MOI vai tro da dang nhap (khong rieng KTV/Admin BH) vi
// UnitDetailModal/PhanLoaiModal cung co the can tra lai thong tin case da gan san.
//
// Them ?ktv_email=... (yeu cau 05/09/2026 muc 2, "mã sự cố bắt buộc, phải đúng của KTV đó mới cho
// tạo"): tra them `khopKtv` - so sanh ma KTV trich tu case.ky_thuat_vien (extractMaKtv) voi
// ktv_lien_he_bh.ma_ktv cua chinh KTV dang duoc chi dinh. CHOT strict (nguoi dung xac nhan qua
// AskUserQuestion 05/09/2026): khong the tach duoc ma KTV tu case HOAC KTV do chua co trong danh ba
// deu tra ve khopKtv=false (chan cung, KHAC voi tien le linh-kien-app la de qua khi thieu du lieu) -
// vi day la dieu kien BAT BUOC de duoc tao don, khong phai canh bao mem nhu ben do.
const caseLookup = new Hono<{ Bindings: Env }>();
caseLookup.use("*", verifySessionMiddleware, loadUser);

// 05/11/2026: khop Tram (ky_thuat_vien) HOAC KTV trien khai.
async function computeKhopKtv(db: D1Database, p: { ky_thuat_vien: string | null; ktv_trien_khai?: string | null }, ktvEmail: string): Promise<boolean> {
  return caseThuocKtv(db, p, ktvEmail);
}

import { laCaseHomNay, normCaseId } from "../lib/caseNgay";

caseLookup.get("/", async (c) => {
  const id = normCaseId(c.req.query("id"));
  if (!id) return c.json({ error: "MISSING_ID" }, 400);
  const r = await lookupCaseEx(id, c.env);
  const preview = r.status === "found" ? r.preview : null;
  const ktvEmail = (c.req.query("ktv_email") || "").trim();
  const khopKtv = preview && ktvEmail ? await computeKhopKtv(c.env.DB, preview, ktvEmail) : null;
  // loi_dvbh (30/10/2026): DVBH loi/khong phan hoi - khac "khong tim thay" (cho tao don chua xac minh).
  // cho_dong_bo (03/11/2026): khong thay tren DVBH nhung la case trong ngay (SC+YYMMDD hom nay) -> cho tao, chua xac minh.
  return c.json({ found: !!preview, preview, khopKtv, loi_dvbh: r.status === "error", cho_dong_bo: r.status === "not_found" && laCaseHomNay(id) });
});

// Khoang cach toi thieu giua 2 lan Admin bao hanh bam "Dong bo lai" tren 1 case (tranh spam API doi
// tac) - dung mau CASE_DETAIL_MIN_SYNC_MS cua linh-kien-app. QUAN TRONG: dung nowVN() o CA 2 dau so
// sanh (khong tron voi Date.now() nhu ban goc) - nowVN() ma hoa gio VN bang cach cong 7h roi format
// nhu UTC (xem lib/vnTime.ts), neu tru truc tiep cho Date.now() (epoch that) se lech ~7 tieng va khoa
// nham chuc nang dong bo trong ca 1 phien lam viec - loi tiem an phat hien duoc khi doi chieu, da
// tranh khi port sang day.
const MIN_SYNC_MS = 5000;
function msSinceVN(tsVN: string): number {
  const now = Date.parse(nowVN().replace(" ", "T") + "Z");
  const then = Date.parse(tsVN.replace(" ", "T") + "Z");
  return now - then;
}

// GET /api/case-lookup/lk-da-dat?id=SC123 (v1.150, 20/11/2026) - linh kien DA DAT ben app Dat linh kien cho case nay (bo don bi
// tu choi / huy) -> form them don uu tien cac linh kien nay len dau o chon linh kien. Loi ket noi -> rows rong + loi (form van dung binh thuong).
caseLookup.get("/lk-da-dat", async (c) => {
  const id = normCaseId((c.req.query("id") ?? "").trim());
  if (id.length < 3) return c.json({ rows: [] });
  const r = await goiLinhKien<{ rows: unknown[] }>(c.env, `/lk-theo-case?case_id=${encodeURIComponent(id)}`);
  if (!r.ok) return c.json({ rows: [], loi: r.error });
  return c.json({ rows: Array.isArray(r.data.rows) ? r.data.rows : [] });
});

// GET /api/case-lookup/detail/:id - doc "bang chung" da luu san (case_lookup_snapshot, ghi luc tao
// don qua POST /phieu-gui/:id/don) - CHI doc cache, KHONG tu goi lai API doi tac (dung dung tinh
// than yeu cau "tránh việc phải gọi API liên tục... mỗi khi có người xem thông tin").
caseLookup.get("/detail/:id", async (c) => {
  const id = normCaseId(c.req.param("id"));
  const cached = await c.env.DB.prepare("SELECT data, synced_at FROM case_lookup_snapshot WHERE case_id = ?").bind(id).first<{ data: string; synced_at: string }>();
  if (!cached) return c.json({ found: false, data: null, synced_at: null });
  return c.json({ found: true, data: JSON.parse(cached.data), synced_at: cached.synced_at });
});

// POST /api/case-lookup/detail/:id/sync - Admin bao hanh chu dong lam moi cache (yeu cau 05/09/2026
// muc 2: "Admin bảo hành có thể ấn đồng bộ để cập nhật lại thông tin liên quan đến ca sự cố đó").
caseLookup.post("/detail/:id/sync", async (c) => {
  const user = c.get("user");
  if (!(user.la_admin_bh || user.la_qtri)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = normCaseId(c.req.param("id"));
  const cached = await c.env.DB.prepare("SELECT data, synced_at FROM case_lookup_snapshot WHERE case_id = ?").bind(id).first<{ data: string; synced_at: string }>();
  if (cached && msSinceVN(cached.synced_at) < MIN_SYNC_MS) {
    return c.json({ error: "TOO_SOON", retry_after_ms: MIN_SYNC_MS - msSinceVN(cached.synced_at) }, 429);
  }

  const preview = await lookupCase(id, c.env);
  if (!preview) {
    // Dong bo that bai (API doi tac loi/timeout) KHAC "case khong con ton tai" - giu nguyen du lieu
    // cu + bao syncFailed, khong xoa sach chi vi 1 loi tam thoi.
    if (cached) return c.json({ found: true, data: JSON.parse(cached.data), synced_at: cached.synced_at, sync_failed: true });
    return c.json({ error: "CASE_NOT_FOUND" }, 404);
  }
  const syncedAt = nowVN();
  await c.env.DB.prepare(
    "INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at",
  )
    .bind(id, JSON.stringify(preview), syncedAt)
    .run();
  return c.json({ found: true, data: preview, synced_at: syncedAt });
});

export default caseLookup;
