import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";
import { useWallet } from "./wallet/wallet-provider";
import { ConnectModalProvider, useConnectModal } from "./wallet/connect-modal";

const APP_ROUTES = new Set(["/app", "/earn", "/earn/add-liquidity", "/history", "/security", "/settings", "/ramp", "/transfer"]);

export function isAppRoute(pathname: string) {
  return APP_ROUTES.has(pathname);
}

const titles: Record<string, string> = {
  "/app": "Anyramp",
  "/earn": "Earn",
  "/earn/add-liquidity": "Add liquidity",
  "/history": "History",
  "/security": "Security",
  "/settings": "Settings",
  "/ramp": "New order",
  "/transfer": "Transfer",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "Anyramp";

  return (
    <ConnectModalProvider>
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-foreground">
        <header className="sticky top-0 z-20 flex items-center justify-between bg-background/80 px-5 pb-3 pt-8 backdrop-blur-md">
          <Link to="/app" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-foreground">
              <span className="size-3 rotate-45 rounded-[2px] bg-background" />
            </span>
            <span className="font-medium tracking-tight">{title}</span>
          </Link>
          <AccountPill />
        </header>

        <main className="relative flex-1">
          <PageTransition>{children}</PageTransition>
        </main>

        <BottomNav />
      </div>
    </ConnectModalProvider>
  );
}

function AccountPill() {
  const wallet = useWallet();
  const { open } = useConnectModal();
  const addr = wallet.embeddedAddress ?? wallet.destination?.address ?? null;
  const walletLabel = addr ? wallet.shorten(addr) : null;
  const avatarChar = wallet.embeddedEmail?.[0]?.toUpperCase() ?? addr?.[1] ?? null;

  const inner = (
    <>
      {walletLabel ? (
        <span className="truncate font-mono text-[11px] text-muted-foreground">{walletLabel}</span>
      ) : (
        <span className="text-[11px] text-muted-foreground">Connect</span>
      )}
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-black/5">
        {avatarChar ? (
          <span className="text-sm font-medium text-foreground">{avatarChar}</span>
        ) : (
          <svg className="size-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 1.25c-2.3 0-4.25 1.32-4.25 3 0 .41.34.75.75.75h7c.41 0 .75-.34.75-.75 0-1.68-1.95-3-4.25-3Z" />
          </svg>
        )}
      </span>
    </>
  );

  const cls =
    "flex max-w-[7rem] items-center gap-2 rounded-full bg-surface-muted py-1.5 pl-3 pr-1.5 ring-1 ring-black/5 transition-transform active:scale-95";

  return walletLabel ? (
    <Link to="/settings" aria-label="Account" className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" aria-label="Connect wallet" onClick={open} className={cls}>
      {inner}
    </button>
  );
}
