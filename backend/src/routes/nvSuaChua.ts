import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";
import { LBL, KHACH_LE_KEY, KET_QUA_NV_VALUES, KET_QUA_NV_TO_CU, type KetQuaNv } from "../lib/constants";
import { eqFilters, distinctOpts, timeFilter, slaFilter, joinF } from "../lib/filters";
import { kwClause, tenOf, tenLkOf } from "../lib/search";
import { parsePage } from "../lib/pagination";
import { nextSequentialId } from "../lib/idCounter";
import { syncPhieuTraMien } from "../lib/mien";
import { pushBoxToKhovan } from "../lib/khovanPushClient";

// Man hinh NV sua chua - "Viec cua toi" + Chan doan. Anh luu dang data URL (base64) truc tiep trong
// cot TEXT - dung quyet dinh "KHONG dung R2" da chot cho he nay (giong prototype fileToBase64()).

const nvSuaChua = new Hono<{ Bindings: Env }>();
nvSuaChua.use("*", verifySessionMiddleware, loadUser);

// la_qtri di qua duoc moi cong vai tro - xem CLAUDE.md muc "Vai tro Admin nhin duoc tat ca modules".
function requireNv(c: { get(k: "user"): { la_nv_sua_chua: boolean; la_qtri: boolean } }) {
  const u = c.get("user");
  return u.la_nv_sua_chua || u.la_qtri;
}

nvSuaChua.get("/viec-cua-toi", async (c) => {
  const user = c.get("user");
  if (!requireNv(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const { limit, offset } = parsePage(c);
  // JOIN don cha (Phat hien 3 vong ra soat UX 08/09/2026): ma_lk / mo_ta_loi / case_id nam o don CHA,
  // ban cu chi SELECT * FROM phieu_sua_chua_bh_ct nen hang doi cua NV TRONG cot "Linh kien" + "Mo ta
  // loi" - dung y het cach GET /admin/don-vi da JOIN.
  const kw = kwClause(c.req.query("q"), ["u.id", "p.id", "p.case_id", "p.ma_lk", "u.ma_lk_thuc_te", "u.ma_lk_nhan", "p.mo_ta_loi", "p.phieu_gui_id", "p.ten_khach_hang", tenLkOf("COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)"),
    "(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)", tenOf("(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)"),
    "(SELECT s.data FROM case_lookup_snapshot s WHERE s.case_id = p.case_id)"], ["p.tim_kiem"]);
  // 21/10/2026: loc KTV gui / linh kien / huong xu ly / bao hanh.
  const LOC = { ktv: "(SELECT g.nguoi_tao FROM phieu_gui_bh g WHERE g.id = p.phieu_gui_id)", lk_a: "p.ma_lk", lk_b: "COALESCE(u.ma_lk_nhan, p.ma_lk)", lk: "COALESCE(u.ma_lk_thuc_te, u.ma_lk_nhan, p.ma_lk)", huong_xu_ly: "u.huong_xu_ly", loai_bao_hanh: "u.loai_bao_hanh" };
  if (c.req.query("loc_only")) {
    return c.json({ loc: await distinctOpts(c.env.DB, LOC, "FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'cho_chan_doan' AND u.nguoi_sua_chua = ?", [user.email]) });
  }
  const f = joinF(eqFilters(c, LOC), timeFilter(c, "p.created_at"), slaFilter(c, "u.updated_at"));
  kw.sql += f.sql;
  kw.binds.push(...(f.binds as string[]));
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.phieu_gui_id,
         (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai IN ('cho_cap', 'cho_ke_toan')) AS so_dx_cho_cap,
         (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai = 'da_cap') AS so_dx_da_cap
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE u.trang_thai = 'cho_chan_doan' AND u.nguoi_sua_chua = ?${kw.sql} ORDER BY u.updated_at LIMIT ? OFFSET ?`,
    )
      .bind(user.email, ...kw.binds, limit, offset)
      .all(),
    c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.trang_thai = 'cho_chan_doan' AND u.nguoi_sua_chua = ?${kw.sql}`).bind(user.email, ...kw.binds).first<{ cnt: number }>(),
  ]);
  return c.json({ don_vi: results, total: totalRow?.cnt ?? 0 });
});

interface ChanDoanBody {
  // 12/10/2026: 4 ket qua moi (KET_QUA_NV_VALUES). Giu ten truong ket_qua_chan_doan cho API.
  ket_qua_chan_doan?: KetQuaNv;
  anh_truoc?: string[];
  anh_sau?: string[];
  anh_loi_thuc_te?: string[];
  ly_do_cham?: string;
  ghi_chu?: string;
}

nvSuaChua.post("/don-vi/:id/chan-doan", async (c) => {
  const user = c.get("user");
  if (!requireNv(c)) return c.json({ error: "FORBIDDEN" }, 403);
  const id = c.req.param("id");
  const u = await c.env.DB.prepare("SELECT trang_thai, updated_at, nguoi_sua_chua FROM phieu_sua_chua_bh_ct WHERE id = ?").bind(id).first<{ trang_thai: string; updated_at: string; nguoi_sua_chua: string | null }>();
  if (!u) return c.json({ error: "NOT_FOUND" }, 404);
  if (u.trang_thai !== "cho_chan_doan" || u.nguoi_sua_chua !== user.email) return c.json({ error: "FORBIDDEN" }, 403);

  const body = await c.req.json<ChanDoanBody>().catch(() => ({}) as ChanDoanBody);
  if (!body.ket_qua_chan_doan || !KET_QUA_NV_VALUES.includes(body.ket_qua_chan_doan)) return c.json({ error: "INVALID_KET_QUA" }, 400);
  if (isOverdue(u.updated_at) && !body.ly_do_cham?.trim()) return c.json({ error: "REQUIRE_LY_DO_CHAM" }, 400);

  const now = nowVN();
  const ghiChu = (body.ghi_chu || "").trim().slice(0, 2000) || null;
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET ket_qua_nv = ?, ket_qua_chan_doan = ?, ghi_chu_nv = ?, trang_thai = 'cho_admin_xac_nhan', updated_at = ? WHERE id = ?")
    .bind(body.ket_qua_chan_doan, KET_QUA_NV_TO_CU[body.ket_qua_chan_doan] ?? null, ghiChu, now, id)
    .run();
  // De xuat linh kien con cho cap luc NV chot ket qua -> tu huy (khong con can).
  const huy = await c.env.DB.prepare("UPDATE de_xuat_linh_kien_bh SET trang_thai = 'huy', ly_do_tu_choi = 'Tự huỷ khi NV nộp kết quả', nguoi_xu_ly = ?, xu_ly_luc = ?, updated_at = ? WHERE unit_id = ? AND trang_thai = 'cho_cap'")
    .bind(user.email, now, now, id)
    .run();

  const statements = [];
  for (const url of body.anh_truoc || []) statements.push(c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct_anh (unit_id, loai, anh_url) VALUES (?, 'truoc', ?)").bind(id, url));
  for (const url of body.anh_sau || []) statements.push(c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct_anh (unit_id, loai, anh_url) VALUES (?, 'sau', ?)").bind(id, url));
  for (const url of body.anh_loi_thuc_te || []) statements.push(c.env.DB.prepare("INSERT INTO phieu_sua_chua_bh_ct_anh (unit_id, loai, anh_url) VALUES (?, 'loi_thuc_te', ?)").bind(id, url));
  if (statements.length) await c.env.DB.batch(statements);

  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_chan_doan", "cho_admin_xac_nhan", user.email, "NV nộp kết quả: " + (LBL[body.ket_qua_chan_doan] || body.ket_qua_chan_doan) + (ghiChu ? ` | Ghi chú: ${ghiChu}` : "") + (huy.meta.changes ? ` | Tự huỷ ${huy.meta.changes} đề xuất linh kiện chưa cấp` : "") + (body.ly_do_cham ? ` | Lý do chậm: ${body.ly_do_cham}` : ""));

  // 20/10/2026: "ktv sửa chữa sửa xong => đẩy sang kho luôn (tự tạo 1 phiếu trả hàng và đẩy qua kho, bỏ qua
  // admin bh xác nhận, bỏ qua kế toán duyệt)". Ket qua "Đã sửa xong" -> tu hoan tat + vao phieu tra trang
  // thai "da_duyet_ke_toan" (cho Kho dong goi/gui). Gop vao phieu NV nay da tu tao trong ngay cho cung KTV +
  // loai doi tru neu Kho chua dong goi; khong thi tao phieu moi + bao sang khovan.
  if (body.ket_qua_chan_doan === "da_sua_xong") {
    const r = await dayThangSangKho(c.env, id, user.email);
    return c.json({ ok: true, phieu_tra_id: r });
  }
  return c.json({ ok: true });
});

async function dayThangSangKho(env: Env, unitId: string, actor: string): Promise<string | null> {
  const db = env.DB;
  const u = await db
    .prepare(`SELECT u.loai_doi_tru, u.phieu_tra_id, g.nguoi_tao AS ktv FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id WHERE u.id = ?`)
    .bind(unitId)
    .first<{ loai_doi_tru: string | null; phieu_tra_id: string | null; ktv: string | null }>();
  if (!u || u.phieu_tra_id) return null;
  const ktvKey = u.ktv ?? KHACH_LE_KEY;
  const loai = u.loai_doi_tru === "tru_cong_no" ? "tru_cong_no" : "doi_tra";
  const now = nowVN();
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET admin_xac_nhan_hoan_tat = 1, trang_thai = 'san_sang_gom_phieu_tra', updated_at = ? WHERE id = ?").bind(now, unitId).run();
  await addLog(db, "phieu_sc_ct", unitId, "cho_admin_xac_nhan", "san_sang_gom_phieu_tra", actor, "Tự hoàn tất (NV đã sửa xong) — đẩy thẳng sang Kho, bỏ qua Admin xác nhận + Kế toán duyệt");
  const existing = await db
    .prepare(
      `SELECT id FROM phieu_tra_bh t WHERE t.trang_thai = 'da_duyet_ke_toan' AND t.nguoi_tao = ? AND t.ktv_nhan = ? AND t.loai_doi_tru = ?
         AND substr(t.created_at, 1, 10) = ? AND NOT EXISTS (SELECT 1 FROM phieu_tra_bh_anh a WHERE a.phieu_tra_id = t.id) ORDER BY t.created_at DESC LIMIT 1`,
    )
    .bind(actor, ktvKey, loai, now.slice(0, 10))
    .first<{ id: string }>();
  if (existing) {
    await db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(existing.id, unitId).run();
    await addLog(db, "phieu_tra", existing.id, "da_duyet_ke_toan", "da_duyet_ke_toan", actor, `Gộp thêm đơn vị ${unitId} (NV sửa xong, đẩy thẳng sang Kho)`);
    await syncPhieuTraMien(db, existing.id);
    return existing.id;
  }
  const id = await nextSequentialId(db, "phieu_tra_bh", "TR");
  await db.prepare("INSERT INTO phieu_tra_bh (id, ktv_nhan, nguoi_tao, trang_thai, loai_doi_tru, ma_don_hang, created_at, updated_at) VALUES (?, ?, ?, 'da_duyet_ke_toan', ?, ?, ?, ?)").bind(id, ktvKey, actor, loai, id, now, now).run();
  await db.prepare("UPDATE phieu_sua_chua_bh_ct SET phieu_tra_id = ? WHERE id = ?").bind(id, unitId).run();
  await syncPhieuTraMien(db, id);
  await addLog(db, "phieu_tra", id, null, "da_duyet_ke_toan", actor, `NV sửa xong ${unitId} — tự tạo phiếu trả, đẩy thẳng sang Kho (bỏ qua Admin xác nhận + Kế toán duyệt)`);
  const ktvInfo = await db.prepare("SELECT ten_hien_thi FROM ktv_lien_he_bh WHERE email_dang_nhap = ?").bind(ktvKey).first<{ ten_hien_thi: string | null }>();
  await pushBoxToKhovan(env, id, `Kho SC-BH (trả cho KTV ${ktvInfo?.ten_hien_thi || ktvKey})`, actor, "Trả bảo hành (NV sửa xong) - chờ Kho đóng gói/gửi");
  return id;
}

export default nvSuaChua;
