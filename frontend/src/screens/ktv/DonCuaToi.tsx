import { useEffect, useState } from "react";
import { useRoute } from "../../router/Router";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { Input, Spinner } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { KtvDonCard, type KtvDon } from "./KtvCards";
import { KtvBoSungModal } from "./KtvBoSungModal";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import type { DonVi } from "../../lib/types";

// 30/10/2026 (ra soat UX mobile KTV, de xuat 2): "Đơn của tôi" thay man "Tiến độ" cu - 1 the / don cha,
// GOM CA don trong thung nhap va thung dang tren xe (truoc day chi hien don Admin da tach nen don vua
// gui "bien mat"). 2 tab Đang xử lý / Đã xong; don can bo sung luon len dau; o tim thay luon cho man
// Lich su Serial / Case (van mo duoc qua link).

export function KtvDonCuaToiScreen() {
  const { nav } = useRoute();
  const { refresh } = useWorkload();
  const [nhom, setNhom] = useState<"dang" | "xong">("dang");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  const path = `/phieu-gui/don-cua-toi?nhom=${nhom}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { items, total, page, pageCount, setPage, loading, reload, raw } = usePagedApi<KtvDon>(path, "don");
  const r = raw as { so_dang?: number; so_xong?: number } | null;
  const [boSung, setBoSung] = useState<DonVi | null>(null);
  const [guiId, setGuiId] = useState<string | null>(null);
  const after = () => {
    reload();
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1" role="tablist">
        {(
          [
            ["dang", "Đang xử lý", r?.so_dang],
            ["xong", "Đã xong", r?.so_xong],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            aria-selected={nhom === k}
            onClick={() => setNhom(k)}
            className={`focus-ring flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${nhom === k ? "bg-[var(--surface)] text-[var(--accent-ink)] shadow-card" : "text-[var(--ink-soft)]"}`}
          >
            {label}
            {n != null && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${nhom === k ? "bg-[var(--accent-soft)]" : "bg-[var(--line)]"}`}>{n}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="🔍 Tìm khách, serial, case, linh kiện, mã đơn…" />
        </div>
        <button className="focus-ring shrink-0 text-xs font-semibold text-[var(--link)] hover:underline" onClick={() => nav("/lich-su")} title="Tra lịch sử bảo hành theo Serial / ID case">
          🔁 Lịch sử
        </button>
      </div>
      {loading && items.length === 0 ? (
        <Spinner />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--ink-faint)]">{q ? "Không có đơn nào khớp." : nhom === "dang" ? "Chưa có đơn nào đang xử lý." : "Chưa có đơn nào đã xong."}</p>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {items.map((d) => (
            <KtvDonCard key={d.id} don={d} onOpen={() => setGuiId(d.phieu_gui_id)} onBoSung={setBoSung} />
          ))}
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {boSung && (
        <KtvBoSungModal
          unit={boSung}
          onClose={() => setBoSung(null)}
          onDone={() => {
            setBoSung(null);
            after();
          }}
        />
      )}
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={after} />}
    </div>
  );
}
