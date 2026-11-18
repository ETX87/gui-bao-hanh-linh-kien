import { useEffect, useState } from "react";
import { FilterBar, useListFilters, withQuery, type FilterDef, CANH_BAO_DEF, KHOANG_DEF, LK_ABC_DEFS, LK_A_DEF, LK_B_DEF } from "../../ui/FilterBar";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_PHIEU_GUI_LABELS, HINH_THUC_GUI_LABELS } from "../../lib/constants";
import { fmtDateOnly, fmtTon, isOverdue } from "../../lib/format";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import { PickKtvModal } from "./PickKtvModal";
import { OdooDonList, useOdooChoGui, useSelection, KhongGuiModal, OdooHuyList, OdooDaGuiList } from "./OdooDonPicker";
import type { AppUser, OdooDon, PhieuGui } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";
import { ktvGuiStage } from "../../lib/ktvStage";
import { StageBadge } from "./KtvCards";

// Man "Gui hang bao hanh" (KTV) - port dung renderKtvTaoPhieu(): danh sach phieu gui cua chinh minh,
// tao phieu nhap moi, mo chi tiet de them don/xac nhan gui. Phan trang that (server LIMIT/OFFSET, xem
// hooks/usePagedApi.ts) - port dung yeu cau "tat ca du lieu dang bang deu phan trang" (05/09/2026).
//
// hoMode (yeu cau 05/09/2026 muc 1): GS/Admin bảo hành KHÔNG phải chính KTV truy cap man nay se thay
// "Phiếu tôi đã tạo hộ" (loc theo nguoi_tao_ho = chinh minh, khac voi KTV thay "cua chinh minh" theo
// nguoi_tao) - bam "+ Tạo phiếu mới" bat buoc chon KTV truoc (PickKtvModal) thay vi tao ngay.

export function KtvTaoPhieuScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const isSelfKtv = user.la_ktv_dvbh || user.la_ve_tinh;
  const hoMode = !isSelfKtv && (user.la_giam_sat || user.la_admin_bh || user.la_qtri);
  const LOC_DEFS: FilterDef[] = [
    { key: "trang_thai", label: "Trạng thái", kind: "map", labels: TRANG_THAI_PHIEU_GUI_LABELS },
    { key: "hinh_thuc_gui", label: "Hình thức gửi", kind: "map", labels: HINH_THUC_GUI_LABELS },
    ...(hoMode ? [{ key: "ktv", label: "KTV", kind: "person" as const }] : []),
    { key: "mien", label: "Miền", kind: "map", labels: { MB: "Miền Bắc", MN: "Miền Nam" }, noneLabel: "Chưa khai báo" },
    KHOANG_DEF,
  ];
  const flt = useListFilters("/phieu-gui", LOC_DEFS.map((d) => d.key));
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuGui>(withQuery("/phieu-gui", flt.query), "phieu_gui");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Don bao hanh Odoo dang cho gui sua cua chinh KTV (yeu cau 04/10/2026) - chi hien voi KTV that;
  // nguoi "tao ho" chon don Odoo trong chi tiet phieu sau khi da chon KTV.
  // 05/11/2026 - "1 Tài khoản KTV có thể tạo đơn thay cho 1 tài khoản KTV khác": KTV duoc Admin cho tao ho (Quan tri > Danh sach KTV)
  // chon "Làm đơn cho" -> thay don Odoo + tao thung cho KTV do (thung ghi nguoi_tao = KTV do, nguoi_tao_ho = minh).
  const [dsHo, setDsHo] = useState<{ email: string; ten: string | null }[]>([]);
  const [ktvFor, setKtvFor] = useState<string | null>(null);
  useEffect(() => {
    if (!isSelfKtv) return;
    api.get<{ ktv: { email: string; ten: string | null }[] }>("/ktv-lien-he/tao-ho-cua-toi").then((r) => setDsHo(r.ktv)).catch(() => setDsHo([]));
  }, [isSelfKtv]);
  const odoo = useOdooChoGui(ktvFor, isSelfKtv);
  const sel = useSelection();
  useEffect(() => sel.setSelected(new Set()), [ktvFor]); // eslint-disable-line react-hooks/exhaustive-deps
  const [huyOdoo, setHuyOdoo] = useState<OdooDon | null>(null);
  // 3 muc cho KTV quan ly don Odoo (09/10/2026): Chua gui / Da gui / Huy bo - moi muc 20 don/trang.
  const [odooTab, setOdooTab] = useState<"chua_gui" | "da_gui" | "huy">("chua_gui");
  const [daGuiKey, setDaGuiKey] = useState(0);
  // 30/10/2026 (UX mobile KTV, de xuat 3): KTV thay 2 tab "Đơn Odoo mới" / "Thùng của tôi" thay vi 2 danh
  // sach chong len nhau. Mac dinh mo tab Odoo neu con don chua gui, khong thi tab Thung.
  const [mainTab, setMainTab] = useState<"odoo" | "thung" | null>(null);
  const tab = !isSelfKtv ? "thung" : mainTab ?? (odoo.don && odoo.don.length > 0 ? "odoo" : "thung");
  const reloadOdoo = () => {
    odoo.reload();
    setDaGuiKey((k) => k + 1);
    refresh();
  };
  const afterChange = () => {
    reload();
    refresh();
    odoo.reload();
    setDaGuiKey((k) => k + 1);
  };
  const taoThungTuOdoo = async () => {
    setCreating(true);
    try {
      const r = await api.post<{ id: string }>("/phieu-gui", ktvFor ? { ktv_email: ktvFor } : undefined);
      const add = await api.post<{ created: string[]; loi: { error: string }[] }>(`/phieu-gui/${r.id}/don-tu-odoo`, { odoo_ids: [...sel.selected] });
      const soTrung = add.loi.filter((l) => l.error === "TRUNG_LINH_KIEN").length;
      toast(`Đã tạo phiếu ${r.id} với ${add.created.length} đơn Odoo${soTrung ? ` — ${soTrung} đơn bị bỏ vì trùng mã case + linh kiện đã có đơn` : ""}.`, soTrung ? "error" : "ok");
      sel.setSelected(new Set());
      afterChange();
      setDetailId(r.id);
    } catch (e) {
      toast(errorMessage(e), "error");
      afterChange();
    } finally {
      setCreating(false);
    }
  };

  const taoPhieu = async (ktvEmail?: string) => {
    setCreating(true);
    try {
      const r = await api.post<{ id: string }>("/phieu-gui", ktvEmail ? { ktv_email: ktvEmail } : undefined);
      toast("Đã tạo phiếu nháp mới.", "ok");
      afterChange();
      setDetailId(r.id);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setCreating(false);
    }
  };

  if (loading && rows.length === 0 && !flt.active) return <Spinner />;

  const soDonOf = (r: PhieuGui) => (r as PhieuGui & { so_don?: number }).so_don ?? 0;
  const buocTiep = (r: PhieuGui) =>
    r.trang_thai !== "nhap" ? (r.trang_thai === "da_gui" ? `Chờ Kho nhận · đã gửi ${fmtTon(r.updated_at)}` : "Kho đã nhận — xem ở Đơn của tôi") : soDonOf(r) === 0 ? "Thêm đơn vào thùng" : "Còn 1 bước: xác nhận đã gửi xe";
  const cols: Column<PhieuGui>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => (isSelfKtv ? <StageBadge stage={ktvGuiStage(r.trang_thai)} /> : <StatusBadge kind="gui" value={r.trang_thai} />) },
    { key: "sodon", header: "Số đơn", render: (r) => soDonOf(r) },
    ...(isSelfKtv ? [{ key: "buoc", header: "Bước tiếp", render: (r: PhieuGui) => <span className={r.trang_thai === "nhap" ? "font-semibold text-[var(--amber-700)]" : r.trang_thai === "da_gui" && isOverdue(r.updated_at, "thung_dang_gui") ? "font-semibold text-[var(--red-700)]" : "text-[var(--ink-soft)]"}>{buocTiep(r)}{!!r.su_co_tiep_nhan && <b className="text-[var(--red-700)]"> · ⚠ Kho báo sự cố</b>}{r.trang_thai === "nhap" && !!r.kho_tc_luc && <b className="text-[var(--red-700)]"> · ⛔ Kho từ chối — chưa nhận được hàng</b>}</span> } as Column<PhieuGui>] : []),
    ...(hoMode ? [{ key: "ktv", header: "Tạo cho KTV", render: (r: PhieuGui) => <UserName email={r.nguoi_tao} className="text-xs" /> } as Column<PhieuGui>] : []),
    ...(!hoMode && dsHo.length > 0 ? [{ key: "cua", header: "Của KTV", render: (r: PhieuGui) => (r.nguoi_tao === user.email ? <span className="text-xs text-[var(--ink-soft)]">Tôi</span> : <span className="text-xs">↪ <UserName email={r.nguoi_tao} /></span>) } as Column<PhieuGui>] : []),
    { key: "ngay", header: "Ngày tạo", render: (r) => fmtDateOnly(r.ngay_tao) },
    { key: "hinhthuc", header: "Hình thức gửi", render: (r) => (r.hinh_thuc_gui ? HINH_THUC_GUI_LABELS[r.hinh_thuc_gui] || r.hinh_thuc_gui : "—") },
    ...(isSelfKtv ? [] : [{ key: "sucos", header: "Sự cố", render: (r: PhieuGui) => (r.su_co_tiep_nhan ? <Badge tone="red">⚠ Có</Badge> : "—") } as Column<PhieuGui>]),
  ];

  return (
    <div className="space-y-3">
    {isSelfKtv && dsHo.length > 0 && (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-[var(--ink-soft)]">Làm đơn cho:</span>
        {[{ email: null as string | null, ten: "Tôi" }, ...dsHo].map((k) => (
          <button
            key={k.email ?? "_toi"}
            type="button"
            onClick={() => setKtvFor(k.email)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${ktvFor === k.email ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-white text-[var(--ink-body)] border-[var(--line)]"}`}
          >
            {k.ten || k.email}
          </button>
        ))}
      </div>
    )}
    {isSelfKtv && (
      <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 md:max-w-md" role="tablist">
        {(
          [
            ["odoo", "🧾 Đơn Odoo mới", odoo.don?.length ?? 0],
            ["thung", "📦 Thùng của tôi", total],
          ] as const
        ).map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setMainTab(k)}
            className={`focus-ring flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${tab === k ? "bg-[var(--surface)] text-[var(--accent-ink)] shadow-card" : "text-[var(--ink-soft)]"}`}
          >
            {label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${tab === k ? "bg-[var(--accent-soft)]" : "bg-[var(--line)]"}`}>{n}</span>
          </button>
        ))}
      </div>
    )}
    {isSelfKtv && tab === "odoo" && odoo.don && (
      <Card className="p-3">
        <div className="mb-2 flex flex-col md:flex-row md:items-center gap-2">

        <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1 md:w-[380px]" role="tablist">
          {(
            [
              ["chua_gui", "Chưa gửi", odoo.don.length],
              ["da_gui", "Đã gửi", odoo.soDaGui],
              ["huy", "Hủy bỏ", odoo.khongGui.length],
            ] as const
          ).map(([k, label, n]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={odooTab === k}
              onClick={() => setOdooTab(k)}
              className={`focus-ring min-w-0 flex-1 whitespace-nowrap rounded-lg px-1.5 py-2 md:py-1 text-[13px] font-semibold transition-colors sm:px-3 ${
                odooTab === k ? "bg-[var(--surface)] text-[var(--accent-ink)] shadow-card" : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${odooTab === k ? "bg-[var(--accent-soft)]" : "bg-[var(--line)]"}`}>{n}</span>
            </button>
          ))}
        </div>
          {odooTab === "chua_gui" && odoo.don.length > 0 && (
            <Btn variant="primary" disabled={creating || sel.selected.size === 0} onClick={taoThungTuOdoo} className="hidden md:inline-flex md:ml-auto">
              Tạo thùng với {sel.selected.size || ""} đơn đã chọn
            </Btn>
          )}
        </div>
        {odooTab === "chua_gui" && (
          <>
            {odoo.don.length === 0 ? (
              <p className="text-sm text-[var(--ink-faint)]">Không còn đơn Odoo nào chưa gửi.</p>
            ) : (
              <>
                <OdooDonList don={odoo.don} selected={sel.selected} onToggle={sel.toggle} onToggleAll={() => sel.toggleAll(odoo.don!.map((d) => d.odoo_id))} onKhongGui={setHuyOdoo} />
              </>
            )}
          </>
        )}
        {/* Dien thoai: nut tao thung dinh tren thanh menu duoi, chi hien khi da chon don (31/10/2026). */}
        {odooTab === "chua_gui" && sel.selected.size > 0 && (
          <div className="md:hidden fixed inset-x-0 bottom-[4.5rem] z-[55] border-t border-[var(--line)] bg-white/95 px-3 py-2 backdrop-blur" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            <Btn variant="primary" size="touch" className="w-full" disabled={creating} onClick={taoThungTuOdoo}>
              📦 Tạo thùng với {sel.selected.size} đơn đã chọn
            </Btn>
          </div>
        )}
        {odooTab === "da_gui" && <OdooDaGuiList ktvEmail={ktvFor} reloadKey={daGuiKey} onOpenPhieu={setDetailId} />}
        {odooTab === "huy" && <OdooHuyList items={odoo.khongGui} ktvEmail={ktvFor} onChanged={reloadOdoo} />}
      </Card>
    )}
    {huyOdoo && (
      <KhongGuiModal
        don={huyOdoo}
        ktvEmail={ktvFor}
        onClose={() => setHuyOdoo(null)}
        onDone={() => {
          sel.setSelected((prev) => {
            const n = new Set(prev);
            n.delete(huyOdoo.odoo_id);
            return n;
          });
          setHuyOdoo(null);
          reloadOdoo();
        }}
      />
    )}
    {tab === "thung" && (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📦 {hoMode ? "Phiếu bảo hành tôi đã tạo hộ" : isSelfKtv ? "Thùng của tôi" : "Phiếu gửi hàng của tôi"} ({total})</h3>
        <Btn variant="primary" disabled={creating} onClick={() => (hoMode ? setPickOpen(true) : taoPhieu(ktvFor ?? undefined))}>
          {isSelfKtv ? "+ Tạo thùng mới" : "+ Tạo phiếu mới"}
        </Btn>
      </div>
      <FilterBar collapsible={isSelfKtv} f={flt} defs={LOC_DEFS} placeholder="Tìm mã thùng, vận đơn, nhà xe, mã case, tên khách, linh kiện bên trong…" />
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={flt.active ? "Không có phiếu nào khớp bộ lọc." : hoMode ? "Chưa tạo hộ phiếu nào." : "Chưa có phiếu gửi nào."} />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && <PhieuGuiDetailModal guiId={detailId} onClose={() => setDetailId(null)} onChanged={afterChange} />}
      {pickOpen && (
        <PickKtvModal
          onClose={() => setPickOpen(false)}
          onPick={(ktvEmail) => {
            setPickOpen(false);
            taoPhieu(ktvEmail);
          }}
        />
      )}
    </Card>
    )}
    {tab !== "thung" && detailId && <PhieuGuiDetailModal guiId={detailId} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
