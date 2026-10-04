import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { Btn, Badge, Spinner } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { fmtDate } from "../../lib/format";
import type { OdooDon } from "../../lib/types";

// Don bao hanh tao tren Odoo dang "cho gui sua" cua 1 KTV (yeu cau 04/10/2026, CHOT "KTV chon don vao
// thung") - danh sach co o chon, dung chung cho the o man "Gui hang bao hanh" va modal "Chon don Odoo"
// trong chi tiet phieu gui.

export const ODOO_TT_LABELS: Record<string, string> = { new: "Mới", repairing: "Đang sửa" };

export function useOdooChoGui(ktvEmail: string | null | undefined, enabled = true) {
  const [don, setDon] = useState<OdooDon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    if (!enabled) return;
    setError(null);
    api
      .get<{ don: OdooDon[] }>(`/odoo-don/cho-gui${ktvEmail ? `?ktv_email=${encodeURIComponent(ktvEmail)}` : ""}`)
      .then((r) => setDon(r.don))
      .catch((e) => {
        setDon([]);
        setError(errorMessage(e));
      });
  };
  useEffect(load, [ktvEmail, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return { don, error, reload: load };
}

export function OdooDonList({ don, selected, onToggle, onToggleAll }: { don: OdooDon[]; selected: Set<number>; onToggle: (id: number) => void; onToggleAll: () => void }) {
  const allOn = don.length > 0 && don.every((d) => selected.has(d.odoo_id));
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 px-1 text-xs font-semibold text-[var(--ink-soft)]">
        <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={allOn} onChange={onToggleAll} />
        Chọn tất cả ({don.length})
      </label>
      {don.map((d) => (
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
            <span className="mt-0.5 block text-sm font-medium text-[var(--ink-body)]">{d.ten_linh_kien || d.ma_linh_kien || "—"}</span>
            {(d.tinh_trang_loi || d.ghi_chu) && <span className="block text-xs text-[var(--ink-soft)]">{[d.tinh_trang_loi, d.ghi_chu].filter(Boolean).join(" — ")}</span>}
            {d.ngay_tao && <span className="block text-[11px] text-[var(--ink-faint)]">Tạo trên Odoo {fmtDate(d.ngay_tao)}</span>}
          </span>
        </label>
      ))}
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
  const { don, error } = useOdooChoGui(ktvEmail);
  const sel = useSelection();
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
      ) : don.length === 0 ? (
        <p className="text-sm text-[var(--ink-faint)]">Không có đơn Odoo nào đang chờ gửi sửa.</p>
      ) : (
        <OdooDonList don={don} selected={sel.selected} onToggle={sel.toggle} onToggleAll={() => sel.toggleAll(don.map((d) => d.odoo_id))} />
      )}
    </Modal>
  );
}
