import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select } from "../../ui/primitives";
import { FAST_ACTION_ICONS } from "../../lib/constants";
import { useNvList } from "../../hooks/useNvList";
import { useLyDoTuChoi } from "../../hooks/useSettings";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DonVi, FastActionMeta } from "../../lib/types";

// Luoi 10 nut "Xu ly nhanh" (FAST) - port dung openFastActionsModal()/completeFastAction() cua
// prototype. Bam 1-cham voi 6/10 nut, 4 nut con lai (sua_chua_fast/doi_moi_pd/tru_no_pd/sua_chua_pd)
// mo them 1 form nho hoi field bat buoc (NV/mail phe duyet) truoc khi ap dung - dung cach nguoi dung
// da chot (khong tu doan). 2 nut "special" (bo_sung_tt/bao_cao_sai) dieu huong sang modal rieng qua
// onNavigate thay vi tu xu ly tai day.

export function FastActionsModal({
  unit,
  isKhachLe,
  onClose,
  onDone,
  onNavigate,
}: {
  unit: DonVi;
  isKhachLe: boolean;
  onClose: () => void;
  onDone: () => void;
  onNavigate: (special: "bo_sung_tt" | "bao_cao_sai") => void;
}) {
  const [actions, setActions] = useState<FastActionMeta[]>([]);
  const [picked, setPicked] = useState<FastActionMeta | null>(null);

  useEffect(() => {
    api.get<{ fast_actions: FastActionMeta[] }>("/admin/fast-actions").then((r) => setActions(r.fast_actions));
  }, []);

  const visible = isKhachLe ? actions.filter((a) => a.special !== "bo_sung_tt" && a.special !== "bao_cao_sai") : actions;

  if (picked) {
    if (picked.special) return null; // khong xay ra - da dieu huong ngay khi bam
    return <FastActionForm unit={unit} meta={picked} onClose={onClose} onDone={onDone} onBack={() => setPicked(null)} />;
  }

  return (
    <Modal title={`⚡ Xử lý nhanh — ${unit.id}`} onClose={onClose} maxWidthClass="max-w-lg">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map((a) => (
          <button
            key={a.key}
            onClick={() => (a.special ? onNavigate(a.special) : setPicked(a))}
            className="focus-ring flex flex-col items-center gap-2 rounded-xl border border-[var(--line)] p-4 text-center hover:border-[var(--brand-400)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <span className="text-2xl">{FAST_ACTION_ICONS[a.key] || "⚡"}</span>
            <span className="text-xs font-semibold text-[var(--ink-body)] leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function FastActionForm({ unit, meta, onClose, onDone, onBack }: { unit: DonVi; meta: FastActionMeta; onClose: () => void; onDone: () => void; onBack: () => void }) {
  const toast = useToast();
  const nvList = useNvList();
  const overdue = useSlaGate(unit.updated_at);
  const needsNv = meta.huong && ["sua_chua", "dich_vu_tinh_phi"].includes(meta.huong);
  const needsMailPd = meta.loaiBH === "ngoai_bh";
  // "Từ chối" (khong co ly do huy dat san) phai hoi ly do huy - truoc day form khong hoi nen backend
  // luon tra 400 REQUIRE_LY_DO_TU_CHOI (ra soat Admin BH 05/10/2026).
  const needsLyDoTuChoi = meta.huong === "tu_choi" && !meta.lyDoTuChoi;
  const { items: lyDoTuChoiList } = useLyDoTuChoi();

  const [nv, setNv] = useState("");
  const [mailPd, setMailPd] = useState("");
  const [maPd, setMaPd] = useState("");
  const [lyDoCham, setLyDoCham] = useState("");
  const [lyDoTuChoi, setLyDoTuChoi] = useState("");
  const [busy, setBusy] = useState(false);

  const needsForm = needsNv || needsMailPd || needsLyDoTuChoi || overdue;
  const valid = (!needsNv || nv) && (!needsMailPd || mailPd.trim()) && (!needsLyDoTuChoi || lyDoTuChoi) && (!overdue || lyDoCham);

  const apply = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${unit.id}/fast/${meta.key}`, { nv: needsNv ? nv : undefined, mail_pd: needsMailPd ? mailPd : undefined, ma_phe_duyet: maPd || undefined, ly_do_cham: overdue ? lyDoCham : undefined, ly_do_tu_choi: needsLyDoTuChoi ? lyDoTuChoi : undefined });
      toast(`Đã áp dụng: ${meta.label}`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // Neu khong can hoi gi them (khong qua han, khong can NV/mail PD) - ap dung ngay khi mo, khong bat
  // nguoi dung phai bam them 1 lan "Xac nhan" vo nghia.
  useEffect(() => {
    if (!needsForm) apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!needsForm) return null;

  return (
    <Modal title={meta.label} onClose={onClose} maxWidthClass="max-w-sm">
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        {needsNv && (
          <Field label="Nhân viên sửa chữa phụ trách" required>
            <Select value={nv} onChange={(e) => setNv(e.target.value)}>
              <option value="">— Chọn NV —</option>
              {nvList.map((n) => (
                <option key={n.email} value={n.email}>
                  {n.ten || n.email}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needsLyDoTuChoi && (
          <Field label="Lý do huỷ" required>
            <Select value={lyDoTuChoi} onChange={(e) => setLyDoTuChoi(e.target.value)}>
              <option value="">— Chọn lý do —</option>
              {lyDoTuChoiList.filter((l) => !!l.bat_tat).map((l) => (
                <option key={l.id} value={l.noi_dung}>
                  {l.noi_dung}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needsMailPd && (
          <>
            <Field label="Thông tin mail phê duyệt" required>
              <Input value={mailPd} onChange={(e) => setMailPd(e.target.value)} />
            </Field>
            <Field label="Mã phê duyệt">
              <Input value={maPd} onChange={(e) => setMaPd(e.target.value)} />
            </Field>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Btn onClick={onBack}>← Quay lại</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={apply}>
            Áp dụng
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
