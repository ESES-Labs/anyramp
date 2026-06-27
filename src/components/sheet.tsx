import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px] animate-in fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-auto flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-background shadow-quiet animate-in slide-in-from-bottom-8"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <h2 className="font-serif text-xl tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-surface-muted text-muted-foreground ring-1 ring-black/5"
              aria-label="Close sheet"
            >
              <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
                <path d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
