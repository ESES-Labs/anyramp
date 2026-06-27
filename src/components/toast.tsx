import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Toast = { id: number; message: string };

type Ctx = { show: (message: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);
  const ctx = useMemo(() => ({ show }), [show]);
  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[100] mx-auto flex max-w-[480px] flex-col items-center gap-2 px-5"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background shadow-quiet animate-in fade-in slide-in-from-bottom-2"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast must be used within ToastProvider");
  return c;
}
