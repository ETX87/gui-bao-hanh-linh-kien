import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { Card, Btn, Badge, Spinner, EmptyState } from "../../ui/primitives";
import { Table, StopClick, type Column } from "../../ui/Table";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, KHACH_LE_KEY } from "../../lib/constants";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import type { AppUser, PhieuTra } from "../../lib/types";

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
  const [list, setList] = useState<PhieuTra[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([api.get<{ don_vi: SanSangUnit[] }>("/phieu-tra/san-sang"), api.get<{ phieu_tra: PhieuTra[] }>("/phieu-tra")]);
    setSanSang(s.don_vi);
    setList(l.phieu_tra);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const afterChange = () => {
    setSelected(new Set());
    load();
    refresh();
  };

  const groups = useMemo(() => {
    const m = new Map<string, SanSangUnit[]>();
    for (const u of sanSang) {
      const key = `${u.ktv_key}::${u.loai_doi_tru}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(u);
    }
    return m;
  }, [sanSang]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const createFromGroup = async (ktvKey: string, loai: "doi_tra" | "tru_cong_no", ids: string[]) => {
    setBusy(true);
    try {
      await api.post("/phieu-tra", { ktv_key: ktvKey, loai_doi_tru: loai, unit_ids: ids });
      toast(`Đã tạo phiếu trả cho ${ktvKey === KHACH_LE_KEY ? "Khách lẻ" : ktvKey}.`, "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const autoGom = async () => {
    if (!confirm("Tự động gộp phiếu trả cho TẤT CẢ nhân viên đang có đơn sẵn sàng? Mỗi phiếu vẫn cần Admin BH bổ sung mã và gửi duyệt Kế toán như bình thường.")) return;
    setBusy(true);
    try {
      const r = await api.post<{ so_phieu_tao: number }>("/phieu-tra/tu-dong-gom");
      toast(`Đã tạo ${r.so_phieu_tao} phiếu trả.`, "ok");
      afterChange();
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  const cols: Column<PhieuTra>[] = [
    { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "st", header: "Trạng thái", render: (r) => <Badge tone="blue">{TRANG_THAI_PHIEU_TRA_LABELS[r.trang_thai] || r.trang_thai}</Badge> },
    { key: "ktv", header: "KTV nhận", render: (r) => (r.ktv_nhan === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : r.ktv_nhan) },
    { key: "loai", header: "Loại đối trừ", render: (r) => LOAI_DOI_TRU_LABELS[r.loai_doi_tru] },
    { key: "madh", header: "Mã đơn hàng", render: (r) => r.ma_don_hang || "—" },
    { key: "misa", header: "Mã MISA", render: (r) => r.ma_misa || "—" },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-[var(--ink-900)]">Đơn vị sẵn sàng gộp phiếu trả ({sanSang.length})</h3>
          {sanSang.length > 0 && (
            <Btn variant="primary" disabled={busy} onClick={autoGom}>
              ⚡ Tự động gộp phiếu trả cho tất cả nhân viên
            </Btn>
          )}
        </div>
        {groups.size === 0 ? (
          <EmptyState text="Không có đơn vị nào đang chờ gộp." />
        ) : (
          <div className="space-y-3">
            {[...groups.entries()].map(([key, units]) => {
              const [ktvKey, loai] = key.split("::") as [string, "doi_tra" | "tru_cong_no"];
              return (
                <div key={key} className="rounded-lg border border-[var(--line)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--ink-900)]">
                      {ktvKey === KHACH_LE_KEY ? <Badge tone="violet">Khách lẻ</Badge> : ktvKey} · <Badge tone="gray">{LOAI_DOI_TRU_LABELS[loai]}</Badge>
                    </p>
                    <Btn
                      variant="primary"
                      disabled={busy || !units.some((u) => selected.has(u.id))}
                      onClick={() => createFromGroup(ktvKey, loai, units.filter((u) => selected.has(u.id)).map((u) => u.id))}
                    >
                      Tạo phiếu trả với mục đã chọn
                    </Btn>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {units.map((u) => (
                      <label key={u.id} className="flex items-center gap-1.5 text-xs font-mono bg-[var(--surface-100)] rounded-lg px-2 py-1 cursor-pointer">
                        <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                        {u.id}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-[var(--ink-900)] mb-3">Danh sách phiếu trả ({list.length})</h3>
        <Table columns={cols} rows={list} rowKey={(r) => r.id} onRowClick={(r) => setDetailId(r.id)} emptyText="Chưa có phiếu trả nào." />
      </Card>

      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
    </div>
  );
}
