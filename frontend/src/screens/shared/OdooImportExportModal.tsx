import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input } from "../../ui/primitives";
import { buildXlsx, downloadBlob } from "../../lib/xlsx";

// Tai file ket qua gui sua de IMPORT NGUOC Odoo (09/10/2026, backend lib/odooImportExport.ts).
// Sheet 1 dung 4 cot ten truong Odoo: ID (External ID), Trạng thái, Ngày hoàn thành, Ghi chú.
// Sheet 2 "Tham khảo": ma don, ma ca, linh kien, trang thai hien tai - KHONG dung de import.

interface Row {
  id: string;
  trang_thai: string;
  ngay_hoan_thanh: string;
  ghi_chu: string;
  odoo_id: number;
  ma_don: string | null;
  case_id: string | null;
  linh_kien: string;
  trang_thai_odoo_hien_tai: string;
  trang_thai_sua_chua: string;
  ma_phieu: string | null;
  cap_nhat_luc: string | null;
}

const daysAgo = (n: number) => new Date(Date.now() + 7 * 3600 * 1000 - n * 86400 * 1000).toISOString().slice(0, 10);

export function OdooImportExportModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [tu, setTu] = useState(daysAgo(3));
  const [den, setDen] = useState(daysAgo(-1)); // mac dinh -3 .. +1 ngay (giong moc tai Odoo ben auto qs)
  const [chiCanCapNhat, setChiCanCapNhat] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rows: Row[]; thieu_id: number } | null>(null);

  const load = async () => {
    const q = new URLSearchParams({ tu, den, chi_can_cap_nhat: chiCanCapNhat ? "1" : "0" });
    return api.get<{ rows: Row[]; thieu_id: number }>(`/odoo-don/xuat-import?${q}`);
  };

  const xem = async () => {
    setBusy(true);
    try {
      setPreview(await load());
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const tai = async () => {
    setBusy(true);
    try {
      const r = preview ?? (await load());
      setPreview(r);
      if (r.rows.length === 0) {
        toast("Không có đơn nào cần import trong khoảng này.", "error");
        return;
      }
      const blob = buildXlsx([
        {
          name: "Import Odoo",
          rows: [["ID", "Trạng thái", "Ngày hoàn thành", "Ghi chú"], ...r.rows.map((x) => [x.id, x.trang_thai, x.ngay_hoan_thanh, x.ghi_chu])],
          widths: [52, 20, 20, 90],
        },
        {
          name: "Tham khảo",
          rows: [
            ["ID", "Mã đơn BH", "Mã ca", "Linh kiện", "Trạng thái Odoo hiện tại", "Trạng thái sửa chữa", "Mã phiếu", "Cập nhật lúc"],
            ...r.rows.map((x) => [x.id, x.ma_don ?? "", x.case_id ?? "", x.linh_kien, x.trang_thai_odoo_hien_tai, x.trang_thai_sua_chua, x.ma_phieu ?? "", x.cap_nhat_luc ?? ""]),
          ],
          widths: [52, 12, 14, 40, 22, 18, 26, 20],
        },
      ]);
      downloadBlob(blob, `import_odoo_don_bao_hanh_${tu}_${den}.xlsx`);
      toast(`Đã tải ${r.rows.length} đơn.`, "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="📤 Tải file import kết quả về Odoo"
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      footerActions={
        <>
          <Btn onClick={xem} disabled={busy}>Xem trước</Btn>
          <Btn variant="primary" onClick={tai} disabled={busy}>Tải file .xlsx</Btn>
        </>
      }
    >
      <p className="text-xs text-[var(--ink-soft)] mb-3">
        File gồm 4 cột đúng tên trường Odoo: <b>ID</b>, <b>Trạng thái</b>, <b>Ngày hoàn thành</b>, <b>Ghi chú</b>. Trên Odoo vào Đơn bảo hành → ⚙ → Nhập bản ghi → chọn
        file. Odoo không nhận "Ngày hoàn thành" (trường chỉ đọc) thì chọn "Không nhập" cho cột đó. Ghi chú = ghi chú đang có trên Odoo + kết quả sửa chữa.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Trạng thái đổi từ ngày">
          <Input type="date" value={tu} onChange={(e) => { setTu(e.target.value); setPreview(null); }} />
        </Field>
        <Field label="Đến ngày">
          <Input type="date" value={den} onChange={(e) => { setDen(e.target.value); setPreview(null); }} />
        </Field>
      </div>
      <label className="flex items-center gap-2 mt-3 text-sm">
        <input type="checkbox" checked={chiCanCapNhat} onChange={(e) => { setChiCanCapNhat(e.target.checked); setPreview(null); }} />
        Chỉ đơn cần cập nhật (bỏ đơn Odoo đã đúng trạng thái + ghi chú)
      </label>
      {preview && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">
            {preview.rows.length} đơn
            {preview.thieu_id > 0 && <span className="text-[var(--red-700)]"> · {preview.thieu_id} đơn chưa có ID import (chưa đồng bộ xong, bỏ qua)</span>}
          </p>
          <div className="max-h-72 overflow-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--surface-2)]">
                <tr>
                  <th className="text-left p-2">Mã đơn</th>
                  <th className="text-left p-2">Odoo hiện tại → Import</th>
                  <th className="text-left p-2">Ngày HT</th>
                  <th className="text-left p-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 200).map((x) => (
                  <tr key={x.odoo_id} className="border-t">
                    <td className="p-2 whitespace-nowrap">{x.ma_don ?? x.odoo_id}</td>
                    <td className="p-2 whitespace-nowrap">{x.trang_thai_odoo_hien_tai} → <b>{x.trang_thai}</b></td>
                    <td className="p-2 whitespace-nowrap">{x.ngay_hoan_thanh}</td>
                    <td className="p-2">{x.ghi_chu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
