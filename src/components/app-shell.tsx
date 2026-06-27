import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./bottom-nav";

const titles: Record<string, string> = {
  "/": "Anyramp",
  "/history": "History",
  "/security": "Security",
  "/settings": "Settings",
  "/ramp": "New order",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Anyramp";

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-background/80 px-5 pb-3 pt-8 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-foreground">
            <span className="size-3 rotate-45 rounded-[2px] bg-background" />
          </span>
          <span className="font-medium tracking-tight">{title}</span>
        </Link>
        <Link
          to="/settings"
          aria-label="Account"
          className="grid size-10 place-items-center rounded-full bg-surface-muted ring-1 ring-black/5 transition-transform active:scale-95"
        >
          <span className="font-serif text-sm italic text-muted-foreground">a</span>
        </Link>
      </header>

      <main className="flex-1">{children}</main>

      <BottomNav />
    </div>
  );
}
