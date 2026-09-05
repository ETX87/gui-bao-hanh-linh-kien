import { useEffect, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { Btn } from "../../ui/primitives";
import type { CaseLookupPreview } from "../../lib/types";

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
  if (!data) return <p className="text-xs text-[var(--ink-400)]">Chưa có bằng chứng case nào được lưu.</p>;

  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-100)] px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--ocean-700)] uppercase tracking-wide">📎 Bằng chứng case (đồng bộ lúc {syncedAt || "—"})</p>
        {canSync && (
          <Btn onClick={sync} disabled={syncing}>
            {syncing ? "Đang đồng bộ…" : "🔄 Đồng bộ lại"}
          </Btn>
        )}
      </div>
      <div className="text-xs text-[var(--ink-700)] grid grid-cols-2 gap-x-3 gap-y-0.5">
        {data.khach_hang && <span>Khách hàng: {data.khach_hang}</span>}
        {data.san_pham_bao_hanh && <span>Sản phẩm: {data.san_pham_bao_hanh}</span>}
        {data.seri_san_pham && <span>Serial: {data.seri_san_pham}</span>}
        {data.ngay_mua && <span>Ngày mua: {data.ngay_mua}</span>}
        {data.hang && <span>Hãng: {data.hang}</span>}
        {data.ky_thuat_vien && <span>Kỹ thuật viên (case): {data.ky_thuat_vien}</span>}
      </div>
    </div>
  );
}
