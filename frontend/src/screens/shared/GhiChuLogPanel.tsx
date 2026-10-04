import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Btn, Textarea } from "../../ui/primitives";
import type { GhiChuLog } from "../../lib/types";

// Khu vuc "Ghi chu / phan hoi" dung chung KTV/Kho/Admin BH tren 1 phieu gui - dang nhat ky nhieu dong
// (port dung "Phan hoi vong 1 muc #5" + "vong 3 muc 3": bao su co cua Kho cung gop vao day).

export function GhiChuLogPanel({ guiId }: { guiId: string }) {
  const toast = useToast();
  const [logs, setLogs] = useState<GhiChuLog[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get<{ ghi_chu_log: GhiChuLog[] }>(`/phieu-gui/${guiId}/ghi-chu`).then((r) => setLogs(r.ghi_chu_log));
  useEffect(() => {
    load();
  }, [guiId]);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/phieu-gui/${guiId}/ghi-chu`, { noi_dung: text.trim() });
      setText("");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-wide mb-2">💬 Trao đổi / Phản hồi ({logs.length})</p>
      <div className="max-h-56 overflow-y-auto space-y-2 mb-3 scrollbar-thin">
        {logs.length === 0 && <p className="text-xs text-[var(--ink-faint)]">Chưa có trao đổi nào.</p>}
        {logs.map((l) => (
          <div key={l.id} className={`text-xs rounded-lg px-3 py-2 ${l.noi_dung.startsWith("⚠") ? "bg-[var(--red-100)] text-[var(--red-700)]" : "bg-[var(--surface-2)] text-[var(--ink-body)]"}`}>
            <p className="whitespace-pre-wrap">{l.noi_dung}</p>
            <p className="mt-1 text-[10px] text-[var(--ink-faint)] font-mono">
              {l.tac_gia} · {fmtDate(l.thoi_gian)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Viết ghi chú / phản hồi..." className="flex-1" />
        <Btn variant="primary" disabled={!text.trim() || busy} onClick={submit}>
          Gửi
        </Btn>
      </div>
    </div>
  );
}
