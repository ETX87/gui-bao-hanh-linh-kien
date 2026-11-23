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
  return huyThungCore(db, guiId, nguoi, lyDo, "tu_choi");
}

// 23/11/2026: Admin BH / Kho huy thang thung "dang gui ve Kho" (VD thung AppSheet cu treo, thuc te khong ve).
// Dung chung logic huy thung; mo lai duoc (moLaiThung).
export async function huyThungDangGui(db: D1Database, guiId: string, nguoi: string, lyDo: string): Promise<boolean> {
  return huyThungCore(db, guiId, nguoi, lyDo, "dang_gui");
}

async function huyThungCore(db: D1Database, guiId: string, nguoi: string, lyDo: string, kieu: "tu_choi" | "dang_gui"): Promise<boolean> {
  const now = nowVN();
  const st = await db.prepare("SELECT tu_choi_tt, trang_thai FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ tu_choi_tt: string | null; trang_thai: string }>();
  if (kieu === "tu_choi" ? st?.tu_choi_tt !== "cho_ktv" : st?.trang_thai !== "da_gui" || st.tu_choi_tt) return false;
  const { results: dons } = await db
    .prepare("SELECT id, odoo_id FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha = 'cho_xac_nhan_so_luong'")
    .bind(guiId)
    .all<{ id: string; odoo_id: number | null }>();
  // 1 batch = 1 transaction: cau dau doi trang thai thung (CAS), loi o cau sau thi rollback ca thung.
  const stmts: D1PreparedStatement[] = [
    kieu === "tu_choi"
      ? db.prepare("UPDATE phieu_gui_bh SET trang_thai = 'da_huy', tu_choi_tt = 'da_huy', tu_choi_han = NULL, updated_at = ? WHERE id = ? AND tu_choi_tt = 'cho_ktv'").bind(now, guiId)
      : db
          .prepare(
            "UPDATE phieu_gui_bh SET trang_thai = 'da_huy', tu_choi_tt = 'da_huy', tu_choi_ly_do = ?, tu_choi_boi = ?, tu_choi_luc = ?, tu_choi_han = NULL, updated_at = ? WHERE id = ? AND trang_thai = 'da_gui' AND tu_choi_tt IS NULL",
          )
          .bind(lyDo, nguoi, now, now, guiId),
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
  const tu = kieu === "tu_choi" ? "da_tiep_nhan" : "da_gui";
  await addLog(db, "phieu_gui", guiId, tu, "da_huy", nguoi, kieu === "tu_choi" ? `Huỷ thùng (từ chối tiếp nhận): ${lyDo}` : `🗑 Huỷ thùng đang gửi về Kho: ${lyDo}`);
  await ghiTraoDoi(db, guiId, nguoi, `⛔ Thùng đã bị huỷ: ${lyDo}`);
  return true;
}

// 23/11/2026: mo lai thung da huy (huy nham) -> ve dung trang thai truoc khi huy (lay tu nhat ky), don cha ve "cho xac nhan SL",
// gan lai don Odoo da go (neu don Odoo do chua gan don khac, chua bi "Huy don loi").
export async function moLaiThung(db: D1Database, guiId: string, nguoi: string, lyDo: string): Promise<{ ok: boolean; error?: string; odoo_gan_lai?: number }> {
  const g = await db.prepare("SELECT trang_thai FROM phieu_gui_bh WHERE id = ?").bind(guiId).first<{ trang_thai: string }>();
  if (!g) return { ok: false, error: "NOT_FOUND" };
  if (g.trang_thai !== "da_huy") return { ok: false, error: "WRONG_STATE" };
  const lg = await db
    .prepare("SELECT tu_trang_thai FROM logs_bh WHERE entity_type = 'phieu_gui' AND entity_id = ? AND den_trang_thai = 'da_huy' ORDER BY id DESC LIMIT 1")
    .bind(guiId)
    .first<{ tu_trang_thai: string | null }>();
  const ve = lg?.tu_trang_thai === "da_gui" ? "da_gui" : "da_tiep_nhan";
  const now = nowVN();
  const { results: dons } = await db
    .prepare("SELECT id, ghi_chu FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha = 'huy_thung'")
    .bind(guiId)
    .all<{ id: string; ghi_chu: string | null }>();
  const stmts: D1PreparedStatement[] = [
    db.prepare("UPDATE phieu_gui_bh SET trang_thai = ?, tu_choi_tt = NULL, tu_choi_han = NULL, updated_at = ? WHERE id = ? AND trang_thai = 'da_huy'").bind(ve, now, guiId),
  ];
  let ganLai = 0;
  const reOdoo = /(?:\s*\|\s*)?Đơn Odoo cũ: (\d+) \(gỡ khi huỷ thùng ([A-Za-z0-9-]+)\)/;
  for (const d of dons) {
    const m = (d.ghi_chu || "").match(reOdoo);
    let odoo: number | null = null;
    let ghiChu = d.ghi_chu;
    if (m && m[2] === guiId) {
      const id = Number(m[1]);
      const ban = await db.prepare("SELECT 1 AS x FROM phieu_sua_chua_bh WHERE odoo_id = ? LIMIT 1").bind(id).first();
      const huy = await db.prepare("SELECT khong_gui_luc FROM don_bh_odoo WHERE odoo_id = ?").bind(id).first<{ khong_gui_luc: string | null }>();
      if (!ban && huy && !huy.khong_gui_luc) {
        odoo = id;
        ganLai++;
        ghiChu = (d.ghi_chu || "").replace(m[0], "").replace(/^\s*\|\s*/, "") || null;
        stmts.push(db.prepare("UPDATE odoo_status_sync SET last_status = NULL WHERE odoo_id = ?").bind(id));
      }
    }
    stmts.push(
      db.prepare("UPDATE phieu_sua_chua_bh SET trang_thai_cha = 'cho_xac_nhan_so_luong', odoo_id = COALESCE(?, odoo_id), ghi_chu = ? WHERE id = ? AND trang_thai_cha = 'huy_thung'").bind(odoo, ghiChu, d.id),
      db
        .prepare("INSERT INTO logs_bh (entity_type, entity_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien, thoi_gian, ghi_chu) VALUES ('phieu_sc', ?, 'huy_thung', 'cho_xac_nhan_so_luong', ?, ?, ?)")
        .bind(d.id, nguoi, now, `↺ Mở lại theo thùng ${guiId}${odoo ? ` (gắn lại đơn Odoo ${odoo})` : ""}: ${lyDo}`),
    );
  }
  const res = await db.batch(stmts);
  if (!res[0]?.meta?.changes) return { ok: false, error: "WRONG_STATE" };
  const veLabel = ve === "da_gui" ? "đang gửi về Kho" : "Kho đã nhận, chờ Admin tiếp nhận";
  await addLog(db, "phieu_gui", guiId, "da_huy", ve, nguoi, `↺ Mở lại thùng đã huỷ (về: ${veLabel}): ${lyDo}`);
  await ghiTraoDoi(db, guiId, nguoi, `↺ Thùng được mở lại (về: ${veLabel}): ${lyDo}`);
  return { ok: true, odoo_gan_lai: ganLai };
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
