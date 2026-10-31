// Tao "Huong-dan-KTV.docx". Chay: NODE_PATH=<thu muc co node_modules/docx> node build-huong-dan.cjs
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  HeadingLevel, BorderStyle, ShadingType, LevelFormat, TableOfContents, Footer, Header, PageNumber, VerticalAlign,
} = require("docx");

const OUT_DIR = __dirname;
const IMG = path.join(OUT_DIR, "anh");
const SIZES = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "anh-sizes.json"), "utf8"));
const FONT = "Arial";
const GREEN = "15803F";
const DARK = "116A34";
const CONTENT_W = 9026; // A4, le 1 inch

// ---------- helpers ----------
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, ...o });
function rich(s, base = {}) {
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) =>
    p.startsWith("**") ? run(p.slice(2, -2), { ...base, bold: true }) : run(p, base));
}
const P = (s, o = {}) => new Paragraph({ children: rich(s), spacing: { after: 120, line: 300 }, ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t)], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [run(t)] });
const B = (s, lvl = 0) => new Paragraph({ numbering: { reference: "bul", level: lvl }, children: rich(s), spacing: { after: 60, line: 290 } });
function STEP(n, s) {
  return new Paragraph({
    spacing: { after: 90, line: 300 }, keepNext: true,
    children: [run(` Bước ${n} `, { bold: true, color: "FFFFFF", shading: { type: ShadingType.CLEAR, fill: GREEN, color: "auto" } }), run("  "), ...rich(s)],
  });
}
// Giai thich khung so do tren anh: "(1) ..."
const MARK = (n, s) => new Paragraph({
  spacing: { after: 50, line: 280 }, indent: { left: 360 },
  children: [run(` ${n} `, { bold: true, color: "FFFFFF", size: 18, shading: { type: ShadingType.CLEAR, fill: "E11D2E", color: "auto" } }), run("  "), ...rich(s, { size: 21 })],
});
function NOTE(s, kind = "tip") {
  const c = { tip: ["E8F5EC", GREEN, "💡 Mẹo: "], warn: ["FFF7E0", "C98A00", "⚠ Lưu ý: "], err: ["FDECEC", "C62828", "⛔ Quan trọng: "] }[kind];
  return new Paragraph({
    spacing: { before: 80, after: 160, line: 290 },
    shading: { type: ShadingType.CLEAR, fill: c[0], color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: c[1], space: 8 } },
    indent: { left: 160, right: 160 },
    children: [run(c[2], { bold: true, color: c[1] }), ...rich(s)],
  });
}
function img(file, wPx) {
  const [w, h] = SIZES[file];
  return new ImageRun({ type: file.endsWith(".png") ? "png" : "jpg", data: fs.readFileSync(path.join(IMG, file)),
    transformation: { width: wPx, height: Math.round((h * wPx) / w) },
    altText: { title: file, description: file, name: file } });
}
const noB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: noB, bottom: noB, left: noB, right: noB };
let figNo = 0;
const cap = (c) => [run(`Hình ${++figNo}. `, { bold: true, size: 18, color: DARK }), run(c, { italics: true, size: 18, color: "555555" })];
// Anh dien thoai dat canh nhau. items: [file, caption]
function PHONES(items, wPx) {
  const n = items.length;
  wPx = wPx || (n >= 3 ? 158 : 178);
  const cw = Math.floor(CONTENT_W / n);
  const widths = items.map((_, i) => (i === n - 1 ? CONTENT_W - cw * (n - 1) : cw));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, borders: { ...NOB, insideHorizontal: noB, insideVertical: noB },
    rows: [new TableRow({ cantSplit: true, children: items.map(([f, c], i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, borders: NOB, verticalAlign: VerticalAlign.TOP,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [img(f, wPx)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 }, children: cap(c) }),
      ] })) })],
  });
}
const WIDE = (file, c, wPx = 420) => [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, keepNext: true, children: [img(file, wPx)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 }, children: cap(c) }),
];
const bd = { style: BorderStyle.SINGLE, size: 4, color: "C9D6CD" };
const BD = { top: bd, bottom: bd, left: bd, right: bd };
function TABLE(head, rows, widths) {
  const mk = (cells, isHead) => new TableRow({ tableHeader: isHead, cantSplit: true, children: cells.map((t, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders: BD,
    shading: isHead ? { type: ShadingType.CLEAR, fill: DARK, color: "auto" } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ children: isHead ? [run(t, { bold: true, color: "FFFFFF", size: 20 })] : rich(t, { size: 20 }) })],
  })) });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: [mk(head, true), ...rows.map((r) => mk(r, false))] });
}
const SP = () => new Paragraph({ spacing: { after: 60 }, children: [] });

// ---------- noi dung ----------
const C = [];

// Bia
C.push(
  new Paragraph({ spacing: { before: 1500 }, alignment: AlignmentType.CENTER, children: [img("logo.png", 120)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [run("HƯỚNG DẪN KỸ THUẬT VIÊN", { bold: true, size: 44, color: DARK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [run("Bảo hành đổi trả 3T", { bold: true, size: 36, color: GREEN })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 280 }, children: [run("Dành cho KTV / CTV / Trạm làm việc ngoài hiện trường", { size: 26, color: "333333" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [run("① Gửi hàng bảo hành   ·   ② Xem hàng đã gửi tới đâu   ·   ③ Nhận lại hàng", { bold: true, size: 24, color: DARK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1500 }, children: [run("Địa chỉ: https://suachua.dichvu3t.workers.dev", { size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [run("Phiên bản hệ thống 1.052 · Tài liệu cập nhật 31/10/2026", { size: 20, color: "666666" })] }),
);

// Muc luc
C.push(
  new Paragraph({ pageBreakBefore: true, children: [run("MỤC LỤC", { bold: true, size: 32, color: DARK })], spacing: { after: 200 } }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-2" }),
);

// ===== 0. Doc truoc =====
C.push(H1("0. Đọc trước — KTV chỉ cần nhớ 3 việc"),
  P("Ứng dụng **Bảo hành đổi trả 3T** dùng trên điện thoại. Mỗi ngày KTV chỉ làm **3 việc**, mỗi việc nằm ở **1 nút trên thanh menu dưới cùng**:"),
  TABLE(["Việc", "Bấm vào", "Làm gì", "Xem mục"], [
    ["**① Gửi hàng bảo hành**", "Gửi hàng", "Chọn đơn → tạo thùng → ghi mã lên thùng → giao xe → bấm **Xác nhận đã gửi xe**", "Phần 1"],
    ["**② Xem hàng đã gửi tới đâu**", "Đơn của tôi", "Xem từng đơn đang ở bước nào; nếu Admin hỏi thì **Bổ sung ngay**", "Phần 2"],
    ["**③ Nhận lại hàng**", "Nhận hàng", "Hàng về tới tay → bấm **Đã nhận hàng** (không nhận được → **Không nhận được**)", "Phần 3"],
  ], [2300, 1500, 4026, 1200]),
  SP(),
  P("Nút thứ tư **Việc của tôi** (Trang chủ) gom sẵn mọi việc đang chờ bạn — mở app ra là thấy ngay việc gì cần làm trước."),
  H2("0.1. Đường đi của 1 món hàng"),
  P("Thanh tiến trình 5 bước hiện dưới mỗi đơn. Bước đã qua tô xanh:"),
  TABLE(["Bước", "Ai làm", "Bạn thấy chữ"], [
    ["1. Gửi đi", "**Bạn** tạo thùng, giao xe, bấm Xác nhận đã gửi xe", "Chưa gửi → **Đang trên xe về Kho**"],
    ["2. Kho nhận", "Kho quét mã thùng", "**Kho đã nhận**"],
    ["3. Xử lý", "Admin bảo hành kiểm tra, sửa hoặc đổi mới", "**Đang xử lý** · **Cần bạn bổ sung** (nếu Admin hỏi)"],
    ["4. Trả về", "Kho đóng gói gửi trả bạn", "**Xử lý xong, đang chuẩn bị trả** → **Đang trả về bạn**"],
    ["5. Đã nhận", "**Bạn** bấm Đã nhận hàng", "**Đã nhận lại**"],
  ], [1600, 4200, 3226]),
  SP(),
  P("Ngoài ra có thể gặp: **Không bảo hành (đã huỷ)** — Admin từ chối bảo hành; **Thất lạc khi trả** — Kho xác nhận hàng trả bị thất lạc."),
  H2("0.2. Mấy từ hay gặp"),
  B("**Thùng (mã BH-xxxxxx):** 1 lần gửi hàng về kho, chứa nhiều đơn. Mỗi thùng có **mã QR** để dán / ghi lên thùng."),
  B("**Đơn (mã DH-xxxxxx):** 1 linh kiện / máy lỗi, gắn với **1 mã case** trên CRM."),
  B("**Đơn Odoo:** đơn bảo hành đã có sẵn trên Odoo, hệ thống tự kéo về. Chọn là xong, không phải gõ lại."),
  B("**Phiếu trả (mã TR-xxxxxx):** hàng Kho gửi trả lại cho bạn."),
  NOTE("Mỗi đơn **bắt buộc có mã case đúng của chính bạn**. Mã case sai hoặc của KTV khác thì hệ thống không cho tạo đơn.", "err"),
);

// ===== Bat dau =====
C.push(H1("Bắt đầu: đăng nhập và màn hình chính"),
  H2("Đăng nhập lần đầu"),
  STEP(1, "Mở Chrome (Android) hoặc Safari (iPhone), vào **suachua.dichvu3t.workers.dev**."),
  STEP(2, "Bấm **Đăng nhập với Google** (khung 1), chọn đúng Gmail đã khai báo với công ty."),
  STEP(3, "Nên **cài app lên màn hình chính** để lần sau mở bằng 1 chạm: bấm **📲** trên thanh trên cùng rồi làm theo hướng dẫn hiện ra."),
  PHONES([["s01_dang_nhap.jpg", "Màn hình đăng nhập"], ["s53_cai_app.jpg", "Hướng dẫn cài app lên màn hình chính"]]),
  NOTE("Thấy chữ **“Tài khoản đang chờ duyệt”**: Gmail chưa có trong danh sách KTV. Báo Giám sát khu vực khai báo giúp, rồi đăng nhập lại.", "warn"),
  H2("Màn hình “Việc của tôi”"),
  P("Mở app ra là vào màn này. Việc **gấp nhất nằm trên cùng**, làm từ trên xuống:"),
  PHONES([["s02a_trang_chu.jpg", "Việc cần làm (phần trên)"], ["s02b_trang_chu_duoi.jpg", "Đơn Odoo mới + Đang theo dõi (kéo xuống)"]]),
  MARK(1, "**Cần bạn bổ sung** — Admin đang hỏi thêm. Nút đỏ **Bổ sung ngay** (xem Phần 2.3)."),
  MARK(2, "**Hàng trả về** — Kho đã gửi trả. Hàng tới tay thì bấm **Đã nhận hàng** (Phần 3)."),
  MARK(3, "**Thanh menu dưới**: Việc của tôi · Gửi hàng · Đơn của tôi · Nhận hàng. Số đỏ = số việc đang chờ."),
  MARK(4, "**Thoát** — đăng xuất (có hỏi lại trước khi thoát)."),
  P("Kéo xuống (hình bên phải): khung **Đơn Odoo mới chờ gửi sửa** (1) với nút **Chọn đơn & tạo thùng**; **Đang theo dõi** (2) — các đơn đang đi; **Xem tất cả** (3) mở màn Đơn của tôi."),
);

// ===== Phan 1 =====
C.push(H1("Phần 1. Gửi hàng bảo hành"),
  P("Có 2 cách. **Cách 1 (nên dùng): chọn đơn Odoo có sẵn** — thông tin tự điền, nhanh và không sai. **Cách 2: tạo thùng rồi tự thêm đơn** — dùng khi đơn chưa có trên Odoo."),
  H2("1.1. Cách 1 — Gửi từ đơn Odoo (nhanh nhất)"),
  STEP(1, "Bấm **Gửi hàng** ở menu dưới → tab **Đơn Odoo mới** (khung 1) → tab con **Chưa gửi** (khung 2)."),
  STEP(2, "Tìm đơn bằng ô tìm (khung 3) — gõ không dấu cũng được: mã đơn, mã case, tên linh kiện."),
  STEP(3, "**Tích chọn** các đơn sẽ bỏ vào cùng 1 thùng, rồi bấm nút xanh **Tạo thùng với N đơn đã chọn**."),
  PHONES([["s10_don_odoo.jpg", "Danh sách đơn Odoo chờ gửi"], ["s11_chon_don.jpg", "Tích chọn đơn → Tạo thùng"]]),
  NOTE("Mỗi đơn hiện **tên linh kiện × số lượng** và **tên khách** ngay dòng đầu để dễ nhận ra."),
  STEP(4, "Thùng mới mở ra, các đơn đã nằm trong **Đơn trong thùng** (khung 1). Kiểm tra lại đủ món chưa."),
  STEP(5, "Bấm **✎ Sửa** ở khung Vận chuyển (khung 2) để điền thông tin xe (xem 1.2)."),
  STEP(6, "**Ghi mã thùng BH-xxxxxx lên thùng** hoặc dán tem QR (khung 3). Kho sẽ quét mã này khi nhận."),
  STEP(7, "Giao hàng cho xe xong mới bấm **Xác nhận đã gửi xe** (khung 4)."),
  PHONES([["s12_thung_vua_tao.jpg", "Thùng vừa tạo"], ["s16_sau_xac_nhan.jpg", "Sau khi xác nhận: Đang trên xe về Kho"]]),
  NOTE("Chỉ bấm **Xác nhận đã gửi xe** khi hàng **đã thật sự giao cho xe**. Sau khi xác nhận, thùng không thêm / bớt đơn được nữa.", "warn"),

  H2("1.2. Điền thông tin vận chuyển"),
  P("Bấm **✎ Sửa** ở khung Vận chuyển. Hệ thống **tự điền lại thông tin lần trước** trên máy bạn — thường chỉ cần kiểm tra."),
  MARK(1, "**Hình thức gửi**: Nhà xe / vận chuyển, Xe nội bộ, Bưu điện, hoặc **Giao trực tiếp**."),
  MARK(2, "**Ngày gửi xe** — mặc định hôm nay."),
  MARK(3, "**Gửi về kho miền** — để mặc định “Theo khu vực của KTV”. Chỉ đổi khi gửi hàng về kho miền khác."),
  MARK(4, "**Mã xe / Tài xế** — biển số hoặc tên tài xế (có gợi ý các lần trước)."),
  MARK(5, "**Đơn vị vận chuyển** — tên nhà xe (có gợi ý)."),
  MARK(6, "**Mã vận đơn** — nếu nhà xe có phát (không bắt buộc)."),
  PHONES([["s13_van_chuyen.jpg", "Thông tin vận chuyển"], ["s14_giao_truc_tiep.jpg", "Chọn “Giao trực tiếp”"]]),
  P("Mang hàng tới tận kho: chọn **Giao trực tiếp** (khung 1 hình phải). Ô **Người giao hàng** tự điền tên bạn (khung 2), nút đổi thành **Xác nhận đã giao hàng** (khung 3)."),
  NOTE("Không cần bấm lưu riêng: bấm **Xác nhận đã gửi xe** là hệ thống lưu luôn thông tin vận chuyển."),

  H2("1.3. Mã QR dán thùng"),
  P("Mỗi thùng có mã QR riêng. Bấm **Tải ảnh QR (in tem)** (khung 1) để lưu ảnh về máy, in ra dán lên thùng. Không in được thì **viết to mã BH-xxxxxx** lên thùng."),
  PHONES([["s15_qr.jpg", "Tải ảnh QR in tem"], ["s17_thung_cua_toi.jpg", "Tab Thùng của tôi"]]),
  P("Tab **Thùng của tôi** (hình phải) liệt kê các thùng đã tạo, mỗi thùng ghi rõ **Bước tiếp** (VD “Chờ Kho nhận”). Nút **+ Tạo thùng mới** (khung 1) dùng cho Cách 2."),

  H2("1.4. Cách 2 — Tạo thùng rồi tự thêm đơn"),
  STEP(1, "**Gửi hàng → Thùng của tôi → + Tạo thùng mới**. Thùng trống mở ra."),
  STEP(2, "Bấm **+ Thêm** (khung 1). Nếu đơn có trên Odoo thì bấm **Odoo** (khung 2) để chọn cho nhanh."),
  PHONES([["s20_thung_trong.jpg", "Thùng mới, chưa có đơn"], ["s21_ma_case_dung.jpg", "Nhập mã case → Kiểm tra"]]),
  STEP(3, "Nhập **mã case** (khung 1, hình phải) — có thể bấm chip mã case gợi ý hoặc **📋 Dán**. Bấm **Kiểm tra** (khung 2)."),
  STEP(4, "Mã đúng: hiện khung xanh **“Tìm thấy case”** với tên khách, sản phẩm, serial (khung 3). Kiểm tra đúng khách chưa."),
  STEP(5, "Ô **Linh kiện lỗi**: bấm vào, **gõ vài chữ** (không dấu cũng được, VD “bom tang”), chọn đúng linh kiện."),
  STEP(6, "Điền **Số lượng** (nút − / +), **Mô tả lỗi**, chọn **Loại đối trừ đề xuất** (Đổi trả hoặc Trừ công nợ), chụp **ảnh linh kiện** nếu có, rồi bấm **Thêm vào phiếu**."),
  PHONES([["s22_chon_linh_kien.jpg", "Gõ để tìm linh kiện"], ["s23_dien_don.jpg", "Điền số lượng, lỗi, ảnh"]]),
  STEP(7, "Đơn hiện trong **Đơn trong thùng (1)**. Thêm tiếp các đơn khác nếu có, rồi gửi xe như Cách 1."),
  PHONES([["s24_thung_co_don.jpg", "Thùng đã có đơn"], ["s25_ma_case_sai.jpg", "Mã case của KTV khác: bị chặn"]]),
  NOTE("Mã case **không tìm thấy** hoặc **thuộc KTV khác** sẽ hiện khung đỏ “Sai mã sự vụ” và nút **Thêm vào phiếu** bị khoá. Kiểm tra lại mã trên CRM; case đang giao nhầm người thì báo CSKH chuyển về đúng bạn.", "err"),

  H2("1.5. Chưa gửi ngay? Lưu nháp"),
  P("Đóng gói xong nhưng chưa có xe: bấm **Lưu nháp, gửi sau**. Thùng nằm ở trạng thái **Chưa gửi** — Kho chưa thấy, chưa tính thời gian. Màn **Việc của tôi** sẽ nhắc **Thùng chưa gửi** kèm nút **Mở thùng & gửi**."),
  PHONES([["s26_trao_doi.jpg", "Ghi chú gửi Kho / Admin"], ["s27_thung_nhap_tren_trang_chu.jpg", "Thùng nháp nhắc trên Việc của tôi"]]),
  P("Muốn nhắn Kho / Admin về thùng (VD “có 1 bơm, đã chèn xốp”): kéo xuống khung **Trao đổi / phản hồi**, gõ (khung 1) rồi bấm **Gửi** (khung 2)."),
  NOTE("Thùng **chưa có đơn nào** mà đóng lại thì hệ thống **tự xoá** để không tạo thùng rác."),
);

// ===== Phan 2 =====
C.push(H1("Phần 2. Xem hàng đã gửi tới đâu"),
  H2("2.1. Màn “Đơn của tôi”"),
  P("Bấm **Đơn của tôi** ở menu dưới. Ở đây có **mọi đơn bạn đã gửi**, kể cả đơn còn trong thùng nháp và đơn đang trên xe."),
  MARK(1, "Tab **Đang xử lý** — đơn chưa xong."),
  MARK(2, "Tab **Đã xong** — đơn đã nhận lại / đã kết thúc."),
  MARK(3, "Ô **tìm**: gõ tên khách, serial, mã case, tên linh kiện (không dấu cũng được)."),
  MARK(4, "**Lịch sử** — tra mọi lần bảo hành của 1 sản phẩm theo serial / mã case (Phần 4)."),
  MARK(5, "Đơn **Cần bạn bổ sung** luôn nằm trên cùng, có nút đỏ **Bổ sung ngay**."),
  PHONES([["s30_don_cua_toi.jpg", "Đơn của tôi"], ["s32_chi_tiet_thung.jpg", "Bấm vào đơn: mở chi tiết thùng"]]),
  H2("2.2. Đọc 1 thẻ đơn"),
  ...WIDE("s31_the_don.jpg", "Một thẻ đơn", 430),
  B("Dòng đầu: **tên khách hàng** (khung 1) — nhận ra đơn nhanh nhất."),
  B("Dòng 2: **linh kiện** đã gửi (khung 2)."),
  B("Góc phải: **trạng thái** hiện tại (khung 3)."),
  B("Thanh 5 bước: **Gửi đi → Kho nhận → Xử lý → Trả về → Đã nhận**. Bước nào xanh là đã qua."),
  P("Bấm vào thẻ để xem **chi tiết thùng** (hình phải ở 2.1): danh sách mọi đơn trong thùng (khung 1), trạng thái từng đơn (khung 2), trạng thái thùng (khung 3), thông tin vận chuyển, mã QR, trao đổi."),

  H2("2.3. Khi Admin yêu cầu bổ sung"),
  P("Admin bảo hành có thể hỏi lại (VD sai linh kiện, thiếu ảnh). Đơn đó hiện **Cần bạn bổ sung** ở cả Việc của tôi và Đơn của tôi."),
  STEP(1, "Bấm **Bổ sung ngay**. Đọc kỹ **lời nhắn của Admin** trong khung xanh (khung 1)."),
  STEP(2, "Sửa **Linh kiện lỗi** nếu Admin báo sai (khung 2), ghi lại **Mô tả lỗi** (khung 3)."),
  STEP(3, "Bấm **Gửi bổ sung** (khung 4). Đơn quay lại cho Admin xử lý tiếp."),
  PHONES([["s33_bo_sung.jpg", "Form bổ sung thông tin"], ["s34_da_xong.jpg", "Tab Đã xong"]]),
  NOTE("Nên bổ sung **trong ngày**. Quá 24 giờ thẻ sẽ hiện “đã quá 24h” và đơn bị chậm theo.", "warn"),
  H2("2.4. Đơn đã xong"),
  P("Tab **Đã xong** (hình phải ở 2.3) gồm đơn **Đã nhận lại** (khung 2) và đơn **Không bảo hành (đã huỷ)** (khung 3). Muốn biết lý do huỷ: bấm vào đơn xem chi tiết hoặc hỏi Admin qua khung Trao đổi."),
  H2("2.5. Đơn Odoo đã gửi"),
  P("Ở **Gửi hàng → Đơn Odoo mới → Đã gửi** xem lại các đơn Odoo đã bỏ vào thùng: thùng nào, đang ở bước nào. Bấm **Mở thùng ›** để xem chi tiết thùng."),
  ...WIDE("s35_odoo_da_gui.jpg", "Tab Đã gửi của đơn Odoo", 165),
);

// ===== Phan 3 =====
C.push(H1("Phần 3. Nhận lại hàng"),
  P("Khi Kho gửi hàng trả, bạn thấy ở **Nhận hàng** (menu dưới) và khung **Hàng trả về** trên Việc của tôi."),
  MARK(1, "**Mã phiếu trả** TR-xxxxxx, mã vận đơn, ngày gửi."),
  MARK(2, "**Danh sách món** trong kiện: linh kiện × số lượng — tên khách."),
  MARK(3, "**Đã nhận hàng** — bấm khi kiện đã tới tay và **đã kiểm đủ món**."),
  MARK(4, "**Không nhận được** — bấm khi nhà xe báo đã giao mà bạn không nhận được."),
  PHONES([["s40_nhan_hang.jpg", "Hàng đang trả về"], ["s42_sau_da_nhan.jpg", "Sau khi bấm Đã nhận hàng"]]),
  STEP(1, "Nhận kiện → mở ra **đối chiếu từng món** với danh sách trên app."),
  STEP(2, "Đủ món: bấm **Đã nhận hàng**. Phiếu biến khỏi danh sách, các đơn chuyển sang **Đã nhận lại**."),
  PHONES([["s43_da_xong_sau_nhan.jpg", "Đơn chuyển sang Đã nhận lại"], ["s41_khong_nhan_duoc.jpg", "Báo Kho: không nhận được hàng"]]),
  H2("3.1. Không nhận được hàng"),
  STEP(1, "Bấm **Không nhận được**."),
  STEP(2, "Ghi rõ tình hình (khung 1), VD “Nhà xe báo đã giao 31/10 nhưng tôi chưa nhận được thùng”."),
  STEP(3, "Bấm **Gửi cho Kho** (khung 2). Kho sẽ kiểm tra với nhà xe và báo kết quả."),
  NOTE("Chỉ bấm **Đã nhận hàng** khi hàng thật sự đã tới tay. Bấm rồi là kết thúc đơn, không hoàn tác được.", "err"),
);

// ===== Phan 4 =====
C.push(H1("Phần 4. Chức năng phụ nên biết"),
  H2("4.1. Hủy đơn Odoo bị tạo nhầm"),
  P("Đơn Odoo tạo nhầm, không cần gửi bảo hành: ở thẻ đơn bấm **⋯** → **Hủy đơn lỗi** (khung 1) → ghi lý do (không bắt buộc) → **Hủy đơn lỗi**."),
  PHONES([["s50_menu_huy.jpg", "Menu ⋯ của đơn Odoo"], ["s51_xac_nhan_huy.jpg", "Xác nhận hủy"], ["s52_huy_bo_mo_lai.jpg", "Tab Hủy bỏ → Mở lại"]]),
  P("Hủy nhầm? Vào tab **Hủy bỏ**, bấm **↺ Mở lại** (khung 1) — đơn quay về danh sách **Chưa gửi**."),
  H2("4.2. Lịch sử bảo hành của 1 sản phẩm"),
  P("**Đơn của tôi → Lịch sử**: gõ **số serial** hoặc **mã case** (ít nhất 5 ký tự) → **Tra cứu**. Hiện mọi lần sản phẩm đó đã gửi bảo hành (Lần 1, Lần 2…), linh kiện gì, kết quả ra sao — giúp biết sản phẩm có phải bảo hành lặp lại không."),
  ...WIDE("s54_lich_su.jpg", "Lịch sử bảo hành theo serial / mã case", 165),
  H2("4.3. Nhắn tin với Kho / Admin"),
  P("Mỗi thùng có khung **Trao đổi / phản hồi**. Nhắn ở đây thay vì gọi điện để mọi người cùng đọc được và còn lưu lại."),
  H2("4.4. Đăng xuất"),
  P("Bấm **Thoát** góc trên bên phải → xác nhận. Dùng chung máy với người khác thì nhớ đăng xuất."),
);

// ===== FAQ =====
C.push(H1("Câu hỏi thường gặp"),
  TABLE(["Gặp chuyện gì", "Vì sao", "Làm gì"], [
    ["“Tài khoản đang chờ duyệt”", "Gmail chưa khai báo", "Báo Giám sát khu vực khai báo Gmail, rồi đăng nhập lại"],
    ["Không thấy đơn Odoo của mình", "Đơn mới tạo (15 phút hệ thống lấy về 1 lần) hoặc case chưa giao cho bạn", "Đợi 15–30 phút; vẫn không có thì báo Admin bảo hành"],
    ["“Sai mã sự vụ — không tìm thấy case”", "Gõ sai mã case", "Kiểm tra lại mã trên CRM, bấm Kiểm tra"],
    ["“Sai mã sự vụ — case không thuộc về KTV…”", "Case đang giao cho KTV khác", "Báo CSKH chuyển case về đúng bạn, hoặc nhờ Giám sát tạo hộ"],
    ["Khung vàng “Hệ thống CRM không phản hồi”", "CRM tạm lỗi", "Tích ô **Vẫn tạo đơn** — hệ thống tự kiểm tra lại mã case sau"],
    ["Nút “Thêm vào phiếu” bị mờ", "Chưa bấm Kiểm tra, mã case sai, thiếu linh kiện hoặc mô tả lỗi", "Bấm Kiểm tra, điền đủ ô có dấu *"],
    ["Không thêm / xoá được đơn trong thùng", "Thùng đã xác nhận gửi xe", "Tạo thùng mới cho đơn còn thiếu"],
    ["Lỡ bấm Xác nhận đã gửi xe khi chưa gửi", "Bấm sớm", "Ghi vào khung Trao đổi của thùng và gọi báo Kho"],
    ["Thùng nháp tự biến mất", "Thùng chưa có đơn nào nên tự xoá", "Tạo lại và thêm đơn trước khi đóng"],
    ["Hàng trả về thiếu món / không nhận được", "Thất lạc khi vận chuyển", "Bấm **Không nhận được**, ghi rõ tình hình (Phần 3.1)"],
  ], [2900, 2700, 3426]),
  SP(),
  H2("Thói quen mỗi ngày"),
  B("Mở **Việc của tôi** đầu ngày, làm hết từ trên xuống."),
  B("Ưu tiên gửi bằng **đơn Odoo** — nhanh, đúng dữ liệu."),
  B("Luôn **ghi mã BH-xxxxxx / dán QR** lên thùng."),
  B("Chỉ bấm **Xác nhận đã gửi xe** khi xe đã nhận hàng."),
  B("Admin hỏi thì **bổ sung trong ngày**."),
  B("Hàng trả tới tay: **kiểm đủ rồi bấm Đã nhận hàng** ngay."),
);

// ===== Phu luc: kich ban quay video =====
C.push(H1("Phụ lục. Kịch bản quay video hướng dẫn"),
  P("Gợi ý quay màn hình điện thoại (dọc), mỗi cảnh 20–60 giây, tổng khoảng 8–10 phút. Cột **Lời thoại** là câu gợi ý, đọc chậm, rõ."),
  TABLE(["#", "Màn hình", "Thao tác trên máy", "Lời thoại gợi ý"], [
    ["1", "Đăng nhập", "Mở link → Đăng nhập với Google → chọn Gmail", "Mở app Bảo hành đổi trả 3T, đăng nhập bằng Gmail công ty."],
    ["2", "Cài app", "Bấm 📲 → làm theo hướng dẫn → mở lại từ màn hình chính", "Cài app ra màn hình chính để lần sau mở bằng 1 chạm."],
    ["3", "Việc của tôi", "Lướt từ trên xuống, chỉ 4 nút menu dưới", "Mở app là thấy việc cần làm, việc gấp nằm trên cùng. KTV chỉ cần 3 nút: Gửi hàng, Đơn của tôi, Nhận hàng."],
    ["4", "Gửi hàng → Đơn Odoo", "Tab Chưa gửi → tìm → tích 2 đơn → Tạo thùng", "Đơn đã có trên Odoo thì chỉ cần tích chọn rồi Tạo thùng, không phải gõ lại."],
    ["5", "Chi tiết thùng", "Chỉ Đơn trong thùng → ✎ Sửa vận chuyển", "Kiểm tra đủ món, điền nhà xe. Hệ thống nhớ thông tin lần trước."],
    ["6", "Mã QR", "Tải ảnh QR → chỉ mã BH trên thùng thật", "Ghi mã thùng hoặc dán QR lên thùng để Kho quét khi nhận."],
    ["7", "Xác nhận gửi xe", "Bấm Xác nhận đã gửi xe → trạng thái Đang trên xe về Kho", "Giao xe xong mới bấm Xác nhận đã gửi xe."],
    ["8", "Giao trực tiếp", "Đổi hình thức gửi sang Giao trực tiếp", "Mang tới tận kho thì chọn Giao trực tiếp, tên bạn tự điền."],
    ["9", "Tạo thùng thủ công", "+ Tạo thùng mới → + Thêm → nhập mã case → Kiểm tra", "Đơn chưa có trên Odoo: nhập mã case rồi bấm Kiểm tra, đúng khách là khung xanh."],
    ["10", "Chọn linh kiện", "Gõ “bom tang” → chọn → số lượng, lỗi, ảnh → Thêm vào phiếu", "Gõ vài chữ không dấu để tìm linh kiện, điền lỗi, chụp ảnh rồi Thêm vào phiếu."],
    ["11", "Mã case sai", "Nhập mã case của người khác → khung đỏ", "Mã case của KTV khác sẽ bị chặn — kiểm tra lại trên CRM."],
    ["12", "Lưu nháp", "Lưu nháp, gửi sau → Việc của tôi nhắc thùng chưa gửi", "Chưa có xe thì lưu nháp, app sẽ nhắc bạn gửi."],
    ["13", "Đơn của tôi", "2 tab, tìm theo tên khách, bấm 1 đơn", "Xem đơn đang ở bước nào qua thanh 5 bước."],
    ["14", "Bổ sung", "Bổ sung ngay → đọc lời Admin → sửa → Gửi bổ sung", "Admin hỏi thì đọc kỹ lời nhắn, sửa rồi gửi lại trong ngày."],
    ["15", "Nhận hàng", "Mở Nhận hàng → đối chiếu món → Đã nhận hàng", "Hàng về tới tay, kiểm đủ món rồi bấm Đã nhận hàng."],
    ["16", "Không nhận được", "Không nhận được → ghi chú → Gửi cho Kho", "Nhà xe báo đã giao mà chưa nhận được thì báo Kho tại đây."],
    ["17", "Phụ: hủy đơn lỗi, lịch sử", "⋯ → Hủy đơn lỗi → tab Hủy bỏ → Mở lại; Lịch sử tra serial", "Đơn Odoo tạo nhầm thì hủy, hủy nhầm thì mở lại. Tra lịch sử theo serial."],
  ], [450, 1650, 3100, 3826]),
);

// ---------- document ----------
const doc = new Document({
  creator: "Bảo hành đổi trả 3T", title: "Hướng dẫn Kỹ thuật viên",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 34, bold: true, font: FONT, color: DARK }, paragraph: { spacing: { before: 120, after: 240 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 6 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: GREEN }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "bul", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1000, hanging: 280 } } } },
  ] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, bottom: 1100, left: 1440, right: 1440 } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Bảo hành đổi trả 3T — Hướng dẫn Kỹ thuật viên", { size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Trang ", { size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: FONT })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(OUT_DIR, "Huong-dan-KTV.docx"), b); console.log("ok", b.length, "figs", figNo); });
