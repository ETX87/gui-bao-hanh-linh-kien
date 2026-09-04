import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Btn, Badge, Spinner, EmptyState } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { Table, StopClick, type Column } from "../../ui/Table";
import { TRANG_THAI_UNIT_LABELS } from "../../lib/constants";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { XacNhanSoLuongModal } from "./XacNhanSoLuongModal";
import { DonDichVuModal } from "./DonDichVuModal";
import type { AppUser, DonCha, DonVi, PhieuGui } from "../../lib/types";

// Man hinh chinh Admin BH - port dung "Bang thong nhat" (renderAdminUnifiedTable) da chot 22/08/2026:
// 1) Thung cho xac nhan tiep nhan noi bo tu Kho, 2) Don cha cho xac nhan so luong, 3) Bang thong nhat
// don vi can xu ly (gop ca don KTV lan khach le). Da don gian hoa so voi prototype: BO tuy bien cot
// keo-tha (drag/resize, chi la "nice to have" cua ban demo, khong anh huong dung/sai nghiep vu) va BO
// man drill-in xem theo tung thung rieng (view the long cu) - bang thong nhat + UnitDetailModal la du
// de xu ly toan bo, click dong de mo chi tiet.

export function AdminPhanLoaiScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [phieuGui, setPhieuGui] = useState<PhieuGui[]>([]);
  const [donCha, setDonCha] = useState<DonCha[]>([]);
  const [donVi, setDonVi] = useState<DonVi[]>([]);
  const [loading, setLoading] = useState(true);
  const [xacNhanSlFor, setXacNhanSlFor] = useState<DonCha | null>(null);
  const [donDichVuOpen, setDonDichVuOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

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

  if (loading) return <Spinner />;

  const unitCols: Column<DonVi>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_UNIT_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    { key: "nguon", header: "Nguồn", render: (r) => (r.phieu_gui_id ? <span className="text-xs">{r.case_id || "—"}</span> : <Badge tone="violet">Khách lẻ</Badge>) },
    { key: "kh", header: "Khách hàng", render: (r) => <span className="text-xs">{r.nguon_tao === "admin_dich_vu" ? r.ten_khach_hang : "—"}</span> },
    { key: "lk", header: "Linh kiện", render: (r) => <span className="text-xs">{r.ma_lk || "—"}</span> },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => <span title={r.mo_ta_loi || ""}>{r.mo_ta_loi}</span> },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} entityType="phieu_sc_ct" entityId={r.id} clickable /> },
    {
      key: "act",
      header: "Hành động",
      render: (r) => (
        <StopClick>
          <Btn variant="primary" onClick={() => setDetailId(r.id)}>
            Mở
          </Btn>
        </StopClick>
      ),
    },
  ];

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
                {g.su_co_tiep_nhan && <Badge tone="red">⚠ Có sự cố</Badge>}
                <SlaBadge since={g.thoi_gian_nhan_kho} entityType="phieu_gui" entityId={g.id} clickable />
                <Btn variant="primary" onClick={() => tiepNhanNoiBo(g.id)}>
                  Xác nhận đã nhận
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      {donCha.length > 0 && (
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">🔢 Đơn cha chờ xác nhận số lượng thực nhận ({donCha.length})</h3>
          <div className="space-y-2">
            {donCha.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2.5">
                <span className="font-mono text-xs font-semibold">{p.id}</span>
                <span className="text-sm text-[var(--ink-700)] flex-1 truncate">{p.mo_ta_loi}</span>
                <Badge>KTV khai: {p.so_luong_khai}</Badge>
                <Btn variant="primary" onClick={() => setXacNhanSlFor(p)}>
                  Xác nhận SL
                </Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">🗂️ Đơn bảo hành cần xử lý ({donVi.length})</h3>
          <Btn variant="primary" onClick={() => setDonDichVuOpen(true)}>
            + Tạo đơn dịch vụ tính phí
          </Btn>
        </div>
        {donVi.length === 0 ? <EmptyState text="Không có đơn nào cần xử lý." /> : <Table columns={unitCols} rows={donVi} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} />}
      </Card>

      {xacNhanSlFor && <XacNhanSoLuongModal parent={xacNhanSlFor} onClose={() => setXacNhanSlFor(null)} onDone={() => { setXacNhanSlFor(null); afterChange(); }} />}
      {donDichVuOpen && <DonDichVuModal onClose={() => setDonDichVuOpen(false)} onDone={() => { setDonDichVuOpen(false); afterChange(); }} />}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
