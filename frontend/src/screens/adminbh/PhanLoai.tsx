import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Btn, Badge, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { AdminUnifiedTable } from "./AdminUnifiedTable";
import { XacNhanSoLuongModal } from "./XacNhanSoLuongModal";
import { DonDichVuModal } from "./DonDichVuModal";
import { BulkPhanLoaiModal } from "./BulkPhanLoaiModal";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { PhanLoaiModal } from "../shared/PhanLoaiModal";
import { FastActionsModal } from "../shared/FastActionsModal";
import { YeuCauBoSungModal } from "../shared/YeuCauBoSungModal";
import { BaoCaoSaiModal } from "../shared/BaoCaoSaiModal";
import type { AppUser, DonCha, DonVi, PhieuGui } from "../../lib/types";

// Man hinh chinh Admin BH - port dung "Bang thong nhat" (renderAdminUnifiedTable) da chot 22/08/2026:
// 1) Thung cho xac nhan tiep nhan noi bo tu Kho, 2) Bang thong nhat GOP ca don cha (cho xac nhan SL)
// LAN don vi can xu ly (xem AdminUnifiedTable.tsx - port lai day du sau QA 04/09/2026, truoc do Giai
// doan 4 tach rieng 2 bang + khong co tuy bien cot/chon-hang-loat). Man drill-in xem theo tung thung
// rieng (view the long cu cua prototype) KHONG port - bang thong nhat + UnitDetailModal la du de xu
// ly toan bo, click dong de mo chi tiet.

export function AdminPhanLoaiScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [phieuGui, setPhieuGui] = useState<PhieuGui[]>([]);
  const [donCha, setDonCha] = useState<DonCha[]>([]);
  const [donVi, setDonVi] = useState<DonVi[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [xacNhanSlFor, setXacNhanSlFor] = useState<DonCha | null>(null);
  const [donDichVuOpen, setDonDichVuOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [phanLoaiFor, setPhanLoaiFor] = useState<DonVi | null>(null);
  const [fastFor, setFastFor] = useState<DonVi | null>(null);
  const [boSungFor, setBoSungFor] = useState<string | null>(null);
  const [baoCaoSaiFor, setBaoCaoSaiFor] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [g, d, u] = await Promise.all([
      api.get<{ phieu_gui: PhieuGui[] }>("/admin/phieu-gui"),
      api.get<{ don_cha: DonCha[] }>("/admin/don-cha"),
      api.get<{ don_vi: DonVi[] }>("/admin/don-vi"),
    ]);
    setPhieuGui(g.phieu_gui);
    setDonCha(d.don_cha);
    setDonVi(u.don_vi);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const afterChange = () => {
    load();
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

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {phieuGui.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">📥 Thùng chờ xác nhận tiếp nhận nội bộ ({phieuGui.length})</h3>
          <div className="space-y-2">
            {phieuGui.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2.5">
                <span className="font-mono text-xs font-semibold">{g.id}</span>
                <span className="text-sm text-[var(--ink-700)] flex-1">{g.nguoi_tao}</span>
                {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Có sự cố</Badge>}
                <SlaBadge since={g.thoi_gian_nhan_kho} entityType="phieu_gui" entityId={g.id} clickable />
                <Btn variant="primary" onClick={() => tiepNhanNoiBo(g.id)}>
                  Xác nhận đã nhận
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">🗂️ Đơn bảo hành cần xử lý ({donCha.length + donVi.length})</h3>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <>
                <Badge tone="blue">{selected.size} đã chọn</Badge>
                <Btn onClick={() => setSelected(new Set())}>Bỏ chọn</Btn>
                <Btn variant="primary" onClick={() => setBulkOpen(true)}>
                  Phân loại hàng loạt
                </Btn>
              </>
            )}
            <Btn variant="primary" onClick={() => setDonDichVuOpen(true)}>
              + Tạo đơn dịch vụ tính phí
            </Btn>
          </div>
        </div>
        <AdminUnifiedTable
          parents={donCha}
          units={donVi}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpenXacNhanSl={(p) => setXacNhanSlFor(p)}
          onOpenDetail={(id) => setDetailId(id)}
          onOpenPhanLoai={(u) => setPhanLoaiFor(u)}
          onOpenFast={(u) => setFastFor(u)}
          onOpenBoSung={(pid) => setBoSungFor(pid)}
          onOpenBaoCaoSai={(pid) => setBaoCaoSaiFor(pid)}
        />
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
          onClose={() => setBulkOpen(false)}
          onDone={() => {
            setBulkOpen(false);
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
