import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Input } from "../../ui/primitives";
import type { SettingItem } from "../../lib/types";
import { refreshLinhKien } from "../../hooks/useLinhKien";

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

interface OdooSyncStatus {
  last_run: { ok: boolean; keo_ve: number; bo_sung_ktv: number; day_trang_thai: number; loi: string[]; luc: string } | null;
  tong: number;
  cho_gui: number;
  chua_ktv: number;
}

// Dong bo don bao hanh Odoo (dvbh -> suachua, cron 15 phut - backend/src/lib/odooSync.ts).
function OdooSyncCard() {
  const toast = useToast();
  const [st, setSt] = useState<OdooSyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => api.get<OdooSyncStatus>("/odoo-don/sync-status").then(setSt).catch((e) => toast(errorMessage(e), "error"));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const syncNow = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; keo_ve: number; day_trang_thai: number; loi: string[] }>("/odoo-don/sync-now");
      toast(r.ok ? `Đã đồng bộ: kéo về ${r.keo_ve} đơn, đẩy ${r.day_trang_thai} trạng thái.` : `Đồng bộ lỗi: ${r.loi.join("; ")}`, r.ok ? "ok" : "error");
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const lr = st?.last_run;
  return (
    <Card title="🧾 Đồng bộ đơn bảo hành Odoo" actions={<Btn size="sm" variant="primary" disabled={busy} onClick={syncNow}>Đồng bộ ngay</Btn>}>
      <p className="text-xs text-[var(--ink-soft)] mb-3">Tự động 15 phút/lần: kéo đơn Odoo từ DVBH về và đẩy trạng thái gửi sửa ngược lại DVBH.</p>
      {st && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-[var(--surface-2)] p-2"><div className="text-lg font-bold">{st.tong}</div><div className="text-[11px] text-[var(--ink-soft)]">Đơn đã kéo về</div></div>
          <div className="rounded-lg bg-[var(--surface-2)] p-2"><div className="text-lg font-bold">{st.cho_gui}</div><div className="text-[11px] text-[var(--ink-soft)]">Chờ gửi sửa</div></div>
          <div className="rounded-lg bg-[var(--surface-2)] p-2"><div className="text-lg font-bold">{st.chua_ktv}</div><div className="text-[11px] text-[var(--ink-soft)]">Chưa rõ KTV</div></div>
        </div>
      )}
      <p className={`mt-3 text-xs ${lr && !lr.ok ? "text-[var(--red-700)] font-semibold" : "text-[var(--ink-soft)]"}`}>
        {lr ? `Lần gần nhất ${lr.luc}: ${lr.ok ? "thành công" : "lỗi"} — kéo về ${lr.keo_ve}, bổ sung KTV ${lr.bo_sung_ktv}, đẩy ${lr.day_trang_thai} trạng thái.${lr.loi.length ? " " + lr.loi.join("; ") : ""}` : "Chưa chạy lần nào."}
      </p>
    </Card>
  );
}

// Top linh kien xu ly thanh cong 30 ngay (05/10/2026 muc 7): moi ngay tu tinh 1 lan khi toi khung gio
// cai dat (cron 15 phut kiem tra), dung de xep thu tu danh sach chon linh kien.
function TopLinhKienCard() {
  const toast = useToast();
  const [gio, setGio] = useState<number | null>(null);
  const [last, setLast] = useState<{ so_lk: number; tinh_luc: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    api
      .get<{ gio: number; last: { so_lk: number; tinh_luc: string } | null }>("/linh-kien/top-settings")
      .then((r) => {
        setGio(r.gio);
        setLast(r.last);
      })
      .catch((e) => toast(errorMessage(e), "error"));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveGio = async (v: number) => {
    setGio(v);
    try {
      await api.patch("/linh-kien/top-settings", { gio: v });
      toast("Đã lưu khung giờ.", "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const tinhNgay = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ so_lk: number; tinh_luc: string }>("/linh-kien/top/tinh-ngay");
      setLast(r);
      refreshLinhKien();
      toast(`Đã tính lại: ${r.so_lk} linh kiện có lượt xử lý thành công trong 30 ngày.`, "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="🔥 Top linh kiện (30 ngày)" actions={<Btn size="sm" variant="primary" disabled={busy} onClick={tinhNgay}>{busy ? "Đang tính…" : "Tính ngay"}</Btn>}>
      <p className="text-xs text-[var(--ink-soft)] mb-3">
        Mỗi ngày hệ thống tự đếm các linh kiện được xử lý thành công (Admin bảo hành đã xác nhận hoàn tất, không tính đơn từ chối) trong 30 ngày gần nhất, rồi đưa các linh kiện này lên đầu danh sách chọn linh kiện.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-[var(--ink)]">Khung giờ tính hằng ngày:</span>
        <select className="rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] px-2 py-1.5 text-sm" value={gio ?? ""} onChange={(e) => saveGio(Number(e.target.value))} disabled={gio === null}>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </div>
      <p className="mt-3 text-xs text-[var(--ink-soft)]">{last ? `Lần tính gần nhất ${last.tinh_luc}: ${last.so_lk} linh kiện có lượt xử lý thành công.` : "Chưa tính lần nào."}</p>
    </Card>
  );
}

export function QtriCaiDatScreen() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <SettingListCard title="⏱ Lý do chậm" path="/settings/ly-do-cham" />
      <SettingListCard title="🚫 Lý do huỷ" path="/settings/ly-do-tu-choi" />
      <OdooSyncCard />
      <TopLinhKienCard />
    </div>
  );
}
