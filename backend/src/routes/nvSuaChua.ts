import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";
import { nowVN } from "../lib/vnTime";
import { addLog } from "../lib/logs";
import { isOverdue } from "../lib/sla";
import { LBL, KET_QUA_NV_VALUES, KET_QUA_NV_TO_CU, type KetQuaNv } from "../lib/constants";
import { parsePage } from "../lib/pagination";

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
  const [{ results }, totalRow] = await Promise.all([
    c.env.DB.prepare(
      `SELECT u.*, p.case_id, p.ma_lk, p.mo_ta_loi, p.phieu_gui_id,
         (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai = 'cho_cap') AS so_dx_cho_cap,
         (SELECT COUNT(*) FROM de_xuat_linh_kien_bh d WHERE d.unit_id = u.id AND d.trang_thai = 'da_cap') AS so_dx_da_cap
       FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id
       WHERE u.trang_thai = 'cho_chan_doan' AND u.nguoi_sua_chua = ? ORDER BY u.updated_at LIMIT ? OFFSET ?`,
    )
      .bind(user.email, limit, offset)
      .all(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM phieu_sua_chua_bh_ct WHERE trang_thai = 'cho_chan_doan' AND nguoi_sua_chua = ?").bind(user.email).first<{ cnt: number }>(),
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
  await c.env.DB.prepare("UPDATE phieu_sua_chua_bh_ct SET ket_qua_nv = ?, ket_qua_chan_doan = ?, trang_thai = 'cho_admin_xac_nhan', updated_at = ? WHERE id = ?")
    .bind(body.ket_qua_chan_doan, KET_QUA_NV_TO_CU[body.ket_qua_chan_doan] ?? null, now, id)
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

  await addLog(c.env.DB, "phieu_sc_ct", id, "cho_chan_doan", "cho_admin_xac_nhan", user.email, "NV nộp kết quả: " + (LBL[body.ket_qua_chan_doan] || body.ket_qua_chan_doan) + (huy.meta.changes ? ` | Tự huỷ ${huy.meta.changes} đề xuất linh kiện chưa cấp` : "") + (body.ly_do_cham ? ` | Lý do chậm: ${body.ly_do_cham}` : ""));
  return c.json({ ok: true });
});

export default nvSuaChua;
