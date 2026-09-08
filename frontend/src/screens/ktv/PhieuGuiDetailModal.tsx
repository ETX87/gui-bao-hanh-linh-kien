import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, Badge, ReadField, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_GUI_LABELS, HINH_THUC_GUI_OPTIONS } from "../../lib/constants";
import { GhiChuLogPanel } from "../shared/GhiChuLogPanel";
import { AddDonModal } from "./AddDonModal";
import { AddDonMobileSheet } from "./AddDonMobileSheet";
import { QrCode } from "../../ui/QrCode";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { DonCha, PhieuGui } from "../../lib/types";

const HINH_THUC_OPTIONS = HINH_THUC_GUI_OPTIONS;

// Chi tiet phieu gui - port dung renderPhieuGuiDetail(): sua header (khi con "nhap"), them/xoa don,
// xac nhan gui xe, xoa phieu (khi con "nhap" va rong), ghi chu/phan hoi. QR dan thung (da bo o Giai
// doan 4, nay port lai theo yeu cau "QA vong 2") - dung QrCode/lib/qr.ts, ma hoa dung g.id.

export function PhieuGuiDetailModal({ guiId, onClose, onChanged }: { guiId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const isMobile = useIsMobile();
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

  // Dong modal ma phieu con "nhap" VA chua co don nao ben trong -> tu dong xoa luon (best-effort,
  // khong bao loi neu that bai) - port dung nguyen van yeu cau 07/09/2026 "nếu không ấn lưu và tối
  // thiểu 1 linh kiện bên trong phiếu thì không tạo ra phiếu nháp": truoc day bam "+ Tạo phiếu mới"
  // la INSERT ngay 1 dong phieu_gui_bh, dong modal ma chua them don nao de lai 1 phieu nhap rong vinh
  // vien trong danh sach ("đống phiếu nháp thừa"). Dieu kien nay TRUNG KHOP dieu kien nut "Xoá phiếu"
  // thu cong da co san (chi hien khi don_cha.length===0) - day chi la ban tu dong hoa cua dung hanh
  // dong do, khong mo rong quyen gi moi.
  const handleClose = () => {
    if (data && data.phieu_gui.trang_thai === "nhap" && data.don_cha.length === 0) {
      api
        .delete(`/phieu-gui/${data.phieu_gui.id}`)
        .then(() => {
          toast("Đã tự động xoá phiếu nháp trống (chưa có đơn nào).", "ok");
          onChanged();
        })
        .catch(() => {});
    }
    onClose();
  };

  if (!data) {
    return (
      <Modal title="Chi tiết phiếu gửi" onClose={handleClose} full>
        <Spinner />
      </Modal>
    );
  }
  const g = data.phieu_gui;
  const isNhap = g.trang_thai === "nhap";

  const saveHeader = () => run(async () => { await api.patch(`/phieu-gui/${g.id}`, { hinh_thuc_gui: hinhThuc, ma_xe_hoac_tai_xe: maXe, don_vi_van_chuyen: dvvc, ma_van_don: maVanDon }); toast("Đã lưu.", "ok"); }, false);
  // Phat hien 9 vong ra soat UX: truoc day "Xac nhan da gui xe" CHI POST ngay_gui_xe - neu KTV sua
  // 4 truong van chuyen roi bam thang nut nay (khong bam nut xam "Luu thong tin" truoc) thi 4 sua
  // do BI MAT. Nay nut xac nhan tu PATCH header trước rồi mới POST - khong con bay mat du lieu.
  const xacNhanGui = () =>
    run(async () => {
      await api.patch(`/phieu-gui/${g.id}`, { hinh_thuc_gui: hinhThuc, ma_xe_hoac_tai_xe: maXe, don_vi_van_chuyen: dvvc, ma_van_don: maVanDon });
      await api.post(`/phieu-gui/${g.id}/xac-nhan-gui`, { ngay_gui_xe: ngayGuiXe });
      toast("Đã lưu thông tin & xác nhận gửi xe.", "ok");
    });
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
        onClose={handleClose}
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
          <div className="flex items-start justify-between gap-3">
            {g.nguoi_tao_ho ? (
              <p className="text-xs text-[var(--ink-500)]">
                Được tạo hộ bởi <span className="font-semibold text-[var(--ink-700)]">{g.nguoi_tao_ho}</span> cho KTV <span className="font-semibold text-[var(--ink-700)]">{g.nguoi_tao}</span>
              </p>
            ) : (
              <span />
            )}
            <QrCode text={g.id} sizePx={100} />
          </div>
          {isNhap ? (
            // Grid 1 cot tren mobile (< sm), 2 cot tu ~640px, 4 cot tu 768px - sua 07/09/2026 (phan
            // hoi "giao diện tạo phiếu... trên mobile khó nhập liệu, thông tin bị quá ngắn và chồng
            // chéo đè lên nhau"): truoc day luon co san 2 cot ngay ca tren dien thoai hep nhat, va
            // "Ngày gửi xe" + nut "Lưu thông tin" nam chung 1 hang flex khong co chieu rong co dinh -
            // 2 phan tu tranh cho nhau tren man hinh hep, de vo dong/de len nhau. Nay moi truong 1 o
            // luoi rieng, "Lưu thông tin" thanh 1 nut rong het chieu rong o cua no tren mobile.
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
              <div className="sm:col-span-2 md:col-span-4 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-3">
                <Field label="Ngày gửi xe">
                  <Input type="date" value={ngayGuiXe} onChange={(e) => setNgayGuiXe(e.target.value)} className="!w-44" />
                </Field>
                <p className="text-xs text-[var(--ink-500)] pb-2">
                  Bấm <b>“Xác nhận đã gửi xe”</b> ở dưới sẽ tự lưu toàn bộ thông tin vận chuyển ở trên.
                  <button onClick={saveHeader} disabled={busy} className="focus-ring ml-2 text-[var(--ocean-700)] underline underline-offset-2 hover:text-[var(--ocean-800)]">
                    Lưu nháp bây giờ
                  </button>
                </p>
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
          {!!g.su_co_tiep_nhan && (
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
                // flex-wrap thay vi ep 1 hang cung (sua 07/09/2026, cung ly do voi grid header o
                // tren) - tren man hinh hep, id/SL/badge/nut "Xoá" tu xuong hang thay vi bop chet mo
                // ta loi con vai px, va mo ta loi luon xuong dong rieng (khong chia se hang voi cac
                // the khac) de khong con bi cham/de len nhau.
                <div key={d.id} className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{d.id}</span>
                    <span className="text-xs text-[var(--ink-500)]">SL: {d.so_luong_khai}</span>
                    {d.loai_doi_tru_de_xuat && <Badge tone="gray">{LOAI_DOI_TRU_LABELS[d.loai_doi_tru_de_xuat]}</Badge>}
                    {isNhap && (
                      <Btn variant="danger" onClick={() => xoaDon(d.id)} disabled={busy} className="ml-auto">
                        Xoá
                      </Btn>
                    )}
                  </div>
                  <p className="mt-1 truncate">{d.mo_ta_loi}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            <GhiChuLogPanel guiId={g.id} />
          </div>
        </div>
      </Modal>
      {addDonOpen &&
        (isMobile ? (
          <AddDonMobileSheet guiId={g.id} ktvEmail={g.nguoi_tao} onClose={() => setAddDonOpen(false)} onDone={() => { setAddDonOpen(false); load(); onChanged(); }} />
        ) : (
          <AddDonModal guiId={g.id} ktvEmail={g.nguoi_tao} onClose={() => setAddDonOpen(false)} onDone={() => { setAddDonOpen(false); load(); onChanged(); }} />
        ))}
    </>
  );
}
