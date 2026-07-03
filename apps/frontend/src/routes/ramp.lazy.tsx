import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sheet } from "@/components/sheet";
import { ProofSheet } from "@/components/proof-viewer";
import { StellarIcon } from "@/components/stellar-icon";
import { UsdcIcon } from "@/components/usdc-icon";
import { useToast } from "@/components/toast";
import {
  DestinationPicker,
  hasValidDestination,
  resolveDestinationAddress,
  type DestinationChoice,
} from "@/components/wallet/destination-picker";
import { useWallet } from "@/components/wallet/wallet-provider";
import {
  CURRENCY_RATES,
  formatFiat,
  rateLabel,
  usdcFromFiat,
  type CurrencyCode,
} from "@/lib/currencies";
import { QRCodeSVG } from "qrcode.react";
import { api, EXPLORER_TX, type BackendOrder } from "@/lib/api";
import { STELLAR_NETWORK } from "@/lib/stellar-address";

const FIAT_CURRENCY: CurrencyCode = "IDR";
const QUICK_AMOUNTS = ["100000", "250000", "500000", "1000000"];

export const Route = createLazyFileRoute("/ramp")({
  component: RampPage,
});

const paymentMethod = {
  id: "qris",
  label: "QRIS",
  sub: "Quick Response Indonesian Standard · instant",
  logo: "/QRIS.png",
} as const;

type Stage = "idle" | "review" | "creating" | "pay" | "proving" | "claim" | "settling" | "done";

// Seller/LP that locks USDC in the escrow for demo orders (testnet).
const DEMO_SELLER = "GAW24ZON4HHNOOO6SD33ZBZR6DNEFIRWJSIANJ5Q2CYTSC5UCQJEKKQC";

function RampPage() {
  const { side } = Route.useSearch();
  const navigate = Route.useNavigate();
  const goto = useNavigate();
  const { show } = useToast();
  const wallet = useWallet();
  const [amount, setAmount] = useState("250000");
  const [stage, setStage] = useState<Stage>("idle");
  const [destChoice, setDestChoice] = useState<DestinationChoice>("manual");
  const [manualAddress, setManualAddress] = useState("");
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [proofOpen, setProofOpen] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const destinationAddress = useMemo(
    () => resolveDestinationAddress(destChoice, wallet, manualAddress),
    [destChoice, wallet, manualAddress, wallet.destination],
  );

  const canReview =
    Boolean(amount && Number(amount) > 0) &&
    hasValidDestination(destChoice, wallet, manualAddress);

  const usdc = useMemo(() => {
    const n = Number(amount.replace(/[^\d.]/g, "")) || 0;
    return usdcFromFiat(n, FIAT_CURRENCY);
  }, [amount]);

  const isBuy = side === "buy";

  useEffect(() => {
    if (side === "sell") {
      navigate({ search: { side: "buy" }, replace: true });
    }
  }, [side, navigate]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  // 1. Create the order on the backend — issues a real Pakasir QRIS.
  const createOrder = async () => {
    setFlowError(null);
    setStage("creating");
    try {
      const orderId = `ANYRAMP-${Date.now()}`;
      const stroops = String(Math.round(Number(usdc) * 1e7)); // USDC has 7 decimals on Stellar
      const created = await api.createOrder({
        orderId,
        amountIdr: Number(amount),
        usdcAmount: stroops,
        sellerAddress: DEMO_SELLER,
        buyerAddress: destinationAddress ?? undefined,
      });
      // Seller/LP locks the USDC into the on-chain escrow (matched peer).
      await api.lock(orderId);
      setOrder(created);
      setStage("pay");
    } catch (e) {
      setFlowError((e as Error).message);
      setStage("review");
    }
  };

  // Claim once the proof is ready. External wallet: Freighter signs. Embedded (Privy/local):
  // fund testnet account, add trustline, then sign fulfill so USDC lands in the buyer wallet.
  const claimToWallet = async () => {
    if (!order) return;
    setFlowError(null);
    setStage("settling");
    try {
      let hash: string;
      if (wallet.destination?.mode === "external" && destinationAddress) {
        const { signXdrWithExternalWallet } = await import("@/lib/stellar-kit");
        const tl = await api.trustline(destinationAddress);
        if (tl.xdr) {
          const signedTl = await signXdrWithExternalWallet(tl.xdr, destinationAddress);
          await api.submitClassic(signedTl);
        }
        const { xdr } = await api.settle(order.orderId, destinationAddress);
        const signed = await signXdrWithExternalWallet(xdr, destinationAddress);
        ({ hash } = await api.submit(order.orderId, signed));
      } else if (destinationAddress) {
        await api.fundTestnetAccount(destinationAddress).catch(() => {});
        const tl = await api.trustline(destinationAddress);
        if (tl.xdr) {
          const signedTl = await wallet.signEmbeddedXdr(tl.xdr, destinationAddress);
          await api.submitClassic(signedTl);
        }
        const { xdr } = await api.settle(order.orderId, destinationAddress);
        const signed = await wallet.signEmbeddedXdr(xdr, destinationAddress);
        ({ hash } = await api.submit(order.orderId, signed));
      } else {
        ({ hash } = await api.settleAuto(order.orderId));
      }
      setTxHash(hash);
      setOrder((o) => (o ? { ...o, status: "fulfilled" } : o));
      setStage("done");
    } catch (e) {
      setFlowError((e as Error).message);
      setStage("claim");
    }
  };

  // Real settlement: while the QR is on screen, poll the backend. It confirms the Pakasir
  // payment and, once paid, runs the zkTLS prove → on-chain settle pipeline. We reflect the
  // live `status` and finish when the order is fulfilled (with its settlement tx).
  useEffect(() => {
    if (stage !== "pay" || !order) return;
    let cancelled = false;
    const orderId = order.orderId;
    const tick = async () => {
      try {
        const updated = await api.settleReal(orderId);
        if (cancelled) return;
        setOrder(updated);
        if (updated.status === "proved") {
          // Payment confirmed & proof ready — hand off to the claim step (wallet signs).
          stopPolling();
          void claimToWallet();
        } else if (updated.status === "fulfilled") {
          stopPolling();
          setTxHash(updated.txHash);
          setStage("done");
        }
      } catch {
        // transient RPC/proving hiccup — keep polling
      }
    };
    void tick();
    pollRef.current = setInterval(() => void tick(), 4000);
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, order?.orderId]);

  const closeSheet = () => {
    stopPolling();
    setStage("idle");
  };

  return (
    <>
      <div className="px-5 pt-2">
        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06l-3.25-3.25a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" />
          </svg>
          Home
        </Link>
        <h1 className="mt-4 font-serif text-3xl tracking-tight">
          {isBuy ? "Buy crypto" : "Sell to fiat"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Matched peer-to-peer. Settled trustlessly on Stellar.
        </p>
      </div>

      <div className="mt-6 px-5">
        <div className="relative grid grid-cols-2 rounded-full bg-surface-muted p-1 ring-1 ring-black/5">
          {(["buy", "sell"] as const).map((s) => {
            const active = side === s;
            const disabled = s === "sell";
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && navigate({ search: { side: s } })}
                className={`relative z-10 rounded-full py-2 text-sm font-medium transition-colors ${
                  disabled ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {active && !disabled && (
                  <motion.span
                    layoutId="ramp-switch-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-surface shadow-quiet ring-1 ring-black/5"
                  />
                )}
                <span
                  className={`inline-flex items-center justify-center gap-1.5 ${
                    active && !disabled ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s === "buy" ? "Onramp" : "Offramp"}
                  {disabled && (
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground ring-1 ring-black/5">
                      Coming soon
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-quiet ring-1 ring-black/5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isBuy ? "You pay" : "You sell"}
          </label>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-2xl italic text-muted-foreground">
              {isBuy ? "Rp" : ""}
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full bg-transparent text-4xl font-medium tracking-tight outline-none"
              aria-label="Amount"
            />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              {isBuy ? (
                "IDR"
              ) : (
                <>
                  <UsdcIcon className="size-4" />
                  USDC
                </>
              )}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/5 transition-colors active:text-foreground"
              >
                {isBuy ? formatFiat(Number(q), FIAT_CURRENCY) : `${q} USDC`}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">You receive</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              {isBuy ? (
                <>
                  {usdc}
                  <UsdcIcon className="size-4" />
                  USDC
                </>
              ) : (
                formatFiat(Number(usdc) * CURRENCY_RATES[FIAT_CURRENCY], FIAT_CURRENCY)
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rate</span>
            <span className="text-xs font-medium">{rateLabel(FIAT_CURRENCY)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Network fee</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium">
              0.00001
              <StellarIcon className="size-3.5 text-foreground" />
              XLM
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">Payment method</h2>
        <div className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 ring-1 ring-foreground">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
              <img
                src={paymentMethod.logo}
                alt="QRIS"
                className="h-6 w-auto object-contain"
              />
            </span>
            <div>
              <p className="text-sm font-medium">{paymentMethod.label}</p>
              <p className="text-xs text-muted-foreground">{paymentMethod.sub}</p>
            </div>
          </div>
          <span className="grid size-5 place-items-center rounded-full bg-foreground ring-1 ring-foreground">
            <span className="size-1.5 rounded-full bg-background" />
          </span>
        </div>
      </section>

      <section className="mt-6 px-4">
        <DestinationPicker
          choice={destChoice}
          manualAddress={manualAddress}
          onChoiceChange={setDestChoice}
          onManualAddressChange={setManualAddress}
        />
      </section>

      <section className="mt-6 px-5">
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/60 px-4 py-3 ring-1 ring-accent/10">
          <svg className="mt-0.5 size-4 shrink-0 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 1.2c-1.6.9-3.3 1.4-5 1.5v5.4c0 3 2 5.4 5 6.7 3-1.3 5-3.7 5-6.7V2.7c-1.7-.1-3.4-.6-5-1.5Z" />
          </svg>
          <p className="text-xs leading-relaxed text-foreground/80">
            Your bank details stay private. Anyramp generates a zero-knowledge proof of payment —
            the network verifies it without ever seeing your transfer.
          </p>
        </div>
      </section>

      <section className="mt-8 px-5">
        <button
          onClick={() => setStage("review")}
          disabled={!canReview}
          className="w-full rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Review order
        </button>
      </section>

      <Sheet
        open={stage !== "idle"}
        onClose={closeSheet}
        title={
          stage === "done"
            ? "USDC received"
            : stage === "pay"
              ? "Pay with QRIS"
              : stage === "claim" || stage === "settling"
                ? "Verifying on Stellar"
                : "Review order"
        }
      >
        {flowError && (
          <div className="mb-4 rounded-2xl bg-red-50 p-3 text-xs leading-relaxed text-red-600 ring-1 ring-red-100">
            {flowError}
          </div>
        )}

        {(stage === "review" || stage === "creating") && (
          <div className="space-y-4">
            <Row
              label={isBuy ? "You pay" : "You sell"}
              value={
                isBuy
                  ? formatFiat(Number(amount), FIAT_CURRENCY)
                  : `${amount} USDC`
              }
            />
            <Row
              label="You receive"
              value={isBuy ? `${usdc} USDC` : formatFiat(Number(usdc) * CURRENCY_RATES[FIAT_CURRENCY], FIAT_CURRENCY)}
            />
            <Row label="Payment method" value={paymentMethod.label} />
            <Row label="Destination" value={wallet.shorten(destinationAddress ?? "")} />
            <Row
              label="Full address"
              value={
                <span className="max-w-[12rem] truncate font-mono text-xs">{destinationAddress}</span>
              }
            />
            <Row label="Network" value={`Stellar ${STELLAR_NETWORK}`} />
            <Row label="Network fee" value="0.00001 XLM" />
            <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
              By confirming, a QRIS invoice is issued and the seller's USDC is held in the
              Anyramp escrow on Stellar. A zkTLS proof of your payment releases it — no one
              ever sees your bank details.
            </div>
            <button
              onClick={createOrder}
              disabled={stage === "creating"}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {stage === "creating" ? "Creating order…" : "Confirm & get QRIS"}
            </button>
          </div>
        )}

        {stage === "pay" && order && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Order ID</p>
              <p className="mt-0.5 font-mono text-sm">{order.orderId}</p>
            </div>
            <Row
              label="Total to pay"
              value={formatFiat(order.totalPayment ?? order.amountIdr, FIAT_CURRENCY)}
            />
            {order.status === "created" || order.status === "paid_detected" ? (
              <>
                {order.qrString ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/5">
                    <QRCodeSVG
                      value={order.qrString}
                      size={196}
                      level="M"
                      marginSize={2}
                      imageSettings={{ src: "/QRIS.png", height: 34, width: 34, excavate: true }}
                    />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      QRIS · scan to pay
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <svg className="size-3.5 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                    <path d="M8 1a7 7 0 0 1 7 7h-2a5 5 0 0 0-5-5V1Z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Waiting for your payment…
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Scan with any QRIS app (GoPay, OVO, DANA, mobile banking). This screen updates
                  automatically the moment your payment lands — no refresh needed.
                </p>
              </>
            ) : (
              <div className="space-y-5">
                <div className="space-y-5 py-1">
                  <ProvingStep label="Payment detected" done active={false} />
                  <ProvingStep label="Generating zkTLS proof of your payment" done={false} active />
                  <ProvingStep label="Verifying on-chain & releasing USDC" done={false} active />
                </div>
                <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
                  Payment confirmed. Anyramp is generating a zero-knowledge proof of it and the
                  escrow is verifying it on Stellar — this takes just a few seconds.
                </div>
              </div>
            )}
          </div>
        )}


        {(stage === "claim" || stage === "settling") && (
          <div className="space-y-5">
            <div className="space-y-5 py-1">
              <ProvingStep label="Payment detected" done active={false} />
              <ProvingStep label="zkTLS proof ready" done active={false} />
              <ProvingStep
                label="Sign in your wallet — USDC transfers to you"
                done={false}
                active={stage === "settling"}
              />
            </div>
            <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
              {wallet.destination?.mode === "external"
                ? "Approve the transaction(s) in your wallet. First time, you'll also approve a one-time USDC trustline. The escrow verifies the zk proof on Stellar and sends the USDC straight to your address."
                : "The escrow verifies the zk proof on Stellar and releases the USDC."}
            </div>
            <button
              onClick={() => void claimToWallet()}
              disabled={stage === "settling"}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {stage === "settling"
                ? "Approve in your wallet…"
                : wallet.destination?.mode === "external"
                  ? "Sign & receive USDC"
                  : "Claim USDC"}
            </button>
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
              ZK proof verified on Stellar — the escrow released your USDC.
            </p>
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Order ID</p>
              <p className="mt-0.5 font-mono text-sm">{order?.orderId}</p>
            </div>
            {txHash ? (
              <a
                href={`${EXPLORER_TX}${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl bg-surface p-4 ring-1 ring-black/5 transition-colors hover:ring-accent/30"
              >
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Settlement transaction ↗
                </p>
                <p className="mt-0.5 break-all font-mono text-xs">{txHash}</p>
              </a>
            ) : null}
            <button
              onClick={() => setProofOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-3 text-sm font-medium ring-1 ring-black/5 transition-colors hover:ring-accent/30"
            >
              <svg className="size-4 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1.2c-1.6.9-3.3 1.4-5 1.5v5.4c0 3 2 5.4 5 6.7 3-1.3 5-3.7 5-6.7V2.7c-1.7-.1-3.4-.6-5-1.5Z" />
              </svg>
              View ZK proof
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(order?.orderId ?? "").catch(() => {});
                  show("Order ID copied");
                }}
                className="flex-1 rounded-full bg-surface py-3 text-sm font-medium ring-1 ring-black/10"
              >
                Copy ID
              </button>
              <button
                onClick={() => {
                  closeSheet();
                  goto({ to: "/history" });
                }}
                className="flex-1 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
              >
                View history
              </button>
            </div>
          </div>
        )}
      </Sheet>

      <ProofSheet
        orderId={order?.orderId ?? null}
        open={proofOpen}
        onClose={() => setProofOpen(false)}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function ProvingStep({
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
      <span
        className={`text-sm ${active || done ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
