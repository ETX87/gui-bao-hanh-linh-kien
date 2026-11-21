import type { Env, AppUser } from "../types";
import { lookupCaseEx, type CaseLookupPreview } from "./caseLookupClient";
import { laCaseHomNay } from "./caseNgay";
import { caseThuocKtv } from "./ktvMa";
import { nowVN } from "./vnTime";
import { addLog } from "./logs";
import { capNhatTimKiem } from "./timKiem";
import { laMaLada, ladaSnapshot, traLada } from "./lada";

// 08/11/2026: kiem tra ma case dung chung cho (1) them don, (2) KTV sua don khi Admin chua tuong tac, (3) Admin BH sua
// ma case sai khi don chua ket thuc. Quy tac giu dung 05/09 + 30/10 + 03/11/2026:
// - DVBH khong tim thay -> chan (tru case trong ngay SC+YYMMDD hom nay: cho, gan "chua xac minh");
// - DVBH loi -> chan, tru khi nguoi dung tich "van tao, xac minh sau";
// - case thuoc KTV khac KTV so huu thung -> chan, tru nguoi co quyen tao ho / Admin (khong phai chinh KTV do) tich xac nhan.
export interface CaseCheckBody {
  xac_nhan_khac_ktv?: boolean;
  xac_nhan_chua_xac_minh?: boolean;
  // 21/11/2026: ma Lada khong tim thay (hoac API Lada loi) -> nguoi tao tich "tu chiu trach nhiem" moi duoc tao.
  xac_nhan_lada?: boolean;
}
export type CaseCheck =
  | { ok: false; error: string }
  | {
      ok: true;
      casePreview: CaseLookupPreview | null;
      chuaXacMinh: boolean;
      choDongBo: boolean;
      xacNhanKhac: string | null;
      // 21/11/2026: ma yeu cau la ma Lada (khong phai case DVBH). ladaTimThay = co tren he Lada; snapshot = bang chung luu lai.
      laLada?: boolean;
      ladaTimThay?: boolean;
      ladaSnap?: Record<string, unknown> | null;
    };

export async function kiemTraCase(env: Env, caseId: string, ownerEmail: string | null, user: AppUser, body: CaseCheckBody): Promise<CaseCheck> {
  const lk = await lookupCaseEx(caseId, env);
  // 21/11/2026: khong thay tren DVBH (hoac DVBH loi) ma ma co dang Lada (1 chu + so, khong co "SC") -> tra he Lada.
  // Tim thay -> tao duoc (canh bao mem neu KTV tren don Lada khac); khong thay / loi -> phai tich "tu chiu trach nhiem".
  if (lk.status !== "found" && laMaLada(caseId)) {
    const ld = await traLada(env, caseId);
    if (ld.status === "found") {
      return { ok: true, casePreview: null, chuaXacMinh: false, choDongBo: false, xacNhanKhac: null, laLada: true, ladaTimThay: true, ladaSnap: ladaSnapshot(caseId, ld.preview) };
    }
    if (body.xac_nhan_lada !== true) return { ok: false, error: ld.status === "error" ? "LADA_KHONG_PHAN_HOI" : "LADA_NOT_FOUND" };
    return { ok: true, casePreview: null, chuaXacMinh: false, choDongBo: false, xacNhanKhac: null, laLada: true, ladaTimThay: false, ladaSnap: null };
  }
  const choDongBo = lk.status === "not_found" && laCaseHomNay(caseId);
  if (lk.status === "not_found" && !choDongBo) return { ok: false, error: "CASE_NOT_FOUND" };
  if (lk.status === "error" && body.xac_nhan_chua_xac_minh !== true) return { ok: false, error: "DVBH_KHONG_PHAN_HOI" };
  const casePreview = lk.status === "found" ? lk.preview : null;
  let lechKtv = false;
  if (casePreview && ownerEmail) lechKtv = !(await caseThuocKtv(env.DB, casePreview, ownerEmail));
  const duocVuot = (user.la_admin_bh || user.la_giam_sat || user.la_qtri) && user.email !== ownerEmail;
  if (lechKtv && !(duocVuot && body.xac_nhan_khac_ktv === true)) return { ok: false, error: "CASE_KTV_MISMATCH" };
  return { ok: true, casePreview, chuaXacMinh: lk.status === "error" || choDongBo, choDongBo, xacNhanKhac: lechKtv ? user.email : null };
}

// Ghi ma case moi vao don cha (da qua kiemTraCase) + bang chung case + nhat ky. Khong doi trang thai don.
export async function ghiDoiCase(env: Env, donId: string, cuCase: string | null, moiCase: string, kq: Extract<CaseCheck, { ok: true }>, user: AppUser, trangThai: string, nguon: string) {
  const db = env.DB;
  await db
    .prepare("UPDATE phieu_sua_chua_bh SET case_id = ?, xac_nhan_khac_ktv = ?, ktv_tren_case = ?, case_xac_minh = ?, case_xac_minh_loi = NULL, tim_kiem = NULL, loai_ma = ?, lada_tim_thay = ? WHERE id = ?")
    .bind(moiCase, kq.xacNhanKhac, kq.casePreview?.ky_thuat_vien ?? (kq.ladaSnap?.ky_thuat_vien as string | null | undefined) ?? null, kq.chuaXacMinh ? 1 : 0, kq.laLada ? "lada" : null, kq.laLada ? (kq.ladaTimThay ? 1 : 0) : null, donId)
    .run();
  const snap = kq.casePreview ?? kq.ladaSnap;
  if (snap) {
    await db
      .prepare("INSERT INTO case_lookup_snapshot (case_id, data, synced_at) VALUES (?, ?, ?) ON CONFLICT(case_id) DO UPDATE SET data = excluded.data, synced_at = excluded.synced_at")
      .bind(moiCase, JSON.stringify(snap), nowVN())
      .run();
  }
  const them = [
    kq.xacNhanKhac ? `xác nhận case thuộc KTV khác (KTV trên case: ${kq.casePreview?.ky_thuat_vien || "không xác định"})` : "",
    kq.chuaXacMinh ? "mã case CHƯA được xác minh, hệ thống sẽ tự xác minh lại" : "",
    kq.laLada ? (kq.ladaTimThay ? "mã Lada (đã tìm thấy trên hệ Lada)" : "⚠ mã Lada KHÔNG tìm thấy trên hệ Lada — người sửa tự chịu trách nhiệm") : "",
  ].filter(Boolean);
  await addLog(db, "phieu_sc", donId, trangThai, trangThai, user.email, `${nguon} sửa mã case: ${cuCase || "—"} → ${moiCase}${them.length ? ` (${them.join("; ")})` : ""}`);
  await capNhatTimKiem(db, [donId]).catch(() => 0);
}
