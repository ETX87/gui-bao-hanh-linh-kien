import type { Env } from "../types";

// Day thung hang (phieu_gui_bh) sang khovan (he Quan ly hang ve kho) - danh dau "cho xu ly"
// (pending) ben do - de kho biet truoc hang sap ve, nhan dien duoc khi quet ma thay vi tao trung 1
// don thu cong moi. Goi LUC "xac nhan da gui xe" (khong phai luc tao phieu nhap - sua 07/09/2026,
// xem comment o routes/phieuGui.ts): phieu nhap co the bi bo do/tu dong xoa neu KTV chua them don
// nao, day som se tao rac ben khovan va can them 1 API huy rieng - day muon hon vua tranh duoc dieu
// do, vua dung dung y nghia "hang SAP VE THAT".
// Best-effort: loi/khovan down KHONG duoc chan thao tac cua nguoi dung (chi log).
export async function pushBoxToKhovan(env: Env, orderCode: string, senderName: string, senderEmail: string): Promise<void> {
  const url = `${env.KHOVAN_PUSH_BASE_URL.replace(/\/$/, "")}/api/v1/inbound/orders`;
  try {
    // Service Binding (khong fetch() thang URL) - cung 1 tai khoan Cloudflare voi
    // khovan, fetch() thang bi chan loi 1042 (chong SSRF) - giong het caseLookupClient.ts.
    const res = await env.KHOVAN_PUSH_SERVICE.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": env.KHOVAN_PUSH_API_KEY },
      body: JSON.stringify({
        order_code: orderCode,
        sender_name: senderName,
        sender_info: { creator_email: senderEmail },
        note: "Thùng bảo hành - chờ đóng hàng",
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[khovanPush] fetch that bai", res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.error("[khovanPush] exception", err instanceof Error ? err.message : err);
  }
}
