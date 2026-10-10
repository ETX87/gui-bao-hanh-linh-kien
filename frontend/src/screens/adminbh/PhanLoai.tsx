import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { SlaBadge } from "../../ui/SlaBadge";
import { AdminUnifiedTable } from "./AdminUnifiedTable";
import { XacNhanSoLuongModal } from "./XacNhanSoLuongModal";
import { DonDichVuModal } from "./DonDichVuModal";
import { BulkPhanLoaiModal } from "./BulkPhanLoaiModal";
import { BulkXacNhanSoLuongModal } from "./BulkXacNhanSoLuongModal";
import { AdminFilterBar, EMPTY_FILTER, filterQuery, type AdminFilter } from "./AdminFilterBar";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { PhanLoaiModal } from "../shared/PhanLoaiModal";
import { FastActionsModal } from "../shared/FastActionsModal";
import { YeuCauBoSungModal } from "../shared/YeuCauBoSungModal";
import { BaoCaoSaiModal } from "../shared/BaoCaoSaiModal";
import { OdooImportExportModal } from "../shared/OdooImportExportModal";
import type { AppUser, DonCha, DonVi, PhieuGui } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// Man hinh chinh Admin BH - port dung "Bang thong nhat" (renderAdminUnifiedTable) da chot 22/08/2026:
// 1) Thung cho xac nhan tiep nhan noi bo tu Kho, 2) Bang thong nhat GOP ca don cha (cho xac nhan SL)
// LAN don vi can xu ly (xem AdminUnifiedTable.tsx). Man drill-in xem theo tung thung rieng (view the
// long cu cua prototype) KHONG port - bang thong nhat + UnitDetailModal la du de xu ly toan bo, click
// dong de mo chi tiet.
//
// Phan trang (05/10/2026, "Cac danh sach table dai phai phan trang, toi da 20 dong/trang"): ca 3 nguon
// deu phan trang server 20/trang - thung cho tiep nhan noi bo, don cha cho xac nhan SL (pager rieng), va
// don vi can xu ly phan trang THEO DON CHA (?group=1: 20 don cha/trang, moi nhom "xN" la 1 dong thu gon
// nen bang van toi da 20 dong khi chua so ra).

export function AdminPhanLoaiScreen({ user }: { user: AppUser }) {
  const [odooImportOpen, setOdooImportOpen] = useState(false);
  const [filter, setFilter] = useState<AdminFilter>(EMPTY_FILTER);
  const qs = filterQuery(filter);
  const [optsKey, setOptsKey] = useState(0);
  const [bulkSlOpen, setBulkSlOpen] = useState(false);
  const toast = useToast();
  const { refresh } = useWorkload();
  const {
    items: phieuGui,
    total: phieuGuiTotal,
    page: phieuGuiPage,
    pageCount: phieuGuiPageCount,
    setPage: setPhieuGuiPage,
    loading: loadingPhieuGui,
    reload: reloadPhieuGui,
  } = usePagedApi<PhieuGui>("/admin/phieu-gui", "phieu_gui");
  const {
    items: donCha,
    total: donChaTotal,
    page: donChaPage,
    pageCount: donChaPageCount,
    setPage: setDonChaPage,
    reload: reloadDonCha,
  } = usePagedApi<DonCha>(`/admin/don-cha${qs ? "?" + qs : ""}`, "don_cha");
  const {
    items: donVi,
    total: donViTotal,
    page: donViPage,
    pageCount: donViPageCount,
    setPage: setDonViPage,
    loading: loadingDonVi,
    reload: reloadDonVi,
    raw: donViRaw,
  } = usePagedApi<DonVi>(`/admin/don-vi?group=1${qs ? "&" + qs : ""}`, "don_vi");
  const donViUnits = (donViRaw.total_don_vi as number) ?? 0;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkFastOpen, setBulkFastOpen] = useState(false);
  // Chon hang loat chi trong trang dang xem (doi trang -> bo chon, tranh ap nham don khong nhin thay).
  useEffect(() => setSelected(new Set()), [donViPage, qs]);
  const selectedUnits = donVi.filter((u) => selected.has(u.id));

  const [xacNhanSlFor, setXacNhanSlFor] = useState<DonCha | null>(null);
  const [donDichVuOpen, setDonDichVuOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [phanLoaiFor, setPhanLoaiFor] = useState<DonVi | null>(null);
  const [fastFor, setFastFor] = useState<DonVi | null>(null);
  const [boSungFor, setBoSungFor] = useState<string | null>(null);
  const [baoCaoSaiFor, setBaoCaoSaiFor] = useState<string | null>(null);

  const afterChange = () => {
    reloadPhieuGui();
    reloadDonCha();
    reloadDonVi();
    setOptsKey((k) => k + 1);
    refresh();
  };

  const tiepNhanNoiBo = async (id: string) => {
    try {
      await api.post(`/admin/phieu-gui/${id}/tiep-nhan-noi-bo`);
      toast("Đã xác nhận tiếp nhận nội bộ.", "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const toggleAll = (ids: string[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if ((loadingPhieuGui && phieuGui.length === 0 && phieuGuiTotal === 0) || (loadingDonVi && donVi.length === 0 && donCha.length === 0 && donChaTotal === 0 && !qs)) return <Spinner />;

  return (
    <div className="space-y-3">
      {phieuGuiTotal > 0 && (
        <Card className="px-3 py-2">
          <div className="flex flex-col md:flex-row md:items-start gap-2">
            <h3 className="shrink-0 md:pt-1 text-[15px] lg:text-sm font-bold text-[var(--ink)]">📥 Thùng chờ tiếp nhận nội bộ ({phieuGuiTotal})</h3>
            <div className="flex-1 min-w-0 flex flex-col md:flex-row md:flex-wrap gap-1.5 md:max-h-[72px] md:overflow-y-auto scrollbar-thin">
              {phieuGui.map((g) => (
                <div key={g.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] pl-2.5 pr-1 py-0.5 flex items-center gap-2 text-[13px]">
                  <span className="font-mono text-xs font-semibold text-[var(--link)] shrink-0">{g.id}</span>
                  <UserName email={g.nguoi_tao} className="text-[var(--ink-body)] truncate max-w-[180px]" />
                  {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Sự cố</Badge>}
                  <SlaBadge since={g.thoi_gian_nhan_kho} entityType="phieu_gui" entityId={g.id} clickable />
                  <Btn variant="primary" size="sm" onClick={() => tiepNhanNoiBo(g.id)} className="ml-auto shrink-0">
                    Xác nhận đã nhận
                  </Btn>
                </div>
              ))}
            </div>
          </div>
          <Pagination page={phieuGuiPage} pageCount={phieuGuiPageCount} total={phieuGuiTotal} onChange={setPhieuGuiPage} />
        </Card>
      )}

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🗂️ Đơn bảo hành cần xử lý ({donChaTotal + donViUnits})</h3>
          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 && (
              <>
                <Badge tone="blue">{selected.size} đã chọn</Badge>
                <Btn onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
                <Btn onClick={() => setBulkFastOpen(true)} title="Đổi mới / Trừ công nợ / Sửa chữa... cho cả nhóm, chọn 1 lần">
                  ⚡ Xử lý nhanh hàng loạt
                </Btn>
                <Btn variant="primary" onClick={() => setBulkOpen(true)}>
                  Phân loại hàng loạt
                </Btn>
              </>
            )}
            {donChaTotal > 0 && (
              <Btn variant="primary" onClick={() => setBulkSlOpen(true)} title="SL thực nhận điền sẵn = SL KTV khai, chỉ sửa đơn sai rồi xác nhận 1 lần">
                ✔ Xác nhận SL hàng loạt ({donChaTotal})
              </Btn>
            )}
            <Btn onClick={() => setOdooImportOpen(true)} title="File ID / Trạng thái / Ngày hoàn thành / Ghi chú để import ngược về Odoo">
              📤 File import Odoo
            </Btn>
            <Btn variant="primary" onClick={() => setDonDichVuOpen(true)}>
              + Tạo đơn dịch vụ tính phí
            </Btn>
          </div>
        </div>
        <AdminFilterBar value={filter} onChange={setFilter} reloadKey={optsKey} />
        <AdminUnifiedTable
          parents={donCha}
          units={donVi}
          selected={selected}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleAll}
          onOpenXacNhanSl={(p) => setXacNhanSlFor(p)}
          onOpenDetail={(id) => setDetailId(id)}
          onOpenPhanLoai={(u) => setPhanLoaiFor(u)}
          onOpenFast={(u) => setFastFor(u)}
          onOpenBoSung={(pid) => setBoSungFor(pid)}
          onOpenBaoCaoSai={(pid) => setBaoCaoSaiFor(pid)}
        />
        {donChaPageCount > 1 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-[var(--ink-soft)]">Đơn chờ xác nhận số lượng ({donChaTotal})</p>
            <Pagination page={donChaPage} pageCount={donChaPageCount} total={donChaTotal} onChange={setDonChaPage} />
          </div>
        )}
        {donViPageCount > 1 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-[var(--ink-soft)]">Đơn vị cần xử lý — {donViTotal} đơn cha / {donViUnits} đơn vị (20 đơn cha mỗi trang)</p>
            <Pagination page={donViPage} pageCount={donViPageCount} total={donViTotal} onChange={setDonViPage} />
          </div>
        )}
      </Card>

      {xacNhanSlFor && (
        <XacNhanSoLuongModal
          parent={xacNhanSlFor}
          onClose={() => setXacNhanSlFor(null)}
          onDone={() => {
            setXacNhanSlFor(null);
            afterChange();
          }}
        />
      )}
      {bulkSlOpen && (
        <BulkXacNhanSoLuongModal
          query={qs}
          onClose={() => setBulkSlOpen(false)}
          onDone={() => {
            setBulkSlOpen(false);
            afterChange();
          }}
        />
      )}
      {odooImportOpen && <OdooImportExportModal onClose={() => setOdooImportOpen(false)} />}
      {donDichVuOpen && (
        <DonDichVuModal
          onClose={() => setDonDichVuOpen(false)}
          onDone={() => {
            setDonDichVuOpen(false);
            afterChange();
          }}
        />
      )}
      {bulkOpen && (
        <BulkPhanLoaiModal
          unitIds={Array.from(selected)}
          units={selectedUnits}
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
            setSelected(new Set());
            afterChange();
          }}
        />
      )}
      {bulkFastOpen && (
        <FastActionsModal
          units={selectedUnits}
          isKhachLe={false}
          onClose={() => setBulkFastOpen(false)}
          onDone={() => {
            setBulkFastOpen(false);
            setSelected(new Set());
            afterChange();
          }}
        />
      )}
      {phanLoaiFor && (
        <PhanLoaiModal
          unit={phanLoaiFor}
          onClose={() => setPhanLoaiFor(null)}
          onDone={() => {
            setPhanLoaiFor(null);
            afterChange();
          }}
        />
      )}
      {fastFor && (
        <FastActionsModal
          unit={fastFor}
          isKhachLe={!fastFor.phieu_gui_id}
          onClose={() => setFastFor(null)}
          onDone={() => {
            setFastFor(null);
            afterChange();
          }}
          onNavigate={(special) => {
            const pid = fastFor.parent_id;
            setFastFor(null);
            if (special === "bo_sung_tt") setBoSungFor(pid);
            else setBaoCaoSaiFor(pid);
          }}
        />
      )}
      {boSungFor && (
        <YeuCauBoSungModal
          parentId={boSungFor}
          onClose={() => setBoSungFor(null)}
          onDone={() => {
            setBoSungFor(null);
            afterChange();
          }}
        />
      )}
      {baoCaoSaiFor && (
        <BaoCaoSaiModal
          parentId={baoCaoSaiFor}
          onClose={() => setBaoCaoSaiFor(null)}
          onDone={() => {
            setBaoCaoSaiFor(null);
            afterChange();
          }}
        />
      )}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
