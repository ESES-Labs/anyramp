import { useEffect, useRef, useSyncExternalStore } from "react";
import { createLazyFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Droplets, TrendingUp } from "lucide-react";
import { AssetIcon } from "@/components/asset-icon";
import { PaymentGatewayBadges } from "@/components/payment-gateway-picker";
import { formatFiat } from "@/lib/currencies";
import {
  formatDeposited,
  formatEarned,
  getLiquidityPositions,
  getLiquidityPositionsServerSnapshot,
  poolLabel,
  subscribeLiquidityPositions,
  totalStats,
  type LiquidityPosition,
} from "@/lib/liquidity";

export const Route = createLazyFileRoute("/earn")({
  component: EarnRoute,
});

function EarnRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/earn") return <Outlet />;
  return <EarnPage />;
}

function EarnPage() {
  const { highlight } = Route.useSearch();
  const positions = useSyncExternalStore(
    subscribeLiquidityPositions,
    getLiquidityPositions,
    getLiquidityPositionsServerSnapshot,
  );
  const stats = totalStats(positions);
  const positionsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!highlight) return;
    const row = document.getElementById(`position-${highlight}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    positionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlight, positions.length]);

  return (
    <>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">Earn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supply liquidity for onramp and top-up. Settled trustlessly on Stellar.
        </p>
      </div>

      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-quiet ring-1 ring-black/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total earnings
              </p>
              <p className="mt-1 font-serif text-3xl tracking-tight">
                {formatFiat(stats.earnedFiat, "IDR")}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
                <TrendingUp className="size-3.5" />
                +12.4% this month
              </p>
            </div>
            <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent ring-1 ring-accent/15">
              {stats.avgApy.toFixed(1)}% avg APY
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <Stat label="Active liquidity" value={formatFiat(stats.activeLiquidity, "IDR")} />
            <Stat label="Open positions" value={String(stats.count)} />
          </div>
        </div>
      </section>

      <section className="mt-8 px-5">
        <Link
          to="/earn/add-liquidity"
          search={{ pool: "onramp" }}
          className="group flex items-center justify-between rounded-3xl bg-primary px-5 py-4 text-primary-foreground shadow-lift ring-1 ring-primary transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-background/10">
              <Droplets className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Add liquidity</p>
              <p className="text-xs text-primary-foreground/70">Onramp or top-up crypto pools</p>
            </div>
          </div>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      <section ref={positionsRef} id="earn-positions" className="mt-8 px-5 pb-6">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Your positions</h2>
        <ul className="space-y-2">
          {positions.map((p) => (
            <PositionRow key={p.id} position={p} highlighted={p.id === highlight} />
          ))}
        </ul>
      </section>
    </>
  );
}

function PositionRow({
  position: p,
  highlighted = false,
}: {
  position: LiquidityPosition;
  highlighted?: boolean;
}) {
  return (
    <li
      id={`position-${p.id}`}
      className={`flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 transition-shadow ${
        highlighted
          ? "shadow-quiet ring-2 ring-accent"
          : "ring-1 ring-black/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-surface-muted">
          <AssetIcon
            asset={p.asset === "USDC" ? "usdc" : "stellar"}
            className="size-5 text-foreground"
          />
        </span>
        <div>
          <p className="text-sm font-medium">{poolLabel(p.pool)}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {formatDeposited(p.deposited, p.asset)}
            </p>
            {p.pool === "onramp" && p.paymentGateways.length > 0 && (
              <PaymentGatewayBadges ids={p.paymentGateways} />
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-accent">{formatEarned(p.earnedFiat)}</p>
        <p className="text-xs text-muted-foreground">{p.apy}% APY</p>
      </div>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
