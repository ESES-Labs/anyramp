import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { DEMO_WALLET_ADDRESS, DEMO_WALLET_SHORT, getConnectedWalletAddress } from "@/lib/demo-wallet";
import { BottomNav } from "./bottom-nav";
import { PageTransition } from "./page-transition";
import { useWallet } from "./wallet/wallet-provider";
import { ConnectModalProvider } from "./wallet/connect-modal";

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
  const realAddr = getConnectedWalletAddress(wallet);
  const addr = realAddr ?? DEMO_WALLET_ADDRESS;
  const walletLabel = realAddr ? wallet.shorten(addr) : DEMO_WALLET_SHORT;
  const avatarChar = wallet.embeddedEmail?.[0]?.toUpperCase() ?? addr[1];

  return (
    <Link
      to="/settings"
      aria-label="Account"
      className="flex max-w-[7rem] items-center gap-2 rounded-full bg-surface-muted py-1.5 pl-3 pr-1.5 ring-1 ring-black/5 transition-transform active:scale-95"
    >
      <span className="truncate font-mono text-[11px] text-muted-foreground">{walletLabel}</span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-black/5">
        <span className="text-sm font-medium text-foreground">{avatarChar}</span>
      </span>
    </Link>
  );
}
