import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { House, ReceiptText, ShieldCheck, Settings2 } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  to: "/" | "/history" | "/security" | "/settings";
  label: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const items: NavItem[] = [
  { to: "/", label: "Home", Icon: House },
  { to: "/history", label: "History", Icon: ReceiptText },
  { to: "/security", label: "Security", Icon: ShieldCheck },
  { to: "/settings", label: "Settings", Icon: Settings2 },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-[480px] items-center justify-between border-t border-zinc-950/5 bg-surface/85 px-3 py-2 backdrop-blur-xl"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {items.map(({ to, label, Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className="relative flex flex-1 flex-col items-center gap-1 px-2 py-1.5"
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
              className={`text-[10px] font-semibold tracking-wide transition-colors ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
