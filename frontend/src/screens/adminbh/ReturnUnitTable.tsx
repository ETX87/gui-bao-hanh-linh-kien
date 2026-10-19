import { useMemo, type ReactNode } from "react";
import { Badge, Input, Select } from "../../ui/primitives";
import { MienBadge } from "../../ui/MienBadge";
import { SlaBadge } from "../../ui/SlaBadge";
import { HUONG_XU_LY_LABELS, LOAI_DOI_TRU_LABELS, XU_LY_XAC_LABELS, ketQuaLabel, KHACH_LE_KEY, isDoiTacKey, doiTacNameFromKey } from "../../lib/constants";
import { useLkName } from "../../hooks/useLinhKien";
import { UserName, displayName } from "../../hooks/useUserNames";
import { normalizeVi } from "../../lib/normalizeVi";
import { hoursSince } from "../../lib/format";
import type { DonVi } from "../../lib/types";

// Don vi cho tao phieu tra / trong phieu tra - dang bang (19/10/2026: "hien danh sach theo dang list KTV
// (x123) -> don 1, don 2 (cac cot lien quan)... co the tich chon 1 hoac nhieu don de tao phieu tra").
export interface ReturnUnit extends DonVi {
  ktv_key?: string;
  odoo_id?: number | null;
}

export function nguoiNhanLabel(key: string): ReactNode {
  if (key === KHACH_LE_KEY) return <Badge tone="violet">Khách lẻ</Badge>;
  if (isDoiTacKey(key)) return <Badge tone="orange">Đối tác: {doiTacNameFromKey(key)}</Badge>;
  return <UserName email={key} />;
}

// ---------- Bo loc (lam tren may) ----------
export interface UnitLoc {
  q: string;
  loai: string;
  huong: string;
  nguon: string; // "" | ktv | khach_le
  mien: string; // "" | MB | MN | none
  cho: string; // "" | qua_han (>24h cho tao phieu)
}
export const EMPTY_LOC: UnitLoc = { q: "", loai: "", huong: "", nguon: "", mien: "", cho: "" };
export const countLoc = (l: UnitLoc) => Object.values(l).filter(Boolean).length;

export function useFilteredUnits(units: ReturnUnit[], loc: UnitLoc) {
  const { nameOf } = useLkName();
  return useMemo(() => {
    const words = normalizeVi(loc.q).split(/\s+/).filter(Boolean);
    return units.filter((u) => {
      if (loc.loai && (u.loai_doi_tru || "doi_tra") !== loc.loai) return false;
      if (loc.huong && u.huong_xu_ly !== loc.huong) return false;
      if (loc.nguon === "khach_le" && u.ktv_key !== KHACH_LE_KEY) return false;
      if (loc.nguon === "ktv" && u.ktv_key === KHACH_LE_KEY) return false;
      if (loc.mien === "none" ? u.mien : loc.mien && u.mien !== loc.mien) return false;
      if (loc.cho === "qua_han" && hoursSince(u.updated_at) <= 24) return false;
      if (words.length) {
        const hay = normalizeVi(
          [u.id, u.case_id, u.case_khach_hang, u.ten_khach_hang, u.mo_ta_loi, u.ma_lk, u.ma_lk_thuc_te, nameOf(u.ma_lk_thuc_te || u.ma_lk), u.ktv_key, u.ktv_key ? displayName(u.ktv_key) : "", u.phieu_gui_id]
            .filter(Boolean)
            .join(" "),
        );
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [units, loc, nameOf]);
}

export function UnitFilterBar({ value, onChange, units, right }: { value: UnitLoc; onChange: (v: UnitLoc) => void; units: ReturnUnit[]; right?: ReactNode }) {
  const set = (k: keyof UnitLoc, v: string) => onChange({ ...value, [k]: v });
  const huongs = useMemo(() => [...new Set(units.map((u) => u.huong_xu_ly).filter(Boolean) as string[])], [units]);
  const cell = "flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:min-w-0";
  const lab = "shrink-0 text-[11px] font-semibold text-[var(--ink-soft)] whitespace-nowrap";
  const n = countLoc(value);
  return (
    <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-x-3 gap-y-1.5 items-center">
        <div className={`${cell} col-span-2 lg:col-span-1`}>
          <span className={lab}>Tìm</span>
          <Input value={value.q} onChange={(e) => set("q", e.target.value)} placeholder="Mã đơn, case, khách, linh kiện, KTV…" />
        </div>
        <div className={cell}>
          <span className={lab}>Đối trừ</span>
          <Select value={value.loai} onChange={(e) => set("loai", e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(LOAI_DOI_TRU_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Hướng XL</span>
          <Select value={value.huong} onChange={(e) => set("huong", e.target.value)}>
            <option value="">Tất cả</option>
            {huongs.map((h) => (
              <option key={h} value={h}>{HUONG_XU_LY_LABELS[h] || h}</option>
            ))}
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Nguồn</span>
          <Select value={value.nguon} onChange={(e) => set("nguon", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="ktv">KTV</option>
            <option value="khach_le">Khách lẻ</option>
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Miền</span>
          <Select value={value.mien} onChange={(e) => set("mien", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="MB">Miền Bắc</option>
            <option value="MN">Miền Nam</option>
            <option value="none">Chưa khai báo</option>
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Thời gian chờ</span>
          <Select value={value.cho} onChange={(e) => set("cho", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="qua_han">Chờ quá 24h</option>
          </Select>
        </div>
      </div>
      {(n > 0 || right) && (
        <div className="flex flex-wrap items-center justify-end gap-2 mt-1.5">
          {right}
          {n > 0 && (
            <button type="button" className="text-xs font-semibold text-[var(--link)] hover:underline" onClick={() => onChange(EMPTY_LOC)}>
              ✕ Xoá lọc ({n})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Bang don vi ----------
export function ReturnUnitTable({
  units,
  selected,
  onToggle,
  onToggleMany,
  grouped,
  groupAction,
  onOpen,
  rowExtra,
  emptyText = "Không có đơn nào.",
}: {
  units: ReturnUnit[];
  selected?: Set<string>;
  onToggle?: (id: string) => void;
  onToggleMany?: (ids: string[], on: boolean) => void;
  grouped?: boolean; // nhom theo KTV nhan: "KTV (xN)" roi cac dong don
  groupAction?: (ktvKey: string, units: ReturnUnit[]) => ReactNode;
  onOpen?: (u: ReturnUnit) => void;
  rowExtra?: { header: string; render: (u: ReturnUnit) => ReactNode }; // cot rieng (vd doi linh kien / bo khoi phieu)
  emptyText?: string;
}) {
  const { nameOf, phanLoaiOf } = useLkName();
  const groups = useMemo(() => {
    if (!grouped) return [["", units] as [string, ReturnUnit[]]];
    const m = new Map<string, ReturnUnit[]>();
    for (const u of units) {
      const k = u.ktv_key || "";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(u);
    }
    return [...m.entries()];
  }, [units, grouped]);
  const sel = !!selected && !!onToggle;
  const nCols = 9 + (sel ? 1 : 0) + (rowExtra ? 1 : 0);

  if (!units.length) return <p className="text-sm text-[var(--ink-soft)] py-3 text-center">{emptyText}</p>;

  const checkAll = (ids: string[]) => {
    const all = ids.every((id) => selected!.has(id));
    onToggleMany?.(ids, !all);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
      <table className="tbl w-full text-left">
        <thead className="bg-[var(--surface-2)] text-[var(--ink-soft)]">
          <tr>
            {sel && (
              <th className="w-8">
                <input type="checkbox" aria-label="Chọn tất cả" checked={units.length > 0 && units.every((u) => selected!.has(u.id))} onChange={() => checkAll(units.map((u) => u.id))} />
              </th>
            )}
            <th>ID</th>
            {rowExtra && <th>{rowExtra.header}</th>}
            <th>Linh kiện thực tế</th>
            <th>Hướng xử lý</th>
            <th>Đối trừ</th>
            <th>Kết quả / xử lý xác</th>
            <th>Case · khách</th>
            <th>Mô tả lỗi</th>
            <th>Miền</th>
            <th>Chờ</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, gUnits]) => {
            const ids = gUnits.map((u) => u.id);
            const nSel = sel ? ids.filter((id) => selected!.has(id)).length : 0;
            return (
              <GroupRows key={key || "_"}>
                {grouped && (
                  <tr className="bg-[var(--brand-50)]">
                    {sel && (
                      <td>
                        <input
                          type="checkbox"
                          aria-label="Chọn cả nhóm"
                          checked={nSel === ids.length}
                          ref={(el) => {
                            if (el) el.indeterminate = nSel > 0 && nSel < ids.length;
                          }}
                          onChange={() => checkAll(ids)}
                        />
                      </td>
                    )}
                    <td colSpan={nCols - (sel ? 1 : 0)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[var(--ink)]">👷 {nguoiNhanLabel(key)}</span>
                        <Badge tone="gray">×{gUnits.length}</Badge>
                        {nSel > 0 && <span className="text-xs text-[var(--link)] font-semibold">đã chọn {nSel}</span>}
                        <span className="ml-auto flex gap-1.5">{groupAction?.(key, gUnits)}</span>
                      </div>
                    </td>
                  </tr>
                )}
                {gUnits.map((u) => {
                  const lk = u.ma_lk_thuc_te || u.ma_lk;
                  const kq = ketQuaLabel(u);
                  return (
                    <tr key={u.id} className={`${onOpen ? "cursor-pointer hover:bg-[var(--surface-2)]" : ""} ${sel && selected!.has(u.id) ? "bg-[var(--brand-50)]" : ""}`} onClick={onOpen ? () => onOpen(u) : undefined}>
                      {sel && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selected!.has(u.id)} onChange={() => onToggle!(u.id)} />
                        </td>
                      )}
                      <td className={`whitespace-nowrap ${grouped ? "!pl-5" : ""}`}>
                        <span className="font-mono text-xs font-semibold text-[var(--link)]">{u.id}</span>
                        {u.odoo_id ? <Badge tone="blue" className="ml-1">Odoo</Badge> : null}
                      </td>
                      {rowExtra && <td onClick={(e) => e.stopPropagation()}>{rowExtra.render(u)}</td>}
                      <td className="max-w-[260px]">
                        <div className="truncate" title={nameOf(lk)}>{nameOf(lk)}</div>
                        {(phanLoaiOf(lk) || (u.ma_lk_thuc_te && u.ma_lk_thuc_te !== u.ma_lk)) && (
                          <div className="flex items-center gap-1 text-[11px] text-[var(--ink-faint)] whitespace-nowrap">
                            {phanLoaiOf(lk)}
                            {u.ma_lk_thuc_te && u.ma_lk_thuc_te !== u.ma_lk && (
                              <span className="font-semibold text-[var(--blue-700)]" title={`KTV gửi: ${nameOf(u.ma_lk)}`}>
                                · Đã đổi LK
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap">{u.huong_xu_ly ? HUONG_XU_LY_LABELS[u.huong_xu_ly] || u.huong_xu_ly : "—"}</td>
                      <td className="whitespace-nowrap">
                        <Badge tone={u.loai_doi_tru === "tru_cong_no" ? "violet" : "blue"}>{LOAI_DOI_TRU_LABELS[u.loai_doi_tru || "doi_tra"]}</Badge>
                      </td>
                      <td className="whitespace-nowrap text-xs">{[kq, u.xu_ly_xac ? `Xác: ${XU_LY_XAC_LABELS[u.xu_ly_xac] || u.xu_ly_xac}` : null].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="max-w-[200px]">
                        <div className="truncate text-xs" title={[u.case_id, u.case_khach_hang || u.ten_khach_hang].filter(Boolean).join(" · ")}>
                          <span className="font-mono">{u.case_id || "—"}</span>
                          {(u.case_khach_hang || u.ten_khach_hang) && <span className="text-[var(--ink-soft)]"> · {u.case_khach_hang || u.ten_khach_hang}</span>}
                        </div>
                      </td>
                      <td className="max-w-[240px]">
                        <div className="truncate text-xs text-[var(--ink-soft)]" title={u.mo_ta_loi || ""}>{u.mo_ta_loi || "—"}</div>
                      </td>
                      <td><MienBadge mien={u.mien} short /></td>
                      <td><SlaBadge since={u.updated_at} /></td>
                    </tr>
                  );
                })}
              </GroupRows>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
