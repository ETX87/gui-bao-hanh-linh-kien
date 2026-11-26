import { useEffect, useMemo, useState } from "react";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, Select } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { api, errorMessage } from "../../lib/api";
import { readSheetFileFull, type SheetMerge } from "../../lib/xlsxRead";
import { normalizeVi } from "../../lib/normalizeVi";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { useLkName } from "../../hooks/useLinhKien";

// 26/11/2026 (v1.162) - Import Bien ban ban giao (BBBG) tra xac lap tay theo ma case + ma hang.
// Nguyen van: "Làm cả 3" - phuong an (3) "Import BBBG theo mã case + mã hàng: app ghép tự động theo logic §2, hiện bảng xem trước theo kết luận,
// chỉ đưa vào thùng các dòng Khớp". Doc file dang BBBG nhan vien dang lap (cot Mã hàng + MYC chua nhieu ma case cach nhau dau cach,
// cot Số Thùng gop o) hoac dang 1 dong 1 case. Backend: POST /api/tra-xac/import-bbbg (lib/ghepBbbg.ts).

interface Dong {
  dong: number;
  ma: string;
  ma_hang: string;
  kien: string;
}
interface KqDong {
  dong: number;
  ma: string;
  ma_hang: string;
  kien: string | null;
  kl: string;
  kl_nhan: string;
  xac_id: string | null;
  lk_b: string | null;
  lk_a: string | null;
  mo_ta: string;
  gom: boolean;
  loi?: string;
}
interface Kq {
  rows: KqDong[];
  app_thieu: { id: string; case_id: string; lk_b: string | null; mien: string | null }[];
  tong: number;
  se_gom: number;
  loi_thung: number;
  dem: Record<string, number>;
  mien: string | null;
  doi_tac: string | null;
  thung: string | null;
}
interface ThungMin {
  id: string;
  trang_thai: string;
  doi_tac: string | null;
  mien: string | null;
  so_xac?: number;
}

const KL: { k: string; nhan: string; tone: "green" | "blue" | "amber" | "red" | "gray" }[] = [
  { k: "khop", nhan: "Khớp – chờ gom", tone: "green" },
  { k: "khop_ac", nhan: "Khớp theo mã A/C", tone: "blue" },
  { k: "lech_ma", nhan: "Lệch mã LK", tone: "red" },
  { k: "da_ket_qua", nhan: "Đã có kết quả ngoài thùng", tone: "amber" },
  { k: "trong_thung", nhan: "Đang trong thùng khác", tone: "amber" },
  { k: "da_tra", nhan: "Đã trả", tone: "gray" },
  { k: "khong_tra", nhan: "Không phải xác trả đối tác", tone: "red" },
  { k: "chua_du_dk", nhan: "Chưa đủ ĐK gom", tone: "amber" },
  { k: "thua", nhan: "Thừa", tone: "red" },
  { k: "khong_co", nhan: "Không có trong app", tone: "red" },
];
const TONE = Object.fromEntries(KL.map((x) => [x.k, x.tone]));
const VIEC: Record<string, string> = {
  khop: "Đưa vào thùng",
  khop_ac: "Kiểm xác thật: đúng như BBBG → sửa mã B của đơn; đúng như app → sửa BBBG. Tick \"Đưa cả dòng khớp theo mã A/C\" để gom luôn",
  lech_ma: "Mở kiện kiểm xác thật → sửa mã B trên đơn hoặc rút xác khỏi BBBG",
  da_ket_qua: "Thật sự trả đợt này → tab Đã xử lý khác › Đưa lại chờ gom, rồi import lại",
  trong_thung: "Xác đã nằm trong thùng khác — kiểm trùng",
  da_tra: "Xác đã trả ở thùng đã duyệt — rút khỏi BBBG",
  khong_tra: "Không thuộc diện trả đối tác (từ chối / trừ nợ / xử lý xác khác) — rút khỏi BBBG hoặc Admin BH sửa đơn",
  chua_du_dk: "Đơn chưa phân loại xong — xử lý đơn trước",
  thua: "BBBG ghi nhiều xác hơn số xác của case — kiểm lại",
  khong_co: "Mã case / Lada không có trong app — kiểm lại mã",
};

const n = (s: string) => normalizeVi(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Doc BBBG: tim dong tieu de co "Mã hàng" + cot ma case (MYC / Mã case / Case / Lada); cot kien (Số thùng / Kiện) tuy chon.
// O kien gop (merge) chi co gia tri o dong dau -> dong trong vung gop lay gia tri o dau vung; o trong KHONG gop = chua ghi kien.
// sheet giu dung so dong Excel (dong i = dong Excel i + 1).
function docBbbg(sheet: string[][], merges: SheetMerge[]): { dongs: Dong[]; soDongMa: number } {
  const hi = sheet.findIndex((r) => r.some((c) => n(c).startsWith("ma hang")) && r.some((c) => /^(myc|ma case|case|ma yeu cau|ma lada|lada)/.test(n(c))));
  if (hi < 0) throw new Error('Không thấy dòng tiêu đề có cột "Mã hàng" và cột "MYC" / "Mã case".');
  const head = sheet[hi].map(n);
  const iHang = head.findIndex((c) => c.startsWith("ma hang"));
  const iMa = head.findIndex((c) => /^(myc|ma case|case|ma yeu cau|ma lada|lada)/.test(c));
  const iKien = head.findIndex((c) => /^(so thung|thung|kien|so kien)/.test(c));
  const dongs: Dong[] = [];
  let soDongMa = 0;
  const kienO = (ri: number) => {
    if (iKien < 0) return "";
    let v = sheet[ri]?.[iKien] || "";
    if (!v.trim()) {
      const m = merges.find((g) => ri >= g.r1 && ri <= g.r2 && iKien >= g.c1 && iKien <= g.c2);
      if (m) v = sheet[m.r1]?.[m.c1] || "";
    }
    return v.replace(/\s+/g, " ").trim();
  };
  sheet.forEach((r, ri) => {
    if (ri <= hi) return;
    const hang = (r[iHang] || "").replace(/\s+/g, "");
    const ma = (r[iMa] || "").trim();
    if (!hang || !ma) return;
    soDongMa++;
    const kien = kienO(ri);
    for (const m of ma.split(/[\s,;]+/).filter(Boolean)) dongs.push({ dong: ri + 1, ma: m.toUpperCase(), ma_hang: hang, kien });
  });
  if (!dongs.length) throw new Error("File không có dòng nào có cả Mã hàng và mã case.");
  return { dongs, soDongMa };
}

export function ImportBbbgModal({ onClose, onDone }: { onClose: () => void; onDone: (thungId: string) => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [file, setFile] = useState("");
  const [dongs, setDongs] = useState<Dong[] | null>(null);
  const [soDongMa, setSoDongMa] = useState(0);
  const [thung, setThung] = useState("MOI");
  const [gomAc, setGomAc] = useState(false);
  const [thungs, setThungs] = useState<ThungMin[]>([]);
  const [kq, setKq] = useState<Kq | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loc, setLoc] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<{ thung: ThungMin[] }>("/tra-xac/thung?trang_thai=nhap,cho_ke_toan&limit=200")
      .then((r) => setThungs(r.thung))
      .catch(() => setThungs([]));
  }, []);

  const kiemTra = async (data = dongs, th = thung, ac = gomAc) => {
    if (!data) return;
    setBusy("Đang đối chiếu với dữ liệu app…");
    try {
      setKq(await api.post<Kq>("/tra-xac/import-bbbg", { rows: data, thung: th, gom_ac: ac, ap_dung: false }));
    } catch (e) {
      setKq(null);
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const chonFile = async (f: File | undefined) => {
    if (!f) return;
    setFile(f.name);
    setKq(null);
    setLoc(new Set());
    try {
      const sh = await readSheetFileFull(f);
      const r = docBbbg(sh.rows, sh.merges);
      setDongs(r.dongs);
      setSoDongMa(r.soDongMa);
      await kiemTra(r.dongs);
    } catch (e) {
      setDongs(null);
      toast(e instanceof Error ? e.message : errorMessage(e), "error");
    }
  };

  const apDung = async () => {
    if (!dongs || !kq) return;
    if (!confirm(`Đưa ${kq.se_gom} xác vào ${thung === "MOI" ? "1 thùng trả xác MỚI" : `thùng ${thung}`}? Các dòng khác giữ nguyên để kiểm.`)) return;
    setBusy("Đang đưa vào thùng…");
    try {
      const r = await api.post<{ ok: number; bo_qua: number; thung: string; tao_moi: boolean }>("/tra-xac/import-bbbg", { rows: dongs, thung, gom_ac: gomAc, ten_file: file, ap_dung: true });
      toast(`${r.tao_moi ? `Đã tạo ${r.thung}` : `Thùng ${r.thung}`}: đưa vào ${r.ok} xác${r.bo_qua ? ` (${r.bo_qua} bỏ qua — đã đổi trong lúc import)` : ""}. Nhập Mã EO rồi gửi Kế toán.`, "ok");
      onDone(r.thung);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(null);
    }
  };

  const taiKetQua = () => {
    if (!kq) return;
    const ct = [["Dòng BBBG", "Mã case / Lada", "Mã hàng BBBG", "Tên (theo BBBG)", "Kiện", "Kết luận", "Đưa vào thùng", "Mã xác app", "Mã B app", "Mã A app", "Ghi chú", "Việc cần làm"]];
    for (const r of kq.rows) ct.push([String(r.dong), r.ma, r.ma_hang, nameOf(r.ma_hang), r.kien || "", r.kl_nhan, r.gom ? "Có" : "", r.xac_id || "", r.lk_b || "", r.lk_a || "", r.loi || r.mo_ta, r.loi ? "Sửa thùng đích / tách thùng" : VIEC[r.kl] || ""]);
    const th = [["Mã xác", "Mã case", "Mã B", "Tên linh kiện", "Miền"], ...kq.app_thieu.map((x) => [x.id, x.case_id, x.lk_b || "", nameOf(x.lk_b), x.mien || ""])];
    const tom = [["Kết luận", "Số xác", "Việc cần làm"], ...KL.filter((x) => kq.dem[x.k]).map((x) => [x.nhan, String(kq.dem[x.k]), VIEC[x.k]]), [], ["Sẽ đưa vào thùng", String(kq.se_gom), ""], ["App có, BBBG không ghi (cùng case)", String(kq.app_thieu.length), "Kiểm kho: còn → đợt sau; đã gửi mà quên ghi → bổ sung"]];
    downloadBlob(buildXlsx([{ name: "Tong hop", rows: tom, widths: [36, 10, 90] }, { name: "Chi tiet", rows: ct, widths: [9, 16, 14, 36, 10, 28, 10, 16, 16, 16, 34, 60] }, { name: "App co - BBBG thieu", rows: th, widths: [16, 16, 30, 40, 8] }]), `doi-chieu-BBBG_${file.replace(/\.[^.]+$/, "")}.xlsx`);
  };

  const hien = useMemo(() => (kq ? (loc.size ? kq.rows.filter((r) => loc.has(r.kl)) : kq.rows) : []), [kq, loc]);
  const toggle = (k: string) => setLoc((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });

  return (
    <Modal
      title="⬆ Import biên bản bàn giao (BBBG) trả xác"
      onClose={onClose}
      maxWidthClass="max-w-6xl"
      footerActions={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          {kq && <Btn variant="secondary" onClick={taiKetQua}>⬇ Tải kết quả đối chiếu</Btn>}
          <Btn variant="primary" disabled={!kq || !kq.se_gom || !!busy} onClick={apDung}>
            {busy?.startsWith("Đang đưa") ? busy : `Đưa ${kq?.se_gom ?? 0} xác vào thùng`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-3">
          <p className="font-semibold mb-1">① Chọn file BBBG</p>
          <p className="text-xs text-[var(--ink-soft)] mb-2">
            Sheet đầu tiên có dòng tiêu đề gồm cột <b>Mã hàng</b> và cột <b>MYC</b> (hoặc <b>Mã case</b>) — mỗi ô MYC chứa 1 hoặc nhiều mã case / Lada cách nhau dấu cách; cột <b>Số thùng</b> / <b>Kiện</b> tuỳ chọn (ô gộp được hiểu cho cả nhóm dòng).
            Mỗi mã case = 1 xác; app ghép với đúng 1 xác theo mã linh kiện B → A/C.
          </p>
          <input type="file" accept=".xlsx,.csv" onChange={(e) => chonFile(e.target.files?.[0])} className="text-xs" />
          {dongs && <span className="ml-2 text-xs text-[var(--ink-soft)]">{file}: {soDongMa} dòng mã hàng → <b>{dongs.length}</b> xác</span>}
        </div>
        <div className="rounded-lg border border-[var(--line)] p-3 flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="block font-semibold mb-0.5">② Thùng đích</span>
            <Select value={thung} onChange={(e) => { setThung(e.target.value); kiemTra(dongs, e.target.value, gomAc); }}>
              <option value="MOI">＋ Tạo thùng mới (đối tác / miền theo xác đầu tiên)</option>
              {thungs.map((t) => (
                <option key={t.id} value={t.id}>{t.id} · {t.trang_thai === "nhap" ? "Nháp" : "Chờ KT"} · {t.doi_tac || "chưa có đối tác"} · {t.mien || "—"} · {t.so_xac ?? 0} xác</option>
              ))}
            </Select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={gomAc} onChange={(e) => { setGomAc(e.target.checked); kiemTra(dongs, thung, e.target.checked); }} />
            Đưa cả dòng <b>khớp theo mã A/C</b> (đã kiểm xác thật)
          </label>
          {busy && !busy.startsWith("Đang đưa") && <span className="text-xs text-[var(--ink-soft)]">{busy}</span>}
        </div>
        {kq && (
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="font-semibold">③ Kết quả đối chiếu {kq.tong} xác:</span>
              {KL.filter((x) => kq.dem[x.k]).map((x) => (
                <button key={x.k} type="button" onClick={() => toggle(x.k)} className={`rounded-full ${loc.has(x.k) ? "ring-2 ring-[var(--brand-500)]" : ""}`} title={`${VIEC[x.k]} — bấm để lọc (chọn nhiều)`}>
                  <Badge tone={x.tone}>{x.nhan}: {kq.dem[x.k]}</Badge>
                </button>
              ))}
              {loc.size > 0 && <Btn size="sm" variant="ghost" onClick={() => setLoc(new Set())}>× Bỏ lọc</Btn>}
            </div>
            <p className="text-xs mb-1.5">
              Sẽ đưa <b className="text-[var(--green-700)]">{kq.se_gom}</b> xác vào {kq.thung ? `thùng ${kq.thung}` : "thùng mới"} · đối tác <b>{kq.doi_tac || "—"}</b> · miền <b>{kq.mien || "—"}</b>
              {kq.loi_thung > 0 && <span className="text-[var(--red-700)]"> · {kq.loi_thung} xác khớp nhưng sai luật thùng (khác miền / đối tác)</span>}
              {kq.app_thieu.length > 0 && <span className="text-[var(--amber-700)]"> · {kq.app_thieu.length} xác chờ gom của các case này không có trong BBBG (xem file kết quả)</span>}
            </p>
            <div className="max-h-[45vh] overflow-auto rounded-lg border border-[var(--line)]">
              <table className="tbl w-full whitespace-nowrap text-xs">
                <thead className="bg-[var(--surface-2)] text-left sticky top-0">
                  <tr><th>Dòng</th><th>Mã case</th><th>Mã hàng BBBG</th><th>Kiện</th><th>Kết luận</th><th>Mã xác app</th><th>Mã B app</th><th>Ghi chú / việc cần làm</th></tr>
                </thead>
                <tbody>
                  {hien.map((r, i) => (
                    <tr key={`${r.dong}-${r.ma}-${i}`} className={r.gom ? "" : "bg-[var(--surface-2)]"}>
                      <td>{r.dong}</td>
                      <td className="font-mono">{r.ma}</td>
                      <td className="font-mono" title={nameOf(r.ma_hang)}>{r.ma_hang}</td>
                      <td>{r.kien || ""}</td>
                      <td><Badge tone={r.loi ? "red" : TONE[r.kl] || "gray"}>{r.kl_nhan}</Badge>{r.gom && <span className="ml-1 text-[var(--green-700)]">✓ vào thùng</span>}</td>
                      <td className="font-mono">{r.xac_id || ""}</td>
                      <td className="font-mono" title={r.lk_b ? nameOf(r.lk_b) : ""}>{r.lk_b && r.lk_b !== r.ma_hang ? r.lk_b : r.lk_b ? "=" : ""}</td>
                      <td className="max-w-[360px] truncate" title={r.loi || r.mo_ta || VIEC[r.kl]}>{r.loi || r.mo_ta || (r.gom ? "" : VIEC[r.kl])}</td>
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
