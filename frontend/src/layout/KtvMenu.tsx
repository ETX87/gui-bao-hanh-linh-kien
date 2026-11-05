import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useRoute } from "../router/Router";
import { displayName, useUserNames } from "../hooks/useUserNames";
import { normalizeVi as normVi } from "../lib/normalizeVi";
import type { AppUser } from "../lib/types";

// 04/11/2026 ("bổ sung thêm menu 2 bên cạnh menu gốc (menu 1), menu 2 sẽ hiện danh sách các KTV đang gửi đơn
// BH (có x123 số lượng tương ứng). người dùng có thể click vào tên KTV để lọc theo danh sách cần xử lý").
// So = so don (don cha) cua KTV dang o giai doan cho xu ly (GET /tra-cuu/ktv-menu, theo pham vi vai tro).
// Bam ten KTV -> dat ?ktv=<email> tren URL; moi o loc "KTV gửi" / "Người gửi" / "Người nhận" cua cac danh
// sach doc tham so nay (ui/FilterBar useListFilters, bang Admin BH). Man khong co danh sach -> sang #/don.

const HO_TRO = ["/don", "/thung", "/phieu-tra", "/admin/de-xuat"];

// 05/11/2026 - "số lượng đếm sẽ phụ thuộc vào tab người dùng đang chọn ví dụ chọn tab "Chờ phân loại" => chỉ hiện
// danh sách KTV đang có đơn trong chờ phân loại và số lượng tương ứng": man + tab -> giai doan (GIAI_DOAN cua
// /tra-cuu). "*" = moi giai doan. Khong khop -> null = dem cac giai doan dang cho xu ly (mac dinh).
const TRA_ALL = "tra_nhap,tra_cho_ke_toan_duyet,tra_da_duyet_ke_toan,tra_da_gui,tra_khieu_nai_van_chuyen,tra_ktv_da_nhan,tra_gui_that_bai,tra_ket_thuc_khong_gui";
const TAB_GD: Record<string, Record<string, { gd: string; nhan: string }>> = {
  "/don": {
    xu_ly: { gd: "cho_xac_nhan_so_luong,cho_phan_loai,admin_can_xem_lai,cho_bo_sung_tt", nhan: "Chờ phân loại" },
    nv: { gd: "cho_chan_doan", nhan: "Việc sửa" },
    dang_sua: { gd: "cho_chan_doan", nhan: "Đang sửa (NV)" },
    hoan_tat: { gd: "cho_admin_xac_nhan", nhan: "Chờ xác nhận hoàn tất" },
    tat_ca: { gd: "*", nhan: "Mọi giai đoạn" },
  },
  "/thung": {
    nhap: { gd: "thung_nhap", nhan: "Thùng nháp" },
    dang_gui: { gd: "thung_dang_gui", nhan: "Đang gửi về Kho" },
    cho_admin: { gd: "thung_cho_admin_nhan", nhan: "Kho đã nhận — chờ Admin" },
  },
  "/phieu-tra": {
    cho_tao: { gd: "san_sang_gom_phieu_tra", nhan: "Chờ tạo phiếu" },
    nhap: { gd: "tra_nhap", nhan: "Phiếu nháp" },
    tu_choi_kt: { gd: "tra_nhap", nhan: "Phiếu nháp / KT trả lại" },
    cho_kt: { gd: "tra_cho_ke_toan_duyet", nhan: "Chờ KT duyệt" },
    cho_in: { gd: "tra_da_duyet_ke_toan", nhan: "Chờ Kho in / gửi" },
    da_in: { gd: "tra_da_duyet_ke_toan", nhan: "Chờ Kho in / gửi" },
    khieu_nai: { gd: "tra_khieu_nai_van_chuyen", nhan: "KTV báo không nhận" },
    dang_gui: { gd: "tra_da_gui", nhan: "Đang gửi KTV" },
    xong: { gd: "tra_ktv_da_nhan,tra_gui_that_bai,tra_ket_thuc_khong_gui", nhan: "Đã kết thúc" },
    tat_ca: { gd: `san_sang_gom_phieu_tra,${TRA_ALL}`, nhan: "Phiếu trả" },
  },
};
const LS_KEY = "ktv_menu_open";

export function setUrlKtv(email: string) {
  const raw = window.location.hash.replace(/^#/, "") || "/home";
  const [path, qs] = raw.split("?");
  const p = new URLSearchParams(qs || "");
  if (email) p.set("ktv", email);
  else p.delete("ktv");
  const s = p.toString();
  window.location.replace(`#${path}${s ? `?${s}` : ""}`);
}

export function showKtvMenu(u: AppUser): boolean {
  return !!(u.la_qtri || u.la_admin_bh || u.la_kho || u.la_ke_toan || u.la_nv_sua_chua || u.la_giam_sat || u.la_view);
}

interface Row {
  ktv: string;
  so_don: number;
  so_dong: number;
  qua_han: number;
}

export function KtvMenu({ user }: { user: AppUser }) {
  const { path, query, nav } = useRoute();
  useUserNames();
  const active = query.get("ktv") || "";
  const [open, setOpen] = useState(() => localStorage.getItem(LS_KEY) !== "0");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [tick, setTick] = useState(0);
  const ngu = TAB_GD[path]?.[query.get("tab") || ""] ?? null;
  const gd = ngu?.gd ?? "";

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRows(null);
    api
      .get<{ ktv: Row[] }>(`/tra-cuu/ktv-menu${gd ? `?gd=${encodeURIComponent(gd)}` : ""}`)
      .then((r) => alive && setRows((r.ktv || []).filter((x) => x.ktv)))
      .catch(() => alive && setRows([]));
    const t = setInterval(() => setTick((v) => v + 1), 120_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
    // Tai lai khi doi man (thao tac xong o man khac) hoac moi 2 phut.
  }, [open, path, gd, tick, user.email]);

  const list = useMemo(() => {
    const k = normVi(q.trim());
    const all = (rows || []).map((r) => ({ ...r, ten: displayName(r.ktv) }));
    if (!k) return all;
    const words = k.split(/\s+/);
    return all.filter((r) => {
      const hay = normVi(`${r.ten} ${r.ktv}`);
      return words.every((w) => hay.includes(w));
    });
  }, [rows, q]);
  const tong = (rows || []).reduce((s, r) => s + r.so_don, 0);

  const toggle = () => {
    setOpen((v) => {
      localStorage.setItem(LS_KEY, v ? "0" : "1");
      return !v;
    });
  };

  const pick = (email: string) => {
    const next = email === active ? "" : email;
    if (HO_TRO.includes(path)) setUrlKtv(next);
    else nav(next ? `/don?ktv=${encodeURIComponent(next)}` : "/don");
  };

  if (!open) {
    return (
      <aside className="hidden md:flex w-9 shrink-0 h-screen sticky top-0 flex-col items-center border-r border-[var(--line)] bg-[var(--surface)] py-2">
        <button type="button" onClick={toggle} title="Mở danh sách KTV" className="focus-ring rounded-md px-1 py-2 text-[var(--ink-soft)] hover:bg-[var(--surface-2)]">
          <span className="block text-sm">👷</span>
          <span className="mt-1 block text-[10px] font-semibold [writing-mode:vertical-rl]">KTV »</span>
        </button>
        {active && <span className="mt-2 h-2 w-2 rounded-full bg-[var(--accent)]" title={`Đang lọc: ${displayName(active)}`} />}
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 h-screen sticky top-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--line)] px-2.5 py-2">
        <span className="text-sm">👷</span>
        <span className="min-w-0 flex-1 truncate" title={ngu ? `KTV có đơn ở: ${ngu.nhan}` : "KTV đang có đơn bảo hành cần xử lý"}>
          <span className="block truncate text-[13px] font-bold text-[var(--ink)]">KTV gửi đơn</span>
          <span className="block truncate text-[10.5px] text-[var(--ink-soft)]">{ngu ? ngu.nhan : "Đang chờ xử lý"}</span>
        </span>
        {tong > 0 && <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-1.5 text-[11px] font-bold text-[var(--ink-body)]">{tong}</span>}
        <button type="button" onClick={() => setTick((v) => v + 1)} title="Tải lại" className="focus-ring rounded px-1 text-xs text-[var(--ink-soft)] hover:bg-[var(--surface-2)]">↻</button>
        <button type="button" onClick={toggle} title="Thu gọn" className="focus-ring rounded px-1 text-xs text-[var(--ink-soft)] hover:bg-[var(--surface-2)]">«</button>
      </div>
      <div className="px-2 pt-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Tìm KTV"
          className="w-full rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-2 py-1 text-xs"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-0.5">
        <button
          type="button"
          onClick={() => pick("")}
          className={`focus-ring w-full flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12.5px] ${!active ? "bg-[var(--brand-50)] font-semibold text-[var(--accent-ink)]" : "text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}
        >
          <span className="flex-1 truncate">Tất cả KTV</span>
          <span className="shrink-0 text-[11px] font-semibold text-[var(--ink-soft)]">{rows ? rows.length : ""}</span>
        </button>
        {rows === null && <p className="px-2 py-2 text-xs text-[var(--ink-faint)]">Đang tải…</p>}
        {rows !== null && list.length === 0 && <p className="px-2 py-2 text-xs text-[var(--ink-faint)]">{q ? "Không có KTV khớp." : ngu ? `Không có KTV nào có đơn ở "${ngu.nhan}".` : "Không có KTV nào đang có đơn cần xử lý."}</p>}
        {list.map((r) => {
          const on = r.ktv === active;
          return (
            <button
              key={r.ktv}
              type="button"
              onClick={() => pick(r.ktv)}
              title={`${r.ten} · ${r.ktv}\n${r.so_don} đơn${ngu ? ` · ${ngu.nhan}` : " đang chờ xử lý"}${r.so_dong !== r.so_don ? ` (${r.so_dong} dòng)` : ""}${r.qua_han > 0 ? `\n${r.qua_han} dòng quá hạn SLA 24h` : ""}${on ? "\n(bấm lần nữa để bỏ lọc)" : ""}`}
              className={`focus-ring w-full flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12.5px] ${on ? "bg-[var(--brand-50)] font-semibold text-[var(--accent-ink)] ring-1 ring-[var(--brand-200)]" : "text-[var(--ink-body)] hover:bg-[var(--surface-2)]"}`}
            >
              {r.qua_han > 0 && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--red-600)]" />}
              <span className="min-w-0 flex-1 truncate">{r.ten}</span>
              <span className={`shrink-0 rounded-full px-1.5 text-[11px] font-bold ${on ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-body)]"}`}>×{r.so_don}</span>
            </button>
          );
        })}
      </nav>
      {active && (
        <div className="border-t border-[var(--line)] px-2.5 py-1.5 text-[11px] text-[var(--ink-soft)]">
          Đang lọc: <b className="text-[var(--ink)]">{displayName(active)}</b>{" "}
          <button type="button" className="text-[var(--link)] underline" onClick={() => pick("")}>
            Bỏ lọc
          </button>
        </div>
      )}
    </aside>
  );
}
