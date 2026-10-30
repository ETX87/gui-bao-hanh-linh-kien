import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { Badge, Btn, Card } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { fmtDate } from "../../lib/format";

// Canh bao don ton theo tung vai tro + thoi gian xu ly trung binh tung giai doan (12/10/2026). Du lieu
// tu GET /api/canh-bao (backend/src/lib/canhBao.ts) - chi cac giai doan thuoc vai tro nguoi xem.
// Muc: xanh = trong 24h, vang = co don qua han 24h, do = co don qua 72h ("nguy hiem") - cung 3 nguong
// cua badge SLA, gio SLA bo Chu nhat.

export interface CanhBaoRow {
  key: string;
  label: string;
  vai_tro: string;
  vai_tro_label: string;
  don_vi: string;
  pham_vi: string;
  so_luong: number;
  qua_han: number;
  nguy_hiem: number;
  lau_nhat_gio: number;
  muc: "ok" | "qua_han" | "nguy_hiem";
  hash: string | null;
  tb_gio: number | null;
  tb_mau: number;
}

export function fmtGio(h: number | null | undefined): string {
  if (h == null) return "—";
  if (h < 1) return "< 1 giờ";
  if (h < 48) return `${Math.round(h)} giờ`;
  return `${(h / 24).toFixed(1).replace(".", ",")} ngày`;
}

const MUC_DOT: Record<CanhBaoRow["muc"], string> = {
  ok: "bg-[var(--green-500,#22c55e)]",
  qua_han: "bg-[var(--amber-500,#f59e0b)]",
  nguy_hiem: "bg-[var(--red-600)]",
};

export function CanhBaoTonDon({ canTinhLai }: { canTinhLai?: boolean }) {
  const { nav } = useRoute();
  const toast = useToast();
  const [data, setData] = useState<{ rows: CanhBaoRow[]; tb_cap_nhat: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get<{ rows: CanhBaoRow[]; tb_cap_nhat: string | null }>("/canh-bao").then(setData).catch(() => setData({ rows: [], tb_cap_nhat: null }));
  }, []);

  if (!data) return <div className="h-[120px] rounded-xl bg-[var(--surface-2)] animate-pulse" />;
  if (!data.rows.length) return null;

  const nguyHiem = data.rows.filter((r) => r.muc === "nguy_hiem");
  const quaHan = data.rows.filter((r) => r.muc === "qua_han");
  const groups: { label: string; pham_vi: string; rows: CanhBaoRow[] }[] = [];
  for (const r of data.rows) {
    const g = groups.find((x) => x.label === r.vai_tro_label);
    if (g) g.rows.push(r);
    else groups.push({ label: r.vai_tro_label, pham_vi: r.pham_vi, rows: [r] });
  }
  const tinhLai = async () => {
    setBusy(true);
    try {
      setData(await api.post("/canh-bao/tinh-lai", {}));
      toast("Đã tính lại thời gian trung bình.", "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={`p-3 ${nguyHiem.length ? "border-l-4 !border-l-[var(--red-600)]" : quaHan.length ? "border-l-4 !border-l-[var(--amber-500,#f59e0b)]" : ""}`}
      title={
        <span className="flex flex-wrap items-center gap-2">
          ⚠ Cảnh báo đơn tồn
          {nguyHiem.length > 0 && <Badge tone="red-solid">🚨 {nguyHiem.reduce((s, r) => s + r.nguy_hiem, 0)} quá 72h</Badge>}
          {quaHan.length + nguyHiem.length > 0 && <Badge tone="amber">{data.rows.reduce((s, r) => s + r.qua_han, 0)} quá hạn 24h</Badge>}
          {!nguyHiem.length && !quaHan.length && <Badge tone="green">Không có đơn quá hạn</Badge>}
        </span>
      }
      actions={
        canTinhLai ? (
          <Btn size="sm" variant="ghost" disabled={busy} onClick={tinhLai} title="Tính lại thời gian xử lý trung bình 30 ngày">
            ↻ Tính lại TB
          </Btn>
        ) : undefined
      }
    >
      <div className="space-y-2.5">
        {groups.map((g) => (
          // Dien thoai (31/10/2026): chi hien giai doan dang co ton - bang day du chi tren may tinh.
          <div key={g.label} className={g.rows.some((r) => r.so_luong > 0) ? "" : "hidden md:block"}>
            <p className="mb-1 text-xs font-bold text-[var(--ink-soft)]">
              {g.label} <span className="font-normal text-[var(--ink-faint)]">· {g.pham_vi}</span>
            </p>
            {/* Desktop: bang gon 1 dong / giai doan; mobile: the xep doc. */}
            <div className="hidden md:block overflow-x-auto">
              <table className="tbl w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[var(--ink-soft)]">
                    <th className="w-[38%]">Giai đoạn</th>
                    <th className="text-right">Đang tồn</th>
                    <th className="text-right">Quá hạn 24h</th>
                    <th className="text-right">Nguy hiểm 72h</th>
                    <th className="text-right">Lâu nhất</th>
                    <th className="text-right" title="Thời gian xử lý trung bình 30 ngày gần nhất (giờ SLA, bỏ Chủ nhật)">TB xử lý 30 ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => (
                    <tr key={r.key} onClick={r.hash ? () => nav(r.hash!) : undefined} className={r.hash ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""}>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${MUC_DOT[r.muc]}`} />
                          {r.label}
                        </span>
                      </td>
                      <td className={`text-right font-semibold ${r.so_luong ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"}`}>
                        {r.so_luong} {r.don_vi}
                      </td>
                      <td className={`text-right ${r.qua_han ? "font-semibold text-[var(--amber-800)]" : "text-[var(--ink-faint)]"}`}>{r.qua_han}</td>
                      <td className={`text-right ${r.nguy_hiem ? "font-bold text-[var(--red-600)]" : "text-[var(--ink-faint)]"}`}>{r.nguy_hiem}</td>
                      <td className={`text-right ${r.so_luong ? "" : "text-[var(--ink-faint)]"}`}>{r.so_luong ? fmtGio(r.lau_nhat_gio) : "—"}</td>
                      <td className="text-right text-[var(--ink-soft)]" title={r.tb_mau ? `Tính trên ${r.tb_mau} lần xử lý` : "Chưa đủ dữ liệu"}>
                        {fmtGio(r.tb_gio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-1.5">
              {g.rows.filter((r) => r.so_luong > 0).map((r) => (
                <button
                  key={r.key}
                  onClick={r.hash ? () => nav(r.hash!) : undefined}
                  className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-left text-[13px]"
                >
                  <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${MUC_DOT[r.muc]}`} />
                    {r.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">
                    Tồn {r.so_luong} {r.don_vi}
                    {r.qua_han > 0 && ` · quá hạn ${r.qua_han}`}
                    {r.nguy_hiem > 0 && ` · nguy hiểm ${r.nguy_hiem}`}
                    {r.so_luong > 0 && ` · lâu nhất ${fmtGio(r.lau_nhat_gio)}`} · TB {fmtGio(r.tb_gio)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="hidden md:block text-[11px] text-[var(--ink-faint)]">
          Xanh: trong 24h · Vàng: có đơn quá 24h · Đỏ: có đơn quá 72h (giờ SLA, không tính Chủ nhật). TB xử lý = thời gian trung bình 30 ngày gần nhất
          {data.tb_cap_nhat && `, cập nhật ${fmtDate(data.tb_cap_nhat)}`}.
        </p>
      </div>
    </Card>
  );
}
