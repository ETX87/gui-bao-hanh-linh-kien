import { useEffect, useState, type ReactNode } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Btn } from "../../ui/primitives";
import type { CaseLookupPreview } from "../../lib/types";
import { CrmLink } from "./CaseLookupPreviewCard";
import { CopyBtn } from "../../ui/DetailParts";
import { computeWarranty } from "../../lib/warranty";
import { fmtDate } from "../../lib/format";

// "Bằng chứng" case đã lưu san luc tao don (yeu cau 05/09/2026 muc 2: "khi đơn được tạo, các thông
// tin liên quan đến mã yêu cầu sẽ được lưu về hệ thống đơn bảo hành làm bằng chứng") - CHI doc cache
// (case_lookup_snapshot, GET /case-lookup/detail/:id), KHONG tu goi lai API doi tac moi lan mo xem
// (dung tinh than "tránh việc phải gọi API liên tục cho 1 ca sự cố mỗi khi có người xem thông tin").
// Admin bảo hành bam "Đồng bộ lại" khi can lam moi (POST .../sync, gioi han 5s/lan chan spam).

export function CaseSnapshotPanel({ caseId, canSync, soThangBh }: { caseId: string; canSync: boolean; soThangBh?: number | null }) {
  const toast = useToast();
  const [data, setData] = useState<CaseLookupPreview | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get<{ found: boolean; data: CaseLookupPreview | null; synced_at: string | null }>(`/case-lookup/detail/${encodeURIComponent(caseId)}`)
      .then((r) => {
        setData(r.data);
        setSyncedAt(r.synced_at);
      })
      .finally(() => setLoading(false));
  }, [caseId]);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await api.post<{ found: boolean; data: CaseLookupPreview | null; synced_at: string | null; sync_failed?: boolean }>(`/case-lookup/detail/${encodeURIComponent(caseId)}/sync`);
      setData(r.data);
      setSyncedAt(r.synced_at);
      toast(r.sync_failed ? "Không đồng bộ được lúc này (giữ nguyên bằng chứng cũ)." : "Đã đồng bộ lại thông tin case.", r.sync_failed ? "error" : "ok");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return null;
  // 11/10/2026 (UI chi tiet "tat ca trong mot"): 6 truong chinh + han bao hanh tinh san, "Xem them" mo cac
  // truong phu. KHONG hien doanh thu (chot: muon xem thi bam "Xem tren CRM").
  const w = data ? computeWarranty(data.ngay_mua, soThangBh, data.thoi_gian_cskh_tiep_nhan) : null;
  const diaBan = data ? [data.quan_huyen, data.tinh].filter(Boolean).join(", ") : "";
  const chinh: [string, ReactNode][] = data
    ? [
        ["Khách hàng", data.khach_hang],
        ["Sản phẩm", data.san_pham_bao_hanh],
        ["Serial", data.seri_san_pham ? <span className="inline-flex items-center gap-0.5">{data.seri_san_pham}<CopyBtn text={data.seri_san_pham} title="Sao chép serial" /></span> : null],
        ["Ngày mua", data.ngay_mua],
        [
          "Hạn bảo hành",
          w?.known ? <span className={w.expired ? "font-bold text-[var(--red-700)]" : "text-[var(--green-700)]"}>{w.limitDate} · {w.expired ? "hết hạn" : "còn hạn"} ({w.months}th)</span> : null,
        ],
        ["Địa bàn", diaBan || data.khu_vuc],
        ["Hãng", data.hang],
        ["KTV trên case", data.ky_thuat_vien],
      ]
    : [];
  const phu: [string, ReactNode][] = data
    ? [
        ["Khu vực", data.khu_vuc],
        ["Nhóm sản phẩm", data.nhom_san_pham],
        ["Nhóm yêu cầu", data.nhom_yeu_cau],
        ["Loại yêu cầu", data.loai_yeu_cau],
        ["Hình thức BH", data.hinh_thuc_bao_hanh],
        ["Đối tác", data.doi_tac],
        ["CSKH tiếp nhận", data.thoi_gian_cskh_tiep_nhan],
        ["Hẹn xử lý", data.thoi_gian_hen_xu_ly],
        ["Hoàn thành", data.thoi_gian_hoan_thanh],
        ["Tiến độ", data.tien_do_hoan_thanh],
        ["Lý do quá hạn", data.ly_do_qua_han],
        ["Mô tả lỗi (CRM)", data.mo_ta_loi],
        ["Lưu ý lỗi linh kiện", data.luu_y_loi_linh_kien],
        ["Cách thức xử lý", data.cach_thuc_xu_ly],
        ["Nội dung xử lý", data.noi_dung_xu_ly],
      ]
    : [];
  const phuCo = phu.filter(([, v]) => !!v);
  const kv = (rows: [string, ReactNode][]) =>
    rows
      .filter(([, v]) => !!v)
      .map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] text-[var(--ink-faint)]">{k}</dt>
          <dd className="truncate text-[var(--ink)]" title={typeof v === "string" ? v : undefined}>{v}</dd>
        </div>
      ));

  return (
    <section className="rounded-xl border border-[var(--line)] px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-wide shrink-0">📎 Khách hàng & case</p>
        <span className="select-all rounded-md border border-[var(--brand-200,#bbf7d0)] bg-[var(--brand-50,#f0fdf4)] px-2 py-0.5 font-mono text-[15px] font-bold tracking-wide text-[var(--accent-ink)] truncate" title="Mã case">{caseId}</span>
        <CopyBtn text={caseId} title="Sao chép mã case" />
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {data && <CrmLink url={data.link_crm} />}
          {canSync && (
            <Btn size="sm" onClick={sync} disabled={syncing}>
              {syncing ? "Đang đồng bộ…" : "🔄 Đồng bộ"}
            </Btn>
          )}
        </div>
      </div>
      {!data && <p className="text-[12px] text-[var(--ink-faint)]">Chưa lưu bằng chứng case — bấm "Đồng bộ" để lấy từ hệ thống DVBH.</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[13px]">{kv(chinh)}</dl>
          {more && phuCo.length > 0 && <dl className="mt-1.5 pt-1.5 border-t border-dashed border-[var(--line)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[13px]">{kv(phuCo)}</dl>}
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--ink-faint)]">
            <span>Bằng chứng lưu lúc {syncedAt ? fmtDate(syncedAt) : "—"}</span>
            {phuCo.length > 0 && (
              <button className="font-semibold text-[var(--link)] hover:underline" onClick={() => setMore((x) => !x)}>
                {more ? "Thu gọn" : `Xem thêm ${phuCo.length} trường`}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
