import { useEffect, useState } from "react";
import { setGiaiTrinhHandler, type GtYeuCau } from "../../lib/api";
import { api, errorMessage } from "../../lib/api";
import { BEN_LABEL, CHU_BUOC_LABEL, VAI_GT_LABEL, buocOf, fmtGio, lyDoHopBuoc, useBuoc } from "../../lib/buoc";
import { useLyDoCham } from "../../hooks/useSettings";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Badge, Btn, Card, Field, Select, Textarea } from "../../ui/primitives";
import { UserName } from "../../hooks/useUserNames";
import { useRoute } from "../../router/Router";
import { fileToDataUrl, fmtDate } from "../../lib/format";
import { ImagePicker } from "../../ui/ImagePicker";
import type { AppUser } from "../../lib/types";
import { UnitDetailModal } from "./UnitDetailModal";
import { PhieuTraDetailModal } from "./PhieuTraDetailModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";

// 15/11/2026 - quan tri theo BUOC (yeu cau doi tac): "Việc theo bước" (moi buoc dang dung bao nhieu don, bao nhieu
// qua SLA, bao nhieu chua giai trinh) + "Cần giải trình" (viec qua SLA ma chinh minh phai giai trinh) + modal giai trinh.

export type GtEntity = "phieu_gui" | "phieu_sc" | "phieu_sc_ct" | "phieu_tra";

// 21/11/2026 (v1.153): phan loai loi khi giai trinh - khac "Lỗi của tôi" thi bat buoc bang chung (chu hoac anh).
export const LOAI_LOI_OPTIONS = [
  { value: "noi_bo", label: "Lỗi nội bộ", tone: "amber" as const },
  { value: "doi_tac", label: "Lỗi đối tác", tone: "violet" as const },
  { value: "ban_than", label: "Lỗi của tôi", tone: "red" as const },
  { value: "khac", label: "Khác", tone: "gray" as const },
];
const LOAI_LOI_MAP = Object.fromEntries(LOAI_LOI_OPTIONS.map((o) => [o.value, o]));

export function GiaiTrinhModal({ entityType, entityId, gd, onClose, onDone, batBuoc }: { entityType: GtEntity; entityId: string; gd: string; onClose: () => void; onDone: () => void; batBuoc?: GtYeuCau }) {
  const toast = useToast();
  // 16/11/2026: chi hien ly do thuoc ben hop voi buoc dang dung (lib/buoc.ts BEN_THEO_CHU).
  const items = lyDoHopBuoc(useLyDoCham().items, gd);
  const [lyDo, setLyDo] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [loaiLoi, setLoaiLoi] = useState("");
  const [bangChung, setBangChung] = useState("");
  const [anhFiles, setAnhFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const canBangChung = !!loaiLoi && loaiLoi !== "ban_than";
  const soAnh = anhFiles?.length || 0;
  const thieu = !lyDo ? "Chọn lý do chậm." : !loaiLoi ? "Chọn phân loại lỗi." : canBangChung && !bangChung.trim() && !soAnh ? "Cần bằng chứng: ghi mô tả hoặc đính kèm ảnh." : "";
  const b = buocOf(gd);
  const nhom = new Map<string, typeof items>();
  for (const l of items) {
    const k = l.ben || "khac";
    nhom.set(k, [...(nhom.get(k) || []), l]);
  }
  const submit = async () => {
    if (thieu) return;
    setBusy(true);
    try {
      const anh = canBangChung && anhFiles && anhFiles.length ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      await api.post(
        "/buoc/giai-trinh",
        { entity_type: entityType, entity_id: entityId, ly_do: lyDo, ghi_chu: ghiChu, loai_loi: loaiLoi, bang_chung: canBangChung ? bangChung : "", bang_chung_anh: anh },
        { timeoutMs: 90000 },
      );
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
          <Btn variant="primary" onClick={submit} disabled={!!thieu || busy}>{busy ? "Đang lưu…" : "Ghi giải trình"}</Btn>
        </>
      }
    >
      <div className="space-y-3">
        {batBuoc && (
          <div className="rounded-lg border border-[var(--red-200)] bg-[var(--red-50)] px-3 py-2 text-sm text-[var(--red-700)]">
            ⚠ Bước này đã quá SLA {fmtGio(Math.max(0, batBuoc.qua_gio))} và chưa có giải trình — cần ghi lý do trước, sau đó hệ thống tự thực hiện tiếp thao tác bạn vừa bấm.
          </div>
        )}
        {b && (
          <p className="text-sm text-[var(--ink-body)]">
            Bước <b>{b.so}. {b.ten}</b> — chủ bước {CHU_BUOC_LABEL[b.chu]}, SLA {b.sla} giờ.
          </p>
        )}
        {b && b.loi.length > 0 && (
          <div className="text-xs text-[var(--ink-soft)]">
            <b>Lỗi hay gặp ở bước này:</b> {b.loi.join(" · ")}
          </div>
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
        <Field label="Phân loại lỗi" required hint="Không phải lỗi của bạn thì phải có bằng chứng.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LOAI_LOI_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setLoaiLoi(o.value)}
                className={`rounded-lg border px-2 py-2 text-sm font-semibold ${loaiLoi === o.value ? "border-[var(--accent)] bg-[var(--brand-50)] text-[var(--brand-800)]" : "border-[var(--line)] bg-white text-[var(--ink-body)]"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </Field>
        {canBangChung && (
          <div className="space-y-2 rounded-lg border border-[var(--amber-200)] bg-[var(--amber-50)] p-2.5">
            <p className="text-xs font-semibold text-[var(--amber-800)]">📎 Bằng chứng (bắt buộc — ghi mô tả hoặc đính kèm ảnh)</p>
            <Textarea rows={2} value={bangChung} onChange={(e) => setBangChung(e.target.value)} placeholder="VD: tin nhắn nhà xe báo chậm, mã vận đơn, email đối tác, tên người liên quan…" />
            <ImagePicker onChange={setAnhFiles} compact />
          </div>
        )}
        <Field label="Ghi chú (tuỳ chọn)">
          <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Diễn giải thêm, hẹn thời gian xử lý…" />
        </Field>
        {thieu && <p className="text-xs text-[var(--amber-800)]">⚠ {thieu}</p>}
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
  loai_loi: string | null;
  bang_chung: string | null;
  bang_chung_anh: string | null;
  qua_gio: number | null;
  nguoi: string;
  luc: string;
}

function anhCua(r: { bang_chung_anh: string | null }): string[] {
  try {
    const a = JSON.parse(r.bang_chung_anh || "[]");
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
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
              {r.loai_loi && LOAI_LOI_MAP[r.loai_loi] && (
                <>
                  {" "}
                  <Badge tone={LOAI_LOI_MAP[r.loai_loi].tone}>{LOAI_LOI_MAP[r.loai_loi].label}</Badge>
                </>
              )}
              {r.ghi_chu && <span className="text-[var(--ink-soft)]"> — {r.ghi_chu}</span>}
              {(r.bang_chung || r.bang_chung_anh) && (
                <span className="mt-0.5 block rounded bg-[var(--surface-2)] px-2 py-1 text-[12px]">
                  📎 <b>Bằng chứng:</b> {r.bang_chung || ""}
                  {anhCua(r).length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      {anhCua(r).map((u, i) => (
                        <a key={i} href={u} target="_blank" rel="noreferrer">
                          <img src={u} alt={`Bằng chứng ${i + 1}`} className="h-14 w-14 rounded border border-[var(--line)] object-cover" />
                        </a>
                      ))}
                    </span>
                  )}
                </span>
              )}
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

// 16/11/2026: hop giai trinh BAT BUOC - lop api (lib/api.ts) goi khi backend tra REQUIRE_GIAI_TRINH; giai trinh xong
// thi request duoc gui lai, huy thi thao tac khong thuc hien. Gan 1 lan o App.
export function GiaiTrinhHost() {
  const [pending, setPending] = useState<{ gt: GtYeuCau; resolve: (ok: boolean) => void } | null>(null);
  useEffect(() => {
    setGiaiTrinhHandler((gt) => new Promise<boolean>((resolve) => setPending({ gt, resolve })));
    return () => setGiaiTrinhHandler(null);
  }, []);
  if (!pending) return null;
  const xong = (ok: boolean) => {
    pending.resolve(ok);
    setPending(null);
  };
  return <GiaiTrinhModal entityType={pending.gt.entity_type as GtEntity} entityId={pending.gt.entity_id} gd={pending.gt.gd} batBuoc={pending.gt} onClose={() => xong(false)} onDone={() => xong(true)} />;
}

// 16/11/2026: dong trang thai dong ho cua buoc dang dung (chi tiet don): tam dung vi cho hang / gia han do ngoai canh.
interface TtBuoc {
  gd: string;
  moc: string;
  tu: string;
  sla: number;
  qua_gio: number;
  qua_han: boolean;
  tam_dung: boolean;
  thieu_hang: { ma_lk: string; trang_thai: string; ticket_id: string | null }[];
  gia_han: { luc: string; ly_do: string } | null;
  da_giai_trinh: boolean;
}
export function DongHoBuoc({ type, id, reloadKey, onState }: { type: GtEntity; id: string; reloadKey?: number; onState?: (t: { qua_gio: number; tam_dung: boolean } | null) => void }) {
  const [t, setT] = useState<TtBuoc | null>(null);
  useEffect(() => {
    setT(null);
    onState?.(null);
    api
      .get<{ item: TtBuoc | null }>(`/buoc/trang-thai?type=${type}&id=${encodeURIComponent(id)}`)
      .then((r) => { setT(r.item); onState?.(r.item ? { qua_gio: r.item.qua_gio, tam_dung: r.item.tam_dung } : null); })
      .catch(() => undefined);
  }, [type, id, reloadKey]);
  if (!t) return null;
  return (
    <>
      {t.tam_dung && (
        <Badge tone="blue">⏸ Tạm dừng đồng hồ — chờ hàng ({t.thieu_hang.filter((x) => x.ticket_id).map((x) => x.ticket_id).join(", ") || "đang gửi yêu cầu"})</Badge>
      )}
      {!t.tam_dung && t.moc !== t.tu && (
        <Badge tone="violet" >
          ⏳ Tính lại từ {fmtDate(t.moc).slice(0, 11)}
          {t.gia_han ? ` (giải trình ngoại cảnh: ${t.gia_han.ly_do})` : " (sau khi hết chờ hàng)"}
          {t.qua_han ? ` · quá ${fmtGio(t.qua_gio)}` : ` · còn ${fmtGio(Math.max(0, -t.qua_gio))}`}
        </Badge>
      )}
      {t.da_giai_trinh && !t.tam_dung && <Badge tone="green">✓ Đã giải trình lần dừng này</Badge>}
    </>
  );
}
