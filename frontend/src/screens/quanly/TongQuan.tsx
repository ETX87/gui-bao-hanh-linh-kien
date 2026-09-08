import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { Card, Spinner, StatCard } from "../../ui/primitives";
import { TRANG_THAI_UNIT_LABELS } from "../../lib/constants";

// "Tong quan he thong" (Giam sat/View) - THUAN CHI XEM. So lieu theo dung pham vi da scope o backend
// (Giam sat qua email_gs, View qua Khu vuc).
//
// Phat hien 12 vong ra soat UX: them khoi "Qua han SLA" noi bat + bam moi o dem -> sang man tra cuu
// DA LOC SAN theo trang thai do (truoc day bam chi sang tra cuu khong loc gi).

export function QuanLyTongQuanScreen() {
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
  const goto = (st: string) => nav(`/quanly/tra-cuu?trang_thai=${st}`);

  return (
    <div className="space-y-6">
      <Card className={`p-5 ${quaHan > 0 ? "border-l-4 !border-l-[var(--coral-600)]" : ""}`}>
        <button
          onClick={() => quaHan > 0 && goto("qua_han")}
          disabled={quaHan === 0}
          className={`focus-ring w-full text-left flex items-center justify-between gap-4 ${quaHan > 0 ? "cursor-pointer" : "cursor-default"}`}
        >
          <div>
            <p className={`font-display font-bold text-sm ${quaHan > 0 ? "text-[var(--coral-700)]" : "text-[var(--ink-500)]"}`}>
              {quaHan > 0 ? "🔥 Đơn quá hạn SLA 24h" : "Đơn quá hạn SLA 24h"}
            </p>
            <p className="text-xs text-[var(--ink-500)] mt-0.5">Các đơn đang chờ xử lý mà đã trôi quá 24 giờ — {quaHan > 0 ? "bấm để xem danh sách" : "không có"}</p>
          </div>
          <span className={`font-display font-extrabold text-3xl tabular-nums ${quaHan > 0 ? "text-[var(--coral-600)]" : "text-[var(--ink-400)]"}`}>{quaHan}</span>
        </button>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-4">📊 Tổng quan hệ thống — {total} đơn bảo hành trong phạm vi</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(TRANG_THAI_UNIT_LABELS).map(([key, label]) => (
            <StatCard key={key} label={label} value={counts[key] || 0} tone={counts[key] ? "blue" : "gray"} onClick={() => goto(key)} />
          ))}
        </div>
      </Card>
    </div>
  );
}
