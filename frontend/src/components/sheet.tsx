import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { registerSheetClosed, registerSheetOpen } from "@/lib/sheet-overlay";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const reduce = useReducedMotion();
  const coarse = useCoarsePointer();
  const lite = reduce || coarse;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setContentReady(false);
      return;
    }
    registerSheetOpen();
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      setContentReady(true);
    });

    return () => {
      cancelAnimationFrame(frame);
      registerSheetClosed();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, dismissible]);

  if (!mounted) return null;

  const backdrop = dismissible ? (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="absolute inset-0 touch-none bg-foreground/45"
    />
  ) : (
    <div aria-hidden className="absolute inset-0 touch-none bg-foreground/45" />
  );

  const header = title ? (
    <div className="shrink-0 flex items-center justify-between px-5 pb-4 pt-3">
      <h2 className="font-serif text-xl tracking-tight">{title}</h2>
      {dismissible && (
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full bg-surface-muted text-muted-foreground ring-1 ring-black/5"
          aria-label="Close sheet"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden>
            <path d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </button>
      )}
    </div>
  ) : null;

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {contentReady ? children : <SheetContentPlaceholder />}
    </div>
  );

  if (lite) {
    if (!open) return null;

    return createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {backdrop}
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "sheet-panel relative mx-auto flex max-h-[90dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-background shadow-lift",
          )}
        >
          <div className="shrink-0 flex justify-center pt-3">
            <span className="h-1 w-10 rounded-full bg-border" />
          </div>
          {header}
          {body}
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet-layer"
          className="fixed inset-0 z-[100] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {backdrop}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className="relative mx-auto flex max-h-[90dvh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-background shadow-lift will-change-transform"
          >
            <div className="shrink-0 flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-border" />
            </div>
            {header}
            {body}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function SheetContentPlaceholder() {
  return (
    <div className="space-y-3 py-2" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex justify-between gap-4">
          <span className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
          <span className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
