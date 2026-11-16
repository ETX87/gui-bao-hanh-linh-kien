import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Input, Select } from "../../ui/primitives";
import { Kv } from "../../ui/DetailParts";
import { LOAI_BAO_HANH_LABELS, loaiDeXuatSuaChua } from "../../lib/constants";
import { DoiTacSelect, useDoiTac } from "../qtri/DoiTac";
import type { DonVi } from "../../lib/types";

// 16/11/2026 (v1.142) - "Đơn bh cần thêm cột Hãng, Đối tác (lấy từ CRM). (admin BH có thể sửa lại nếu chưa chính xác khi duyệt đơn)". Dong
// Hang / Doi tac / loai cap linh kien sua chua trong chi tiet don vi + nut Sua (Admin BH) -> POST /admin/don-vi/:id/thong-tin-bh.
export function ThongTinBhKv({ u, sua, onSaved }: { u: DonVi; sua: boolean; onSaved: () => void }) {
  const [mo, setMo] = useState(false);
  const ldx = u.huong_xu_ly === "sua_chua" || u.huong_xu_ly === "dich_vu_tinh_phi" ? loaiDeXuatSuaChua(u.loai_bao_hanh, u.doi_tac_karofi) : null;
  const nut = sua && !u.trang_thai.startsWith("ket_thuc") ? (
    <button type="button" className="ml-1 text-xs text-[var(--link)] hover:underline" onClick={() => setMo(true)}>
      ✎ Sửa
    </button>
  ) : null;
  return (
    <>
      <Kv k="Hãng" v={<>{u.hang || "—"}{nut}</>} />
      <Kv k="Đối tác" v={<>{u.doi_tac || "—"}{u.doi_tac_karofi ? <span className="ml-1 text-[11px] text-[var(--ink-soft)]">(Karofi)</span> : null}</>} />
      {ldx && <Kv k="Cấp linh kiện sửa chữa" v={ldx} />}
      {mo && <SuaThongTinBhModal u={u} onClose={() => setMo(false)} onSaved={() => { setMo(false); onSaved(); }} />}
    </>
  );
}

function SuaThongTinBhModal({ u, onClose, onSaved }: { u: DonVi; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const ds = useDoiTac();
  const [hang, setHang] = useState(u.hang || "");
  const [dt, setDt] = useState<number | null>(u.doi_tac_id ?? null);
  const [bh, setBh] = useState(u.loai_bao_hanh || "");
  const [busy, setBusy] = useState(false);
  const canNv = u.trang_thai === "cho_chan_doan";
  const ldx = loaiDeXuatSuaChua(bh, dt ? (ds.find((d) => d.id === dt)?.la_karofi ?? null) : null);
  const luu = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/don-vi/${u.id}/thong-tin-bh`, { hang: hang.trim() || null, doi_tac_id: dt, ...(bh ? { loai_bao_hanh: bh } : {}) });
      toast("Đã lưu thông tin đơn bảo hành.", "ok");
      onSaved();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Hãng / Đối tác / Bảo hành — ${u.id}`}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      footerActions={
        <>
          <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={busy || (canNv && (!hang.trim() || !dt))} onClick={luu}>Lưu</Btn>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Hãng" required={canNv}><Input value={hang} onChange={(e) => setHang(e.target.value)} /></Field>
        <Field label="Đối tác" required={canNv}><DoiTacSelect value={dt} onChange={setDt} /></Field>
        <Field label="Bảo hành">
          <Select value={bh} onChange={(e) => setBh(e.target.value)}>
            <option value="">—</option>
            {Object.entries(LOAI_BAO_HANH_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        {canNv && ldx && (
          <p className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs">
            Lần cấp linh kiện MỚI sẽ đặt dạng <b>{ldx}</b>. Lần cấp đã tạo giữ nguyên loại (hủy và cấp lại nếu cần đổi).
          </p>
        )}
      </div>
    </Modal>
  );
}
