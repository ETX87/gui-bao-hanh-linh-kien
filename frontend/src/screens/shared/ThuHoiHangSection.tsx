import { useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Btn, Input } from "../../ui/primitives";
import { Section, KvGrid, Kv } from "../../ui/DetailParts";
import { fmtDate } from "../../lib/format";
import { UserName } from "../../hooks/useUserNames";
import type { AppUser, DonVi } from "../../lib/types";

// "Thu hoi chi phi bao hanh tu hang" (12/10/2026, cau tra loi: "co, hien tai chi ghi nhan thu cong (co
// the them 1 vung de nhap so tien da thu duoc - khong bat buoc)"). Admin BH / Ke toan / qtri nhap duoc;
// Giam sat / View chi xem khi da co so lieu.

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + " đ";

export function ThuHoiHangSection({ unit, user, onSaved }: { unit: DonVi; user: AppUser; onSaved: () => void }) {
  const toast = useToast();
  const canEdit = user.la_admin_bh || user.la_ke_toan || user.la_qtri;
  const coSoLieu = unit.so_tien_thu_hoi_hang != null || !!unit.thu_hoi_hang_ghi_chu;
  const [editing, setEditing] = useState(false);
  const [soTien, setSoTien] = useState(unit.so_tien_thu_hoi_hang != null ? String(unit.so_tien_thu_hoi_hang) : "");
  const [ghiChu, setGhiChu] = useState(unit.thu_hoi_hang_ghi_chu || "");
  const [busy, setBusy] = useState(false);

  // KTV mo chi tiet don cua minh (08/11/2026) khong xem so tien thu hoi tu hang.
  if (!canEdit && (!coSoLieu || !(user.la_giam_sat || user.la_view || user.la_kho))) return null;

  const digits = soTien.replace(/[^\d]/g, "");
  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/admin/don-vi/${unit.id}/thu-hoi-hang`, { so_tien: digits ? Number(digits) : null, ghi_chu: ghiChu });
      toast("Đã lưu thu hồi từ hãng.", "ok");
      setEditing(false);
      onSaved();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="💰 Thu hồi chi phí từ hãng"
      right={
        canEdit && !editing ? (
          <Btn size="sm" onClick={() => setEditing(true)}>
            {coSoLieu ? "Sửa" : "+ Ghi nhận"}
          </Btn>
        ) : undefined
      }
    >
      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="block">
              <span className="text-[11px] text-[var(--ink-faint)]">Số tiền đã thu (đ, không bắt buộc)</span>
              <Input inputMode="numeric" value={digits ? Number(digits).toLocaleString("vi-VN") : ""} onChange={(e) => setSoTien(e.target.value)} placeholder="VD: 250.000" />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[11px] text-[var(--ink-faint)]">Ghi chú (chứng từ / đợt đối soát với hãng…)</span>
              <Input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="VD: Karofi duyệt đợt T10/2026" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Btn size="sm" onClick={() => setEditing(false)}>
              Huỷ
            </Btn>
            <Btn size="sm" variant="primary" disabled={busy} onClick={save}>
              Lưu
            </Btn>
          </div>
        </div>
      ) : coSoLieu ? (
        <KvGrid>
          <Kv k="Đã thu" v={unit.so_tien_thu_hoi_hang != null ? <b>{fmtVnd(unit.so_tien_thu_hoi_hang)}</b> : "—"} />
          <Kv k="Ghi nhận bởi" v={<UserName email={unit.thu_hoi_hang_boi} />} />
          <Kv k="Lúc" v={fmtDate(unit.thu_hoi_hang_luc)} />
          {unit.thu_hoi_hang_ghi_chu && <Kv k="Ghi chú" v={unit.thu_hoi_hang_ghi_chu} wide />}
        </KvGrid>
      ) : (
        <p className="text-xs text-[var(--ink-faint)]">Chưa ghi nhận.</p>
      )}
    </Section>
  );
}
