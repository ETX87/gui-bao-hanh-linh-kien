import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppUser } from "../../lib/types";
import { api, errorMessage } from "../../lib/api";
import { BEN_LABEL, VAI_GT_LABEL, buocOf, fmtGio, useBuoc, CHU_BUOC_LABEL } from "../../lib/buoc";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { normalizeVi } from "../../lib/normalizeVi";
import { Btn, Card, EmptyState, Input, Spinner } from "../../ui/primitives";
import { useRoute } from "../../router/Router";
import { UnitDetailModal } from "./UnitDetailModal";
import { PhieuTraDetailModal } from "./PhieuTraDetailModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";

// 15/11/2026 - Bao cao "Diem nghen & trach nhiem" (backend lib/baoCaoNghen.ts). Tra loi: dang ket o buoc nao, cham do ben nao,
// ai dang giu viec qua han, viec nao qua han chua giai trinh, xu huong 8 tuan. Moi bang: bam tieu de cot de sap xep + o tim.

interface Buoc {
  gd: string;
  tong: number;
  qua_han: number;
  chua_gt: number;
  lau_nhat_gio: number;
  sla: number;
}
interface Nhom {
  key: string;
  so: number;
  tb_qua_gio: number | null;
}
interface Nguoi {
  email: string;
  tong: number;
  qua_han: number;
  chua_gt: number;
  so_ktv?: number;
}
interface ChuaGt {
  gt_type: string;
  gt_id: string;
  gd: string;
  tu: string;
  so_don: number;
  ktv: string | null;
  nv: string | null;
  case_id: string | null;
  mien: string | null;
  don_id: string;
  dung_gio: number;
  qua_gio: number;
}
interface Tuan {
  tuan: string;
  giai_trinh: number;
  theo_ben: Record<string, number>;
  hoan_tat: number;
  tb_ca_gio: number | null;
}
interface Res {
  tu: string;
  den: string;
  kpi: { dang_dung: number; qua_sla: number; trong_sla_pct: number; chua_giai_trinh: number; tam_dung?: number; giai_trinh_ky: number; hoan_tat_ky: number; tb_ca_gio: number | null };
  buoc: Buoc[];
  giai_trinh: { theo_ben: Nhom[]; theo_ly_do: { ly_do: string; ben: string; so: number }[]; theo_buoc: Nhom[]; theo_vai: Nhom[] };
  nguoi: { ktv: Nguoi[]; gs: Nguoi[]; nv: Nguoi[] };
  qua_han_chua_gt: ChuaGt[];
  xu_huong: Tuan[];
  tinh_luc: string;
  tu_bo_nho: boolean;
}

const benLabel = (b: string) => (b === "chua_ro" ? "Chưa phân bên" : BEN_LABEL[b] || b);
const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

// ---- Bang nho co sap xep theo cot + o tim (bang tong hop, du lieu da tai het ve may) ----
interface Col<T> {
  key: string;
  header: string;
  render: (r: T) => ReactNode;
  sort?: (r: T) => number | string;
  text?: (r: T) => string;
  right?: boolean;
}
function MiniTable<T>({ rows, cols, rowKey, onRow, empty, tim = true }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T, i: number) => string; onRow?: (r: T) => void; empty: string; tim?: boolean }) {
  const [sort, setSort] = useState<{ k: string; asc: boolean } | null>(null);
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    let out = rows;
    const kw = normalizeVi(q).split(/\s+/).filter(Boolean);
    if (kw.length) out = out.filter((r) => { const t = normalizeVi(cols.map((c) => (c.text ? c.text(r) : "")).join(" ")); return kw.every((w) => t.includes(w)); });
    if (sort) {
      const c = cols.find((x) => x.key === sort.k);
      if (c?.sort) out = [...out].sort((a, b) => { const va = c.sort!(a), vb = c.sort!(b); return (va < vb ? -1 : va > vb ? 1 : 0) * (sort.asc ? 1 : -1); });
    }
    return out;
  }, [rows, cols, q, sort]);
  if (!rows.length) return <EmptyState text={empty} />;
  return (
    <div>
      {tim && rows.length > 6 && (
        <div className="mb-2 flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong bảng…" className="!max-w-xs" />
          <span className="text-xs text-[var(--ink-soft)]">{shown.length} / {rows.length}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="tbl w-full text-sm">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => c.sort && setSort((s) => (s?.k === c.key ? { k: c.key, asc: !s.asc } : { k: c.key, asc: false }))}
                  className={`whitespace-nowrap ${c.right ? "text-right" : "text-left"} ${c.sort ? "cursor-pointer select-none hover:text-[var(--accent-ink)]" : ""}`}
                >
                  {c.header}
                  {sort?.k === c.key ? (sort.asc ? " ▲" : " ▼") : c.sort ? <span className="text-[var(--ink-faint)]"> ↕</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={rowKey(r, i)} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "cursor-pointer hover:bg-[var(--accent-soft)]" : ""}>
                {cols.map((c) => (
                  <td key={c.key} className={c.right ? "text-right tabular-nums" : ""}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bar({ v, max, tone = "var(--accent)" }: { v: number; max: number; tone?: string }) {
  return (
    <div className="h-2 w-28 rounded-full bg-[var(--surface-2)] overflow-hidden inline-block align-middle">
      <div className="h-full rounded-full" style={{ width: `${max ? Math.max(3, (v / max) * 100) : 0}%`, background: tone }} />
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "red" | "amber" | "green" }) {
  const c = tone === "red" ? "text-[var(--red-700)]" : tone === "amber" ? "text-amber-700" : tone === "green" ? "text-[var(--green-700,#15803d)]" : "text-[var(--ink)]";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 shadow-card">
      <p className="text-xs font-semibold text-[var(--ink-soft)]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${c}`}>{value}</p>
      {sub && <p className="text-[11px] text-[var(--ink-faint)]">{sub}</p>}
    </div>
  );
}

export function BaoCaoNghenScreen({ user }: { user: AppUser }) {
  useUserNames();
  useBuoc();
  const { nav } = useRoute();
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const [den, setDen] = useState(homNay);
  const [tu, setTu] = useState(new Date(Date.parse(homNay) - 29 * 86_400_000).toISOString().slice(0, 10));
  const [data, setData] = useState<Res | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [mo, setMo] = useState<{ loai: "unit" | "tra" | "gui"; id: string } | null>(null);

  const load = (lamMoi = false) => {
    setBusy(true);
    setErr("");
    api
      .get<Res>(`/bao-cao-nghen?tu=${tu}&den=${den}${lamMoi ? "&lam_moi=1" : ""}`)
      .then(setData)
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setBusy(false));
  };
  useEffect(() => load(), [tu, den]); // eslint-disable-line react-hooks/exhaustive-deps

  const buocTen = (gd: string) => {
    const b = buocOf(gd);
    return b ? `${b.so} · ${b.ten}` : gd;
  };
  const moViec = (r: ChuaGt) => {
    if (r.gt_type === "phieu_sc_ct") setMo({ loai: "unit", id: r.gt_id });
    else if (r.gt_type === "phieu_tra") setMo({ loai: "tra", id: r.gt_id });
    else if (r.gt_type === "phieu_gui") setMo({ loai: "gui", id: r.gt_id });
    else nav("/don?tab=xu_ly");
  };

  const taiExcel = () => {
    if (!data) return;
    const sheets = [
      { name: "Theo bước", rows: [["Bước", "Chủ bước", "SLA (giờ)", "Đang dừng", "Quá SLA", "Chưa giải trình", "Dừng lâu nhất (giờ)"], ...data.buoc.map((b) => [buocTen(b.gd), CHU_BUOC_LABEL[buocOf(b.gd)?.chu ?? "he_thong"], b.sla, b.tong, b.qua_han, b.chua_gt, b.lau_nhat_gio])] },
      { name: "Theo bên", rows: [["Bên chịu trách nhiệm", "Số lần chậm", "TB quá (giờ)"], ...data.giai_trinh.theo_ben.map((r) => [benLabel(r.key), r.so, r.tb_qua_gio ?? ""])] },
      { name: "Lý do", rows: [["Lý do", "Bên", "Số lần"], ...data.giai_trinh.theo_ly_do.map((r) => [r.ly_do, benLabel(r.ben), r.so])] },
      { name: "KTV tồn", rows: [["KTV", "Đang giữ", "Quá SLA", "Chưa giải trình"], ...data.nguoi.ktv.map((r) => [displayName(r.email), r.tong, r.qua_han, r.chua_gt])] },
      { name: "Giám sát", rows: [["Giám sát", "Số KTV", "Việc KTV đang giữ", "Quá SLA", "Chưa giải trình"], ...data.nguoi.gs.map((r) => [r.email === "__chua_co_gs__" ? "Chưa có GS" : displayName(r.email), r.so_ktv ?? 0, r.tong, r.qua_han, r.chua_gt])] },
      { name: "NV sửa", rows: [["NV", "Đang sửa", "Quá SLA", "Chưa giải trình"], ...data.nguoi.nv.map((r) => [r.email === "__chua_gan__" ? "Chưa gán NV" : displayName(r.email), r.tong, r.qua_han, r.chua_gt])] },
      { name: "Quá hạn chưa GT", rows: [["Đối tượng", "Bước", "Số đơn", "Dừng từ", "Đã dừng (giờ)", "Quá SLA (giờ)", "KTV", "NV", "Case"], ...data.qua_han_chua_gt.map((r) => [r.gt_id, buocTen(r.gd), r.so_don, r.tu, r.dung_gio, r.qua_gio, r.ktv ? displayName(r.ktv) : "", r.nv ? displayName(r.nv) : "", r.case_id ?? ""])] },
      { name: "Xu hướng", rows: [["Tuần từ", "Lần chậm / giải trình", "Hoàn tất", "TB cả ca (giờ)"], ...data.xu_huong.map((w) => [w.tuan, w.giai_trinh, w.hoan_tat, w.tb_ca_gio ?? ""])] },
    ];
    downloadBlob(buildXlsx(sheets.map((sh) => ({ name: sh.name, rows: sh.rows.map((r) => (r as unknown[]).map((v) => String(v ?? ""))) }))), `diem-nghen_${data.tu}_${data.den}.xlsx`);
  };

  const maxBuoc = Math.max(1, ...(data?.buoc.map((b) => b.tong) ?? [1]));
  const maxBen = Math.max(1, ...(data?.giai_trinh.theo_ben.map((b) => b.so) ?? [1]));
  const maxTuan = Math.max(1, ...(data?.xu_huong.map((w) => Math.max(w.giai_trinh, w.hoan_tat)) ?? [1]));

  return (
    <div className="space-y-3">
      <Card
        title="🚦 Điểm nghẽn & trách nhiệm"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-[var(--ink-soft)]">Từ</label>
            <Input type="date" value={tu} max={den} onChange={(e) => e.target.value && setTu(e.target.value)} className="!w-auto" />
            <label className="text-xs text-[var(--ink-soft)]">đến</label>
            <Input type="date" value={den} min={tu} max={homNay} onChange={(e) => e.target.value && setDen(e.target.value)} className="!w-auto" />
            <Btn size="sm" onClick={() => load(true)} disabled={busy}>
              🔄 Tính lại
            </Btn>
            <Btn size="sm" onClick={taiExcel} disabled={!data}>
              ⬇ Tải Excel
            </Btn>
          </div>
        }
      >
        <p className="text-xs text-[var(--ink-soft)]">
          Ảnh chụp <b>hiện tại</b> (đang tồn, quá SLA, người giữ việc) + <b>trong kỳ</b> (lý do chậm / giải trình, hoàn tất). Phạm vi theo quyền xem của bạn
          {user.la_qtri ? " (toàn hệ thống)" : user.mien && user.mien !== "ALL" ? ` (miền ${user.mien} + chưa khai báo)` : ""}.
          {data && ` Số liệu tính lúc ${data.tinh_luc.slice(11, 16)} ${ddmm(data.tinh_luc)} — lưu 30 phút.`}
        </p>
      </Card>

      {err && <p className="text-sm text-[var(--red-700)]">{err}</p>}
      {!data ? (
        busy && <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
            <Kpi label="Đang dừng ở các bước" value={data.kpi.dang_dung} />
            <Kpi label="Quá SLA bước" value={data.kpi.qua_sla} tone={data.kpi.qua_sla ? "red" : undefined} sub={data.kpi.tam_dung ? `+ ${data.kpi.tam_dung} tạm dừng chờ hàng` : "không tính đơn đang chờ hàng"} />
            <Kpi label="Trong SLA" value={`${data.kpi.trong_sla_pct}%`} tone={data.kpi.trong_sla_pct >= 80 ? "green" : "amber"} />
            <Kpi label="Quá hạn chưa giải trình" value={data.kpi.chua_giai_trinh} tone={data.kpi.chua_giai_trinh ? "red" : undefined} />
            <Kpi label="Lần chậm / giải trình (kỳ)" value={data.kpi.giai_trinh_ky} />
            <Kpi label="Đơn hoàn tất (kỳ)" value={data.kpi.hoan_tat_ky} sub="đã trả KTV / kết thúc" />
            <Kpi label="TB cả ca" value={data.kpi.tb_ca_gio == null ? "—" : fmtGio(data.kpi.tb_ca_gio)} sub="tạo đơn → kết thúc, giờ SLA" />
          </div>

          <Card title="① Kẹt ở bước nào? (hiện tại)">
            <MiniTable
              rows={data.buoc}
              rowKey={(r) => r.gd}
              empty="Không có đơn nào đang dừng."
              onRow={(r) => nav(`/don?tab=tat_ca&trang_thai=${encodeURIComponent(r.gd)}`)}
              cols={[
                { key: "b", header: "Bước", render: (r) => buocTen(r.gd), text: (r) => buocTen(r.gd), sort: (r) => buocOf(r.gd)?.so ?? r.gd },
                { key: "chu", header: "Chủ bước", render: (r) => CHU_BUOC_LABEL[buocOf(r.gd)?.chu ?? "he_thong"], text: (r) => CHU_BUOC_LABEL[buocOf(r.gd)?.chu ?? "he_thong"] },
                { key: "sla", header: "SLA", right: true, render: (r) => `${r.sla}h`, sort: (r) => r.sla },
                { key: "t", header: "Đang dừng", right: true, render: (r) => (<span className="inline-flex items-center gap-2"><Bar v={r.tong} max={maxBuoc} />{r.tong}</span>), sort: (r) => r.tong },
                { key: "q", header: "Quá SLA", right: true, render: (r) => <span className={r.qua_han ? "font-bold text-[var(--red-700)]" : "text-[var(--ink-faint)]"}>{r.qua_han}{r.tong ? ` (${Math.round((r.qua_han / r.tong) * 100)}%)` : ""}</span>, sort: (r) => r.qua_han },
                { key: "c", header: "Chưa giải trình", right: true, render: (r) => <span className={r.chua_gt ? "font-semibold text-[var(--red-700)]" : "text-[var(--ink-faint)]"}>{r.chua_gt}</span>, sort: (r) => r.chua_gt },
                { key: "l", header: "Dừng lâu nhất", right: true, render: (r) => fmtGio(r.lau_nhat_gio), sort: (r) => r.lau_nhat_gio },
              ]}
            />
          </Card>

          <div className="grid lg:grid-cols-2 gap-3">
            <Card title="② Chậm do bên nào? (trong kỳ)">
              <MiniTable
                rows={data.giai_trinh.theo_ben}
                rowKey={(r) => r.key}
                tim={false}
                empty="Trong kỳ chưa có lý do chậm / giải trình nào."
                cols={[
                  { key: "b", header: "Bên chịu trách nhiệm", render: (r) => benLabel(r.key), text: (r) => benLabel(r.key) },
                  { key: "s", header: "Số lần", right: true, render: (r) => (<span className="inline-flex items-center gap-2"><Bar v={r.so} max={maxBen} tone="var(--red-500)" />{r.so}</span>), sort: (r) => r.so },
                  { key: "tb", header: "TB quá SLA", right: true, render: (r) => (r.tb_qua_gio == null ? "—" : fmtGio(r.tb_qua_gio)), sort: (r) => r.tb_qua_gio ?? -1 },
                ]}
              />
              {data.giai_trinh.theo_vai.length > 0 && (
                <p className="mt-2 text-xs text-[var(--ink-soft)]">Người giải trình: {data.giai_trinh.theo_vai.map((v) => `${VAI_GT_LABEL[v.key] || v.key} ${v.so}`).join(" · ")}</p>
              )}
            </Card>
            <Card title="Lý do chậm hay gặp (trong kỳ)">
              <MiniTable
                rows={data.giai_trinh.theo_ly_do}
                rowKey={(r) => r.ly_do}
                empty="Chưa có."
                cols={[
                  { key: "l", header: "Lý do", render: (r) => r.ly_do, text: (r) => r.ly_do, sort: (r) => r.ly_do },
                  { key: "b", header: "Bên", render: (r) => benLabel(r.ben), text: (r) => benLabel(r.ben), sort: (r) => benLabel(r.ben) },
                  { key: "s", header: "Số lần", right: true, render: (r) => r.so, sort: (r) => r.so },
                ]}
              />
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <Card title="③ KTV đang giữ việc (bước 1 / 5B / 11)">
              <MiniTable
                rows={data.nguoi.ktv}
                rowKey={(r) => r.email}
                empty="Không có KTV nào đang giữ việc."
                onRow={(r) => nav(`/don?tab=tat_ca&ktv=${encodeURIComponent(r.email)}&buoc_tt=qua_han`)}
                cols={[
                  { key: "n", header: "KTV", render: (r) => displayName(r.email), text: (r) => `${displayName(r.email)} ${r.email}`, sort: (r) => displayName(r.email) },
                  { key: "t", header: "Giữ", right: true, render: (r) => r.tong, sort: (r) => r.tong },
                  { key: "q", header: "Quá SLA", right: true, render: (r) => <span className={r.qua_han ? "font-bold text-[var(--red-700)]" : ""}>{r.qua_han}</span>, sort: (r) => r.qua_han },
                  { key: "c", header: "Chưa GT", right: true, render: (r) => r.chua_gt, sort: (r) => r.chua_gt },
                ]}
              />
            </Card>
            <Card title="Giám sát (TNGS) — việc KTV khu vực">
              <MiniTable
                rows={data.nguoi.gs}
                rowKey={(r) => r.email}
                empty="Chưa có."
                cols={[
                  { key: "n", header: "Giám sát", render: (r) => (r.email === "__chua_co_gs__" ? <i className="text-[var(--ink-soft)]">Khu vực chưa có GS</i> : displayName(r.email)), text: (r) => displayName(r.email), sort: (r) => displayName(r.email) },
                  { key: "k", header: "KTV", right: true, render: (r) => r.so_ktv ?? 0, sort: (r) => r.so_ktv ?? 0 },
                  { key: "q", header: "Quá SLA", right: true, render: (r) => <span className={r.qua_han ? "font-bold text-[var(--red-700)]" : ""}>{r.qua_han}</span>, sort: (r) => r.qua_han },
                  { key: "c", header: "Chưa GT", right: true, render: (r) => r.chua_gt, sort: (r) => r.chua_gt },
                ]}
              />
            </Card>
            <Card title="NV sửa chữa (bước 6)">
              <MiniTable
                rows={data.nguoi.nv}
                rowKey={(r) => r.email}
                empty="Không có đơn đang sửa."
                cols={[
                  { key: "n", header: "NV", render: (r) => (r.email === "__chua_gan__" ? <i className="text-[var(--ink-soft)]">Chưa gán NV</i> : displayName(r.email)), text: (r) => displayName(r.email), sort: (r) => displayName(r.email) },
                  { key: "t", header: "Đang sửa", right: true, render: (r) => r.tong, sort: (r) => r.tong },
                  { key: "q", header: "Quá SLA", right: true, render: (r) => <span className={r.qua_han ? "font-bold text-[var(--red-700)]" : ""}>{r.qua_han}</span>, sort: (r) => r.qua_han },
                  { key: "c", header: "Chưa GT", right: true, render: (r) => r.chua_gt, sort: (r) => r.chua_gt },
                ]}
              />
            </Card>
          </div>

          <Card title={`④ Quá hạn chưa ai giải trình — lâu nhất trước (${data.qua_han_chua_gt.length}${data.qua_han_chua_gt.length >= 60 ? "+" : ""})`}>
            <MiniTable
              rows={data.qua_han_chua_gt}
              rowKey={(r) => `${r.gt_type}:${r.gt_id}:${r.gd}`}
              empty="Không có việc quá hạn nào chưa giải trình. 👍"
              onRow={moViec}
              cols={[
                { key: "id", header: "Đối tượng", render: (r) => <span className="font-mono font-semibold text-[var(--link)]">{r.gt_id}</span>, text: (r) => r.gt_id, sort: (r) => r.gt_id },
                { key: "b", header: "Bước", render: (r) => buocTen(r.gd), text: (r) => buocTen(r.gd), sort: (r) => buocOf(r.gd)?.so ?? r.gd },
                { key: "n", header: "Số đơn", right: true, render: (r) => r.so_don, sort: (r) => r.so_don },
                { key: "d", header: "Đã dừng", right: true, render: (r) => fmtGio(r.dung_gio), sort: (r) => r.dung_gio },
                { key: "q", header: "Quá SLA", right: true, render: (r) => <span className="font-bold text-[var(--red-700)]">{fmtGio(r.qua_gio)}</span>, sort: (r) => r.qua_gio },
                { key: "k", header: "KTV", render: (r) => (r.ktv ? displayName(r.ktv) : "—"), text: (r) => (r.ktv ? displayName(r.ktv) : ""), sort: (r) => (r.ktv ? displayName(r.ktv) : "") },
                { key: "v", header: "NV", render: (r) => (r.nv ? displayName(r.nv) : "—"), text: (r) => (r.nv ? displayName(r.nv) : "") },
                { key: "c", header: "Case", render: (r) => r.case_id ?? "—", text: (r) => r.case_id ?? "" },
              ]}
            />
          </Card>

          <Card title="⑤ Xu hướng 8 tuần">
            <MiniTable
              rows={data.xu_huong}
              rowKey={(r) => r.tuan}
              tim={false}
              empty="Chưa có dữ liệu."
              cols={[
                { key: "t", header: "Tuần từ (thứ 2)", render: (r) => ddmm(r.tuan), sort: (r) => r.tuan },
                { key: "g", header: "Lần chậm / giải trình", right: true, render: (r) => (<span className="inline-flex items-center gap-2"><Bar v={r.giai_trinh} max={maxTuan} tone="var(--red-500)" />{r.giai_trinh}</span>), sort: (r) => r.giai_trinh },
                { key: "b", header: "Bên nhiều nhất", render: (r) => { const top = Object.entries(r.theo_ben).sort((a, b) => b[1] - a[1])[0]; return top ? `${benLabel(top[0])} (${top[1]})` : "—"; } },
                { key: "h", header: "Hoàn tất", right: true, render: (r) => (<span className="inline-flex items-center gap-2"><Bar v={r.hoan_tat} max={maxTuan} />{r.hoan_tat}</span>), sort: (r) => r.hoan_tat },
                { key: "c", header: "TB cả ca", right: true, render: (r) => (r.tb_ca_gio == null ? "—" : fmtGio(r.tb_ca_gio)), sort: (r) => r.tb_ca_gio ?? -1 },
              ]}
            />
            <p className="mt-2 text-[11px] text-[var(--ink-faint)]">Trước 15/11/2026 chỉ có lý do chậm chọn ở cổng SLA (đọc từ nhật ký); từ 15/11 có thêm giải trình KTV / Giám sát theo bước. Đơn nhập từ AppSheet không tính vào TB cả ca.</p>
          </Card>
        </>
      )}

      {mo?.loai === "unit" && <UnitDetailModal unitId={mo.id} user={user} onClose={() => setMo(null)} onChanged={() => undefined} />}
      {mo?.loai === "tra" && <PhieuTraDetailModal traId={mo.id} user={user} onClose={() => setMo(null)} onChanged={() => undefined} />}
      {mo?.loai === "gui" && <PhieuGuiDetailModal guiId={mo.id} onClose={() => setMo(null)} onChanged={() => undefined} />}
    </div>
  );
}
