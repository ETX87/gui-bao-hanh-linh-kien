import { useEffect } from "react";
import { createPortal } from "react-dom";

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
      className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      onMouseDown={(e) => {
        mouseDownOnOverlay = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (mouseDownOnOverlay && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`anim-in bg-[var(--surface)] rounded-2xl shadow-2xl flex flex-col ${
          full ? "w-full h-full max-w-none max-h-none md:w-[calc(100%-48px)] md:h-[calc(100%-48px)]" : `w-full ${maxWidthClass || "max-w-2xl"} max-h-[90vh]`
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--line)] shrink-0">
          <h3 className="font-display font-bold text-base text-[var(--ink-900)] flex-1 truncate">{title}</h3>
          {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
          <button onClick={onClose} className="focus-ring shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-500)] hover:bg-[var(--surface-100)] hover:text-[var(--ink-900)] transition-colors">
            ✕
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footerActions && <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--line)] shrink-0">{footerActions}</div>}
      </div>
    </div>,
    document.body,
  );
}
