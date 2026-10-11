import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { MienBadge } from "../../ui/MienBadge";
import { StatusBadge, UNIT_STATUS } from "../../ui/StatusBadge";
import { Badge, Btn } from "../../ui/primitives";
import { SlaBadge } from "../../ui/SlaBadge";
import { useLinhKien, lkLabel } from "../../hooks/useLinhKien";
import { useAdminCols, ADMIN_COLS_DEF, type AdminColKey } from "../../hooks/useAdminCols";
import { TRANG_THAI_UNIT_LABELS, LOAI_DOI_TRU_LABELS, HUONG_XU_LY_LABELS, formatLyDoBoSung } from "../../lib/constants";
import { AdminColSettingsModal } from "./AdminColSettingsModal";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { DonCha, DonVi } from "../../lib/types";
import { UserName } from "../../hooks/useUserNames";

// "Bang thong nhat" Admin BH - port dung renderAdminUnifiedTable() cua prototype: 1 bang GOP ca don
// cha (dang cho_xac_nhan_so_luong) LAN don vi (dang can xu ly) lam 1, cot tuy bien duoc (bat/tat, keo
// doi vi tri, keo doi do rong - xem hooks/useAdminCols.ts), chon nhieu dong (checkbox) de phan loai
// hang loat. Giai doan 4 truoc day tach rieng 2 bang + 8 cot co dinh - port lai day du theo dung yeu
// cau QA 04/09/2026 "so sanh voi giao dien da xay dung tren ban prototype".
//
// KHONG co "Tinh trang BH" (canh bao het han bao hanh) thuc su tinh duoc - can du lieu case CRM qua
// case-lookup client (Giai doan 5, CHUA viet - xem CLAUDE.md) - cot nay tam hien "—" cho moi dong,
// ghi ro trong code de khong nham la da lam xong.

interface Props {
  parents: DonCha[];
  units: DonVi[];
  selected: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  // Chon / bo chon TAT CA don vi dang hien thi (09/10/2026).
  onToggleAll: (ids: string[], checked: boolean) => void;
  onOpenXacNhanSl: (p: DonCha) => void;
  onOpenDetail: (unitId: string) => void;
  onOpenPhanLoai: (unit: DonVi) => void;
  onOpenFast: (unit: DonVi) => void;
  onOpenBoSung: (parentId: string) => void;
  onOpenBaoCaoSai: (parentId: string) => void;
}

function Ellipsis({ text, title }: { text: ReactNode; title?: string }) {
  return (
    <span className="block max-w-[220px] truncate" title={title}>
      {text}
    </span>
  );
}

export function AdminUnifiedTable({ parents, units, selected, onToggleSelect, onToggleAll, onOpenXacNhanSl, onOpenDetail, onOpenPhanLoai, onOpenFast, onOpenBoSung, onOpenBaoCaoSai }: Props) {
  const { items: linhKienList } = useLinhKien();
  const lkName = (ma: string | null | undefined) => (ma ? lkLabel(linhKienList.find((lk) => lk.ma_lk === ma)?.ten_lk, ma) : "Cả sản phẩm");
  const phanLoai = (ma: string | null | undefined): ReactNode => {
    const v = ma ? linhKienList.find((lk) => lk.ma_lk === ma)?.don_vi?.trim() : "";
    return v ? <Badge tone="gray">{v}</Badge> : <span className="text-[var(--ink-faint)]">—</span>;
  };
  const { order, hidden, visibleCols, colWidth, reorder, toggleHidden, commitWidth, reset } = useAdminCols();
  const [colSettingsOpen, setColSettingsOpen] = useState(false);
  const isMobile = useIsMobile();

  // --- Keo doi vi tri cot (HTML5 drag-and-drop thuan).
  const dragKeyRef = useRef<AdminColKey | null>(null);
  const [dragOverKey, setDragOverKey] = useState<AdminColKey | null>(null);
  const onColDrop = (targetKey: AdminColKey) => {
    setDragOverKey(null);
    const fromKey = dragKeyRef.current;
    dragKeyRef.current = null;
    if (fromKey) reorder(fromKey, targetKey);
  };

  // --- Keo doi do rong: cap nhat truc tiep DOM (<col>) trong luc keo cho muot, chi commit vao state +
  // localStorage luc tha chuot (mouseup) - dung ref toi <table> thay vi render lai lien tuc theo tung
  // pixel di chuyen.
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeRef = useRef<{ key: AdminColKey; startX: number; startWidth: number; current: number } | null>(null);
  const onResizeMove = (e: MouseEvent) => {
    const r = resizeRef.current;
    if (!r || !tableRef.current) return;
    const delta = e.clientX - r.startX;
    const newWidth = Math.max(60, Math.round(r.startWidth + delta));
    const idx = visibleCols.indexOf(r.key);
    const cols = tableRef.current.querySelectorAll("colgroup col");
    const col = cols[idx + 3] as HTMLElement | undefined; // +3: bo qua checkbox + ID + Hanh dong
    if (col) col.style.width = `${newWidth}px`;
    r.current = newWidth;
  };
  const onResizeEnd = () => {
    const r = resizeRef.current;
    if (r) commitWidth(r.key, r.current || r.startWidth);
    resizeRef.current = null;
    document.removeEventListener("mousemove", onResizeMove);
    document.removeEventListener("mouseup", onResizeEnd);
  };
  const onResizeStart = (e: React.MouseEvent, key: AdminColKey) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest("th");
    resizeRef.current = { key, startX: e.clientX, startWidth: th?.getBoundingClientRect().width || colWidth(key), current: colWidth(key) };
    document.addEventListener("mousemove", onResizeMove);
    document.addEventListener("mouseup", onResizeEnd);
  };

  // --- Gia tri tung o du lieu theo dung 12 key cua ADMIN_COLS_DEF, khop chinh xac
  // adminParentRowFields()/adminUnitRowFields() cua prototype.
  const parentFields = (p: DonCha): Record<AdminColKey, ReactNode> => ({
    trangthai: <Badge tone="amber" dot>Chờ xác nhận SL (khai {p.so_luong_khai})</Badge>,
    nguon: (
      <Ellipsis
        text={
          <>
            <UserName email={p.ktv} /> <span className="text-[var(--ink-faint)]">· {p.phieu_gui_id}</span>
          </>
        }
        title={`${p.ktv || ""} · ${p.phieu_gui_id}`}
      />
    ),
    mien: <MienBadge mien={p.mien} short />,
    khachhang: <Ellipsis text="—" />,
    linhkien: <Ellipsis text={lkName(p.ma_lk)} title={lkName(p.ma_lk)} />,
    phanloai: phanLoai(p.ma_lk),
    mota: <Ellipsis text={p.mo_ta_loi} title={p.mo_ta_loi || ""} />,
    sla: <SlaBadge since={p.created_at} entityType="phieu_sc" entityId={p.id} clickable />,
    sdt: "—",
    donchacode: <span className="text-[var(--ink-soft)] font-mono text-xs">{p.id}</span>,
    phieuguicode: <span className="text-[var(--ink-soft)] font-mono text-xs">{p.phieu_gui_id || "—"}</span>,
    doitru: p.loai_doi_tru_de_xuat ? LOAI_DOI_TRU_LABELS[p.loai_doi_tru_de_xuat] : "—",
    huongxuly: <span className="text-[var(--ink-soft)]">Chưa phân loại</span>,
    baohanh: <span className="text-[var(--ink-soft)]">—</span>,
  });

  const unitFields = (u: DonVi): Record<AdminColKey, ReactNode> => {
    const isKhachLe = !u.phieu_gui_id;
    const effLk = u.ma_lk_thuc_te || u.ma_lk;
    const daDoiLk = !!(u.ma_lk_thuc_te && u.ma_lk_thuc_te !== u.ma_lk);
    return {
      trangthai: <StatusBadge kind="unit" value={u.trang_thai} />,
      nguon: isKhachLe ? (
        <Badge tone="violet">Khách lẻ</Badge>
      ) : (
        <Ellipsis
          text={
            <>
              <UserName email={u.ktv} /> <span className="text-[var(--ink-faint)]">· {u.phieu_gui_id}</span>
            </>
          }
          title={`${u.ktv || ""} · ${u.phieu_gui_id}`}
        />
      ),
      mien: <MienBadge mien={u.mien} short />,
      khachhang: <Ellipsis text={u.nguon_tao === "admin_dich_vu" ? u.ten_khach_hang || "—" : "—"} />,
      linhkien: (
        <Ellipsis
          text={
            <>
              {lkName(effLk)} {daDoiLk && <Badge tone="blue" className="ml-1">Đã đổi LK</Badge>}
            </>
          }
          title={lkName(effLk)}
        />
      ),
      phanloai: phanLoai(effLk),
      mota: <Ellipsis text={u.mo_ta_loi} title={u.mo_ta_loi || ""} />,
      sla: <SlaBadge since={u.updated_at} entityType="phieu_sc_ct" entityId={u.id} clickable />,
      sdt: u.nguon_tao === "admin_dich_vu" ? u.sdt_khach_hang || "—" : "—",
      donchacode: <span className="text-[var(--ink-soft)] font-mono text-xs">{u.parent_id}</span>,
      phieuguicode: <span className="text-[var(--ink-soft)] font-mono text-xs">{u.phieu_gui_id || "—"}</span>,
      doitru: u.loai_doi_tru || u.loai_doi_tru_de_xuat ? LOAI_DOI_TRU_LABELS[(u.loai_doi_tru || u.loai_doi_tru_de_xuat)!] : "—",
      huongxuly: u.huong_xu_ly ? HUONG_XU_LY_LABELS[u.huong_xu_ly] : <span className="text-[var(--ink-soft)]">Chưa phân loại</span>,
      baohanh: <span className="text-[var(--ink-soft)]">—</span>,
    };
  };

  // --- Gop don vi theo don cha (Phat hien 14 vong ra soat UX): 1 lo 25 linh kien cung don cha =>
  // 1 dong thu gon "x25" + tom tat trang thai, bam de so ra tung don vi. Nhom co 1 don vi thi hien
  // truc tiep khong boc.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const m = new Map<string, DonVi[]>();
    for (const u of units) {
      const arr = m.get(u.parent_id) || [];
      arr.push(u);
      m.set(u.parent_id, arr);
    }
    return [...m.entries()];
  }, [units]);
  const toggleExpand = (pid: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(pid) ? n.delete(pid) : n.add(pid);
      return n;
    });
  const selectableInGroup = (list: DonVi[]) => list.filter((u) => u.trang_thai !== "cho_bo_sung_tt");
  const groupAllSelected = (list: DonVi[]) => {
    const sel = selectableInGroup(list);
    return sel.length > 0 && sel.every((u) => selected.has(u.id));
  };
  const toggleGroup = (list: DonVi[], checked: boolean) => selectableInGroup(list).forEach((u) => onToggleSelect(u.id, checked));
  const groupStatusSummary = (list: DonVi[]): ReactNode => {
    const by: Record<string, number> = {};
    for (const u of list) by[u.trang_thai] = (by[u.trang_thai] || 0) + 1;
    return (
      <span className="flex flex-nowrap gap-1 overflow-hidden" title={Object.entries(by).map(([st, n]) => `${n} ${TRANG_THAI_UNIT_LABELS[st] || st}`).join(", ")}>
        {Object.entries(by).map(([st, n]) => (
          <Badge key={st} tone={UNIT_STATUS[st]?.tone || "gray"} dot={UNIT_STATUS[st]?.dot}>
            {n} {TRANG_THAI_UNIT_LABELS[st] || st}
          </Badge>
        ))}
      </span>
    );
  };
  const groupWorstSla = (list: DonVi[]) => list.reduce((a, b) => (a.updated_at < b.updated_at ? a : b)).updated_at;

  const renderUnitRow = (u: DonVi, indented: boolean) => {
    const f = unitFields(u);
    const isKhachLe = !u.phieu_gui_id;
    const isBoSung = u.trang_thai === "cho_bo_sung_tt";
    return (
      <tr key={u.id} onClick={() => onOpenDetail(u.id)} className="border-b border-[var(--line)] last:border-0 cursor-pointer hover:bg-[var(--accent-soft)] transition-colors">
        <td className="" onClick={(e) => e.stopPropagation()}>
          {!isBoSung && <input type="checkbox" checked={selected.has(u.id)} onChange={(e) => onToggleSelect(u.id, e.target.checked)} />}
        </td>
        <td className={`font-semibold font-mono text-xs text-[var(--link)] ${indented ? "!pl-8" : ""}`}>
          {u.id}
          {u.trang_thai === "admin_can_xem_lai" && (
            <Badge tone="red" className="ml-1.5">
              NV trả lại
            </Badge>
          )}
        </td>
        <td className="" onClick={(e) => e.stopPropagation()}>
          {isBoSung ? (
            <span className="block truncate max-w-[230px] text-xs text-[var(--ink-soft)]" title={formatLyDoBoSung(u.ly_do_bo_sung)}>Lý do: {formatLyDoBoSung(u.ly_do_bo_sung)}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <Btn onClick={() => onOpenFast(u)} title="Các phương án phổ biến có sẵn, tự động điền thông tin">
                ⚡
              </Btn>
              <Btn variant="primary" onClick={() => onOpenPhanLoai(u)}>
                {u.trang_thai === "admin_can_xem_lai" ? "Phân loại lại" : "Phân loại"}
              </Btn>
              {!isKhachLe && (
                <>
                  {u.trang_thai === "cho_phan_loai" && (
                    <Btn onClick={() => onOpenBoSung(u.parent_id)} title="Yêu cầu KTV bổ sung thông tin">
                      Bổ sung
                    </Btn>
                  )}
                  <Btn onClick={() => onOpenBaoCaoSai(u.parent_id)} title="Ghi nhận KTV báo cáo sai thông tin">
                    🐞
                  </Btn>
                </>
              )}
            </div>
          )}
        </td>
        {visibleCols.map((k) => (
          <td key={k} className="align-middle">
            {f[k]}
          </td>
        ))}
      </tr>
    );
  };

  // --- Mobile (DESIGN_SYSTEM.md §6.5 "co bang -> co phuong an the"): moi don cha cho xac nhan SL / don
  // vi / nhom xN la 1 THE; giu nguyen gop nhom, chon hang loat va nut thao tac nhu bang desktop.
  // Tuy bien cot chi co y nghia tren bang desktop nen an o day.
  const unitActions = (u: DonVi) => {
    const isKhachLe = !u.phieu_gui_id;
    if (u.trang_thai === "cho_bo_sung_tt") return <p className="text-xs text-[var(--ink-soft)]">Lý do: {formatLyDoBoSung(u.ly_do_bo_sung)}</p>;
    return (
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={() => onOpenPhanLoai(u)}>
          {u.trang_thai === "admin_can_xem_lai" ? "Phân loại lại" : "Phân loại"}
        </Btn>
        <Btn onClick={() => onOpenFast(u)}>⚡ Xử lý nhanh</Btn>
        {!isKhachLe && u.trang_thai === "cho_phan_loai" && <Btn onClick={() => onOpenBoSung(u.parent_id)}>Yêu cầu bổ sung</Btn>}
        {!isKhachLe && (
          <Btn onClick={() => onOpenBaoCaoSai(u.parent_id)} title="Ghi nhận KTV báo cáo sai thông tin">
            🐞
          </Btn>
        )}
      </div>
    );
  };
  const unitCard = (u: DonVi, nested: boolean) => {
    const f = unitFields(u);
    return (
      <div key={u.id} onClick={() => onOpenDetail(u.id)} className={`rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5 ${nested ? "" : "shadow-card"} active:bg-[var(--accent-soft)]`}>
        <div className="flex items-start gap-2.5">
          {u.trang_thai !== "cho_bo_sung_tt" && (
            <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
              <input type="checkbox" className="w-5 h-5" checked={selected.has(u.id)} onChange={(e) => onToggleSelect(u.id, e.target.checked)} />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{u.id}</span>
              {f.trangthai}
              <span className="ml-auto">{f.sla}</span>
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">{f.linhkien}</p>
            <div className="flex flex-wrap gap-1">{f.phanloai}{f.mien}</div>
            {u.mo_ta_loi && <p className="text-sm text-[var(--ink-body)] line-clamp-2">{u.mo_ta_loi}</p>}
            <div className="text-xs text-[var(--ink-soft)]">{f.nguon}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--line)]" onClick={(e) => e.stopPropagation()}>
          {unitActions(u)}
        </div>
      </div>
    );
  };
  const renderMobile = () => (
    <div className="space-y-2.5">
      {parents.map((p) => {
        const f = parentFields(p);
        return (
          <div key={p.id} onClick={() => onOpenXacNhanSl(p)} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-card p-3.5 space-y-1.5 active:bg-[var(--accent-soft)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-[var(--link)]">{p.id}</span>
              {f.trangthai}
              <span className="ml-auto">{f.sla}</span>
            </div>
            <p className="text-sm font-semibold text-[var(--ink)]">{lkName(p.ma_lk)}</p>
            {p.mo_ta_loi && <p className="text-sm text-[var(--ink-body)] line-clamp-2">{p.mo_ta_loi}</p>}
            <div className="text-xs text-[var(--ink-soft)]">{f.nguon}</div>
            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
              <Btn variant="primary" onClick={() => onOpenXacNhanSl(p)}>
                Xác nhận số lượng
              </Btn>
            </div>
          </div>
        );
      })}
      {groups.map(([pid, list]) => {
        if (list.length < 2) return unitCard(list[0], false);
        const isOpen = expanded.has(pid);
        return (
          <div key={`g-${pid}`} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] shadow-card">
            <div onClick={() => toggleExpand(pid)} className="p-3.5 flex items-start gap-2.5 cursor-pointer">
              <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
                <input
                  type="checkbox"
                  className="w-5 h-5"
                  checked={groupAllSelected(list)}
                  ref={(el) => {
                    if (el) el.indeterminate = !groupAllSelected(list) && selectableInGroup(list).some((u) => selected.has(u.id));
                  }}
                  onChange={(e) => toggleGroup(list, e.target.checked)}
                />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs font-semibold text-[var(--link)]">{pid}</span>
                  <Badge tone="gray">×{list.length}</Badge>
                  <span className="ml-auto">
                    <SlaBadge since={groupWorstSla(list)} />
                  </span>
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">{lkName(list[0].ma_lk_thuc_te || list[0].ma_lk)}</p>
                {groupStatusSummary(list)}
                <p className="text-xs font-semibold text-[var(--accent-ink)]">{isOpen ? "▾ Thu gọn" : `▸ Mở ${list.length} đơn vị`}</p>
              </div>
            </div>
            {isOpen && <div className="px-2.5 pb-2.5 space-y-2">{list.map((u) => unitCard(u, true))}</div>}
          </div>
        );
      })}
    </div>
  );

  const totalRows = parents.length + units.length;
  const visibleSelectable = units.filter((u) => u.trang_thai !== "cho_bo_sung_tt").map((u) => u.id);
  const allVisibleSelected = visibleSelectable.length > 0 && visibleSelectable.every((id) => selected.has(id));

  return (
    <div>
      {isMobile && (
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {visibleSelectable.length > 0 && (
          <label className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm font-semibold text-[var(--ink-body)] cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && visibleSelectable.some((id) => selected.has(id));
              }}
              onChange={(e) => onToggleAll(visibleSelectable, e.target.checked)}
            />
            Chọn tất cả {visibleSelectable.length} đơn vị đang hiển thị
          </label>
        )}
      </div>
      )}

      {totalRows === 0 ? (
        <p className="text-center py-10 text-sm text-[var(--ink-faint)]">Không có đơn nào cần xử lý ngay lúc này.</p>
      ) : isMobile ? (
        renderMobile()
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] scrollbar-thin">
          <table ref={tableRef} className="tbl whitespace-nowrap" style={{ tableLayout: "fixed", width: "max-content" }}>
            <colgroup>
              <col style={{ width: 36 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 255 }} />
              {visibleCols.map((k) => (
                <col key={k} style={{ width: colWidth(k) }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--line)]">
                <th className="">
                  <input
                    type="checkbox"
                    title="Chọn tất cả đơn vị đang hiển thị"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && visibleSelectable.some((id) => selected.has(id));
                    }}
                    onChange={(e) => onToggleAll(visibleSelectable, e.target.checked)}
                  />
                </th>
                <th className="text-left font-semibold text-[var(--ink-soft)] text-xs">ID</th>
                <th className="text-left font-semibold text-[var(--ink-soft)] text-xs">
                  <span className="flex items-center justify-between gap-2">
                    Hành động
                    <button type="button" onClick={() => setColSettingsOpen(true)} title="Tuỳ chỉnh cột: bật/tắt, đổi vị trí, đổi độ rộng" className="rounded px-1.5 font-semibold text-[var(--ink-soft)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)]">
                      ⚙ Cột
                    </button>
                  </span>
                </th>
                {visibleCols.map((k) => (
                  <th
                    key={k}
                    draggable
                    title="Kéo để đổi vị trí"
                    onDragStart={() => (dragKeyRef.current = k)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setDragOverKey(k)}
                    onDragLeave={() => setDragOverKey((cur) => (cur === k ? null : cur))}
                    onDrop={() => onColDrop(k)}
                    className={`relative text-left font-semibold text-[var(--ink-soft)] text-xs cursor-move select-none ${dragOverKey === k ? "bg-[var(--accent-soft)]" : ""}`}
                  >
                    {ADMIN_COLS_DEF[k].label}
                    <span
                      onMouseDown={(e) => onResizeStart(e, k)}
                      title="Kéo để đổi độ rộng"
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-[var(--brand-400)] after:content-[''] after:absolute after:top-[22%] after:bottom-[22%] after:left-1/2 after:-translate-x-1/2 after:w-[2px] after:rounded after:bg-[var(--ink-faint)] hover:after:bg-white"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => {
                const f = parentFields(p);
                return (
                  <tr key={p.id} onClick={() => onOpenXacNhanSl(p)} className="border-b border-[var(--line)] last:border-0 cursor-pointer hover:bg-[var(--accent-soft)] transition-colors">
                    <td />
                    <td className="font-semibold font-mono text-xs text-[var(--link)]">{p.id}</td>
                    <td className="" onClick={(e) => e.stopPropagation()}>
                      <Btn variant="primary" onClick={() => onOpenXacNhanSl(p)}>
                        Xác nhận SL
                      </Btn>
                    </td>
                    {visibleCols.map((k) => (
                      <td key={k} className="align-middle">
                        {f[k]}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {groups.map(([pid, list]) => {
                // Nhom nhieu don vi -> 1 dong thu gon "xN", bam de so ra.
                if (list.length >= 2) {
                  const isOpen = expanded.has(pid);
                  const head = list[0];
                  const hf = unitFields(head);
                  return (
                    <Fragment key={`g-${pid}`}>
                      <tr onClick={() => toggleExpand(pid)} className="border-b border-[var(--line)] cursor-pointer bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] transition-colors">
                        <td className="" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={groupAllSelected(list)}
                            ref={(el) => {
                              if (el) el.indeterminate = !groupAllSelected(list) && selectableInGroup(list).some((u) => selected.has(u.id));
                            }}
                            onChange={(e) => toggleGroup(list, e.target.checked)}
                          />
                        </td>
                        <td className="font-semibold font-mono text-xs text-[var(--link)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[var(--ink-faint)]">{isOpen ? "▾" : "▸"}</span>
                            {pid}
                            <Badge tone="gray">×{list.length}</Badge>
                          </span>
                        </td>
                        <td className="">
                          <span className="text-xs text-[var(--ink-soft)]">{isOpen ? "Bấm để thu gọn" : "Bấm để mở từng đơn vị"}</span>
                        </td>
                        {visibleCols.map((k) => (
                          <td key={k} className="align-middle">
                            {k === "trangthai" ? groupStatusSummary(list) : k === "sla" ? <SlaBadge since={groupWorstSla(list)} /> : k === "donchacode" ? <span className="text-[var(--ink-soft)] font-mono text-xs">{pid}</span> : hf[k]}
                          </td>
                        ))}
                      </tr>
                      {isOpen && list.map((u) => renderUnitRow(u, true))}
                    </Fragment>
                  );
                }
                return renderUnitRow(list[0], false);
              })}
            </tbody>
          </table>
        </div>
      )}

      {colSettingsOpen && <AdminColSettingsModal order={order} hidden={hidden} onToggle={toggleHidden} onReset={reset} onClose={() => setColSettingsOpen(false)} />}
    </div>
  );
}
