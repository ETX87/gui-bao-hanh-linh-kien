import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Input } from "../../ui/primitives";
import type { SettingItem } from "../../lib/types";

// "Cai dat he thong" (qtri) - gop 2 danh muc "Ly do cham"/"Ly do huy" ve 1 trang (port dung quyet
// dinh 03/09/2026: bo popup rieng, hien truc tiep dang luoi 2 cot ngay tren trang). Goi thang API
// (khong dung hook useLyDoCham/useLyDoTuChoi dung chung o noi khac - tranh goi hook co dieu kien theo
// prop `path`, vi pham Rules of Hooks).

function SettingListCard({ title, path }: { title: string; path: string }) {
  const toast = useToast();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [text, setText] = useState("");

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

  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">{title}</h3>
      <div className="space-y-1.5 mb-3">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm">
            <span className={`flex-1 ${!it.bat_tat ? "line-through text-[var(--ink-400)]" : ""}`}>{it.noi_dung}</span>
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-500)]">
              <input type="checkbox" checked={it.bat_tat} onChange={(e) => toggle(it.id, e.target.checked)} /> Bật
            </label>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Thêm lý do mới..." className="flex-1" />
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
