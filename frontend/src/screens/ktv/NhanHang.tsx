import { useEffect, useState } from "react";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Input, Spinner } from "../../ui/primitives";
import { Pagination } from "../../ui/Pagination";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import { KtvPhieuTraCard, type KtvPhieuTra } from "./KtvCards";
import type { AppUser } from "../../lib/types";

// "Nhận hàng trả" (KTV). 30/10/2026 (ra soat UX mobile KTV, de xuat 5): doi tu bang ma phieu / ma don hang
// sang THE - moi the hien ngay ben trong co nhung mon gi (linh kien + khach) va nut "Đã nhận hàng" /
// "Không nhận được" ngay tren the, khong phai mo bang 9 cot cua Admin. Van phan trang that 20/trang.

export function KtvNhanHangScreen({ user, initialDetailId }: { user: AppUser; initialDetailId?: string }) {
  const { refresh } = useWorkload();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 400);
    return () => clearTimeout(t);
  }, [qInput]);
  const path = `/phieu-tra?trang_thai=da_gui&kem_don=1${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<KtvPhieuTra>(path, "phieu_tra");
  // Link truy cap truc tiep theo ID (2026-09-09, xem lib/deepLink.ts) - mo san chi tiet khi mount.
  const [detailId, setDetailId] = useState<string | null>(initialDetailId ?? null);
  const after = () => {
    reload();
    refresh();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">📬 Hàng đang trả về cho bạn ({total})</h3>
      {(total > 3 || q) && <Input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="🔍 Tìm mã phiếu, vận đơn, linh kiện, case…" />}
      {loading && rows.length === 0 ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-[var(--surface-2)] py-8 text-center text-sm text-[var(--ink-faint)]">{q ? "Không có phiếu nào khớp." : "Chưa có hàng nào đang trả về cho bạn."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {rows.map((r) => (
            <KtvPhieuTraCard key={r.id} pt={r} onDone={after} onOpen={() => setDetailId(r.id)} />
          ))}
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={after} />}
    </div>
  );
}
