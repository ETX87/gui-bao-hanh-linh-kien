import { useEffect, useState } from "react";
import { usePagedApi } from "../../hooks/usePagedApi";
import { useRoute } from "../../router/Router";
import { Card, Badge, Spinner, Input } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { GIAI_DOAN_MAP, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuGuiDetailModal } from "../ktv/PhieuGuiDetailModal";
import { MienBadge } from "../../ui/MienBadge";
import { useLkName } from "../../hooks/useLinhKien";
import { SlaBadge } from "../../ui/SlaBadge";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import type { AppUser } from "../../lib/types";

// 20/10/2026: moi dong la 1 don vi HOAC 1 don cha chua tach (thung chua ve / chua xac nhan SL), kem
// "giai_doan" = buoc thuc te trong toan luong (xem backend/src/routes/traCuu.ts).
interface TraCuuRow {
  id: string;
  parent_id: string;
  loai: "unit" | "parent";
  giai_doan: string;
  trang_thai: string;
  updated_at: string;
  case_id: string | null;
  ma_lk: string | null;
  mo_ta_loi: string | null;
  ten_khach_hang: string | null;
  phieu_gui_id: string | null;
  phieu_tra_id: string | null;
  mien: "MB" | "MN" | null;
  ktv: string | null;
  so_luong: number;
}
import { UserName } from "../../hooks/useUserNames";

// "Tra cuu moi don hang trong pham vi" (Giam sat/View) - THUAN CHI XEM. Phan trang that.
// Phat hien 12 vong ra soat UX: nhan ?trang_thai= tu man Tong quan (bam 1 o dem) -> loc san + hien
// chip "dang loc" bo duoc.

export function QuanLyTraCuuScreen({ user }: { user: AppUser }) {
  const { query, nav } = useRoute();
  const stFilter = query.get("trang_thai") || "";
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (stFilter) params.set("trang_thai", stFilter);
  const qs = params.toString();
  const { items: rows, total, page, pageCount, setPage, loading, reload } = usePagedApi<TraCuuRow>(`/tra-cuu/don-vi${qs ? `?${qs}` : ""}`, "don_vi");
  const { nameOf } = useLkName();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [guiId, setGuiId] = useState<string | null>(null);

  const stLabel = stFilter === "qua_han" ? "Quá hạn SLA 24h" : GIAI_DOAN_MAP[stFilter]?.label || stFilter;

  const cols: Column<TraCuuRow>[] = [
    {
      key: "id",
      header: "ID",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-[var(--link)]">
          {r.id}
          {r.loai === "parent" && r.so_luong > 1 ? <span className="text-[var(--ink-soft)]"> ×{r.so_luong}</span> : null}
        </span>
      ),
    },
    {
      key: "st",
      header: "Giai đoạn",
      render: (r) => {
        const g = GIAI_DOAN_MAP[r.giai_doan];
        return <Badge tone={g?.tone || "gray"}>{g ? `${g.icon} ${g.label}` : r.giai_doan}</Badge>;
      },
    },
    { key: "gui", header: "Thùng / Phiếu trả", render: (r) => <span className="font-mono text-xs">{[r.phieu_gui_id, r.phieu_tra_id].filter(Boolean).join(" · ") || "—"}</span> },
    { key: "mien", header: "Miền", render: (r) => <MienBadge mien={r.mien} short /> },
    { key: "ktv", header: "KTV / Nguồn", render: (r) => (r.ktv && r.ktv !== KHACH_LE_KEY ? <UserName email={r.ktv} /> : <Badge tone="violet">Khách lẻ{r.ten_khach_hang ? ` · ${r.ten_khach_hang}` : ""}</Badge>) },
    { key: "case", header: "Case", render: (r) => <span className="font-mono text-xs">{r.case_id || "—"}</span> },
    { key: "lk", header: "Linh kiện", render: (r) => nameOf(r.ma_lk) },
    { key: "mota", header: "Mô tả lỗi", className: "max-w-[220px] truncate", render: (r) => r.mo_ta_loi },
    { key: "sla", header: "SLA", render: (r) => <SlaBadge since={r.updated_at} /> },
  ];

  if (loading && rows.length === 0) return <Spinner />;

  return (
    <Card className="p-3">
      <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">🔍 Tra cứu mọi đơn — mọi giai đoạn ({total})</h3>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Mã đơn, thùng, phiếu trả, case, KTV, khách, serial, linh kiện…" className="max-w-sm" />
        {stFilter && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--blue-100)] text-[var(--blue-700)] text-xs font-semibold px-2.5 py-1">
            Lọc: {stLabel}
            <button onClick={() => nav("/quanly/tra-cuu")} className="focus-ring hover:text-[var(--blue-800)]" aria-label="Bỏ lọc">
              ✕
            </button>
          </span>
        )}
      </div>
      <Table columns={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => (r.loai === "unit" ? setDetailId(r.id) : r.phieu_gui_id ? setGuiId(r.phieu_gui_id) : undefined)} emptyText="Không tìm thấy đơn nào." />
      <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
      {guiId && <PhieuGuiDetailModal guiId={guiId} onClose={() => setGuiId(null)} onChanged={reload} />}
      {detailId && <UnitDetailModal unitId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={reload} />}
    </Card>
  );
}
