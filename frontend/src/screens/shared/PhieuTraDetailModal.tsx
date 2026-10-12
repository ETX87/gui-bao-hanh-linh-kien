import { useEffect, useState } from "react";
import { DoiMienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Textarea, Badge, Spinner } from "../../ui/primitives";
import { LOAI_DOI_TRU_LABELS, HUONG_XU_LY_LABELS } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { LogTimeline } from "./LogTimeline";
import { UnitDetailModal } from "./UnitDetailModal";
import { DetailGrid, SummaryBox, Section, KvGrid, Kv, Chip, Banner, Thumbs, SectionTitle, DETAIL_MAX_W } from "../../ui/DetailParts";
import type { AppUser, DonVi, LogRow, PhieuTra } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

interface DetailResponse {
  phieu_tra: PhieuTra;
  don_vi: DonVi[];
  anh: { id: number; anh_url: string }[];
  logs: LogRow[];
}

// "UI chi tiet" phieu tra bao hanh. Nut thao tac theo dung vai tro + trang thai (Admin BH sua ma/gui
// duyet/huy gui duyet/tach don vi, Ke toan duyet/tu choi, Kho dong goi/gui/xac nhan ket thuc du phong,
// KTV xac nhan nhan/khieu nai).
//
// Thiet ke lai 10/10/2026 ("xu ly lai toan bo cac giao dien UI chi tiet"): bo modal kin man hinh, cung
// khuon 2 cot voi UI chi tiet don bao hanh (ui/DetailParts.tsx) - trai: tom tat (KTV nhan, loai doi tru,
// so don vi), canh bao (ke toan tu choi / khieu nai / danh gia), ma chung tu, danh sach don vi gon (bam
// de mo chi tiet don); phai: nhat ky + anh dong goi. Kho o buoc "cho dong goi" nhap duoc Ma van don
// (truoc day o nay chi hien luc "nhap" nen Kho bam "Gui hang" khong nhap duoc van don).

export function PhieuTraDetailModal({ traId, user, onClose, onChanged, nested }: { traId: string; user: AppUser; onClose: () => void; onChanged: () => void; nested?: boolean }) {
  const toast = useToast();
  const { nameOf } = useLkName();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [maDonHang, setMaDonHang] = useState("");
  const [maMisa, setMaMisa] = useState("");
  const [maVanDon, setMaVanDon] = useState("");
  const [lyDoTuChoi, setLyDoTuChoi] = useState("");
  const [danhGia, setDanhGia] = useState("");
  const [khieuNai, setKhieuNai] = useState("");
  const [showTuChoi, setShowTuChoi] = useState(false);
  const [showKhieuNai, setShowKhieuNai] = useState(false);
  // Kho danh gia khieu nai "khong nhan duoc hang" (12/10/2026): thanh_cong | that_bai.
  const [danhGiaKN, setDanhGiaKN] = useState<"thanh_cong" | "that_bai" | null>(null);
  const [ghiChuKN, setGhiChuKN] = useState("");
  const [busy, setBusy] = useState(false);
  const [openUnit, setOpenUnit] = useState<string | null>(null);

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
      <Modal title="Chi tiết phiếu trả" onClose={onClose} maxWidthClass={DETAIL_MAX_W}>
        <Spinner />
      </Modal>
    );
  }
  const t = data.phieu_tra;
  const isNhap = t.trang_thai === "nhap";
  const khoChoGui = user.la_kho && t.trang_thai === "da_duyet_ke_toan";
  const batBuocMa = t.loai_doi_tru !== "tru_cong_no";
  // Xem chi tiet tung don vi: vai tro duoc GET /admin/don-vi/:id (KTV khong co quyen).
  const canOpenUnit = !nested && (user.la_admin_bh || user.la_qtri || user.la_giam_sat || user.la_view);

  const saveCodes = () => run(async () => { await api.patch(`/phieu-tra/${traId}`, { ma_don_hang: maDonHang, ma_misa: maMisa, ma_van_don: maVanDon }); toast("Đã lưu mã.", "ok"); });
  const guiDuyet = () => run(async () => { await api.patch(`/phieu-tra/${traId}`, { ma_don_hang: maDonHang, ma_misa: maMisa, ma_van_don: maVanDon }); await api.post(`/phieu-tra/${traId}/gui-duyet`); toast("Đã gửi duyệt kế toán.", "ok"); });
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

  const guiDanhGiaKN = () =>
    run(async () => {
      await api.post(`/phieu-tra/${traId}/danh-gia-khieu-nai`, { ket_qua: danhGiaKN, ghi_chu: ghiChuKN });
      toast(danhGiaKN === "thanh_cong" ? "Đã ghi nhận: gửi thành công." : "Đã ghi nhận: gửi thất bại (thất lạc).", "ok");
      setDanhGiaKN(null);
    });
  const khoDanhGiaKN = (user.la_kho || user.la_qtri) && t.trang_thai === "khieu_nai_van_chuyen";

  const ktvNhanDuocXacNhan = (user.la_ktv_dvbh || user.la_ve_tinh) && t.ktv_nhan === user.email && t.trang_thai === "da_gui";
  const coMa = !!(t.ma_don_hang || t.ma_misa || t.ma_van_don);

  return (
    <>
      <Modal
        title={t.id}
        onClose={onClose}
        maxWidthClass={DETAIL_MAX_W}
        headerActions={<StatusBadge kind="tra" value={t.trang_thai} />}
        footerActions={
          <>
            {user.la_admin_bh && isNhap && (
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
            {khoChoGui && (
              <>
                <label className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white text-[var(--ink-body)] border border-[var(--line)] hover:bg-[var(--surface-2)] cursor-pointer">
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
            {khoDanhGiaKN && !danhGiaKN && (
              <>
                <Btn variant="danger" onClick={() => setDanhGiaKN("that_bai")}>
                  ✖ Gửi thất bại (thất lạc)
                </Btn>
                <Btn variant="success" onClick={() => setDanhGiaKN("thanh_cong")}>
                  ✔ Gửi thành công
                </Btn>
              </>
            )}
            {ktvNhanDuocXacNhan && !showKhieuNai && (
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
        <DetailGrid
          side={
            <>
              <div>
                <SectionTitle className="mb-1.5">🕘 Nhật ký</SectionTitle>
                <LogTimeline className="lg:max-h-[52vh]" sources={[{ key: "pt", label: "Phiếu trả", icon: "↩️", logs: data.logs }]} />
              </div>
              {data.anh.length > 0 && (
                <div>
                  <SectionTitle className="mb-1.5">🖼 Ảnh đóng gói ({data.anh.length})</SectionTitle>
                  <Thumbs urls={data.anh.map((a) => ({ key: String(a.id), url: a.anh_url, title: "Ảnh biên bản đóng gói" }))} />
                </div>
              )}
            </>
          }
        >
          {showTuChoi && (
            <div className="rounded-lg border border-[var(--red-500)] bg-[var(--red-100)] p-3 space-y-2">
              <Field label="Lý do từ chối" required>
                <Textarea rows={2} value={lyDoTuChoi} onChange={(e) => setLyDoTuChoi(e.target.value)} autoFocus />
              </Field>
              <div className="flex justify-end gap-2">
                <Btn onClick={() => setShowTuChoi(false)}>Huỷ</Btn>
                <Btn variant="danger" disabled={!lyDoTuChoi.trim() || busy} onClick={tuChoi}>
                  Xác nhận từ chối
                </Btn>
              </div>
            </div>
          )}
          {danhGiaKN && (
            <div className={`rounded-lg border p-3 space-y-2 ${danhGiaKN === "that_bai" ? "border-[var(--red-500)] bg-[var(--red-100)]" : "border-[var(--green-500)] bg-[var(--green-100)]"}`}>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {danhGiaKN === "thanh_cong"
                  ? "Xác nhận hàng ĐÃ tới nơi (KTV báo nhầm / đã tìm thấy) → phiếu chuyển Đã hoàn tất."
                  : "Xác nhận gửi THẤT BẠI — hàng thất lạc trên đường trả → phiếu kết thúc ở trạng thái Gửi thất bại. Kho ghi phương án xử lý, việc xử lý tiếp làm ngoài hệ thống."}
              </p>
              <Field label={danhGiaKN === "that_bai" ? "Phương án xử lý (xử lý ngoài hệ thống)" : "Ghi chú (tuỳ chọn)"} required={danhGiaKN === "that_bai"}>
                <Textarea rows={2} value={ghiChuKN} onChange={(e) => setGhiChuKN(e.target.value)} placeholder={danhGiaKN === "that_bai" ? "VD: Nhà xe bồi thường, Kho gửi bù linh kiện mới qua phiếu xuất …" : "VD: Nhà xe xác nhận đã giao ngày …, có chữ ký người nhận"} autoFocus />
              </Field>
              <div className="flex justify-end gap-2">
                <Btn onClick={() => setDanhGiaKN(null)}>Huỷ</Btn>
                <Btn variant={danhGiaKN === "that_bai" ? "danger" : "success"} disabled={busy || (danhGiaKN === "that_bai" && !ghiChuKN.trim())} onClick={guiDanhGiaKN}>
                  Xác nhận đánh giá
                </Btn>
              </div>
            </div>
          )}
          {showKhieuNai && (
            <div className="rounded-lg border border-[var(--red-500)] bg-[var(--red-100)] p-3 space-y-2">
              <Field label="Nội dung khiếu nại" required>
                <Textarea rows={2} value={khieuNai} onChange={(e) => setKhieuNai(e.target.value)} placeholder="Mô tả sự cố không nhận được hàng..." autoFocus />
              </Field>
              <div className="flex justify-end gap-2">
                <Btn onClick={() => setShowKhieuNai(false)}>Huỷ</Btn>
                <Btn variant="danger" disabled={!khieuNai.trim() || busy} onClick={guiKhieuNai}>
                  Gửi khiếu nại
                </Btn>
              </div>
            </div>
          )}

          <SummaryBox>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[15px] font-bold text-[var(--ink)]">
                👷 Trả cho <UserName email={t.ktv_nhan} />
              </p>
              <Badge tone={t.loai_doi_tru === "tru_cong_no" ? "violet" : "blue"}>{LOAI_DOI_TRU_LABELS[t.loai_doi_tru]}</Badge>
              <DoiMienBadge kind="phieu-tra" id={t.id} mien={t.mien} ktvEmail={t.ktv_nhan} onDone={load} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip icon="📦" title="Số đơn vị trong phiếu">
                {data.don_vi.length} đơn vị
              </Chip>
              <Chip icon="✍️" title="Người tạo">
                <UserName email={t.nguoi_tao} />
              </Chip>
              <Chip icon="🕒" title="Tạo lúc">
                {fmtDate(t.created_at)}
              </Chip>
            </div>
          </SummaryBox>

          {t.ly_do_tu_choi_kt && <Banner tone="amber">Kế toán từ chối lần trước: {t.ly_do_tu_choi_kt}</Banner>}
          {t.khong_nhan_duoc_ghi_chu && <Banner tone="red">⚠ KTV báo không nhận được hàng: {t.khong_nhan_duoc_ghi_chu}</Banner>}
          {t.kq_khieu_nai && (
            <Banner tone={t.kq_khieu_nai === "that_bai" ? "red" : "green"}>
              Kho đánh giá: {t.kq_khieu_nai === "that_bai" ? "gửi THẤT BẠI (thất lạc)" : "gửi thành công"}
              {t.kq_khieu_nai_ghi_chu ? (t.kq_khieu_nai === "that_bai" ? ` — Phương án xử lý: ${t.kq_khieu_nai_ghi_chu}` : ` — ${t.kq_khieu_nai_ghi_chu}`) : ""} · <UserName email={t.kq_khieu_nai_boi} /> · {fmtDate(t.kq_khieu_nai_luc)}
            </Banner>
          )}
          {t.danh_gia_ktv && <Banner tone="blue">Đánh giá của KTV: {t.danh_gia_ktv}</Banner>}
          {ktvNhanDuocXacNhan && (
            <Field label="Đánh giá khi nhận hàng (tuỳ chọn)">
              <Input value={danhGia} onChange={(e) => setDanhGia(e.target.value)} placeholder="VD: Hàng nhận đủ, đóng gói tốt" />
            </Field>
          )}

          <Section
            title="🧾 Mã chứng từ"
            right={
              isNhap && user.la_admin_bh ? (
                <Btn size="sm" onClick={saveCodes} disabled={busy}>
                  Lưu mã
                </Btn>
              ) : undefined
            }
          >
            {isNhap && user.la_admin_bh ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Field label={`Mã đơn hàng${batBuocMa ? " *" : ""}`}>
                  <Input value={maDonHang} onChange={(e) => setMaDonHang(e.target.value)} />
                </Field>
                <Field label={`Mã MISA${batBuocMa ? " *" : ""}`}>
                  <Input value={maMisa} onChange={(e) => setMaMisa(e.target.value)} />
                </Field>
                <Field label="Mã vận đơn">
                  <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
                </Field>
              </div>
            ) : (
              <>
                {coMa || !khoChoGui ? (
                  <KvGrid>
                    <Kv k="Mã đơn hàng" v={t.ma_don_hang || "—"} />
                    <Kv k="Mã MISA" v={t.ma_misa || "—"} />
                    {!khoChoGui && <Kv k="Mã vận đơn" v={t.ma_van_don || "—"} />}
                  </KvGrid>
                ) : null}
                {khoChoGui && (
                  <div className="mt-2 max-w-xs">
                    <Field label="Mã vận đơn (Kho nhập khi gửi)">
                      <Input value={maVanDon} onChange={(e) => setMaVanDon(e.target.value)} />
                    </Field>
                  </div>
                )}
              </>
            )}
          </Section>

          <Section title={`📦 Đơn vị trong phiếu (${data.don_vi.length})`}>
            <div className="divide-y divide-[var(--line)] -mx-1">
              {data.don_vi.map((u) => (
                <div
                  key={u.id}
                  onClick={canOpenUnit ? () => setOpenUnit(u.id) : undefined}
                  className={`flex flex-wrap md:flex-nowrap items-center gap-x-3 gap-y-0.5 px-1 py-1.5 text-[13px] ${canOpenUnit ? "cursor-pointer rounded-md hover:bg-[var(--surface-2)]" : ""}`}
                >
                  <span className="font-mono text-xs font-semibold text-[var(--link)] shrink-0">{u.id}</span>
                  <span className="min-w-0 md:max-w-[38%] truncate text-[var(--ink)]" title={nameOf(u.ma_lk_thuc_te || u.ma_lk)}>
                    {nameOf(u.ma_lk_thuc_te || u.ma_lk)}
                  </span>
                  {u.huong_xu_ly && <Badge tone="gray">{HUONG_XU_LY_LABELS[u.huong_xu_ly] || u.huong_xu_ly}</Badge>}
                  <span className="basis-full md:basis-auto min-w-0 flex-1 truncate text-xs text-[var(--ink-soft)]" title={u.mo_ta_loi || ""}>
                    {u.mo_ta_loi}
                  </span>
                  {user.la_admin_bh && isNhap && (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        tachDonVi(u.id);
                      }}
                      disabled={busy}
                      className="ml-auto shrink-0 !text-[var(--red-600)] hover:!bg-[var(--red-50)]"
                    >
                      Tách khỏi phiếu
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </DetailGrid>
      </Modal>
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} nested onClose={() => setOpenUnit(null)} onChanged={() => { onChanged(); load(); }} />}
    </>
  );
}
