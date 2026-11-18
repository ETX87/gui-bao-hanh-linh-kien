import { useState } from "react";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { ThungTonBar } from "../shared/ThungTonBar";
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
import { FilterBar, useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, TON_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { KhoTuChoiThungModal } from "../kho/KhoTuChoiThungModal";

// 21/10/2026: "bổ sung tìm kiếm ở các danh sách table" - loc + tim cho danh sach thung (Admin BH).
export const THUNG_DEFS: FilterDef[] = [
  { key: "ktv", label: "KTV gửi", kind: "person" },
  { key: "kho", label: "Kho nhận", kind: "person" },
  { key: "hinh_thuc_gui", label: "Hình thức gửi", kind: "map", labels: HINH_THUC_GUI_LABELS },
  { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" },
  TON_DEF,
  CANH_BAO_DEF,
  KHOANG_DEF,
];
export const THUNG_PLACEHOLDER = "Tìm mã thùng, vận đơn, nhà xe, KTV, mã case, tên khách, linh kiện bên trong…";


// 20/10/2026: "admin bh có thể tự xác nhận hộ cho kho nếu thực tế hàng đã về đế tay admin bh (Ktv giao
// trực tiếp)" - thung dang gui ve Kho (da_gui), Admin bam "Nhan ho Kho" -> bo qua Kho tiep nhan + tiep
// nhan noi bo (POST /admin/phieu-gui/:id/nhan-ho-kho).
export function ThungDangGuiCard({ onDone, reloadKey, alwaysOpen }: { onDone: () => void; reloadKey: number; alwaysOpen?: boolean }) {
  const flt = useListFilters("/admin/phieu-gui?trang_thai=da_gui", THUNG_DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, reload } = usePagedApi<PhieuGui>(withQuery(`/admin/phieu-gui?trang_thai=da_gui&_k=${reloadKey}`, flt.query), "phieu_gui");
  const [open, setOpen] = useState(!!alwaysOpen);
  const [pick, setPick] = useState<PhieuGui | null>(null);
  const [view, setView] = useState<PhieuGui | null>(null);
  const [tc, setTc] = useState<PhieuGui | null>(null);
  if (total === 0 && !flt.active && !alwaysOpen) return null;
  return (
    <Card className="px-3 py-2">
      <button type="button" className="flex items-center gap-2 text-left w-full" onClick={() => setOpen((o) => !o)}>
        <span className="text-xs">{open ? "▾" : "▸"}</span>
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🚚 Thùng đang gửi về Kho ({total})</h3>
        <span className="text-xs text-[var(--ink-soft)] hidden md:inline">— hàng đã về tay Admin (KTV giao trực tiếp) thì bấm "Nhận hộ Kho" để bỏ qua bước Kho</span>
      </button>
      {open && (
        <>
          <div className="mt-1.5 space-y-1.5">
            <ThungTonBar tt="da_gui" value={flt.values.ton || ""} onChange={(v) => flt.set("ton", v)} reloadKey={total} onOpen={(id) => setView(items.find((x) => x.id === id) || ({ id, trang_thai: "da_gui" } as PhieuGui))} />
            <FilterBar f={flt} defs={THUNG_DEFS} placeholder={THUNG_PLACEHOLDER} />
          </div>
          {items.length === 0 && <p className="text-sm text-[var(--ink-faint)]">Không có thùng nào khớp bộ lọc.</p>}
          <div className="mt-1.5 flex flex-col md:flex-row md:flex-wrap gap-1.5">
            {items.map((g) => (
              <div key={g.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pl-2 pr-1 py-0.5 flex items-center gap-2 text-[13px] cursor-pointer hover:bg-[var(--surface)]" onClick={() => setView(g)} title="Bấm để mở thùng xem bên trong">
                <span className="font-mono text-xs font-semibold text-[var(--link)] shrink-0">{g.id}</span>
                <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate max-w-[180px]" />
                <span className="text-xs text-[var(--ink-soft)] shrink-0">
                  {g.so_don ?? 0} đơn · {HINH_THUC_GUI_LABELS[g.hinh_thuc_gui || ""] || g.hinh_thuc_gui || "—"}
                </span>
                <SlaBadge since={g.updated_at} gd="thung_dang_gui" ton />
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
            <>
              <Btn variant="ghost" className="text-[var(--red-700)]" onClick={() => setTc(view)}>
                ⛔ Chưa nhận được hàng
              </Btn>
              <Btn variant="primary" onClick={() => setPick(view)}>
                Nhận hộ Kho
              </Btn>
            </>
          }
        />
      )}
      {tc && <KhoTuChoiThungModal gui={tc} onClose={() => setTc(null)} onDone={() => { setTc(null); setView(null); reload(); onDone(); }} />}
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
