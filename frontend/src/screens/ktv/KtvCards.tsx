import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Badge, Btn } from "../../ui/primitives";
import { CopyBtn } from "../../ui/DetailParts";
import { useLkName } from "../../hooks/useLinhKien";
import { fmtDateOnly, hoursSince } from "../../lib/format";
import { formatLyDoBoSung } from "../../lib/constants";
import { KTV_STEPS, ktvDonStage, type KtvStage, type KtvUnitLite } from "../../lib/ktvStage";
import { Modal } from "../../ui/Modal";
import { Textarea } from "../../ui/primitives";
import type { DonVi, PhieuTra } from "../../lib/types";
import { ChonMonThieu, type MonTra } from "../shared/ChonMonThieu";

// 30/10/2026 (ra soat UX mobile KTV): the dung chung cho cac man KTV - 1 the = 1 viec, ten khach /
// linh kien truoc ma, trang thai bang loi cua KTV + dong tien trinh 5 buoc, 1 nut lam ngay tren the.

export interface KtvDon {
  id: string;
  case_id: string | null;
  ma_lk: string | null;
  mo_ta_loi: string | null;
  so_luong_khai: number;
  phieu_gui_id: string;
  odoo_id: number | null;
  created_at: string;
  case_xac_minh?: number;
  gui_trang_thai: string;
  ngay_gui_xe: string | null;
  khach_hang: string | null;
  can_bo_sung: number;
  cap_nhat: string;
  don_vi: (KtvUnitLite & { ly_do_bo_sung?: string | null; updated_at?: string; ma_lk_nhan?: string | null; ma_lk_thuc_te?: string | null; phieu_tra_id?: string | null })[];
}

// 31/10/2026: cac phieu tra dang tren duong ve KTV cua 1 don (1 don nhieu mon co the tach thanh nhieu phieu
// tra, gui ve nhieu lan) -> bam the mo thang phieu tra (co nut "Xac nhan da nhan" / "Khong nhan duoc"),
// nhieu phieu thi cho KTV chon.
export function phieuTraDangVe(d: KtvDon): { id: string; n: number }[] {
  const m = new Map<string, number>();
  for (const u of d.don_vi) if (u.tra_trang_thai === "da_gui" && u.phieu_tra_id) m.set(u.phieu_tra_id, (m.get(u.phieu_tra_id) ?? 0) + 1);
  return [...m].map(([id, n]) => ({ id, n }));
}

// Mo 1 the don: 1 phieu tra dang ve -> mo phieu tra; nhieu phieu -> hien danh sach chon; khong co -> mo thung gui.
export function openKtvDon(d: KtvDon, o: { gui: (id: string) => void; tra: (id: string) => void; chon: (l: { id: string; n: number }[]) => void }) {
  const l = phieuTraDangVe(d);
  if (l.length === 1) o.tra(l[0].id);
  else if (l.length > 1) o.chon(l);
  else o.gui(d.phieu_gui_id);
}

export function ChonPhieuTraModal({ list, onPick, onClose }: { list: { id: string; n: number }[]; onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Modal title="Đơn này về theo nhiều lần" onClose={onClose} maxWidthClass="max-w-sm">
      <p className="mb-2 text-sm text-[var(--ink-soft)]">Chọn lần hàng trả về để xác nhận:</p>
      <div className="space-y-2">
        {list.map((t) => (
          <Btn key={t.id} variant="secondary" size="touch" className="w-full justify-between" onClick={() => onPick(t.id)}>
            <span className="font-mono">{t.id}</span>
            <span>{t.n} món ›</span>
          </Btn>
        ))}
      </div>
    </Modal>
  );
}

export function StageBadge({ stage }: { stage: KtvStage }) {
  return (
    <Badge tone={stage.tone} dot>
      {stage.label}
    </Badge>
  );
}

// Dong tien trinh 5 buoc kieu theo doi kien hang (Gửi đi → Kho nhận → Xử lý → Trả về → Đã nhận).
export function MiniProgress({ stage }: { stage: KtvStage }) {
  const fail = stage.key === "huy" || stage.key === "that_lac";
  return (
    <div className="flex items-center gap-1" aria-label={`Tiến trình: ${stage.label}`}>
      {KTV_STEPS.map((s, i) => {
        const done = i < stage.step;
        const cur = i === stage.step;
        return (
          <div key={s} className="flex-1 min-w-0">
            <div className={`h-1.5 rounded-full ${fail && i >= stage.step - 1 ? "bg-[var(--red-200)]" : done ? "bg-[var(--accent)]" : cur ? "bg-[var(--brand-300)]" : "bg-[var(--line)]"}`} />
            <div className={`mt-0.5 truncate text-[10px] ${done || cur ? "text-[var(--ink-soft)] font-semibold" : "text-[var(--ink-faint)]"}`}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

// The "1 don bao hanh" (don cha) cua KTV.
export function KtvDonCard({ don, onOpen, onBoSung }: { don: KtvDon; onOpen?: () => void; onBoSung?: (u: DonVi) => void }) {
  const { nameOf } = useLkName();
  const stage = ktvDonStage(don.gui_trang_thai, don.don_vi);
  const boSung = don.don_vi.find((u) => u.trang_thai === "cho_bo_sung_tt");
  const quaHan = boSung && hoursSince(boSung.updated_at) > 24;
  const nDv = don.don_vi.length;
  const veList = phieuTraDangVe(don);
  const dangVe = veList.reduce((t, x) => t + x.n, 0);
  const nPhieuVe = veList.length;
  const nXong = don.don_vi.filter((u) => ["da_nhan", "huy", "that_lac"].includes(ktvDonStage("", [u]).key)).length;
  return (
    <div
      role={onOpen ? "button" : undefined}
      onClick={onOpen}
      className={`min-w-0 rounded-xl border bg-[var(--surface)] p-3 shadow-card ${boSung ? "border-[var(--red-200)]" : "border-[var(--line)]"} ${onOpen ? "cursor-pointer hover:border-[var(--line-strong)]" : ""}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[var(--ink)]">{don.khach_hang || "Khách chưa rõ tên"}</p>
          <p className="truncate text-[13px] text-[var(--ink-body)]">
            🔩 {nameOf(don.ma_lk)}
            {don.so_luong_khai > 1 && <span className="font-semibold"> × {don.so_luong_khai}</span>}
          </p>
        </div>
        <StageBadge stage={stage} />
      </div>
      {don.mo_ta_loi && <p className="mt-1 line-clamp-1 text-xs text-[var(--ink-soft)]">{don.mo_ta_loi}</p>}
      <div className="mt-2">
        <MiniProgress stage={stage} />
      </div>
      {dangVe > 0 && stage.key !== "dang_tra" && (
        <div className="mt-2 rounded-lg bg-[var(--blue-50)] px-2.5 py-1.5 text-xs font-semibold text-[var(--blue-700)]">
          📬 {dangVe}/{nDv} món đang trả về bạn — bấm để xác nhận đã nhận
        </div>
      )}
      {stage.key === "dang_tra" && nPhieuVe > 1 && (
        <div className="mt-2 rounded-lg bg-[var(--blue-50)] px-2.5 py-1.5 text-xs font-semibold text-[var(--blue-700)]">
          📬 Hàng về theo {nPhieuVe} lần — bấm để chọn lần cần xác nhận
        </div>
      )}
      {boSung && (
        <div className="mt-2 rounded-lg bg-[var(--red-50)] px-2.5 py-1.5 text-xs text-[var(--red-700)]">
          <b>Admin cần bạn bổ sung:</b> {formatLyDoBoSung(boSung.ly_do_bo_sung) || "xem chi tiết"}
          {quaHan && <span className="ml-1 font-bold">· đã quá 24h</span>}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--ink-faint)]" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 truncate">
          {don.id} · thùng {don.phieu_gui_id}
          {nDv > 1 && ` · ${nXong}/${nDv} xong`}
        </span>
        {don.case_id && (
          <span className="ml-auto inline-flex min-w-0 items-center gap-1">
            <span className="max-w-[140px] truncate font-mono">{don.case_id}</span>
            <CopyBtn text={don.case_id} title="Sao chép mã case" />
          </span>
        )}
      </div>
      {boSung && onBoSung && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <Btn
            variant="danger"
            size="touch"
            className="w-full"
            onClick={() =>
              onBoSung({ id: boSung.id, trang_thai: boSung.trang_thai, ly_do_bo_sung: boSung.ly_do_bo_sung ?? null, mo_ta_loi: don.mo_ta_loi, ma_lk: don.ma_lk, case_id: don.case_id } as unknown as DonVi)
            }
          >
            ✍️ Bổ sung ngay
          </Btn>
        </div>
      )}
    </div>
  );
}

export interface KtvPhieuTra extends PhieuTra {
  don?: { id: string; ma_lk: string | null; case_id: string | null; khach_hang: string | null; mo_ta_loi: string | null; huong_xu_ly: string | null }[];
}

// The "Hang tra ve" - hien ngay ben trong co gi + nut "Da nhan" tren the (khong phai mo bang 9 cot).
export function KtvPhieuTraCard({ pt, onDone, onOpen }: { pt: KtvPhieuTra; onDone: () => void; onOpen: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [busy, setBusy] = useState(false);
  const [khieuNai, setKhieuNai] = useState(false);
  const don = pt.don || [];
  // Gop cac don vi cung linh kien + cung khach (1 don cha x2) thanh 1 dong "× N".
  const mon: { key: string; ma_lk: string | null; khach: string | null; n: number }[] = [];
  for (const d of don) {
    const key = `${d.ma_lk}|${d.khach_hang || d.case_id}`;
    const m = mon.find((x) => x.key === key);
    if (m) m.n++;
    else mon.push({ key, ma_lk: d.ma_lk, khach: d.khach_hang, n: 1 });
  }
  const nhan = async () => {
    setBusy(true);
    try {
      await api.post(`/phieu-tra/${pt.id}/ktv-xac-nhan-nhan`, {});
      toast(`Đã xác nhận nhận ${pt.id}.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-w-0 rounded-xl border border-[var(--orange-200)] bg-[var(--surface)] p-3 shadow-card">
      <div className="flex items-start gap-2" role="button" onClick={onOpen}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-[var(--ink)]">📬 Hàng trả về · {pt.so_don ?? don.length} món</p>
          <p className="text-xs text-[var(--ink-soft)]">
            {pt.id}
            {pt.ma_van_don && ` · vận đơn ${pt.ma_van_don}`}
            {pt.updated_at && ` · gửi ${fmtDateOnly(pt.updated_at)}`}
          </p>
        </div>
        <Badge tone="orange" dot>
          Đang trả về
        </Badge>
      </div>
      {don.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5" onClick={onOpen}>
          {mon.slice(0, 4).map((d) => (
            <li key={d.key} className="truncate text-[13px] text-[var(--ink-body)]">
              • {nameOf(d.ma_lk)}
              {d.n > 1 && <b> × {d.n}</b>}
              {d.khach && <span className="text-[var(--ink-soft)]"> — {d.khach}</span>}
            </li>
          ))}
          {mon.length > 4 && <li className="text-xs text-[var(--ink-faint)]">… và {mon.length - 4} món khác</li>}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <Btn variant="primary" size="touch" className="flex-1" disabled={busy} onClick={nhan}>
          ✔ Đã nhận hàng
        </Btn>
        <Btn variant="secondary" size="touch" onClick={() => setKhieuNai(true)}>
          Không nhận được
        </Btn>
      </div>
      {khieuNai && <KhieuNaiModal traId={pt.id} units={don.map((d) => ({ id: d.id, ma_lk: d.ma_lk, khach: d.khach_hang }))} onClose={() => setKhieuNai(false)} onDone={() => { setKhieuNai(false); onDone(); }} />}
    </div>
  );
}

function KhieuNaiModal({ traId, units, onClose, onDone }: { traId: string; units: MonTra[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [ghiChu, setGhiChu] = useState("");
  const [thieu, setThieu] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/phieu-tra/${traId}/khieu-nai`, { ghi_chu: ghiChu.trim(), thieu_ids: thieu });
      toast(thieu.length === units.length ? "Đã báo Kho: chưa nhận được hàng." : `Đã báo Kho thiếu ${thieu.length} món, các món còn lại đã nhận.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Báo thiếu / không nhận được hàng"
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn variant="secondary" onClick={onClose}>
            Quay lại
          </Btn>
          <Btn variant="danger" disabled={busy || !ghiChu.trim() || thieu.length === 0} onClick={submit}>
            Gửi cho Kho
          </Btn>
        </>
      }
    >
      {units.length > 0 && (
        <div className="mb-3">
          <ChonMonThieu units={units} value={thieu} onChange={setThieu} />
        </div>
      )}
      <p className="mb-2 text-sm text-[var(--ink-soft)]">Kho sẽ kiểm tra lại với nhà xe và báo kết quả cho bạn.</p>
      <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="VD: Nhà xe báo đã giao nhưng tôi chưa nhận được, thiếu 1 món…" />
    </Modal>
  );
}
