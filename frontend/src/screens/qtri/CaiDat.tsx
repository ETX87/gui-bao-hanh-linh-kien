import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Input } from "../../ui/primitives";
import type { SettingItem } from "../../lib/types";

// "Cai dat he thong" (qtri) - gop 2 danh muc "Ly do cham"/"Ly do huy" ve 1 trang.
// Phat hien 15 vong ra soat UX: them SUA (doi ten) + XOA (truoc day chi bat/tat + them, go nham la
// ket vinh vien).

function SettingListCard({ title, path }: { title: string; path: string }) {
  const toast = useToast();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [text, setText] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const load = () => api.get<{ items: SettingItem[] }>(path).then((r) => setItems(r.items));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const add = async () => {
    if (!text.trim()) return;
    try {
      await api.post(path, { noi_dung: text.trim() });
      setText("");
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const toggle = async (id: number, batTat: boolean) => {
    try {
      await api.patch(`${path}/${id}`, { bat_tat: batTat });
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const saveEdit = async () => {
    if (editId === null || !editText.trim()) return;
    try {
      await api.patch(`${path}/${editId}`, { noi_dung: editText.trim() });
      setEditId(null);
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const remove = async (id: number) => {
    if (!confirm("Xoá hẳn lý do này khỏi danh mục? (Các đơn/log cũ đã ghi nội dung này không bị ảnh hưởng.)")) return;
    try {
      await api.delete(`${path}/${id}`);
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-3">{title}</h3>
      <div className="space-y-1.5 mb-3">
        {items.map((it) =>
          editId === it.id ? (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-[var(--brand-400)] px-2 py-1.5">
              <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-1 !py-1" autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
              <Btn variant="primary" onClick={saveEdit} className="!py-1 !px-2.5">
                Lưu
              </Btn>
              <Btn onClick={() => setEditId(null)} className="!py-1 !px-2.5">
                Huỷ
              </Btn>
            </div>
          ) : (
            <div key={it.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm">
              <span className={`flex-1 ${!it.bat_tat ? "line-through text-[var(--ink-faint)]" : ""}`}>{it.noi_dung}</span>
              <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                <input type="checkbox" checked={it.bat_tat} onChange={(e) => toggle(it.id, e.target.checked)} /> Bật
              </label>
              <button
                onClick={() => {
                  setEditId(it.id);
                  setEditText(it.noi_dung);
                }}
                className="focus-ring text-xs text-[var(--accent-ink)] hover:underline"
              >
                Sửa
              </button>
              <button onClick={() => remove(it.id)} className="focus-ring text-xs text-[var(--red-600)] hover:underline">
                Xoá
              </button>
            </div>
          ),
        )}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Thêm lý do mới..." className="flex-1" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Btn variant="primary" onClick={add} disabled={!text.trim()}>
          Thêm
        </Btn>
      </div>
    </Card>
  );
}

export function QtriCaiDatScreen() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SettingListCard title="⏱ Lý do chậm" path="/settings/ly-do-cham" />
      <SettingListCard title="🚫 Lý do huỷ" path="/settings/ly-do-tu-choi" />
    </div>
  );
}
