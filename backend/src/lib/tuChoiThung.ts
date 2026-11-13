import type { Env } from "../types";
import { nowVN } from "./vnTime";
import { addLog } from "./logs";

// 13/11/2026 - Admin BH tu choi tiep nhan thung tu Kho (xem CLAUDE.md muc "Admin BH từ chối thùng").
// Luong: Admin tu choi (ly do) -> 'cho_kho' -> Kho dong y (ly do) -> 'cho_ktv' (han 7 ngay) -> KTV dong y / qua han -> huy thung.
// Kho hoac KTV khong dong y (ly do) -> tu_choi_tt = NULL: thung ve luong binh thuong (Kho ban giao / Admin nhan nhu cu).

export const HAN_KTV_NGAY = 7;

export function congNgay(vn: string, ngay: number): string {
  const d = new Date(vn.replace(" ", "T") + "Z");
  return new Date(d.getTime() + ngay * 86400000).toISOString().slice(0, 19).replace("T", " ");
}

export async function ghiTraoDoi(db: D1Database, guiId: string, tacGia: string, noiDung: string): Promise<void> {
  await db.prepare("INSERT INTO phieu_gui_bh_ghi_chu (phieu_gui_id, tac_gia, thoi_gian, noi_dung) VALUES (?, ?, ?, ?)").bind(guiId, tacGia, nowVN(), noiDung).run();
}

// Huy thung: thung -> 'da_huy'; don cha chua tach -> 'huy_thung', go don Odoo (ve "Chua gui", cron bao dvbh xoa trang thai).
export async function huyThung(db: D1Database, guiId: string, nguoi: string, lyDo: string): Promise<boolean> {
  const now = nowVN();
  const st = await db.prepare("SELECT tu_choi_tt FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ tu_choi_tt: string | null }>();
  if (st?.tu_choi_tt !== "cho_ktv") return false;
  const { results: dons } = await db
    .prepare("SELECT id, odoo_id FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha = 'cho_xac_nhan_so_luong'")
    .bind(guiId)
    .all<{ id: string; odoo_id: number | null }>();
  // 1 batch = 1 transaction: cau dau doi trang thai thung (CAS), loi o cau sau thi rollback ca thung.
  const stmts: D1PreparedStatement[] = [
    db.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_huy', tu_choi_tt = 'da_huy', tu_choi_han = NULL, updated_at = ? WHERE id = ? AND tu_choi_tt = 'cho_ktv'").bind(now, guiId),
  ];
  for (const d of dons) {
    stmts.push(
      db
        .prepare(
          "UPDATE phieu_sua_chua_bh SET trang_thai_cha = 'huy_thung', odoo_id = NULL, ghi_chu = CASE WHEN ?1 = '' THEN ghi_chu WHEN COALESCE(ghi_chu,'') = '' THEN ?1 ELSE ghi_chu || ' | ' || ?1 END WHERE id = ?2",
        )
        .bind(d.odoo_id ? `Đơn Odoo cũ: ${d.odoo_id} (gỡ khi huỷ thùng ${guiId})` : "", d.id),
    );
    stmts.push(
      db
        .prepare("INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu) VALUES ('phieu_sc', ?, 'cho_xac_nhan_so_luong', 'huy_thung', ?, ?, ?)")
        .bind(d.id, nguoi, now, `Huỷ theo thùng ${guiId}: ${lyDo}`),
    );
    if (d.odoo_id) {
      // last_status = cho_gui + khong con don cha gan odoo_id -> cron pushStatuses gui null cho dvbh (dvbh xoa trang thai gui sua).
      stmts.push(db.prepare("UPDATE odoo_status_sync SET last_status = 'cho_gui' WHERE odoo_id = ?").bind(d.odoo_id));
    }
  }
  const res = await db.batch(stmts);
  if (!res[0]?.meta?.changes) return false; // thung da duoc xu ly boi lan bam khac
  await addLog(db, "phieu_gui", guiId, "da_tiep_nhan", "da_huy", nguoi, `Huỷ thùng (từ chối tiếp nhận): ${lyDo}`);
  await ghiTraoDoi(db, guiId, nguoi, `⛔ Thùng đã bị huỷ: ${lyDo}`);
  return true;
}

// Cron: KTV khong phan hoi sau 7 ngay -> coi nhu khong y kien -> huy thung.
export async function tuHuyThungQuaHan(env: Env): Promise<number> {
  const { results } = await env.DB.prepare("SELECT id FROM phieu_gui_bh WHERE tu_choi_tt = 'cho_ktv' AND tu_choi_han IS NOT NULL AND tu_choi_han <= ? LIMIT 50")
    .bind(nowVN())
    .all<{ id: string }>();
  let n = 0;
  for (const r of results) {
    if (await huyThung(env.DB, r.id, "Hệ thống", `KTV không phản hồi sau ${HAN_KTV_NGAY} ngày — coi như không ý kiến`)) n++;
  }
  return n;
}
