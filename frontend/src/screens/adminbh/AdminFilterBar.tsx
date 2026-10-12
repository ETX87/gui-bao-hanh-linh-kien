import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Btn, Input, Select } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useLinhKien, lkLabel } from "../../hooks/useLinhKien";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { KHACH_LE_KEY } from "../../lib/constants";

// Bo loc bang thong nhat Admin BH (09/10/2026: "bo sung them cac filter de tim kiem va lap danh sach can
// xu ly: Trang thai, Nguoi gui, Linh kien gui, linh kien thuc sua, Loai linh kien, trang thai cham").
// Loc tren server (GET /admin/don-cha + /admin/don-vi cung tham so) - lua chon lay tu chinh hang doi
// (GET /admin/don-vi/loc-options), khong liet ke het danh muc.

export interface AdminFilter {
  q: string;
  tt: string;
  ktv: string;
  lk: string;
  lk_tt: string;
  pl: string;
  cham: string;
  mien: string;
}
export const EMPTY_FILTER: AdminFilter = { q: "", tt: "", ktv: "", lk: "", lk_tt: "", pl: "", cham: "", mien: "" };

export function filterQuery(f: AdminFilter): string {
  return (Object.keys(f) as (keyof AdminFilter)[])
    .filter((k) => f[k])
    .map((k) => `${k}=${encodeURIComponent(f[k])}`)
    .join("&");
}

const TT_OPTIONS = [
  { value: "cho_xac_nhan_so_luong", label: "Chờ xác nhận số lượng" },
  { value: "cho_phan_loai", label: "Chờ phân loại" },
  { value: "admin_can_xem_lai", label: "NV trả lại (cần xem lại)" },
  { value: "cho_bo_sung_tt", label: "Đang chờ KTV bổ sung" },
];

interface Options {
  ktv: string[];
  lk: string[];
  lk_tt: string[];
  phan_loai: string[];
}

export function AdminFilterBar({ value, onChange, reloadKey }: { value: AdminFilter; onChange: (f: AdminFilter) => void; reloadKey: number }) {
  useUserNames();
  const { items: lkList } = useLinhKien();
  const lkText = (ma: string) => lkLabel(lkList.find((x) => x.ma_lk === ma)?.ten_lk, ma);
  const [opts, setOpts] = useState<Options>({ ktv: [], lk: [], lk_tt: [], phan_loai: [] });
  useEffect(() => {
    api
      .get<Options>("/admin/don-vi/loc-options")
      .then(setOpts)
      .catch(() => undefined);
  }, [reloadKey]);

  const set = (k: keyof AdminFilter, v: string) => onChange({ ...value, [k]: v });
  // O tim tu khoa (12/10/2026): go xong 400ms moi loc - khong goi API moi phim.
  const [kw, setKw] = useState(value.q);
  useEffect(() => setKw(value.q), [value.q]);
  useEffect(() => {
    if (kw.trim() === value.q) return;
    const t = setTimeout(() => onChange({ ...value, q: kw.trim() }), 400);
    return () => clearTimeout(t);
  }, [kw]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = Object.values(value).filter(Boolean).length;

  const ktvOptions = opts.ktv
    .map((e) => ({ value: e, label: e === KHACH_LE_KEY ? "Khách lẻ (đơn dịch vụ)" : displayName(e), hint: e === KHACH_LE_KEY || displayName(e) === e ? undefined : e }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  const lkOpts = (arr: string[]) => arr.map((m) => ({ value: m, label: lkText(m) })).sort((a, b) => a.label.localeCompare(b.label, "vi"));

  const cell = "flex flex-col md:flex-row md:items-center gap-1 md:gap-1.5 min-w-0 [&>*:last-child]:flex-1 [&>*:last-child]:min-w-0";
  const lab = "shrink-0 text-[11px] font-semibold text-[var(--ink-soft)] whitespace-nowrap";

  return (
    <div className="fbar rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1.5 mb-2">
      <div className="mb-1.5">
        <Input
          type="search"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="🔍 Tìm mã đơn / case / phiếu gửi, khách hàng, serial, linh kiện, KTV, mô tả lỗi…"
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-x-3 gap-y-1.5">
        <div className={cell}>
          <span className={lab}>Trạng thái</span>
          <Select value={value.tt} onChange={(e) => set("tt", e.target.value)}>
            <option value="">Tất cả</option>
            {TT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Người gửi</span>
          <SearchableSelect options={ktvOptions} value={value.ktv} onChange={(v) => set("ktv", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>LK gửi</span>
          <SearchableSelect options={lkOpts(opts.lk)} value={value.lk} onChange={(v) => set("lk", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>LK thực sửa</span>
          <SearchableSelect options={lkOpts(opts.lk_tt)} value={value.lk_tt} onChange={(v) => set("lk_tt", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>Loại LK</span>
          <Select value={value.pl} onChange={(e) => set("pl", e.target.value)}>
            <option value="">Tất cả</option>
            {opts.phan_loai
              .filter((v) => v)
              .sort((a, b) => a.localeCompare(b, "vi"))
              .map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            {opts.phan_loai.includes("") && <option value="__none__">(Chưa phân loại)</option>}
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>SLA</span>
          <Select value={value.cham} onChange={(e) => set("cham", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="qua_han">🔴 Quá hạn SLA 24h</option>
            <option value="dung_han">🟢 Còn trong hạn</option>
          </Select>
        </div>
        <div className={cell}>
          <span className={lab}>Miền</span>
          <Select value={value.mien} onChange={(e) => set("mien", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="MB">Miền Bắc</option>
            <option value="MN">Miền Nam</option>
            <option value="__none__">Chưa khai báo</option>
          </Select>
        </div>
      </div>
      {active > 0 && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--accent-ink)]">Đang lọc theo {active} điều kiện</span>
          <Btn onClick={() => onChange(EMPTY_FILTER)}>✕ Xoá bộ lọc</Btn>
        </div>
      )}
    </div>
  );
}
