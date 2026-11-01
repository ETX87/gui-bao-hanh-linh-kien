import { useEffect, useState } from "react";
import { FilterSelect } from "../../ui/FilterBar";
import { api } from "../../lib/api";
import { Btn, Input, Select } from "../../ui/primitives";
import { SearchableSelect } from "../../ui/SearchableSelect";
import { useLinhKien, lkLabel } from "../../hooks/useLinhKien";
import { displayName, useUserNames } from "../../hooks/useUserNames";
import { KHACH_LE_KEY, HUONG_XU_LY_LABELS } from "../../lib/constants";
import { KhoangSelect } from "../../ui/FilterBar";

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
  lk_nhan: string;
  huong: string;
  khoang: string;
}
export const EMPTY_FILTER: AdminFilter = { q: "", tt: "", ktv: "", lk: "", lk_tt: "", pl: "", cham: "", mien: "", lk_nhan: "", huong: "", khoang: "" };

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
  lk_nhan?: string[];
  huong?: string[];
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

  const [moLoc, setMoLoc] = useState(false);
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
      {/* 31/10/2026: tren dien thoai 7 o loc chiem gan 1 man hinh -> thu vao nut "Lọc". */}
      <button type="button" className="md:hidden mb-1 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-body)]" onClick={() => setMoLoc((v) => !v)}>
        ⚙ Lọc{active > 0 ? ` (${active})` : ""} {moLoc ? "▴" : "▾"}
      </button>
      <div className={`${moLoc ? "grid" : "hidden"} md:grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-1.5`}>
        <FilterSelect label="Trạng thái" value={value.tt} onChange={(v) => set("tt", v)} options={TT_OPTIONS} />
        <div className={cell}>
          <span className={lab}>Người gửi</span>
          <SearchableSelect options={ktvOptions} value={value.ktv} onChange={(v) => set("ktv", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>LK KTV chọn (A)</span>
          <SearchableSelect options={lkOpts(opts.lk)} value={value.lk} onChange={(v) => set("lk", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>LK gửi về (B)</span>
          <SearchableSelect options={lkOpts(opts.lk_nhan || [])} value={value.lk_nhan} onChange={(v) => set("lk_nhan", v)} placeholder="Tất cả" />
        </div>
        <div className={cell}>
          <span className={lab}>LK đổi mới (C)</span>
          <SearchableSelect options={lkOpts(opts.lk_tt)} value={value.lk_tt} onChange={(v) => set("lk_tt", v)} placeholder="Tất cả" />
        </div>
        <FilterSelect
          label="Hướng xử lý"
          value={value.huong}
          onChange={(v) => set("huong", v)}
          options={(opts.huong || []).map((v) => (v ? { value: v, label: HUONG_XU_LY_LABELS[v] || v } : { value: "__none__", label: "(Chưa phân loại)" }))}
        />
        <FilterSelect
          label="Loại LK"
          value={value.pl}
          onChange={(v) => set("pl", v)}
          options={[
            ...opts.phan_loai
              .filter((v) => v)
              .sort((a, b) => a.localeCompare(b, "vi"))
              .map((v) => ({ value: v, label: v })),
            ...(opts.phan_loai.includes("") ? [{ value: "__none__", label: "(Chưa phân loại)" }] : []),
          ]}
        />
        <div className={cell}>
          <span className={lab}>SLA</span>
          <Select value={value.cham} onChange={(e) => set("cham", e.target.value)}>
            <option value="">Tất cả</option>
            <option value="dung_han">🟢 Còn trong hạn</option>
            <option value="qua_han">🟡 Quá hạn SLA 24h</option>
            <option value="nguy_hiem">🔴 Quá 72h (nguy hiểm)</option>
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
        <KhoangSelect label="Thời gian" value={value.khoang} onChange={(v) => set("khoang", v)} />
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
