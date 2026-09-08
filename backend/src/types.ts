// Vai tro + Env cho he doc lap "Sua chua bao hanh" (Worker "suachua"). Mo hinh vai tro dung DUNG 7 co
// boolean + 1 co Admin he thong da chot qua CLAUDE.md (KTV/Kho/Admin BH/NV sua chua/Ke toan/Giam
// sat/View + qtri) - KHONG dung "vai_tro" enum nhu linh-kien-app (Admin/QC/Giam sat) vi mo hinh
// nghiep vu bao hanh khac han: moi nguoi dung thuong chi giu DUNG 1 co nghiep vu (khong to hop nhu
// dvbh/linh-kien-app), xem migrations/0001_init.sql.

export interface AppUser {
  email: string;
  ten: string | null;
  trang_thai_duyet: "Cho duyet" | "Da duyet" | "Tu choi";
  bi_khoa: boolean;
  la_ktv_dvbh: boolean; // KTV / CTV / Tram
  la_ve_tinh: boolean; // Ve tinh (nhan vien noi bo Tram)
  la_kho: boolean;
  la_admin_bh: boolean;
  la_nv_sua_chua: boolean;
  la_ke_toan: boolean;
  // MOI (chot 03/09/2026: "GS va View lam theo huong cua linh-kien-app") - chi theo doi (khong
  // duyet), scope qua phieu_sua_chua_bh.email_gs.
  la_giam_sat: boolean;
  // Doi ten tu "quanly" cua prototype - gio gioi han theo Khu vuc (user_khu_vuc_bh).
  la_view: boolean;
  // Admin he thong (= "qtri" cua prototype) - CRUD nguoi dung/vai tro, Cai dat, luon full quyen.
  la_qtri: boolean;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  BOOTSTRAP_ADMIN_EMAIL: string;
  GOOGLE_REDIRECT_URI: string;
  FRONTEND_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  // Diem noi toi he DVBH goc - tra cuu 1 case_dvbh theo ID (case-lookup, xem CLAUDE.md muc "Lien he
  // he thong chinh"). Giai doan 5, CHUA dung o Giai doan 1 nay.
  CASE_LOOKUP_BASE_URL: string;
  CASE_LOOKUP_API_KEY: string;
  // Service Binding toi dvbh (RPC noi bo, khong qua fetch() mang that - 2 Worker cung 1 tai khoan
  // Cloudflare se bi chan loi 1042 chong SSRF neu fetch() thang URL, xem wrangler.jsonc).
  CASE_LOOKUP_SERVICE: Fetcher;
  // Xac thuc du lieu day (push) tu linh-kien-app - KTV/Khu vuc/danh muc linh kien (Giai doan 5, xem
  // CLAUDE.md muc "Chot 5 cau hoi mo..."). Key RIENG, khong dung chung CASE_LOOKUP_API_KEY.
  LINHKIEN_SYNC_API_KEY?: string;
  // Them 2026-09-07: chieu GHI sang khovan (he Quan ly hang ve kho) - bao truoc thung
  // hang "cho xu ly" ngay luc tao (xem lib/khovanPushClient.ts). Dung khuon
  // external_systems + header X-Api-Key san co cua khovan.
  KHOVAN_PUSH_BASE_URL: string;
  KHOVAN_PUSH_API_KEY: string;
  KHOVAN_PUSH_SERVICE: Fetcher;
  // Them 2026-09-07: chieu khovan GOI VAO day de tra cuu lai 1 thung hang theo ID khi
  // kho quet ma (xem routes/khovanLookup.ts) - xac thuc bang 1 secret dung chung don
  // gian (X-Khovan-Key), cung khuon voi LINHKIEN_SYNC_API_KEY o tren.
  KHOVAN_LOOKUP_API_KEY?: string;
  // Them 2026-09-07 (nguyen tac "Kho chi thao tac qua app kho van"): secret RIENG cho
  // cac route hanh dong (routes/partnerKho.ts) - khovan goi vao day de THAY DOI trang
  // thai (nhan hang/dong goi/gui) thay vi chi doc nhu KHOVAN_LOOKUP_API_KEY o tren -
  // tach rieng theo nguyen tac least-privilege (lo key doc it rui ro hon lo key ghi).
  KHOVAN_PARTNER_API_KEY?: string;
  // Cua sau dang nhap CHI danh cho local dev (xem routes/auth.ts GET /dev-login), giong co che
  // dvbh/linh-kien-app.
  LOCAL_DEV_BYPASS_AUTH?: string;
}

declare module "hono" {
  interface ContextVariableMap {
    email: string;
    user: AppUser;
  }
}
