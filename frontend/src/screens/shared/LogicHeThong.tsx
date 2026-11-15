import { useEffect, useState } from "react";
import { Spinner } from "../../ui/primitives";

// 11/11/2026 ("thêm vào web để các BO có thể đọc được logic hệ thống"): man doc tai lieu luong quy trinh
// ngay trong app. Nguon DUY NHAT la 2 file HTML trong thu muc tai lieu du an (khong chep noi dung) - Vite
// nap dang chuoi (?raw) qua import dong nen KHONG lam nang bundle chinh, chi tai khi mo man nay. Hien bang
// iframe srcDoc + sandbox (CSS rieng cua tai lieu khong anh huong giao dien app); sua tai lieu -> deploy
// lai la man nay cap nhat theo.
const DOCS = [
  {
    key: "tong",
    label: "🔁 Luồng quy trình tổng",
    load: () => import("../../../../du an sua chua bao hanh/Luong-Quy-Trinh-Tong-Bao-Hanh.html?raw"),
  },
  {
    key: "cap_lk",
    label: "🔩 Luồng cấp linh kiện",
    load: () => import("../../../../du an sua chua bao hanh/Luong-Cap-Linh-Kien-Bao-Hanh.html?raw"),
  },
  {
    key: "buoc",
    label: "🧭 Quản trị theo bước",
    load: () => import("../../../../du an sua chua bao hanh/Quan-Tri-Theo-Buoc_15-11-2026.html?raw"),
  },
] as const;

type DocKey = (typeof DOCS)[number]["key"];

function readTab(): DocKey {
  const q = new URLSearchParams(window.location.hash.split("?")[1] ?? "");
  const t = q.get("tab");
  return t === "cap_lk" || t === "buoc" ? t : "tong";
}

export function LogicHeThongScreen() {
  const [tab, setTab] = useState<DocKey>(readTab);
  const [html, setHtml] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (html[tab]) return;
    const d = DOCS.find((x) => x.key === tab)!;
    let alive = true;
    d.load()
      .then((m) => alive && setHtml((h) => ({ ...h, [tab]: m.default })))
      .catch(() => alive && setErr("Không tải được tài liệu, thử tải lại trang."));
    return () => {
      alive = false;
    };
  }, [tab, html]);

  const chon = (k: DocKey) => {
    setTab(k);
    window.history.replaceState(null, "", `#/logic${k === "tong" ? "" : "?tab=" + k}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-bold text-[var(--ink)] mr-2">📘 Logic hệ thống</h1>
        {DOCS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => chon(d.key)}
            className={
              "px-3 py-1.5 rounded-full text-sm font-semibold border " +
              (tab === d.key
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-white text-[var(--ink-soft,#5f7568)] border-[var(--line)] hover:bg-[var(--brand-50)]")
            }
          >
            {d.label}
          </button>
        ))}
        <span className="text-xs text-[var(--ink-faint,#8aa596)] ml-auto hidden md:inline">Tài liệu chỉ đọc — mục 12 dành riêng cho vai trò BO</span>
      </div>
      {err ? (
        <p className="text-sm text-red-600">{err}</p>
      ) : !html[tab] ? (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <iframe
          key={tab}
          title="Logic hệ thống"
          srcDoc={html[tab]}
          sandbox="allow-same-origin"
          // Tai lieu srcdoc thua base URL cua app -> link muc luc "#bo" se dieu huong iframe sang trang app
          // (trang trang). Bat click o day (sandbox khong cho chay script ben trong) va cuon toi muc.
          onLoad={(e) => {
            const doc = e.currentTarget.contentDocument;
            doc?.addEventListener("click", (ev) => {
              const a = (ev.target as HTMLElement | null)?.closest?.("a");
              const href = a?.getAttribute("href") ?? "";
              if (!a) return;
              ev.preventDefault();
              if (href.startsWith("#")) doc.getElementById(href.slice(1))?.scrollIntoView({ block: "start" });
              else if (/^https?:/.test(href)) window.open(href, "_blank", "noopener");
            });
          }}
          className="w-full rounded-2xl border border-[var(--line)] bg-white h-[calc(100dvh-300px)] md:h-[calc(100dvh-110px)]"
        />
      )}
    </div>
  );
}
