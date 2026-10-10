import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Btn } from "../../ui/primitives";
import type { CaseLookupPreview } from "../../lib/types";
import { CrmLink } from "./CaseLookupPreviewCard";

// "Bằng chứng" case đã lưu san luc tao don (yeu cau 05/09/2026 muc 2: "khi đơn được tạo, các thông
// tin liên quan đến mã yêu cầu sẽ được lưu về hệ thống đơn bảo hành làm bằng chứng") - CHI doc cache
// (case_lookup_snapshot, GET /case-lookup/detail/:id), KHONG tu goi lai API doi tac moi lan mo xem
// (dung tinh than "tránh việc phải gọi API liên tục cho 1 ca sự cố mỗi khi có người xem thông tin").
// Admin bảo hành bam "Đồng bộ lại" khi can lam moi (POST .../sync, gioi han 5s/lan chan spam).

export function CaseSnapshotPanel({ caseId, canSync }: { caseId: string; canSync: boolean }) {
  const toast = useToast();
  const [data, setData] = useState<CaseLookupPreview | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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
  const rows: [string, string | null | undefined][] = data
    ? [
        ["Khách hàng", data.khach_hang],
        ["Sản phẩm", data.san_pham_bao_hanh],
        ["Serial", data.seri_san_pham],
        ["Ngày mua", data.ngay_mua],
        ["Hãng", data.hang],
        ["KTV trên case", data.ky_thuat_vien],
      ]
    : [];

  // Gon (10/10/2026): tieu de 1 dong + luoi nhan/gia tri chi hien truong co du lieu.
  return (
    <section className="rounded-xl border border-[var(--line)] px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-xs font-bold text-[var(--accent-ink)] uppercase tracking-wide">📎 Thông tin case</p>
        <span className="text-[11px] text-[var(--ink-faint)] truncate">{data ? `đồng bộ lúc ${syncedAt || "—"}` : "chưa lưu bằng chứng"}</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {data && <CrmLink url={data.link_crm} />}
          {canSync && (
            <Btn size="sm" onClick={sync} disabled={syncing}>
              {syncing ? "Đang đồng bộ…" : "🔄 Đồng bộ"}
            </Btn>
          )}
        </div>
      </div>
      {data && (
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[13px]">
          {rows
            .filter(([, v]) => !!v)
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] text-[var(--ink-faint)]">{k}</dt>
                <dd className="truncate text-[var(--ink)]" title={v ?? ""}>{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </section>
  );
}
