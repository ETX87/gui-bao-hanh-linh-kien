import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, Badge, ReadField, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_GUI_LABELS } from "../../lib/constants";
import { GhiChuLogPanel } from "../shared/GhiChuLogPanel";
import { AddDonModal } from "./AddDonModal";
import type { DonCha, PhieuGui } from "../../lib/types";

const HINH_THUC_OPTIONS = [
  { value: "xe_noi_bo", label: "Xe nội bộ" },
  { value: "nha_xe", label: "Nhà xe / vận chuyển" },
  { value: "buu_dien", label: "Bưu điện / chuyển phát" },
];

// Chi tiet phieu gui - port dung renderPhieuGuiDetail(): sua header (khi con "nhap"), them/xoa don,
// xac nhan gui xe, xoa phieu (khi con "nhap" va rong), ghi chu/phan hoi. Da BO tem/QR dan thung cua
// prototype (chi la tien ich in tem, khong anh huong luong nghiep vu) - xem CLAUDE.md.

export function PhieuGuiDetailModal({ guiId, onClose, onChanged }: { guiId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<{ phieu_gui: PhieuGui; don_cha: DonCha[] } | null>(null);
  const [hinhThuc, setHinhThuc] = useState("");
  const [maXe, setMaXe] = useState("");
  const [dvvc, setDvvc] = useState("");
  const [maVanDon, setMaVanDon] = useState("");
  const [ngayGuiXe, setNgayGuiXe] = useState("");
  const [addDonOpen, setAddDonOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get<{ phieu_gui: PhieuGui; don_cha: DonCha[] }>(`/phieu-gui/${guiId}`).then((r) => {
      setData(r);
      setHinhThuc(r.phieu_gui.hinh_thuc_gui || "xe_noi_bo");
      setMaXe(r.phieu_gui.ma_xe_hoac_tai_xe || "");
      setDvvc(r.phieu_gui.don_vi_van_chuyen || "");
      setMaVanDon(r.phieu_gui.ma_van_don || "");
      setNgayGuiXe(r.phieu_gui.ngay_gui_xe || "");
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guiId]);

  const run = async (fn: () => Promise<void>, refreshOuter = true) => {
    setBusy(true);
    try {
      await fn();
      if (refreshOuter) onChanged();
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Modal title="Chi tiết phiếu gửi" onClose={onClose} full>
        <Spinner />
      </Modal>
    );
  }
  const g = data.phieu_gui;
  const isNhap = g.trang_thai === "nhap";

  const saveHeader = () => run(async () => { await api.patch(`/phieu-gui/${g.id}`, { hinh_thuc_gui: hinhThuc, ma_xe_hoac_tai_xe: maXe, don_vi_van_chuyen: dvvc, ma_van_don: maVanDon }); toast("Đã lưu.", "ok"); }, false);
  const xacNhanGui = () => run(async () => { await api.post(`/phieu-gui/${g.id}/xac-nhan-gui`, { ngay_gui_xe: ngayGuiXe }); toast("Đã xác nhận gửi xe.", "ok"); });
  const xoaPhieu = () =>
    run(async () => {
      await api.delete(`/phieu-gui/${g.id}`);
      toast("Đã xoá phiếu.", "ok");
      onClose();
    });
  const xoaDon = (donId: string) => run(async () => { await api.delete(`/phieu-gui/don/${donId}`); toast("Đã xoá đơn.", "ok"); });

  return (
    <>
      <Modal
        title={`Phiếu gửi ${g.id}`}
        onClose={onClose}
        full
        headerActions={<Badge tone="blue">{TRANG_THAI_PHIEU_GUI_LABELS[g.trang_thai] || g.trang_thai}</Badge>}
        footerActions={
          isNhap ? (
            <>
              {data.don_cha.length === 0 && (
                <Btn variant="danger" disabled={busy} onClick={xoaPhieu}>
                  Xoá phiếu
                </Btn>
              )}
              <Btn variant="primary" disabled={busy || data.don_cha.length === 0} onClick={xacNhanGui}>
                Xác nhận đã gửi xe
              </Btn>
            </>
          ) : undefined
        }
      >
        <div className="space-y-6">
          {isNhap ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="Hình thức gửi">
                <Select value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value)}>
                  {HINH_THUC_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Mã xe / Tài xế">
                <Input value={maXe} onChange={(e) => setMaXe(e.target.value)} />
              </Field>
              <Field label="Đơn vị vận chuyển">
                <Input value={dvvc} onChange={(e) => setDvvc(e.target.value)} />
              </Field>
              <Field label="Mã vận đơn">
                <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
              </Field>
              <div className="col-span-2 md:col-span-4 flex items-end gap-3">
                <Field label="Ngày gửi xe">
                  <Input type="date" value={ngayGuiXe} onChange={(e) => setNgayGuiXe(e.target.value)} />
                </Field>
                <Btn onClick={saveHeader} disabled={busy}>
                  Lưu thông tin
                </Btn>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ReadField label="Hình thức gửi" value={HINH_THUC_OPTIONS.find((o) => o.value === g.hinh_thuc_gui)?.label || g.hinh_thuc_gui} />
              <ReadField label="Mã xe / Tài xế" value={g.ma_xe_hoac_tai_xe} />
              <ReadField label="Đơn vị vận chuyển" value={g.don_vi_van_chuyen} />
              <ReadField label="Ngày gửi xe" value={g.ngay_gui_xe} />
            </div>
          )}
          {g.su_co_tiep_nhan && (
            <p className="rounded-lg bg-[var(--coral-100)] text-[var(--coral-700)] text-xs font-bold px-3 py-2">
              ⚠ Kho báo sự cố tiếp nhận: {g.su_co_ly_do} {g.su_co_ghi_chu && `— ${g.su_co_ghi_chu}`}
            </p>
          )}
          {g.thoi_gian_nhan_kho && (
            <div className="flex items-center gap-2 text-xs text-[var(--ink-500)]">
              Kho tiếp nhận lúc {g.thoi_gian_nhan_kho} · <SlaBadge since={g.thoi_gian_nhan_kho} />
            </div>
          )}

          <div className="border-t border-[var(--line)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide">Đơn bảo hành trong phiếu ({data.don_cha.length})</p>
              {isNhap && (
                <Btn variant="primary" onClick={() => setAddDonOpen(true)}>
                  + Thêm đơn
                </Btn>
              )}
            </div>
            <div className="space-y-1.5">
              {data.don_cha.length === 0 && <p className="text-xs text-[var(--ink-400)]">Chưa có đơn nào — bấm "+ Thêm đơn" trước khi xác nhận gửi.</p>}
              {data.don_cha.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{d.id}</span>
                  <span className="flex-1 truncate">{d.mo_ta_loi}</span>
                  <span className="text-xs text-[var(--ink-500)]">SL: {d.so_luong_khai}</span>
                  {d.loai_doi_tru_de_xuat && <Badge tone="gray">{LOAI_DOI_TRU_LABELS[d.loai_doi_tru_de_xuat]}</Badge>}
                  {isNhap && (
                    <Btn variant="danger" onClick={() => xoaDon(d.id)} disabled={busy}>
                      Xoá
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <GhiChuLogPanel guiId={g.id} />
          </div>
        </div>
      </Modal>
      {addDonOpen && <AddDonModal guiId={g.id} onClose={() => setAddDonOpen(false)} onDone={() => { setAddDonOpen(false); load(); onChanged(); }} />}
    </>
  );
}
