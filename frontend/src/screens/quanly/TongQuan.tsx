import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useRoute } from "../../router/Router";
import { Card, Spinner, StatCard } from "../../ui/primitives";
import { TRANG_THAI_UNIT_LABELS } from "../../lib/constants";

// "Tong quan he thong" (Giam sat/View) - THUAN CHI XEM, khong co nut hanh dong nao lam doi du lieu -
// port dung renderQuanLyTongQuan(). So lieu theo dung pham vi da scope o backend (Giam sat qua
// email_gs, View qua Khu vuc).

export function QuanLyTongQuanScreen() {
  const { nav } = useRoute();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ theo_trang_thai: { trang_thai: string; cnt: number }[] }>("/tra-cuu/tong-quan").then((r) => {
      const m: Record<string, number> = {};
      for (const row of r.theo_trang_thai) m[row.trang_thai] = row.cnt;
      setCounts(m);
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-4">📊 Tổng quan hệ thống — {total} đơn bảo hành trong phạm vi</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TRANG_THAI_UNIT_LABELS).map(([key, label]) => (
          <StatCard key={key} label={label} value={counts[key] || 0} tone="blue" onClick={() => nav("/quanly/tra-cuu")} />
        ))}
      </div>
    </Card>
  );
}
