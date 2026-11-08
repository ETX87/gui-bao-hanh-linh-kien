import type { Env } from "../types";
import { normCaseId } from "./caseNgay";

// Diem noi toi he DVBH goc (tra cuu case_dvbh theo ID, CHI DOC) - port DUNG tu
// linh-kien-app/backend/src/lib/caseLookupClient.ts (doc truc tiep file do truoc khi viet, khong doan
// contract). Dung cho autocomplete luc KTV/Admin BH tao don ("Man hinh chinh linh kien" Giai doan 4
// con thieu tinh nang nay - xem CLAUDE.md muc "Giai doan 4" - "Bo tra cuu case CRM tu dong").
export interface CaseLookupPreview {
  ky_thuat_vien: string | null;
  khach_hang: string | null;
  seri_san_pham: string | null;
  khu_vuc: string | null;
  tinh: string | null;
  quan_huyen: string | null;
  hang: string | null;
  san_pham_bao_hanh: string | null;
  tien_do_hoan_thanh: string | null;
  mo_ta_loi: string | null;
  nhom_san_pham: string | null;
  nhom_yeu_cau: string | null;
  loai_yeu_cau: string | null;
  hinh_thuc_bao_hanh: string | null;
  ngay_mua: string | null;
  thoi_gian_cskh_tiep_nhan: string | null;
  thoi_gian_hen_xu_ly: string | null;
  thoi_gian_hoan_thanh: string | null;
  doi_tac: string | null;
  link_crm: string | null;
  noi_dung_xu_ly: string | null;
  luu_y_loi_linh_kien: string | null;
  cach_thuc_xu_ly: string | null;
  nganh: string | null;
  loai_nganh: string | null;
  nhom_kh: string | null;
  dt_san_pham: number | null;
  dt_linh_kien: number | null;
  dt_dich_vu: number | null;
  ly_do_qua_han: string | null;
  ngay_san_xuat?: string | null; // 02/11/2026 - dvbh v1.516 moi tra
  ktv_trien_khai?: string | null; // 05/11/2026 - dvbh v1.522: KTV trien khai (Tram la ky_thuat_vien)
}

// 30/10/2026: tach "khong tim thay case" (dvbh tra loi found=false) voi "dvbh loi / khong phan hoi"
// (loi mang, HTTP loi, gioi han tan suat) - de cong ma case chi chan cung o truong hop that su khong co.
export type CaseLookupResult =
  | { status: "found"; preview: CaseLookupPreview }
  | { status: "not_found" }
  | { status: "error" };

export async function lookupCaseEx(rawId: string, env: Env): Promise<CaseLookupResult> {
  // 08/11/2026: chuan hoa ngay tai day (sc… -> SC…) de MOI duong goi (them don, cron xac minh, dong bo bang chung) deu dung.
  const id = normCaseId(rawId);
  const url = `${env.CASE_LOOKUP_BASE_URL.replace(/\/$/, "")}/api/partner/case-lookup?id=${encodeURIComponent(id)}`;
  try {
    // Service Binding (khong fetch() thang URL) - 2 Worker cung 1 tai khoan Cloudflare bi chan loi
    // 1042 (chong SSRF) neu fetch() mang that, dung nhu dvbh<->linh-kien-app - xem wrangler.jsonc.
    // 08/11/2026: gioi han 12s - DVBH treo thi POST /phieu-gui/:id/don (them don) treo theo, nut "Thêm vào phiếu"
    // tren dien thoai ket "dang gui". Het han = "error" (nguoi dung tich "Vẫn tạo đơn", cron xac minh lai).
    const res = await env.CASE_LOOKUP_SERVICE.fetch(url, { headers: { "X-API-Key": env.CASE_LOOKUP_API_KEY }, signal: AbortSignal.timeout(12000) });
    if (!res.ok || !(res.headers.get("Content-Type") ?? "").includes("application/json")) {
      console.error("[caseLookup] fetch that bai", res.status, res.headers.get("Content-Type"));
      return { status: "error" };
    }
    const body = await res.json<{ found: boolean; preview: CaseLookupPreview | null }>();
    return body.found && body.preview ? { status: "found", preview: body.preview } : { status: "not_found" };
  } catch (err) {
    console.error("[caseLookup] exception", err instanceof Error ? err.message : err);
    return { status: "error" };
  }
}

export async function lookupCase(id: string, env: Env): Promise<CaseLookupPreview | null> {
  const r = await lookupCaseEx(id, env);
  return r.status === "found" ? r.preview : null;
}
