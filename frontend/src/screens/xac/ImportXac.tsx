import { useState } from "react";
import { Modal } from "../../ui/Modal";
import { Btn, Badge } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { api, errorMessage } from "../../lib/api";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { readSheetFile } from "../../lib/xlsxRead";
import { normalizeVi } from "../../lib/normalizeVi";
import { taiTheoLoc, tenFile, type ExportCol } from "../../ui/ExcelExport";
import { displayName } from "../../hooks/useUserNames";
import { useLkName } from "../../hooks/useLinhKien";
import { fmtDate } from "../../lib/format";

// 16/11/2026 - nguyen van: "thêm tính năng import hàng loạt (có file mẫu kèm sheet hướng dẫn chi tiết có dữ liệu các lựa
// chọn mặc định cần setup theo)" - chot: import KET QUA XAC (man Tra xac). Backend: POST /api/tra-xac/import.
// File mau: sheet 1 "Nhap lieu" (dien san cac xac cho gom theo bo loc dang chon, de trong cot Ket qua) - sheet 2 "Huong dan"
// (cach dien + bang gia tri Ket qua hop le) - sheet 3 "Thung dang mo" (ma thung nhap / cho KT de dien cot Ma thung).

interface XacMin {
  id: string;
  loai: string;
  unit_id: string;
  so_luong: number;
  ma_lk_xac: string | null;
  ktv: string | null;
  case_id: string | null;
  khach_hang: string | null;
  mien: string | null;
  ngay_xl: string | null;
}
interface ThungMin {
  id: string;
  trang_thai: string;
  doi_tac: string | null;
  ma_eo: string | null;
  mien: string | null;
  so_xac?: number;
  ghi_chu: string | null;
}
interface PreviewRow {
  dong: number;
  ma: string;
  kq: string | null;
  thung: string | null;
  ghi_chu: string | null;
  ok: boolean;
  loi?: string;
}

const H_MA = "Mã xác";
const H_KQ = "Kết quả";
const H_THUNG = "Mã thùng";
const H_GC = "Ghi chú";

export const KQ_HUONG_DAN: [string, string, string, string][] = [
  ["Vào thùng", "vao_thung", "Đưa xác vào thùng trả xác (trả đối tác / nhà máy)", "BẮT BUỘC: mã thùng TX-… (xem sheet Thung dang mo) hoặc MOI / MOI-<tên> để tạo thùng mới"],
  ["Xác đã tiêu huỷ", "tieu_huy", "Xác đã tiêu huỷ, không trả đối tác", "Để trống"],
  ["Xác thất lạc", "that_lac", "Không tìm thấy xác", "Để trống"],
  ["Không có xác", "khong_co", "Đơn không có xác để trả (KTV không gửi, khách giữ…)", "Để trống"],
  ["Đã trả ngoài hệ thống", "ngoai", "Đã trả / xử lý xác ngoài hệ thống", "Để trống"],
  ["Đưa lại chờ gom", "dua_lai", "Huỷ kết quả đã ghi trước đó (tab Đã xử lý khác) — xác về lại danh sách chờ gom", "Để trống"],
];
const KQ_NHAN: Record<string, string> = Object.fromEntries(KQ_HUONG_DAN.map(([n, k]) => [k, n]));
const TT_THUNG: Record<string, string> = { nhap: "Nháp", cho_ke_toan: "Chờ KT duyệt" };

export function ImportXacModal({ listPath, onClose, onDone }: { listPath: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [busy, setBusy] = useState<string | null>(null);
  const [file, setFile] = useState<string>("");
  const [rows, setRows] = useState<{ dong: number; ma: string; kq: string; thung: string; ghi_chu: string }[] | null>(null);
  const [pv, setPv] = useState<{ rows: PreviewRow[]; tong: number; hop_le: number; loi: number; thung_moi: number } | null>(null);
  const [chiLoi, setChiLoi] = useState(false);

  const taiMau = async () => {
    setBusy("Đang tạo file mẫu…");
    try {
      const cols: ExportCol<XacMin>[] = [
        { header: H_MA, value: (r) => r.id, width: 16 },
        { header: H_KQ, value: () => "", width: 20 },
        { header: H_THUNG, value: () => "", width: 14 },
        { header: H_GC, value: () => "", width: 30 },
        { header: "Loại (tham khảo)", value: (r) => (r.loai === "sua_chua" ? "Sau sửa chữa" : "Đổi mới"), width: 14 },
        { header: "Đơn vị BH", value: (r) => r.unit_id, width: 16 },
        { header: "Linh kiện xác", value: (r) => nameOf(r.ma_lk_xac), width: 34 },
        { header: "SL", value: (r) => r.so_luong, width: 6 },
        { header: "KTV", value: (r) => (r.ktv ? displayName(r.ktv) : "Khách lẻ"), width: 28 },
        { header: "Mã case", value: (r) => r.case_id, width: 16 },
        { header: "Khách hàng", value: (r) => r.khach_hang, width: 22 },
        { header: "Miền", value: (r) => (r.mien === "MB" ? "Miền Bắc" : r.mien === "MN" ? "Miền Nam" : "Chưa khai báo"), width: 12 },
        { header: "Ngày xử lý", value: (r) => (r.ngay_xl ? fmtDate(r.ngay_xl) : ""), width: 16 },
      ];
      const nhap = await taiTheoLoc<XacMin>({ path: listPath, itemsKey: "xac", sheet: "Nhap lieu", cols }, (a, t) => setBusy(`Đang tải xác ${a}/${t}…`), 1000);
      const t = await api.get<{ thung: ThungMin[] }>("/tra-xac/thung?trang_thai=nhap,cho_ke_toan&limit=200");
      const huongDan: string[][] = [
        ["HƯỚNG DẪN IMPORT KẾT QUẢ XÁC"],
        [""],
        ["Bước", "Nội dung"],
        ["1", "Điền sheet \"Nhap lieu\" (sheet ĐẦU TIÊN — không đổi tên / thứ tự cột A–D). File mẫu đã điền sẵn các xác đang chờ gom theo bộ lọc lúc tải."],
        ["2", "Cột A \"Mã xác\": mã đơn vị Đổi mới (DH-000123-1) hoặc mã đề xuất linh kiện sửa chữa (DX-000045). Dòng không cần xử lý thì để trống cột B (hoặc xoá dòng)."],
        ["3", "Cột B \"Kết quả\": nhập 1 giá trị trong bảng bên dưới (nhập tên tiếng Việt hoặc mã đều được, không phân biệt dấu / hoa thường)."],
        ["4", "Cột C \"Mã thùng\": chỉ điền khi Kết quả = Vào thùng. Ghi mã thùng có sẵn (sheet \"Thung dang mo\"), hoặc MOI để tạo 1 thùng mới; nhiều thùng mới thì đặt tên MOI-A, MOI-B… (cùng tên = cùng thùng). 1 thùng chỉ chứa xác cùng miền và cùng đối tác."],
        ["5", "Cột D \"Ghi chú\": tuỳ chọn (lưu cùng kết quả tiêu huỷ / thất lạc / không có xác / trả ngoài)."],
        ["6", "Các cột từ E trở đi chỉ để tham khảo — hệ thống không đọc."],
        ["7", "Vào màn Trả xác linh kiện › \"⬆ Import kết quả\" › chọn file › xem trước từng dòng (dòng lỗi ghi rõ lý do) › \"Áp dụng\". Chỉ dòng hợp lệ được ghi; tối đa 1.000 dòng / lần."],
        [""],
        ["GIÁ TRỊ CỘT \"KẾT QUẢ\""],
        ["Nhập (tên)", "Hoặc mã", "Ý nghĩa", "Cột Mã thùng"],
        ...KQ_HUONG_DAN.map((r) => [...r]),
        [""],
        ["ĐIỀU KIỆN"],
        ["•", "Vào thùng / tiêu huỷ / thất lạc / không có xác / trả ngoài: xác phải đang ở danh sách CHỜ GOM (chưa vào thùng, chưa có kết quả)."],
        ["•", "Đưa lại chờ gom: xác phải đang ở tab \"Đã xử lý khác\" (có kết quả, không nằm trong thùng)."],
        ["•", "Thùng đã được Kế toán duyệt thì không thêm xác được. Sau khi import vào thùng: mở thùng, nhập đối tác + mã EO rồi gửi Kế toán như bình thường."],
        ["•", "Mỗi mã xác chỉ 1 dòng trong file; xác thuộc miền khác miền bạn phụ trách sẽ bị từ chối."],
      ];
      const thungRows = [["Mã thùng", "Trạng thái", "Đối tác", "Mã EO", "Miền", "Số xác", "Ghi chú"], ...t.thung.map((x) => [x.id, TT_THUNG[x.trang_thai] || x.trang_thai, x.doi_tac || "", x.ma_eo || "", x.mien === "MB" ? "Miền Bắc" : x.mien === "MN" ? "Miền Nam" : "Chưa có", String(x.so_xac ?? 0), x.ghi_chu || ""]), ["MOI", "Tạo thùng mới", "", "", "theo miền xác đầu tiên", "", "MOI-A, MOI-B… = nhiều thùng mới"]];
      downloadBlob(
        buildXlsx([
          { name: "Nhap lieu", rows: nhap, widths: cols.map((c) => c.width ?? 18) },
          { name: "Huong dan", rows: huongDan, widths: [22, 90, 60, 70] },
          { name: "Thung dang mo", rows: thungRows, widths: [14, 16, 26, 16, 16, 8, 40] },
        ]),
        tenFile("mau-import-ket-qua-xac"),
      );
      toast(`Đã tải file mẫu (${nhap.length - 1} xác chờ gom theo bộ lọc).`, "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const goi = async (apDung: boolean, data = rows) => {
    if (!data) return;
    setBusy(apDung ? "Đang áp dụng…" : "Đang kiểm tra…");
    try {
      if (!apDung) {
        setPv(await api.post("/tra-xac/import", { rows: data, ap_dung: false }));
      } else {
        const r = await api.post<{ ok: number; bo_qua: number; loi: number; thung_moi: string[] }>("/tra-xac/import", { rows: data, ap_dung: true });
        toast(`Đã ghi ${r.ok} xác${r.thung_moi.length ? ` · tạo ${r.thung_moi.join(", ")}` : ""}${r.bo_qua ? ` · ${r.bo_qua} bỏ qua (đã đổi trong lúc import)` : ""}${r.loi ? ` · ${r.loi} dòng lỗi không ghi` : ""}.`, "ok");
        onDone();
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const chonFile = async (f: File | undefined) => {
    if (!f) return;
    setFile(f.name);
    setPv(null);
    try {
      const sheet = await readSheetFile(f);
      const n = (s: string) => normalizeVi(s || "").toLowerCase().trim();
      const hi = sheet.findIndex((r) => r.some((c) => n(c) === n(H_MA)));
      if (hi < 0) throw new Error(`Không thấy cột "${H_MA}" ở sheet đầu tiên — dùng đúng file mẫu.`);
      const head = sheet[hi].map(n);
      const ci = (h: string) => head.findIndex((c) => c === n(h));
      const [iMa, iKq, iTh, iGc] = [ci(H_MA), ci(H_KQ), ci(H_THUNG), ci(H_GC)];
      if (iKq < 0) throw new Error(`Không thấy cột "${H_KQ}".`);
      const data = sheet
        .slice(hi + 1)
        .map((r, i) => ({ dong: hi + 2 + i, ma: (r[iMa] || "").trim(), kq: (r[iKq] || "").trim(), thung: iTh >= 0 ? (r[iTh] || "").trim() : "", ghi_chu: iGc >= 0 ? (r[iGc] || "").trim() : "" }))
        .filter((r) => r.kq); // dong khong dien Ket qua = khong xu ly
      if (!data.length) throw new Error("File chưa có dòng nào điền cột Kết quả.");
      setRows(data);
      await goi(false, data);
    } catch (e) {
      setRows(null);
      toast(e instanceof Error ? e.message : errorMessage(e), "error");
    }
  };

  const hien = pv ? (chiLoi ? pv.rows.filter((r) => !r.ok) : pv.rows) : [];
  return (
    <Modal
      title="⬆ Import kết quả xác hàng loạt"
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      footerActions={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={!pv || !pv.hop_le || !!busy} onClick={() => goi(true)}>
            {busy && busy.startsWith("Đang áp") ? busy : `Áp dụng ${pv?.hop_le ?? 0} dòng hợp lệ`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="font-semibold mb-1">① Tải file mẫu</p>
          <p className="text-xs text-[var(--ink-soft)] mb-2">File gồm sheet <b>Nhap lieu</b> (điền sẵn các xác đang chờ gom theo bộ lọc hiện tại, tối đa 1.000), <b>Huong dan</b> (cách điền + giá trị Kết quả hợp lệ) và <b>Thung dang mo</b> (mã thùng nháp / chờ KT để điền cột Mã thùng).</p>
          <Btn size="sm" variant="secondary" disabled={!!busy} onClick={taiMau}>{busy && busy.includes("mẫu") || busy?.startsWith("Đang tải xác") ? busy : "⬇ Tải file mẫu"}</Btn>
        </div>
        <div className="rounded-lg border border-[var(--line)] p-3">
          <p className="font-semibold mb-1">② Chọn file đã điền</p>
          <input type="file" accept=".xlsx,.csv" onChange={(e) => chonFile(e.target.files?.[0])} className="text-xs" />
          {file && <span className="ml-2 text-xs text-[var(--ink-soft)]">{file}</span>}
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {KQ_HUONG_DAN.map(([nhan, ma]) => (
              <span key={ma} className="rounded-full border border-[var(--line)] px-2 py-0.5">{nhan} <span className="text-[var(--ink-faint)]">/ {ma}</span></span>
            ))}
          </div>
        </div>
        {busy && busy.startsWith("Đang kiểm") && <p className="text-xs text-[var(--ink-soft)]">{busy}</p>}
        {pv && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-semibold">③ Xem trước:</span>
              <Badge tone="green">{pv.hop_le} hợp lệ</Badge>
              {pv.loi > 0 && <Badge tone="red">{pv.loi} lỗi</Badge>}
              {pv.thung_moi > 0 && <Badge tone="blue">Tạo {pv.thung_moi} thùng mới</Badge>}
              {pv.loi > 0 && (
                <label className="ml-auto text-xs inline-flex items-center gap-1">
                  <input type="checkbox" checked={chiLoi} onChange={(e) => setChiLoi(e.target.checked)} /> Chỉ xem dòng lỗi
                </label>
              )}
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-lg border border-[var(--line)]">
              <table className="tbl w-full whitespace-nowrap text-xs">
                <thead className="bg-[var(--surface-2)] text-left sticky top-0">
                  <tr><th>Dòng</th><th>Mã xác</th><th>Kết quả</th><th>Thùng</th><th>Ghi chú</th><th>Kiểm tra</th></tr>
                </thead>
                <tbody>
                  {hien.map((r) => (
                    <tr key={r.dong} className={r.ok ? "" : "bg-[var(--red-50)]"}>
                      <td>{r.dong}</td>
                      <td className="font-mono">{r.ma}</td>
                      <td>{r.kq ? KQ_NHAN[r.kq] || r.kq : "—"}</td>
                      <td>{r.thung || ""}</td>
                      <td className="max-w-[200px] truncate" title={r.ghi_chu || ""}>{r.ghi_chu || ""}</td>
                      <td className={r.ok ? "text-[var(--green-700)]" : "text-[var(--red-700)] whitespace-normal"}>{r.ok ? "✓ Hợp lệ" : r.loi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
