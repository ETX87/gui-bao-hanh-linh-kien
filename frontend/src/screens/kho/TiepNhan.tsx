import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Btn, Badge, Spinner, EmptyState } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { BaoSuCoModal } from "./BaoSuCoModal";
import { TiepNhanModal } from "./TiepNhanModal";
import { CameraScanModal } from "./CameraScanModal";
import { GhiChuLogModal } from "../shared/GhiChuLogModal";
import type { PhieuGui } from "../../lib/types";

// Man "Diem tiep nhan kho" - tiep nhan o muc THUNG (khong mo kiem tung linh kien), port dung
// khoXacNhanTiepNhan()/submitSuCo(). Quet camera (jsQR that, port lai o "QA vong 2" - da bo o Giai
// doan 4) chi dung de XAC DINH NHANH dung phieu (mo san TiepNhanModal), KHONG tu dong xac nhan nhan
// hang - van can nguoi dung chu dong bam "Xac nhan tiep nhan" trong modal, dung tinh than kiem soat
// noi bo da chot tu prototype.

export function KhoTiepNhanScreen() {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [pending, setPending] = useState<PhieuGui[]>([]);
  const [recent, setRecent] = useState<PhieuGui[]>([]);
  const [loading, setLoading] = useState(true);
  const [suCoFor, setSuCoFor] = useState<PhieuGui | null>(null);
  const [tiepNhanFor, setTiepNhanFor] = useState<PhieuGui | null>(null);
  const [logFor, setLogFor] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, r] = await Promise.all([api.get<{ phieu_gui: PhieuGui[] }>("/kho/phieu-gui?trang_thai=da_gui"), api.get<{ phieu_gui: PhieuGui[] }>("/kho/phieu-gui?trang_thai=da_tiep_nhan")]);
    setPending(p.phieu_gui);
    setRecent(r.phieu_gui);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const afterChange = () => {
    load();
    refresh();
  };

  const handleScanned = (text: string) => {
    setScanOpen(false);
    const code = text.trim();
    const found = pending.find((g) => g.id === code);
    if (found) {
      toast(`Đã quét đúng phiếu ${found.id} (${found.nguoi_tao}).`, "ok");
      setTiepNhanFor(found);
    } else if (recent.some((g) => g.id === code)) {
      toast("Phiếu này đã được tiếp nhận rồi.", "error");
    } else {
      toast("Không khớp phiếu nào đang chờ tiếp nhận — kiểm tra lại mã QR.", "error");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">📥 Chờ tiếp nhận ({pending.length})</h3>
          <Btn onClick={() => setScanOpen(true)}>📷 Quét bằng camera</Btn>
        </div>
        {pending.length === 0 ? (
          <EmptyState text="Không có thùng nào chờ tiếp nhận." />
        ) : (
          <div className="space-y-2">
            {pending.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2.5">
                <span className="font-mono text-xs font-semibold">{g.id}</span>
                <span className="text-sm text-[var(--ink-700)] flex-1">{g.nguoi_tao}</span>
                <span className="text-xs text-[var(--ink-500)]">{g.don_vi_van_chuyen}</span>
                <SlaBadge since={g.updated_at} entityType="phieu_gui" entityId={g.id} clickable />
                <Btn onClick={() => setLogFor(g.id)}>💬</Btn>
                <Btn variant="danger" onClick={() => setSuCoFor(g)}>
                  Báo sự cố
                </Btn>
                <Btn variant="primary" onClick={() => setTiepNhanFor(g)}>
                  Xác nhận tiếp nhận
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">Đã tiếp nhận gần đây</h3>
        {recent.length === 0 ? (
          <EmptyState text="Chưa tiếp nhận thùng nào." />
        ) : (
          <div className="space-y-1.5">
            {recent.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-100)] cursor-pointer" onClick={() => setLogFor(g.id)}>
                <span className="font-mono text-xs">{g.id}</span>
                <span className="flex-1 text-[var(--ink-600)]">{g.nguoi_tao}</span>
                {/* !! bat buoc - D1 tra ve so 0/1 chu khong phai true/false that, "0 && <Badge/>" se render chu "0" ra man hinh */}
                {!!g.su_co_tiep_nhan && <Badge tone="red">⚠ Có sự cố</Badge>}
                {!!g.admin_tiep_nhan && <Badge tone="green">Admin BH đã nhận</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {suCoFor && <BaoSuCoModal gui={suCoFor} onClose={() => setSuCoFor(null)} onDone={() => { setSuCoFor(null); afterChange(); }} />}
      {tiepNhanFor && <TiepNhanModal gui={tiepNhanFor} onClose={() => setTiepNhanFor(null)} onDone={() => { setTiepNhanFor(null); afterChange(); }} />}
      {logFor && <GhiChuLogModal guiId={logFor} onClose={() => setLogFor(null)} />}
      {scanOpen && <CameraScanModal onClose={() => setScanOpen(false)} onScanned={handleScanned} />}
    </div>
  );
}
