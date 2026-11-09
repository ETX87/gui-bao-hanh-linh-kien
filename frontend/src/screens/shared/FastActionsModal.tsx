import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, Textarea } from "../../ui/primitives";
import { FAST_ACTION_ICONS } from "../../lib/constants";
import { isOverdue } from "../../lib/format";
import { useNvList } from "../../hooks/useNvList";
import { useLyDoTuChoi } from "../../hooks/useSettings";
import { LyDoChamGateField } from "./LyDoChamGateField";
import { ktvChangeLines, confirmKtvChange } from "../../lib/ktvDeXuat";
import type { DonVi, FastActionMeta } from "../../lib/types";

// Luoi 10 nut "Xu ly nhanh" (FAST) - port dung openFastActionsModal()/completeFastAction() cua
// prototype. Bam 1-cham voi cac nut khong can hoi them; nut can NV / mail phe duyet / ly do huy / xu
// ly xac (Doi moi, 05/10/2026) mo 1 form nho truoc khi ap dung. 2 nut "special" (bo_sung_tt/bao_cao_sai)
// dieu huong sang modal rieng qua onNavigate.
//
// 05/10/2026: dung duoc cho NHIEU don vi cung luc (`units`) - Admin chon 1 lan (NV / mail PD / ly do /
// xu ly xac / ly do cham) ap cho tat ca, goi POST /admin/don-vi/fast-hang-loat/:key. Che do nhieu don an
// 2 nut special (gan voi 1 don cha cu the).

export function FastActionsModal({
  unit,
  units,
  isKhachLe,
  onClose,
  onDone,
  onNavigate,
}: {
  unit?: DonVi;
  units?: DonVi[];
  isKhachLe: boolean;
  onClose: () => void;
  onDone: () => void;
  onNavigate?: (special: "bo_sung_tt" | "bao_cao_sai") => void;
}) {
  const list = units ?? (unit ? [unit] : []);
  const bulk = list.length > 1;
  const [actions, setActions] = useState<FastActionMeta[]>([]);
  const [picked, setPicked] = useState<FastActionMeta | null>(null);

  useEffect(() => {
    api.get<{ fast_actions: FastActionMeta[] }>("/admin/fast-actions").then((r) => setActions(r.fast_actions));
  }, []);

  const visible = isKhachLe || bulk || !onNavigate ? actions.filter((a) => !a.special) : actions;

  if (picked) {
    if (picked.special) return null; // khong xay ra - da dieu huong ngay khi bam
    return <FastActionForm units={list} meta={picked} onClose={onClose} onDone={onDone} onBack={() => setPicked(null)} />;
  }

  return (
    <Modal title={bulk ? `⚡ Xử lý nhanh hàng loạt — ${list.length} đơn vị` : `⚡ Xử lý nhanh — ${list[0]?.id ?? ""}`} onClose={onClose} maxWidthClass="max-w-lg">
      {bulk && <p className="mb-3 rounded-lg bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-bold px-3 py-2">Áp dụng cùng 1 phương án cho cả {list.length} đơn vị đã chọn.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {visible.map((a) => (
          <button
            key={a.key}
            onClick={() => (a.special ? onNavigate?.(a.special) : setPicked(a))}
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

function FastActionForm({ units, meta, onClose, onDone, onBack }: { units: DonVi[]; meta: FastActionMeta; onClose: () => void; onDone: () => void; onBack: () => void }) {
  const toast = useToast();
  const nvList = useNvList();
  const bulk = units.length > 1;
  const overdueCount = units.filter((u) => isOverdue(u.updated_at)).length;
  const overdue = overdueCount > 0;
  const needsNv = meta.huong && ["sua_chua", "dich_vu_tinh_phi"].includes(meta.huong);
  const needsMailPd = meta.loaiBH === "ngoai_bh";
  // "Từ chối" phai hoi ly do huy (ra soat Admin BH 05/10/2026). 09/11/2026: "Khi admin BH hủy hoặc từ
  // chối 1 đơn bh, phải chọn lý do hủy và ghi chú (tùy chọn)" -> MOI nut huy deu mo form (ke ca "Huỷ do
  // không có hàng": ly do chon san, doi duoc) + o ghi chu tuy chon.
  const needsLyDoTuChoi = meta.huong === "tu_choi";
  // Doi moi (20/10/2026): "Khi duyệt nhanh, trả xác mặc định là trả đối tác (đi tắt qua luôn). Admin bh
  // có thể thay đổi sau." -> khong hoi xu ly xac nua, backend tu ghi tra_doi_tac (doi lai trong UI chi tiet).
  const needsXuLyXac = false;
  const { items: lyDoTuChoiList } = useLyDoTuChoi();

  const [nv, setNv] = useState("");
  const [mailPd, setMailPd] = useState("");
  const [maPd, setMaPd] = useState("");
  const [lyDoCham, setLyDoCham] = useState("");
  const [lyDoTuChoi, setLyDoTuChoi] = useState(meta.lyDoTuChoi || "");
  const [ghiChuHuy, setGhiChuHuy] = useState("");
  const xuLyXac = "";
  const [busy, setBusy] = useState(false);

  const needsForm = needsNv || needsMailPd || needsLyDoTuChoi || needsXuLyXac || overdue;
  const valid = (!needsNv || nv) && (!needsMailPd || mailPd.trim()) && (!needsLyDoTuChoi || lyDoTuChoi) && (!needsXuLyXac || xuLyXac) && (!overdue || lyDoCham);

  const apply = async () => {
    // Nut ep loai doi tru (Tru cong no) ma KTV de xuat khac -> hoi xac nhan truoc.
    if (meta.loaiDoiTru && !confirmKtvChange(ktvChangeLines(units, meta.loaiDoiTru))) {
      if (!needsForm) onBack();
      return;
    }
    setBusy(true);
    const payload = {
      nv: needsNv ? nv : undefined,
      mail_pd: needsMailPd ? mailPd : undefined,
      ma_phe_duyet: maPd || undefined,
      ly_do_cham: overdue ? lyDoCham : undefined,
      ly_do_tu_choi: needsLyDoTuChoi ? lyDoTuChoi : undefined,
      ghi_chu_huy: needsLyDoTuChoi ? ghiChuHuy : undefined,
      xu_ly_xac: needsXuLyXac ? xuLyXac : undefined,
    };
    try {
      if (bulk) {
        const r = await api.post<{ applied: number; errors: Record<string, string> }>(`/admin/don-vi/fast-hang-loat/${meta.key}`, { ...payload, ids: units.map((u) => u.id) });
        const errCount = Object.keys(r.errors).length;
        if (errCount > 0) toast(`${meta.label}: đã áp dụng ${r.applied}/${units.length} — ${errCount} đơn lỗi (đã đổi trạng thái hoặc thiếu thông tin). Mở từng đơn để xử lý riêng.`, "error");
        else toast(`Đã áp dụng "${meta.label}" cho ${r.applied} đơn vị.`, "ok");
      } else {
        await api.post(`/admin/don-vi/${units[0].id}/fast/${meta.key}`, payload);
        toast(`Đã áp dụng: ${meta.label}`, "ok");
      }
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // Neu khong can hoi gi them - ap dung ngay khi mo, khong bat bam them 1 lan "Xac nhan" vo nghia.
  useEffect(() => {
    if (!needsForm) apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!needsForm) return null;

  return (
    <Modal title={bulk ? `${meta.label} — ${units.length} đơn vị` : meta.label} onClose={onClose} maxWidthClass="max-w-sm">
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        {bulk && overdue && <p className="text-xs text-[var(--ink-soft)]">{overdueCount}/{units.length} đơn đang quá hạn — lý do chậm áp cho các đơn này.</p>}
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
              {lyDoTuChoiList.filter((l) => !!l.bat_tat || l.noi_dung === lyDoTuChoi).map((l) => (
                <option key={l.id} value={l.noi_dung}>
                  {l.noi_dung}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needsLyDoTuChoi && (
          <Field label="Ghi chú huỷ (tuỳ chọn)">
            <Textarea rows={2} value={ghiChuHuy} onChange={(e) => setGhiChuHuy(e.target.value)} placeholder="Mô tả thêm lý do huỷ / từ chối…" />
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
            {bulk ? `Áp dụng cho ${units.length} đơn` : "Áp dụng"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
