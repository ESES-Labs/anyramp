import { memo, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Sheet } from "@/components/sheet";
import { AssetIcon } from "@/components/asset-icon";
import { StellarIcon } from "@/components/stellar-icon";
import { UsdcIcon } from "@/components/usdc-icon";
import { useToast } from "@/components/toast";
import { formatFiat, type CurrencyCode } from "@/lib/currencies";
import {
  addLiquidityPosition,
  effectiveRateLabel,
  estimatedMonthlyYield,
  ONRAMP_APY,
  RATE_MARKUP_OPTIONS,
  supportedFiatVolume,
  TOPUP_APY,
  VOLUME_CAP_OPTIONS,
  WALLET_BALANCES,
  type LiquidityAsset,
} from "@/lib/liquidity";
import {
  PaymentGatewayPicker,
  PaymentGatewayReviewRow,
  gatewaysMissingCredentials,
} from "@/components/payment-gateway-picker";
import {
  DEFAULT_ONRAMP_GATEWAYS,
  type PaymentGatewayId,
} from "@/lib/payment-gateways";

const FIAT_CURRENCY: CurrencyCode = "IDR";

export const Route = createLazyFileRoute("/earn/add-liquidity")({
  component: AddLiquidityPage,
});

type Stage = "idle" | "review" | "signing" | "approving" | "locking" | "done";

const quickAmounts: Record<LiquidityAsset, string[]> = {
  USDC: ["500", "1000", "2500", "5000"],
  XLM: ["5000", "10000", "25000", "50000"],
};

function AddLiquidityPage() {
  const { pool } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { show } = useToast();
  const isOnramp = pool === "onramp";
  const asset: LiquidityAsset = isOnramp ? "USDC" : "XLM";

  const [amount, setAmount] = useState(isOnramp ? "1000" : "10000");
  const [markupBps, setMarkupBps] = useState(25);
  const [maxOrderFiat, setMaxOrderFiat] = useState<number>(1_000_000);
  const [selectedGateways, setSelectedGateways] = useState<PaymentGatewayId[]>(
    DEFAULT_ONRAMP_GATEWAYS,
  );
  const [stage, setStage] = useState<Stage>("idle");
  const [positionId, setPositionId] = useState("");
  const [, startTransition] = useTransition();

  const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;

  useEffect(() => {
    setAmount(isOnramp ? "1000" : "10000");
    setMarkupBps(isOnramp ? 25 : 0);
    setMaxOrderFiat(isOnramp ? 1_000_000 : 500_000);
    setSelectedGateways(isOnramp ? DEFAULT_ONRAMP_GATEWAYS : []);
  }, [isOnramp]);

  useEffect(() => {
    if (stage === "signing") {
      const t = setTimeout(() => setStage("approving"), 1200);
      return () => clearTimeout(t);
    }
    if (stage === "approving") {
      const t = setTimeout(() => setStage("locking"), 1400);
      return () => clearTimeout(t);
    }
    if (stage === "locking") {
      const t = setTimeout(() => {
        const position = addLiquidityPosition({
          pool,
          asset,
          deposited: numericAmount,
          rateMarkupBps: markupBps,
          maxOrderFiat,
          paymentGateways: isOnramp ? selectedGateways : [],
          apy: isOnramp ? ONRAMP_APY : TOPUP_APY,
        });
        setPositionId(position.id);
        setStage("done");
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [stage, pool, asset, markupBps, maxOrderFiat, isOnramp, numericAmount, selectedGateways]);

  const walletBalance = WALLET_BALANCES[asset];
  const insufficient = numericAmount > walletBalance;
  const noGatewaysSelected = isOnramp && selectedGateways.length === 0;
  const missingCredentials = isOnramp ? gatewaysMissingCredentials(selectedGateways) : [];
  const estimatedApy = isOnramp ? ONRAMP_APY : TOPUP_APY;

  const supportedFiat = useMemo(
    () => supportedFiatVolume(numericAmount, asset, markupBps),
    [numericAmount, asset, markupBps],
  );

  const monthlyYield = useMemo(
    () => estimatedMonthlyYield(numericAmount, asset, estimatedApy),
    [numericAmount, asset, estimatedApy],
  );

  const rateLabel = useMemo(
    () => effectiveRateLabel(asset, markupBps),
    [asset, markupBps],
  );
  const inProgress = stage === "signing" || stage === "approving" || stage === "locking";
  const dismissible = !inProgress;

  const closeSheet = () => {
    if (inProgress) return;
    setStage("idle");
  };

  const sheetTitle =
    stage === "done"
      ? "Liquidity added"
      : inProgress
        ? "Depositing"
        : "Review deposit";

  return (
    <>
      <div className="px-5 pt-2">
        <Link
          to="/earn"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06l-3.25-3.25a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" />
          </svg>
          Earn
        </Link>
        <h1 className="mt-4 font-serif text-3xl tracking-tight">Add liquidity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fund {isOnramp ? "onramp" : "top-up"} pools and earn yield on every matched order.
        </p>
      </div>

      <div className="mt-6 px-5">
        <div className="relative grid grid-cols-2 rounded-full bg-surface-muted p-1 ring-1 ring-black/5">
          {(["onramp", "topup"] as const).map((p) => {
            const active = pool === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => navigate({ search: { pool: p } })}
                className="relative z-10 rounded-full py-2 text-sm font-medium transition-colors"
              >
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-surface shadow-quiet ring-1 ring-black/5" />
                )}
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {p === "onramp" ? "Onramp" : "Topup crypto"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-quiet ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              You deposit
            </label>
            <span className="text-xs text-muted-foreground">
              Available{" "}
              <span className="font-medium text-foreground">
                {walletBalance.toLocaleString()} {asset}
              </span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              className="w-full bg-transparent text-4xl font-medium tracking-tight outline-none"
              aria-label="Deposit amount"
            />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {asset === "USDC" ? (
                <>
                  <UsdcIcon className="size-4" />
                  USDC
                </>
              ) : (
                <>
                  <StellarIcon className="size-4 text-foreground" />
                  XLM
                </>
              )}
            </span>
          </div>

          {insufficient && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Insufficient balance. Reduce amount or top up your wallet.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {quickAmounts[asset].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(q)}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/5 transition-colors active:text-foreground"
              >
                {q} {asset}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2 border-t border-border pt-4">
            <Row label="Supports volume" value={formatFiat(supportedFiat, FIAT_CURRENCY)} />
            <Row label="Est. monthly yield" value={formatFiat(monthlyYield, FIAT_CURRENCY)} />
            <Row label="Est. APY" value={`${estimatedApy}%`} />
            <Row
              label="Network fee"
              value={
                <span className="inline-flex items-center gap-1">
                  0.00001
                  <StellarIcon className="size-3.5 text-foreground" />
                  XLM
                </span>
              }
            />
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">Your rate</h2>
        <div className="rounded-3xl bg-surface p-4 shadow-quiet ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Effective rate</span>
            <span className="text-sm font-medium">{rateLabel}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {RATE_MARKUP_OPTIONS.map((opt) => {
              const active = markupBps === opt.bps;
              return (
                <button
                  key={opt.bps}
                  type="button"
                  onClick={() => setMarkupBps(opt.bps)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                    active
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-surface-muted text-muted-foreground ring-black/5"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isOnramp
              ? "Higher spread earns more per order but may match less often."
              : "Market rate recommended for faster top-up matching."}
          </p>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">Max order size</h2>
        <div className="flex flex-wrap gap-2">
          {VOLUME_CAP_OPTIONS.map((cap) => {
            const active = maxOrderFiat === cap;
            return (
              <button
                key={cap}
                type="button"
                onClick={() => setMaxOrderFiat(cap)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
                  active
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-surface-muted text-muted-foreground ring-black/5"
                }`}
              >
                {formatFiat(cap, FIAT_CURRENCY)}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          Largest single {isOnramp ? "onramp" : "top-up"} order your pool will serve.
        </p>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">
          {isOnramp ? "Payment gateways" : "Settlement"}
        </h2>
        {isOnramp ? (
          <>
            <PaymentGatewayPicker
              selected={selectedGateways}
              onChange={setSelectedGateways}
            />
            {noGatewaysSelected && (
              <p className="mt-2 px-1 text-xs font-medium text-destructive">
                Select at least one payment gateway for your onramp pool.
              </p>
            )}
            {missingCredentials.length > 0 && (
              <p className="mt-2 px-1 text-xs font-medium text-destructive">
                Connect credentials for all selected gateways before depositing.
              </p>
            )}
            <p className="mt-2 px-1 text-xs text-muted-foreground">
              Buyers can pay through any gateway you enable. You receive fiat settlement from
              each provider you connect.
            </p>
          </>
        ) : (
          <div className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 ring-1 ring-foreground">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-surface-muted ring-1 ring-black/5">
                <StellarIcon className="size-4 text-foreground" />
              </span>
              <div>
                <p className="text-sm font-medium">Direct crypto transfer</p>
                <p className="text-xs text-muted-foreground">Instant XLM top-up · Stellar network</p>
              </div>
            </div>
            <span className="grid size-5 place-items-center rounded-full bg-foreground ring-1 ring-foreground">
              <span className="size-1.5 rounded-full bg-background" />
            </span>
          </div>
        )}
      </section>

      <section className="mt-6 px-5">
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/60 px-4 py-3 ring-1 ring-accent/10">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-background/60">
            <AssetIcon asset={asset === "USDC" ? "usdc" : "stellar"} className="size-4" />
          </span>
          <p className="text-xs leading-relaxed text-foreground/80">
            {isOnramp
              ? "Your USDC backs peer onramps. When a buyer pays via your enabled gateways, your pool releases crypto and you earn spread + yield."
              : "Your XLM tops up wallets instantly. Earn fees every time a user receives crypto from your pool."}
          </p>
        </div>
      </section>

      <section className="mt-8 px-5 pb-6">
        <button
          type="button"
          onClick={() => startTransition(() => setStage("review"))}
          disabled={
            numericAmount <= 0 ||
            insufficient ||
            noGatewaysSelected ||
            missingCredentials.length > 0
          }
          className="w-full rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Review deposit
        </button>
      </section>

      <Sheet
        open={stage !== "idle"}
        onClose={closeSheet}
        dismissible={dismissible}
        title={sheetTitle}
      >
        {stage === "review" && (
          <ReviewDepositContent
            isOnramp={isOnramp}
            asset={asset}
            amount={amount}
            supportedFiat={supportedFiat}
            rateLabel={rateLabel}
            maxOrderFiat={maxOrderFiat}
            estimatedApy={estimatedApy}
            monthlyYield={monthlyYield}
            selectedGateways={selectedGateways}
            onConfirm={() => setStage("signing")}
          />
        )}

        {inProgress && (
          <div className="space-y-5 py-3">
            <DepositStep
              label="Signing with wallet"
              done={stage === "approving" || stage === "locking"}
              active={stage === "signing"}
            />
            <DepositStep
              label={asset === "USDC" ? "Approving USDC trustline" : "Setting XLM trustline"}
              done={stage === "locking"}
              active={stage === "approving"}
            />
            <DepositStep
              label="Locking in pool contract"
              done={false}
              active={stage === "locking"}
            />
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Keep the app open. Deposit settles on Stellar mainnet.
            </p>
          </div>
        )}

        {stage === "done" && (
          <div className="space-y-5">
            <div className="grid place-items-center pt-2">
              <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/15">
                <svg className="size-7" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {amount} {asset} is now active in the {isOnramp ? "onramp" : "top-up"} pool.
            </p>
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Position ID</p>
              <p className="mt-0.5 font-mono text-sm">{positionId}</p>
            </div>
            <div className="rounded-2xl bg-surface-muted/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-black/5">
              Serving up to {formatFiat(maxOrderFiat, FIAT_CURRENCY)} per order at {rateLabel}.
              Earnings accrue as orders match.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(positionId).catch(() => {});
                  show("Position ID copied");
                }}
                className="flex-1 rounded-full bg-surface py-3 text-sm font-medium ring-1 ring-black/10"
              >
                Copy ID
              </button>
              <Link
                to="/earn"
                search={{ highlight: positionId }}
                replace
                className="flex flex-1 items-center justify-center rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
              >
                View positions
              </Link>
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

const ReviewDepositContent = memo(function ReviewDepositContent({
  isOnramp,
  asset,
  amount,
  supportedFiat,
  rateLabel,
  maxOrderFiat,
  estimatedApy,
  monthlyYield,
  selectedGateways,
  onConfirm,
}: {
  isOnramp: boolean;
  asset: LiquidityAsset;
  amount: string;
  supportedFiat: number;
  rateLabel: string;
  maxOrderFiat: number;
  estimatedApy: number;
  monthlyYield: number;
  selectedGateways: PaymentGatewayId[];
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <Row label="Pool" value={isOnramp ? "Onramp · USDC" : "Topup · XLM"} />
      <Row label="You deposit" value={`${amount} ${asset}`} />
      <Row label="Supports volume" value={formatFiat(supportedFiat, FIAT_CURRENCY)} />
      <Row label="Your rate" value={rateLabel} />
      <Row label="Max order size" value={formatFiat(maxOrderFiat, FIAT_CURRENCY)} />
      <Row label="Est. APY" value={`${estimatedApy}%`} />
      <Row label="Est. monthly yield" value={formatFiat(monthlyYield, FIAT_CURRENCY)} />
      {isOnramp ? (
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs text-muted-foreground">Payment gateways</span>
          <PaymentGatewayReviewRow ids={selectedGateways} />
        </div>
      ) : (
        <Row label="Settlement" value="Crypto transfer" />
      )}
      <Row label="Network" value="Stellar mainnet" />
      <Row label="Network fee" value="0.00001 XLM" />
      <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
        By confirming, {asset} is locked in the pool smart contract. You can withdraw unused
        liquidity anytime after the 24h cooldown.
      </div>
      <button
        type="button"
        onClick={onConfirm}
        className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Confirm & deposit
      </button>
    </div>
  );
});

function DepositStep({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-6 place-items-center rounded-full ring-1 ${
          done
            ? "bg-accent-soft text-accent ring-accent/15"
            : active
              ? "bg-surface-muted text-foreground ring-black/5"
              : "bg-background text-muted-foreground ring-black/5"
        }`}
      >
        {done ? (
          <svg className="size-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
              clipRule="evenodd"
            />
          </svg>
        ) : active ? (
          <svg className="size-3 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path d="M8 1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5V1Z" fill="currentColor" className="opacity-75" />
          </svg>
        ) : (
          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
        )}
      </span>
      <span className={`text-sm ${active || done ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
