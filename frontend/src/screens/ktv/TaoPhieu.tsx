import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { TRANG_THAI_PHIEU_GUI_LABELS } from "../../lib/constants";
import { fmtDateOnly } from "../../lib/format";
import { PhieuGuiDetailModal } from "./PhieuGuiDetailModal";
import { PickKtvModal } from "./PickKtvModal";
import type { AppUser, PhieuGui } from "../../lib/types";

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

  const afterChange = () => {
    reload();
    refresh();
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
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_PHIEU_GUI_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    ...(hoMode ? [{ key: "ktv", header: "Tạo cho KTV", render: (r: PhieuGui) => <span className="text-xs">{r.nguoi_tao}</span> } as Column<PhieuGui>] : []),
    { key: "ngay", header: "Ngày tạo", render: (r) => fmtDateOnly(r.ngay_tao) },
    { key: "hinhthuc", header: "Hình thức gửi", render: (r) => r.hinh_thuc_gui || "—" },
    { key: "sucos", header: "Sự cố", render: (r) => (r.su_co_tiep_nhan ? <Badge tone="red">⚠ Có</Badge> : "—") },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">📦 {hoMode ? "Phiếu bảo hành tôi đã tạo hộ" : "Phiếu gửi hàng của tôi"} ({total})</h3>
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
  );
}
