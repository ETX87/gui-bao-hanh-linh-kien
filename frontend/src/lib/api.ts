// Client API dung chung cho toan bo frontend - fetch() that toi /api/*, luon kem cookie session
// (credentials: "include"), tra JSON. Nem ApiError (co .code = ma loi backend tra ve, vd
// "REQUIRE_LY_DO_CHAM"/"REQUIRE_MA_MISA"...) de man hinh tu doc va hien dung thong bao/mo dung modal
// phu (VD gate SLA) thay vi chi hien "co loi xay ra" chung chung.

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const code = (json as { error?: string } | null)?.error || `HTTP_${res.status}`;
    throw new ApiError(code, res.status);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// Thong diep loi de doc bang tieng Viet cho cac ma loi backend hay gap - dung o Toast/inline error.
// Khong co trong danh sach nay thi hien nguyen code (van con thong tin hon la an di).
export const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  XEM_NHU_CHI_DOC: "Đang ở chế độ \"Xem như người dùng\" — chỉ xem, không thao tác được. Thoát về Admin để thao tác.",
  INVALID_ROLE: "Vai trò test không hợp lệ.",
  TAI_KHOAN_KHONG_HOAT_DONG: "Tài khoản này đang bị khoá hoặc chưa được duyệt.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  NOT_DRAFT: "Chỉ thực hiện được khi phiếu còn ở trạng thái Nháp.",
  MISSING_ODOO_IDS: "Chưa chọn đơn Odoo nào.",
  DA_GAN_THUNG: "Đơn Odoo này đã được đưa vào 1 thùng khác.",
  ODOO_KHONG_GUI: "Đơn Odoo này đã được xác nhận không gửi bảo hành — mở lại trước nếu cần gửi.",
  KHONG_CON_CHO_GUI: "Đơn Odoo không còn ở trạng thái chờ gửi sửa.",
  EMPTY_PHIEU: "Phiếu chưa có đơn bảo hành nào — thêm ít nhất 1 đơn trước khi xác nhận gửi.",
  HAS_CHILDREN: "Phiếu đang có đơn bên trong, không xoá được.",
  WRONG_STATE: "Trạng thái hiện tại không cho phép thao tác này.",
  MISSING_MO_TA_LOI: "Vui lòng nhập mô tả lỗi.",
  MISSING_NOI_DUNG: "Vui lòng nhập nội dung.",
  MISSING_LY_DO: "Vui lòng nhập lý do.",
  MISSING_GHI_CHU: "Vui lòng nhập ghi chú.",
  MISSING_KHACH_LE_INFO: "Vui lòng nhập đủ Tên khách hàng / SĐT / Sản phẩm bảo hành.",
  INVALID_SO_LUONG: "Số lượng phải là số nguyên ≥ 1.",
  INVALID_LY_DO: "Lý do không hợp lệ.",
  INVALID_KET_QUA: "Vui lòng chọn kết quả chẩn đoán.",
  INVALID_MODE: "Chế độ không hợp lệ.",
  INVALID_EMAIL: "Email không hợp lệ.",
  INVALID_FLAG: "Cờ vai trò không hợp lệ.",
  EMAIL_EXISTS: "Email đã tồn tại.",
  MA_LK_EXISTS: "Mã linh kiện đã tồn tại.",
  REQUIRE_LY_DO_CHAM: "Đơn đã quá hạn SLA — vui lòng chọn lý do chậm trước khi tiếp tục.",
  REQUIRE_LY_DO_CHENH_LECH: "Số lượng thực nhận khác số lượng khai — vui lòng nhập lý do chênh lệch.",
  REQUIRE_MAIL_PD: "Ngoài bảo hành — vui lòng nhập thông tin mail phê duyệt.",
  REQUIRE_NV: "Vui lòng chọn nhân viên sửa chữa phụ trách.",
  REQUIRE_LY_DO_TU_CHOI: "Vui lòng chọn lý do huỷ/từ chối.",
  REQUIRE_XU_LY_XAC: "Vui lòng chọn cách xử lý xác linh kiện (trả đối tác / tiêu huỷ / lưu kho).",
  REQUIRE_MA_MISA: "Vui lòng nhập mã MISA trước khi gửi duyệt kế toán (loại Đổi trả).",
  NO_ELIGIBLE_UNITS: "Không có đơn vị nào ở trạng thái chờ phân loại.",
  NO_IDS: "Chưa chọn đơn vị nào.",
  NOT_YET_RECEIVED: "Thùng này chưa được xác nhận tiếp nhận nội bộ.",
  ALREADY_SPLIT: "Đã có đơn vị con được tách — không thể đẩy lại.",
  ALREADY_IN_PHIEU_TRA: "Đơn vị này đã thuộc 1 phiếu trả khác.",
  CANNOT_MODIFY_SELF: "Không thể tự khoá/tự gỡ quyền của chính mình.",
  CANNOT_DELETE_SELF: "Không thể tự xoá chính mình.",
  MISSING_FIELDS: "Vui lòng điền đủ thông tin bắt buộc.",
  UNKNOWN_ACTION: "Thao tác không tồn tại.",
  // Them 05/09/2026 - "tạo hộ đơn bảo hành" (muc 1) + "mã sự cố bắt buộc, phải đúng của KTV đó" (muc 2).
  MISSING_CASE_ID: "Vui lòng nhập mã sự cố (mã case).",
  CASE_NOT_FOUND: "Không tìm thấy mã sự cố này bên hệ DVBH.",
  CASE_KTV_MISMATCH: "Sai mã sự vụ — mã này không thuộc về KTV đang tạo đơn.",
  KTV_NOT_FOUND: "Không tìm thấy KTV này trong danh bạ.",
  OUT_OF_KHU_VUC: "KTV này không thuộc Khu vực bạn phụ trách.",
  TOO_SOON: "Vừa mới đồng bộ — vui lòng thử lại sau ít phút.",
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return ERROR_MESSAGES[e.code] || e.code;
  if (e instanceof Error) return e.message;
  return "Đã có lỗi xảy ra.";
}
