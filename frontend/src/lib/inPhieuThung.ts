import { renderQrSvg } from "./qr";
import { HINH_THUC_GUI_LABELS } from "./constants";

// 11/11/2026 ("trong thùng hàng, thêm nút tải danh sách đơn gửi trong thùng để KTV có thể in phiếu vào
// gửi kèm trong thùng hàng khi gửi về kho"): dung 1 trang HTML in A4 rieng (khong phu thuoc CSS app),
// mo o tab moi qua Blob URL - nguoi dung bam "In phieu" (hoac "Luu PDF" trong hop in cua trinh duyet /
// "Chia se" tren dien thoai). QR dung chung renderQrSvg (cung ma voi tem dan thung, Kho quet duoc).

export interface DongIn {
  id: string;
  ma_lk: string | null;
  ten_lk: string;
  so_luong: number;
  case_id: string | null;
  ghi_chu: string;
}

export interface PhieuThungIn {
  id: string;
  nguoi_gui: string;
  nguoi_tao_ho?: string | null;
  ngay_gui: string | null;
  hinh_thuc_gui: string | null;
  ma_xe_hoac_tai_xe: string | null;
  don_vi_van_chuyen: string | null;
  ma_van_don: string | null;
  mien?: string | null;
  trang_thai: string;
  dong: DongIn[];
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function bayGio(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function ngayVn(s: string | null): string {
  if (!s) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return s;
  return `${m[4] ? `${m[4]}:${m[5]} ` : ""}${m[3]}/${m[2]}/${m[1]}`;
}

export function buildPhieuThungHtml(p: PhieuThungIn): string {
  const tongSl = p.dong.reduce((s, d) => s + (d.so_luong || 0), 0);
  const giaoTrucTiep = p.hinh_thuc_gui === "giao_truc_tiep";
  const hinhThuc = p.hinh_thuc_gui ? HINH_THUC_GUI_LABELS[p.hinh_thuc_gui] ?? p.hinh_thuc_gui : "";
  const nhap = p.trang_thai === "nhap";
  const tt = (k: string, v: string | null | undefined) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v) || "&nbsp;"}</b></div>`;
  const rows = p.dong
    .map(
      (d, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td class="mono">${esc(d.id)}</td>
        <td class="mono">${esc(d.ma_lk || "—")}</td>
        <td>${esc(d.ten_lk)}</td>
        <td class="c b">${esc(d.so_luong)}</td>
        <td class="mono">${esc(d.case_id || "—")}</td>
        <td class="gc">${esc(d.ghi_chu)}</td>
        <td class="ck"></td>
      </tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phiếu thùng ${esc(p.id)}</title>
<style>
  @page{size:A4;margin:12mm 10mm}
  *{box-sizing:border-box}
  body{margin:0;font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#111;font-size:12.5px;background:#eef2ef}
  .bar{position:sticky;top:0;display:flex;gap:8px;justify-content:center;padding:10px;background:#116a34}
  .bar button{font:inherit;font-weight:700;border:0;border-radius:10px;padding:9px 16px;cursor:pointer}
  .bar .p{background:#fff;color:#116a34}.bar .x{background:rgba(255,255,255,.18);color:#fff}
  .page{background:#fff;max-width:210mm;margin:12px auto;padding:12mm 10mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}
  .head{display:flex;gap:14px;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:10px}
  .head .t{flex:1;min-width:0}
  .head .brand{font-size:11px;font-weight:700;color:#116a34;letter-spacing:.04em;text-transform:uppercase}
  .head h1{margin:2px 0 4px;font-size:15px;font-weight:700}
  .head .id{font-family:Consolas,"Courier New",monospace;font-size:30px;font-weight:800;letter-spacing:.02em;line-height:1.1}
  .head .sub{margin-top:4px;font-size:12px;color:#444}
  .qr{text-align:center;font-family:Consolas,monospace;font-size:11px;font-weight:700}
  .qr svg{display:block}
  .nhap{display:inline-block;margin-top:4px;border:1.5px solid #b45309;color:#b45309;font-weight:700;font-size:11px;padding:1px 8px;border-radius:6px}
  .info{display:grid;grid-template-columns:repeat(3,1fr);gap:6px 14px;margin:10px 0}
  .kv{border-bottom:1px dotted #999;padding:2px 0;min-width:0}
  .kv span{display:block;font-size:10.5px;color:#555;text-transform:uppercase;letter-spacing:.03em}
  .kv b{display:block;font-size:13px;word-break:break-word}
  table{width:100%;border-collapse:collapse;margin-top:6px}
  th,td{border:1px solid #444;padding:5px 6px;vertical-align:top;text-align:left;overflow-wrap:anywhere}
  th{background:#e7f2ea;font-size:11.5px}
  td.c,th.c{text-align:center}td.b{font-weight:700;font-size:14px}
  .mono{font-family:Consolas,"Courier New",monospace;font-size:12px;white-space:normal;overflow-wrap:anywhere}
  .gc{font-size:11.5px}
  tfoot{display:table-row-group}
  tfoot td{font-weight:700;background:#f5f5f5}
  .ky{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;text-align:center}
  .ky div{border:1px solid #999;border-radius:6px;padding:6px 6px 46px;font-size:12px}
  .ky b{display:block}.ky i{font-size:10.5px;color:#666}
  .note{margin-top:10px;font-size:11px;color:#444}
  tr{break-inside:avoid}thead{display:table-header-group}
  table{table-layout:fixed}
  /* In: giu NGUYEN bo cuc nhu ban xem tren man hinh (cot theo %, co dan theo kho giay), chi bo thanh nut / bong. */
  @media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;padding:0;max-width:none;width:auto}.mono{font-size:min(12px,1.6vw)}td,th{font-size:min(12.5px,1.75vw)}}
  @media screen and (max-width:640px){.page{margin:0;padding:12px}.info{grid-template-columns:1fr 1fr}.head .id{font-size:22px}.mono{white-space:normal;word-break:break-all}}
</style></head><body>
<div class="bar"><button class="p" onclick="window.print()">🖨 In phiếu / Lưu PDF</button><button class="x" onclick="window.close()">Đóng</button></div>
<div class="page">
  <div class="head">
    <div class="t">
      <div class="brand">Bảo hành đổi trả 3T</div>
      <h1>PHIẾU DANH SÁCH ĐƠN BẢO HÀNH GỬI KÈM THÙNG</h1>
      <div class="id">${esc(p.id)}</div>
      <div class="sub">${p.dong.length} đơn · Tổng ${tongSl} linh kiện${p.mien ? ` · Gửi về kho miền ${esc(p.mien === "MB" ? "Bắc" : p.mien === "MN" ? "Nam" : p.mien)}` : ""}</div>
      ${nhap ? `<div class="nhap">Thùng chưa xác nhận gửi trên hệ thống</div>` : ""}
    </div>
    <div class="qr">${renderQrSvg(p.id, 112)}${esc(p.id)}</div>
  </div>
  <div class="info">
    ${tt("Người gửi (KTV)", p.nguoi_gui)}
    ${tt(giaoTrucTiep ? "Ngày giao" : "Ngày gửi", ngayVn(p.ngay_gui))}
    ${tt("Hình thức gửi", hinhThuc)}
    ${tt(giaoTrucTiep ? "Người giao hàng" : "Mã xe / Tài xế", p.ma_xe_hoac_tai_xe)}
    ${giaoTrucTiep ? "" : tt("Đơn vị vận chuyển", p.don_vi_van_chuyen)}
    ${giaoTrucTiep ? "" : tt("Mã vận đơn", p.ma_van_don)}
    ${p.nguoi_tao_ho ? tt("Tạo hộ bởi", p.nguoi_tao_ho) : ""}
    ${tt("In lúc", bayGio())}
  </div>
  <table>
    <colgroup><col style="width:5%"><col style="width:12%"><col style="width:12%"><col style="width:24%"><col style="width:5%"><col style="width:13%"><col style="width:22%"><col style="width:7%"></colgroup>
    <thead><tr>
      <th class="c">STT</th><th>ID đơn</th><th>Mã LK</th><th>Tên linh kiện</th>
      <th class="c">SL</th><th>Mã SC</th><th>Ghi chú</th><th class="c ck">Kho ✓</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="4" style="text-align:right">Tổng cộng ${p.dong.length} đơn</td><td class="c">${tongSl}</td><td colspan="3"></td></tr></tfoot>
  </table>
  <div class="ky">
    <div><b>Người gửi (KTV)</b><i>Ký, ghi rõ họ tên</i></div>
    <div><b>Nhà xe / Người giao</b><i>Ký, ghi rõ họ tên</i></div>
    <div><b>Kho nhận</b><i>Ký, ghi rõ họ tên · ngày nhận</i></div>
  </div>
  <div class="note">Phiếu đặt trong thùng hàng gửi về Kho. Kho quét mã QR hoặc nhập mã thùng <b>${esc(p.id)}</b> để tiếp nhận; đánh dấu cột "Kho ✓" khi kiểm đủ từng đơn.</div>
</div>
</body></html>`;
}

// Mo phieu o tab moi (goi trong su kien bam nut de khong bi chan popup). Khong mo duoc (chan popup /
// PWA) -> tai file .html ve may.
export function moPhieuThung(p: PhieuThungIn) {
  const html = buildPhieuThungHtml(p);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `Phieu-thung-${p.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// 11/11/2026 ("thêm nút tải pdf trực tiếp thay vì chuyển chế độ in"): tao file PDF ngay tren may bang
// pdfmake (phong Roboto co san du dau tieng Viet, bang tu lap tieu de khi sang trang, QR dung san) - khong
// qua hop in cua trinh duyet nen khong phu thuoc kho giay / ti le in. Thu vien (~1MB) chi tai khi bam nut.
export async function taiPdfPhieuThung(p: PhieuThungIn): Promise<void> {
  const [pm, vfsMod] = await Promise.all([import("pdfmake/build/pdfmake"), import("pdfmake/build/vfs_fonts")]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake: any = (pm as any).default ?? pm;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v: any = (vfsMod as any).default ?? vfsMod;
  pdfMake.vfs = v?.pdfMake?.vfs ?? v?.vfs ?? v;

  const tongSl = p.dong.reduce((s, d) => s + (d.so_luong || 0), 0);
  const giaoTrucTiep = p.hinh_thuc_gui === "giao_truc_tiep";
  const hinhThuc = p.hinh_thuc_gui ? HINH_THUC_GUI_LABELS[p.hinh_thuc_gui] ?? p.hinh_thuc_gui : "";
  const kv = (k: string, val: string | null | undefined) => ({
    stack: [
      { text: k.toUpperCase(), fontSize: 7.5, color: "#555555" },
      { text: val || " ", bold: true, fontSize: 10, margin: [0, 1, 0, 0] },
    ],
    margin: [0, 0, 0, 6],
  });
  const info = [
    kv("Người gửi (KTV)", p.nguoi_gui),
    kv(giaoTrucTiep ? "Ngày giao" : "Ngày gửi", ngayVn(p.ngay_gui)),
    kv("Hình thức gửi", hinhThuc),
    kv(giaoTrucTiep ? "Người giao hàng" : "Mã xe / Tài xế", p.ma_xe_hoac_tai_xe),
    ...(giaoTrucTiep ? [] : [kv("Đơn vị vận chuyển", p.don_vi_van_chuyen), kv("Mã vận đơn", p.ma_van_don)]),
    ...(p.nguoi_tao_ho ? [kv("Tạo hộ bởi", p.nguoi_tao_ho)] : []),
    kv("In lúc", bayGio()),
  ];
  const infoRows: unknown[][] = [];
  for (let i = 0; i < info.length; i += 3) infoRows.push([info[i], info[i + 1] ?? { text: "" }, info[i + 2] ?? { text: "" }]);

  const th = (t: string, center = false) => ({ text: t, bold: true, fontSize: 8.5, fillColor: "#e7f2ea", alignment: center ? "center" : "left" });
  const body: unknown[][] = [
    [th("STT", true), th("ID đơn"), th("Mã LK"), th("Tên linh kiện"), th("SL", true), th("Mã SC"), th("Ghi chú"), th("Kho", true)],
    ...p.dong.map((d, i) => [
      { text: String(i + 1), alignment: "center" },
      { text: d.id, fontSize: 8 },
      { text: d.ma_lk || "—", fontSize: 8 },
      { text: d.ten_lk },
      { text: String(d.so_luong), alignment: "center", bold: true, fontSize: 10 },
      { text: d.case_id || "—", fontSize: 8 },
      { text: d.ghi_chu, fontSize: 8 },
      { text: "" },
    ]),
    [
      { text: `Tổng cộng ${p.dong.length} đơn`, colSpan: 4, alignment: "right", bold: true, fillColor: "#f5f5f5" },
      {},
      {},
      {},
      { text: String(tongSl), alignment: "center", bold: true, fillColor: "#f5f5f5" },
      { text: "", colSpan: 3, fillColor: "#f5f5f5" },
      {},
      {},
    ],
  ];
  const kyO = (t: string, sub: string) => ({
    table: { widths: ["*"], heights: [62], body: [[{ stack: [{ text: t, bold: true, alignment: "center" }, { text: sub, italics: true, fontSize: 7.5, color: "#666666", alignment: "center" }] }]] },
    layout: { hLineColor: () => "#999999", vLineColor: () => "#999999" },
  });

  const dd = {
    pageSize: "A4",
    pageMargins: [28, 30, 28, 34],
    info: { title: `Phiếu thùng ${p.id}` },
    defaultStyle: { font: "Roboto", fontSize: 9, lineHeight: 1.1 },
    footer: (cur: number, total: number) => ({ text: `${p.id} · Trang ${cur}/${total}`, alignment: "right", fontSize: 7.5, color: "#777777", margin: [0, 8, 28, 0] }),
    content: [
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "BẢO HÀNH ĐỔI TRẢ 3T", bold: true, fontSize: 8.5, color: "#116a34" },
              { text: "PHIẾU DANH SÁCH ĐƠN BẢO HÀNH GỬI KÈM THÙNG", bold: true, fontSize: 12, margin: [0, 2, 0, 2] },
              { text: p.id, bold: true, fontSize: 24 },
              {
                text: `${p.dong.length} đơn · Tổng ${tongSl} linh kiện${p.mien ? ` · Gửi về kho miền ${p.mien === "MB" ? "Bắc" : p.mien === "MN" ? "Nam" : p.mien}` : ""}`,
                fontSize: 9,
                color: "#444444",
                margin: [0, 3, 0, 0],
              },
              ...(p.trang_thai === "nhap" ? [{ text: "Thùng chưa xác nhận gửi trên hệ thống", fontSize: 8, bold: true, color: "#b45309", margin: [0, 3, 0, 0] }] : []),
            ],
          },
          { width: 92, stack: [{ qr: p.id, fit: 86, eccLevel: "M", alignment: "center" }, { text: p.id, bold: true, fontSize: 8, alignment: "center", margin: [0, 2, 0, 0] }] },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 539, y2: 0, lineWidth: 1.5 }], margin: [0, 6, 0, 8] },
      { table: { widths: ["*", "*", "*"], body: infoRows }, layout: "noBorders" },
      {
        table: { headerRows: 1, dontBreakRows: true, widths: ["5%", "12%", "12%", "*", "5%", "13%", "22%", "7%"], body },
        layout: { hLineColor: () => "#444444", vLineColor: () => "#444444", hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingTop: () => 3, paddingBottom: () => 3 },
        margin: [0, 4, 0, 0],
      },
      {
        columns: [kyO("Người gửi (KTV)", "Ký, ghi rõ họ tên"), kyO("Nhà xe / Người giao", "Ký, ghi rõ họ tên"), kyO("Kho nhận", "Ký, ghi rõ họ tên · ngày nhận")],
        columnGap: 10,
        margin: [0, 14, 0, 0],
        unbreakable: true,
      },
      { text: `Phiếu đặt trong thùng hàng gửi về Kho. Kho quét mã QR hoặc nhập mã thùng ${p.id} để tiếp nhận; đánh dấu cột "Kho" khi kiểm đủ từng đơn.`, fontSize: 8, color: "#444444", margin: [0, 8, 0, 0] },
    ],
  };
  await new Promise<void>((resolve) => {
    pdfMake.createPdf(dd).download(`Phieu-thung-${p.id}.pdf`, () => resolve());
  });
}
