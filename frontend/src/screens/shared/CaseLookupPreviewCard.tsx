import { useEffect, useState } from "react";
import { useOdooChoGui } from "../ktv/OdooDonPicker";
import { lkLabel } from "../../hooks/useLinhKien";
import { useCaseLookup, type CaseLookupResult, type LadaPreview } from "../../hooks/useCaseLookup";
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
  const { preview, status, khopKtv, lada } = lookup;

  useEffect(() => {
    if (!onValidityChange) return;
    if (!ktvEmail) {
      onValidityChange(true);
      return;
    }
    // dvbh_down (30/10/2026): DVBH loi -> tich "Vẫn tạo đơn" la hop le (dung chung o override).
    // 21/11/2026: ma Lada tim thay -> hop le; khong thay / he Lada loi -> tich "tu chiu trach nhiem" (dung chung override).
    onValidityChange(
      (status === "found" && (khopKtv === true || (!!allowOverride && !!override))) ||
        (status === "dvbh_down" && !!override) ||
        status === "cho_dong_bo" ||
        status === "lada_found" ||
        ((status === "lada_not_found" || status === "lada_down") && !!override),
    );
  }, [ktvEmail, status, khopKtv, allowOverride, override, onValidityChange]);

  if (!caseId.trim()) return null;
  if (status === "idle") return <p className="text-xs text-[var(--ink-soft)]">Bấm “Kiểm tra” (hoặc Enter) để tra cứu mã case (SC…) hoặc mã Lada.</p>;
  if (status === "loading") return <p className="text-xs text-[var(--ink-soft)]">Đang tra cứu…</p>;
  if (status === "lada_found" && lada) return <LadaCard id={caseId} p={lada} lechKtv={!!ktvEmail && khopKtv === false} />;
  if (status === "lada_not_found" || status === "lada_down")
    return (
      <div className="rounded px-2 py-1.5 bg-[var(--red-100)] border border-[var(--red-200)] space-y-1.5">
        <p className="text-xs font-bold text-[var(--red-700)]">
          {status === "lada_down"
            ? `⚠ Hệ Lada đang không phản hồi — chưa kiểm tra được mã Lada ${caseId.trim().toUpperCase()}.`
            : `⚠ Không tìm thấy mã Lada ${caseId.trim().toUpperCase()} — không có đơn Lada nào với mã này.`}{" "}
          Kiểm tra lại mã. Nếu vẫn tạo, bạn tự chịu trách nhiệm về tính chính xác của mã (Admin bảo hành sẽ thấy cảnh báo trên đơn).
        </p>
        {ktvEmail && (
          <label className="flex items-start gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={!!override} onChange={(e) => onOverrideChange?.(e.target.checked)} />
            Tôi xác nhận mã này đúng và tự chịu trách nhiệm — vẫn tạo đơn
          </label>
        )}
      </div>
    );
  if (status === "dvbh_down") {
    if (!ktvEmail) return <p className="text-xs text-[var(--amber-800)]">Hệ DVBH đang không phản hồi, chưa tra cứu được case — có thể thử “Kiểm tra” lại sau.</p>;
    return (
      <div className="rounded px-2 py-1.5 bg-[var(--amber-100)] border border-[var(--amber-200)] space-y-1.5">
        <p className="text-xs font-bold text-[var(--amber-800)]">⚠ Hệ DVBH đang không phản hồi — chưa kiểm tra được mã case này. Có thể bấm “Kiểm tra” lại, hoặc vẫn tạo đơn trước.</p>
        <label className="flex items-start gap-2 text-xs font-semibold text-[var(--ink)] cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={!!override} onChange={(e) => onOverrideChange?.(e.target.checked)} />
          Vẫn tạo đơn — hệ thống sẽ tự xác minh mã case khi DVBH hoạt động lại (sai mã sẽ báo Admin bảo hành)
        </label>
      </div>
    );
  }
  // 03/11/2026: case trong ngay (SC + YYMMDD hom nay) chua dong bo kip sang DVBH -> van tao duoc, chua xac minh.
  if (status === "cho_dong_bo")
    return (
      <p className="text-xs font-bold text-[var(--amber-800)] bg-[var(--amber-100)] border border-[var(--amber-200)] rounded px-2 py-1.5">
        ⏳ Chưa thấy case này trên DVBH — là case trong ngày hôm nay nên có thể chưa kịp đồng bộ. Vẫn tạo đơn được; đơn sẽ được đánh dấu “mã case chưa xác minh” để Admin bảo hành lưu ý, hệ thống tự xác minh lại sau.
      </p>
    );
  if (status === "error") return <p className="text-xs text-[var(--red-600)]">Không tra cứu được case lúc này (có thể do mất kết nối tới hệ DVBH) — thử bấm “Kiểm tra” lại.</p>;
  if (status === "not_found") {
    return ktvEmail ? (
      <p className="text-xs font-bold text-[var(--red-700)] bg-[var(--red-100)] rounded px-2 py-1.5">⚠ Sai mã sự vụ — không tìm thấy case này bên hệ DVBH. Kiểm tra lại mã, chưa thể tạo đơn (chỉ case trong ngày hôm nay mới được tạo khi chưa đồng bộ).</p>
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

// 21/11/2026: the ket qua tra ma Lada (don Ecolada) - thong tin de doi chieu; KTV tren don Lada khac chi canh bao mem.
function LadaCard({ id, p, lechKtv }: { id: string; p: LadaPreview; lechKtv: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--green-200)] bg-[var(--green-50)] px-3 py-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">✔ Tìm thấy mã Lada {id.trim().toUpperCase()}</Badge>
        {p.khach_hang && <span className="text-sm font-semibold text-[var(--ink)]">{p.khach_hang}</span>}
      </div>
      <div className="text-xs text-[var(--ink-body)] grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
        {p.model && <span>Model: {p.model}</span>}
        {p.hang && <span>Hãng: {p.hang}</span>}
        {p.trang_thai && <span>Trạng thái Lada: {p.trang_thai}</span>}
        {(p.tinh || p.quan_huyen) && <span>Địa bàn: {[p.quan_huyen, p.tinh].filter(Boolean).join(", ")}</span>}
        {p.ngay_chot_don && <span>Ngày chốt đơn: {p.ngay_chot_don}</span>}
        {p.ky_thuat_vien && <span className="sm:col-span-2">Kỹ thuật viên (Lada): {p.ky_thuat_vien}</span>}
      </div>
      {lechKtv && <p className="text-xs font-semibold text-[var(--amber-800)]">⚠ Kỹ thuật viên trên đơn Lada khác KTV đang được tạo đơn — kiểm tra lại (chỉ là cảnh báo).</p>}
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
  // Ket qua tra cuu doi (VD tu "DVBH loi" sang "tim thay") -> bo tich xac nhan cu, bat chon lai.
  useEffect(() => {
    onOverrideChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup.status]);
  const canCheck = !!caseId.trim() && lookup.status !== "loading";
  // 30/10/2026 (UX mobile KTV, de xuat 6): chon ma case thay vi go tay chuoi ~25 ky tu - goi y tu cac don
  // Odoo chua gui cua dung KTV + nut "Dán". Chon xong tu bam "Kiểm tra".
  const odoo = useOdooChoGui(ktvEmail, !!ktvEmail);
  const goiY = (odoo.don ?? []).filter((d) => d.case_id && d.case_id !== caseId).slice(0, 6);
  const [autoCheck, setAutoCheck] = useState(false);
  useEffect(() => {
    if (autoCheck && caseId.trim()) {
      setAutoCheck(false);
      lookup.check();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, autoCheck]);
  const chon = (v: string) => {
    setCaseId(v.trim());
    onOverrideChange?.(false);
    setAutoCheck(true);
  };
  const dan = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t.trim()) chon(t);
    } catch {
      /* trinh duyet chan quyen doc clipboard - nguoi dung tu dan bang tay */
    }
  };
  return (
    <>
      <Field label={label} required={required}>
        <div className="flex gap-2">
          <Input
            className="flex-1 min-w-[8rem]"
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
          {ktvEmail && !caseId.trim() && typeof navigator !== "undefined" && !!navigator.clipboard?.readText && (
            <Btn variant="secondary" onClick={dan} className="shrink-0 whitespace-nowrap !px-2.5 sm:!px-3" title="Dán mã case vừa sao chép">
              📋<span className="hidden sm:inline"> Dán</span>
            </Btn>
          )}
          <Btn variant={lookup.status === "idle" && caseId.trim() ? "primary" : "secondary"} disabled={!canCheck} onClick={lookup.check} className="shrink-0 whitespace-nowrap">
            {lookup.status === "loading" ? "Đang…" : "🔍 Kiểm tra"}
          </Btn>
        </div>
        {goiY.length > 0 && !caseId.trim() && (
          <div className="mt-1.5">
            <p className="mb-1 text-[11px] font-semibold text-[var(--ink-faint)]">Chọn nhanh từ đơn Odoo của KTV:</p>
            <div className="flex flex-wrap gap-1.5">
              {goiY.map((d) => (
                <button
                  key={d.odoo_id}
                  type="button"
                  onClick={() => chon(d.case_id!)}
                  className="focus-ring max-w-full truncate rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-left text-xs text-[var(--ink-body)] hover:border-[var(--brand-300)]"
                  title={d.case_id || ""}
                >
                  {d.khach_hang || lkLabel(d.ten_linh_kien, d.ma_linh_kien) || d.case_id} · <span className="font-mono text-[var(--ink-faint)]">…{(d.case_id || "").slice(-6)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
