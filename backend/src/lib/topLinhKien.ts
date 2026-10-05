import { nowVN } from "./vnTime";
import { bumpLinhKienVersion } from "./linhKienVersion";

// Top linh kien xu ly thanh cong 30 ngay gan nhat (05/10/2026 muc 7). "Thanh cong" = don vi con da toi
// buoc tra hang: san_sang_gom_phieu_tra, da vao phieu tra, hoac da duoc Admin xac nhan hoan tat. KHONG
// tinh huong "tu_choi"/"chuyen_kho". Ban dau chi dem admin_xac_nhan_hoan_tat=1 -> bo sot toan bo don
// "Doi moi"/"Tru cong no"/"Tra lai KTV" (di thang vao phieu tra, khong qua buoc xac nhan hoan tat) -
// phat hien trong ra soat Admin BH 05/10/2026. Dem theo linh kien THUC TE (ma_lk_thuc_te, khong co thi
// lay linh kien cua don cha).
export const LK_TOP_GIO_DEFAULT = 2; // 2h sang gio VN

export async function computeTopLinhKien(db: D1Database): Promise<{ so_lk: number; tinh_luc: string }> {
  const now = nowVN();
  const cutoff = new Date(Date.parse(now.replace(" ", "T") + "Z") - 30 * 86400000).toISOString().slice(0, 19).replace("T", " ");
  const { results } = await db
    .prepare(
      `SELECT COALESCE(ct.ma_lk_thuc_te, p.ma_lk) AS ma_lk, COUNT(*) AS so_luong
       FROM phieu_sua_chua_bh_ct ct JOIN phieu_sua_chua_bh p ON p.id = ct.parent_id
       WHERE (ct.admin_xac_nhan_hoan_tat = 1 OR ct.phieu_tra_id IS NOT NULL OR ct.trang_thai = 'san_sang_gom_phieu_tra')
         AND COALESCE(ct.huong_xu_ly, '') NOT IN ('tu_choi', 'chuyen_kho')
         AND ct.updated_at >= ? AND COALESCE(ct.ma_lk_thuc_te, p.ma_lk) IS NOT NULL
       GROUP BY 1 ORDER BY so_luong DESC, ma_lk LIMIT 200`,
    )
    .bind(cutoff)
    .all<{ ma_lk: string; so_luong: number }>();
  const stmts = [db.prepare("DELETE FROM linh_kien_top_bh")];
  results.forEach((r, i) => {
    stmts.push(db.prepare("INSERT INTO linh_kien_top_bh (ma_lk, hang, so_luong, tinh_luc) VALUES (?, ?, ?, ?)").bind(r.ma_lk, i + 1, r.so_luong, now));
  });
  stmts.push(
    db.prepare("INSERT INTO sync_state (key, value, updated_at) VALUES ('lk_top_last', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(JSON.stringify({ so_lk: results.length, tinh_luc: now }), now),
  );
  await db.batch(stmts);
  await bumpLinhKienVersion(db);
  return { so_lk: results.length, tinh_luc: now };
}

export async function getLkTopGio(db: D1Database): Promise<number> {
  const r = await db.prepare("SELECT value FROM sync_state WHERE key = 'lk_top_gio'").first<{ value: string }>();
  const n = Number(r?.value);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : LK_TOP_GIO_DEFAULT;
}

// Goi tu cron 15 phut: neu da toi khung gio cai dat va hom nay (gio VN) chua tinh -> tinh 1 lan.
export async function maybeComputeTopLinhKien(db: D1Database): Promise<void> {
  const now = nowVN();
  const gio = Number(now.slice(11, 13));
  if (gio < (await getLkTopGio(db))) return;
  const last = await db.prepare("SELECT value FROM sync_state WHERE key = 'lk_top_last'").first<{ value: string }>();
  const lastDay = last ? (JSON.parse(last.value) as { tinh_luc: string }).tinh_luc.slice(0, 10) : "";
  if (lastDay === now.slice(0, 10)) return;
  await computeTopLinhKien(db);
}
