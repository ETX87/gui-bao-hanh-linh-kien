import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { BEN_LABEL, CHU_BUOC_LABEL, VAI_GT_LABEL, buocOf, fmtGio, useBuoc } from "../../lib/buoc";
import { useLyDoCham } from "../../hooks/useSettings";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Badge, Btn, Card, Field, Select, Textarea } from "../../ui/primitives";
import { UserName } from "../../hooks/useUserNames";
import { useRoute } from "../../router/Router";
import { fmtDate } from "../../lib/format";
import type { AppUser } from "../../lib/types";
import { UnitDetailModal } from "./UnitDetailModal";
import { PhieuTraDetailModal } from "./PhieuTraDetailModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";

// 15/11/2026 - quan tri theo BUOC (yeu cau doi tac): "Việc theo bước" (moi buoc dang dung bao nhieu don, bao nhieu
// qua SLA, bao nhieu chua giai trinh) + "Cần giải trình" (viec qua SLA ma chinh minh phai giai trinh) + modal giai trinh.

export type GtEntity = "phieu_gui" | "phieu_sc" | "phieu_sc_ct" | "phieu_tra";

export function GiaiTrinhModal({ entityType, entityId, gd, onClose, onDone }: { entityType: GtEntity; entityId: string; gd: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items } = useLyDoCham();
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  const b = buocOf(gd);
  const nhom = new Map<string, typeof items>();
  for (const l of items) {
    const k = l.ben || "khac";
    nhom.set(k, [...(nhom.get(k) || []), l]);
  }
  const submit = async () => {
    if (!lyDo) return;
    setBusy(true);
    try {
      await api.post("/buoc/giai-trinh", { entity_type: entityType, entity_id: entityId, ly_do: lyDo, ghi_chu: ghiChu });
      toast("Đã ghi giải trình.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`📝 Giải trình — ${entityId}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" onClick={submit} disabled={!lyDo || busy}>{busy ? "Đang lưu…" : "Ghi giải trình"}</Btn>
        </>
      }
    >
      <div className="space-y-3">
        {b && (
          <p className="text-sm text-[var(--ink-body)]">
            Bước <b>{b.so}. {b.ten}</b> — chủ bước {CHU_BUOC_LABEL[b.chu]}, SLA {b.sla} giờ.
          </p>
        )}
        <Field label="Lý do chậm" required hint="Lý do được gắn sẵn bên chịu trách nhiệm (KTV / Kho / Admin / vận chuyển / ngoại cảnh…).">
          <Select value={lyDo} onChange={(e) => setLyDo(e.target.value)}>
            <option value="">— Chọn lý do —</option>
            {[...nhom.entries()].map(([ben, ds]) => (
              <optgroup key={ben} label={BEN_LABEL[ben] || "Khác"}>
                {ds.map((l) => (
                  <option key={l.id} value={l.noi_dung}>{l.noi_dung}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú (tuỳ chọn)">
          <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Diễn giải thêm, hẹn thời gian xử lý…" />
        </Field>
      </div>
    </Modal>
  );
}

interface DemBuoc {
  gd: string;
  tong: number;
  qua_han: number;
  chua_gt: number;
}

/** "Việc theo bước" - giong sidebar cua doi tac: moi buoc dang dung 1 dong, bam de loc danh sach. */
export function ViecTheoBuoc({ user }: { user: AppUser }) {
  const { buoc } = useBuoc();
  const { nav } = useRoute();
  const [dem, setDem] = useState<DemBuoc[] | null>(null);
  useEffect(() => {
    api.get<{ items: DemBuoc[] }>("/buoc/dang-dung").then((r) => setDem(r.items)).catch(() => setDem([]));
  }, []);
  const coTraCuu = user.la_giam_sat || user.la_view || user.la_admin_bh || user.la_qtri;
  if (!dem || !buoc.length) return null;
  const map = new Map(dem.map((d) => [d.gd, d]));
  const rows = buoc.filter((b) => !b.ket_thuc && (map.get(b.gd)?.tong || 0) > 0);
  const go = (gd: string, tt?: string) => {
    if (!coTraCuu) return;
    nav(`/don?tab=tat_ca&trang_thai=${gd}${tt ? `&buoc_tt=${tt}` : ""}`);
  };
  const tong = rows.reduce((s, b) => s + (map.get(b.gd)?.tong || 0), 0);
  const quaHan = rows.reduce((s, b) => s + (map.get(b.gd)?.qua_han || 0), 0);
  return (
    <Card
      title={<span>🧭 Việc theo bước đang dừng <span className="text-xs font-normal text-[var(--ink-soft)]">· {tong} đơn · {quaHan} quá SLA</span></span>}
      actions={coTraCuu ? <Btn size="sm" variant="ghost" onClick={() => nav("/don?tab=tat_ca&buoc_tt=chua_gt")}>Quá SLA chưa giải trình →</Btn> : undefined}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">Không có đơn nào đang dừng trong phạm vi của bạn.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {rows.map((b) => {
            const d = map.get(b.gd)!;
            return (
              <li key={b.gd} className={`flex items-center gap-2 py-1.5 ${coTraCuu ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""}`} onClick={() => go(b.gd)}>
                <span className="w-9 shrink-0 text-center text-xs font-bold text-[var(--ink-soft)]">{b.so}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-[var(--ink)]">{b.ten}</span>
                  <span className="block text-[11.5px] text-[var(--ink-soft)]">{CHU_BUOC_LABEL[b.chu]} · SLA {b.sla}h</span>
                </span>
                {d.chua_gt > 0 && (
                  <button className="focus-ring" title="Quá SLA, chưa giải trình" onClick={(e) => { e.stopPropagation(); go(b.gd, "chua_gt"); }}>
                    <Badge tone="orange">📝 {d.chua_gt}</Badge>
                  </button>
                )}
                {d.qua_han > 0 && (
                  <button className="focus-ring" title="Quá SLA bước" onClick={(e) => { e.stopPropagation(); go(b.gd, "qua_han"); }}>
                    <Badge tone="red">⏰ {d.qua_han}</Badge>
                  </button>
                )}
                <span className="min-w-[30px] rounded-full bg-[var(--brand-600)] px-2 text-center text-xs font-extrabold leading-[22px] text-white">{d.tong}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

interface CanGt {
  gt_type: GtEntity;
  gt_id: string;
  gd: string;
  tu: string;
  so_don: number;
  ktv: string | null;
  ids: string;
  case_id: string | null;
  vai: "ktv" | "gs" | "bo";
  qua_gio: number;
}

/** Danh sach viec qua SLA ma user phai giai trinh. */
export function CanGiaiTrinh({ user, compact }: { user: AppUser; compact?: boolean }) {
  const [items, setItems] = useState<CanGt[] | null>(null);
  const [lenGs, setLenGs] = useState(24);
  const [gt, setGt] = useState<CanGt | null>(null);
  const [open, setOpen] = useState<CanGt | null>(null);
  const [showAll, setShowAll] = useState(false);
  const load = () => api.get<{ items: CanGt[]; len_gs: number }>("/buoc/can-giai-trinh").then((r) => { setItems(r.items); setLenGs(r.len_gs); }).catch(() => setItems([]));
  useEffect(() => {
    load();
  }, []);
  useBuoc();
  if (!items || items.length === 0) return null;
  const list = showAll || !compact ? items : items.slice(0, 5);
  const openUnit = (c: CanGt) => {
    if (c.gt_type === "phieu_sc") return;
    setOpen(c);
  };
  return (
    <Card
      className="border-l-4 border-l-[var(--orange-500)]"
      title={<span>📝 Cần giải trình <span className="text-xs font-normal text-[var(--ink-soft)]">· {items.length} việc quá SLA bước</span></span>}
    >
      <p className="mb-2 text-xs text-[var(--ink-soft)]">
        Bước của KTV quá SLA → KTV giải trình; quá thêm {lenGs} giờ mà KTV chưa giải trình → Giám sát (TNGS) giải trình. Bước của Kho / Admin / NV / Kế toán → người giữ bước giải trình.
      </p>
      <ul className="divide-y divide-[var(--line)]">
        {list.map((c) => {
          const b = buocOf(c.gd);
          return (
            <li key={`${c.vai}-${c.gt_type}-${c.gt_id}-${c.gd}`} className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openUnit(c)}>
                <p className="text-[13.5px]">
                  <span className="font-mono font-semibold text-[var(--link)]">{c.gt_id}</span>
                  {c.so_don > 1 && <span className="text-[var(--ink-soft)]"> · {c.so_don} đơn</span>}
                  {c.case_id && <span className="text-[var(--ink-soft)] font-mono text-xs"> · {c.case_id}</span>}
                </p>
                <p className="text-[12px] text-[var(--ink-body)]">
                  {b ? `${b.so}. ${b.ten}` : c.gd} · <span className="font-bold text-[var(--red-700)]">quá {fmtGio(c.qua_gio)}</span>
                  {c.ktv && (
                    <>
                      {" · "}
                      <UserName email={c.ktv} />
                    </>
                  )}
                </p>
              </div>
              <Badge tone={c.vai === "gs" ? "violet" : c.vai === "ktv" ? "blue" : "gray"}>{VAI_GT_LABEL[c.vai]}</Badge>
              <Btn size="sm" variant="primary" onClick={() => setGt(c)}>Giải trình</Btn>
            </li>
          );
        })}
      </ul>
      {compact && items.length > 5 && (
        <button className="mt-1 text-sm font-semibold text-[var(--link)]" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Thu gọn" : `Xem thêm ${items.length - 5} việc`}
        </button>
      )}
      {gt && <GiaiTrinhModal entityType={gt.gt_type} entityId={gt.gt_id} gd={gt.gd} onClose={() => setGt(null)} onDone={() => { setGt(null); load(); }} />}
      {open && open.gt_type === "phieu_sc_ct" && <UnitDetailModal unitId={open.gt_id} user={user} onClose={() => setOpen(null)} onChanged={load} />}
      {open && open.gt_type === "phieu_gui" && <PhieuGuiDetailModal guiId={open.gt_id} onClose={() => setOpen(null)} onChanged={load} />}
      {open && open.gt_type === "phieu_tra" && <PhieuTraDetailModal traId={open.gt_id} user={user} onClose={() => setOpen(null)} onChanged={load} />}
    </Card>
  );
}

interface GtRow {
  id: number;
  entity_type: string;
  entity_id: string;
  giai_doan: string;
  vai_tro: string;
  ly_do: string;
  ben: string | null;
  ghi_chu: string | null;
  qua_gio: number | null;
  nguoi: string;
  luc: string;
}

/** Lich su giai trinh cua cac doi tuong lien quan 1 don (don vi, don cha, thung, phieu tra). */
export function LichSuGiaiTrinh({ ids, reloadKey }: { ids: (string | null | undefined)[]; reloadKey?: number }) {
  const [rows, setRows] = useState<GtRow[]>([]);
  const key = ids.filter(Boolean).join(",");
  useEffect(() => {
    if (!key) return;
    api.get<{ items: GtRow[] }>(`/buoc/giai-trinh?ids=${encodeURIComponent(key)}`).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, [key, reloadKey]);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] p-3">
      <p className="mb-1.5 text-sm font-bold text-[var(--ink)]">📝 Giải trình ({rows.length})</p>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const b = buocOf(r.giai_doan);
          return (
            <li key={r.id} className="text-[12.5px] leading-snug">
              <span className="font-semibold">{b ? `${b.so}. ${b.ten}` : r.giai_doan}</span>
              {" · "}
              <Badge tone={r.vai_tro === "gs" ? "violet" : r.vai_tro === "ktv" ? "blue" : "gray"}>{VAI_GT_LABEL[r.vai_tro] || r.vai_tro}</Badge>{" "}
              {r.ly_do}
              {r.ben && <span className="text-[var(--ink-soft)]"> ({BEN_LABEL[r.ben] || r.ben})</span>}
              {r.ghi_chu && <span className="text-[var(--ink-soft)]"> — {r.ghi_chu}</span>}
              <span className="block text-[11px] text-[var(--ink-faint)]">
                <UserName email={r.nguoi} /> · {fmtDate(r.luc)}
                {r.qua_gio != null && r.qua_gio > 0 ? ` · lúc đó quá ${fmtGio(r.qua_gio)}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
