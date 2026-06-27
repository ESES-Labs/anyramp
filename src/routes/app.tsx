import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { OrderSheet } from "@/components/order-sheet";
import { activeOrder, type Order } from "@/lib/orders";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anyramp — Trustless onramp & offramp on Stellar" },
      {
        name: "description",
        content:
          "Convert between fiat and Stellar assets peer-to-peer. Every settlement is verified on-chain with a zero-knowledge proof.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [openOrder, setOpenOrder] = useState<Order | null>(null);
  const live = activeOrder();

  return (
    <AppShell>
      <BalanceSection />
      <ActiveOrderCard order={live} onOpen={() => setOpenOrder(live)} />
      <AssetsSection />
      <OrderSheet open={!!openOrder} onClose={() => setOpenOrder(null)} order={openOrder} />
    </AppShell>
  );
}

function BalanceSection() {
  return (
    <section className="px-5 pb-6 pt-4">
      <div className="space-y-1">
        <span className="text-sm font-medium text-muted-foreground">Portfolio balance</span>
        <div className="flex items-baseline gap-2">
          <h1 className="text-4xl font-medium tracking-tight">
            $12,482<span className="text-muted-foreground">.50</span>
          </h1>
          <span className="text-sm font-medium text-accent">+2.4%</span>
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          Settled on Stellar · <span className="font-serif italic">verified by ZK</span>
        </p>
      </div>

      <div className="mt-7 flex gap-3">
        <Link
          to="/ramp"
          search={{ side: "buy" as const }}
          className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-transform active:scale-[0.98]"
        >
          <span aria-hidden className="border-beam rounded-full" />
          <svg className="relative size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span className="relative">Buy crypto</span>
        </Link>
        <Link
          to="/ramp"
          search={{ side: "sell" as const }}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface px-4 py-3 text-sm font-medium text-foreground ring-1 ring-black/5 transition-transform active:scale-[0.98]"
        >
          <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z" />
          </svg>
          Sell to fiat
        </Link>
      </div>
    </section>
  );
}

function ActiveOrderCard({ order, onOpen }: { order: Order; onOpen: () => void }) {
  return (
    <section className="px-4">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-3xl bg-surface p-5 text-left shadow-quiet ring-1 ring-black/5 transition-transform active:scale-[0.99]"
      >
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-medium text-foreground">Order in progress</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            ID {order.id}
          </span>
        </header>

        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">
              {order.kind === "onramp" ? "Buying" : "Selling"}
            </p>
            <p className="text-2xl font-medium tracking-tight">
              {order.amount.replace(/^[+−-]/, "")}{" "}
              <span className="font-serif italic text-muted-foreground">{order.asset}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs text-muted-foreground">Rate</p>
            <p className="text-sm font-medium">{order.rate}</p>
          </div>
        </div>

        <Stepper />

        <span className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full bg-surface-muted py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-black/5">
          Tap to view proof
          <svg className="size-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </button>
    </section>
  );
}

function Stepper() {
  return (
    <ol className="space-y-1">
      <Step state="done" title="Peer matched" subtitle="Verified match found in 1.2s" />
      <Step state="active" title="ZK proof generation" subtitle="Encrypting payment metadata" />
      <Step state="upcoming" title="Settlement on Stellar" subtitle="Awaiting cryptographic verification" last />
    </ol>
  );
}

function Step({
  state,
  title,
  subtitle,
  last,
}: {
  state: "done" | "active" | "upcoming";
  title: string;
  subtitle?: string;
  last?: boolean;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        {state === "done" && (
          <span className="grid size-5 place-items-center rounded-full bg-accent-soft ring-1 ring-accent/15">
            <svg className="size-3 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
        {state === "active" && (
          <span className="grid size-5 place-items-center rounded-full bg-surface-muted ring-1 ring-inset ring-black/5">
            <span className="size-1.5 animate-pulse rounded-full bg-foreground" />
          </span>
        )}
        {state === "upcoming" && (
          <span className="grid size-5 place-items-center rounded-full bg-background ring-1 ring-black/5" />
        )}
        {!last && (
          <span className={`mt-2 h-8 w-px ${state === "done" ? "bg-accent/30" : "bg-border"}`} />
        )}
      </div>
      <div className="pb-4">
        <p
          className={`text-sm font-medium ${
            state === "upcoming" ? "text-muted-foreground" : "text-foreground"
          }`}
        >
          {title}
        </p>
        {subtitle && state !== "active" && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {subtitle && state === "active" && (
          <span className="mt-2 inline-flex items-center gap-2 rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-black/5">
            <svg className="size-3 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" className="opacity-25" />
              <path d="M8 1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5V1Z" fill="currentColor" className="opacity-75" />
            </svg>
            {subtitle}
          </span>
        )}
      </div>
    </li>
  );
}

type Asset = {
  symbol: string;
  name: string;
  amount: string;
  usd: string;
  glyph: "stellar" | "usdc";
  side: "buy" | "sell";
};

const assets: Asset[] = [
  { symbol: "XLM", name: "Stellar", amount: "4,290.00", usd: "$482.10", glyph: "stellar", side: "buy" },
  { symbol: "USDC", name: "USD Coin", amount: "12,000.40", usd: "$12,000.40", glyph: "usdc", side: "buy" },
];

function AssetsSection() {
  return (
    <section className="mt-10 px-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Your assets</h3>
        <span className="text-[11px] font-medium text-accent">Stellar mainnet</span>
      </div>
      <ul className="space-y-2">
        {assets.map((a) => (
          <li key={a.symbol}>
            <Link
              to="/ramp"
              search={{ side: a.side }}
              className="flex items-center justify-between rounded-2xl px-2 py-2 -mx-2 transition-colors active:bg-surface-muted"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AssetGlyph kind={a.glyph} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{a.amount}</p>
                <p className="text-xs text-muted-foreground">{a.usd}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AssetGlyph({ kind }: { kind: Asset["glyph"] }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted">
      {kind === "stellar" ? (
        <span className="grid size-6 place-items-center rounded-full bg-foreground">
          <span className="size-2 rounded-full bg-background" />
        </span>
      ) : (
        <span className="grid size-6 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
          $
        </span>
      )}
    </span>
  );
}
