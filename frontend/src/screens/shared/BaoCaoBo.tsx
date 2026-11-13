import { Fragment, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { Btn, Card, EmptyState, Select, Spinner } from "../../ui/primitives";

// Bao cao ket qua lam viec tung vai tro BO theo thang (13/11/2026). Du lieu: GET /api/bao-cao-bo (lib/baoCaoBo.ts).

interface ThongKe {
  so_ca: number;
  tb_gio: number | null;
  nhanh_gio: number | null;
  nhanh_id: string | null;
  lau_gio: number | null;
  lau_id: string | null;
  trong_sla: number;
  ty_le_sla: number | null;
  ca_appsheet: number;
}
interface CongViec extends ThongKe {
  task: string;
  label: string;
  don_vi: string;
}
interface DongNguoi extends ThongKe {
  nguoi: string;
  cong_viec: CongViec[];
}
interface Nhom {
  vai_tro: string;
  label: string;
  tong: ThongKe;
  nguoi: DongNguoi[];
}

// Gio SLA -> "45 phút" / "5,2 giờ" / "2 ngày 3 giờ".
export function fmtGio(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) {
    const m = Math.round(h * 60);
    return m < 1 ? "< 1 phút" : `${m} phút`;
  }
  if (h < 24) return `${(Math.round(h * 10) / 10).toLocaleString("vi-VN")} giờ`;
  const tong = Math.round(h);
  const d = Math.floor(tong / 24);
  const r = tong - d * 24;
  return r ? `${d} ngày ${r} giờ` : `${d} ngày`;
}

function thangOptions(): string[] {
  const out: string[] = [];
  const now = new Date(Date.now() + 7 * 3600_000);
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1;
  for (let i = 0; i < 12; i++) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
}

const ICON: Record<string, string> = {
  kho: "🏬",
  admin: "🛡",
  nv: "🔧",
  ketoan: "💳",
};

function SlaCell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-[var(--ink-faint)]">—</span>;
  const tone =
    v >= 90
      ? "text-[var(--green-700)]"
      : v >= 70
        ? "text-[var(--amber-700)]"
        : "text-[var(--red-600)]";
  return (
    <span className={`font-semibold ${tone}`}>
      {v.toLocaleString("vi-VN")}%
    </span>
  );
}

function Cells({ t, coAs }: { t: ThongKe; coAs: boolean }) {
  return (
    <>
      <td className="text-right font-semibold">
        {t.so_ca.toLocaleString("vi-VN")}
      </td>
      <td className="text-right">{fmtGio(t.tb_gio)}</td>
      <td className="text-right" title={t.nhanh_id ?? ""}>
        {fmtGio(t.nhanh_gio)}
        {t.nhanh_id && (
          <div className="text-[11px] font-mono text-[var(--ink-faint)]">
            {t.nhanh_id}
          </div>
        )}
      </td>
      <td className="text-right" title={t.lau_id ?? ""}>
        {fmtGio(t.lau_gio)}
        {t.lau_id && (
          <div className="text-[11px] font-mono text-[var(--ink-faint)]">
            {t.lau_id}
          </div>
        )}
      </td>
      <td className="text-right">
        <SlaCell v={t.ty_le_sla} />
        {t.so_ca > 0 && (
          <div className="text-[11px] text-[var(--ink-faint)]">
            {t.trong_sla}/{t.so_ca}
          </div>
        )}
      </td>
      {coAs && (
        <td className="text-right text-[var(--ink-soft)]">
          {t.ca_appsheet ? t.ca_appsheet.toLocaleString("vi-VN") : "—"}
        </td>
      )}
    </>
  );
}

export function BaoCaoBoScreen() {
  useUserNames();
  const opts = useMemo(thangOptions, []);
  const [thang, setThang] = useState(opts[0]);
  const [data, setData] = useState<Nhom[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mo, setMo] = useState<Set<string>>(new Set());

  useEffect(() => {
    let huy = false;
    setData(null);
    setErr(null);
    api
      .get<{ nhom: Nhom[] }>(`/bao-cao-bo?thang=${thang}`)
      .then((r) => !huy && setData(r.nhom))
      .catch((e) => !huy && setErr(errorMessage(e)));
    return () => {
      huy = true;
    };
  }, [thang]);

  const toggle = (k: string) =>
    setMo((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const taiXlsx = () => {
    if (!data) return;
    const head = [
      "Vai trò",
      "Nhân viên",
      "Công việc",
      "Số ca",
      "TB xử lý (giờ)",
      "Nhanh nhất (giờ)",
      "Ca nhanh nhất",
      "Lâu nhất (giờ)",
      "Ca lâu nhất",
      "Trong SLA",
      "Tỷ lệ SLA (%)",
      "Ca từ AppSheet (không tính giờ)",
    ];
    const row = (vt: string, nv: string, cv: string, t: ThongKe) => [
      vt,
      nv,
      cv,
      String(t.so_ca),
      t.tb_gio == null ? "" : String(t.tb_gio),
      t.nhanh_gio == null ? "" : String(t.nhanh_gio),
      t.nhanh_id ?? "",
      t.lau_gio == null ? "" : String(t.lau_gio),
      t.lau_id ?? "",
      String(t.trong_sla),
      t.ty_le_sla == null ? "" : String(t.ty_le_sla),
      String(t.ca_appsheet),
    ];
    const rows: string[][] = [head];
    for (const g of data) {
      rows.push(row(g.label, "TỔNG", "", g.tong));
      for (const p of g.nguoi) {
        rows.push(row(g.label, displayName(p.nguoi), "Tất cả", p));
        for (const c of p.cong_viec)
          rows.push(row(g.label, displayName(p.nguoi), c.label, c));
      }
    }
    downloadBlob(
      buildXlsx([
        {
          name: `BO ${thang}`,
          rows,
          widths: [16, 26, 30, 8, 12, 12, 16, 12, 16, 10, 12, 14],
        },
      ]),
      `Bao-cao-BO-${thang}.xlsx`,
    );
  };

  return (
    <div className="space-y-3">
      <Card
        title="📊 Kết quả làm việc BO theo tháng"
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={thang}
              onChange={(e) => setThang(e.target.value)}
              className="!w-auto"
            >
              {opts.map((o) => (
                <option key={o} value={o}>
                  Tháng {o.slice(5)}/{o.slice(0, 4)}
                </option>
              ))}
            </Select>
            <Btn size="sm" onClick={taiXlsx} disabled={!data}>
              ⬇ Tải Excel
            </Btn>
          </div>
        }
      >
        <p className="text-xs text-[var(--ink-soft)]">
          1 ca = 1 việc 1 người làm xong trong tháng (theo lúc bấm xong). Thời
          gian xử lý tính từ lúc việc sang tay vai trò đó tới lúc làm xong, theo
          giờ SLA (không tính Chủ nhật). Trong SLA = xong trong 24 giờ. Ca bắt
          đầu chờ từ dữ liệu nhập AppSheet (ngày gốc) chỉ được đếm ở cột "Từ
          AppSheet", không tính vào thời gian và SLA. Thao tác hệ thống tự làm
          (VD tự xác nhận số lượng khi Admin nhận hộ) không tính. Bấm tên nhân
          viên để xem theo từng loại việc.
        </p>
      </Card>

      {err && <EmptyState text={`Không tải được báo cáo: ${err}`} />}
      {!data && !err && <Spinner />}
      {data?.map((g) => {
        const coAs = g.tong.ca_appsheet > 0;
        return (
          <Card
            key={g.vai_tro}
            title={
              <span>
                {ICON[g.vai_tro]} {g.label}{" "}
                <span className="text-xs font-normal text-[var(--ink-soft)]">
                  · {g.nguoi.length} người ·{" "}
                  {g.tong.so_ca.toLocaleString("vi-VN")} ca · TB{" "}
                  {fmtGio(g.tong.tb_gio)} · SLA{" "}
                  {g.tong.ty_le_sla == null
                    ? "—"
                    : `${g.tong.ty_le_sla.toLocaleString("vi-VN")}%`}
                </span>
              </span>
            }
          >
            {g.nguoi.length === 0 ? (
              <EmptyState text="Chưa có ca nào trong tháng." />
            ) : (
              <div className="overflow-x-auto">
                <table className="tbl w-full whitespace-nowrap">
                  <thead>
                    <tr>
                      <th className="text-left">Nhân viên</th>
                      <th className="text-right">Số ca</th>
                      <th className="text-right">TB xử lý</th>
                      <th className="text-right">Nhanh nhất</th>
                      <th className="text-right">Lâu nhất</th>
                      <th className="text-right">Trong SLA</th>
                      {coAs && (
                        <th
                          className="text-right"
                          title="Ca bắt đầu chờ từ dữ liệu nhập AppSheet (ngày gốc) — chỉ đếm, không tính thời gian / SLA"
                        >
                          Từ AppSheet
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {g.nguoi.map((p) => {
                      const k = `${g.vai_tro}|${p.nguoi}`;
                      const open = mo.has(k);
                      return (
                        <Fragment key={k}>
                          <tr
                            className="cursor-pointer hover:bg-[var(--surface-2)]"
                            onClick={() => toggle(k)}
                          >
                            <td className="font-semibold">
                              <span className="mr-1 text-[var(--ink-faint)]">
                                {open ? "▾" : "▸"}
                              </span>
                              <span title={p.nguoi}>
                                {displayName(p.nguoi)}
                              </span>
                            </td>
                            <Cells t={p} coAs={coAs} />
                          </tr>
                          {open &&
                            p.cong_viec.map((c) => (
                              <tr
                                key={c.task}
                                className="bg-[var(--surface-2)] text-[13px]"
                              >
                                <td className="!pl-8 text-[var(--ink-soft)]">
                                  {c.label}{" "}
                                  <span className="text-[11px]">
                                    ({c.don_vi})
                                  </span>
                                </td>
                                <Cells t={c} coAs={coAs} />
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                    <tr className="border-t-2 border-[var(--line)] font-semibold">
                      <td>Tổng {g.label}</td>
                      <Cells t={g.tong} coAs={coAs} />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
