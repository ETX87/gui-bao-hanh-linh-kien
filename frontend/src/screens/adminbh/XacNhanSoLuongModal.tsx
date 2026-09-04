import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input } from "../../ui/primitives";
import type { DonCha } from "../../lib/types";

// Admin BH xac nhan so luong thuc nhan - tach thanh N don vi con (port dung submitSoLuongThucNhan()).

export function XacNhanSoLuongModal({ parent, onClose, onDone }: { parent: DonCha; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [sl, setSl] = useState(String(parent.so_luong_khai));
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);

  const soLuong = parseInt(sl, 10);
  const lech = Number.isInteger(soLuong) && soLuong !== parent.so_luong_khai;
  const valid = Number.isInteger(soLuong) && soLuong >= 1 && (!lech || lyDo.trim());

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ so_don_vi: number }>(`/admin/don-cha/${parent.id}/xac-nhan-so-luong`, { so_luong_thuc_nhan: soLuong, ly_do_chenh_lech_sl: lech ? lyDo : undefined });
      toast(`Đã tách thành ${r.so_don_vi} đơn vị.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Xác nhận số lượng thực nhận — ${parent.id}`}
      onClose={onClose}
      maxWidthClass="max-w-sm"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={!valid || busy} onClick={submit}>
            Xác nhận & tách đơn vị
          </Btn>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--ink-600)]">
          KTV khai <b>{parent.so_luong_khai}</b> — {parent.mo_ta_loi}
        </p>
        <Field label="Số lượng thực nhận" required>
          <Input type="number" min={1} value={sl} onChange={(e) => setSl(e.target.value)} />
        </Field>
        {lech && (
          <Field label="Lý do chênh lệch số lượng" required>
            <Input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: thực tế thiếu 1 cái so với khai báo" />
          </Field>
        )}
      </div>
    </Modal>
  );
}
