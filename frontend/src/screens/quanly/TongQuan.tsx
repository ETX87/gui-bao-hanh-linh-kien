import { useEffect, useState } from "react";
import { CanhBaoTonDon } from "../shared/CanhBaoTonDon";
import { api } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { Card, Spinner, StatCard } from "../../ui/primitives";
import { NHOM_GD } from "../../lib/constants";

// "Tong quan he thong" (Giam sat/View) - THUAN CHI XEM. So lieu theo dung pham vi da scope o backend
// (Giam sat qua email_gs, View qua Khu vuc).
//
// Phat hien 12 vong ra soat UX: them khoi "Qua han SLA" noi bat + bam moi o dem -> sang man tra cuu
// DA LOC SAN theo trang thai do (truoc day bam chi sang tra cuu khong loc gi).

export function QuanLyTongQuanScreen({ hideCanhBao }: { hideCanhBao?: boolean } = {}) {
  const { nav } = useRoute();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [quaHan, setQuaHan] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ theo_trang_thai: { trang_thai: string; cnt: number }[]; qua_han: number }>("/tra-cuu/tong-quan").then((r) => {
      const m: Record<string, number> = {};
      for (const row of r.theo_trang_thai) m[row.trang_thai] = row.cnt;
      setCounts(m);
      setQuaHan(r.qua_han || 0);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const goto = (st: string) => nav(`/don?tab=tat_ca&trang_thai=${encodeURIComponent(st)}`);

  return (
    <div className="space-y-3">
      <Card className={`p-3 ${quaHan > 0 ? "border-l-4 !border-l-[var(--red-600)]" : ""}`}>
        <button
          onClick={() => quaHan > 0 && goto("qua_han")}
          disabled={quaHan === 0}
          className={`focus-ring w-full text-left flex items-center justify-between gap-4 ${quaHan > 0 ? "cursor-pointer" : "cursor-default"}`}
        >
          <div>
            <p className={`font-bold text-sm ${quaHan > 0 ? "text-[var(--red-700)]" : "text-[var(--ink-soft)]"}`}>
              {quaHan > 0 ? "🔥 Đơn quá hạn SLA 24h" : "Đơn quá hạn SLA 24h"}
            </p>
            <p className="text-xs text-[var(--ink-soft)] mt-0.5">Các đơn đang chờ xử lý mà đã trôi quá 24 giờ — {quaHan > 0 ? "bấm để xem danh sách" : "không có"}</p>
          </div>
          <span className={`font-extrabold text-3xl md:text-2xl tabular-nums ${quaHan > 0 ? "text-[var(--red-600)]" : "text-[var(--ink-faint)]"}`}>{quaHan}</span>
        </button>
      </Card>

      {!hideCanhBao && <CanhBaoTonDon />}

      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">📊 Tổng quan hệ thống — {total} đơn theo giai đoạn (cả thùng chưa về)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-2.5">
          {/* 14/11/2026: gom 21 giai doan chi tiet thanh 9 nhom theo luong (NHOM_GD). */}
          {NHOM_GD.map((n) => {
            const v = n.gds.reduce((a, g) => a + (counts[g] || 0), 0);
            return (
              <div key={n.key} className={v === 0 ? "hidden md:block" : ""}>
                <StatCard label={n.label} value={v} tone={n.tone} icon={n.icon} onClick={() => goto(n.gds.join(","))} />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
