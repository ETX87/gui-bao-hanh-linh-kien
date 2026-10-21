import { useState } from "react";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { api, errorMessage } from "../../lib/api";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Card, Btn, Field, Input } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { SlaBadge } from "../../ui/SlaBadge";
import { HINH_THUC_GUI_LABELS } from "../../lib/constants";
import { UserName } from "../../hooks/useUserNames";
import type { PhieuGui } from "../../lib/types";

// 20/10/2026: "admin bh có thể tự xác nhận hộ cho kho nếu thực tế hàng đã về đế tay admin bh (Ktv giao
// trực tiếp)" - thung dang gui ve Kho (da_gui), Admin bam "Nhan ho Kho" -> bo qua Kho tiep nhan + tiep
// nhan noi bo (POST /admin/phieu-gui/:id/nhan-ho-kho).
export function ThungDangGuiCard({ onDone, reloadKey }: { onDone: () => void; reloadKey: number }) {
  const { items, total, page, pageCount, setPage, reload } = usePagedApi<PhieuGui>(`/admin/phieu-gui?trang_thai=da_gui&_k=${reloadKey}`, "phieu_gui");
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<PhieuGui | null>(null);
  const [view, setView] = useState<PhieuGui | null>(null);
  if (total === 0) return null;
  return (
    <Card className="px-3 py-2">
      <button type="button" className="flex items-center gap-2 text-left w-full" onClick={() => setOpen((o) => !o)}>
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🚚 Thùng đang gửi về Kho ({total})</h3>
        <span className="text-xs text-[var(--ink-soft)] hidden md:inline">— hàng đã về tay Admin (KTV giao trực tiếp) thì bấm "Nhận hộ Kho" để bỏ qua bước Kho</span>
      </button>
      {open && (
        <>
          <div className="mt-1.5 flex flex-col md:flex-row md:flex-wrap gap-1.5">
            {items.map((g) => (
              <div key={g.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pl-2 pr-1 py-0.5 flex items-center gap-2 text-[13px] cursor-pointer hover:bg-[var(--surface)]" onClick={() => setView(g)} title="Bấm để mở thùng xem bên trong">
                <span className="font-mono text-xs font-semibold text-[var(--link)] shrink-0">{g.id}</span>
                <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate max-w-[180px]" />
                <span className="text-xs text-[var(--ink-soft)] shrink-0">
                  {g.so_don ?? 0} đơn · {HINH_THUC_GUI_LABELS[g.hinh_thuc_gui || ""] || g.hinh_thuc_gui || "—"}
                </span>
                <SlaBadge since={g.updated_at} />
                <Btn size="sm" variant="secondary" className="ml-auto shrink-0" onClick={(e) => { e.stopPropagation(); setPick(g); }}>
                  Nhận hộ Kho
                </Btn>
              </div>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </>
      )}
      {view && (
        <PhieuGuiDetailModal
          guiId={view.id}
          onClose={() => setView(null)}
          onChanged={reload}
          actions={
            <Btn variant="primary" onClick={() => setPick(view)}>
              Nhận hộ Kho
            </Btn>
          }
        />
      )}
      {pick && (
        <NhanHoModal
          thung={pick}
          onClose={() => setPick(null)}
          onDone={() => {
            setPick(null);
            setView(null);
            reload();
            onDone();
          }}
        />
      )}
    </Card>
  );
}

function NhanHoModal({ thung, onClose, onDone }: { thung: PhieuGui; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ghiChu, setGhiChu] = useState("");
  const [tuSl, setTuSl] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ so_don_vi: number }>(`/admin/phieu-gui/${thung.id}/nhan-ho-kho`, { ghi_chu: ghiChu, tu_xac_nhan_sl: tuSl });
      toast(`Đã nhận hộ Kho thùng ${thung.id}${tuSl ? ` — tách ${r.so_don_vi} đơn vị chờ phân loại` : ""}.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Nhận hộ Kho — ${thung.id}`} onClose={onClose} maxWidthClass="max-w-md">
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">
          Xác nhận hàng của thùng này đã về tay Admin bảo hành (VD KTV giao trực tiếp). Thùng sẽ bỏ qua bước Kho tiếp nhận và bước tiếp nhận nội bộ.
        </p>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-0.5" checked={tuSl} onChange={(e) => setTuSl(e.target.checked)} />
          <span>Xác nhận luôn số lượng = số lượng KTV khai ({thung.so_don ?? 0} đơn) → đơn vào thẳng hàng chờ phân loại</span>
        </label>
        <Field label="Ghi chú (tuỳ chọn)">
          <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="VD: KTV mang đến văn phòng" />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            Xác nhận đã nhận
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
