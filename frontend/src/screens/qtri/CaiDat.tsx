import { useEffect, useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import type { TuKhoa } from "../../lib/mien";
import type { Mien } from "../../lib/types";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Card, Btn, Input } from "../../ui/primitives";
import type { SettingItem } from "../../lib/types";
import { refreshLinhKien } from "../../hooks/useLinhKien";
import { OdooImportExportModal } from "../shared/OdooImportExportModal";

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
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">{title}</h3>
      <div className="space-y-1.5 mb-2">
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
  const [importOpen, setImportOpen] = useState(false);
  return (
    <Card
      title="🧾 Đồng bộ đơn bảo hành Odoo"
      actions={
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => setImportOpen(true)}>📤 File import Odoo</Btn>
          <Btn size="sm" variant="primary" disabled={busy} onClick={syncNow}>Đồng bộ ngay</Btn>
        </div>
      }
    >
      {importOpen && <OdooImportExportModal onClose={() => setImportOpen(false)} />}
      <p className="text-xs text-[var(--ink-soft)] mb-2">Tự động 15 phút/lần: kéo đơn Odoo từ DVBH về và đẩy trạng thái gửi sửa ngược lại DVBH.</p>
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
      <p className="text-xs text-[var(--ink-soft)] mb-2">
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

// 11/10/2026: chia 2 mien - tu khoa nhan dien mien tu ma khu vuc KTV + xem truoc + ap dung lai.
function MienCard() {
  const toast = useToast();
  const [tk, setTk] = useState<TuKhoa[]>([]);
  const [kv, setKv] = useState<{ khu_vuc: { ma: string | null; so_ktv: number; so_gan_tam: number; mien: Mien | null }[]; phieu_gui_chua_khai_bao: number } | null>(null);
  const [inp, setInp] = useState<Record<Mien, string>>({ MB: "", MN: "" });
  const [busy, setBusy] = useState(false);
  const load = () => {
    api.get<{ tu_khoa: TuKhoa[] }>("/mien/tu-khoa").then((r) => setTk(r.tu_khoa)).catch(() => undefined);
    api.get<NonNullable<typeof kv>>("/mien/khu-vuc").then(setKv).catch(() => undefined);
  };
  useEffect(load, []);
  const them = async (m: Mien) => {
    if (!inp[m].trim()) return;
    try {
      await api.post("/mien/tu-khoa", { mien: m, tu_khoa: inp[m] });
      setInp({ ...inp, [m]: "" });
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const xoa = async (id: number) => {
    try {
      await api.delete(`/mien/tu-khoa/${id}`);
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const apDungLai = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ so_thung: number; con_lai: number }>("/mien/ap-dung-lai");
      toast(`Đã gán miền cho ${r.so_thung} thùng. Còn ${r.con_lai} thùng chưa xác định được miền.`, "ok");
      load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const chuaKb = (kv?.khu_vuc || []).filter((r) => !r.mien);
  return (
    <Card
      className="md:col-span-2"
      title="🗺 Chia miền (Bắc / Nam)"
      actions={
        <Btn size="sm" disabled={busy || !kv?.phieu_gui_chua_khai_bao} onClick={apDungLai} title="Gán lại miền cho các thùng đang 'Chưa khai báo' theo từ khoá + miền gán tạm của KTV">
          Áp dụng lại cho {kv?.phieu_gui_chua_khai_bao ?? 0} thùng chưa khai báo
        </Btn>
      }
    >
      <p className="text-xs text-[var(--ink-soft)] mb-2">
        Đơn được gán miền theo mã khu vực của KTV tạo thùng: mã chứa từ khoá của đúng 1 miền → miền đó; không xác định được → <b>Chưa khai báo</b> (Kho, Admin BH, NV, Kế toán cả 2 miền đều thấy). Người xử lý gán miền phụ trách ở màn Người dùng.
      </p>
      <div className="grid md:grid-cols-3 gap-3">
        {(["MB", "MN"] as Mien[]).map((m) => (
          <div key={m} className="rounded-lg border border-[var(--line)] p-2">
            <p className="text-sm font-semibold mb-1.5">
              <MienBadge mien={m} /> — từ khoá
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {tk
                .filter((x) => x.mien === m)
                .map((x) => (
                  <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-mono">
                    {x.tu_khoa}
                    <button className="text-[var(--red-600)]" title="Xoá" onClick={() => xoa(x.id)}>
                      ✕
                    </button>
                  </span>
                ))}
            </div>
            <div className="flex gap-1.5">
              <Input value={inp[m]} onChange={(e) => setInp({ ...inp, [m]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && them(m)} placeholder="VD: PTDV" />
              <Btn size="sm" onClick={() => them(m)}>
                Thêm
              </Btn>
            </div>
          </div>
        ))}
        <div className="rounded-lg border border-[var(--line)] p-2 max-h-56 overflow-y-auto">
          <p className="text-sm font-semibold mb-1.5">Khu vực → miền</p>
          {(kv?.khu_vuc || []).map((r) => (
            <div key={r.ma ?? "__null"} className="flex items-center justify-between gap-2 text-xs py-0.5">
              <span className="font-mono">{r.ma || "(không có mã)"}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[var(--ink-faint)]">{r.so_ktv} KTV{r.so_gan_tam ? ` · ${r.so_gan_tam} gán tạm` : ""}</span>
                <MienBadge mien={r.mien} short />
              </span>
            </div>
          ))}
          {chuaKb.length > 0 && <p className="mt-1 text-[11px] text-[var(--amber-700)]">{chuaKb.length} mã khu vực chưa thuộc miền nào.</p>}
        </div>
      </div>
    </Card>
  );
}

export function QtriCaiDatScreen() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <MienCard />
      <SettingListCard title="⏱ Lý do chậm" path="/settings/ly-do-cham" />
      <SettingListCard title="🚫 Lý do huỷ" path="/settings/ly-do-tu-choi" />
      <OdooSyncCard />
      <TopLinhKienCard />
    </div>
  );
}
