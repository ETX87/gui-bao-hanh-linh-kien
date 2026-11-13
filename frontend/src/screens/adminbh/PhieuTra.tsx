import { useEffect, useMemo, useState } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge } from "../../ui/StatusBadge";
import { api, errorMessage } from "../../lib/api";
import { useToast } from "../../ui/Toast";
import { useWorkload } from "../../hooks/useWorkload";
import { usePagedApi } from "../../hooks/usePagedApi";
import { Card, Btn, Badge, Spinner, Input, Select } from "../../ui/primitives";
import { Table, type Column } from "../../ui/Table";
import { Pagination } from "../../ui/Pagination";
import { LOAI_DOI_TRU_LABELS, TRANG_THAI_PHIEU_TRA_LABELS, KHACH_LE_KEY, doiTacKeyFromName } from "../../lib/constants";
import { fmtDate } from "../../lib/format";
import { PhieuTraDetailModal } from "../shared/PhieuTraDetailModal";
import { UnitDetailModal } from "../shared/UnitDetailModal";
import { useClientPage } from "../../hooks/useClientPage";
import type { AppUser, PhieuTra } from "../../lib/types";
import { displayName } from "../../hooks/useUserNames";
import { ReturnUnitTable, UnitFilterBar, useFilteredUnits, nguoiNhanLabel, EMPTY_LOC, type ReturnUnit, type UnitLoc } from "./ReturnUnitTable";

// Man "Tao & quan ly phieu tra bao hanh" (Admin BH).
// Thiet ke lai 19/10/2026 (nguyen van: "o danh sach don cho tra: hien danh sach theo dang list KTV (x123)
// -> don 1 (cac cot lien quan), don 2... co the tich chon 1 don hoac nhieu don de tao phieu tra" + "bo
// sung them cac cong cu filter, tim kiem phu hop"):
//  - Don cho tao phieu tra: bang nhom theo KTV nhan, tich chon tung don / ca nhom / tat ca dang loc,
//    "Tao phieu tra" tu dong tach 1 phieu cho moi to hop (KTV, loai doi tru); bo loc 6 tieu chi.
//  - Danh sach phieu tra: loc trang thai / loai doi tru / nguoi nhan / mien + tim (ma phieu, ma DH, MISA,
//    van don, KTV, ma don vi, case, linh kien) o server.

export function AdminPhieuTraScreen({ user }: { user: AppUser }) {
  const toast = useToast();
  const { refresh } = useWorkload();
  const [sanSang, setSanSang] = useState<ReturnUnit[] | null>(null);
  const [loc, setLoc] = useState<UnitLoc>(EMPTY_LOC);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [openUnit, setOpenUnit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  const loadSanSang = () => api.get<{ don_vi: ReturnUnit[] }>("/phieu-tra/san-sang").then((r) => setSanSang(r.don_vi));
  useEffect(() => {
    loadSanSang();
  }, []);

  const afterChange = () => {
    setSelected(new Set());
    loadSanSang();
    refresh();
  };

  const all = sanSang ?? [];
  const filtered = useFilteredUnits(all, loc);
  // Nhom theo KTV nhan, 20 nhom / trang.
  const groups = useMemo(() => {
    const m = new Map<string, ReturnUnit[]>();
    for (const u of filtered) {
      const k = u.ktv_key || KHACH_LE_KEY;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return [...m.entries()];
  }, [filtered]);
  const groupPg = useClientPage(groups);
  const pageUnits = useMemo(() => groupPg.pageItems.flatMap(([, us]) => us), [groupPg.pageItems]);

  // Bo chon cac don khong con hien thi sau khi doi bo loc.
  useEffect(() => {
    setSelected((s) => {
      const vis = new Set(filtered.map((u) => u.id));
      const n = new Set([...s].filter((id) => vis.has(id)));
      return n.size === s.size ? s : n;
    });
  }, [filtered]);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMany = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

  const selUnits = all.filter((u) => selected.has(u.id));
  const soPhieu = new Set(selUnits.map((u) => `${u.ktv_key}::${u.loai_doi_tru || "doi_tra"}`)).size;
  const soKtv = new Set(selUnits.map((u) => u.ktv_key)).size;

  const taoPhieu = async (ids: string[], doiTacKey?: string) => {
    if (!ids.length) return;
    const us = all.filter((u) => ids.includes(u.id));
    const n = doiTacKey ? new Set(us.map((u) => u.loai_doi_tru || "doi_tra")).size : new Set(us.map((u) => `${u.ktv_key}::${u.loai_doi_tru || "doi_tra"}`)).size;
    if (n > 1 && !confirm(`${ids.length} đơn sẽ được tách thành ${n} phiếu trả (mỗi KTV × loại đối trừ 1 phiếu). Tiếp tục?`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ phieu_tra_ids: string[]; bo_qua: string[] }>("/phieu-tra/tao-nhieu", { unit_ids: ids, doi_tac_key: doiTacKey });
      toast(`Đã tạo ${r.phieu_tra_ids.length} phiếu trả: ${r.phieu_tra_ids.join(", ")}${r.bo_qua.length ? ` · bỏ qua ${r.bo_qua.length} đơn không còn sẵn sàng` : ""}.`, "ok");
      afterChange();
      if (r.phieu_tra_ids.length === 1) setDetailId(r.phieu_tra_ids[0]);
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  // "Tra xac cho doi tac" (chot 2026-09-08) - Admin go ten doi tac, sinh khoa ktv_nhan ao on dinh.
  const taoChoDoiTac = async () => {
    const ten = window.prompt("Tên đối tác nhận trả xác (vd: Công ty ABC):")?.trim();
    if (!ten) return;
    await taoPhieu([...selected], doiTacKeyFromName(ten));
  };

  const autoGom = async () => {
    if (!confirm("Tự động gộp phiếu trả cho TẤT CẢ đơn đang chờ? Mỗi KTV × loại đối trừ 1 phiếu (gộp vào phiếu nháp sẵn có nếu có). Mỗi phiếu vẫn cần bổ sung mã và gửi duyệt Kế toán.")) return;
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

  if (!sanSang) return <Spinner />;

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-[15px] lg:text-sm font-bold text-[var(--ink)]">
            Đơn chờ tạo phiếu trả ({filtered.length}
            {filtered.length !== all.length ? `/${all.length}` : ""} đơn · {groups.length} người nhận)
          </h3>
          {all.length > 0 && (
            <Btn variant="secondary" disabled={busy} onClick={autoGom}>
              ⚡ Tự động gộp tất cả
            </Btn>
          )}
        </div>
        <UnitFilterBar value={loc} onChange={(v) => { setLoc(v); groupPg.setPage(0); }} units={all} />

        {/* Thanh thao tac: chon / tao phieu */}
        <div className={`flex flex-wrap items-center gap-2 mb-2 rounded-lg px-2.5 py-1.5 ${selected.size ? "bg-[var(--brand-50)] border border-[var(--brand-200)]" : ""}`}>
          <Btn size="sm" variant="ghost" disabled={!filtered.length} onClick={() => toggleMany(filtered.map((u) => u.id), true)}>
            ☑ Chọn tất cả đang lọc ({filtered.length})
          </Btn>
          {selected.size > 0 && (
            <>
              <span className="text-sm font-semibold text-[var(--ink)]">
                Đã chọn {selected.size} đơn · {soKtv} người nhận → {soPhieu} phiếu
              </span>
              <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Bỏ chọn
              </Btn>
              <span className="ml-auto flex gap-1.5">
                {/* 13/11/2026: tra xac cho doi tac chuyen sang module rieng "Trả xác linh kiện" (#/tra-xac). */}
                <Btn size="sm" variant="primary" disabled={busy} onClick={() => taoPhieu([...selected])}>
                  ＋ Tạo phiếu trả ({selected.size})
                </Btn>
              </span>
            </>
          )}
        </div>

        {sanSang === null ? (
          <Spinner />
        ) : (
          <>
            <ReturnUnitTable
              units={pageUnits}
              grouped
              selected={selected}
              onToggle={toggle}
              onToggleMany={toggleMany}
              onOpen={(u) => setOpenUnit(u.id)}
              emptyText={all.length ? "Không có đơn nào khớp bộ lọc." : "Không có đơn nào đang chờ tạo phiếu trả."}
              groupAction={(key, us) => {
                const ids = us.filter((u) => selected.has(u.id)).map((u) => u.id);
                const dung = ids.length ? ids : us.map((u) => u.id);
                return (
                  <Btn size="sm" variant="primary" disabled={busy} onClick={() => taoPhieu(dung)} title={`Tạo phiếu trả cho ${key === KHACH_LE_KEY ? "Khách lẻ" : displayName(key)}`}>
                    Tạo phiếu ({dung.length}{ids.length ? " đã chọn" : " đơn"})
                  </Btn>
                );
              }}
            />
            <Pagination page={groupPg.page} pageCount={groupPg.pageCount} total={groupPg.total} onChange={groupPg.setPage} />
          </>
        )}
      </Card>

      <p className="text-xs text-[var(--ink-soft)] px-1">Phiếu vừa tạo nằm ở tab <a className="text-[var(--link)] font-semibold" href="#/phieu-tra?tab=nhap">Nháp</a> — bổ sung mã rồi gửi duyệt Kế toán.</p>

      {detailId && <PhieuTraDetailModal traId={detailId} user={user} onClose={() => setDetailId(null)} onChanged={afterChange} />}
      {openUnit && <UnitDetailModal unitId={openUnit} user={user} onClose={() => setOpenUnit(null)} onChanged={afterChange} />}
    </div>
  );
}
