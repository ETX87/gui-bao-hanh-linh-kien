import { useEffect } from "react";
import { createPortal } from "react-dom";

// Tailwind chi sinh CSS cho ten lop VIET NGUYEN VAN trong ma nguon - truoc day ghep chuoi "md:"+x luc
// chay nen md:max-w-* khong ton tai, moi modal "nho" bi keo gian het chieu ngang (phat hien 05/10/2026).
const MD_MAX_W: Record<string, string> = {
  "max-w-sm": "md:max-w-sm",
  "max-w-md": "md:max-w-md",
  "max-w-lg": "md:max-w-lg",
  "max-w-xl": "md:max-w-xl",
  "max-w-2xl": "md:max-w-2xl",
  "max-w-3xl": "md:max-w-3xl",
  "max-w-4xl": "md:max-w-4xl",
  "max-w-5xl": "md:max-w-5xl",
  "max-w-6xl": "md:max-w-6xl",
};

// Modal - 2 kich co (mac dinh vs full man hinh, port dung quyet dinh "modal tram man hinh" da chot
// 02/09/2026: chi "UI chi tiet" (openDetailUnitModal/openDetailTraModal) moi dung full=true, con lai
// dung mac dinh). headerActions/footerActions: 2 vung nut co dinh (khong cuon theo noi dung) - port
// dung yeu cau "nut thao tac chuyen len top tieu de" (02/09) + "UI chi tiet co du nut thao tac o
// footer" (03/09). Dong bang phim Escape hoac bam nen (chi khi mousedown+click deu bat dau tren nen -
// tranh loi "keo chon chu roi tha ra ngoai lam dong nham modal" da phat hien o prototype vong 1).

export function Modal({
  title,
  onClose,
  children,
  full,
  headerActions,
  footerActions,
  maxWidthClass,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  full?: boolean;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open-lock");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open-lock");
    };
  }, [onClose]);

  let mouseDownOnOverlay = false;

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-0 md:p-4"
      onMouseDown={(e) => {
        mouseDownOnOverlay = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mouseDownOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        // DESIGN_SYSTEM.md §6.8: modal rounded-xl, TRAN MAN HINH tren mobile (moi modal), desktop giu 2 co.
        className={`anim-in bg-[var(--surface)] shadow-2xl flex flex-col w-full h-full rounded-none md:rounded-xl ${
          full ? "md:w-[calc(100%-48px)] md:h-[calc(100%-48px)]" : `md:h-auto ${maxWidthClass ? maxWidthClass.split(" ").map((c) => MD_MAX_W[c] ?? c).join(" ") : "md:max-w-2xl"} md:max-h-[90vh]`
        }`}
      >
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--line)] shrink-0">
          <h3 className="font-bold text-base text-[var(--ink)] flex-1 truncate">{title}</h3>
          {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
          <button onClick={onClose} className="focus-ring shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-lg md:text-base text-[var(--ink-soft)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-ink)] transition-colors">
            ✕
          </button>
        </div>
        <div className="px-4 md:px-6 py-4 md:py-5 overflow-y-auto flex-1">{children}</div>
        {footerActions && <div className="flex flex-wrap items-center justify-end gap-2 px-4 md:px-6 py-3 md:py-4 border-t border-[var(--line)] bg-[var(--surface)] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-4">{footerActions}</div>}
      </div>
    </div>,
    document.body,
  );
}
