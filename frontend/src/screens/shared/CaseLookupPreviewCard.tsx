import { useEffect } from "react";
import { useCaseLookup, type CaseLookupResult } from "../../hooks/useCaseLookup";
import { computeWarranty } from "../../lib/warranty";
import { Badge, Btn, Field, Input } from "../../ui/primitives";
import type { LinhKien } from "../../lib/types";

// Link mo case tren CRM (link_crm tra ve tu he DVBH) - yeu cau 05/10/2026 muc 6: "bổ sung thêm nút xem
// chi tiết theo link crm ở các vị trí xem ID case".
export function CrmLink({ url }: { url: string | null | undefined }) {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-2 py-1 text-xs font-semibold text-[var(--link)] hover:bg-[var(--accent-soft)] whitespace-nowrap"
    >
      Xem trên CRM ↗
    </a>
  );
}

// Hien preview 1 case (khach hang/san pham/ngay mua...) + canh bao het han bao hanh (chi canh bao).
//
// ktvEmail: context BAT BUOC case phai dung KTV nay (AddDonModal/AddDonMobileSheet) - khong tim thay /
// sai KTV deu chan, bao nguoc qua onValidityChange.
// allowOverride (05/10/2026 muc 9): Admin/Giam sat tao don HO duoc tich "Xác nhận tạo đơn bảo hành cho
// người khác người phụ trách case trên hệ thống" khi case lech KTV -> van tao duoc (backend ghi nhan).
export function CaseLookupPreviewCard({
  lookup,
  caseId,
  maLk,
  linhKien,
  ktvEmail,
  onValidityChange,
  allowOverride,
  override,
  onOverrideChange,
}: {
  lookup: CaseLookupResult;
  caseId: string;
  maLk: string;
  linhKien: LinhKien[];
  ktvEmail?: string;
  onValidityChange?: (valid: boolean) => void;
  allowOverride?: boolean;
  override?: boolean;
  onOverrideChange?: (v: boolean) => void;
}) {
  const { preview, status, khopKtv } = lookup;

  useEffect(() => {
    if (!onValidityChange) return;
    if (!ktvEmail) {
      onValidityChange(true);
      return;
    }
    onValidityChange(status === "found" && (khopKtv === true || (!!allowOverride && !!override)));
  }, [ktvEmail, status, khopKtv, allowOverride, override, onValidityChange]);

  if (!caseId.trim()) return null;
  if (status === "idle") return <p className="text-xs text-[var(--ink-soft)]">Bấm “Kiểm tra” (hoặc Enter) để tra cứu mã case bên hệ DVBH.</p>;
  if (status === "loading") return <p className="text-xs text-[var(--ink-soft)]">Đang tra cứu case…</p>;
  if (status === "error") return <p className="text-xs text-[var(--red-600)]">Không tra cứu được case lúc này (có thể do mất kết nối tới hệ DVBH) — thử bấm “Kiểm tra” lại.</p>;
  if (status === "not_found") {
    return ktvEmail ? (
      <p className="text-xs font-bold text-[var(--red-700)] bg-[var(--red-100)] rounded px-2 py-1.5">⚠ Sai mã sự vụ — không tìm thấy case này bên hệ DVBH. Kiểm tra lại mã, chưa thể tạo đơn.</p>
    ) : (
      <p className="text-xs text-[var(--ink-soft)]">Không tìm thấy case với mã này bên hệ DVBH — kiểm tra lại mã, hoặc vẫn có thể tiếp tục nếu đây là mã case mới/chưa đồng bộ.</p>
    );
  }
  if (status !== "found" || !preview) return null;

  const lk = linhKien.find((l) => l.ma_lk === maLk);
  const w = computeWarranty(preview.ngay_mua, lk?.so_thang_bao_hanh ?? null, preview.thoi_gian_cskh_tiep_nhan);
  const mismatch = !!ktvEmail && khopKtv === false;

  return (
    <div className="rounded-lg border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">✔ Tìm thấy case</Badge>
        {preview.khach_hang && <span className="text-sm font-semibold text-[var(--ink)]">{preview.khach_hang}</span>}
        <span className="ml-auto">
          <CrmLink url={preview.link_crm} />
        </span>
      </div>
      <div className="text-xs text-[var(--ink-body)] grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
        {preview.san_pham_bao_hanh && <span>Sản phẩm: {preview.san_pham_bao_hanh}</span>}
        {preview.seri_san_pham && <span>Serial: {preview.seri_san_pham}</span>}
        {preview.ngay_mua && <span>Ngày mua: {preview.ngay_mua}</span>}
        {preview.hang && <span>Hãng: {preview.hang}</span>}
        {preview.ky_thuat_vien && <span className="sm:col-span-2">Kỹ thuật viên (case): {preview.ky_thuat_vien}</span>}
      </div>
      {mismatch && !allowOverride && (
        <p className="text-xs font-bold text-[var(--red-700)] bg-[var(--red-100)] rounded px-2 py-1.5">
          ⚠ Sai mã sự vụ — case này không thuộc về KTV đang được tạo đơn (kỹ thuật viên trên case: {preview.ky_thuat_vien || "không xác định"}). Chưa thể tạo đơn với mã sự cố này.
        </p>
      )}
      {mismatch && allowOverride && (
        <div className="rounded px-2 py-1.5 bg-[var(--amber-100)] border border-[var(--amber-200)] space-y-1.5">
          <p className="text-xs font-bold text-[var(--amber-800)]">⚠ Case này không thuộc KTV đang được tạo đơn (kỹ thuật viên trên case: {preview.ky_thuat_vien || "không xác định"}).</p>
          <label className="flex items-start gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={!!override} onChange={(e) => onOverrideChange?.(e.target.checked)} />
            Xác nhận tạo đơn bảo hành cho người khác người phụ trách case trên hệ thống
          </label>
        </div>
      )}
      {lk && w.known && w.expired && (
        <p className="text-xs font-bold text-[var(--red-700)] bg-[var(--red-100)] rounded px-2 py-1.5">
          ⚠ Sản phẩm này đã hết thời gian bảo hành (hạn {w.limitDate}, đã dùng {w.daysUsed} ngày / {w.months} tháng bảo hành) — chỉ là cảnh báo, vẫn chọn "Trong bảo hành" được nếu cần.
        </p>
      )}
    </div>
  );
}

// O nhap "Mã case" + nut "Kiểm tra" (Enter cung kiem tra) + the preview - dung chung cho form KTV them
// don (desktop/mobile) va Admin BH tao don dich vu.
export function CaseIdField({
  label,
  required,
  placeholder,
  caseId,
  setCaseId,
  maLk,
  linhKien,
  ktvEmail,
  onValidityChange,
  allowOverride,
  override,
  onOverrideChange,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  caseId: string;
  setCaseId: (v: string) => void;
  maLk: string;
  linhKien: LinhKien[];
  ktvEmail?: string;
  onValidityChange?: (valid: boolean) => void;
  allowOverride?: boolean;
  override?: boolean;
  onOverrideChange?: (v: boolean) => void;
}) {
  const lookup = useCaseLookup(caseId, ktvEmail);
  const canCheck = !!caseId.trim() && lookup.status !== "loading";
  return (
    <>
      <Field label={label} required={required}>
        <div className="flex gap-2">
          <Input
            className="flex-1 min-w-0"
            value={caseId}
            onChange={(e) => {
              setCaseId(e.target.value);
              onOverrideChange?.(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (canCheck) lookup.check();
              }
            }}
            placeholder={placeholder}
          />
          <Btn variant={lookup.status === "idle" && caseId.trim() ? "primary" : "secondary"} disabled={!canCheck} onClick={lookup.check} className="shrink-0">
            {lookup.status === "loading" ? "Đang kiểm tra…" : "🔍 Kiểm tra"}
          </Btn>
        </div>
      </Field>
      <CaseLookupPreviewCard
        lookup={lookup}
        caseId={caseId}
        maLk={maLk}
        linhKien={linhKien}
        ktvEmail={ktvEmail}
        onValidityChange={onValidityChange}
        allowOverride={allowOverride}
        override={override}
        onOverrideChange={onOverrideChange}
      />
    </>
  );
}

// Ma case co dinh (khong go) - tu tra cuu 1 lan khi mo (PhanLoaiModal).
export function CaseLookupAuto({ caseId, maLk, linhKien }: { caseId: string; maLk: string; linhKien: LinhKien[] }) {
  const lookup = useCaseLookup(caseId, undefined, true);
  return <CaseLookupPreviewCard lookup={lookup} caseId={caseId} maLk={maLk} linhKien={linhKien} />;
}
