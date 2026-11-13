import { useEffect, useMemo, useState } from "react";
import { TabScreen, type TabDef } from "../../ui/TabScreen";
import { FilterBar, useListFilters, withQuery, KHOANG_DEF, type FilterDef } from "../../ui/FilterBar";
import { Card, Badge, Btn, Input, Textarea, Field, Spinner, EmptyState } from "../../ui/primitives";
import { Modal } from "../../ui/Modal";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { MienBadge } from "../../ui/MienBadge";
import { DETAIL_MAX_W, DetailGrid, SummaryBox, Section, KvGrid, Kv, Banner, CopyBtn } from "../../ui/DetailParts";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useWorkload } from "../../hooks/useWorkload";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName, displayName, useUserNames } from "../../hooks/useUserNames";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { fmtDate } from "../../lib/format";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser } from "../../lib/types";

// 13/11/2026 - Module quan ly tra xac linh kien. Nguyen van: "linh kiện được gửi về bh, admin bh duyệt đổi mới =>
// xác nhận trạng thái trả xác => admin bh định kỳ sẽ gom nhiều xác linh kiện và trả về 1 đợt cho nhà máy => tạo
// thùng trả xác => add linh kiện => thêm thông tin (mã EO) => kế toán và kiểm tra thông tin => phê duyệt => kết thúc
// luồng trả xác. (có đủ các bước thêm, bớt linh kiện xác". Backend: routes/xac.ts (/api/tra-xac).

export interface XacRow {
  id: string;
  parent_id: string;
  trang_thai: string;
  xac_tt: string | null;
  thung_xac_id: string | null;
  ma_lk: string | null;
  ma_lk_nhan: string | null;
  ma_lk_thuc_te: string | null;
  ma_lk_xac: string | null;
  case_id: string | null;
  mien: "MB" | "MN" | null;
  mo_ta_loi: string | null;
  ktv: string | null;
  khach_hang: string | null;
  updated_at: string;
}
interface ThungXac {
  id: string;
  trang_thai: "nhap" | "cho_ke_toan" | "da_duyet";
  doi_tac: string | null;
  ma_eo: string | null;
  ghi_chu: string | null;
  mien: "MB" | "MN" | null;
  nguoi_tao: string | null;
  created_at: string;
  updated_at: string;
  gui_kt_boi: string | null;
  gui_kt_luc: string | null;
  kt_boi: string | null;
  kt_luc: string | null;
  ly_do_tra_lai: string | null;
  tra_lai_boi: string | null;
  tra_lai_luc: string | null;
  so_xac?: number;
}
interface ThungLog {
  id: number;
  tu_trang_thai: string | null;
  den_trang_thai: string | null;
  nguoi_thuc_hien: string;
  thoi_gian: string;
  ghi_chu: string;
}

const TT_LABEL: Record<string, string> = { nhap: "Nháp", cho_ke_toan: "Chờ KT duyệt", da_duyet: "KT đã duyệt — kết thúc" };
const TT_TONE: Record<string, "gray" | "amber" | "green"> = { nhap: "gray", cho_ke_toan: "amber", da_duyet: "green" };
const ERR: Record<string, string> = {
  REQUIRE_MA_EO: "Cần nhập mã EO trước khi gửi / duyệt.",
  THUNG_RONG: "Thùng chưa có xác nào.",
  THUNG_CON_XAC: "Thùng còn xác — bỏ hết xác trước khi xoá.",
  XAC_KHONG_CHO_GOM: "Xác không còn ở danh sách chờ gom (đã vào thùng khác / đổi xử lý xác).",
  MIEN_MISMATCH: "Xác khác miền với thùng.",
  XAC_TRONG_THUNG: "Xác đang trong thùng trả xác — bỏ khỏi thùng trước.",
};
const err = (e: unknown) => ERR[(e as { code?: string })?.code || ""] || errorMessage(e);

const admin = (u: AppUser) => u.la_admin_bh || u.la_qtri;
const kt = (u: AppUser) => u.la_ke_toan || u.la_qtri;
const xem = (u: AppUser) => admin(u) || kt(u) || u.la_view || u.la_giam_sat;

const XAC_DEFS: FilterDef[] = [
  { key: "nguoi_gui", label: "KTV gửi", kind: "person", noneLabel: "Khách lẻ" },
  { key: "lk_b", label: "Linh kiện xác (B)", kind: "lk" },
  { key: "mien", label: "Miền", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, kind: "map", noneLabel: "Chưa khai báo" },
  { ...KHOANG_DEF, label: "Cập nhật" },
];

// ---- Bang xac (dung chung: cho gom / trong thung / chon de them) ----
function XacTable({ rows, selected, onToggle, onOpen, extra }: { rows: XacRow[]; selected?: Set<string>; onToggle?: (id: string) => void; onOpen?: (r: XacRow) => void; extra?: Column<XacRow> }) {
  const { nameOf } = useLkName();
  const cols: Column<XacRow>[] = [
    {
      key: "id",
      header: "ID đơn",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {selected && onToggle && <input type="checkbox" checked={selected.has(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(r.id)} />}
          <span className="font-mono font-semibold text-[var(--link)]">{r.id}</span>
        </span>
      ),
    },
    { key: "lk", header: "Linh kiện xác (B)", render: (r) => <span className="block max-w-[300px] truncate" title={nameOf(r.ma_lk_xac)}>{nameOf(r.ma_lk_xac)}</span> },
    { key: "c", header: "Đổi mới (C)", render: (r) => (r.ma_lk_thuc_te && r.ma_lk_thuc_te !== r.ma_lk_xac ? <span className="text-xs">{r.ma_lk_thuc_te}</span> : <span className="text-[var(--ink-faint)]">=B</span>) },
    { key: "ktv", header: "KTV gửi", render: (r) => (r.ktv ? <UserName email={r.ktv} /> : "Khách lẻ") },
    { key: "case", header: "Case · Khách", render: (r) => <span className="text-xs">{[r.case_id, r.khach_hang].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "cn", header: "Cập nhật", render: (r) => <span className="text-xs">{fmtDate(r.updated_at)}</span> },
  ];
  if (extra) cols.push(extra);
  return <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={onOpen} emptyText="Không có xác nào." />;
}

// Tom tat theo linh kien xac (de nhap phieu EO / gui nha may).
function tomTat(rows: XacRow[], nameOf: (m: string | null) => string): { ma: string | null; ten: string; n: number }[] {
  const m = new Map<string, { ma: string | null; ten: string; n: number }>();
  for (const r of rows) {
    const k = r.ma_lk_xac || "";
    const cur = m.get(k) || { ma: r.ma_lk_xac, ten: nameOf(r.ma_lk_xac), n: 0 };
    cur.n++;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

// ---- Tab: xac cho gom ----
function XacChoGom({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const toast = useToast();
  const base = "/tra-xac/xac?nhom=cho_gom";
  const flt = useListFilters(base, XAC_DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, reload, loading } = usePagedApi<XacRow>(withQuery(base, flt.query), "xac", 50);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [tao, setTao] = useState(false);
  const [themVao, setThemVao] = useState(false);
  const [ngoai, setNgoai] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [openThung, setOpenThung] = useState<string | null>(null);
  useEffect(() => setSel(new Set()), [flt.query, page]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = items.length > 0 && items.every((r) => sel.has(r.id));
  const done = () => { setSel(new Set()); reload(); onChanged(); };
  const isA = admin(user);
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">♻️ Xác chờ gom thùng ({total})</h3>
        <span className="text-xs text-[var(--ink-soft)]">Đơn Đổi mới có xử lý xác "Trả đối tác", chưa vào thùng trả xác nào.</span>
      </div>
      <FilterBar f={flt} defs={XAC_DEFS} placeholder="Tìm mã đơn, case, linh kiện, KTV, khách…" />
      {isA && (
        <div className={`flex flex-wrap items-center gap-2 mb-2 rounded-lg px-2.5 py-1.5 ${sel.size ? "bg-[var(--brand-50)] border border-[var(--brand-200)]" : ""}`}>
          <Btn size="sm" variant="ghost" disabled={!items.length} onClick={() => setSel(allOn ? new Set() : new Set(items.map((r) => r.id)))}>
            {allOn ? "☐ Bỏ chọn trang này" : `☑ Chọn cả trang (${items.length})`}
          </Btn>
          {sel.size > 0 && (
            <>
              <span className="text-sm font-semibold">Đã chọn {sel.size} xác</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                <Btn size="sm" variant="ghost" disabled={busy} onClick={() => setNgoai(true)}>Đã trả ngoài hệ thống</Btn>
                <Btn size="sm" variant="secondary" disabled={busy} onClick={() => setThemVao(true)}>Thêm vào thùng nháp…</Btn>
                <Btn size="sm" variant="primary" disabled={busy} onClick={() => setTao(true)}>＋ Tạo thùng trả xác ({sel.size})</Btn>
              </span>
            </>
          )}
        </div>
      )}
      {loading && !items.length ? <Spinner /> : <XacTable rows={items} selected={isA ? sel : undefined} onToggle={toggle} onOpen={(r) => setOpenUnit(r.id)} />}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {tao && (
        <TaoThungModal
          ids={[...sel]}
          onClose={() => setTao(false)}
          onDone={(id) => { setTao(false); done(); setOpenThung(id); }}
        />
      )}
      {themVao && <ChonThungNhapModal ids={[...sel]} onClose={() => setThemVao(false)} onDone={(id) => { setThemVao(false); done(); setOpenThung(id); }} />}
      {ngoai && (
        <NgoaiModal
          n={sel.size}
          onClose={() => setNgoai(false)}
          onOk={async (lyDo) => {
            setBusy(true);
            try {
              const r = await api.post<{ ok: number; bo_qua: number }>("/tra-xac/xac/ngoai", { ids: [...sel], ly_do: lyDo });
              toast(`Đã đánh dấu ${r.ok} xác đã xử lý ngoài${r.bo_qua ? ` (${r.bo_qua} bỏ qua)` : ""}.`, "ok");
              setNgoai(false);
              done();
            } catch (e) {
              toast(err(e), "error");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={reload} />}
      {openThung && <ThungXacDetailModal id={openThung} user={user} onClose={() => setOpenThung(null)} onChanged={() => { reload(); onChanged(); }} />}
    </Card>
  );
}

function NgoaiModal({ n, onClose, onOk }: { n: number; onClose: () => void; onOk: (lyDo: string) => void }) {
  const [lyDo, setLyDo] = useState("");
  return (
    <Modal title="Đánh dấu xác đã xử lý ngoài hệ thống" onClose={onClose} maxWidthClass="max-w-md" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" onClick={() => onOk(lyDo)}>Xác nhận {n} xác</Btn></>}>
      <p className="text-sm mb-2">{n} xác sẽ rời danh sách chờ gom (vẫn đưa lại được ở tab "Đã xử lý ngoài").</p>
      <Field label="Ghi chú (tuỳ chọn)"><Textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: đã trả nhà máy theo đợt tháng 10" /></Field>
    </Modal>
  );
}

function TaoThungModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const [doiTac, setDoiTac] = useState("");
  const [eo, setEo] = useState("");
  const [ghi, setGhi] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ id: string; ok: number; loi: { id: string; error: string }[] }>("/tra-xac/thung", { unit_ids: ids, doi_tac: doiTac, ma_eo: eo, ghi_chu: ghi });
      toast(`Đã tạo ${r.id} với ${r.ok} xác${r.loi.length ? ` — ${r.loi.length} xác không thêm được (${r.loi.map((l) => `${l.id}: ${ERR[l.error] || l.error}`).join("; ")})` : ""}.`, r.loi.length ? "error" : "ok");
      onDone(r.id);
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Tạo thùng trả xác (${ids.length} xác)`} onClose={onClose} maxWidthClass="max-w-lg" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" disabled={busy} onClick={submit}>Tạo thùng</Btn></>}>
      <div className="space-y-2">
        <Field label="Đối tác / nhà máy nhận xác"><Input value={doiTac} onChange={(e) => setDoiTac(e.target.value)} placeholder="VD: Nhà máy Karofi" /></Field>
        <Field label="Mã EO" hint="Có thể nhập sau — bắt buộc trước khi gửi Kế toán"><Input value={eo} onChange={(e) => setEo(e.target.value)} /></Field>
        <Field label="Ghi chú"><Textarea rows={2} value={ghi} onChange={(e) => setGhi(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function ChonThungNhapModal({ ids, onClose, onDone }: { ids: string[]; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const [list, setList] = useState<ThungXac[] | null>(null);
  useEffect(() => {
    api.get<{ thung: ThungXac[] }>("/tra-xac/thung?trang_thai=nhap,cho_ke_toan&limit=100").then((r) => setList(r.thung)).catch(() => setList([]));
  }, []);
  const them = async (t: ThungXac) => {
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>(`/tra-xac/thung/${t.id}/xac`, { unit_ids: ids });
      toast(`Đã thêm ${r.ok} xác vào ${t.id}${r.loi.length ? ` — ${r.loi.length} xác không thêm được (${r.loi.map((l) => `${l.id}: ${ERR[l.error] || l.error}`).join("; ")})` : ""}.`, r.loi.length ? "error" : "ok");
      onDone(t.id);
    } catch (e) {
      toast(err(e), "error");
    }
  };
  return (
    <Modal title={`Thêm ${ids.length} xác vào thùng`} onClose={onClose} maxWidthClass="max-w-lg">
      {!list ? <Spinner /> : !list.length ? <EmptyState text="Chưa có thùng nháp nào — dùng “Tạo thùng trả xác”." /> : (
        <div className="space-y-1.5">
          {list.map((t) => (
            <button key={t.id} type="button" onClick={() => them(t)} className="focus-ring w-full text-left rounded-lg border border-[var(--line)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono font-semibold text-[var(--link)]">{t.id}</span> <Badge tone={TT_TONE[t.trang_thai]}>{TT_LABEL[t.trang_thai]}</Badge> <MienBadge mien={t.mien} short />
              <span className="block text-xs text-[var(--ink-soft)]">{t.doi_tac || "Chưa có đối tác"} · EO {t.ma_eo || "—"} · {t.so_xac ?? 0} xác</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ---- Danh sach thung ----
function ThungList({ user, tt, traLai, title, empty, onChanged }: { user: AppUser; tt: string; traLai?: boolean; title: string; empty: string; onChanged: () => void }) {
  const base = `/tra-xac/thung?trang_thai=${tt}${traLai ? "&tra_lai=1" : ""}`;
  const DEFS: FilterDef[] = [
    { key: "doi_tac", label: "Đối tác" },
    { key: "nguoi_tao", label: "Người tạo", kind: "person" },
    { key: "mien", label: "Miền", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, kind: "map", noneLabel: "Chưa khai báo" },
    ...(tt === "da_duyet" ? [{ key: "kt_boi", label: "KT duyệt", kind: "person" as const }] : []),
    KHOANG_DEF,
  ];
  const flt = useListFilters(base, DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, reload, loading } = usePagedApi<ThungXac>(withQuery(base, flt.query), "thung");
  const [open, setOpen] = useState<string | null>(null);
  const cols: Column<ThungXac>[] = [
    { key: "id", header: "Mã thùng", render: (r) => <span className="font-mono font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "tt", header: "Trạng thái", render: (r) => <span className="inline-flex gap-1"><Badge tone={TT_TONE[r.trang_thai]}>{TT_LABEL[r.trang_thai]}</Badge>{r.ly_do_tra_lai && r.trang_thai === "nhap" && <Badge tone="red">↩ KT trả lại</Badge>}</span> },
    { key: "n", header: "Số xác", render: (r) => <b>{r.so_xac ?? 0}</b> },
    { key: "dt", header: "Đối tác", render: (r) => r.doi_tac || "—" },
    { key: "eo", header: "Mã EO", render: (r) => (r.ma_eo ? <span className="font-mono">{r.ma_eo}</span> : <span className="text-[var(--red-600)]">Chưa có</span>) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "nt", header: "Người tạo", render: (r) => <UserName email={r.nguoi_tao} /> },
    { key: "cn", header: tt === "da_duyet" ? "KT duyệt lúc" : "Cập nhật", render: (r) => <span className="text-xs">{fmtDate(tt === "da_duyet" ? r.kt_luc : r.updated_at)}</span> },
    { key: "ld", header: "Ghi chú", render: (r) => <span className="block max-w-[260px] truncate text-xs" title={r.ly_do_tra_lai || r.ghi_chu || ""}>{(r.trang_thai === "nhap" && r.ly_do_tra_lai) || r.ghi_chu || "—"}</span> },
  ];
  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">{title} ({total})</h3>
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã thùng, EO, đối tác, mã đơn / case / linh kiện bên trong…" />
      {loading && !items.length ? <Spinner /> : <Table columns={cols} rows={items} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} emptyText={empty} />}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {open && <ThungXacDetailModal id={open} user={user} onClose={() => setOpen(null)} onChanged={() => { reload(); onChanged(); }} />}
    </Card>
  );
}

// ---- Xac da xu ly ngoai ----
function XacNgoai({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const toast = useToast();
  const base = "/tra-xac/xac?nhom=ngoai";
  const flt = useListFilters(base, XAC_DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, reload, loading } = usePagedApi<XacRow>(withQuery(base, flt.query), "xac", 50);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const duaLai = async (id: string) => {
    try {
      await api.post("/tra-xac/xac/ngoai", { ids: [id], dua_lai: true });
      toast(`Đã đưa ${id} lại danh sách chờ gom.`, "ok");
      reload();
      onChanged();
    } catch (e) {
      toast(err(e), "error");
    }
  };
  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-1">Xác đã xử lý ngoài hệ thống ({total})</h3>
      <p className="text-xs text-[var(--ink-soft)] mb-2">Gồm xác của đơn tạo trước 01/11/2026 (thời AppSheet) và xác Admin đánh dấu đã trả ngoài.</p>
      <FilterBar f={flt} defs={XAC_DEFS} placeholder="Tìm mã đơn, case, linh kiện, KTV…" />
      {loading && !items.length ? <Spinner /> : (
        <XacTable
          rows={items}
          onOpen={(r) => setOpenUnit(r.id)}
          extra={admin(user) ? { key: "act", header: "", render: (r) => <Btn size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); duaLai(r.id); }}>↺ Đưa lại chờ gom</Btn> } : undefined}
        />
      )}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={reload} />}
    </Card>
  );
}

// ---- Chi tiet thung tra xac ----
export function ThungXacDetailModal({ id, user, onClose, onChanged }: { id: string; user: AppUser; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  useUserNames();
  const [d, setD] = useState<{ thung: ThungXac; xac: XacRow[]; logs: ThungLog[] } | null>(null);
  const [loi, setLoi] = useState("");
  const [f, setF] = useState({ doi_tac: "", ma_eo: "", ghi_chu: "" });
  const [busy, setBusy] = useState(false);
  const [them, setThem] = useState(false);
  const [traLai, setTraLai] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const load = async () => {
    try {
      const r = await api.get<{ thung: ThungXac; xac: XacRow[]; logs: ThungLog[] }>(`/tra-xac/thung/${id}`);
      setD(r);
      setF({ doi_tac: r.thung.doi_tac || "", ma_eo: r.thung.ma_eo || "", ghi_chu: r.thung.ghi_chu || "" });
    } catch (e) {
      setLoi(err(e));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const t = d?.thung;
  const isA = admin(user);
  const isK = kt(user);
  const suaXac = !!t && isA && (t.trang_thai === "nhap" || t.trang_thai === "cho_ke_toan");
  const suaTT = !!t && ((isA && (t.trang_thai === "nhap" || t.trang_thai === "cho_ke_toan")) || (isK && t.trang_thai === "cho_ke_toan"));
  const doiTT = !!t && (f.doi_tac !== (t.doi_tac || "") || f.ma_eo !== (t.ma_eo || "") || f.ghi_chu !== (t.ghi_chu || ""));
  const tt = useMemo(() => (d ? tomTat(d.xac, nameOf) : []), [d, nameOf]);
  const tomTatText = t && d ? `Thùng trả xác ${t.id}${t.ma_eo ? ` — EO ${t.ma_eo}` : ""}${t.doi_tac ? ` — ${t.doi_tac}` : ""}\nTổng: ${d.xac.length} xác\n${tt.map((x, i) => `${i + 1}) ${x.ten} × ${x.n}`).join("\n")}` : "";

  const run = async (fn: () => Promise<unknown>, msg: string, close?: boolean) => {
    setBusy(true);
    try {
      await fn();
      toast(msg, "ok");
      onChanged();
      if (close) onClose();
      else await load();
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const luu = () => api.patch(`/tra-xac/thung/${id}`, f);
  const luuNeuDoi = async () => { if (doiTT) await luu(); };

  const footer = t && (
    <>
      {isA && t.trang_thai === "nhap" && d && d.xac.length === 0 && <Btn variant="danger" disabled={busy} onClick={() => confirm(`Xoá thùng rỗng ${t.id}?`) && run(() => api.delete(`/tra-xac/thung/${id}`), `Đã xoá ${t.id}.`, true)}>🗑 Xoá thùng rỗng</Btn>}
      {isA && t.trang_thai === "cho_ke_toan" && <Btn variant="ghost" disabled={busy} onClick={() => run(() => api.post(`/tra-xac/thung/${id}/huy-gui`), "Đã huỷ gửi Kế toán.")}>↩ Huỷ gửi KT</Btn>}
      {isA && t.trang_thai === "nhap" && (
        <Btn variant="primary" disabled={busy || !d?.xac.length || !f.ma_eo.trim()} title={!f.ma_eo.trim() ? "Cần nhập mã EO" : ""} onClick={() => run(async () => { await luuNeuDoi(); await api.post(`/tra-xac/thung/${id}/gui-kt`); }, `Đã gửi ${t.id} cho Kế toán duyệt.`)}>
          📤 Gửi Kế toán duyệt
        </Btn>
      )}
      {isK && t.trang_thai === "cho_ke_toan" && (
        <>
          <Btn variant="danger" disabled={busy} onClick={() => setTraLai(true)}>↩ Trả lại Admin BH</Btn>
          <Btn variant="success" disabled={busy || !f.ma_eo.trim()} onClick={() => confirm(`Duyệt thùng ${t.id} (${d?.xac.length} xác)? Luồng trả xác sẽ kết thúc.`) && run(async () => { await luuNeuDoi(); await api.post(`/tra-xac/thung/${id}/kt-duyet`); }, `Đã duyệt ${t.id}.`)}>
            ✔ Duyệt — kết thúc trả xác
          </Btn>
        </>
      )}
    </>
  );

  return (
    <Modal title={`Thùng trả xác ${id}`} onClose={onClose} maxWidthClass={DETAIL_MAX_W} footerActions={footer}>
      {loi ? <p className="text-sm text-[var(--red-700)]">Không mở được thùng: {loi}</p> : !d || !t ? <Spinner /> : (
        <DetailGrid
          side={
            <Section title={`🕘 Nhật ký (${d.logs.length})`}>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {d.logs.map((l) => (
                  <div key={l.id} className="text-xs border-l-2 border-[var(--brand-200)] pl-2">
                    <div className="text-[var(--ink-faint)]">{fmtDate(l.thoi_gian)} · {displayName(l.nguoi_thuc_hien)}</div>
                    <div className="text-[var(--ink-body)]">{l.ghi_chu}</div>
                  </div>
                ))}
              </div>
            </Section>
          }
        >
          <SummaryBox>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-[var(--accent-ink)]">{t.id}</span>
              <Badge tone={TT_TONE[t.trang_thai]}>{TT_LABEL[t.trang_thai]}</Badge>
              <MienBadge mien={t.mien} />
              <span className="text-sm"><b>{d.xac.length}</b> xác · {tt.length} loại linh kiện</span>
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">
              Tạo bởi {displayName(t.nguoi_tao)} lúc {fmtDate(t.created_at)}
              {t.gui_kt_luc && ` · Gửi KT ${fmtDate(t.gui_kt_luc)}`}
              {t.kt_luc && ` · KT duyệt: ${displayName(t.kt_boi)} ${fmtDate(t.kt_luc)}`}
            </div>
          </SummaryBox>
          {t.trang_thai === "nhap" && t.ly_do_tra_lai && <Banner tone="red">↩ Kế toán trả lại ({displayName(t.tra_lai_boi)}, {fmtDate(t.tra_lai_luc)}): {t.ly_do_tra_lai}</Banner>}
          {t.trang_thai === "cho_ke_toan" && isA && <Banner tone="amber">Đang chờ Kế toán duyệt — vẫn thêm / bớt xác và sửa thông tin được, mọi thay đổi ghi nhật ký.</Banner>}

          <Section title="🧾 Thông tin trả xác" right={suaTT && doiTT ? <Btn size="sm" variant="primary" disabled={busy} onClick={() => run(luu, "Đã lưu thông tin thùng.")}>Lưu</Btn> : undefined}>
            {suaTT ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Đối tác / nhà máy"><Input value={f.doi_tac} disabled={!isA} onChange={(e) => setF({ ...f, doi_tac: e.target.value })} /></Field>
                <Field label="Mã EO" required><Input value={f.ma_eo} onChange={(e) => setF({ ...f, ma_eo: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Ghi chú"><Textarea rows={2} value={f.ghi_chu} onChange={(e) => setF({ ...f, ghi_chu: e.target.value })} /></Field></div>
              </div>
            ) : (
              <KvGrid>
                <Kv k="Đối tác" v={t.doi_tac || "—"} />
                <Kv k="Mã EO" v={t.ma_eo ? <span className="font-mono">{t.ma_eo}</span> : "—"} />
                <Kv k="Ghi chú" v={t.ghi_chu || "—"} wide />
              </KvGrid>
            )}
          </Section>

          <Section title={`🔩 Tổng hợp theo linh kiện xác`} right={<CopyBtn text={tomTatText} title="Sao chép tổng hợp" />}>
            {tt.length ? (
              <div className="text-sm space-y-0.5">
                {tt.map((x) => (
                  <div key={x.ma || "_"} className="flex justify-between gap-2"><span className="truncate" title={x.ten}>{x.ten}</span><b>× {x.n}</b></div>
                ))}
              </div>
            ) : <p className="text-sm text-[var(--ink-soft)]">Chưa có xác nào trong thùng.</p>}
          </Section>

          <Section title={`♻️ Xác trong thùng (${d.xac.length})`} right={suaXac ? <Btn size="sm" variant="secondary" onClick={() => setThem(true)}>＋ Thêm xác</Btn> : undefined}>
            <XacTable
              rows={d.xac}
              onOpen={(r) => setOpenUnit(r.id)}
              extra={suaXac ? { key: "bo", header: "", render: (r) => <Btn size="sm" variant="ghost" disabled={busy} onClick={(e) => { e.stopPropagation(); run(() => api.delete(`/tra-xac/thung/${id}/xac/${r.id}`), `Đã bỏ ${r.id} khỏi thùng (về danh sách chờ gom).`); }}>✕ Bỏ</Btn> } : undefined}
            />
          </Section>
        </DetailGrid>
      )}
      {them && t && <ThemXacModal thung={t} onClose={() => setThem(false)} onDone={() => { setThem(false); onChanged(); load(); }} />}
      {traLai && <TraLaiModal onClose={() => setTraLai(false)} onOk={(lyDo) => { setTraLai(false); run(() => api.post(`/tra-xac/thung/${id}/kt-tra-lai`, { ly_do: lyDo }), "Đã trả lại Admin BH."); }} />}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} nested onClose={() => setOpenUnit(null)} onChanged={load} />}
    </Modal>
  );
}

function TraLaiModal({ onClose, onOk }: { onClose: () => void; onOk: (lyDo: string) => void }) {
  const [lyDo, setLyDo] = useState("");
  return (
    <Modal title="Trả lại thùng cho Admin BH" onClose={onClose} maxWidthClass="max-w-md" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="danger" disabled={!lyDo.trim()} onClick={() => onOk(lyDo.trim())}>Trả lại</Btn></>}>
      <Field label="Lý do" required><Textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: sai mã EO, thiếu xác…" /></Field>
    </Modal>
  );
}

function ThemXacModal({ thung, onClose, onDone }: { thung: ThungXac; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const base = `/tra-xac/xac?nhom=cho_gom${thung.mien ? `&mien_thung=${thung.mien}` : ""}`;
  const flt = useListFilters(base, XAC_DEFS.map((d) => d.key));
  const { items, total, page, pageCount, setPage, loading } = usePagedApi<XacRow>(withQuery(base, flt.query), "xac", 50);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOn = items.length > 0 && items.every((r) => sel.has(r.id));
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>(`/tra-xac/thung/${thung.id}/xac`, { unit_ids: [...sel] });
      toast(`Đã thêm ${r.ok} xác${r.loi.length ? ` — ${r.loi.length} không thêm được` : ""}.`, r.loi.length ? "error" : "ok");
      onDone();
    } catch (e) {
      toast(err(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Thêm xác vào ${thung.id}`} onClose={onClose} maxWidthClass="max-w-5xl" footerActions={<><Btn variant="ghost" onClick={onClose}>Huỷ</Btn><Btn variant="primary" disabled={busy || !sel.size} onClick={submit}>Thêm {sel.size} xác</Btn></>}>
      {thung.mien && <p className="text-xs text-[var(--ink-soft)] mb-1">Chỉ hiện xác cùng miền với thùng ({thung.mien}) hoặc chưa khai báo miền.</p>}
      <FilterBar f={flt} defs={XAC_DEFS} placeholder="Tìm mã đơn, case, linh kiện, KTV…" />
      <Btn size="sm" variant="ghost" className="mb-1" disabled={!items.length} onClick={() => setSel((s) => { const n = new Set(s); items.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n; })}>
        {allOn ? "☐ Bỏ chọn trang này" : `☑ Chọn cả trang (${items.length})`}
      </Btn>
      {loading && !items.length ? <Spinner /> : <XacTable rows={items} selected={sel} onToggle={toggle} onOpen={(r) => toggle(r.id)} />}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
    </Modal>
  );
}

// ---- Man chinh ----
export function TraXacScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const ch = () => refresh();
  const tabs: TabDef[] = [
    { key: "cho_gom", label: "♻️ Xác chờ gom", show: (u) => admin(u) || u.la_view || u.la_giam_sat, countKeys: ["admin_xac_cho_gom"], hint: "Xác Đổi mới 'Trả đối tác' chưa vào thùng", render: () => <XacChoGom user={user} onChanged={ch} /> },
    { key: "nhap", label: "📦 Thùng nháp", show: admin, countKeys: ["admin_thung_xac_tra_lai"], hint: "Thùng đang gom — thêm / bớt xác, nhập mã EO, gửi Kế toán", render: () => <ThungList key="nhap" user={user} tt="nhap" title="Thùng trả xác nháp" empty="Chưa có thùng nháp nào." onChanged={ch} /> },
    { key: "cho_kt", label: "⏳ Chờ KT duyệt", show: (u) => admin(u) || kt(u), countKeys: ["ketoan_thung_xac"], hint: "Kế toán kiểm tra thông tin, duyệt hoặc trả lại", render: () => <ThungList key="cho_kt" user={user} tt="cho_ke_toan" title="Thùng chờ Kế toán duyệt" empty="Không có thùng nào chờ duyệt." onChanged={ch} /> },
    { key: "da_duyet", label: "✔ Đã duyệt", show: xem, render: () => <ThungList key="da_duyet" user={user} tt="da_duyet" title="Thùng đã duyệt (kết thúc)" empty="Chưa có thùng nào được duyệt." onChanged={ch} /> },
    { key: "ngoai", label: "Đã xử lý ngoài", show: (u) => admin(u) || u.la_view, render: () => <XacNgoai user={user} onChanged={ch} /> },
  ];
  return <TabScreen user={user} tabs={tabs} title="Trả xác linh kiện" />;
}
