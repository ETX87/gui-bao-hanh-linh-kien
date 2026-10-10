import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, EmptyState } from "../../ui/primitives";
import { Table, StopClick, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, KHACH_LE_KEY, isDoiTacKey, doiTacKeyFromName, doiTacNameFromKey } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import { useClientPage } from "../../hooks/useClientPage";
import type { AppUser, PhieuTra } from "../../lib/types";
import { UserName, displayName } from "../../hooks/useUserNames";

interface SanSangUnit {
  id: string;
  loai_doi_tru: "doi_tra" | "tru_cong_no";
  parent_id: string;
  ktv_key: string;
}

// Man "Tao & quan ly phieu tra bao hanh" (Admin BH) - port dung readyTable/createPhieuTraForUnits() +
// nut "Tu dong gom" da chot 03/09/2026 (van qua Ke toan duyet binh thuong, khong bo qua).

export function AdminPhieuTraScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [sanSang, setSanSang] = useState<SanSangUnit[]>([]);
  const [loadingSanSang, setLoadingSanSang] = useState(true);
  const { items: list, total: listTotal, page: listPage, pageCount: listPageCount, setPage: setListPage, loading: loadingList, reload: reloadList } = usePagedApi<PhieuTra>("/phieu-tra", "phieu_tra");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSanSang = () => api.get<{ don_vi: SanSangUnit[] }>("/phieu-tra/san-sang").then((r) => { setSanSang(r.don_vi); setLoadingSanSang(false); });
  useEffect(() => {
    loadSanSang();
  }, []);

  const afterChange = () => {
    setSelected(new Set());
    loadSanSang();
    reloadList();
    refresh();
  };

  const groups = useMemo(() => {
    const m = new Map<string, SanSangUnit[]>();
    for (const u of sanSang) {
      const key = `${u.ktv_key}::${u.loai_doi_tru}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(u);
    }
    return [...m.entries()];
  }, [sanSang]);
  // 20 nhom (KTV x loai doi tru) moi trang - 05/10/2026.
  const groupPg = useClientPage(groups);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createFromGroup = async (ktvKey: string, loai: "doi_tra" | "tru_cong_no", ids: string[]) => {
    setBusy(true);
    try {
      await api.post("/phieu-tra", { ktv_key: ktvKey, loai_doi_tru: loai, unit_ids: ids });
      toast(`Đã tạo phiếu trả cho ${ktvKey === KHACH_LE_KEY ? "Khách lẻ" : isDoiTacKey(ktvKey) ? `đối tác ${doiTacNameFromKey(ktvKey)}` : displayName(ktvKey)}.`, "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // "Trả xác cho đối tác" (chốt 2026-09-08) - Admin BH gõ tên đối tác, tự sinh 1 khoá ktv_nhan
  // ảo ổn định (xem doiTacKeyFromName trong lib/constants.ts) thay vì email KTV thật. Đây chính
  // là hành động Kho sẽ dùng "Kho xác nhận hộ" sau này (người nhận không phải KTV thật).
  const createForDoiTac = async (loai: "doi_tra" | "tru_cong_no", ids: string[]) => {
    const ten = window.prompt("Tên đối tác nhận trả xác (vd: Công ty ABC):")?.trim();
    if (!ten) return;
    await createFromGroup(doiTacKeyFromName(ten), loai, ids);
  };

  const autoGom = async () => {
    if (!confirm("Tự động gộp phiếu trả cho TẤT CẢ nhân viên đang có đơn sẵn sàng? Mỗi phiếu vẫn cần Admin BH bổ sung mã và gửi duyệt Kế toán như bình thường.")) return;
    setBusy(true);
    try {
      const r = await api.post<{ so_phieu_tao: number; so_phieu_gop_them?: number }>("/phieu-tra/tu-dong-gom");
      const gop = r.so_phieu_gop_them || 0;
      toast(`Đã tạo ${r.so_phieu_tao} phiếu trả mới${gop ? `, gộp thêm vào ${gop} phiếu nháp sẵn có` : ""}.`, "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loadingSanSang && loadingList && sanSang.length === 0 && list.length === 0) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs font-semibold text-[var(--link)]">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <StatusBadge kind="tra" value={r.trang_thai} /> },
    {
      key: "ktv",
      header: "KTV nhận",
      render: (r) =>
        r.ktv_nhan === KHACH_LE_KEY ? (
          <Badge tone="violet">Khách lẻ</Badge>
        ) : isDoiTacKey(r.ktv_nhan) ? (
          <Badge tone="orange">Đối tác: {doiTacNameFromKey(r.ktv_nhan)}</Badge>
        ) : (
          <UserName email={r.ktv_nhan} />
        ),
    },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
  ];

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">Đơn vị sẵn sàng gộp phiếu trả ({sanSang.length})</h3>
          {sanSang.length > 0 && (
            <Btn variant="primary" disabled={busy} onClick={autoGom}>
              ⚡ Tự động gộp phiếu trả cho tất cả nhân viên
            </Btn>
          )}
        </div>
        {groups.length === 0 ? (
          <EmptyState text="Không có đơn vị nào đang chờ gộp." />
        ) : (
          <div className="space-y-1.5">
            {groupPg.pageItems.map(([key, units]) => {
              const [ktvKey, loai] = key.split("::") as [string, "doi_tra" | "tru_cong_no"];
              return (
                <div key={key} className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 flex flex-col md:flex-row md:items-center gap-2">
                  <p className="shrink-0 md:w-64 truncate text-[13px] font-semibold text-[var(--ink)]">
                      {ktvKey === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : isDoiTacKey(ktvKey) ? `Đối tác: ${doiTacNameFromKey(ktvKey)}` : <UserName email={ktvKey} />} · <Badge tone="gray">{LOAI_DOI_TRU_LABELS[loai]}</Badge>
                  </p>
                  <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                    {units.map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 text-xs font-mono bg-[var(--surface-2)] rounded-md px-1.5 py-0.5 cursor-pointer">
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                        {u.id}
                      </label>
                    ))}
                  </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Btn
                        size="sm"
                        variant="ghost"
                        disabled={busy || !units.some((u) => selected.has(u.id))}
                        onClick={() => createForDoiTac(loai, units.filter((u) => selected.has(u.id)).map((u) => u.id))}
                      >
                        Trả cho đối tác…
                      </Btn>
                      <Btn
                        size="sm"
                        variant="primary"
                        disabled={busy || !units.some((u) => selected.has(u.id))}
                        onClick={() => createFromGroup(ktvKey, loai, units.filter((u) => selected.has(u.id)).map((u) => u.id))}
                      >
                        Tạo phiếu trả (mục đã chọn)
                      </Btn>
                    </div>
                </div>
              );
            })}
            <Pagination page={groupPg.page} pageCount={groupPg.pageCount} total={groupPg.total} onChange={groupPg.setPage} />
          </div>
        )}
      </Card>

      <Card className="p-3">
        <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)] mb-2">Danh sách phiếu trả ({listTotal})</h3>
        <Table columns={cols} rows={list} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Chưa có phiếu trả nào." />
        <Pagination page={listPage} pageCount={listPageCount} total={listTotal} onChange={setListPage} />
      </Card>

      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
