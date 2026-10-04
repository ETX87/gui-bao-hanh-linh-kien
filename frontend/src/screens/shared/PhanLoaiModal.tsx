import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select, SectionLabel } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { HUONG_XU_LY_LABELS, LOAI_BAO_HANH_LABELS, LOAI_DOI_TRU_LABELS, HUONG_CAN_NV, LY_DO_BO_SUNG_OPTIONS } from "../../lib/constants";
import { useLyDoTuChoi } from "../../hooks/useSettings";
import { useNvList } from "../../hooks/useNvList";
import { useLinhKien } from "../../hooks/useLinhKien";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import { CaseLookupPreviewCard } from "./CaseLookupPreviewCard";
import type { DonVi } from "../../lib/types";

const HUONG_OPTIONS = Object.keys(HUONG_XU_LY_LABELS);

// Form "Phan loai" 1 don vi - port dung phanLoaiFormHtml()/openPhanLoaiModal() cua prototype. Dung cho
// ca "cho_phan_loai" lan "admin_can_xem_lai" (nhan lai form da co gia tri cu). Truong "Linh kien sua
// chua thuc te" mac dinh = linh kien goc cua don cha, doi duoc rieng (ma_lk_thuc_te) - CHI hien o day
// (form don le), KHONG hien o phan loai hang loat (nhieu don vi co the khac don cha). KHONG can prop
// "parent" rieng - ca 2 truong can doc tu don cha (ma_lk, loai_doi_tru_de_xuat) da co san qua JOIN
// ngay tren chinh DonVi (xem GET /admin/don-vi(/:id)) - it prop hon, tai dung truc tiep duoc tu bang
// thong nhat (AdminUnifiedTable.tsx) ma khong can fetch parent rieng.
export function PhanLoaiModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const nvList = useNvList();
  const { items: lyDoTuChoiList } = useLyDoTuChoi();
  const overdue = useSlaGate(unit.updated_at);

  const [loaiBaoHanh, setLoaiBaoHanh] = useState(unit.loai_bao_hanh || "trong_bh");
  const [mailPd, setMailPd] = useState(unit.thong_tin_mail_pd || "");
  const [maPheDuyet, setMaPheDuyet] = useState(unit.ma_phe_duyet || "");
  const [loaiDoiTru, setLoaiDoiTru] = useState(unit.loai_doi_tru || unit.loai_doi_tru_de_xuat || "doi_tra");
  const [huongXuLy, setHuongXuLy] = useState(unit.huong_xu_ly || "");
  const [nguoiSuaChua, setNguoiSuaChua] = useState(unit.nguoi_sua_chua || "");
  const [lyDoTuChoi, setLyDoTuChoi] = useState(unit.ly_do_tu_choi || "");
  const [maLkThucTe, setMaLkThucTe] = useState(unit.ma_lk_thuc_te || unit.ma_lk || "");
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);

  const needsNv = HUONG_CAN_NV.includes(huongXuLy);
  const needsTuChoi = huongXuLy === "tu_choi";

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${unit.id}/phan-loai`, {
        loai_bao_hanh: loaiBaoHanh,
        thong_tin_mail_pd: mailPd,
        ma_phe_duyet: maPheDuyet,
        loai_doi_tru: loaiDoiTru,
        huong_xu_ly: huongXuLy,
        nguoi_sua_chua: needsNv ? nguoiSuaChua : undefined,
        ly_do_tu_choi: needsTuChoi ? lyDoTuChoi : undefined,
        ma_lk_thuc_te: maLkThucTe || null,
        ly_do_cham: overdue ? lyDoCham : undefined,
      });
      toast("Đã phân loại đơn vị.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const valid = huongXuLy && loaiDoiTru && (loaiBaoHanh !== "ngoai_bh" || mailPd.trim()) && (!needsNv || nguoiSuaChua) && (!needsTuChoi || lyDoTuChoi) && (!overdue || lyDoCham);

  return (
    <Modal
      title={`Phân loại đơn vị ${unit.id}`}
      onClose={onClose}
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Lưu phân loại
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />

        {loaiBaoHanh === "ngoai_bh" && (
          <p className="rounded-lg bg-[var(--red-100)] text-[var(--red-700)] text-xs font-bold px-3 py-2">Sản phẩm này chọn "Ngoài bảo hành" — bắt buộc nhập thông tin mail phê duyệt.</p>
        )}
        {unit.loai_doi_tru_de_xuat && <p className="text-xs text-[var(--ink-soft)]">KTV đề xuất lúc gửi hàng: <b>{LOAI_DOI_TRU_LABELS[unit.loai_doi_tru_de_xuat]}</b></p>}
        {unit.case_id && <CaseLookupPreviewCard caseId={unit.case_id} maLk={maLkThucTe || unit.ma_lk || ""} linhKien={linhKien} />}

        <SectionLabel>Phân loại bảo hành</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại bảo hành" required>
            <Select value={loaiBaoHanh} onChange={(e) => setLoaiBaoHanh(e.target.value)}>
              {Object.entries(LOAI_BAO_HANH_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loại đối trừ" required>
            <Select value={loaiDoiTru} onChange={(e) => setLoaiDoiTru(e.target.value)}>
              {Object.entries(LOAI_DOI_TRU_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {loaiBaoHanh === "ngoai_bh" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Thông tin mail phê duyệt" required>
              <Input value={mailPd} onChange={(e) => setMailPd(e.target.value)} placeholder="VD: đường link/email phê duyệt" />
            </Field>
            <Field label="Mã phê duyệt">
              <Input value={maPheDuyet} onChange={(e) => setMaPheDuyet(e.target.value)} />
            </Field>
          </div>
        )}

        <SectionLabel>Xử lý & phân công</SectionLabel>
        <Field label="Hướng xử lý" required>
          <Select value={huongXuLy} onChange={(e) => setHuongXuLy(e.target.value)}>
            <option value="">— Chọn hướng xử lý —</option>
            {HUONG_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {HUONG_XU_LY_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
        {needsNv && (
          <Field label="Nhân viên sửa chữa phụ trách" required>
            <Select value={nguoiSuaChua} onChange={(e) => setNguoiSuaChua(e.target.value)}>
              <option value="">— Chọn NV —</option>
              {nvList.map((n) => (
                <option key={n.email} value={n.email}>
                  {n.ten || n.email}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {needsTuChoi && (
          <Field label="Lý do huỷ" required>
            <Select value={lyDoTuChoi} onChange={(e) => setLyDoTuChoi(e.target.value)}>
              <option value="">— Chọn lý do —</option>
              {lyDoTuChoiList.map((l) => (
                <option key={l.id} value={l.noi_dung}>
                  {l.noi_dung}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Linh kiện sửa chữa thực tế">
          <SearchableSelect
            options={linhKien.map((lk) => ({ value: lk.ma_lk, label: lk.ten_lk }))}
            value={maLkThucTe}
            onChange={setMaLkThucTe}
            placeholder={`— (dùng đúng linh kiện KTV đã chọn: ${unit.ma_lk || "—"}) —`}
          />
        </Field>
      </div>
    </Modal>
  );
}

// Danh sach ly do bo sung dung o BoSungModal (Admin BH) - export lai de tranh import trung.
export { LY_DO_BO_SUNG_OPTIONS };
