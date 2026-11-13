import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, Card, EmptyState, Field, FIELD_CLASS } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { useToast } from "../../ui/Toast";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { UserName } from "../../hooks/useUserNames";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import type { AppUser, PhieuGui } from "../../lib/types";

// 13/11/2026 - Admin BH tu choi tiep nhan thung tu Kho -> Kho phan hoi -> KTV phan hoi (7 ngay, qua han tu huy).
// Kho / KTV khong dong y -> thung ve luong binh thuong. Admin "Rut lai" khi tu choi nham. Backend: routes/tuChoiThung.ts.

const TT_LABEL: Record<string, { label: string; tone: "red" | "amber" | "gray" }> = {
  cho_kho: { label: "⛔ Admin từ chối — chờ Kho phản hồi", tone: "red" },
  cho_ktv: { label: "⛔ Kho đồng ý — chờ KTV phản hồi", tone: "amber" },
  da_huy: { label: "Thùng đã huỷ", tone: "gray" },
};

function conLai(han: string | null | undefined): string {
  if (!han) return "";
  const ms = new Date(han.replace(" ", "T") + "Z").getTime() - (Date.now() + 7 * 3600000);
  if (ms <= 0) return "đã quá hạn — sắp tự huỷ";
  const ngay = Math.floor(ms / 86400000);
  const gio = Math.floor((ms % 86400000) / 3600000);
  return `còn ${ngay > 0 ? `${ngay} ngày ` : ""}${gio} giờ`;
}

// Khoi tom tat trang thai tu choi (dung trong chi tiet thung + the danh sach).
export function TuChoiInfo({ g }: { g: PhieuGui }) {
  const tt = g.tu_choi_tt;
  const ph = g.phan_hoi_luc && !tt;
  if (!tt && !ph) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-[13px] space-y-0.5 ${tt === "da_huy" ? "border-[var(--line)] bg-[var(--surface-2)]" : tt ? "border-[var(--red-200)] bg-[var(--red-50)]" : "border-[var(--amber-200)] bg-[var(--amber-50)]"}`}>
      {tt && <p className="font-semibold text-[var(--ink)]">{TT_LABEL[tt]?.label ?? tt}</p>}
      {g.tu_choi_ly_do && (tt || ph) && (
        <p>
          <b>Admin BH từ chối</b>{g.tu_choi_lan > 1 ? ` (lần ${g.tu_choi_lan})` : ""}: {g.tu_choi_ly_do}
          <span className="text-[var(--ink-soft)]"> · <UserName email={g.tu_choi_boi} /> {fmtDate(g.tu_choi_luc)}</span>
        </p>
      )}
      {g.kho_y_kien && tt && tt !== "cho_kho" && (
        <p>
          <b>Kho đồng ý</b>: {g.kho_y_kien}
          <span className="text-[var(--ink-soft)]"> · <UserName email={g.kho_y_kien_boi} /> {fmtDate(g.kho_y_kien_luc)}</span>
        </p>
      )}
      {tt === "cho_ktv" && <p className="text-[var(--red-700)] font-semibold">KTV phản hồi trước {fmtDate(g.tu_choi_han)} ({conLai(g.tu_choi_han)}) — quá hạn không phản hồi, thùng tự huỷ.</p>}
      {ph && (
        <p>
          <b>{g.phan_hoi_vai_tro === "ktv" ? "KTV" : "Kho"} không đồng ý từ chối</b>: {g.phan_hoi_ly_do}
          <span className="text-[var(--ink-soft)]"> · <UserName email={g.phan_hoi_boi} /> {fmtDate(g.phan_hoi_luc)}</span>
        </p>
      )}
    </div>
  );
}

// Admin BH nhap ly do tu choi.
export function TuChoiModal({ g, onClose, onDone }: { g: PhieuGui; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const gui = async () => {
    setBusy(true);
    try {
      await api.post(`/tu-choi-thung/${g.id}/tu-choi`, { ly_do: lyDo });
      toast("Đã từ chối thùng — đã báo Kho phản hồi.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`⛔ Từ chối tiếp nhận thùng ${g.id}`} onClose={onClose} maxWidthClass="max-w-lg"
      footerActions={<><Btn onClick={onClose}>Huỷ</Btn><Btn variant="danger" disabled={!lyDo.trim() || busy} onClick={gui}>Từ chối & báo Kho</Btn></>}>
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-body)]">
          Kho sẽ phải xác nhận <b>đồng ý</b> hoặc <b>không đồng ý</b>. Kho đồng ý thì KTV được báo và có {7} ngày phản hồi; quá hạn không phản hồi, thùng tự huỷ. Từ chối nhầm thì bấm "Rút lại" ở tab Thùng hàng › Từ chối.
        </p>
        <Field label="Lý do từ chối" required>
          <textarea className={FIELD_CLASS} rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: thùng không có hàng / sai KTV / hàng không thuộc bảo hành…" />
        </Field>
      </div>
    </Modal>
  );
}

// Kho / KTV phan hoi dong y / khong dong y.
export function PhanHoiTuChoiModal({ g, vaiTro, onClose, onDone }: { g: PhieuGui; vaiTro: "kho" | "ktv"; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [dongY, setDongY] = useState<boolean | null>(null);
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const canLyDo = vaiTro === "kho" || dongY === false;
  const gui = async () => {
    if (dongY === null) return;
    if (vaiTro === "ktv" && dongY && !confirm(`Đồng ý huỷ thùng ${g.id}? Các đơn bên trong sẽ bị huỷ; đơn Odoo về lại "Chưa gửi" để bạn gửi lại nếu cần.`)) return;
    setBusy(true);
    try {
      await api.post(`/tu-choi-thung/${g.id}/${vaiTro}`, { dong_y: dongY, ly_do: lyDo });
      toast(dongY ? (vaiTro === "kho" ? "Đã đồng ý — đã báo KTV." : "Đã huỷ thùng.") : "Đã gửi ý kiến không đồng ý — thùng về luồng bình thường.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Phản hồi từ chối thùng ${g.id}`} onClose={onClose} maxWidthClass="max-w-lg"
      footerActions={<><Btn onClick={onClose}>Đóng</Btn><Btn variant="primary" disabled={dongY === null || (canLyDo && !lyDo.trim()) || busy} onClick={gui}>Gửi phản hồi</Btn></>}>
      <div className="space-y-3">
        <TuChoiInfo g={g} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button type="button" onClick={() => setDongY(true)} className={`rounded-lg border px-3 py-2.5 text-left text-sm ${dongY === true ? "border-[var(--brand-500)] bg-[var(--accent-soft)] font-semibold" : "border-[var(--line)]"}`}>
            ✔ Đồng ý từ chối
            <span className="block text-xs text-[var(--ink-soft)] font-normal">{vaiTro === "kho" ? "Báo KTV phản hồi (7 ngày)" : "Thùng bị huỷ, đơn Odoo về \"Chưa gửi\""}</span>
          </button>
          <button type="button" onClick={() => setDongY(false)} className={`rounded-lg border px-3 py-2.5 text-left text-sm ${dongY === false ? "border-[var(--red-400)] bg-[var(--red-50)] font-semibold" : "border-[var(--line)]"}`}>
            ✖ Không đồng ý
            <span className="block text-xs text-[var(--ink-soft)] font-normal">Thùng về luồng bình thường, Admin BH xem lại</span>
          </button>
        </div>
        <Field label={canLyDo ? "Lý do" : "Ghi chú (tuỳ chọn)"} required={canLyDo}>
          <textarea className={FIELD_CLASS} rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// Danh sach thung dang bi tu choi / da huy (tab Thung hang › Tu choi; the KTV).
export function ThungTuChoiList({ user, tt, compact }: { user: AppUser; tt: "dang" | "cho_kho" | "cho_ktv" | "da_huy"; compact?: boolean }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const { items, total, page, pageCount, setPage, reload } = usePagedApi<PhieuGui>(`/tu-choi-thung?tt=${tt}`, "phieu_gui");
  const [view, setView] = useState<PhieuGui | null>(null);
  const [phanHoi, setPhanHoi] = useState<{ g: PhieuGui; vaiTro: "kho" | "ktv" } | null>(null);
  const after = () => {
    reload();
    refresh();
  };
  const isAdmin = user.la_admin_bh || user.la_qtri;
  const isKho = user.la_kho || user.la_qtri;
  const isOwner = (g: PhieuGui) => g.nguoi_tao === user.email || g.nguoi_tao_ho === user.email || user.la_qtri;
  const rutLai = async (g: PhieuGui) => {
    if (!confirm(`Rút lại từ chối thùng ${g.id}? Thùng về chờ Admin tiếp nhận như bình thường.`)) return;
    try {
      await api.post(`/tu-choi-thung/${g.id}/rut-lai`, {});
      toast("Đã rút lại từ chối.", "ok");
      after();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };
  const nut = (g: PhieuGui) => (
    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
      {g.tu_choi_tt === "cho_kho" && isKho && <Btn variant="primary" size="sm" onClick={() => setPhanHoi({ g, vaiTro: "kho" })}>Kho phản hồi</Btn>}
      {g.tu_choi_tt === "cho_ktv" && isOwner(g) && <Btn variant="primary" size={compact ? "touch" : "sm"} onClick={() => setPhanHoi({ g, vaiTro: "ktv" })}>Phản hồi</Btn>}
      {(g.tu_choi_tt === "cho_kho" || g.tu_choi_tt === "cho_ktv") && isAdmin && <Btn size="sm" onClick={() => rutLai(g)}>↩ Rút lại</Btn>}
    </div>
  );
  if (compact && total === 0) return null;
  return (
    <>
      {compact ? (
        items.map((g) => (
          <div key={g.id} className="rounded-xl border border-[var(--red-200)] bg-[var(--surface)] p-3 shadow-card space-y-2 cursor-pointer" onClick={() => setView(g)}>
            <p className="text-[15px] font-bold text-[var(--ink)]">⛔ Thùng {g.id} bị từ chối · {g.so_don ?? 0} đơn</p>
            <TuChoiInfo g={g} />
            {nut(g)}
          </div>
        ))
      ) : (
        <Card className="p-3 space-y-2">
          <h3 className="text-sm font-bold text-[var(--ink)]">{tt === "da_huy" ? `Thùng đã huỷ do từ chối (${total})` : `⛔ Thùng đang bị từ chối (${total})`}</h3>
          {items.length === 0 && <EmptyState text={tt === "da_huy" ? "Chưa có thùng nào bị huỷ." : "Không có thùng nào đang bị từ chối."} />}
          {items.map((g) => (
            <div key={g.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-2 space-y-1.5 cursor-pointer hover:bg-[var(--surface)]" onClick={() => setView(g)}>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="font-mono text-xs font-semibold text-[var(--link)]">{g.id}</span>
                <UserName email={g.nguoi_tao} className="text-[var(--ink-body)]" />
                <span className="text-xs text-[var(--ink-soft)]">{g.so_don ?? 0} đơn</span>
                {g.tu_choi_tt && <Badge tone={TT_LABEL[g.tu_choi_tt]?.tone ?? "gray"}>{TT_LABEL[g.tu_choi_tt]?.label ?? g.tu_choi_tt}</Badge>}
                <span className="ml-auto">{nut(g)}</span>
              </div>
              <TuChoiInfo g={g} />
            </div>
          ))}
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </Card>
      )}
      {view && <PhieuGuiDetailModal guiId={view.id} onClose={() => setView(null)} onChanged={after} actions={nut(view)} />}
      {phanHoi && (
        <PhanHoiTuChoiModal
          g={phanHoi.g}
          vaiTro={phanHoi.vaiTro}
          onClose={() => setPhanHoi(null)}
          onDone={() => {
            setPhanHoi(null);
            setView(null);
            after();
          }}
        />
      )}
    </>
  );
}
