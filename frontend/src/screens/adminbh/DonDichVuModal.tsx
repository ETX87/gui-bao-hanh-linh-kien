import { useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Textarea, SectionLabel } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useLinhKien, lkOptions } from "../../hooks/useLinhKien";
import { CaseIdField } from "../shared/CaseLookupPreviewCard";

// Admin BH tu tao 1 don cha truc tiep - danh cho khach hang le tra phi, khong qua KTV/Kho (port dung
// "dich vu tinh phi" da chot 21/08/2026 vong 2 muc 5c). case_id tuy chon - neu khong co bat buoc nhap
// tay thong tin khach.

export function DonDichVuModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const [caseId, setCaseId] = useState("");
  const [ten, setTen] = useState("");
  const [sdt, setSdt] = useState("");
  const [diaChi, setDiaChi] = useState("");
  const [sanPham, setSanPham] = useState("");
  const [maLk, setMaLk] = useState("");
  const [soLuong, setSoLuong] = useState("1");
  const [moTa, setMoTa] = useState("");
  const [anhFiles, setAnhFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const hasCase = caseId.trim().length > 0;
  const valid = moTa.trim() && Number(soLuong) >= 1 && (hasCase || (ten.trim() && sdt.trim() && sanPham.trim()));

  const submit = async () => {
    setBusy(true);
    try {
      const anh = anhFiles && anhFiles.length > 0 ? await Promise.all(Array.from(anhFiles).map(fileToDataUrl)) : [];
      await api.post("/admin/don-dich-vu", {
        case_id: caseId.trim() || null,
        ten_khach_hang: ten.trim(),
        sdt_khach_hang: sdt.trim(),
        dia_chi_khach_hang: diaChi.trim(),
        san_pham_bh: sanPham.trim(),
        ma_lk: maLk || null,
        so_luong: Number(soLuong),
        mo_ta_loi: moTa.trim(),
        anh,
      });
      toast("Đã tạo đơn dịch vụ tính phí.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Tạo đơn dịch vụ tính phí (khách lẻ)"
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Tạo đơn
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <CaseIdField label="Mã case (nếu có — để trống nếu khách lẻ không có case CRM)" caseId={caseId} setCaseId={setCaseId} maLk={maLk} linhKien={linhKien} />
        {!hasCase && (
          <>
            <SectionLabel>Thông tin khách lẻ</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên khách hàng" required>
                <Input value={ten} onChange={(e) => setTen(e.target.value)} />
              </Field>
              <Field label="SĐT" required>
                <Input value={sdt} onChange={(e) => setSdt(e.target.value)} />
              </Field>
            </div>
            <Field label="Địa chỉ">
              <Input value={diaChi} onChange={(e) => setDiaChi(e.target.value)} />
            </Field>
            <Field label="Sản phẩm bảo hành" required>
              <Input value={sanPham} onChange={(e) => setSanPham(e.target.value)} />
            </Field>
          </>
        )}
        <SectionLabel>Linh kiện lỗi</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Field label="Linh kiện">
              <SearchableSelect options={lkOptions(linhKien)} value={maLk} onChange={setMaLk} />
            </Field>
          </div>
          <Field label="Số lượng" required>
            <Input type="number" min={1} value={soLuong} onChange={(e) => setSoLuong(e.target.value)} />
          </Field>
        </div>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={2} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </Field>
        <Field label="Ảnh linh kiện lỗi (tuỳ chọn)">
          <ImagePicker onChange={setAnhFiles} />
        </Field>
      </div>
    </Modal>
  );
}
