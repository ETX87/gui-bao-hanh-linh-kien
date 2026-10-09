import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Textarea } from "../../ui/primitives";
import { UserName } from "../../hooks/useUserNames";

interface BaoCaoRow {
  id: number;
  tac_gia: string;
  thoi_gian: string;
  noi_dung: string;
}

// "KTV bao cao sai thong tin" - ghi nhan noi bo cua Admin BH, CHI vai tro giam sat doc duoc (dung
// dung backend GET /admin/don-cha/:id/bao-cao-sai - server da tu chan neu khong dung quyen).

export function BaoCaoSaiModal({ parentId, onClose, onDone }: { parentId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState<BaoCaoRow[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get<{ bao_cao_sai_thong_tin: BaoCaoRow[] }>(`/admin/don-cha/${parentId}/bao-cao-sai`).then((r) => setRows(r.bao_cao_sai_thong_tin));
  useEffect(() => {
    load();
  }, [parentId]);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/don-cha/${parentId}/bao-cao-sai`, { noi_dung: text.trim() });
      setText("");
      await load();
      toast("Đã ghi nhận.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="🐞 KTV báo cáo sai thông tin" onClose={onClose} maxWidthClass="max-w-md">
      <p className="text-xs text-[var(--ink-soft)] mb-3">Ghi nhận nội bộ, chỉ vai trò giám sát đọc được — có thể dùng để xử lý vi phạm báo cáo sau này.</p>
      <div className="max-h-48 overflow-y-auto space-y-2 mb-3 scrollbar-thin">
        {rows.length === 0 && <p className="text-xs text-[var(--ink-faint)]">Chưa có ghi nhận nào.</p>}
        {rows.map((r) => (
          <div key={r.id} className="text-xs bg-[var(--surface-2)] rounded-lg px-3 py-2">
            <p className="whitespace-pre-wrap">{r.noi_dung}</p>
            <p className="mt-1 text-[10px] text-[var(--ink-faint)] font-mono">
              <UserName email={r.tac_gia} /> · {fmtDate(r.thoi_gian)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mô tả sai sót KTV đã báo cáo..." className="flex-1" />
        <Btn variant="primary" disabled={!text.trim() || busy} onClick={submit}>
          Ghi nhận
        </Btn>
      </div>
    </Modal>
  );
}
