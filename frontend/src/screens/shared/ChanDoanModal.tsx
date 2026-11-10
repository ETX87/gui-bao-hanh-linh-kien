import { useEffect, useState } from "react";
import { ImagePicker } from "../../ui/ImagePicker";
import { api, errorMessage } from "../../lib/api";
import { fileToDataUrl } from "../../lib/format";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select, Textarea } from "../../ui/primitives";
import { KET_QUA_NV_OPTIONS } from "../../lib/constants";
import { useSlaGate, LyDoChamGateField } from "./LyDoChamGateField";
import type { DeXuatLk, DonVi } from "../../lib/types";

// NV nop ket qua chan doan - anh truoc/sau/loi thuc te luu base64 data URL truc tiep (KHONG dung R2 -
// quyet dinh da chot cho he nay). Anh KHONG bat buoc (form goc chua tung danh dau bat buoc - xem
// CLAUDE.md muc QA 31/08/2026, con lai la cau hoi nghiep vu chua chot).

async function filesToDataUrls(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(Array.from(files).map(fileToDataUrl));
}

export function ChanDoanModal({ unit, onClose, onDone }: { unit: DonVi; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const overdue = useSlaGate(unit.updated_at);
  const [ketQua, setKetQua] = useState("");
  const [anhTruoc, setAnhTruoc] = useState<FileList | null>(null);
  const [anhSau, setAnhSau] = useState<FileList | null>(null);
  const [anhLoi, setAnhLoi] = useState<FileList | null>(null);
  const [lyDoCham, setLyDoCham] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [busy, setBusy] = useState(false);
  // 12/10/2026: de xuat linh kien con "cho cap" se tu huy khi nop ket qua - bao truoc cho NV.
  const [soChoCap, setSoChoCap] = useState(0);
  useEffect(() => {
    api
      .get<{ de_xuat: DeXuatLk[] }>(`/de-xuat/don-vi/${unit.id}`)
      .then((r) => setSoChoCap(r.de_xuat.filter((d) => d.trang_thai === "cho_cap").length))
      .catch(() => undefined);
  }, [unit.id]);

  const [xacNhanBanGiao, setXacNhanBanGiao] = useState(false);

  const submit = async (banGiao = false) => {
    setBusy(true);
    try {
      const [anh_truoc, anh_sau, anh_loi_thuc_te] = await Promise.all([filesToDataUrls(anhTruoc), filesToDataUrls(anhSau), filesToDataUrls(anhLoi)]);
      const r = await api.post<{ phieu_tra_id?: string | null }>(`/nv/don-vi/${unit.id}/chan-doan`, { ket_qua_chan_doan: banGiao ? "da_sua_xong" : ketQua, ban_giao: banGiao || undefined, anh_truoc, anh_sau, anh_loi_thuc_te, ly_do_cham: overdue ? lyDoCham : undefined, ghi_chu: ghiChu.trim() || undefined });
      setXacNhanBanGiao(false);
      toast(banGiao ? "Đã bàn giao máy — đơn đã kết thúc." : r.phieu_tra_id ? `Đã nộp kết quả — đã đẩy thẳng sang Kho (phiếu trả ${r.phieu_tra_id}).` : "Đã nộp kết quả sửa chữa.", "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const valid = ketQua && (!overdue || lyDoCham);
  const validBanGiao = !overdue || lyDoCham;

  return (
    <Modal
      title={`Nộp kết quả sửa chữa — ${unit.id}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="success" disabled={!validBanGiao || busy} onClick={() => setXacNhanBanGiao(true)} title="Máy đã sửa xong và đã giao lại — kết thúc toàn bộ quy trình">
            ✔ Đã bàn giao máy (kết thúc luôn)
          </Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={() => submit(false)}>
            Nộp kết quả
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <LyDoChamGateField overdue={overdue} value={lyDoCham} onChange={setLyDoCham} />
        <Field label="Kết quả" required>
          <Select value={ketQua} onChange={(e) => setKetQua(e.target.value)}>
            <option value="">— Chọn —</option>
            {KET_QUA_NV_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ghi chú">
          <Textarea rows={3} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Linh kiện đã thay, nguyên nhân lỗi, lưu ý cho Admin / Kho…" />
        </Field>
        {soChoCap > 0 && (
          <p className="rounded-lg bg-[var(--amber-100)] px-3 py-2 text-xs font-semibold text-[var(--amber-800)]">
            Còn {soChoCap} đề xuất linh kiện chưa được cấp — nộp kết quả sẽ tự huỷ các đề xuất này.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 [&>*]:min-w-0">
          <Field label="Ảnh trước sửa">
            <ImagePicker compact onChange={setAnhTruoc} />
          </Field>
          <Field label="Ảnh sau sửa">
            <ImagePicker compact onChange={setAnhSau} />
          </Field>
          <Field label="Ảnh lỗi thực tế">
            <ImagePicker compact onChange={setAnhLoi} />
          </Field>
        </div>
      </div>
      {xacNhanBanGiao && (
        <Modal
          title="Xác nhận đã bàn giao máy"
          onClose={() => setXacNhanBanGiao(false)}
          maxWidthClass="max-w-md"
          footerActions={
            <>
              <Btn onClick={() => setXacNhanBanGiao(false)}>Quay lại</Btn>
              <Btn variant="danger" disabled={busy} onClick={() => submit(true)}>
                {busy ? "Đang lưu…" : "Xác nhận kết thúc"}
              </Btn>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-[var(--red-100)] px-3 py-2 font-semibold text-[var(--red-700)]">
              ⚠ Xác nhận này sẽ KẾT THÚC TẤT CẢ luồng quy trình của đơn {unit.id}.
            </p>
            <p>Máy này sẽ được tính là <b>đã sửa xong</b> và <b>đã bàn giao xong</b> — không qua Admin xác nhận, Kế toán duyệt hay Kho gửi trả nữa.</p>
            {soChoCap > 0 && <p className="text-[var(--amber-800)]">{soChoCap} đề xuất linh kiện chưa cấp sẽ tự huỷ.</p>}
            <p className="text-[var(--ink-soft)]">Bạn có chắc chắn không?</p>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
