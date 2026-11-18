import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Banner } from "../../ui/DetailParts";
import { Btn, Field, Textarea } from "../../ui/primitives";
import { fmtDate } from "../../lib/format";
import { UserName } from "../../hooks/useUserNames";
import type { PhieuGui } from "../../lib/types";

// 18/11/2026: Kho (hoac Admin BH lam ho Kho) tu choi thung "dang gui ve Kho" vi thuc te CHUA nhan duoc
// hang. Thung quay ve nhap cua KTV, KTV nhan canh bao nghiem trong (push + the do Trang chu).
const GOI_Y = [
  "Chưa nhận được hàng — nhà xe / vận chuyển chưa giao tới Kho",
  "Thùng không có thực tế — KTV bấm gửi nhưng chưa gửi hàng",
  "Không tìm thấy thùng theo mã vận đơn / mã xe đã khai",
];

export function KhoTuChoiThungModal({ gui, onClose, onDone }: { gui: PhieuGui; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [lyDo, setLyDo] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/kho/phieu-gui/${gui.id}/tu-choi`, { ly_do: lyDo });
      toast(`Đã từ chối thùng ${gui.id} — đã gửi cảnh báo cho KTV.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Từ chối thùng ${gui.id} — chưa nhận được hàng`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="danger" disabled={!lyDo.trim() || busy} onClick={submit}>
            ⛔ Từ chối & cảnh báo KTV
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Banner tone="red">
          Thùng sẽ <b>rời danh sách chờ của Kho</b> và trả về <b>nháp</b> của KTV <UserName email={gui.nguoi_tao} />. KTV nhận <b>cảnh báo nghiêm trọng</b> và chỉ gửi lại khi đã thật sự gửi hàng.
          {(gui.kho_tc_lan ?? 0) > 0 && <> Thùng này đã bị từ chối {gui.kho_tc_lan} lần trước.</>}
        </Banner>
        <p className="text-xs text-[var(--ink-soft)]">KTV xác nhận gửi lúc {fmtDate(gui.updated_at)}{gui.ma_van_don ? ` · vận đơn ${gui.ma_van_don}` : ""}{gui.ma_xe_hoac_tai_xe ? ` · xe ${gui.ma_xe_hoac_tai_xe}` : ""}</p>
        <Field label="Lý do từ chối" required>
          <Textarea rows={3} value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="VD: đã kiểm tra nhà xe, chưa có thùng này…" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {GOI_Y.map((t) => (
            <button key={t} type="button" className="rounded-full border border-[var(--line)] px-2.5 py-1 text-xs hover:bg-[var(--surface-2)]" onClick={() => setLyDo(t)}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/** Banner canh bao nghiem trong cho thung nhap da bi Kho tu choi (dung trong chi tiet thung). */
export function KhoTuChoiBanner({ g }: { g: PhieuGui }) {
  if (g.trang_thai !== "nhap" || !g.kho_tc_luc) return null;
  return (
    <Banner tone="red">
      ⛔ <b>Kho đã TỪ CHỐI thùng này — chưa nhận được hàng thực tế</b> (lần {g.kho_tc_lan}, {fmtDate(g.kho_tc_luc)}, bởi <UserName email={g.kho_tc_boi} />).
      <br />Lý do: <b>{g.kho_tc_ly_do}</b>
      <br />Thùng đã trả về nháp. Kiểm tra lại với nhà xe; chỉ bấm “Xác nhận đã gửi xe” khi hàng đã thật sự được gửi. Báo gửi khi chưa gửi hàng là vi phạm.
    </Banner>
  );
}
