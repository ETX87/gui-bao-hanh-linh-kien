import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { fmtDate } from "../../lib/format";
import { Modal } from "../../ui/Modal";
import { Btn, Badge, ReadField, Spinner } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { HUONG_XU_LY_LABELS, LOAI_BAO_HANH_LABELS, LOAI_DOI_TRU_LABELS, KET_QUA_CHAN_DOAN_LABELS, XU_LY_XAC_LABELS, TRANG_THAI_UNIT_LABELS } from "../../lib/constants";
import { LogBlock } from "./LogBlock";
import { PhanLoaiModal } from "./PhanLoaiModal";
import { FastActionsModal } from "./FastActionsModal";
import { YeuCauBoSungModal } from "./YeuCauBoSungModal";
import { BaoCaoSaiModal } from "./BaoCaoSaiModal";
import { XacNhanHoanTatModal } from "./XacNhanHoanTatModal";
import { TraTrucTiepModal } from "./TraTrucTiepModal";
import { ChanDoanModal } from "./ChanDoanModal";
import type { AppUser, DonCha, DonVi, LogRow } from "../../lib/types";

interface DetailResponse {
  don_vi: DonVi;
  don_cha: DonCha;
  logs: { don_vi: LogRow[]; don_cha: LogRow[]; phieu_gui: LogRow[]; phieu_tra: LogRow[] };
  anh: { don_vi: { id: number; loai: string; anh_url: string }[]; don_cha: { id: number; anh_url: string }[] };
  bao_cao_sai_thong_tin: unknown[];
}

type SubModal = "phan-loai" | "fast" | "bo-sung" | "bao-cao-sai" | "xac-nhan" | "tra-ktv" | "tra-kho" | "chan-doan" | null;

// "UI chi tiet" don vi bao hanh - port dung openDetailUnitModal() cua prototype: 4 khoi log rieng
// biet, anh, bao cao sai (chi giam sat), va DAY DU nut thao tac o footer theo dung vai tro dang dang
// nhap + trang thai hien tai cua don (unitActionButtonsHtml()) - dong bo 1-doi-1 voi dieu kien da dung
// o PhanLoai.tsx/ViecCuaToi.tsx de bang va modal chi tiet khong bao gio lech nhau.

export function UnitDetailModal({ unitId, user, onClose, onChanged }: { unitId: string; user: AppUser; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [sub, setSub] = useState<SubModal>(null);

  const load = () => api.get<DetailResponse>(`/admin/don-vi/${unitId}`).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId]);

  const afterAction = () => {
    setSub(null);
    onChanged();
    load();
  };

  if (!data) {
    return (
      <Modal title="Chi tiết đơn bảo hành" onClose={onClose} full>
        <Spinner />
      </Modal>
    );
  }

  const { don_vi: u, don_cha: p, logs, anh, bao_cao_sai_thong_tin } = data;
  const isKhachLe = !p.phieu_gui_id;
  const effLk = u.ma_lk_thuc_te || p.ma_lk;
  const daDoiLk = !!(u.ma_lk_thuc_te && u.ma_lk_thuc_te !== p.ma_lk);

  const buttons: { label: string; onClick: () => void; variant?: "primary" | "success" | "danger" }[] = [];
  if (user.la_admin_bh) {
    if (u.trang_thai === "cho_phan_loai" || u.trang_thai === "admin_can_xem_lai") {
      buttons.push({ label: u.trang_thai === "cho_phan_loai" ? "Phân loại" : "Phân loại lại", onClick: () => setSub("phan-loai"), variant: "primary" });
      if (u.trang_thai === "cho_phan_loai") buttons.push({ label: "⚡ Xử lý nhanh", onClick: () => setSub("fast") });
      if (!isKhachLe) {
        if (u.trang_thai === "cho_phan_loai") buttons.push({ label: "Yêu cầu bổ sung", onClick: () => setSub("bo-sung") });
        buttons.push({ label: "🐞 Báo cáo sai", onClick: () => setSub("bao-cao-sai") });
      }
    }
    if (u.trang_thai === "cho_admin_xac_nhan") {
      buttons.push({ label: "✔️ Xác nhận hoàn tất / Yêu cầu làm lại", onClick: () => setSub("xac-nhan"), variant: "success" });
    }
    if (u.trang_thai === "san_sang_gom_phieu_tra" && !u.phieu_tra_id) {
      if (!isKhachLe) buttons.push({ label: "⚡ Trả trực tiếp KTV", onClick: () => setSub("tra-ktv") });
      buttons.push({ label: "⚡ Giao trực tiếp Kho", onClick: () => setSub("tra-kho") });
    }
  }
  if (user.la_nv_sua_chua && u.trang_thai === "cho_chan_doan" && u.nguoi_sua_chua === user.email) {
    buttons.push({ label: "🔧 Chẩn đoán", onClick: () => setSub("chan-doan"), variant: "primary" });
  }

  return (
    <>
      <Modal
        title={`Chi tiết đơn bảo hành ${u.id}`}
        onClose={onClose}
        full
        headerActions={
          <div className="flex items-center gap-2">
            <Badge tone="blue">{TRANG_THAI_UNIT_LABELS[u.trang_thai] || u.trang_thai}</Badge>
            <SlaBadge since={u.updated_at} entityType="phieu_sc_ct" entityId={u.id} clickable={user.la_admin_bh || user.la_nv_sua_chua || user.la_qtri} />
          </div>
        }
        footerActions={
          buttons.length > 0 ? (
            <>
              {buttons.map((b) => (
                <Btn key={b.label} variant={b.variant} onClick={b.onClick}>
                  {b.label}
                </Btn>
              ))}
            </>
          ) : undefined
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ReadField label="Mã case" value={p.case_id} />
            <ReadField label="Linh kiện" value={daDoiLk ? <>{effLk} <Badge tone="blue" className="ml-1">Đã đổi LK</Badge></> : effLk} />
            <ReadField label="Nguồn" value={isKhachLe ? <Badge tone="violet">Khách lẻ</Badge> : p.nguon_tao === "admin_dich_vu" ? "Đơn dịch vụ" : "KTV gửi hàng"} />
            <ReadField label="Đối trừ đề xuất" value={p.loai_doi_tru_de_xuat ? LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat] : "—"} />
          </div>
          <ReadField label="Mô tả lỗi" value={p.mo_ta_loi} />
          {isKhachLe && (
            <div className="grid grid-cols-3 gap-4">
              <ReadField label="Khách hàng" value={p.ten_khach_hang} />
              <ReadField label="SĐT" value={p.sdt_khach_hang} />
              <ReadField label="Sản phẩm BH" value={p.san_pham_bh} />
            </div>
          )}

          {(u.loai_bao_hanh || u.huong_xu_ly) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-[var(--line)] pt-4">
              <ReadField label="Loại bảo hành" value={u.loai_bao_hanh ? LOAI_BAO_HANH_LABELS[u.loai_bao_hanh] : "—"} />
              <ReadField label="Hướng xử lý" value={u.huong_xu_ly ? HUONG_XU_LY_LABELS[u.huong_xu_ly] : "—"} />
              <ReadField label="Loại đối trừ" value={u.loai_doi_tru ? LOAI_DOI_TRU_LABELS[u.loai_doi_tru] : "—"} />
              <ReadField label="NV phụ trách" value={u.nguoi_sua_chua} />
              {u.ket_qua_chan_doan && <ReadField label="Kết quả chẩn đoán" value={KET_QUA_CHAN_DOAN_LABELS[u.ket_qua_chan_doan]} />}
              {u.xu_ly_xac && <ReadField label="Xử lý xác" value={XU_LY_XAC_LABELS[u.xu_ly_xac]} />}
              {u.ly_do_tu_choi && <ReadField label="Lý do huỷ" value={u.ly_do_tu_choi} />}
              {u.phieu_tra_id && <ReadField label="Thuộc phiếu trả" value={u.phieu_tra_id} />}
            </div>
          )}

          {(anh.don_vi.length > 0 || anh.don_cha.length > 0) && (
            <div className="border-t border-[var(--line)] pt-4">
              <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide mb-2">Ảnh</p>
              <div className="flex flex-wrap gap-2">
                {anh.don_cha.map((a) => (
                  <img key={`p${a.id}`} src={a.anh_url} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)]" title="Ảnh lỗi lúc gửi hàng" />
                ))}
                {anh.don_vi.map((a) => (
                  <img key={`u${a.id}`} src={a.anh_url} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)]" title={a.loai} />
                ))}
              </div>
            </div>
          )}

          {bao_cao_sai_thong_tin.length > 0 && (
            <div className="border-t border-[var(--line)] pt-4">
              <p className="text-xs font-bold text-[var(--coral-700)] uppercase tracking-wide mb-2">🐞 Ghi nhận nội bộ — KTV báo cáo sai thông tin</p>
              <div className="space-y-1.5">
                {(bao_cao_sai_thong_tin as { id: number; tac_gia: string; thoi_gian: string; noi_dung: string }[]).map((b) => (
                  <div key={b.id} className="text-xs bg-[var(--coral-100)] text-[var(--coral-700)] rounded-lg px-2.5 py-1.5">
                    <p>{b.noi_dung}</p>
                    <p className="mt-0.5 text-[10px] font-mono opacity-70">
                      {b.tac_gia} · {fmtDate(b.thoi_gian)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--line)] pt-4">
            <LogBlock title="📦 Nhật ký đơn vị bảo hành này" logs={logs.don_vi} />
            <LogBlock title="🗂️ Nhật ký đơn cha" logs={logs.don_cha} />
            <LogBlock title="🚚 Nhật ký phiếu gửi" logs={logs.phieu_gui} />
            <LogBlock title="↩️ Nhật ký phiếu trả" logs={logs.phieu_tra} />
          </div>
        </div>
      </Modal>

      {sub === "phan-loai" && <PhanLoaiModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "fast" && (
        <FastActionsModal
          unit={u}
          isKhachLe={isKhachLe}
          onClose={() => setSub(null)}
          onDone={afterAction}
          onNavigate={(special) => setSub(special === "bo_sung_tt" ? "bo-sung" : "bao-cao-sai")}
        />
      )}
      {sub === "bo-sung" && <YeuCauBoSungModal parentId={p.id} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "bao-cao-sai" && <BaoCaoSaiModal parentId={p.id} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "xac-nhan" && <XacNhanHoanTatModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "tra-ktv" && <TraTrucTiepModal unitId={u.id} mode="ktv" onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "tra-kho" && <TraTrucTiepModal unitId={u.id} mode="kho" onClose={() => setSub(null)} onDone={afterAction} />}
      {sub === "chan-doan" && <ChanDoanModal unit={u} onClose={() => setSub(null)} onDone={afterAction} />}
    </>
  );
}
