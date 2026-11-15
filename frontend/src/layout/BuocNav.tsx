import { useState } from "react";
import type { AppUser } from "../lib/types";
import { useRoute } from "../router/Router";
import { GD_TAB, useBuoc } from "../lib/buoc";
import { useDangDung } from "../hooks/useDangDung";
import { isPureKtv } from "./routes";

// 16/11/2026 (doi tac: "có thêm bộ lọc theo TỪNG BƯỚC ĐANG DỪNG để dễ theo dõi" - anh mau co sidebar liet ke tung buoc kem so):
// muc "Bước đang dừng" tren sidebar - moi buoc 1 dong: so don dang dung + so qua SLA (do). Bam -> danh sach da loc dung buoc.
export function BuocNav({ user, collapsed }: { user: AppUser; collapsed: boolean }) {
  const enabled = !isPureKtv(user);
  const { buoc } = useBuoc();
  const { of } = useDangDung(enabled);
  const { nav, path, query } = useRoute();
  const [open, setOpen] = useState(() => localStorage.getItem("buoc_nav_open") !== "0");
  if (!enabled) return null;
  const xemTatCa = user.la_admin_bh || user.la_giam_sat || user.la_view || user.la_qtri;
  // Gom theo so buoc (buoc 5 / 8 co 2 giai doan).
  const nhom: { so: string; ten: string; gds: string[] }[] = [];
  for (const b of buoc.filter((x) => !x.ket_thuc)) {
    const g = nhom.find((n) => n.so === b.so);
    if (g) g.gds.push(b.gd);
    else nhom.push({ so: b.so, ten: b.ten, gds: [b.gd] });
  }
  const rows = nhom.map((n) => ({ ...n, ...of(n.gds) })).filter((r) => r.tong > 0);
  if (!rows.length) return null;
  const dangLoc = path === "/don" && query.get("tab") === "tat_ca" ? query.get("trang_thai") || "" : "";
  const go = (gds: string[]) => nav(xemTatCa ? `/don?tab=tat_ca&trang_thai=${encodeURIComponent(gds.join(","))}` : GD_TAB[gds[0]] || "/home");
  const tongQua = rows.reduce((s, r) => s + r.qua_han, 0);
  return (
    <div className="space-y-0.5 pt-1">
      {collapsed ? (
        <div className="mx-0.5 mt-1 border-t border-white/15 pt-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/55" title="Bước đang dừng">
          Bước
        </div>
      ) : (
        <button
          onClick={() => {
            localStorage.setItem("buoc_nav_open", open ? "0" : "1");
            setOpen(!open);
          }}
          className="w-full flex items-center gap-2 px-2.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/55 hover:text-white/80"
          title="Số đơn đang dừng ở từng bước (đỏ = quá SLA bước)"
        >
          <span>{open ? "▾" : "▸"} Bước đang dừng</span>
          {tongQua > 0 && <span className="ml-auto rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold normal-case tracking-normal text-white">{tongQua}</span>}
        </button>
      )}
      {(open || collapsed) &&
        rows.map((r) => {
          const on = dangLoc === r.gds.join(",");
          const title = `Bước ${r.so} · ${r.ten}\n${r.tong} đơn đang dừng · ${r.qua_han} quá SLA${r.chua_gt ? ` (${r.chua_gt} chưa giải trình)` : ""}${r.tam_dung ? ` · ${r.tam_dung} tạm dừng chờ hàng` : ""}`;
          return (
            <button
              key={r.so}
              onClick={() => go(r.gds)}
              title={title}
              className={`focus-ring relative w-full flex rounded-lg text-[12.5px] transition-colors ${collapsed ? "items-center justify-center px-1 py-1" : "items-center gap-1.5 px-2.5 py-1"} ${
                on ? "bg-white/[0.22] text-white font-semibold" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`shrink-0 font-mono font-bold ${collapsed ? "text-[11px]" : "w-7 text-[11px] text-white/70"}`}>{collapsed ? `B${r.so}` : r.so}</span>
              {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{r.ten}</span>}
              {!collapsed && <span className="shrink-0 text-[11px] text-white/70 tabular-nums">{r.tong}</span>}
              {r.qua_han > 0 && (
                <span className={`shrink-0 min-w-[18px] h-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center ${collapsed ? "absolute -top-1 -right-0.5" : ""}`}>
                  {r.qua_han > 99 ? "99+" : r.qua_han}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}
