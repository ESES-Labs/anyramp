import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { House, ReceiptText, ShieldCheck, Settings2, Coins } from "lucide-react";
import { useSyncExternalStore, type ComponentType } from "react";
import { isAnySheetOpen, subscribeSheetOpen } from "@/lib/sheet-overlay";

function getSheetOpenServerSnapshot() {
  return false;
}

type NavItem = {
  to: "/app" | "/earn" | "/history" | "/security" | "/settings";
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const items: NavItem[] = [
  { to: "/app", label: "Home", Icon: House },
  { to: "/earn", label: "Earn", Icon: Coins },
  { to: "/history", label: "History", Icon: ReceiptText },
  { to: "/security", label: "Security", Icon: ShieldCheck },
  { to: "/settings", label: "Settings", Icon: Settings2 },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sheetOpen = useSyncExternalStore(
    subscribeSheetOpen,
    isAnySheetOpen,
    getSheetOpenServerSnapshot,
  );

  if (sheetOpen) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <nav className="pointer-events-auto flex w-full max-w-[448px] items-center justify-between rounded-full border border-black/5 bg-surface/90 px-2 py-1.5 shadow-lift backdrop-blur-xl">
      {items.map(({ to, label, Icon }) => {
        const active = pathname === to || (to === "/earn" && pathname.startsWith("/earn"));
        return (
          <Link
            key={to}
            to={to}
            className="relative flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5"
          >
            <span className="relative flex h-9 w-14 items-center justify-center">
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-foreground/[0.06] ring-1 ring-black/5"
                />
              )}
              <Icon
                className={`relative size-[20px] transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.25 : 1.75}
              />
            </span>
            <span
              className={`text-[9px] font-semibold tracking-wide transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
      </nav>
    </div>
  );
}
