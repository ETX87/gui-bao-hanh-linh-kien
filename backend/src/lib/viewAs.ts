import type { AppUser } from "../types";

// Che do test cua Admin he thong (la_qtri) - port tu linh-kien-app (lib/viewAsPresets.ts + middleware/
// loadUser.ts), yeu cau 05/10/2026: "Vai trò admin cho tôi lựa chọn test theo vai trò và theo gmail người
// sử dụng thật". 2 che do, khong chong nhau:
// 1) "Xem thử vai trò" (cookie suachua_view_as) - giu email/ten THAT cua Admin, chi thay bo co quyen
//    bang 1 vai tro mau. Thao tac GHI DUOC va ghi nhan duoi email Admin (khong gia mao danh tinh).
// 2) "Xem như người dùng" (cookie suachua_view_as_user) - thay han user bang tai khoan that (ke ca KTV co
//    trong danh ba nhung chua tung dang nhap), CHI DOC: moi request ghi bi chan (tru doi/thoat che do,
//    dang xuat) - neu cho ghi, du lieu se mang email nguoi khac du nguoi bam la Admin.
// Ca 2 chi kich hoat khi tai khoan THAT (doc tu DB moi request) la la_qtri - cookie khong duoc tin mu.

export const VIEW_AS_COOKIE = "suachua_view_as";
export const VIEW_AS_USER_COOKIE = "suachua_view_as_user";

export const VIEW_AS_ROLE_KEYS = ["ktv", "ve_tinh", "kho", "admin_bh", "nv_sua_chua", "ke_toan", "giam_sat", "view"] as const;
export type ViewAsRole = (typeof VIEW_AS_ROLE_KEYS)[number];

export function isViewAsRole(v: unknown): v is ViewAsRole {
  return typeof v === "string" && (VIEW_AS_ROLE_KEYS as readonly string[]).includes(v);
}

const FLAG_OF: Record<ViewAsRole, keyof AppUser> = {
  ktv: "la_ktv_dvbh",
  ve_tinh: "la_ve_tinh",
  kho: "la_kho",
  admin_bh: "la_admin_bh",
  nv_sua_chua: "la_nv_sua_chua",
  ke_toan: "la_ke_toan",
  giam_sat: "la_giam_sat",
  view: "la_view",
};

/** Tat het co (ke ca la_qtri) roi bat dung 1 co cua vai tro mau - khong con duong "|| la_qtri" nao sot. */
export function applyViewAsRole(user: AppUser, role: ViewAsRole): AppUser {
  return {
    ...user,
    la_ktv_dvbh: false,
    la_ve_tinh: false,
    la_kho: false,
    la_admin_bh: false,
    la_nv_sua_chua: false,
    la_ke_toan: false,
    la_giam_sat: false,
    la_view: false,
    la_qtri: false,
    [FLAG_OF[role]]: true,
  };
}

// Duong ghi van cho phep khi dang "xem nhu nguoi dung".
export const VIEW_AS_USER_WRITE_ALLOW = new Set(["/api/auth/view-as", "/api/auth/view-as-user", "/api/auth/logout"]);
