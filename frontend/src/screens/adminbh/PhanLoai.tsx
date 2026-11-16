import { fmtDate } from "../../lib/format";
import { displayName } from "../../hooks/useUserNames";
import { useLkName } from "../../hooks/useLinhKien";
import { useEffect, useState } from "react";
import { BuocChips } from "../shared/BuocChips";
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
import { BulkDoiLinhKienModal } from "./BulkDoiLinhKienModal";
import { ThungChoNhanLink } from "./ThungNoiBo";
import { useListFilters } from "../../ui/FilterBar";
import { ExcelToolbar } from "../../ui/ColumnFilter";
import { ADMIN_FILTER_COLS, ADMIN_FILTER_KEYS, ADMIN_QUICK_DEFS } from "./adminExcel";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { PhanLoaiModal } from "../shared/PhanLoaiModal";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { FastActionsModal } from "../shared/FastActionsModal";
import { YeuCauBoSungModal } from "../shared/YeuCauBoSungModal";
import { BaoCaoSaiModal } from "../shared/BaoCaoSaiModal";
import type { AppUser, DonCha, DonVi } from "../../lib/types";
import { GroupedDonView, DonViewToggle, useDonViewMode, type GroupRow } from "../../ui/GroupedDonView";
import { StatusBadge } from "../../ui/StatusBadge";
import { ExcelExportButton } from "../../ui/ExcelExport";
import { donViExportCols } from "../shared/exportCols";
import type { ExportCol } from "../../ui/ExcelExport";

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
  // 16/11/2026: loc kieu Excel (tieu de cot + chip + nut loc theo cot o che do nhom). O "Người gửi" (ktv) tu dong bo
  // voi ?ktv= cua menu 2 (useListFilters). Lua chon lay tu GET /admin/don-vi/loc-options (tra ve {loc}).
  const flt = useListFilters("/admin/don-vi/loc-options", ADMIN_FILTER_KEYS);
  const { nameOf } = useLkName();
  const qs = flt.query;
  const [bulkSlOpen, setBulkSlOpen] = useState(false);
  // 02/11/2026: 3 che do xem - Danh sach (bang thong nhat) / nhom theo KTV / nhom theo linh kien. Che do
  // nhom lay toi da 1000 don cha + 1000 don vi 1 lan (hang doi bi gate nen thuc te khong lon).
  const [mode, setMode] = useDonViewMode("don_view_xu_ly");
  const grouped = mode !== "list";
  const { refresh } = useWorkload();
  const {
    items: donCha,
    total: donChaTotal,
    page: donChaPage,
    pageCount: donChaPageCount,
    setPage: setDonChaPage,
    reload: reloadDonCha,
  } = usePagedApi<DonCha>(`/admin/don-cha?${qs}${grouped ? "&view=nhom" : ""}`, "don_cha", grouped ? 1000 : 20);
  const {
    items: donVi,
    total: donViTotal,
    page: donViPage,
    pageCount: donViPageCount,
    setPage: setDonViPage,
    loading: loadingDonVi,
    reload: reloadDonVi,
    raw: donViRaw,
  } = usePagedApi<DonVi>(grouped ? `/admin/don-vi?view=nhom${qs ? "&" + qs : ""}` : `/admin/don-vi?group=1${qs ? "&" + qs : ""}`, "don_vi", grouped ? 1000 : 20);
  const donViUnits = grouped ? donViTotal : ((donViRaw.total_don_vi as number) ?? 0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkFastOpen, setBulkFastOpen] = useState(false);
  const [bulkLkOpen, setBulkLkOpen] = useState(false);
  // Chon hang loat chi trong trang dang xem (doi trang -> bo chon, tranh ap nham don khong nhin thay).
  useEffect(() => setSelected(new Set()), [donViPage, qs, mode]);
  const selectedUnits = donVi.filter((u) => selected.has(u.id));

  const [xacNhanSlFor, setXacNhanSlFor] = useState<DonCha | null>(null);
  const [donDichVuOpen, setDonDichVuOpen] = useState(false);
  const [thungHoId, setThungHoId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [phanLoaiFor, setPhanLoaiFor] = useState<DonVi | null>(null);
  const [fastFor, setFastFor] = useState<DonVi | null>(null);
  const [boSungFor, setBoSungFor] = useState<string | null>(null);
  const [baoCaoSaiFor, setBaoCaoSaiFor] = useState<string | null>(null);

  const afterChange = () => {
    reloadDonCha();
    reloadDonVi();
    flt.reloadLoc();
    refresh();
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

  const gRows: GroupRow[] = grouped
    ? [
        ...donCha.map((p) => ({
          id: p.id,
          ktv: p.ktv ?? null,
          lk: p.ma_lk,
          caseId: p.case_id,
          slDat: p.so_luong_khai,
          slDuyet: null,
          serial: p.case_serial,
          ngayMua: p.case_ngay_mua,
          ngaySx: p.case_ngay_sx,
          moTa: p.mo_ta_loi,
          status: <Badge tone="amber">Chờ xác nhận SL</Badge>,
          sla: <SlaBadge since={p.created_at} entityType="phieu_sc" entityId={p.id} clickable />,
          actions: (
            <Btn size="sm" variant="primary" onClick={() => setXacNhanSlFor(p)}>
              Xác nhận SL
            </Btn>
          ),
          onClick: () => setXacNhanSlFor(p),
        })),
        ...donVi.map((u) => ({
          id: u.id,
          parentId: u.parent_id,
          ktv: u.ktv ?? null,
          lk: u.ma_lk_nhan || u.ma_lk || null,
          caseId: u.case_id,
          slDat: u.so_luong_khai,
          slDuyet: u.so_luong_thuc_nhan,
          laDonVi: true,
          serial: u.case_serial,
          ngayMua: u.case_ngay_mua,
          ngaySx: u.case_ngay_sx,
          moTa: u.mo_ta_loi,
          status: <StatusBadge kind="unit" value={u.trang_thai} />,
          sla: <SlaBadge since={u.updated_at} entityType="phieu_sc_ct" entityId={u.id} clickable />,
          selectable: true,
          badge: u.case_xac_minh === 1 ? <Badge tone="amber">Case chưa xác minh</Badge> : u.case_xac_minh === 2 ? <Badge tone="red">Sai case</Badge> : undefined,
          actions:
            u.trang_thai === "cho_bo_sung_tt" ? undefined : (
              <>
                <Btn size="sm" variant="primary" onClick={() => setPhanLoaiFor(u)}>
                  Phân loại
                </Btn>
                <Btn size="sm" onClick={() => setFastFor(u)} title="Xử lý nhanh">
                  ⚡
                </Btn>
              </>
            ),
          onClick: () => setDetailId(u.id),
        })),
      ]
    : [];

  if ((loadingDonVi && donVi.length === 0 && donCha.length === 0 && donChaTotal === 0 && !qs)) return <Spinner />;

  return (
    <div className="space-y-3">
      <ThungChoNhanLink />

      <Card className="p-3">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">🗂️ Đơn bảo hành cần xử lý ({donChaTotal + donViUnits})</h3>
          <div className="flex flex-wrap items-center gap-2">
            <DonViewToggle value={mode} onChange={setMode} />
            {selected.size > 0 && (
              <>
                <Badge tone="blue">{selected.size} đã chọn</Badge>
                <Btn onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
                <Btn onClick={() => setBulkFastOpen(true)} title="Đổi mới / Trừ công nợ / Sửa chữa... cho cả nhóm, chọn 1 lần">
                  ⚡ Xử lý nhanh hàng loạt
                </Btn>
                <Btn onClick={() => setBulkLkOpen(true)} title="Đổi linh kiện thực tế gửi về (B) / đổi mới (C) cho các đơn đã chọn">
                  🔩 Đổi linh kiện
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
            <Btn variant="primary" onClick={() => setDonDichVuOpen(true)}>
              + Tạo đơn thủ công
            </Btn>
          </div>
        </div>
        <BuocChips
          gds={["cho_xac_nhan_so_luong", "cho_phan_loai", "admin_can_xem_lai", "cho_bo_sung_tt"]}
          nhan={{ cho_xac_nhan_so_luong: "Xác nhận SL", cho_phan_loai: "Chờ phân loại", admin_can_xem_lai: "Cần xem lại", cho_bo_sung_tt: "Chờ KTV bổ sung" }}
          value={flt.values.tt || ""}
          onChange={(gd) => flt.set("tt", gd)}
        />
        <ExcelToolbar
          flt={flt}
          cols={ADMIN_FILTER_COLS}
          defs={ADMIN_QUICK_DEFS}
          colButtons={grouped}
          placeholder="Mã đơn / case / phiếu gửi, khách hàng, serial, linh kiện, KTV, mô tả lỗi…"
          total={donChaTotal + donViUnits}
          unit="đơn"
          extra={
            <ExcelExportButton
              file="cho-phan-loai"
              disabled={!(donChaTotal + donViUnits)}
              sources={[
                { path: `/admin/don-vi?view=nhom${qs ? "&" + qs : ""}`, itemsKey: "don_vi", sheet: "Don vi can xu ly", cols: donViExportCols(nameOf) },
                { path: `/admin/don-cha?view=nhom${qs ? "&" + qs : ""}`, itemsKey: "don_cha", sheet: "Cho xac nhan SL", cols: DON_CHA_EXPORT(nameOf) },
              ]}
            />
          }
        />
        {grouped ? (
          <GroupedDonView rows={gRows} mode={mode as "ktv" | "lk"} selected={selected} onToggle={toggleAll} emptyText="Không có đơn nào cần xử lý." />
        ) : (
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
          flt={flt}
        />
        )}
        {!grouped && donChaPageCount > 1 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-[var(--ink-soft)]">Đơn chờ xác nhận số lượng ({donChaTotal})</p>
            <Pagination page={donChaPage} pageCount={donChaPageCount} total={donChaTotal} onChange={setDonChaPage} />
          </div>
        )}
        {!grouped && donViPageCount > 1 && (
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
      {donDichVuOpen && (
        <DonDichVuModal
          onClose={() => setDonDichVuOpen(false)}
          onDone={() => {
            setDonDichVuOpen(false);
            afterChange();
          }}
          onKtvThung={(id) => {
            setDonDichVuOpen(false);
            setThungHoId(id);
          }}
        />
      )}
      {thungHoId && (
        <PhieuGuiDetailModal
          guiId={thungHoId}
          onClose={() => {
            setThungHoId(null);
            afterChange();
          }}
          onChanged={afterChange}
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
      {bulkLkOpen && (
        <BulkDoiLinhKienModal
          ids={selectedUnits.map((u) => u.id)}
          onClose={() => setBulkLkOpen(false)}
          onDone={() => {
            setBulkLkOpen(false);
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

// 16/11/2026: cot file Excel cho don cha cho xac nhan so luong (tai theo bo loc).
function DON_CHA_EXPORT(nameOf: (m: string | null | undefined) => string): ExportCol<DonCha>[] {
  return [
    { header: "Đơn cha", value: (r) => r.id, width: 14 },
    { header: "Thùng", value: (r) => r.phieu_gui_id, width: 12 },
    { header: "KTV / Nguồn", value: (r) => (r.ktv ? displayName(r.ktv) : r.ten_khach_hang ? `Khách lẻ · ${r.ten_khach_hang}` : "Khách lẻ"), width: 30 },
    { header: "Mã case", value: (r) => r.case_id, width: 16 },
    { header: "Linh kiện KTV chọn", value: (r) => (r.ma_lk ? nameOf(r.ma_lk) : ""), width: 34 },
    { header: "SL khai", value: (r) => r.so_luong_khai, width: 8 },
    { header: "Mô tả lỗi", value: (r) => r.mo_ta_loi, width: 40 },
    { header: "Miền", value: (r) => (r.mien === "MB" ? "Miền Bắc" : r.mien === "MN" ? "Miền Nam" : "Chưa khai báo"), width: 12 },
    { header: "Tạo lúc", value: (r) => fmtDate(r.created_at), width: 16 },
  ];
}
