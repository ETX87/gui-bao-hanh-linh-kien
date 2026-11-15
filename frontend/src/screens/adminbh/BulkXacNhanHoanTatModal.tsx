import { useState } from "react";
import { api, errorMessage, ERROR_MESSAGES } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Modal } from "../../ui/Modal";
import { Btn, Field, Select } from "../../ui/primitives";
import { isOverdue } from "../../lib/format";
import { HUONG_XU_LY_LABELS, XU_LY_XAC_LABELS } from "../../lib/constants";
import { LyDoChamGateField } from "../shared/LyDoChamGateField";
import type { DonVi } from "../../lib/types";

// Xac nhan hoan tat nhieu don vi 1 lan (12/10/2026, de xuat #12 ra soat Admin BH). Don "Doi moi" chua
// co xu ly xac -> hoi 1 lan, ap cho cac don do; co don qua han -> hoi ly do cham 1 lan.

export function BulkXacNhanHoanTatModal({ units, onClose, onDone }: { units: DonVi[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [xuLyXac, setXuLyXac] = useState("");
  const [lyDoCham, setLyDoCham] = useState("");
  const [busy, setBusy] = useState(false);
  const thieuXac = units.filter((u) => u.huong_xu_ly === "doi_moi" && !u.xu_ly_xac).length;
  const soQuaHan = units.filter((u) => isOverdue(u.updated_at, "cho_admin_xac_nhan")).length;
  const valid = (!thieuXac || xuLyXac) && (!soQuaHan || lyDoCham);

  const byHuong: Record<string, number> = {};
  for (const u of units) byHuong[u.huong_xu_ly || ""] = (byHuong[u.huong_xu_ly || ""] || 0) + 1;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ ok: number; loi: { id: string; error: string }[] }>("/admin/don-vi/xac-nhan-hoan-tat-hang-loat", {
        ids: units.map((u) => u.id),
        xu_ly_xac: xuLyXac || undefined,
        ly_do_cham: lyDoCham || undefined,
      });
      if (r.loi.length) toast(`Đã xác nhận ${r.ok} đơn. ${r.loi.length} đơn lỗi: ${r.loi.map((x) => `${x.id} — ${ERROR_MESSAGES[x.error] || x.error}`).join("; ")}`, "error");
      else toast(`Đã xác nhận hoàn tất ${r.ok} đơn.`, "ok");
      onDone();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Xác nhận hoàn tất ${units.length} đơn`}
      onClose={onClose}
      maxWidthClass="max-w-md"
      footerActions={
        <>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="success" disabled={!valid || busy} onClick={submit}>
            {busy ? "Đang lưu…" : `✔️ Xác nhận ${units.length} đơn`}
          </Btn>
        </>
      }
    >
      <div className="space-y-3">
        <LyDoChamGateField overdue={soQuaHan > 0} value={lyDoCham} onChange={setLyDoCham} />
        {soQuaHan > 0 && <p className="text-xs text-[var(--ink-soft)]">Lý do chậm áp cho {soQuaHan} đơn quá hạn.</p>}
        <p className="text-sm text-[var(--ink-body)]">
          {Object.entries(byHuong)
            .map(([h, n]) => `${n} ${h ? HUONG_XU_LY_LABELS[h] || h : "chưa rõ hướng"}`)
            .join(" · ")}
        </p>
        {thieuXac > 0 && (
          <Field label={`Xử lý xác (áp cho ${thieuXac} đơn Đổi mới chưa chọn)`} required>
            <Select value={xuLyXac} onChange={(e) => setXuLyXac(e.target.value)}>
              <option value="">— Chọn —</option>
              {Object.entries(XU_LY_XAC_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
