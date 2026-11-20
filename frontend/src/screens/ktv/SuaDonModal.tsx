import { useState } from "react";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useToast } from "../../ui/Toast";
import { api, errorMessage } from "../../lib/api";
import { useLinhKien, useLkDaDat, lkOptionsUuTien } from "../../hooks/useLinhKien";
import { LkDaDatNote } from "../shared/LkDaDatNote";
import { LOAI_DOI_TRU_LABELS } from "../../lib/constants";

// 31/10/2026: bam 1 don trong thung NHAP de sua: linh kien KTV chon (A - VD linh kien mac dinh tu Odoo bi sai),
// so luong, mo ta loi, loai doi tru de xuat. Ma case khong sua o day (sai case thi xoa don, them lai).
export interface DonSua {
  id: string;
  case_id: string | null;
  ma_lk: string | null;
  so_luong_khai: number;
  mo_ta_loi: string | null;
  loai_doi_tru_de_xuat: string | null;
  odoo_id?: number | null;
}

export function SuaDonModal({ don, onClose, onDone }: { don: DonSua; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { items: linhKien } = useLinhKien();
  const lkDaDat = useLkDaDat(don.case_id ?? "", !!don.case_id);
  const [maLk, setMaLk] = useState(don.ma_lk ?? "");
  const [soLuong, setSoLuong] = useState(don.so_luong_khai || 1);
  const [moTa, setMoTa] = useState(don.mo_ta_loi ?? "");
  const [loai, setLoai] = useState(don.loai_doi_tru_de_xuat || "doi_tra");
  const [busy, setBusy] = useState(false);
  const valid = !!maLk && soLuong >= 1 && !!moTa.trim();

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.patch<{ doi: number }>(`/phieu-gui/don/${don.id}`, { ma_lk: maLk, so_luong_khai: soLuong, mo_ta_loi: moTa, loai_doi_tru_de_xuat: loai });
      toast(r.doi ? `Đã sửa đơn ${don.id}.` : "Không có gì thay đổi.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const step = (d: number) => setSoLuong((v) => Math.max(1, Math.min(999, v + d)));

  return (
    <Modal
      title={`Sửa đơn ${don.id}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={save}>
            Lưu thay đổi
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        {don.case_id && (
          <p className="text-xs text-[var(--ink-soft)]">
            Mã case: <span className="font-mono">{don.case_id}</span>
            {!!don.odoo_id && " · đơn từ Odoo"} — sai mã case thì xoá đơn rồi thêm lại.
          </p>
        )}
        <Field label="Linh kiện lỗi" required>
          <SearchableSelect options={lkOptionsUuTien(linhKien, lkDaDat)} value={maLk} onChange={setMaLk} />
          <LkDaDatNote n={lkDaDat.length} />
        </Field>
        <Field label="Số lượng" required>
          <div className="flex items-center gap-2">
            <Btn type="button" size="touch" onClick={() => step(-1)} disabled={soLuong <= 1} aria-label="Giảm">
              −
            </Btn>
            <span className="min-w-[3ch] text-center text-lg font-bold">{soLuong}</span>
            <Btn type="button" size="touch" onClick={() => step(1)} aria-label="Tăng">
              +
            </Btn>
          </div>
        </Field>
        <Field label="Mô tả lỗi" required>
          <Textarea rows={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </Field>
        <Field label="Loại đối trừ đề xuất">
          <Select value={loai} onChange={(e) => setLoai(e.target.value)}>
            {Object.entries(LOAI_DOI_TRU_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
