import { nowVN } from "./vnTime";
import { addLog } from "./logs";

// 20/10/2026 - Admin BH di tat qua buoc Kho:
//  - "admin bh tạo đơn hàng thì tự động bỏ qua bước xác nhận của kho, bỏ qua bước tiếp nhận của admin bh
//    => đến bước xác nhận phân loại" (thung Admin BH tao ho, luc bam "Xac nhan gui" -> tuXacNhanSL = true)
//  - "admin bh có thể tự xác nhận hộ cho kho nếu thực tế hàng đã về đế tay admin bh (Ktv giao trực tiếp)"
//    (POST /admin/phieu-gui/:id/nhan-ho-kho, thung dang "da_gui").
// Dat thung thang sang "da_tiep_nhan" + admin_tiep_nhan = 1. tuXacNhanSL: tach luon don vi theo SL KTV
// khai (Admin tu tao nen tu biet SL) -> don vao thang hang doi phan loai.
export async function nhanHoThung(db: D1Database, id: string, actor: string, opts: { tuXacNhanSL: boolean; ghiChu: string }): Promise<{ error: string } | { ok: true; so_don_vi: number }> {
  const g = await db.prepare("SELECT trang_thai, admin_tiep_nhan FROM phieu_gui_bh WHERE id = ?").bind(id).first<{ trang_thai: string; admin_tiep_nhan: number }>();
  if (!g) return { error: "NOT_FOUND" };
  if (!(g.trang_thai === "da_gui" || (g.trang_thai === "da_tiep_nhan" && !g.admin_tiep_nhan))) return { error: "WRONG_STATE" };
  const now = nowVN();
  await db
    .prepare(
      `UPDATE phieu_gui_bh SET trang_thai = 'da_tiep_nhan', nguoi_nhan_kho = COALESCE(nguoi_nhan_kho, ?), thoi_gian_nhan_kho = COALESCE(thoi_gian_nhan_kho, ?),
         admin_tiep_nhan = 1, admin_nguoi_nhan = ?, admin_thoi_gian_nhan = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(actor, now, actor, now, now, id)
    .run();
  await addLog(db, "phieu_gui", id, g.trang_thai, "da_tiep_nhan", actor, opts.ghiChu);
  let soDonVi = 0;
  if (opts.tuXacNhanSL) {
    const { results } = await db.prepare("SELECT id, so_luong_khai FROM phieu_sua_chua_bh WHERE phieu_gui_id = ? AND trang_thai_cha = 'cho_xac_nhan_so_luong'").bind(id).all<{ id: string; so_luong_khai: number }>();
    for (const p of results) {
      const sl = Math.max(1, p.so_luong_khai || 1);
      const st = [db.prepare("UPDATE phieu_sua_chua_bh SET so_luong_thuc_nhan = ?, ly_do_chenh_lech_sl = '', trang_thai_cha = 'da_tach' WHERE id = ? AND trang_thai_cha = 'cho_xac_nhan_so_luong'").bind(sl, p.id)];
      for (let i = 1; i <= sl; i++) st.push(db.prepare("INSERT INTO phieu_sua_chua_bh_ct (id, parent_id, so_thu_tu, trang_thai, created_at, updated_at) VALUES (?, ?, ?, 'cho_phan_loai', ?, ?)").bind(`${p.id}-${i}`, p.id, i, now, now));
      await db.batch(st);
      await addLog(db, "phieu_sc", p.id, "cho_xac_nhan_so_luong", "da_tach", actor, `SL thực nhận = ${sl} (tự xác nhận — Admin BH tạo/nhận hộ)`);
      soDonVi += sl;
    }
  }
  return { ok: true, so_don_vi: soDonVi };
}
