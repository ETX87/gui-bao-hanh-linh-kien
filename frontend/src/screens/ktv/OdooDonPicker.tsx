import { lkLabel } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { Btn, Badge, Spinner, Field, Textarea } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { fmtDate } from "../../lib/format";
import { Pagination } from "../../ui/Pagination";
import { useClientPage } from "../../hooks/useClientPage";
import type { OdooDon } from "../../lib/types";

// Don bao hanh tao tren Odoo dang "cho gui sua" cua 1 KTV (yeu cau 04/10/2026, CHOT "KTV chon don vao
// thung") - danh sach co o chon, dung chung cho the o man "Gui hang bao hanh" va modal "Chon don Odoo"
// trong chi tiet phieu gui.

export const ODOO_TT_LABELS: Record<string, string> = { new: "Mới", repairing: "Đang sửa" };

export function useOdooChoGui(ktvEmail: string | null | undefined, enabled = true) {
  const [don, setDon] = useState<OdooDon[] | null>(null);
  const [khongGui, setKhongGui] = useState<OdooDon[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    if (!enabled) return;
    setError(null);
    api
      .get<{ don: OdooDon[]; khong_gui?: OdooDon[] }>(`/odoo-don/cho-gui${ktvEmail ? `?ktv_email=${encodeURIComponent(ktvEmail)}` : ""}`)
      .then((r) => {
        setDon(r.don);
        setKhongGui(r.khong_gui ?? []);
      })
      .catch((e) => {
        setDon([]);
        setError(errorMessage(e));
      });
  };
  useEffect(load, [ktvEmail, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return { don, khongGui, error, reload: load };
}

export function OdooDonList({
  don,
  selected,
  onToggle,
  onToggleAll,
  onKhongGui,
}: {
  don: OdooDon[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onKhongGui?: (d: OdooDon) => void;
}) {
  const allOn = don.length > 0 && don.every((d) => selected.has(d.odoo_id));
  const pg = useClientPage(don);
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 px-1 text-xs font-semibold text-[var(--ink-soft)]">
        <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={allOn} onChange={onToggleAll} />
        Chọn tất cả ({don.length}){selected.size > 0 ? ` — đã chọn ${selected.size}` : ""}
      </label>
      {pg.pageItems.map((d) => (
        <label
          key={d.odoo_id}
          className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
            selected.has(d.odoo_id) ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] hover:border-[var(--line-strong)]"
          }`}
        >
          <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)] lg:h-4 lg:w-4" checked={selected.has(d.odoo_id)} onChange={() => onToggle(d.odoo_id)} />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.ma_don ?? `#${d.odoo_id}`}</span>
              <span className="font-mono text-xs text-[var(--ink-soft)]">{d.case_id}</span>
              <Badge tone={d.trang_thai === "repairing" ? "blue" : "amber"}>{ODOO_TT_LABELS[d.trang_thai || ""] || d.trang_thai}</Badge>
              <span className="text-xs text-[var(--ink-soft)]">SL {d.so_luong ?? 1}</span>
            </span>
            <span className="mt-0.5 block text-sm font-medium text-[var(--ink-body)]">{lkLabel(d.ten_linh_kien, d.ma_linh_kien) || "—"}</span>
            {(d.tinh_trang_loi || d.ghi_chu) && <span className="block text-xs text-[var(--ink-soft)]">{[d.tinh_trang_loi, d.ghi_chu].filter(Boolean).join(" — ")}</span>}
            {d.ngay_tao && <span className="block text-[11px] text-[var(--ink-faint)]">Tạo trên Odoo {fmtDate(d.ngay_tao)}</span>}
          </span>
          {onKhongGui && (
            <Btn
              size="sm"
              variant="ghost"
              className="shrink-0 !text-[var(--red-700)]"
              title="Đơn tạo nhầm trên Odoo, không cần gửi bảo hành"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onKhongGui(d);
              }}
            >
              🚫 Không gửi
            </Btn>
          )}
        </label>
      ))}
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
    </div>
  );
}

export function useSelection() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (id: number) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = (ids: number[]) => setSelected((prev) => (ids.every((i) => prev.has(i)) ? new Set() : new Set(ids)));
  return { selected, setSelected, toggle, toggleAll };
}

// Modal "Chon don Odoo" trong chi tiet phieu gui (phieu con nhap) - them thang vao phieu dang mo.
export function OdooDonPickerModal({ guiId, ktvEmail, onClose, onDone }: { guiId: string; ktvEmail: string; onClose: () => void; onDone: (msg: string) => void }) {
  const { don, khongGui, error, reload } = useOdooChoGui(ktvEmail);
  const sel = useSelection();
  const [huy, setHuy] = useState<OdooDon | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api.post<{ created: string[]; loi: { odoo_id: number; error: string }[] }>(`/phieu-gui/${guiId}/don-tu-odoo`, { odoo_ids: [...sel.selected] });
      onDone(`Đã thêm ${r.created.length} đơn từ Odoo${r.loi.length ? `, ${r.loi.length} đơn không thêm được` : ""}.`);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Chọn đơn bảo hành từ Odoo"
      onClose={onClose}
      footerActions={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Huỷ
          </Btn>
          <Btn variant="primary" disabled={busy || sel.selected.size === 0} onClick={submit}>
            Thêm {sel.selected.size || ""} đơn vào phiếu
          </Btn>
        </>
      }
    >
      <p className="mb-3 text-xs text-[var(--ink-soft)]">
        Đơn bảo hành đã tạo trên Odoo, thuộc KTV <b className="text-[var(--ink-body)]">{ktvEmail}</b>, chưa đưa vào thùng nào. Mã ca, linh kiện, số lượng và mô tả lỗi được điền sẵn.
      </p>
      {err && <p className="mb-3 rounded-lg bg-[var(--red-100)] px-3 py-2 text-xs font-semibold text-[var(--red-700)]">{err}</p>}
      {don === null ? (
        <Spinner />
      ) : error ? (
        <p className="text-sm text-[var(--red-700)]">{error}</p>
      ) : (
        <>
          {don.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">Không có đơn Odoo nào đang chờ gửi sửa.</p>
          ) : (
            <OdooDonList don={don} selected={sel.selected} onToggle={sel.toggle} onToggleAll={() => sel.toggleAll(don.map((d) => d.odoo_id))} onKhongGui={setHuy} />
          )}
          <OdooKhongGuiSection items={khongGui} ktvEmail={ktvEmail} onChanged={reload} />
        </>
      )}
      {huy && (
        <KhongGuiModal
          don={huy}
          ktvEmail={ktvEmail}
          onClose={() => setHuy(null)}
          onDone={() => {
            sel.setSelected((prev) => {
              const n = new Set(prev);
              n.delete(huy.odoo_id);
              return n;
            });
            setHuy(null);
            reload();
          }}
        />
      )}
    </Modal>
  );
}

// 09/10/2026: "cho phep xac nhan huy don (tao nham tren odoo khong can gui bao hanh - cho phep mo lai de
// gui neu tat nham)". Danh dau 1 don Odoo "khong gui" -> an khoi danh sach cho gui + so viec, bao trang
// thai "khong_gui" ve dvbh; mo lai o khu "Da xac nhan khong gui" ngay ben duoi danh sach.
export function KhongGuiModal({ don, ktvEmail, onClose, onDone }: { don: OdooDon; ktvEmail?: string | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const ma = don.ma_don ?? "#" + don.odoo_id;
  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/odoo-don/" + don.odoo_id + "/khong-gui", { ly_do: lyDo.trim() || undefined, ktv_email: ktvEmail || undefined });
      toast("Đã xác nhận không gửi đơn " + ma + ".", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Xác nhận không gửi bảo hành"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Quay lại
          </Btn>
          <Btn variant="danger" disabled={busy} onClick={submit}>
            Xác nhận không gửi
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">
          Đơn <b className="font-mono text-[var(--link)]">{ma}</b> — {lkLabel(don.ten_linh_kien, don.ma_linh_kien) || "—"} sẽ được ẩn khỏi danh sách chờ gửi. Nếu bấm nhầm, mở lại ở mục
          "Đã xác nhận không gửi" bên dưới danh sách.
        </p>
        <Field label="Lý do (không bắt buộc)">
          <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Tạo nhầm trên Odoo, không cần gửi bảo hành" />
        </Field>
      </div>
    </Modal>
  );
}

export function OdooKhongGuiSection({ items, ktvEmail, onChanged }: { items: OdooDon[]; ktvEmail?: string | null; onChanged: () => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const pg = useClientPage(items);
  if (items.length === 0) return null;
  const moLai = async (d: OdooDon) => {
    setBusyId(d.odoo_id);
    try {
      await api.post("/odoo-don/" + d.odoo_id + "/mo-lai", { ktv_email: ktvEmail || undefined });
      toast("Đã mở lại đơn " + (d.ma_don ?? "#" + d.odoo_id) + " — đơn quay về danh sách chờ gửi.", "ok");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <button
        type="button"
        className="focus-ring flex items-center gap-1.5 rounded text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "▾" : "▸"}</span> Đã xác nhận không gửi ({items.length})
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {pg.pageItems.map((d) => (
            <div key={d.odoo_id} className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-3 py-2.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-mono text-xs font-semibold text-[var(--ink-soft)] line-through">{d.ma_don ?? "#" + d.odoo_id}</span>
                  <span className="font-mono text-xs text-[var(--ink-faint)]">{d.case_id}</span>
                  <Badge tone="gray">Không gửi</Badge>
                </div>
                <div className="text-sm text-[var(--ink-soft)]">{lkLabel(d.ten_linh_kien, d.ma_linh_kien) || "—"}</div>
                <div className="text-[11px] text-[var(--ink-faint)]">
                  {[d.khong_gui_ly_do, d.khong_gui_boi, d.khong_gui_luc ? fmtDate(d.khong_gui_luc) : null].filter(Boolean).join(" · ")}
                </div>
              </div>
              <Btn size="sm" variant="secondary" disabled={busyId === d.odoo_id} onClick={() => moLai(d)} className="w-full sm:w-auto">
                ↺ Mở lại
              </Btn>
            </div>
          ))}
          <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
        </div>
      )}
    </div>
  );
}
