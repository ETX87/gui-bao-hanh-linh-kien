const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  HeadingLevel, BorderStyle, ShadingType, LevelFormat, PageBreak, TableOfContents, Footer, Header, PageNumber,
  VerticalAlign,
} = require("docx");

const OUT_DIR = "F:/claude/QLBH 3T/gui-bao-hanh-linh-kien/du an sua chua bao hanh/Huong-dan-KTV";
const IMG = path.join(OUT_DIR, "anh");
const SIZES = JSON.parse(fs.readFileSync(path.join(__dirname, "anh-sizes.json"), "utf8"));
const FONT = "Arial";
const GREEN = "15803F";
const DARK = "116A34";
const CONTENT_W = 9026; // A4, le 1 inch

// ---------- helpers ----------
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, ...o });
function rich(s, base = {}) {
  // **dam** trong chuoi
  return s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) =>
    p.startsWith("**") ? run(p.slice(2, -2), { ...base, bold: true }) : run(p, base));
}
const P = (s, o = {}) => new Paragraph({ children: rich(s), spacing: { after: 120, line: 300 }, ...o });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t)], pageBreakBefore: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, children: [run(t)] });
const B = (s, lvl = 0) => new Paragraph({ numbering: { reference: "bul", level: lvl }, children: rich(s), spacing: { after: 60, line: 290 } });
function STEP(n, s) {
  return new Paragraph({
    spacing: { after: 80, line: 300 }, indent: { left: 0 },
    children: [run(` Bước ${n} `, { bold: true, color: "FFFFFF", shading: { type: ShadingType.CLEAR, fill: GREEN, color: "auto" } }), run("  "), ...rich(s)],
  });
}
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
// items: [file, caption]
function PHONES(items, wPx) {
  const n = items.length;
  wPx = wPx || (n >= 3 ? 165 : 185);
  const cw = Math.floor(CONTENT_W / n);
  const widths = items.map((_, i) => (i === n - 1 ? CONTENT_W - cw * (n - 1) : cw));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, borders: { ...NOB, insideHorizontal: noB, insideVertical: noB },
    rows: [new TableRow({ cantSplit: true, children: items.map(([f, cap], i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA }, borders: NOB, verticalAlign: VerticalAlign.TOP,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [img(f, wPx)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 },
          children: [run(`Hình ${++figNo}. `, { bold: true, size: 18, color: DARK }), run(cap, { italics: true, size: 18, color: "555555" })] }),
      ] })) })],
  });
}
function WIDE(file, cap, wPx = 600) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [img(file, wPx)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 160 },
      children: [run(`Hình ${++figNo}. `, { bold: true, size: 18, color: DARK }), run(cap, { italics: true, size: 18, color: "555555" })] }),
  ];
}
const bd = { style: BorderStyle.SINGLE, size: 4, color: "C9D6CD" };
const BD = { top: bd, bottom: bd, left: bd, right: bd };
function TABLE(head, rows, widths) {
  const mk = (cells, isHead) => new TableRow({ tableHeader: isHead, children: cells.map((t, i) => new TableCell({
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
  new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [img("logo.png", 120)] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [run("HƯỚNG DẪN SỬ DỤNG", { bold: true, size: 44, color: DARK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [run("Hệ thống Sửa chữa bảo hành 3T", { bold: true, size: 36, color: GREEN })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240 }, children: [run("Dành cho vai trò: KỸ THUẬT VIÊN (KTV / CTV / Trạm)", { size: 26, color: "333333" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [run("Gửi linh kiện lỗi về kho · Theo dõi tiến độ · Nhận hàng trả", { italics: true, size: 22, color: "666666" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600 }, children: [run("Địa chỉ truy cập: https://suachua.dichvu3t.workers.dev", { size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [run("Phiên bản hệ thống 1.033 · Tài liệu cập nhật 19/10/2026", { size: 20, color: "666666" })] }),
);
// Muc luc
C.push(
  new Paragraph({ pageBreakBefore: true, children: [run("MỤC LỤC", { bold: true, size: 32, color: DARK })], spacing: { after: 200 } }),
  new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-2" }),
  NOTE("Nếu mục lục trống khi mở bằng Word, bấm chuột phải vào vùng mục lục → **Update Field / Cập nhật trường** để hiện đầy đủ số trang."),
);

// 1
C.push(H1("1. Tổng quan"),
  P("Tài liệu này hướng dẫn **Kỹ thuật viên (KTV), Cộng tác viên (CTV) và Trạm** sử dụng hệ thống **Sửa chữa bảo hành 3T** để gửi linh kiện / máy lỗi trong bảo hành về kho trung tâm, theo dõi tiến độ xử lý và xác nhận nhận lại hàng."),
  H2("1.1. Việc của KTV trong quy trình"),
  TABLE(["Bước", "Ai làm", "Việc cần làm", "KTV thấy ở đâu"], [
    ["1", "**KTV**", "Tạo thùng hàng, thêm các đơn bảo hành (mỗi đơn gắn 1 mã case), xác nhận đã gửi xe", "Gửi hàng"],
    ["2", "Kho", "Nhận thùng hàng (quét QR trên thùng)", "Trạng thái thùng: Kho đã tiếp nhận"],
    ["3", "Admin bảo hành", "Kiểm tra, phân loại, quyết định sửa / đổi mới / trừ công nợ…", "Tiến độ"],
    ["3b", "**KTV**", "Nếu Admin yêu cầu: bổ sung thông tin / sửa linh kiện", "Tiến độ → nút Bổ sung"],
    ["4", "NV sửa chữa", "Sửa chữa, kiểm tra linh kiện", "Tiến độ"],
    ["5", "Admin, Kế toán, Kho", "Tạo phiếu trả, duyệt, đóng gói, gửi trả về KTV", "Nhận hàng"],
    ["6", "**KTV**", "Xác nhận đã nhận hàng trả (hoặc khiếu nại nếu không nhận được)", "Nhận hàng"],
  ], [800, 1900, 4026, 2300]),
  SP(),
  H2("1.2. Các khái niệm cần biết"),
  B("**Thùng hàng (phiếu gửi, mã BH-xxxxxx):** 1 lần gửi hàng về kho. 1 thùng chứa nhiều đơn bảo hành. Mã thùng có QR để dán lên thùng."),
  B("**Đơn bảo hành (mã DH-xxxxxx):** 1 dòng linh kiện lỗi, gắn với **1 mã case** trên CRM, có số lượng. Sau khi Admin xác nhận số lượng, đơn được tách thành các **đơn vị** (DH-xxxxxx-1, -2…) để xử lý riêng từng cái."),
  B("**Đơn Odoo:** đơn bảo hành đã tạo sẵn trên Odoo, hệ thống tự kéo về (15 phút/lần). KTV chỉ cần chọn để đưa vào thùng — thông tin case, linh kiện, số lượng, lỗi được điền sẵn."),
  B("**Phiếu trả (mã TR-xxxxxx):** thùng hàng kho gửi trả lại cho KTV sau khi xử lý xong."),
  B("**Loại đối trừ:** **Đổi trả** (nhận lại linh kiện / máy) hoặc **Trừ công nợ**. KTV đề xuất khi tạo đơn, Admin bảo hành chốt."),
  NOTE("Mỗi đơn bảo hành **bắt buộc có mã case đúng của chính KTV phụ trách**. Hệ thống kiểm tra với CRM và sẽ chặn nếu mã case không tồn tại hoặc thuộc KTV khác.", "err"),
);

// 2
C.push(H1("2. Đăng nhập và cài ứng dụng lên điện thoại"),
  H2("2.1. Đăng nhập"),
  STEP(1, "Mở trình duyệt (Chrome / Safari) trên điện thoại, vào địa chỉ **suachua.dichvu3t.workers.dev**."),
  STEP(2, "Bấm **Đăng nhập với Google** (khung số 1), chọn đúng **tài khoản Gmail đã khai báo** với công ty."),
  STEP(3, "Tài khoản KTV có trong danh bạ hoặc đang làm việc trên hệ thống nhân sự ETX sẽ **được duyệt tự động** và vào thẳng Trang chủ."),
  PHONES([["m01-dang-nhap.jpg", "Màn hình đăng nhập"], ["m30-cai-dat-app.jpg", "Hướng dẫn cài app lên màn hình chính"]]),
  NOTE("Nếu thấy thông báo **“Tài khoản đang chờ duyệt”**: Gmail của bạn chưa có trong danh bạ KTV. Liên hệ Giám sát khu vực hoặc Admin hệ thống để được khai báo, sau đó đăng xuất và đăng nhập lại.", "warn"),
  H2("2.2. Cài ứng dụng lên màn hình chính (khuyên dùng)"),
  P("Cài lên màn hình chính để mở nhanh như một ứng dụng, không cần gõ địa chỉ."),
  ...WIDE("m03b-thanh-tren.jpg", "Thanh trên cùng: nút cài đặt 📲 và nút Thoát (1)", 420),
  STEP(1, "Bấm biểu tượng **📲** trên thanh trên cùng."),
  STEP(2, "**Android (Chrome):** trình duyệt hiện hộp hỏi cài đặt → bấm **Cài đặt**. Nếu không hiện, làm theo hướng dẫn: menu **⋮** → **Cài đặt ứng dụng / Thêm vào Màn hình chính**."),
  STEP(3, "**iPhone (Safari):** bấm nút **Chia sẻ ⬆️** → **Thêm vào Màn hình chính**."),
  P("Nút **Thoát** dùng để đăng xuất (khi đổi người dùng hoặc đổi máy)."),
);

// 3
C.push(H1("3. Trang chủ và thanh menu"),
  P("Sau khi đăng nhập, **Trang chủ** cho biết ngay bạn còn bao nhiêu việc cần làm."),
  PHONES([["m02-trang-chu.jpg", "Trang chủ — các việc cần làm"], ["m31-nut-tao-phieu.jpg", "Màn hình Gửi hàng"]]),
  B("**Khung xanh “Bạn có N việc cần làm”**: mỗi nút là 1 loại việc, bấm để đi thẳng tới màn hình xử lý:"),
  B("(1) **Đơn cần bổ sung thông tin** — Admin bảo hành yêu cầu bạn sửa / bổ sung (xem mục 6).", 1),
  B("(2) **Đơn Odoo chờ gửi sửa** — đơn Odoo của bạn chưa đưa vào thùng (xem mục 4).", 1),
  B("(3) **Hàng trả chờ xác nhận nhận** — kho đã gửi trả, bạn cần xác nhận (xem mục 7).", 1),
  B("**Cảnh báo đơn tồn**: số việc đang tồn, đã quá 24 giờ (vàng) hoặc quá 72 giờ (đỏ). Chấm xanh = mọi thứ trong hạn."),
  B("**Tổng quan hàng đợi**: số liệu tóm tắt, bấm vào ô để mở màn hình tương ứng."),
  H2("Thanh menu dưới cùng"),
  ...WIDE("m03-menu-duoi.jpg", "Thanh menu dưới cùng — số đỏ là số việc còn chờ", 420),
  TABLE(["Mục", "Dùng để"], [
    ["Trang chủ", "Xem tổng số việc cần làm, cảnh báo đơn tồn"],
    ["Gửi hàng", "Chọn đơn Odoo, tạo thùng hàng, thêm đơn bảo hành, xác nhận gửi xe"],
    ["Tiến độ", "Tra cứu trạng thái từng đơn; bổ sung thông tin khi Admin yêu cầu"],
    ["Nhận hàng", "Xác nhận đã nhận hàng trả về, hoặc khiếu nại không nhận được"],
    ["Lịch sử", "Tra lịch sử bảo hành theo số Serial hoặc mã case"],
  ], [2200, 6826]),
);

// 4 Odoo
C.push(H1("4. Gửi hàng từ đơn Odoo (cách nhanh nhất)"),
  P("Đơn bảo hành tạo trên Odoo được tự động đưa về mục **Đơn bảo hành Odoo** ở đầu màn hình **Gửi hàng**. Hệ thống nhận ra đơn của bạn theo **mã KTV phụ trách** trên case."),
  H2("4.1. Ba tab quản lý đơn Odoo"),
  TABLE(["Tab", "Ý nghĩa"], [
    ["**Chưa gửi**", "Đơn Odoo của bạn chưa đưa vào thùng nào — cần gửi"],
    ["**Đã gửi**", "Đơn đã nằm trong thùng; hiện thùng nào, tiến độ xử lý tới đâu"],
    ["**Hủy bỏ**", "Đơn bạn đã xác nhận “Hủy đơn lỗi” (tạo nhầm trên Odoo); có thể mở lại"],
  ], [2000, 7026]),
  SP(),
  H2("4.2. Tạo thùng hàng từ đơn Odoo"),
  STEP(1, "Vào **Gửi hàng**, ở tab **Chưa gửi**, **tích chọn** các đơn sẽ gửi chung 1 thùng (hoặc tích **Chọn tất cả**)."),
  STEP(2, "Bấm **Tạo thùng với N đơn đã chọn** (khung số 1)."),
  STEP(3, "Hệ thống tạo thùng nháp mới và mở chi tiết thùng — các đơn đã được điền sẵn mã case, linh kiện, số lượng, mô tả lỗi (có nhãn **Odoo**)."),
  STEP(4, "Kiểm tra thông tin vận chuyển (mục 5.2), rồi bấm **Xác nhận đã gửi xe** khi hàng đã thật sự giao cho xe."),
  PHONES([["m05-odoo-chon.jpg", "Chọn đơn Odoo, bấm Tạo thùng (1); Hủy đơn lỗi (2)"], ["m09-phieu-nhap.jpg", "Thùng nháp vừa tạo từ 2 đơn Odoo"]]),
  H2("4.3. Hủy đơn lỗi (đơn tạo nhầm trên Odoo)"),
  P("Nếu một đơn Odoo bị tạo nhầm và **không cần gửi bảo hành**:"),
  STEP(1, "Bấm **🗑 Hủy đơn lỗi** trên đơn đó (khung số 2 ở Hình trên)."),
  STEP(2, "Nhập lý do (không bắt buộc), bấm **Hủy đơn lỗi** để xác nhận. Đơn chuyển sang tab **Hủy bỏ** và được báo về hệ thống DVBH."),
  STEP(3, "Nếu hủy nhầm: vào tab **Hủy bỏ**, bấm **↺ Mở lại** — đơn quay về tab Chưa gửi."),
  PHONES([["m06-huy-don-loi.jpg", "Xác nhận hủy đơn lỗi"], ["m07-tab-huy-bo.jpg", "Tab Hủy bỏ — nút Mở lại (1)"], ["m21-tab-da-gui.jpg", "Tab Đã gửi — tiến độ từng đơn"]]),
  NOTE("Ở tab **Đã gửi**, bấm **Mở thùng ›** để xem lại thùng chứa đơn đó. Đơn đã vào thùng thì không hủy được nữa — muốn bỏ ra, mở thùng (khi còn nháp) và bấm **Xoá** đơn."),
);

// 5 Tao thung thu cong
C.push(H1("5. Tạo thùng hàng và thêm đơn bảo hành"),
  P("Dùng cách này cho đơn **không có trên Odoo**, hoặc khi cần thêm đơn vào thùng đang làm."),
  H2("5.1. Tạo thùng mới"),
  STEP(1, "Vào **Gửi hàng**, ở mục **Phiếu gửi hàng của tôi**, bấm **+ Tạo phiếu mới**."),
  STEP(2, "Hệ thống tạo thùng **nháp** (mã BH-xxxxxx) và mở chi tiết thùng. Thông tin vận chuyển lần trước được **tự điền sẵn**."),
  PHONES([["m31-nut-tao-phieu.jpg", "Nút + Tạo phiếu mới (1)"], ["m32-phieu-moi.jpg", "Thùng nháp mới, chưa có đơn"], ["m33-tu-xoa-nhap.jpg", "Đóng thùng trống → tự xoá"]]),
  NOTE("Nếu đóng thùng nháp **mà chưa thêm đơn nào**, hệ thống **tự xoá** thùng đó để không sinh phiếu thừa. Thùng nháp chưa gửi thì **Kho không nhìn thấy**."),
  H2("5.2. Nhập thông tin vận chuyển"),
  PHONES([["m10-van-chuyen.jpg", "Hình thức gửi (1), Lưu nháp (2), Xác nhận gửi xe (3), Lưu nháp gửi sau (4)"], ["m11-giao-truc-tiep.jpg", "Chọn Giao trực tiếp: người giao = chính KTV"]]),
  TABLE(["Ô", "Cách nhập"], [
    ["Hình thức gửi", "Nhà xe / vận chuyển · Xe nội bộ · Bưu điện · **Giao trực tiếp**"],
    ["Ngày gửi xe", "Ngày thực tế giao hàng cho xe (mặc định hôm nay)"],
    ["Mã xe / Tài xế", "Biển số xe, tên / SĐT tài xế. Khi chọn **Giao trực tiếp**, ô này đổi thành **Người giao hàng** và tự lấy tên KTV"],
    ["Đơn vị vận chuyển", "Tên nhà xe / hãng vận chuyển (gợi ý từ các lần trước)"],
    ["Mã vận đơn", "Mã vận đơn nếu có (không bắt buộc)"],
  ], [2400, 6626]),
  SP(),
  NOTE("Hệ thống **nhớ cách gửi và thông tin đã nhập lần trước** trên máy của bạn (riêng từng hình thức). Lần sau chỉ cần kiểm tra lại, không phải gõ lại."),
  H2("5.3. Thêm đơn bảo hành vào thùng"),
  STEP(1, "Trong chi tiết thùng, mục **Đơn bảo hành trong phiếu**, bấm **+ Thêm đơn** (hoặc **Chọn đơn Odoo** để thêm đơn Odoo vào thùng đang làm)."),
  STEP(2, "Nhập **Mã case** rồi bấm **🔍 Kiểm tra**. Hệ thống tra cứu CRM và hiện thông tin khách hàng, sản phẩm, serial, ngày mua, KTV trên case, kèm link **Xem trên CRM**."),
  STEP(3, "Nếu báo **✓ Tìm thấy case** (khung xanh) → làm tiếp. Nếu báo **⚠ Sai mã sự vụ** (khung đỏ) → kiểm tra lại mã case; **không thể tạo đơn** với case của KTV khác."),
  PHONES([["m14-them-don.jpg", "Màn hình Thêm đơn bảo hành"], ["m15-case-dung.jpg", "Mã case đúng — bấm Kiểm tra (1)"], ["m16-case-sai.jpg", "Mã case thuộc KTV khác — bị chặn"]]),
  STEP(4, "**Linh kiện lỗi**: bấm ô chọn, gõ vài chữ để tìm (gõ không dấu cũng được, gõ được cả mã linh kiện), chọn linh kiện đúng."),
  STEP(5, "**Số lượng**: bấm **–** / **+** (các linh kiện cùng loại, cùng case gộp 1 đơn)."),
  STEP(6, "**Mô tả lỗi** (bắt buộc): mô tả hiện tượng lỗi, đã kiểm tra những gì."),
  STEP(7, "**Loại đối trừ đề xuất**: Đổi trả hoặc Trừ công nợ (Admin sẽ chốt lại)."),
  STEP(8, "**Ảnh linh kiện lỗi** (tuỳ chọn): bấm **Chụp hoặc chọn ảnh** — mở thẳng camera, chọn được nhiều ảnh."),
  STEP(9, "Bấm **Thêm vào phiếu**. Đơn mới xuất hiện trong danh sách đơn của thùng."),
  PHONES([["m17-tim-linh-kien.jpg", "Gõ “bơm” để tìm linh kiện"], ["m18-form-day-du.jpg", "Điền đủ rồi bấm Thêm vào phiếu (1)"], ["m19-sau-them.jpg", "Thùng đã có 3 đơn"]]),
  NOTE("Nút **Thêm vào phiếu** chỉ sáng lên khi mã case đã kiểm tra đúng và đã nhập mô tả lỗi.", "warn"),
  H2("5.4. Sửa, xoá đơn; mã QR và trao đổi"),
  PHONES([["m12-don-trong-phieu.jpg", "Chọn đơn Odoo (1), Thêm đơn (2), Xoá đơn (3)"], ["m13-qr-trao-doi.jpg", "Mã QR thùng hàng và khung Trao đổi"]]),
  B("**Xoá** đơn: bấm **✕ Xoá** trên dòng đơn (chỉ khi thùng còn nháp)."),
  B("**Mã QR**: viết mã BH-xxxxxx hoặc bấm **⬇ Tải ảnh QR (in tem)** để in, **dán lên thùng hàng** — Kho quét mã này để nhận nhanh."),
  B("**Trao đổi / phản hồi**: ghi chú gửi Kho và Admin bảo hành về thùng hàng (VD: “Thùng có hàng dễ vỡ”). Kho, Admin trả lời cũng hiện tại đây."),
  B("**Nhật ký phiếu gửi**: lịch sử thao tác trên thùng (ai làm gì, lúc nào)."),
  H2("5.5. Lưu nháp hoặc xác nhận đã gửi xe"),
  TABLE(["Nút", "Khi nào dùng", "Kết quả"], [
    ["**💾 Lưu nháp, gửi sau**", "Đã chuẩn bị thùng nhưng **chưa gửi hàng thật**", "Lưu lại, đóng màn hình. Thùng vẫn là **Nháp**, Kho chưa thấy, có thể thêm/xoá đơn tiếp"],
    ["**Xác nhận đã gửi xe**", "Hàng đã giao cho xe / mang tới Kho", "Thùng chuyển **Đã gửi xe**, Kho thấy thùng chờ nhận. Không sửa được đơn nữa"],
  ], [2500, 3000, 3526]),
  SP(),
  TABLE(["Trạng thái thùng", "Ý nghĩa"], [
    ["Nháp", "Đang chuẩn bị, Kho chưa thấy"],
    ["Đã gửi xe", "Đã gửi, đang trên đường về Kho"],
    ["Kho đã tiếp nhận", "Kho đã nhận thùng. Nếu Kho báo sự cố (hư hỏng, thiếu…), thông tin hiện trong chi tiết thùng và khung Trao đổi"],
  ], [2500, 6526]),
  SP(),
  PHONES([["m20-sau-gui-xe.jpg", "Thùng sau khi xác nhận gửi xe"], ["m04-gui-hang.jpg", "Danh sách phiếu gửi với trạng thái"]]),
  NOTE("Chỉ bấm **Xác nhận đã gửi xe** khi hàng đã thật sự rời khỏi tay bạn. Bấm xác nhận sẽ tự lưu luôn thông tin vận chuyển. Thùng nháp có đơn để quá 24 giờ sẽ hiện trong **Cảnh báo đơn tồn**.", "err"),

);

// 6 Tien do
C.push(H1("6. Theo dõi tiến độ và bổ sung thông tin"),
  P("Màn hình **Tiến độ** liệt kê **từng đơn vị bảo hành** của bạn kèm trạng thái hiện tại. Gõ mã đơn, mã case hoặc mô tả lỗi vào ô tìm kiếm để lọc."),
  PHONES([["m22-tien-do.jpg", "Danh sách tiến độ đơn"], ["m23-nut-bo-sung.jpg", "Đơn chờ KTV bổ sung — nút Bổ sung (1)"], ["m24-modal-bo-sung.jpg", "Bổ sung thông tin theo yêu cầu Admin"]]),
  TABLE(["Trạng thái đơn", "Ý nghĩa", "KTV cần làm"], [
    ["Chờ phân loại", "Admin bảo hành đang kiểm tra", "Chờ"],
    ["**Chờ KTV bổ sung**", "Admin cần bạn sửa / bổ sung thông tin", "**Bấm Bổ sung**"],
    ["Chờ NV chẩn đoán", "Đang sửa chữa / kiểm tra", "Chờ"],
    ["Chờ Admin xác nhận", "Đã sửa xong, chờ Admin chốt", "Chờ"],
    ["Sẵn sàng gộp phiếu trả", "Đã xử lý xong, chờ đóng thùng trả", "Chờ hàng trả về"],
    ["Đã huỷ", "Đơn bị từ chối / huỷ bảo hành", "Xem lý do trong chi tiết"],
  ], [2600, 3800, 2626]),
  SP(),
  H2("Bổ sung thông tin khi Admin yêu cầu"),
  STEP(1, "Vào **Tiến độ** (hoặc bấm **Đơn cần bổ sung thông tin** ở Trang chủ)."),
  STEP(2, "Trên đơn có trạng thái **Chờ KTV bổ sung**, bấm **Bổ sung**."),
  STEP(3, "Đọc lý do Admin ghi trong khung xanh ở đầu (VD: sai linh kiện, thiếu mô tả)."),
  STEP(4, "Sửa **Linh kiện lỗi** nếu Admin báo sai mã, cập nhật **Mô tả lỗi**, rồi bấm **Gửi bổ sung**. Đơn quay lại hàng chờ của Admin."),
  NOTE("Cột **SLA** cho biết đơn đã chờ ở bước hiện tại bao lâu (xanh: trong 24 giờ, vàng: quá 24 giờ, đỏ: quá 72 giờ; không tính Chủ nhật). Hãy bổ sung sớm để không làm chậm đơn."),
);

// 7 Nhan hang
C.push(H1("7. Nhận hàng trả về"),
  P("Khi Kho gửi trả hàng, phiếu trả (mã TR-xxxxxx) hiện ở màn hình **Nhận hàng** với trạng thái **Đã gửi — chờ KTV xác nhận**."),
  PHONES([["m25-nhan-hang.jpg", "Danh sách hàng trả chờ xác nhận"], ["m26-phieu-tra.jpg", "Chi tiết phiếu trả"], ["m27-nut-nhan.jpg", "Khiếu nại (1) / Xác nhận đã nhận (2)"]]),
  STEP(1, "Vào **Nhận hàng**, bấm vào phiếu trả để mở chi tiết."),
  STEP(2, "Kiểm tra **Mã chứng từ** (mã đơn hàng, mã MISA, mã vận đơn) và **Đơn vị trong phiếu** (linh kiện, hướng xử lý: Đổi mới / Sửa chữa…)."),
  STEP(3, "Đối chiếu với hàng thực nhận. Có thể ghi **Đánh giá khi nhận hàng** (không bắt buộc)."),
  STEP(4, "Bấm **Xác nhận đã nhận** — phiếu chuyển **Đã hoàn tất**."),
  H2("Khiếu nại khi không nhận được hàng"),
  STEP(1, "Trong chi tiết phiếu trả, bấm **Khiếu nại vận chuyển**."),
  STEP(2, "Nhập **Nội dung khiếu nại** (không nhận được hàng, thiếu hàng, hư hỏng…) rồi bấm **Gửi khiếu nại**."),
  STEP(3, "Kho sẽ kiểm tra và đánh giá: **gửi thành công** (phiếu hoàn tất) hoặc **gửi thất bại** (Kho ghi phương án xử lý và liên hệ bạn)."),
  PHONES([["m28-khieu-nai.jpg", "Nhập nội dung khiếu nại"]], 190),
  NOTE("Kho có thể xác nhận hoàn tất thay bạn nếu bạn đã báo nhận hàng qua điện thoại. Tuy vậy, hãy tự xác nhận trên hệ thống ngay khi nhận hàng để số liệu chính xác.", "warn"),
);

// 8 Lich su
C.push(H1("8. Tra cứu lịch sử bảo hành"),
  P("Dùng để kiểm tra **sản phẩm đã từng gửi bảo hành chưa, mấy lần, xử lý thế nào** — hữu ích khi khách báo lỗi lặp lại."),
  STEP(1, "Bấm **Lịch sử** trên thanh menu dưới."),
  STEP(2, "Nhập **số Serial** hoặc **mã case** (ít nhất 3 ký tự; từ 5 ký tự trở lên tìm gần đúng), bấm **Tra cứu**."),
  STEP(3, "Kết quả liệt kê từng lần gửi: mã đơn, ngày, linh kiện, lỗi, thông tin case và kết quả xử lý từng đơn vị."),
  PHONES([["m29-lich-su.jpg", "Lịch sử bảo hành theo mã case"]], 190),
  NOTE("KTV chỉ xem được lịch sử các đơn **do chính mình gửi**."),
);

// 9 May tinh
C.push(H1("9. Sử dụng trên máy tính"),
  P("Hệ thống dùng được trên máy tính với cùng tài khoản. Giao diện máy tính có **menu bên trái** thay cho thanh menu dưới, các danh sách hiện dạng bảng; thao tác giống hệt trên điện thoại."),
  ...WIDE("d01-trang-chu.jpg", "Trang chủ trên máy tính"),
  ...WIDE("d02-gui-hang.jpg", "Màn hình Gửi hàng trên máy tính"),
  ...WIDE("d03-chi-tiet-phieu.jpg", "Chi tiết thùng hàng trên máy tính"),
  NOTE("Menu bên trái mặc định thu gọn; bấm nút **»** ở cuối menu để mở rộng. Số đỏ cạnh mỗi mục là số việc còn chờ."),
);

// 10 FAQ
C.push(H1("10. Câu hỏi thường gặp và xử lý lỗi"),
  TABLE(["Tình huống / thông báo", "Nguyên nhân", "Cách xử lý"], [
    ["“Tài khoản đang chờ duyệt”", "Gmail chưa có trong danh bạ KTV / ETX", "Báo Giám sát khu vực hoặc Admin hệ thống khai báo Gmail, rồi đăng nhập lại"],
    ["“Sai mã sự vụ — không tìm thấy case”", "Gõ sai mã case, hoặc case chưa có trên CRM", "Kiểm tra lại mã case trên CRM, bấm Kiểm tra lại"],
    ["“Sai mã sự vụ — case không thuộc về KTV…”", "Case đang giao cho KTV khác trên CRM", "Liên hệ CSKH chuyển case về đúng KTV, hoặc nhờ Giám sát / Admin tạo hộ"],
    ["Không thấy đơn Odoo của mình", "Đơn mới tạo (hệ thống kéo về 15 phút/lần) hoặc case chưa gán KTV", "Đợi 15–30 phút; nếu vẫn chưa có, báo Admin bảo hành"],
    ["Nút “Thêm vào phiếu” bị mờ", "Chưa bấm Kiểm tra mã case, case sai, hoặc thiếu mô tả lỗi", "Bấm Kiểm tra, sửa mã case, nhập mô tả lỗi"],
    ["Không thêm / xoá được đơn trong thùng", "Thùng đã xác nhận gửi xe", "Tạo thùng mới cho đơn còn thiếu; liên hệ Kho / Admin nếu gửi nhầm"],
    ["Thùng nháp biến mất", "Đóng thùng khi chưa có đơn nào → tự xoá", "Tạo phiếu mới và thêm đơn trước khi đóng"],
    ["Gửi nhầm thùng chưa thật sự gửi xe", "Bấm Xác nhận đã gửi xe quá sớm", "Ghi chú vào khung Trao đổi của thùng và báo Kho"],
    ["Không nhận được hàng trả", "Thất lạc trên đường vận chuyển", "Mở phiếu trả, bấm Khiếu nại vận chuyển (mục 7)"],
  ], [2800, 2900, 3326]),
  SP(),
  H2("Nguyên tắc làm việc hằng ngày"),
  B("Mở **Trang chủ** mỗi ngày, xử lý hết các việc trong khung xanh."),
  B("Ưu tiên gửi đơn Odoo bằng **Tạo thùng với đơn đã chọn** — nhanh và đúng dữ liệu nhất."),
  B("Luôn **dán mã QR / ghi mã BH-xxxxxx** lên thùng hàng."),
  B("Chỉ **Xác nhận đã gửi xe** khi hàng đã thật sự giao cho xe."),
  B("Bổ sung thông tin cho Admin **trong 24 giờ**."),
  B("Xác nhận **Đã nhận** ngay khi hàng trả về tới tay."),
);

// ---------- document ----------
const doc = new Document({
  creator: "Sửa chữa 3T", title: "Hướng dẫn sử dụng - Kỹ thuật viên",
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
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1200, left: 1440, right: 1440 } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("Sửa chữa bảo hành 3T — Hướng dẫn Kỹ thuật viên", { size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Trang ", { size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888", font: FONT })] })] }) },
    children: C,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(path.join(OUT_DIR, "Huong-dan-KTV.docx"), b); console.log("ok", b.length, "figs", figNo); });
