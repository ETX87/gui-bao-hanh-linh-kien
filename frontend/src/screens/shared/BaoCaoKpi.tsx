import { useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { fmtDate } from "../../lib/format";
import { normalizeVi } from "../../lib/normalizeVi";
import { Btn, Card, EmptyState, Select, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { ExcelToolbar } from "../../ui/ColumnFilter";
import { NONE, useListFilters } from "../../ui/FilterBar";
import { fmtGio } from "./BaoCaoBo";

// 25/11/2026 - BC KPIs nhan vien theo thang (chuyen tu file Excel "BC DVBH <ky> - bảo hành.xlsx"). Du lieu: GET /api/bao-cao-kpi
// (backend lib/baoCaoKpi.ts). Yeu cau: "bc này không cần chạy liên tục, chỉ cần thêm nút load bc, thì mới load số liệu khi cần"
// -> man mo ra KHONG goi API; chi khi bam "📥 Tải số liệu" moi tinh. Tai Excel tu so lieu vua tai.

type KetQua = "dat" | "qua" | "khong_xet" | "appsheet" | "dang_cho" | "dang_cho_qua";
interface DongKpi {
  loai: "kho" | "admin" | "nv";
  id: string;
  mien: string | null;
  nguoi: string | null;
  ktv: string | null;
  case_id: string | null;
  tu: string | null;
  den: string | null;
  gio: number | null;
  ket_qua: KetQua;
  ghi_chu: string | null;
}
interface TongKpi {
  dat: number;
  qua: number;
  khong_xet: number;
  appsheet: number;
  tong: number;
  ty_le: number | null;
  tb_gio: number | null;
  dang_cho: number;
  dang_cho_qua: number;
}
interface NhomKpi extends TongKpi {
  nguoi: string | null;
  mien: string | null;
}
interface BaoCaoKpi {
  thang: string;
  tinh_luc: string;
  nguong_gio: number;
  kho: { tong: TongKpi; theo_mien: NhomKpi[]; theo_nguoi: NhomKpi[] };
  admin: { tong: TongKpi; theo_mien: NhomKpi[]; theo_nguoi: NhomKpi[] };
  nv: { tong: TongKpi; theo_nguoi: NhomKpi[] };
  chi_tiet: DongKpi[];
}

const LOAI_LABEL: Record<DongKpi["loai"], string> = { kho: "🏬 Kho gửi hàng trả", admin: "🛡 Admin BH xử lý", nv: "🔧 NV sửa chữa" };
const MIEN_LABEL: Record<string, string> = { MB: "Miền Bắc", MN: "Miền Nam" };
const mienLabel = (m: string | null) => (m ? MIEN_LABEL[m] || m : "Chưa khai báo");

function kqLabel(k: KetQua, loai: DongKpi["loai"]): string {
  const dat = loai === "kho" ? "Đúng hạn" : "Dưới 24h";
  const qua = loai === "kho" ? "Quá hạn" : "Tồn quá 24h";
  return { dat, qua, khong_xet: "Không xét", appsheet: "Từ AppSheet", dang_cho: "Đang chờ (trong 24h)", dang_cho_qua: "Đang chờ — quá 24h" }[k];
}
const KQ_TONE: Record<KetQua, string> = {
  dat: "text-[var(--green-700)]",
  qua: "text-[var(--red-600)]",
  khong_xet: "text-[var(--ink-soft)]",
  appsheet: "text-[var(--ink-faint)]",
  dang_cho: "text-[var(--amber-700)]",
  dang_cho_qua: "text-[var(--red-600)]",
};

function thangOptions(): string[] {
  const out: string[] = [];
  const now = new Date(Date.now() + 7 * 3600_000);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < 12; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    if (--m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
}

function TyLe({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[var(--ink-faint)]">—</span>;
  const tone = v >= 95 ? "text-[var(--green-700)]" : v >= 85 ? "text-[var(--amber-700)]" : "text-[var(--red-600)]";
  return <span className={`font-semibold ${tone}`}>{v.toLocaleString("vi-VN")}%</span>;
}
const so = (n: number) => (n ? n.toLocaleString("vi-VN") : "—");

// Bang tong hop nho (pivot) cho 1 KPI.
function BangTong({ rows, tong, loai, cotNguoi, cotMien }: { rows: NhomKpi[]; tong: TongKpi; loai: DongKpi["loai"]; cotNguoi: boolean; cotMien: boolean }) {
  const coAs = tong.appsheet > 0;
  const coKx = loai === "admin";
  const coCho = tong.dang_cho > 0;
  const datL = loai === "kho" ? "Đúng hạn" : "Dưới 24h";
  const quaL = loai === "kho" ? "Quá hạn" : "Tồn quá 24h";
  const cells = (t: TongKpi) => (
    <>
      <td className="text-right text-[var(--green-700)]">{so(t.dat)}</td>
      <td className="text-right text-[var(--red-600)]">{so(t.qua)}</td>
      {coKx && <td className="text-right text-[var(--ink-soft)]">{so(t.khong_xet)}</td>}
      <td className="text-right font-semibold">{so(t.tong)}</td>
      <td className="text-right">
        <TyLe v={t.ty_le} />
      </td>
      <td className="text-right">{fmtGio(t.tb_gio)}</td>
      {loai === "admin" && <td className="text-right font-semibold">{so(t.dat + t.qua + t.khong_xet + t.appsheet)}</td>}
      {coAs && <td className="text-right text-[var(--ink-faint)]">{so(t.appsheet)}</td>}
      {coCho && (
        <td className="text-right">
          {so(t.dang_cho)}
          {t.dang_cho_qua > 0 && <span className="ml-1 text-[11px] font-semibold text-[var(--red-600)]">({t.dang_cho_qua} quá 24h)</span>}
        </td>
      )}
    </>
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
      <table className="tbl w-full whitespace-nowrap">
        <thead>
          <tr className="bg-[var(--surface-2)]">
            {cotNguoi && <th className="text-left">{loai === "nv" ? "NV sửa chữa" : loai === "admin" ? "Admin BH" : "Người gửi"}</th>}
            {cotMien && <th className="text-left">Miền</th>}
            <th className="text-right">{datL}</th>
            <th className="text-right">{quaL}</th>
            {coKx && <th className="text-right" title="Bước Admin có giải trình lý do ngoại cảnh (Không có linh kiện, Hết hàng tồn kho…)">Không xét</th>}
            <th className="text-right">Tổng xét</th>
            <th className="text-right">Tỷ lệ đạt</th>
            <th className="text-right">TB xử lý</th>
            {loai === "admin" && <th className="text-right" title="Mọi linh kiện Admin xử lý xong trong tháng (kể cả Không xét / AppSheet)">SL xử lý</th>}
            {coAs && <th className="text-right" title="Bắt đầu từ dữ liệu nhập AppSheet — chỉ đếm, không tính giờ">Từ AppSheet</th>}
            {coCho && <th className="text-right" title="Đang chờ tại lúc tải số liệu (chỉ tháng hiện tại, không tính vào tỷ lệ)">Đang chờ</th>}
            <th className="w-full" aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.nguoi}|${r.mien}`} className="border-t border-[var(--line)]">
              {cotNguoi && <td title={r.nguoi ?? ""}>{r.nguoi ? displayName(r.nguoi) : "—"}</td>}
              {cotMien && <td>{mienLabel(r.mien)}</td>}
              {cells(r)}
              <td aria-hidden="true" />
            </tr>
          ))}
          <tr className="border-t-2 border-[var(--line)] font-bold">
            <td colSpan={(cotNguoi ? 1 : 0) + (cotMien ? 1 : 0)}>Tổng</td>
            {cells(tong)}
            <td aria-hidden="true" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const CHI_TIET_KEYS = ["id", "mien", "nguoi", "ktv", "case_id", "gio_tu", "gio_den", "ket_qua", "ghi_chu"];
const HIEN_TOI_DA = 300;

export function BaoCaoKpiScreen() {
  useUserNames();
  const opts = useMemo(thangOptions, []);
  const [thang, setThang] = useState(opts[0]);
  const [data, setData] = useState<BaoCaoKpi | null>(null);
  const [dang, setDang] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<DongKpi["loai"]>("admin");
  const flt = useListFilters(null, CHI_TIET_KEYS);

  const taiSoLieu = () => {
    setDang(true);
    setErr(null);
    api
      .get<BaoCaoKpi>(`/bao-cao-kpi?thang=${thang}`)
      .then((r) => setData(r))
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setDang(false));
  };

  const dongTab = useMemo(() => (data ? data.chi_tiet.filter((d) => d.loai === tab) : []), [data, tab]);
  const optsTu = (f: (d: DongKpi) => string | null, lbl: (v: string) => string) => {
    const s = new Set(dongTab.map((d) => f(d) ?? ""));
    return [...s].map((v) => ({ value: v || NONE, label: v ? lbl(v) : "(Trống)" })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  };

  // Loc + sap xep phia trinh duyet (so lieu da tai het ve may).
  const dongLoc = useMemo(() => {
    const v = flt.values;
    const multi = (k: string, val: string | null) => {
      if (!v[k]) return true;
      return v[k].split(",").includes(val || NONE);
    };
    const text = (k: string, val: string | null) => !v[k] || normalizeVi(val || "").includes(normalizeVi(v[k]));
    const num = (k: string, val: number | null) => {
      const tu = v[`${k}_tu`];
      const den = v[`${k}_den`];
      if (!tu && !den) return true;
      if (val == null) return false;
      return (!tu || val >= Number(tu)) && (!den || val <= Number(den));
    };
    const q = normalizeVi(flt.q || "");
    let out = dongTab.filter(
      (d) =>
        text("id", d.id) &&
        multi("mien", d.mien) &&
        multi("nguoi", d.nguoi) &&
        multi("ktv", d.ktv) &&
        text("case_id", d.case_id) &&
        num("gio", d.gio) &&
        multi("ket_qua", d.ket_qua) &&
        text("ghi_chu", d.ghi_chu) &&
        (!q || normalizeVi([d.id, d.case_id, d.nguoi && displayName(d.nguoi), d.ktv && displayName(d.ktv), d.ghi_chu].filter(Boolean).join(" ")).includes(q)),
    );
    if (flt.sort) {
      const k = flt.sort as keyof DongKpi;
      const dir = flt.dir === "desc" ? -1 : 1;
      out = [...out].sort((a, b) => {
        const x = a[k];
        const y = b[k];
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "vi")) * dir;
      });
    }
    return out;
  }, [dongTab, flt.values, flt.q, flt.sort, flt.dir]);

  const cols: Column<DongKpi>[] = [
    { key: "id", header: tab === "kho" ? "Phiếu trả" : "Đơn vị", render: (d) => <span className="font-mono text-xs">{d.id}</span>, filter: { type: "text", key: "id" }, sortKey: "id" },
    { key: "mien", header: "Miền", render: (d) => mienLabel(d.mien), filter: { type: "multi", def: { key: "mien", label: "Miền", static: optsTu((d) => d.mien, mienLabel) } }, sortKey: "mien" },
    {
      key: "nguoi",
      header: tab === "nv" ? "NV sửa chữa" : tab === "admin" ? "Admin BH" : "Kho gửi",
      render: (d) => (d.nguoi ? displayName(d.nguoi) : "—"),
      filter: { type: "multi", def: { key: "nguoi", label: "Người", static: optsTu((d) => d.nguoi, displayName) } },
      sortKey: "nguoi",
    },
    { key: "ktv", header: "KTV", render: (d) => (d.ktv ? displayName(d.ktv) : "—"), filter: { type: "multi", def: { key: "ktv", label: "KTV", static: optsTu((d) => d.ktv, displayName) } }, sortKey: "ktv" },
    ...(tab === "kho" ? [] : [{ key: "case_id", header: "Mã case", render: (d: DongKpi) => d.case_id || "—", filter: { type: "text" as const, key: "case_id" }, sortKey: "case_id" }]),
    { key: "tu", header: tab === "kho" ? "KT duyệt" : tab === "admin" ? "Admin nhận" : "Giao NV", render: (d) => fmtDate(d.tu), sortKey: "tu" },
    { key: "den", header: tab === "kho" ? "Kho gửi" : tab === "admin" ? "Admin xử lý xong" : "NV nộp kết quả", render: (d) => (d.den ? fmtDate(d.den) : "Đang chờ"), sortKey: "den" },
    { key: "gio", header: "Giờ SLA", render: (d) => fmtGio(d.gio), className: "text-right", filter: { type: "number", key: "gio" }, sortKey: "gio" },
    {
      key: "ket_qua",
      header: "Kết quả",
      render: (d) => <span className={`font-semibold ${KQ_TONE[d.ket_qua]}`}>{kqLabel(d.ket_qua, d.loai)}</span>,
      filter: { type: "multi", def: { key: "ket_qua", label: "Kết quả", static: optsTu((d) => d.ket_qua, (v) => kqLabel(v as KetQua, tab)) } },
      sortKey: "ket_qua",
    },
    { key: "ghi_chu", header: "Ghi chú", render: (d) => d.ghi_chu || "", filter: { type: "text", key: "ghi_chu" } },
  ];

  const taiXlsx = () => {
    if (!data) return;
    const hdr = (loai: DongKpi["loai"]) => {
      const dat = loai === "kho" ? "Đúng hạn" : "Dưới 24h";
      const qua = loai === "kho" ? "Quá hạn" : "Tồn quá 24h";
      return [dat, qua, "Không xét", "Tổng xét", "Tỷ lệ đạt (%)", "TB xử lý (giờ)", "Từ AppSheet", "Đang chờ", "Đang chờ quá 24h"];
    };
    const val = (t: TongKpi) => [t.dat, t.qua, t.khong_xet, t.tong, t.ty_le ?? "", t.tb_gio ?? "", t.appsheet, t.dang_cho, t.dang_cho_qua].map(String);
    const tongHop: string[][] = [
      [`BC KPIs tháng ${data.thang.slice(5)}/${data.thang.slice(0, 4)} — tính lúc ${data.tinh_luc}`],
      [`Ngưỡng ${data.nguong_gio} giờ SLA (liên tục, không tính Chủ nhật)`],
      [],
      ["KPI", ...hdr("admin")],
      ["Kho — tốc độ gửi hàng trả (KT duyệt → Kho gửi)", ...val(data.kho.tong)],
      ["Admin BH — tốc độ xử lý (nhận hàng → rời tay Admin)", ...val(data.admin.tong)],
      ["NV sửa chữa — giao NV → nộp kết quả", ...val(data.nv.tong)],
    ];
    const sheetNhom = (rows: NhomKpi[], tong: TongKpi, loai: DongKpi["loai"]) => [
      ["Người", "Miền", ...hdr(loai), ...(loai === "admin" ? ["SL xử lý"] : [])],
      ...rows.map((r) => [r.nguoi ? displayName(r.nguoi) : "", r.mien ? mienLabel(r.mien) : "", ...val(r), ...(loai === "admin" ? [String(r.dat + r.qua + r.khong_xet + r.appsheet)] : [])]),
      ["TỔNG", "", ...val(tong), ...(loai === "admin" ? [String(tong.dat + tong.qua + tong.khong_xet + tong.appsheet)] : [])],
    ];
    const chiTiet: string[][] = [["KPI", "Mã", "Miền", "Người", "KTV", "Mã case", "Từ", "Đến", "Giờ SLA", "Kết quả", "Ghi chú"]];
    for (const d of data.chi_tiet)
      chiTiet.push([
        LOAI_LABEL[d.loai].replace(/^\S+\s/, ""), d.id, mienLabel(d.mien), d.nguoi ? displayName(d.nguoi) : "", d.ktv ? displayName(d.ktv) : "",
        d.case_id ?? "", d.tu ?? "", d.den ?? "", d.gio == null ? "" : String(d.gio), kqLabel(d.ket_qua, d.loai), d.ghi_chu ?? "",
      ]);
    const w = [26, 14, 10, 10, 10, 10, 12, 12, 10, 10, 12];
    downloadBlob(
      buildXlsx([
        { name: "Tong hop", rows: tongHop, widths: [52, 10, 10, 10, 10, 12, 12, 10, 10, 14] },
        { name: "Kho gui hang", rows: sheetNhom([...data.kho.theo_mien], data.kho.tong, "kho"), widths: [28, ...w] },
        { name: "Admin BH", rows: sheetNhom(data.admin.theo_nguoi, data.admin.tong, "admin"), widths: [32, ...w] },
        { name: "NV sua chua", rows: sheetNhom(data.nv.theo_nguoi, data.nv.tong, "nv"), widths: [32, ...w] },
        { name: "Chi tiet", rows: chiTiet, widths: [20, 18, 12, 28, 34, 16, 20, 20, 10, 18, 44] },
      ]),
      `BC-KPIs-${data.thang}.xlsx`,
    );
  };

  const the = (label: string, t: TongKpi, sub: string) => (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="text-xs font-semibold text-[var(--ink-soft)]">{label}</div>
      <div className="mt-1 text-2xl">
        <TyLe v={t.ty_le} />
      </div>
      <div className="text-[11px] text-[var(--ink-faint)]">
        {t.dat.toLocaleString("vi-VN")}/{t.tong.toLocaleString("vi-VN")} {sub}
        {t.dang_cho_qua > 0 && <span className="ml-1 font-semibold text-[var(--red-600)]">· {t.dang_cho_qua} đang chờ quá 24h</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <Card
        title="🎯 BC KPIs nhân viên theo tháng"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={thang} onChange={(e) => setThang(e.target.value)} className="!w-auto">
              {opts.map((o) => (
                <option key={o} value={o}>
                  Tháng {o.slice(5)}/{o.slice(0, 4)}
                </option>
              ))}
            </Select>
            <Btn variant="primary" size="sm" onClick={taiSoLieu} disabled={dang}>
              {dang ? "Đang tính…" : "📥 Tải số liệu"}
            </Btn>
            <Btn size="sm" onClick={taiXlsx} disabled={!data || dang}>
              ⬇ Tải Excel
            </Btn>
          </div>
        }
      >
        <p className="text-xs text-[var(--ink-soft)]">
          Báo cáo không tự chạy — chọn tháng rồi bấm <b>📥 Tải số liệu</b> mới tính từ dữ liệu mới nhất. 3 KPI theo file Excel KPI tháng:
          <b> Kho</b> gửi hàng trả trong 24h kể từ Kế toán duyệt; <b>Admin BH</b> xử lý mỗi linh kiện dưới 24h kể từ lúc nhận hàng (sớm hơn giữa
          "Kho nhận + 2 giờ" và "Admin xác nhận nhận thùng") tới lúc rời tay Admin (giao NV / sẵn sàng trả / huỷ, trừ thời gian chờ KTV bổ sung;
          có giải trình ngoại cảnh như Không có linh kiện thì "Không xét"); <b>NV sửa chữa</b> nộp kết quả dưới 24h kể từ lúc được giao. Giờ tính
          theo SLA hệ thống (liên tục, không tính Chủ nhật). Dữ liệu trước 01/11/2026 là bản nhập AppSheet, chỉ đếm ở cột "Từ AppSheet".
          {data && data.thang === thang && (
            <span className="ml-1 font-semibold text-[var(--ink)]">
              Số liệu tháng {data.thang.slice(5)}/{data.thang.slice(0, 4)} tính lúc {data.tinh_luc.slice(11, 16)} {data.tinh_luc.slice(8, 10)}/{data.tinh_luc.slice(5, 7)}.
            </span>
          )}
          {data && data.thang !== thang && <span className="ml-1 font-semibold text-[var(--amber-700)]">Đang hiện số liệu tháng {data.thang.slice(5)}/{data.thang.slice(0, 4)} — bấm "Tải số liệu" để tính tháng vừa chọn.</span>}
        </p>
      </Card>

      {err && <EmptyState text={`Không tải được báo cáo: ${err}`} />}
      {dang && !data && <Spinner />}
      {!data && !dang && !err && <EmptyState text='Chọn tháng rồi bấm "📥 Tải số liệu" để xem báo cáo.' />}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {the("🏬 Kho gửi hàng trả đúng hạn", data.kho.tong, "phiếu")}
            {the("🛡 Admin BH xử lý dưới 24h", data.admin.tong, "linh kiện")}
            {the("🔧 NV sửa chữa dưới 24h", data.nv.tong, "lượt sửa")}
          </div>
          <Card title="🏬 Kho — tốc độ gửi hàng trả (Kế toán duyệt → Kho bấm Gửi hàng)">
            <BangTong rows={data.kho.theo_mien} tong={data.kho.tong} loai="kho" cotNguoi={false} cotMien />
          </Card>
          <Card title="🛡 Admin BH — tốc độ xử lý theo người × miền">
            <BangTong rows={data.admin.theo_nguoi} tong={data.admin.tong} loai="admin" cotNguoi cotMien />
          </Card>
          <Card title="🔧 NV sửa chữa — năng suất (giao NV → nộp kết quả)">
            <BangTong rows={data.nv.theo_nguoi} tong={data.nv.tong} loai="nv" cotNguoi cotMien={false} />
            <p className="mt-1 text-[11px] text-[var(--ink-faint)]">Đơn B2B (sheet "ĐƠN B2B" của file Excel) chưa có trên hệ thống — chưa tính.</p>
          </Card>
          <Card title="📋 Chi tiết từng dòng">
            <div className="mb-2 inline-flex rounded-lg border border-[var(--line)] p-0.5 text-sm">
              {(["admin", "nv", "kho"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    setTab(k);
                    flt.clear();
                  }}
                  className={`rounded-md px-2.5 py-1 font-semibold ${tab === k ? "bg-[var(--accent)] text-white" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`}
                >
                  {LOAI_LABEL[k]} ({data.chi_tiet.filter((d) => d.loai === k).length.toLocaleString("vi-VN")})
                </button>
              ))}
            </div>
            <ExcelToolbar flt={flt} cols={cols.map((c) => ({ key: c.key, label: c.header, filter: c.filter, sortKey: c.sortKey }))} placeholder="Tìm mã, case, người, KTV…" total={dongLoc.length} totalAll={dongTab.length} />
            <Table columns={cols} rows={dongLoc.slice(0, HIEN_TOI_DA)} rowKey={(d) => `${d.loai}|${d.id}|${d.tu}`} flt={flt} emptyText="Không có dòng nào." />
            {dongLoc.length > HIEN_TOI_DA && (
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Hiện {HIEN_TOI_DA}/{dongLoc.length.toLocaleString("vi-VN")} dòng — lọc thêm hoặc bấm "⬇ Tải Excel" để xem đủ.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
