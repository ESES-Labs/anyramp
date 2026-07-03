import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  HomeAssetAmount,
  HomeBalanceAmount,
  HomeBalanceSubtitle,
} from "@/components/home-balance-display";
import { UsdcIcon } from "@/components/usdc-icon";
import { api, type BackendOrder } from "@/lib/api";
import { DEMO_WALLET_ADDRESS, getConnectedWalletAddress } from "@/lib/demo-wallet";
import { useWallet } from "@/components/wallet/wallet-provider";

const usdc = (stroops: string) => Number(stroops) / 1e7;

export function AppHomePage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [onchainUsdc, setOnchainUsdc] = useState(0);
  const wallet = useWallet();
  const connectedAddress = getConnectedWalletAddress(wallet);
  const address = connectedAddress ?? DEMO_WALLET_ADDRESS;
  const balance = connectedAddress ? onchainUsdc : null;

  useEffect(() => {
    if (!connectedAddress) {
      setOrders([]);
      setOnchainUsdc(0);
      return;
    }
    const load = () => {
      api
        .listOrders()
        .then(setOrders)
        .catch(() => {});
      api
        .usdcBalance(connectedAddress)
        .then((b) => setOnchainUsdc(Number(b.balance) || 0))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [connectedAddress]);

  const mine = orders.filter((o) => o.buyerAddress === connectedAddress);
  const fulfilled = mine.filter((o) => o.status === "fulfilled");
  const active = mine.find((o) => !["fulfilled", "expired"].includes(o.status));

  return (
    <>
      <BalanceSection
        balance={balance}
        settledCount={fulfilled.length}
        address={wallet.shorten(address)}
        subtitleHint={connectedAddress ? undefined : "Buy USDC to any Stellar address"}
      />
      {connectedAddress && active && <ActiveOrderCard order={active} />}
      <AssetsSection balance={balance} />
    </>
  );
}

function BalanceSection({
  balance,
  settledCount,
  address,
  subtitleHint,
}: {
  balance: number | null;
  settledCount: number;
  address: string;
  subtitleHint?: string;
}) {
  return (
    <section className="px-5 pb-6 pt-4">
      <div className="space-y-1">
        <span className="text-sm font-medium text-muted-foreground">
          Wallet balance <span className="text-foreground/70">· {address}</span>
        </span>
        <div className="flex items-baseline gap-2">
          <HomeBalanceAmount balance={balance} />
          <span className="text-sm font-medium text-accent">USDC</span>
        </div>
        <HomeBalanceSubtitle settledCount={settledCount} hint={subtitleHint} />
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          to="/ramp"
          search={{ side: "buy" as const }}
          className="group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-1 ring-primary transition-transform active:scale-[0.98]"
        >
          <span aria-hidden className="border-beam rounded-full" />
          <svg className="relative size-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
          <span className="relative">Buy crypto</span>
        </Link>
        <Link
          to="/transfer"
          search={{ asset: "USDC" as const }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-surface px-3 py-2 text-sm font-medium text-foreground ring-1 ring-black/5 transition-transform active:scale-[0.98]"
        >
          <svg className="size-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M2.5 8a.75.75 0 0 1 .75-.75h6.69L7.22 4.53a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.72-2.72H3.25A.75.75 0 0 1 2.5 8Z" />
          </svg>
          <span className="truncate">Transfer</span>
        </Link>
      </div>
      <div className="mt-2">
        <span
          aria-disabled="true"
          className="relative flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-full bg-surface-muted/60 px-3 py-2 text-sm font-medium text-muted-foreground/50 ring-1 ring-black/5"
        >
          <span className="truncate">Sell to fiat</span>
          <span className="shrink-0 rounded-full bg-surface px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
        </span>
      </div>
    </section>
  );
}

const STEP_LABEL: Record<string, string> = {
  created: "Awaiting payment",
  paid_detected: "Payment detected",
  proving: "Verifying zkTLS proof",
  proved: "zkTLS proof ready",
};

function ActiveOrderCard({ order }: { order: BackendOrder }) {
  const paid = order.status !== "created";
  const proofDone = order.status === "proved";
  return (
    <section className="px-4">
      <div className="block w-full rounded-3xl bg-surface p-5 text-left shadow-quiet ring-1 ring-black/5">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-medium text-foreground">Order in progress</span>
          </div>
          <span className="max-w-[9rem] truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {order.orderId}
          </span>
        </header>

        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Buying</p>
            <p className="text-2xl font-medium tracking-tight">
              {usdc(order.usdcAmount).toFixed(2)}{" "}
              <span className="font-serif italic text-muted-foreground">USDC</span>
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs text-muted-foreground">You pay</p>
            <p className="text-sm font-medium">Rp{order.amountIdr.toLocaleString("id-ID")}</p>
          </div>
        </div>

        <ol className="space-y-1">
          <Step state={paid ? "done" : "active"} title="Payment via QRIS" last={false} />
          <Step
            state={proofDone ? "done" : order.status === "proving" ? "active" : "upcoming"}
            title={STEP_LABEL[order.status] ?? "zkTLS proof"}
            last={false}
          />
          <Step state="upcoming" title="Verify & settle on Stellar" last />
        </ol>
      </div>
    </section>
  );
}

function Step({
  state,
  title,
  last,
}: {
  state: "done" | "active" | "upcoming";
  title: string;
  last: boolean;
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
      </div>
    </li>
  );
}

function AssetsSection({ balance }: { balance: number | null }) {
  return (
    <section className="mt-10 px-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Your assets</h3>
        <span className="text-[11px] font-medium text-accent">Stellar testnet</span>
      </div>
      <ul className="space-y-2">
        <li>
          <Link
            to="/transfer"
            search={{ asset: "USDC" as const }}
            className="-mx-2 flex items-center justify-between rounded-2xl px-2 py-2 transition-colors active:bg-surface-muted"
          >
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
              <HomeAssetAmount balance={balance} />
            </div>
          </Link>
        </li>
      </ul>
    </section>
  );
}
