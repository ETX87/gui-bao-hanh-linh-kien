import type { AppUser } from "../types";

// 16/11/2026 (v1.142, migration 0041) - Hang / Doi tac cua don bao hanh + vai tro "Tra xac".
// Gia tri HIEU LUC cua don cha (alias p): Admin BH da chot (p.hang / p.doi_tac_id) thang, chua chot thi lay theo CRM (case_lookup_snapshot).
// Doi tac CRM chua co trong danh muc thi trigger trg_cls_doi_tac_* da tu them -> luon khop duoc theo ten.
const SNAP = (p: string, k: string) =>
  `(SELECT json_extract(s.data, '$.${k}') FROM case_lookup_snapshot s WHERE s.case_id = ${p}.case_id AND json_valid(s.data))`;
export const HANG_SQL = (p = "p") => `COALESCE(NULLIF(TRIM(${p}.hang), ''), NULLIF(TRIM(${SNAP(p, "hang")}), ''))`;
export const DOI_TAC_ID_SQL = (p = "p") =>
  `COALESCE(${p}.doi_tac_id, (SELECT dt.id FROM doi_tac_bh dt WHERE dt.ten = TRIM(${SNAP(p, "doi_tac")}) COLLATE NOCASE))`;
export const DOI_TAC_TEN_SQL = (p = "p") => `(SELECT dt.ten FROM doi_tac_bh dt WHERE dt.id = ${DOI_TAC_ID_SQL(p)})`;
export const DOI_TAC_KAROFI_SQL = (p = "p") => `(SELECT dt.la_karofi FROM doi_tac_bh dt WHERE dt.id = ${DOI_TAC_ID_SQL(p)})`;
// Cot hien thi dung chung cho danh sach / chi tiet don vi.
export const COT_HANG_DOI_TAC = (p = "p") =>
  `${HANG_SQL(p)} AS hang, ${DOI_TAC_ID_SQL(p)} AS doi_tac_id, ${DOI_TAC_TEN_SQL(p)} AS doi_tac, ${DOI_TAC_KAROFI_SQL(p)} AS doi_tac_karofi`;

// Loai de xuat cap linh kien sua chua (ban sao linh-kien-app lib/pxkRecalculate.ts loaiDeXuatTheoDonBh - doi 1 ben doi ca 2):
// het bao hanh -> MUA HÀNG SỬA CHỮA; con bao hanh + doi tac Karofi -> HỖ TRỢ SỬA CHỮA 0 ĐỒNG; con bao hanh doi tac khac -> CÔNG NỢ SỬA CHỮA.
export const LDX_CONG_NO_SC = "CÔNG NỢ SỬA CHỮA";
export const LDX_HO_TRO_SC = "HỖ TRỢ SỬA CHỮA 0 ĐỒNG";
export const LDX_MUA_SC = "MUA HÀNG SỬA CHỮA";
export function loaiDeXuatSuaChua(loaiBaoHanh: string | null | undefined, laKarofi: number | boolean | null | undefined): string | null {
  if (loaiBaoHanh === "ngoai_bh") return LDX_MUA_SC;
  if (loaiBaoHanh !== "trong_bh" || laKarofi === null || laKarofi === undefined) return null;
  return laKarofi ? LDX_HO_TRO_SC : LDX_CONG_NO_SC;
}
// v1.143: loai de xuat cua 1 don vi (gui kem khi tao don cap linh kien ben app Dat LK - khong de ben do phai goi nguoc tra cuu: goi nguoc loi /
// cham thi don tung roi ve CÔNG NỢ SỬA CHỮA am tham). null = don chua du Hang / Doi tac / bao hanh.
export async function loaiDeXuatCuaDonVi(db: D1Database, unitId: string): Promise<string | null> {
  const r = await db.prepare(`SELECT u.loai_bao_hanh, ${DOI_TAC_KAROFI_SQL("p")} AS karofi FROM phieu_sua_chua_bh_ct u JOIN phieu_sua_chua_bh p ON p.id = u.parent_id WHERE u.id = ?`)
    .bind(unitId).first<{ loai_bao_hanh: string | null; karofi: number | null }>();
  return r ? loaiDeXuatSuaChua(r.loai_bao_hanh, r.karofi) : null;
}
// Lan cap la CÔNG NỢ SỬA CHỮA (lk_loai NULL = lan cap cu, truoc 16/11 deu la loai nay) - CHI loai nay tao don tru cong no.
export const DX_CONG_NO_SQL = (d = "d") => `(${d}.lk_loai IS NULL OR ${d}.lk_loai = '${LDX_CONG_NO_SC}')`;
// v1.143 (chot 16/11/2026 - "công nợ sửa chữa thì cần xác nhận xác và trừ công nợ cho nv sửa chữa, hỗ trợ 0 đồng thì không cần trừ công nợ
// nhưng vẫn cần xác nhận luồng cho xác"): lan cap can Admin BH xac nhan (SL dung + ket qua xac) = CÔNG NỢ + HỖ TRỢ 0 ĐỒNG. MUA HÀNG SỬA CHỮA
// (het BH, NV / khach tra tien) khong qua buoc nay.
export const DX_XAC_NHAN_SQL = (d = "d") => `(${d}.lk_loai IS NULL OR ${d}.lk_loai IN ('${LDX_CONG_NO_SC}', '${LDX_HO_TRO_SC}'))`;
export const laLoaiXacNhan = (lkLoai: string | null | undefined) => !lkLoai || lkLoai === LDX_CONG_NO_SC || lkLoai === LDX_HO_TRO_SC;

// ---- Vai tro "Tra xac" ----
export const laQuanTriXac = (u: AppUser) => u.la_admin_bh || u.la_qtri;
/** null = khong gioi han (Admin BH / qtri); mang = chi cac doi tac duoc gan (vai tro Tra xac); undefined = khong co quyen thao tac xac. */
export async function doiTacXacCuaToi(db: D1Database, u: AppUser): Promise<number[] | null | undefined> {
  if (laQuanTriXac(u)) return null;
  if (!u.la_tra_xac) return undefined;
  const { results } = await db.prepare("SELECT doi_tac_id FROM user_doi_tac_bh WHERE email = ?").bind(u.email).all<{ doi_tac_id: number }>();
  return results.map((r) => r.doi_tac_id);
}
