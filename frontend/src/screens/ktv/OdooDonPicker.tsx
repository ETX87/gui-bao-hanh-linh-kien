import { lkLabel } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { Btn, Badge, Spinner, Field, Textarea } from "../../ui/primitives";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { fmtDate } from "../../lib/format";
import { Pagination } from "../../ui/Pagination";
import { useClientPage } from "../../hooks/useClientPage";
import { usePagedApi } from "../../hooks/usePagedApi";
import type { OdooDon } from "../../lib/types";
import { displayName, useUserNames } from "../../hooks/useUserNames";

// Don bao hanh tao tren Odoo dang "cho gui sua" cua 1 KTV (yeu cau 04/10/2026, CHOT "KTV chon don vao
// thung") - danh sach co o chon, dung chung cho the o man "Gui hang bao hanh" va modal "Chon don Odoo"
// trong chi tiet phieu gui.

export const ODOO_TT_LABELS: Record<string, string> = { new: "Mới", repairing: "Đang sửa" };

export function useOdooChoGui(ktvEmail: string | null | undefined, enabled = true) {
  const [don, setDon] = useState<OdooDon[] | null>(null);
  const [khongGui, setKhongGui] = useState<OdooDon[]>([]);
  const [soDaGui, setSoDaGui] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    if (!enabled) return;
    setError(null);
    api
      .get<{ don: OdooDon[]; khong_gui?: OdooDon[]; so_da_gui?: number }>(`/odoo-don/cho-gui${ktvEmail ? `?ktv_email=${encodeURIComponent(ktvEmail)}` : ""}`)
      .then((r) => {
        setDon(r.don);
        setKhongGui(r.khong_gui ?? []);
        setSoDaGui(r.so_da_gui ?? 0);
      })
      .catch((e) => {
        setDon([]);
        setError(errorMessage(e));
      });
  };
  useEffect(load, [ktvEmail, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return { don, khongGui, soDaGui, error, reload: load };
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
    <div className="space-y-1">
      <label className="flex items-center gap-2 px-1 text-xs font-semibold text-[var(--ink-soft)]">
        <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" checked={allOn} onChange={onToggleAll} />
        Chọn tất cả ({don.length}){selected.size > 0 ? ` — đã chọn ${selected.size}` : ""}
      </label>
      {pg.pageItems.map((d) => (
        <label
          key={d.odoo_id}
          className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-1 transition-colors ${
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
              <span className="min-w-0 truncate text-[13px] font-medium text-[var(--ink-body)]">{lkLabel(d.ten_linh_kien, d.ma_linh_kien) || "—"}</span>
            </span>
            <span className="block truncate text-xs text-[var(--ink-soft)]" title={[d.tinh_trang_loi, d.ghi_chu].filter(Boolean).join(" — ")}>
              {[d.tinh_trang_loi, d.ghi_chu].filter(Boolean).join(" — ") || "—"}
              {d.ngay_tao && <span className="text-[11px] text-[var(--ink-faint)]"> · Tạo trên Odoo {fmtDate(d.ngay_tao)}</span>}
            </span>
          </span>
          {onKhongGui && (
            <Btn
              size="sm"
              variant="ghost"
              className="shrink-0 !text-[var(--red-700)]"
              title="Đơn lỗi / tạo nhầm trên Odoo, không cần gửi bảo hành"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onKhongGui(d);
              }}
            >
              🗑 Hủy đơn lỗi
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
      <p className="mb-2 text-xs text-[var(--ink-soft)]">
        Đơn bảo hành đã tạo trên Odoo, thuộc KTV <b className="text-[var(--ink-body)]">{ktvEmail}</b>, chưa đưa vào thùng nào. Mã ca, linh kiện, số lượng và mô tả lỗi được điền sẵn.
      </p>
      {err && <p className="mb-2 rounded-lg bg-[var(--red-100)] px-3 py-2 text-xs font-semibold text-[var(--red-700)]">{err}</p>}
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
// gui neu tat nham)", doi ten "Huy don loi" cung ngay. Danh dau 1 don Odoo huy -> an khoi danh sach cho
// gui + so viec, bao trang thai "khong_gui" ve dvbh; mo lai o tab "Hủy bỏ".
export function KhongGuiModal({ don, ktvEmail, onClose, onDone }: { don: OdooDon; ktvEmail?: string | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const ma = don.ma_don ?? "#" + don.odoo_id;
  const submit = async () => {
    setBusy(true);
    try {
      await api.post("/odoo-don/" + don.odoo_id + "/khong-gui", { ly_do: lyDo.trim() || undefined, ktv_email: ktvEmail || undefined });
      toast("Đã hủy đơn lỗi " + ma + ".", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Xác nhận hủy đơn lỗi"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Quay lại
          </Btn>
          <Btn variant="danger" disabled={busy} onClick={submit}>
            Hủy đơn lỗi
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">
          Đơn <b className="font-mono text-[var(--link)]">{ma}</b> — {lkLabel(don.ten_linh_kien, don.ma_linh_kien) || "—"} sẽ chuyển sang mục "Hủy bỏ" và không cần gửi bảo hành. Nếu
          bấm nhầm, mở lại ở mục "Hủy bỏ".
        </p>
        <Field label="Lý do (không bắt buộc)">
          <Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Tạo nhầm trên Odoo, không cần gửi bảo hành" />
        </Field>
      </div>
    </Modal>
  );
}

// Danh sach don da huy (don loi) + nut "Mo lai" - dung chung cho tab "Hủy bỏ" va muc thu gon trong modal
// "Chọn đơn Odoo". 20 don/trang.
export function OdooHuyList({ items, ktvEmail, onChanged }: { items: OdooDon[]; ktvEmail?: string | null; onChanged: () => void }) {
  const toast = useToast();
  useUserNames(); // ve lai khi bang ten tai xong
  const [busyId, setBusyId] = useState<number | null>(null);
  const pg = useClientPage(items);
  if (items.length === 0) return <p className="text-sm text-[var(--ink-faint)]">Chưa có đơn nào bị hủy.</p>;
  const moLai = async (d: OdooDon) => {
    setBusyId(d.odoo_id);
    try {
      await api.post("/odoo-don/" + d.odoo_id + "/mo-lai", { ktv_email: ktvEmail || undefined });
      toast("Đã mở lại đơn " + (d.ma_don ?? "#" + d.odoo_id) + " — đơn quay về mục Chưa gửi.", "ok");
      onChanged();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div className="space-y-1">
      {pg.pageItems.map((d) => (
        <div key={d.odoo_id} className="flex flex-col gap-2 rounded-lg border border-dashed border-[var(--line-strong)] bg-[var(--surface-2)] px-2.5 py-1 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs font-semibold text-[var(--ink-soft)] line-through">{d.ma_don ?? "#" + d.odoo_id}</span>
              <span className="font-mono text-xs text-[var(--ink-faint)]">{d.case_id}</span>
              <Badge tone="red">Đã hủy</Badge>
              <span className="min-w-0 truncate text-[13px] text-[var(--ink-soft)]">{lkLabel(d.ten_linh_kien, d.ma_linh_kien) || "—"}</span>
            </div>
            <div className="truncate text-[11px] text-[var(--ink-faint)]">
              {[d.khong_gui_ly_do, d.khong_gui_boi ? displayName(d.khong_gui_boi) : null, d.khong_gui_luc ? fmtDate(d.khong_gui_luc) : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <Btn size="sm" variant="secondary" disabled={busyId === d.odoo_id} onClick={() => moLai(d)} className="w-full sm:w-auto">
            ↺ Mở lại
          </Btn>
        </div>
      ))}
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
    </div>
  );
}

// Muc thu gon "Hủy bỏ (N)" duoi danh sach trong modal "Chọn đơn Odoo" (chi tiet phieu gui).
export function OdooKhongGuiSection({ items, ktvEmail, onChanged }: { items: OdooDon[]; ktvEmail?: string | null; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-[var(--line)] pt-3">
      <button
        type="button"
        className="focus-ring flex items-center gap-1.5 rounded text-xs font-semibold text-[var(--ink-soft)] hover:text-[var(--ink)]"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "▾" : "▸"}</span> Hủy bỏ ({items.length})
      </button>
      {open && (
        <div className="mt-2">
          <OdooHuyList items={items} ktvEmail={ktvEmail} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

// ---- Tab "Đã gửi": don Odoo da dua vao thung (phan trang server 20/trang). ----
export interface OdooDaGui {
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  ma_linh_kien: string | null;
  ten_linh_kien: string | null;
  so_luong: number | null;
  don_cha_id: string;
  phieu_gui_id: string;
  gan_luc: string | null;
  gui_tt: string | null;
  last_status: string | null;
  last_detail: string | null;
}

const TIEN_DO: Record<string, { label: string; tone: "gray" | "amber" | "blue" | "violet" | "orange" | "green" | "red" }> = {
  cho_gui: { label: "Trong thùng nháp", tone: "gray" },
  dang_gui: { label: "Đang gửi về kho", tone: "amber" },
  kho_da_nhan: { label: "Kho đã nhận", tone: "blue" },
  dang_xu_ly: { label: "Đang xử lý", tone: "blue" },
  cho_tra: { label: "Chờ trả KTV", tone: "orange" },
  dang_tra: { label: "Đang trả KTV", tone: "orange" },
  hoan_tat: { label: "Đã nhận lại", tone: "green" },
  tu_choi: { label: "Từ chối/huỷ", tone: "red" },
};

// Tien do: phieu con nhap / da gui / kho nhan doc truc tiep tu phieu gui (luon moi nhat); cac giai doan
// sau lay theo lan bao gan nhat ve dvbh (cron 15 phut).
function tienDo(d: OdooDaGui): string {
  if (d.gui_tt === "nhap") return "cho_gui";
  if (d.last_status && !["cho_gui", "dang_gui", "khong_gui"].includes(d.last_status)) return d.last_status;
  return d.gui_tt === "da_tiep_nhan" ? "kho_da_nhan" : "dang_gui";
}

export function OdooDaGuiList({ ktvEmail, reloadKey, onOpenPhieu }: { ktvEmail?: string | null; reloadKey: number; onOpenPhieu: (guiId: string) => void }) {
  const q = ktvEmail ? `?ktv_email=${encodeURIComponent(ktvEmail)}&_r=${reloadKey}` : `?_r=${reloadKey}`;
  const pg = usePagedApi<OdooDaGui>(`/odoo-don/da-gui${q}`, "don");
  if (pg.loading && pg.items.length === 0) return <Spinner />;
  if (pg.items.length === 0) return <p className="text-sm text-[var(--ink-faint)]">Chưa có đơn Odoo nào được đưa vào thùng.</p>;
  return (
    <div className="space-y-1">
      {pg.items.map((d) => {
        const st = TIEN_DO[tienDo(d)] ?? { label: tienDo(d), tone: "gray" as const };
        return (
          <button
            type="button"
            key={d.odoo_id}
            onClick={() => onOpenPhieu(d.phieu_gui_id)}
            className="focus-ring flex w-full items-start gap-2.5 rounded-lg border border-[var(--line)] px-2.5 py-1 text-left transition-colors hover:border-[var(--brand-300)] hover:bg-[var(--accent-soft)]"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-xs font-semibold text-[var(--link)]">{d.ma_don ?? `#${d.odoo_id}`}</span>
                <span className="font-mono text-xs text-[var(--ink-soft)]">{d.case_id}</span>
                <Badge tone={st.tone}>{st.label}</Badge>
                {d.last_detail && <span className="text-xs text-[var(--ink-soft)]">{d.last_detail}</span>}
                <span className="min-w-0 truncate text-[13px] font-medium text-[var(--ink-body)]">{lkLabel(d.ten_linh_kien, d.ma_linh_kien) || "—"}</span>
              </span>
              <span className="block truncate text-[11px] text-[var(--ink-faint)]">
                Thùng <b className="font-mono">{d.phieu_gui_id}</b> · đơn {d.don_cha_id}
                {d.gan_luc ? ` · đưa vào thùng ${fmtDate(d.gan_luc)}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-[var(--link)]">Mở thùng ›</span>
          </button>
        );
      })}
      <Pagination page={pg.page} pageCount={pg.pageCount} total={pg.total} onChange={pg.setPage} />
    </div>
  );
}
