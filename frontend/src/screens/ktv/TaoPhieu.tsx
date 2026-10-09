import { useState } from "react";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_PHIEU_GUI_LABELS, HINH_THUC_GUI_LABELS } from "../../lib/constants";
import { fmtDateOnly } from "../../lib/format";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import { PickKtvModal } from "./PickKtvModal";
import { OdooDonList, useOdooChoGui, useSelection, KhongGuiModal, OdooKhongGuiSection } from "./OdooDonPicker";
import type { AppUser, OdooDon, PhieuGui } from "../../lib/types";

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
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<PhieuGui>("/phieu-gui", "phieu_gui");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Don bao hanh Odoo dang cho gui sua cua chinh KTV (yeu cau 04/10/2026) - chi hien voi KTV that;
  // nguoi "tao ho" chon don Odoo trong chi tiet phieu sau khi da chon KTV.
  const odoo = useOdooChoGui(null, isSelfKtv);
  const sel = useSelection();
  const [huyOdoo, setHuyOdoo] = useState<OdooDon | null>(null);
  const reloadOdoo = () => {
    odoo.reload();
    refresh();
  };
  const afterChange = () => {
    reload();
    refresh();
    odoo.reload();
  };
  const taoThungTuOdoo = async () => {
    setCreating(true);
    try {
      const r = await api.post<{ id: string }>("/phieu-gui");
      const add = await api.post<{ created: string[]; loi: unknown[] }>(`/phieu-gui/${r.id}/don-tu-odoo`, { odoo_ids: [...sel.selected] });
      toast(`Đã tạo phiếu ${r.id} với ${add.created.length} đơn Odoo.`, "ok");
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

  if (loading && rows.length === 0) return <Spinner />;

  const cols: Column<PhieuGui>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <StatusBadge kind="gui" value={r.trang_thai} /> },
    ...(hoMode ? [{ key: "ktv", header: "Tạo cho KTV", render: (r: PhieuGui) => <span className="text-xs">{r.nguoi_tao}</span> } as Column<PhieuGui>] : []),
    { key: "ngay", header: "Ngày tạo", render: (r) => fmtDateOnly(r.ngay_tao) },
    { key: "hinhthuc", header: "Hình thức gửi", render: (r) => (r.hinh_thuc_gui ? HINH_THUC_GUI_LABELS[r.hinh_thuc_gui] || r.hinh_thuc_gui : "—") },
    { key: "sucos", header: "Sự cố", render: (r) => (r.su_co_tiep_nhan ? <Badge tone="red">⚠ Có</Badge> : "—") },
  ];

  return (
    <div className="space-y-4">
    {isSelfKtv && odoo.don && (odoo.don.length > 0 || odoo.khongGui.length > 0) && (
      <Card className="p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🧾 Đơn bảo hành Odoo chờ gửi sửa ({odoo.don.length})</h3>
            <p className="text-xs text-[var(--ink-soft)]">Chọn các đơn sẽ gửi về kho rồi tạo thùng — mã ca, linh kiện, số lượng được điền sẵn.</p>
          </div>
          <Btn variant="primary" disabled={creating || sel.selected.size === 0} onClick={taoThungTuOdoo} className="w-full sm:w-auto">
            Tạo thùng với {sel.selected.size || ""} đơn đã chọn
          </Btn>
        </div>
        {odoo.don.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Không còn đơn Odoo nào chờ gửi sửa.</p>
        ) : (
          <OdooDonList don={odoo.don} selected={sel.selected} onToggle={sel.toggle} onToggleAll={() => sel.toggleAll(odoo.don!.map((d) => d.odoo_id))} onKhongGui={setHuyOdoo} />
        )}
        <OdooKhongGuiSection items={odoo.khongGui} onChanged={reloadOdoo} />
      </Card>
    )}
    {huyOdoo && (
      <KhongGuiModal
        don={huyOdoo}
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
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📦 {hoMode ? "Phiếu bảo hành tôi đã tạo hộ" : "Phiếu gửi hàng của tôi"} ({total})</h3>
        <Btn variant="primary" disabled={creating} onClick={() => (hoMode ? setPickOpen(true) : taoPhieu())}>
          + Tạo phiếu mới
        </Btn>
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText={hoMode ? "Chưa tạo hộ phiếu nào." : "Chưa có phiếu gửi nào."} />
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
    </div>
  );
}
