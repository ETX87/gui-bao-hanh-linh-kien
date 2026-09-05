import { useEffect } from "react";
import { useCaseLookup } from "../../hooks/useCaseLookup";
import { computeWarranty } from "../../lib/warranty";
import { Badge } from "../../ui/primitives";
import type { LinhKien } from "../../lib/types";

// Hien preview 1 case tra cuu duoc (khach hang/san pham/ngay mua...) + canh bao het han bao hanh -
// port dung "banner do, chi canh bao khong chan" da chot 21/08/2026 "Phan hoi vong 1 muc #10", cong
// warrantyCheck() da doc lai o CLAUDE.md/prototype (dong 1419-1427) truoc khi viet lib/warranty.ts.
// Dung o AddDonModal/AddDonMobileSheet (KTV)/DonDichVuModal (Admin BH)/PhanLoaiModal - deu co o "Ma
// case" + o chon linh kien.
//
// ktvEmail (tuy chon, them 05/09/2026 muc 2): khi co, day la context BAT BUOC case phai dung cua
// dung KTV nay (AddDonModal/AddDonMobileSheet) - hien canh bao CUNG (khong tim thay / sai KTV deu la
// loi chan, khong con "vẫn có thể tiếp tục" nhu truoc) + bao nguoc len qua onValidityChange de form
// cha gate nut submit. KHONG dung ktvEmail o DonDichVuModal/PhanLoaiModal (case tuy chon/khong gan 1
// KTV ro rang) - giu nguyen thong diep mem nhu cu.

export function CaseLookupPreviewCard({
  caseId,
  maLk,
  linhKien,
  ktvEmail,
  onValidityChange,
}: {
  caseId: string;
  maLk: string;
  linhKien: LinhKien[];
  ktvEmail?: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const { preview, status, khopKtv } = useCaseLookup(caseId, ktvEmail);

  useEffect(() => {
    if (!onValidityChange) return;
    if (!ktvEmail) {
      onValidityChange(true); // khong o che do bat buoc khop KTV - khong gate gi ca
      return;
    }
    onValidityChange(status === "found" && khopKtv === true);
  }, [ktvEmail, status, khopKtv, onValidityChange]);

  if (!caseId.trim()) return null;
  if (status === "loading") return <p className="text-xs text-[var(--ink-500)]">Đang tra cứu case…</p>;
  if (status === "error") return <p className="text-xs text-[var(--coral-600)]">Không tra cứu được case lúc này (có thể do mất kết nối tới hệ DVBH) — vẫn nhập tiếp được, mã case sẽ được lưu nguyên trạng.</p>;
  if (status === "not_found") {
    return ktvEmail ? (
      <p className="text-xs font-bold text-[var(--coral-700)] bg-[var(--coral-100)] rounded px-2 py-1.5">⚠ Sai mã sự vụ — không tìm thấy case này bên hệ DVBH. Kiểm tra lại mã, chưa thể tạo đơn.</p>
    ) : (
      <p className="text-xs text-[var(--ink-500)]">Không tìm thấy case với mã này bên hệ DVBH — kiểm tra lại mã, hoặc vẫn có thể tiếp tục nếu đây là mã case mới/chưa đồng bộ.</p>
    );
  }
  if (status !== "found" || !preview) return null;

  const lk = linhKien.find((l) => l.ma_lk === maLk);
  const w = computeWarranty(preview.ngay_mua, lk?.so_thang_bao_hanh ?? null, preview.thoi_gian_cskh_tiep_nhan);

  return (
    <div className="rounded-lg border border-[var(--teal-200)] bg-[var(--teal-50)] px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <Badge tone="green">✔ Tìm thấy case</Badge>
        {preview.khach_hang && <span className="text-sm font-semibold text-[var(--ink-900)]">{preview.khach_hang}</span>}
      </div>
      <div className="text-xs text-[var(--ink-700)] grid grid-cols-2 gap-x-3 gap-y-0.5">
        {preview.san_pham_bao_hanh && <span>Sản phẩm: {preview.san_pham_bao_hanh}</span>}
        {preview.seri_san_pham && <span>Serial: {preview.seri_san_pham}</span>}
        {preview.ngay_mua && <span>Ngày mua: {preview.ngay_mua}</span>}
        {preview.hang && <span>Hãng: {preview.hang}</span>}
      </div>
      {ktvEmail && khopKtv === false && (
        <p className="text-xs font-bold text-[var(--coral-700)] bg-[var(--coral-100)] rounded px-2 py-1.5">
          ⚠ Sai mã sự vụ — case này không thuộc về KTV đang được tạo đơn (kỹ thuật viên trên case: {preview.ky_thuat_vien || "không xác định"}). Chưa thể tạo đơn với mã sự cố này.
        </p>
      )}
      {lk && w.known && w.expired && (
        <p className="text-xs font-bold text-[var(--coral-700)] bg-[var(--coral-100)] rounded px-2 py-1.5">
          ⚠ Sản phẩm này đã hết thời gian bảo hành (hạn {w.limitDate}, đã dùng {w.daysUsed} ngày / {w.months} tháng bảo hành) — chỉ là cảnh báo, vẫn chọn "Trong bảo hành" được nếu cần.
        </p>
      )}
    </div>
  );
}
