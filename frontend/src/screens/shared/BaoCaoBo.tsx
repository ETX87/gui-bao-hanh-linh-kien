import { Fragment, useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";
import { Btn, Card, EmptyState, Select, Spinner } from "../../ui/primitives";

// Bao cao ket qua lam viec tung vai tro BO theo thang (13/11/2026). Du lieu: GET /api/bao-cao-bo (lib/baoCaoBo.ts).
// 13/11/2026 ("format chung cho cả table báo cáo. cho phép gộp lại theo phòng ban, tách ra theo nhân viên"):
// 1 bang chung, 2 che do: Theo phong ban (phong ban -> nhan vien -> loai viec) / Theo nhan vien (moi nguoi 1
// dong, gop moi phong ban nguoi do lam -> xo ra phong ban · loai viec).

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

// Gop thong ke nhieu nhom (1 nguoi o nhieu phong ban, hoac tong toan bo): TB co trong so theo so ca.
function gop(list: ThongKe[]): ThongKe {
  const co = list.filter((t) => t.so_ca > 0);
  const so_ca = co.reduce((a, t) => a + t.so_ca, 0);
  const trong_sla = co.reduce((a, t) => a + t.trong_sla, 0);
  const ca_appsheet = list.reduce((a, t) => a + t.ca_appsheet, 0);
  if (!so_ca)
    return {
      so_ca: 0,
      tb_gio: null,
      nhanh_gio: null,
      nhanh_id: null,
      lau_gio: null,
      lau_id: null,
      trong_sla: 0,
      ty_le_sla: null,
      ca_appsheet,
    };
  const min = co.reduce((a, t) =>
    (t.nhanh_gio ?? 1e9) < (a.nhanh_gio ?? 1e9) ? t : a,
  );
  const max = co.reduce((a, t) =>
    (t.lau_gio ?? -1) > (a.lau_gio ?? -1) ? t : a,
  );
  return {
    so_ca,
    tb_gio:
      Math.round(
        (co.reduce((a, t) => a + (t.tb_gio ?? 0) * t.so_ca, 0) / so_ca) * 10,
      ) / 10,
    nhanh_gio: min.nhanh_gio,
    nhanh_id: min.nhanh_id,
    lau_gio: max.lau_gio,
    lau_id: max.lau_id,
    trong_sla,
    ty_le_sla: Math.round((trong_sla / so_ca) * 1000) / 10,
    ca_appsheet,
  };
}

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
  const sub = (s: string | null) =>
    s && (
      <div className="font-mono text-[11px] text-[var(--ink-faint)]">{s}</div>
    );
  return (
    <>
      <td className="text-right font-semibold">
        {t.so_ca.toLocaleString("vi-VN")}
      </td>
      <td className="text-right">{fmtGio(t.tb_gio)}</td>
      <td className="text-right" title={t.nhanh_id ?? ""}>
        {fmtGio(t.nhanh_gio)}
        {sub(t.nhanh_id)}
      </td>
      <td className="text-right" title={t.lau_id ?? ""}>
        {fmtGio(t.lau_gio)}
        {sub(t.lau_id)}
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

type CheDo = "phong_ban" | "nhan_vien";

interface DongNv {
  nguoi: string;
  phong_ban: string[];
  tong: ThongKe;
  con: { key: string; label: string; t: ThongKe }[];
}

export function BaoCaoBoScreen() {
  useUserNames();
  const opts = useMemo(thangOptions, []);
  const [thang, setThang] = useState(opts[0]);
  const [data, setData] = useState<Nhom[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tinhLuc, setTinhLuc] = useState<string | null>(null);
  const [lan, setLan] = useState(0); // >0: bam "Tinh lai" -> ?lam_moi=1
  const [mo, setMo] = useState<Set<string>>(new Set());
  const [cheDo, setCheDo] = useState<CheDo>(() =>
    localStorage.getItem("bc_bo_che_do") === "nhan_vien"
      ? "nhan_vien"
      : "phong_ban",
  );

  useEffect(() => {
    let huy = false;
    setData(null);
    setErr(null);
    api
      .get<{ nhom: Nhom[]; tinh_luc?: string }>(
        `/bao-cao-bo?thang=${thang}${lan ? "&lam_moi=1" : ""}`,
      )
      .then((r) => {
        if (huy) return;
        setData(r.nhom);
        setTinhLuc(r.tinh_luc ?? null);
      })
      .catch((e) => !huy && setErr(errorMessage(e)));
    return () => {
      huy = true;
    };
  }, [thang, lan]);

  const doiCheDo = (c: CheDo) => {
    setCheDo(c);
    setMo(new Set());
    localStorage.setItem("bc_bo_che_do", c);
  };
  const toggle = (k: string) =>
    setMo((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  // Theo nhan vien: moi phong ban cua cung 1 nguoi gop thanh 1 dong.
  const nhanVien = useMemo<DongNv[]>(() => {
    if (!data) return [];
    const m = new Map<string, DongNv>();
    for (const g of data)
      for (const p of g.nguoi) {
        const d = m.get(p.nguoi) ?? {
          nguoi: p.nguoi,
          phong_ban: [],
          tong: p,
          con: [],
        };
        d.phong_ban.push(g.label);
        for (const c of p.cong_viec)
          d.con.push({
            key: `${g.vai_tro}|${c.task}`,
            label: `${g.label} · ${c.label} (${c.don_vi})`,
            t: c,
          });
        m.set(p.nguoi, d);
      }
    for (const d of m.values())
      d.tong = gop(
        data.flatMap((g) => g.nguoi.filter((p) => p.nguoi === d.nguoi)),
      );
    return [...m.values()].sort(
      (a, b) =>
        b.tong.so_ca - a.tong.so_ca || b.tong.ca_appsheet - a.tong.ca_appsheet,
    );
  }, [data]);
  const tongAll = useMemo(
    () => (data ? gop(data.map((g) => g.tong)) : null),
    [data],
  );
  const coAs = !!tongAll && tongAll.ca_appsheet > 0;
  const tatCaKey = useMemo(
    () =>
      cheDo === "phong_ban"
        ? (data ?? []).flatMap((g) => [
            g.vai_tro,
            ...g.nguoi.map((p) => `${g.vai_tro}|${p.nguoi}`),
          ])
        : nhanVien.map((d) => d.nguoi),
    [cheDo, data, nhanVien],
  );

  const taiXlsx = () => {
    if (!data) return;
    const cols = [
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
    const so = (t: ThongKe) => [
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
    const pb: string[][] = [["Phòng ban", "Nhân viên", "Công việc", ...cols]];
    for (const g of data) {
      pb.push([g.label, "TỔNG", "", ...so(g.tong)]);
      for (const p of g.nguoi) {
        pb.push([g.label, displayName(p.nguoi), "Tất cả", ...so(p)]);
        for (const c of p.cong_viec)
          pb.push([g.label, displayName(p.nguoi), c.label, ...so(c)]);
      }
    }
    if (tongAll) pb.push(["TỔNG CỘNG", "", "", ...so(tongAll)]);
    const nv: string[][] = [["Nhân viên", "Phòng ban", "Công việc", ...cols]];
    for (const d of nhanVien) {
      nv.push([
        displayName(d.nguoi),
        d.phong_ban.join(", "),
        "Tất cả",
        ...so(d.tong),
      ]);
      for (const c of d.con)
        nv.push([
          displayName(d.nguoi),
          d.phong_ban.join(", "),
          c.label,
          ...so(c.t),
        ]);
    }
    const w = [22, 26, 38, 8, 12, 12, 16, 12, 16, 10, 12, 14];
    const sheets = [
      { name: "Theo phong ban", rows: pb, widths: w },
      { name: "Theo nhan vien", rows: nv, widths: w },
    ];
    downloadBlob(
      buildXlsx(cheDo === "phong_ban" ? sheets : [sheets[1], sheets[0]]),
      `Bao-cao-BO-${thang}.xlsx`,
    );
  };

  const mui = (open: boolean) => (
    <span className="mr-1 inline-block w-3 text-[var(--ink-faint)]">
      {open ? "▾" : "▸"}
    </span>
  );

  return (
    <Card
      title="📊 Kết quả làm việc BO theo tháng"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--line)] p-0.5 text-sm">
            {(
              [
                ["phong_ban", "🏢 Gộp theo phòng ban"],
                ["nhan_vien", "👤 Tách theo nhân viên"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => doiCheDo(k)}
                className={`rounded-md px-2.5 py-1 font-semibold ${cheDo === k ? "bg-[var(--accent)] text-white" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <Select
            value={thang}
            onChange={(e) => {
              setLan(0);
              setThang(e.target.value);
            }}
            className="!w-auto"
          >
            {opts.map((o) => (
              <option key={o} value={o}>
                Tháng {o.slice(5)}/{o.slice(0, 4)}
              </option>
            ))}
          </Select>
          <Btn
            size="sm"
            onClick={() => setMo(mo.size ? new Set() : new Set(tatCaKey))}
            disabled={!data}
          >
            {mo.size ? "▸ Thu gọn" : "▾ Mở hết"}
          </Btn>
          <Btn
            size="sm"
            onClick={() => setLan((x) => x + 1)}
            disabled={!data}
            title="Tính lại ngay từ dữ liệu mới nhất (bình thường báo cáo tự tính 1 lần mỗi ngày)"
          >
            🔄 Tính lại
          </Btn>
          <Btn size="sm" onClick={taiXlsx} disabled={!data}>
            ⬇ Tải Excel
          </Btn>
        </div>
      }
    >
      <p className="mb-2 text-xs text-[var(--ink-soft)]">
        1 ca = 1 việc 1 người làm xong trong tháng (theo lúc bấm xong; việc sửa
        chữa tính cho NV được giao). Thời gian xử lý tính từ lúc việc sang tay
        vai trò đó tới lúc làm xong, theo giờ SLA (không tính Chủ nhật). Trong
        SLA = xong trong 24 giờ. Ca bắt đầu chờ từ dữ liệu nhập AppSheet chỉ đếm
        ở cột "Từ AppSheet", không tính thời gian / SLA. Bấm dòng để mở / gộp
        chi tiết.
        {tinhLuc && (
          <span className="ml-1 font-semibold text-[var(--ink)]">
            Số liệu tính lúc {tinhLuc.slice(11, 16)} {tinhLuc.slice(8, 10)}/
            {tinhLuc.slice(5, 7)} — tự tính 1 lần mỗi ngày, bấm "🔄 Tính lại" để
            cập nhật ngay.
          </span>
        )}
      </p>
      {err && <EmptyState text={`Không tải được báo cáo: ${err}`} />}
      {!data && !err && <Spinner />}
      {data && tongAll && (
        <div className="overflow-x-auto">
          <table className="tbl w-full whitespace-nowrap">
            <thead>
              <tr>
                <th className="text-left">
                  {cheDo === "phong_ban"
                    ? "Phòng ban / Nhân viên / Công việc"
                    : "Nhân viên / Công việc"}
                </th>
                {cheDo === "nhan_vien" && (
                  <th className="text-left">Phòng ban</th>
                )}
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
              {cheDo === "phong_ban" &&
                data.map((g) => {
                  const openG = mo.has(g.vai_tro);
                  return (
                    <Fragment key={g.vai_tro}>
                      <tr
                        className="cursor-pointer bg-[var(--brand-50)] font-semibold hover:bg-[var(--surface-2)]"
                        onClick={() => g.nguoi.length && toggle(g.vai_tro)}
                      >
                        <td>
                          {g.nguoi.length ? (
                            mui(openG)
                          ) : (
                            <span className="mr-1 inline-block w-3" />
                          )}
                          {ICON[g.vai_tro]} {g.label}{" "}
                          <span className="text-xs font-normal text-[var(--ink-soft)]">
                            · {g.nguoi.length} người
                          </span>
                        </td>
                        <Cells t={g.tong} coAs={coAs} />
                      </tr>
                      {openG &&
                        g.nguoi.map((p) => {
                          const k = `${g.vai_tro}|${p.nguoi}`;
                          const open = mo.has(k);
                          return (
                            <Fragment key={k}>
                              <tr
                                className="cursor-pointer hover:bg-[var(--surface-2)]"
                                onClick={() => toggle(k)}
                              >
                                <td className="!pl-7">
                                  {mui(open)}
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
                                    <td className="!pl-14 text-[var(--ink-soft)]">
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
                    </Fragment>
                  );
                })}
              {cheDo === "nhan_vien" &&
                nhanVien.map((d) => {
                  const open = mo.has(d.nguoi);
                  return (
                    <Fragment key={d.nguoi}>
                      <tr
                        className="cursor-pointer hover:bg-[var(--surface-2)]"
                        onClick={() => toggle(d.nguoi)}
                      >
                        <td className="font-semibold">
                          {mui(open)}
                          <span title={d.nguoi}>{displayName(d.nguoi)}</span>
                        </td>
                        <td className="text-[var(--ink-soft)]">
                          {d.phong_ban.join(", ")}
                        </td>
                        <Cells t={d.tong} coAs={coAs} />
                      </tr>
                      {open &&
                        d.con.map((c) => (
                          <tr
                            key={c.key}
                            className="bg-[var(--surface-2)] text-[13px]"
                          >
                            <td
                              className="!pl-8 text-[var(--ink-soft)]"
                              colSpan={2}
                            >
                              {c.label}
                            </td>
                            <Cells t={c.t} coAs={coAs} />
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              <tr className="border-t-2 border-[var(--line)] font-bold">
                <td colSpan={cheDo === "nhan_vien" ? 2 : 1}>Tổng cộng</td>
                <Cells t={tongAll} coAs={coAs} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
