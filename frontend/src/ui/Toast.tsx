import { createContext, useCallback, useContext, useRef, useState } from "react";

// Toast don gian - goc man hinh duoi-phai, tu bien mat sau 3.2s. Dung chung useToast() o moi noi can
// bao thanh cong/loi sau 1 thao tac (thay the alert()/toast tu che cua prototype).

type ToastTone = "ok" | "error" | "info";
interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
}

const ToastContext = createContext<{ show: (text: string, tone?: ToastTone) => void }>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext).show;
}

const TONE_CLASSES: Record<ToastTone, string> = {
  ok: "bg-[var(--teal-600)]",
  error: "bg-[var(--coral-600)]",
  info: "bg-[var(--ocean-800)]",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((text: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-xs">
        {items.map((t) => (
          <div key={t.id} className={`toast-in rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${TONE_CLASSES[t.tone]}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
