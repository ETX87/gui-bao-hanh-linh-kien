// Client API dung chung cho toan bo frontend - fetch() that toi /api/*, luon kem cookie session
// (credentials: "include"), tra JSON. Nem ApiError (co .code = ma loi backend tra ve, vd
// "REQUIRE_LY_DO_CHAM"/"REQUIRE_MA_MISA"...) de man hinh tu doc va hien dung thong bao/mo dung modal
// phu (VD gate SLA) thay vi chi hien "co loi xay ra" chung chung.

export class ApiError extends Error {
  code: string;
  status: number;
  // 16/11/2026 (v1.133): cau bao loi day du do server tra kem (vd loi chuyen tiep tu app Dat linh kien) - uu tien hien cau nay.
  serverMessage?: string;
  constructor(code: string, status: number, serverMessage?: string) {
    super(code);
    this.code = code;
    this.status = status;
    this.serverMessage = serverMessage;
  }
}

// 08/11/2026 - "bấm Thêm vào phiếu thì nút mờ đi, màn hình đứng yên": fetch() khong co gioi han thoi gian, mang
// dien thoai cham/rot giua chung thi promise treo vo han -> nut "dang gui" khong bao gio mo lai. timeoutMs (tuy chon)
// huy request bang AbortController va nem ApiError("TIMEOUT"); loi mang (fetch reject) nem ApiError("NETWORK").
// 16/11/2026 - buoc KTV giu qua SLA chua giai trinh: backend tra 400 REQUIRE_GIAI_TRINH kem `gt` (doi tuong + buoc).
// Lop api tu mo hop giai trinh (GiaiTrinhHost gan o App) roi GUI LAI request 1 lan - khong phai sua tung man.
export interface GtYeuCau {
  entity_type: string;
  entity_id: string;
  gd: string;
  so: string;
  ten: string;
  qua_gio: number;
}
let gtHandler: ((gt: GtYeuCau) => Promise<boolean>) | null = null;
export function setGiaiTrinhHandler(fn: ((gt: GtYeuCau) => Promise<boolean>) | null) {
  gtHandler = fn;
}

export interface RequestOpts {
  timeoutMs?: number;
}

async function request<T>(method: string, path: string, body?: unknown, opts?: RequestOpts, daThu = false): Promise<T> {
  const ctrl = opts?.timeoutMs ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts!.timeoutMs) : null;
  let res: Response;
  let json: unknown = null;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl?.signal,
    });
    try {
      json = await res.json();
    } catch {
      /* no body */
    }
  } catch (e) {
    if (ctrl?.signal.aborted) throw new ApiError("TIMEOUT", 0);
    if (e instanceof ApiError) throw e;
    throw new ApiError("NETWORK", 0);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) {
    const code = (json as { error?: string } | null)?.error || `HTTP_${res.status}`;
    const gt = (json as { gt?: GtYeuCau } | null)?.gt;
    if (code === "REQUIRE_GIAI_TRINH" && gt && gtHandler && !daThu) {
      if (await gtHandler(gt)) return request<T>(method, path, body, opts, true);
      throw new ApiError("GIAI_TRINH_HUY", res.status);
    }
    const msg = (json as { message?: unknown } | null)?.message;
    throw new ApiError(code, res.status, typeof msg === "string" && msg ? msg : undefined);
  }
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, opts?: RequestOpts) => request<T>("POST", path, body ?? {}, opts),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// Thong diep loi de doc bang tieng Viet cho cac ma loi backend hay gap - dung o Toast/inline error.
// Khong co trong danh sach nay thi hien nguyen code (van con thong tin hon la an di).
export const ERROR_MESSAGES: Record<string, string> = {
  MISSING_IDS: "Chưa chọn mục nào.",
  EMPTY_PHIEU_TRA: "Phiếu trả chưa có đơn vị nào.",
  PHIEU_TRA_CON_DON: "Phiếu còn đơn vị bên trong — bỏ hết đơn vị trước khi xoá phiếu.",
  KTV_MISMATCH: "Đơn vị không cùng KTV nhận với phiếu trả.",
  LOAI_DOI_TRU_MISMATCH: "Đơn vị khác loại đối trừ với phiếu trả.",
  NOT_READY: "Đơn vị chưa sẵn sàng hoặc đã thuộc phiếu trả khác.",
  LINH_KIEN_NOT_FOUND: "Linh kiện không có trong danh mục.",
  INVALID_DOI_TAC: "Tên đối tác không hợp lệ.",
  INVALID_VAI_TRO: "Vai trò không hợp lệ.",
  MISSING_LINH_KIEN: "Chưa chọn linh kiện.",
  INVALID_SO_TIEN: "Số tiền không hợp lệ (phải là số nguyên ≥ 0).",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
  XEM_NHU_CHI_DOC: "Đang ở chế độ \"Xem như người dùng\" — chỉ xem, không thao tác được. Thoát về Admin để thao tác.",
  INVALID_ROLE: "Vai trò test không hợp lệ.",
  TAI_KHOAN_KHONG_HOAT_DONG: "Tài khoản này đang bị khoá hoặc chưa được duyệt.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  INVALID_MIEN: "Miền không hợp lệ.",
  DOI_THEO_PHIEU_GUI: "Đơn này thuộc 1 thùng gửi — đổi miền ở thùng (phiếu gửi) để áp cho cả thùng.",
  NOT_DRAFT: "Chỉ thực hiện được khi phiếu còn ở trạng thái Nháp.",
  KHO_DA_XU_LY: "Kho đã đóng gói phiếu này — không sửa mã MISA được nữa.",
  MISSING_ODOO_IDS: "Chưa chọn đơn Odoo nào.",
  DA_GAN_THUNG: "Đơn Odoo này đã được đưa vào 1 thùng khác.",
  ODOO_KHONG_GUI: "Đơn Odoo này đã bị hủy (đơn lỗi) — mở lại trước nếu cần gửi.",
  KHONG_CON_CHO_GUI: "Đơn Odoo không còn ở trạng thái chờ gửi sửa.",
  DRIVE_CHUA_CAU_HINH: "Chưa kết nối Google Drive để lưu ảnh — báo Admin hệ thống.",
  GOOGLE_DRIVE_NOT_CONNECTED: "Google Drive lưu ảnh chưa được kết nối (Cài đặt bên app Đặt mua linh kiện).",
  DRIVE_KHONG_PHAN_HOI: "Tải ảnh lên Google Drive quá lâu — thử lại sau ít phút.",
  ANH_QUA_LON: "Ảnh quá lớn — chọn ảnh khác hoặc chụp lại.",
  DINH_DANG_ANH_KHONG_HO_TRO: "File không phải ảnh hợp lệ — chọn ảnh JPG/PNG.",
  QUA_NHIEU_ANH: "Tối đa 10 ảnh mỗi lần gửi.",
  ANH_KHONG_HOP_LE: "Ảnh không hợp lệ.",
  TAI_ANH_NGUON_THAT_BAI: "Không tải được ảnh từ nguồn gửi sang.",
  UPLOAD_FAILED: "Tải ảnh lên Google Drive thất bại — thử lại.",
  EMPTY_PHIEU: "Phiếu chưa có đơn bảo hành nào — thêm ít nhất 1 đơn trước khi xác nhận gửi.",
  HAS_CHILDREN: "Phiếu đang có đơn bên trong, không xoá được.",
  WRONG_STATE: "Trạng thái hiện tại không cho phép thao tác này.",
  GIAI_DOAN_SAU: "Giai đoạn sau đã được thực hiện (phiếu trả đã gửi Kế toán / linh kiện đã cấp) — không lùi lại được.",
  MISSING_MO_TA_LOI: "Vui lòng nhập mô tả lỗi.",
  MISSING_NOI_DUNG: "Vui lòng nhập nội dung.",
  MISSING_LY_DO: "Vui lòng nhập lý do.",
  MISSING_GHI_CHU: "Vui lòng nhập ghi chú.",
  MISSING_KHACH_LE_INFO: "Vui lòng nhập đủ Tên khách hàng / SĐT / Sản phẩm bảo hành.",
  INVALID_SO_LUONG: "Số lượng phải là số nguyên ≥ 1.",
  INVALID_LINH_KIEN: "Linh kiện không có trong danh mục.",
  INVALID_LOAI_DOI_TRU: "Loại đối trừ không hợp lệ.",
  MISSING_THIEU: "Hãy tích ít nhất 1 món bạn không nhận được.",
  INVALID_LY_DO: "Lý do không hợp lệ.",
  INVALID_KET_QUA: "Vui lòng chọn kết quả chẩn đoán.",
  INVALID_MODE: "Chế độ không hợp lệ.",
  INVALID_EMAIL: "Email không hợp lệ.",
  INVALID_FLAG: "Cờ vai trò không hợp lệ.",
  EMAIL_EXISTS: "Email đã tồn tại.",
  MA_LK_EXISTS: "Mã linh kiện đã tồn tại.",
  REQUIRE_GIAI_TRINH: "Bước này đã quá SLA — cần giải trình trước khi tiếp tục.",
  GIAI_TRINH_HUY: "Chưa giải trình nên chưa thực hiện được — bước này đã quá SLA.",
  LY_DO_KHONG_HOP_BUOC: "Lý do này không thuộc bước đang dừng — chọn lý do khác.",
  MISSING_LOAI_LOI: "Chọn phân loại lỗi (lỗi nội bộ / lỗi đối tác / lỗi của tôi / khác).",
  REQUIRE_BANG_CHUNG: "Không phải lỗi của bạn thì cần có bằng chứng — ghi mô tả hoặc đính kèm ảnh.",
  REQUIRE_LY_DO_CHAM: "Đơn đã quá hạn SLA — vui lòng chọn lý do chậm trước khi tiếp tục.",
  REQUIRE_LY_DO_CHENH_LECH: "Số lượng thực nhận khác số lượng khai — vui lòng nhập lý do chênh lệch.",
  REQUIRE_MAIL_PD: "Ngoài bảo hành — vui lòng nhập thông tin mail phê duyệt.",
  REQUIRE_NV: "Vui lòng chọn nhân viên sửa chữa phụ trách.",
  REQUIRE_HANG_DOI_TAC: "Giao NV sửa chữa bắt buộc có đủ Hãng + Đối tác (mở chi tiết đơn → Phân loại để chọn).",
  DOI_TAC_KHONG_CO: "Đối tác không có trong danh mục.",
  NGOAI_DOI_TAC_DUOC_GAN: "Xác / thùng không thuộc đối tác bạn được gán.",
  DOI_TAC_MISMATCH: "1 thùng chỉ chứa xác của 1 đối tác.",
  XAC_TRONG_THUNG: "Xác đã vào thùng trả xác — bỏ khỏi thùng trước.",
  KE_TOAN_DA_CHOT: "Kế toán đã chốt phiếu trừ / trả công nợ — không sửa / hủy được nữa.",
  KHONG_PHAI_CONG_NO_SUA_CHUA: "Lần cấp MUA HÀNG SỬA CHỮA (hết bảo hành) không qua bước xác nhận xác / trừ công nợ.",
  CHUA_XAC_NHAN: "Lần cấp chưa xác nhận tiêu hao.",
  REQUIRE_LY_DO_TU_CHOI: "Vui lòng chọn lý do huỷ/từ chối.",
  REQUIRE_XU_LY_XAC: "Vui lòng chọn cách xử lý xác linh kiện (trả đối tác / tiêu huỷ / lưu kho).",
  REQUIRE_MA_MISA: "Vui lòng nhập mã phiếu MISA.",
  REQUIRE_MA_DON_HANG: "Vui lòng nhập mã đơn hàng.",
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
  ADMIN_DA_XU_LY: "Admin bảo hành đã nhận thùng / xác nhận số lượng — không sửa đơn được nữa, hãy nhắn Admin bảo hành.",
  CASE_TU_ODOO: "Đơn tạo từ Odoo — mã case lấy theo Odoo, không sửa được ở đây.",
  DON_DA_KET_THUC: "Đơn đã kết thúc, không sửa mã case được nữa.",
  CASE_NOT_FOUND: "Không tìm thấy mã sự cố này bên hệ DVBH.",
  LADA_NOT_FOUND: "Không tìm thấy mã Lada này — tích \"tự chịu trách nhiệm\" nếu vẫn muốn tạo đơn.",
  LADA_KHONG_PHAN_HOI: "Hệ Lada đang không phản hồi — tích \"tự chịu trách nhiệm\" nếu vẫn muốn tạo đơn, hoặc thử Kiểm tra lại.",
  DVBH_KHONG_PHAN_HOI: "Hệ DVBH đang không phản hồi — tích “Vẫn tạo đơn” để tạo trước, hệ thống sẽ tự xác minh mã case sau.",
  TRUNG_LINH_KIEN: "Mã case này đã có đơn cùng linh kiện — không thể tạo trùng (chỉ tạo lại khi đơn cũ bị từ chối / huỷ).",
  CASE_KTV_MISMATCH: "Sai mã sự vụ — mã này không thuộc về KTV đang tạo đơn.",
  KTV_NOT_FOUND: "Không tìm thấy KTV này trong danh bạ.",
  OUT_OF_KHU_VUC: "KTV này không thuộc Khu vực bạn phụ trách.",
  GS_KHONG_HOP_LE: "Có tài khoản không mang vai trò Giám sát — kiểm tra lại danh sách.",
  TOO_SOON: "Vừa mới đồng bộ — vui lòng thử lại sau ít phút.",
  TIMEOUT: "Máy chủ phản hồi quá lâu (mạng chậm hoặc mất kết nối) — kiểm tra lại rồi thử lần nữa.",
  NETWORK: "Không kết nối được máy chủ — kiểm tra mạng (Wi-Fi/4G) rồi thử lại.",
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.serverMessage || ERROR_MESSAGES[e.code] || e.code;
  if (e instanceof Error) return e.message;
  return "Đã có lỗi xảy ra.";
}
