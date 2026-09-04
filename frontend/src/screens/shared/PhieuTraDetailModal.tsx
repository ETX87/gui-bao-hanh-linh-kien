import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Textarea, ReadField, Badge, Spinner } from "../../ui/primitives";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS } from "../../lib/constants";
import { LogBlock } from "./LogBlock";
import type { AppUser, DonVi, LogRow, PhieuTra } from "../../lib/types";

interface DetailResponse {
  phieu_tra: PhieuTra;
  don_vi: DonVi[];
  anh: { id: number; anh_url: string }[];
  logs: LogRow[];
}

// "UI chi tiet" phieu tra bao hanh - port dung openDetailTraModal(). Nut thao tac theo dung vai tro +
// trang thai (Admin BH sua ma/gui duyet/huy gui duyet/tach don vi, Ke toan duyet/tu choi, Kho dong
// goi/gui/xac nhan ket thuc du phong, KTV xac nhan nhan/khieu nai).

export function PhieuTraDetailModal({ traId, user, onClose, onChanged }: { traId: string; user: AppUser; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [maDonHang, setMaDonHang] = useState("");
  const [maMisa, setMaMisa] = useState("");
  const [maVanDon, setMaVanDon] = useState("");
  const [lyDoTuChoi, setLyDoTuChoi] = useState("");
  const [danhGia, setDanhGia] = useState("");
  const [khieuNai, setKhieuNai] = useState("");
  const [showTuChoi, setShowTuChoi] = useState(false);
  const [showKhieuNai, setShowKhieuNai] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get<DetailResponse>(`/phieu-tra/${traId}`).then((r) => {
      setData(r);
      setMaDonHang(r.phieu_tra.ma_don_hang || "");
      setMaMisa(r.phieu_tra.ma_misa || "");
      setMaVanDon(r.phieu_tra.ma_van_don || "");
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traId]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
      await load();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <Modal title="Chi tiết phiếu trả" onClose={onClose} full>
        <Spinner />
      </Modal>
    );
  }
  const t = data.phieu_tra;

  const saveCodes = () => run(async () => { await api.patch(`/phieu-tra/${traId}`, { ma_don_hang: maDonHang, ma_misa: maMisa, ma_van_don: maVanDon }); toast("Đã lưu mã.", "ok"); });
  const guiDuyet = () => run(async () => { await api.post(`/phieu-tra/${traId}/gui-duyet`); toast("Đã gửi duyệt kế toán.", "ok"); });
  const huyGuiDuyet = () => run(async () => { await api.post(`/phieu-tra/${traId}/huy-gui-duyet`); toast("Đã huỷ gửi duyệt.", "ok"); });
  const tachDonVi = (unitId: string) => run(async () => { await api.delete(`/phieu-tra/${traId}/don-vi/${unitId}`); toast("Đã tách khỏi phiếu.", "ok"); });
  const duyet = () => run(async () => { await api.post(`/phieu-tra/${traId}/duyet`); toast("Đã duyệt.", "ok"); });
  const tuChoi = () => run(async () => { await api.post(`/phieu-tra/${traId}/tu-choi`, { ly_do: lyDoTuChoi }); toast("Đã từ chối.", "ok"); setShowTuChoi(false); });
  const dongGoi = async (files: FileList | null) =>
    run(async () => {
      const urls = files && files.length ? await Promise.all(Array.from(files).map(fileToDataUrl)) : [];
      await api.post(`/phieu-tra/${traId}/dong-goi`, { anh: urls });
      toast("Đã đóng gói.", "ok");
    });
  const gui = () => run(async () => { await api.post(`/phieu-tra/${traId}/gui`, { ma_van_don: maVanDon }); toast("Đã gửi hàng.", "ok"); });
  const khoXacNhanKetThuc = () => run(async () => { await api.post(`/phieu-tra/${traId}/kho-xac-nhan-ket-thuc`); toast("Đã xác nhận kết thúc (dự phòng).", "ok"); });
  const ktvXacNhanNhan = () => run(async () => { await api.post(`/phieu-tra/${traId}/ktv-xac-nhan-nhan`, { danh_gia: danhGia }); toast("Đã xác nhận nhận hàng.", "ok"); });
  const guiKhieuNai = () => run(async () => { await api.post(`/phieu-tra/${traId}/khieu-nai`, { ghi_chu: khieuNai }); toast("Đã gửi khiếu nại.", "ok"); setShowKhieuNai(false); });

  return (
    <Modal
      title={`Phiếu trả bảo hành ${t.id}`}
      onClose={onClose}
      full
      headerActions={<Badge tone="blue">{TRANG_THAI_PHIEU_TRA_LABELS[t.trang_thai] || t.trang_thai}</Badge>}
      footerActions={
        <>
          {user.la_admin_bh && t.trang_thai === "nhap" && (
            <Btn variant="primary" disabled={busy} onClick={guiDuyet}>
              Gửi duyệt kế toán
            </Btn>
          )}
          {user.la_admin_bh && t.trang_thai === "cho_ke_toan_duyet" && (
            <Btn variant="danger" disabled={busy} onClick={huyGuiDuyet}>
              Huỷ gửi duyệt
            </Btn>
          )}
          {user.la_ke_toan && t.trang_thai === "cho_ke_toan_duyet" && !showTuChoi && (
            <>
              <Btn variant="danger" onClick={() => setShowTuChoi(true)}>
                Từ chối
              </Btn>
              <Btn variant="success" disabled={busy} onClick={duyet}>
                Duyệt
              </Btn>
            </>
          )}
          {user.la_kho && t.trang_thai === "da_duyet_ke_toan" && (
            <>
              <label className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium bg-white text-[var(--ink-700)] border border-[var(--line)] hover:bg-[var(--surface-100)] cursor-pointer">
                📦 Đóng gói (ảnh tuỳ chọn)
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => dongGoi(e.target.files)} />
              </label>
              <Btn variant="primary" disabled={busy} onClick={gui}>
                Gửi hàng
              </Btn>
            </>
          )}
          {user.la_kho && t.trang_thai === "da_gui" && (
            <Btn variant="secondary" disabled={busy} onClick={khoXacNhanKetThuc}>
              Kho xác nhận kết thúc (dự phòng)
            </Btn>
          )}
          {(user.la_ktv_dvbh || user.la_ve_tinh) && t.ktv_nhan === user.email && t.trang_thai === "da_gui" && !showKhieuNai && (
            <>
              <Btn variant="danger" onClick={() => setShowKhieuNai(true)}>
                Khiếu nại vận chuyển
              </Btn>
              <Btn variant="success" disabled={busy} onClick={ktvXacNhanNhan}>
                Xác nhận đã nhận
              </Btn>
            </>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {showTuChoi && (
          <div className="rounded-lg border border-[var(--coral-400)] bg-[var(--coral-100)] p-3 space-y-2">
            <Field label="Lý do từ chối" required>
              <Textarea rows={2} value={lyDoTuChoi} onChange={(e) => setLyDoTuChoi(e.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setShowTuChoi(false)}>Huỷ</Btn>
              <Btn variant="danger" disabled={!lyDoTuChoi.trim() || busy} onClick={tuChoi}>
                Xác nhận từ chối
              </Btn>
            </div>
          </div>
        )}
        {showKhieuNai && (
          <div className="rounded-lg border border-[var(--coral-400)] bg-[var(--coral-100)] p-3 space-y-2">
            <Field label="Nội dung khiếu nại" required>
              <Textarea rows={2} value={khieuNai} onChange={(e) => setKhieuNai(e.target.value)} placeholder="Mô tả sự cố không nhận được hàng..." />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn onClick={() => setShowKhieuNai(false)}>Huỷ</Btn>
              <Btn variant="danger" disabled={!khieuNai.trim() || busy} onClick={guiKhieuNai}>
                Gửi khiếu nại
              </Btn>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReadField label="KTV nhận" value={t.ktv_nhan} />
          <ReadField label="Loại đối trừ" value={LOAI_DOI_TRU_LABELS[t.loai_doi_tru]} />
          <ReadField label="Người tạo" value={t.nguoi_tao} />
          <ReadField label="Tạo lúc" value={fmtDate(t.created_at)} />
        </div>

        {t.trang_thai === "nhap" ? (
          <div className="grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-4">
            <Field label={`Mã đơn hàng${t.loai_doi_tru === "tru_cong_no" ? "" : " *"}`}>
              <Input value={maDonHang} onChange={(e) => setMaDonHang(e.target.value)} />
            </Field>
            <Field label={`Mã MISA${t.loai_doi_tru === "tru_cong_no" ? "" : " *"}`}>
              <Input value={maMisa} onChange={(e) => setMaMisa(e.target.value)} />
            </Field>
            <Field label="Mã vận đơn">
              <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
            </Field>
            <div className="col-span-3">
              <Btn onClick={saveCodes} disabled={busy}>
                Lưu mã
              </Btn>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-4">
            <ReadField label="Mã đơn hàng" value={t.ma_don_hang} />
            <ReadField label="Mã MISA" value={t.ma_misa} />
            <ReadField label="Mã vận đơn" value={t.ma_van_don} />
          </div>
        )}
        {t.ly_do_tu_choi_kt && <ReadField label="Lý do Kế toán từ chối lần trước" value={t.ly_do_tu_choi_kt} />}
        {t.danh_gia_ktv && <ReadField label="Đánh giá của KTV" value={t.danh_gia_ktv} />}
        {t.khong_nhan_duoc_ghi_chu && <ReadField label="Nội dung khiếu nại" value={t.khong_nhan_duoc_ghi_chu} />}

        {data.anh.length > 0 && (
          <div className="border-t border-[var(--line)] pt-4">
            <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide mb-2">Ảnh biên bản đóng gói</p>
            <div className="flex flex-wrap gap-2">
              {data.anh.map((a) => (
                <img key={a.id} src={a.anh_url} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)]" />
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-[var(--line)] pt-4">
          <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide mb-2">Đơn vị trong phiếu ({data.don_vi.length})</p>
          <div className="space-y-1.5">
            {data.don_vi.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                <span className="font-mono text-xs">{u.id}</span>
                <span className="flex-1 truncate text-[var(--ink-600)]">{u.huong_xu_ly}</span>
                {user.la_admin_bh && t.trang_thai === "nhap" && (
                  <Btn variant="danger" onClick={() => tachDonVi(u.id)} disabled={busy}>
                    Tách khỏi phiếu
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--line)] pt-4">
          <LogBlock title="↩️ Nhật ký phiếu trả" logs={data.logs} />
        </div>
      </div>
    </Modal>
  );
}
