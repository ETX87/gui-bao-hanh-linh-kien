import { Hono } from "hono";
import type { Env } from "../types";
import { verifySessionMiddleware } from "../middleware/session";
import { loadUser } from "../middleware/loadUser";

// Lich su sua chua bao hanh theo ma Serial hoac ID case (12/10/2026, yeu cau "thêm lịch sử sửa chữa bảo
// hành theo mã Serial hoặc ID case từng xử lý trên hệ thống").
//
// Serial khong nam tren don - lay tu "bang chung case" da luu (case_lookup_snapshot.data.seri_san_pham,
// ghi moi lan tao don co ma case). Khong goi API dvbh: chi tra nhung gi he thong da tung xu ly.
//
// GET /api/lich-su?q=...          - tim theo ma case (chua chuoi) hoac serial
// GET /api/lich-su?case_id=X      - lich su cua san pham cua case X: cac don cung case + cung serial
//                                    (dung trong UI chi tiet don); &exclude=<id don cha> bo don dang xem.
// Pham vi: KTV (khong kem vai tro khac) chi thay don cua chinh minh; vai tro khac thay toan he thong.
const lichSu = new Hono<{ Bindings: Env }>();
lichSu.use("*", verifySessionMiddleware, loadUser);

interface ParentRow {
  id: string;
  case_id: string | null;
  ma_lk: string | null;
  mo_ta_loi: string | null;
  so_luong_khai: number;
  so_luong_thuc_nhan: number | null;
  nguon_tao: string | null;
  ten_khach_hang: string | null;
  san_pham_bh: string | null;
  phieu_gui_id: string | null;
  trang_thai_cha: string;
  created_at: string;
  ktv: string | null;
  odoo_id: number | null;
}

lichSu.get("/", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const q = (c.req.query("q") || "").trim();
  const caseId = (c.req.query("case_id") || "").trim();
  const exclude = (c.req.query("exclude") || "").trim();
  if (!q && !caseId) return c.json({ don: [], case_info: [] });
  if (q && q.length < 3) return c.json({ error: "QUERY_TOO_SHORT" }, 400);

  // 1) Tap ma case can lay.
  const cases = new Set<string>();
  const serials = new Set<string>();
  if (caseId) {
    cases.add(caseId);
    const s = await db
      .prepare("SELECT json_extract(data, '$.seri_san_pham') AS seri FROM case_lookup_snapshot WHERE case_id = ?")
      .bind(caseId)
      .first<{ seri: string | null }>();
    if (s?.seri && s.seri.trim().length >= 3) serials.add(s.seri.trim());
  } else {
    serials.add(q);
  }
  if (serials.size) {
    const like = !caseId && q.length >= 5;
    for (const seri of serials) {
      const { results } = await db
        .prepare(
          like
            ? "SELECT case_id FROM case_lookup_snapshot WHERE LOWER(json_extract(data, '$.seri_san_pham')) LIKE ? LIMIT 200"
            : "SELECT case_id FROM case_lookup_snapshot WHERE LOWER(TRIM(json_extract(data, '$.seri_san_pham'))) = ? LIMIT 200",
        )
        .bind(like ? `%${seri.toLowerCase()}%` : seri.toLowerCase())
        .all<{ case_id: string }>();
      for (const r of results) cases.add(r.case_id);
    }
  }

  // 2) Don cha.
  const onlyOwn = (user.la_ktv_dvbh || user.la_ve_tinh) && !(user.la_qtri || user.la_admin_bh || user.la_kho || user.la_nv_sua_chua || user.la_ke_toan || user.la_giam_sat || user.la_view);
  const where: string[] = [];
  const binds: unknown[] = [];
  const caseCond = ["p.case_id IN (SELECT value FROM json_each(?))"];
  binds.push(JSON.stringify([...cases]));
  if (q) {
    caseCond.push(q.length >= 5 ? "p.case_id LIKE ?" : "p.case_id = ?");
    binds.push(q.length >= 5 ? `%${q}%` : q);
  }
  where.push(`(${caseCond.join(" OR ")})`);
  if (exclude) {
    where.push("p.id <> ?");
    binds.push(exclude);
  }
  if (onlyOwn) {
    where.push("g.nguoi_tao = ?");
    binds.push(user.email);
  }
  const { results: parents } = await db
    .prepare(
      `SELECT p.id, p.case_id, p.ma_lk, p.mo_ta_loi, p.so_luong_khai, p.so_luong_thuc_nhan, p.nguon_tao, p.ten_khach_hang, p.san_pham_bh,
              p.phieu_gui_id, p.trang_thai_cha, p.created_at, p.odoo_id, g.nguoi_tao AS ktv
       FROM phieu_sua_chua_bh p LEFT JOIN phieu_gui_bh g ON g.id = p.phieu_gui_id
       WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC LIMIT 100`,
    )
    .bind(...binds)
    .all<ParentRow>();

  const ids = parents.map((p) => p.id);
  const allCases = [...new Set(parents.map((p) => p.case_id).filter((x): x is string => !!x))];
  const [{ results: units }, { results: info }] = await Promise.all([
    ids.length
      ? db
          .prepare(
            `SELECT id, parent_id, so_thu_tu, trang_thai, huong_xu_ly, loai_bao_hanh, ket_qua_chan_doan, ket_qua_nv, ma_lk_thuc_te, ma_lk_nhan, xu_ly_xac, ly_do_tu_choi,
                    phieu_tra_id, nguoi_sua_chua, so_lan_yeu_cau_lam_lai, updated_at
             FROM phieu_sua_chua_bh_ct WHERE parent_id IN (SELECT value FROM json_each(?)) ORDER BY parent_id, so_thu_tu`,
          )
          .bind(JSON.stringify(ids))
          .all()
      : Promise.resolve({ results: [] as unknown[] }),
    allCases.length
      ? db
          .prepare(
            `SELECT case_id, json_extract(data, '$.seri_san_pham') AS seri, json_extract(data, '$.khach_hang') AS khach_hang,
                    json_extract(data, '$.san_pham_bao_hanh') AS san_pham, json_extract(data, '$.ngay_mua') AS ngay_mua,
                    json_extract(data, '$.link_crm') AS link_crm, json_extract(data, '$.hang') AS hang
             FROM case_lookup_snapshot WHERE case_id IN (SELECT value FROM json_each(?))`,
          )
          .bind(JSON.stringify(allCases))
          .all()
      : Promise.resolve({ results: [] as unknown[] }),
  ]);

  return c.json({ don: parents, don_vi: units, case_info: info, serial: caseId ? ([...serials][0] ?? null) : null });
});

export default lichSu;
