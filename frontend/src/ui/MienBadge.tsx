import { useState } from "react";
import { Badge, Btn, Field, Select } from "./primitives";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { api, errorMessage } from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { canDoiMien, mienLabel, MIEN_DON_OPTIONS } from "../lib/mien";
import { displayName } from "../hooks/useUserNames";
import type { Mien } from "../lib/types";

// Badge mien cua 1 don (11/10/2026): MB xanh duong, MN cam, chua khai bao vang (can xu ly).
export function MienBadge({ mien, short }: { mien: Mien | null | undefined; short?: boolean }) {
  const tone = mien === "MB" ? "blue" : mien === "MN" ? "orange" : "amber";
  return (
    <Badge tone={tone}>
      {short ? (mien ?? "Chưa KB") : mienLabel(mien)}
    </Badge>
  );
}

// Badge mien + (neu duoc phep) bam de doi mien. kind: loai don; ktvEmail: KTV cua don (de hoi "chuyen
// luon KTV" khi don dang "chua khai bao"). Don cha thuoc phieu gui -> doi theo phieu gui (truyen
// kind="phieu-gui" + id phieu gui).
export function DoiMienBadge({
  kind,
  id,
  mien,
  ktvEmail,
  onDone,
  short,
}: {
  kind: "phieu-gui" | "don-cha" | "phieu-tra";
  id: string;
  mien: Mien | null | undefined;
  ktvEmail?: string | null;
  onDone?: () => void;
  short?: boolean;
}) {
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const [open, setOpen] = useState(false);
  if (!canDoiMien(user)) return <MienBadge mien={mien} short={short} />;
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title="Bấm để đổi miền"
        className="inline-flex items-center gap-0.5 rounded-full hover:opacity-80"
      >
        <MienBadge mien={mien} short={short} />
        <span className="text-[10px] text-[var(--ink-faint)]">✎</span>
      </button>
      {open && <DoiMienModal kind={kind} id={id} mien={mien ?? null} ktvEmail={ktvEmail} onClose={() => setOpen(false)} onDone={() => { setOpen(false); onDone?.(); }} />}
    </>
  );
}

function DoiMienModal({ kind, id, mien, ktvEmail, onClose, onDone }: { kind: "phieu-gui" | "don-cha" | "phieu-tra"; id: string; mien: Mien | null; ktvEmail?: string | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [val, setVal] = useState<string>(mien ?? "");
  const [chuyenKtv, setChuyenKtv] = useState(true);
  const [busy, setBusy] = useState(false);
  const hoiKtv = mien === null && !!val && !!ktvEmail && ktvEmail.includes("@") && kind !== "don-cha";
  const tenKtv = ktvEmail ? displayName(ktvEmail) : "";

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: boolean; ktv?: { ok: boolean; so_thung: number } | null }>(`/mien/${kind}/${encodeURIComponent(id)}`, { mien: val || null, chuyen_ktv: hoiKtv && chuyenKtv });
      let msg = `Đã chuyển ${id} sang ${mienLabel((val || null) as Mien | null)}.`;
      if (r.ktv?.ok) msg += ` KTV ${tenKtv} đã chuyển tạm sang ${mienLabel(val as Mien)}${r.ktv.so_thung > 0 ? ` (kèm ${r.ktv.so_thung} thùng chưa khai báo khác)` : ""}.`;
      else if (r.ktv && !r.ktv.ok) msg += ` Không tìm thấy KTV ${tenKtv} trong danh bạ nên chưa chuyển được KTV.`;
      toast(msg, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Đổi miền · ${id}`}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || val === (mien ?? "")} onClick={submit}>
            Lưu
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--ink-soft)]">
          Hiện tại: <MienBadge mien={mien} />
          {kind === "phieu-gui" && <span className="block mt-1 text-xs">Áp dụng cho cả thùng và mọi đơn bảo hành bên trong.</span>}
        </p>
        <Field label="Chuyển sang">
          <Select value={val} onChange={(e) => setVal(e.target.value)}>
            {MIEN_DON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {hoiKtv && (
          <label className="flex items-start gap-2 rounded-lg border border-[var(--amber-200)] bg-[var(--amber-50)] p-2.5 text-sm text-[var(--ink-body)]">
            <input type="checkbox" className="mt-0.5 w-4 h-4" checked={chuyenKtv} onChange={(e) => setChuyenKtv(e.target.checked)} />
            <span>
              Chuyển luôn tài khoản KTV <b>{tenKtv}</b> sang <b>{mienLabel(val as Mien)}</b> (tạm thời — Admin hệ thống chỉnh lại ở Danh sách KTV nếu cần). Các thùng "chưa khai báo" khác của KTV này cũng được chuyển theo.
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
