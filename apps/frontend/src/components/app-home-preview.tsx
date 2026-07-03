import { Coins, House, ReceiptText, Settings2, ShieldCheck } from "lucide-react";
import {
  HomeAssetAmount,
  HomeBalanceAmount,
  HomeBalanceSubtitle,
} from "@/components/home-balance-display";
import { UsdcIcon } from "@/components/usdc-icon";
import { DEMO_WALLET_ADDRESS, DEMO_WALLET_SHORT, PREVIEW_USDC_BALANCE } from "@/lib/demo-wallet";

/** Height of the static preview canvas — cropped below the nav for a tighter hero mock. */
export const PREVIEW_SCREEN_H = 680;

/** Static home screen for the landing-page iPhone mock — no iframe, no wallet provider. */
export function AppHomePreview() {
  return (
    <div
      className="pointer-events-none relative flex w-[393px] flex-col overflow-hidden bg-background text-foreground"
      style={{ height: PREVIEW_SCREEN_H }}
    >
      <header className="flex items-center justify-between px-5 pb-3 pt-8">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-full bg-foreground">
            <span className="size-3 rotate-45 rounded-[2px] bg-background" />
          </span>
          <span className="font-medium tracking-tight">Anyramp</span>
        </div>
        <div className="flex max-w-[7rem] items-center gap-2 rounded-full bg-surface-muted py-1.5 pl-3 pr-1.5 ring-1 ring-black/5">
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {DEMO_WALLET_SHORT}
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface ring-1 ring-black/5">
            <span className="text-sm font-medium text-foreground">{DEMO_WALLET_ADDRESS[1]}</span>
          </span>
        </div>
      </header>

      <main>
        <section className="px-5 pb-6 pt-4">
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">
              Wallet balance <span className="text-foreground/70">· {DEMO_WALLET_SHORT}</span>
            </span>
            <div className="flex items-baseline gap-2">
              <HomeBalanceAmount balance={PREVIEW_USDC_BALANCE} />
              <span className="text-sm font-medium text-accent">USDC</span>
            </div>
            <HomeBalanceSubtitle
              settledCount={2}
              hint="Buy USDC to any Stellar address"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <span className="group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary">
              <span aria-hidden className="border-beam rounded-full" />
              <svg className="relative size-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
              </svg>
              <span className="relative">Buy crypto</span>
            </span>
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-3 py-2 text-sm font-medium text-foreground ring-1 ring-black/5">
              <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M2.5 8a.75.75 0 0 1 .75-.75h6.69L7.22 4.53a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.72-2.72H3.25A.75.75 0 0 1 2.5 8Z" />
              </svg>
              <span className="truncate">Transfer</span>
            </span>
          </div>
          <div className="mt-2">
            <span className="relative flex w-full items-center justify-center gap-1.5 rounded-full bg-surface-muted/60 px-3 py-2 text-sm font-medium text-muted-foreground/50 ring-1 ring-black/5">
              <span className="truncate">Sell to fiat</span>
              <span className="shrink-0 rounded-full bg-surface px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                Coming soon
              </span>
            </span>
          </div>
        </section>

        <section className="mt-10 px-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Your assets</h3>
            <span className="text-[11px] font-medium text-accent">Stellar testnet</span>
          </div>
          <div className="-mx-2 flex items-center justify-between rounded-2xl px-2 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted">
                <UsdcIcon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">USD Coin</p>
                <p className="text-xs text-muted-foreground">USDC</p>
              </div>
            </div>
            <div className="text-right">
              <HomeAssetAmount balance={PREVIEW_USDC_BALANCE} />
            </div>
          </div>
        </section>
      </main>

      <nav className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-full border border-black/5 bg-surface/90 px-2 py-1.5 shadow-lift backdrop-blur-xl">
        {[
          { label: "Home", Icon: House, active: true },
          { label: "Earn", Icon: Coins, active: false },
          { label: "History", Icon: ReceiptText, active: false },
          { label: "Security", Icon: ShieldCheck, active: false },
          { label: "Settings", Icon: Settings2, active: false },
        ].map(({ label, Icon, active }) => (
          <span
            key={label}
            className="relative flex flex-1 flex-col items-center gap-0.5 px-1 py-1.5"
          >
            <span className="relative flex h-9 w-14 items-center justify-center">
              {active ? (
                <span className="absolute inset-x-1 inset-y-0 rounded-full bg-foreground/8" />
              ) : null}
              <Icon
                className={`relative size-[18px] ${active ? "text-foreground" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.25 : 1.75}
              />
            </span>
            <span
              className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
          </span>
        ))}
      </nav>
    </div>
  );
}
