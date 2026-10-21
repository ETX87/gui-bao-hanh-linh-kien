import { useState } from "react";
import { FilterBar, useListFilters, withQuery } from "../../ui/FilterBar";
import { phieuTraDefs } from "../shared/phieuTraFilters";
import { MienBadge } from "../../ui/MienBadge";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Badge, Spinner } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Man "Dong goi & gui phieu tra bao hanh" (Kho) - port dung renderKhoDongGoi(): chua Ke toan duyet
// (da_duyet_ke_toan) can dong goi/gui, + "da_gui" cho Kho co the xac nhan ket thuc du phong (dung cho
// MOI phieu tra, khong chi khach le - dung "Phan hoi vong 2" da chot 21/08/2026). Ca 2 phan trang that
// (server LIMIT/OFFSET) doc lap nhau.

export function KhoDongGoiScreen({ user }: { user: AppUser }) {
  const { refresh } = useWorkload();
  const DEFS = phieuTraDefs();
  const flt = useListFilters("/phieu-tra?trang_thai=da_duyet_ke_toan,da_gui,khieu_nai_van_chuyen", DEFS.map((d) => d.key));
  const { items: choDongGoi, total: choDongGoiTotal, page: choDongGoiPage, pageCount: choDongGoiPageCount, setPage: setChoDongGoiPage, loading: loading1, reload: reload1 } = usePagedApi<PhieuTra>(
    withQuery("/phieu-tra?trang_thai=da_duyet_ke_toan", flt.query),
    "phieu_tra",
  );
  const { items: daGui, total: daGuiTotal, page: daGuiPage, pageCount: daGuiPageCount, setPage: setDaGuiPage, loading: loading2, reload: reload2 } = usePagedApi<PhieuTra>(
    withQuery("/phieu-tra?trang_thai=da_gui", flt.query),
    "phieu_tra",
  );
  // 12/10/2026: KTV bao khong nhan duoc hang -> Kho danh gia gui thanh cong / that bai.
  const { items: khieuNai, total: khieuNaiTotal, page: knPage, pageCount: knPageCount, setPage: setKnPage, reload: reload3 } = usePagedApi<PhieuTra>(
    withQuery("/phieu-tra?trang_thai=khieu_nai_van_chuyen", flt.query),
    "phieu_tra",
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  const afterChange = () => {
    reload1();
    reload2();
    reload3();
    refresh();
  };

  if (loading1 && loading2 && choDongGoi.length === 0 && daGui.length === 0 && !flt.active) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : <UserName email={r.ktv_nhan} />) },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "sodon", header: "Số đơn", render: (r) => r.so_don ?? "—" },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "vandon", header: "Mã vận đơn", render: (r) => r.ma_van_don || "—" },
  ];

  return (
    <div className="space-y-3">
      <FilterBar f={flt} defs={DEFS} placeholder="Tìm mã phiếu, mã ĐH, vận đơn, KTV, mã đơn / case / linh kiện bên trong…" />
      {khieuNaiTotal > 0 && (
        <Card className="p-3 border-[var(--red-500)]">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--red-700)] mb-1">⚠ KTV báo không nhận được hàng — cần Kho đánh giá ({khieuNaiTotal})</h3>
          <p className="text-xs text-[var(--ink-soft)] mb-2">Mở phiếu → kiểm tra với nhà xe / bưu điện → chọn "Gửi thành công" hoặc "Gửi thất bại (thất lạc)".</p>
          <Table
            columns={[...cols, { key: "kn", header: "Nội dung KTV báo", render: (r) => <span className="block max-w-[280px] truncate" title={r.khong_nhan_duoc_ghi_chu || ""}>{r.khong_nhan_duoc_ghi_chu || "—"}</span> }]}
            rows={khieuNai}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetailId(r.id)}
          />
          <Pagination page={knPage} pageCount={knPageCount} total={khieuNaiTotal} onChange={setKnPage} />
        </Card>
      )}
      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">📦 Chờ đóng gói & gửi ({choDongGoiTotal})</h3>
        <Table columns={cols} rows={choDongGoi} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào chờ đóng gói." />
        <Pagination page={choDongGoiPage} pageCount={choDongGoiPageCount} total={choDongGoiTotal} onChange={setChoDongGoiPage} />
      </Card>
      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">Đã gửi — chờ KTV xác nhận (Kho có thể xác nhận thay, dự phòng)</h3>
        <Table columns={cols} rows={daGui} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Không có phiếu trả nào đang chờ." />
        <Pagination page={daGuiPage} pageCount={daGuiPageCount} total={daGuiTotal} onChange={setDaGuiPage} />
      </Card>
      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
