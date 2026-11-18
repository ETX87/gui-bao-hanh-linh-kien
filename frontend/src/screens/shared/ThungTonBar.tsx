import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtTon } from "../../lib/format";
import { UserName } from "../../hooks/useUserNames";

// 18/11/2026 ("danh sách các thùng hàng, thêm cảnh báo thời gian tồn cho các vai trò xác định được thùng đang
// tồn bao lâu rồi mà kho chưa xử lý"): thanh tong hop thoi gian ton cua 1 hang doi thung (GET /kho/thung-ton).
// Bam 1 muc -> loc danh sach theo muc do (?ton=), bam lai -> bo loc. Gio tinh bo Chu nhat (giong SLA).
type Muc = "lt1" | "d1_2" | "d2_3" | "gt3";
const MUC: { k: Muc; nhan: string; cls: string }[] = [
  { k: "lt1", nhan: "Dưới 1 ngày", cls: "bg-[var(--green-50)] text-[var(--green-700)] ring-[var(--green-200)]" },
  { k: "d1_2", nhan: "1–2 ngày", cls: "bg-[var(--amber-50)] text-[var(--amber-800)] ring-[var(--amber-200)]" },
  { k: "d2_3", nhan: "2–3 ngày", cls: "bg-[var(--orange-50)] text-[var(--orange-700)] ring-[var(--orange-200)]" },
  { k: "gt3", nhan: "Trên 3 ngày", cls: "bg-[var(--red-600)] text-white ring-[var(--red-600)]" },
];

interface TonData {
  tong: number;
  muc: Record<Muc, number>;
  lau_nhat: { id: string; nguoi_tao: string; moc: string } | null;
}

export function ThungTonBar({ tt, value, onChange, reloadKey, onOpen }: { tt: "da_gui" | "cho_admin"; value: string; onChange: (v: string) => void; reloadKey?: unknown; onOpen?: (id: string) => void }) {
  const [d, setD] = useState<TonData | null>(null);
  useEffect(() => {
    let alive = true;
    api.get<TonData>(`/kho/thung-ton?tt=${tt}`).then((r) => alive && setD(r)).catch(() => alive && setD(null));
    return () => {
      alive = false;
    };
  }, [tt, reloadKey]);
  if (!d || d.tong === 0) return null;
  const ai = tt === "da_gui" ? "Kho chưa tiếp nhận" : "Admin BH chưa nhận nội bộ";
  return (
    <div className={`flex flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${d.muc.gt3 > 0 ? "border-[var(--red-200)] bg-[var(--red-50)]" : "border-[var(--line)] bg-[var(--surface-2)]"}`}>
      <b className="text-[var(--ink)]">⏱ Tồn {d.tong} thùng</b>
      <span className="text-[var(--ink-soft)]">({ai}):</span>
      {MUC.map((m) => {
        const n = d.muc[m.k];
        const on = value === m.k;
        return (
          <button
            key={m.k}
            type="button"
            disabled={!n && !on}
            onClick={() => onChange(on ? "" : m.k)}
            title={on ? "Bấm để bỏ lọc" : `Lọc thùng tồn ${m.nhan.toLowerCase()}`}
            className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${n ? m.cls : "bg-transparent text-[var(--ink-faint)] ring-[var(--line)]"} ${on ? "outline outline-2 outline-offset-1 outline-[var(--link)]" : ""} disabled:cursor-default`}
          >
            {m.k === "gt3" && n ? "⚠ " : ""}
            {m.nhan}: {n}
          </button>
        );
      })}
      {d.lau_nhat && (
        <span className="ml-auto text-[var(--ink-body)]">
          Lâu nhất:{" "}
          <button type="button" className="font-mono font-semibold text-[var(--link)] hover:underline" onClick={() => onOpen?.(d.lau_nhat!.id)} disabled={!onOpen}>
            {d.lau_nhat.id}
          </button>{" "}
          · <UserName email={d.lau_nhat.nguoi_tao} /> · <b className="text-[var(--red-700)]">tồn {fmtTon(d.lau_nhat.moc)}</b>
        </span>
      )}
    </div>
  );
}
