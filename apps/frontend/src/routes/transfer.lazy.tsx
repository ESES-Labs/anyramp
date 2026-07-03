import { memo, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { Sheet } from "@/components/sheet";
import { StellarIcon } from "@/components/stellar-icon";
import { UsdcIcon } from "@/components/usdc-icon";
import { useToast } from "@/components/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import {
  generateTransferId,
  generateTxHash,
  isValidStellarAddress,
  QUICK_AMOUNTS,
  saveTransfer,
  shortenAddress,
  WALLET_BALANCES,
  type TransferAsset,
} from "@/lib/transfers";

export const Route = createLazyFileRoute("/transfer")({
  component: TransferPage,
});

type Stage = "idle" | "review" | "signing" | "broadcasting" | "done";

const DEMO_DESTINATION = "GDQPBP5V24XERJ527XHUX2Z5KFVC2P3HHYFLMHEXKPNE2E5GBSTGOB";

function TransferPage() {
  const { asset: initialAsset } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { show } = useToast();
  const wallet = useWallet();
  const [, startTransition] = useTransition();

  const [asset, setAsset] = useState<TransferAsset>(initialAsset);
  const [amount, setAmount] = useState(initialAsset === "USDC" ? "500" : "1000");
  const [destination, setDestination] = useState("");
  const [memo, setMemo] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [transferId, setTransferId] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    setAsset(initialAsset);
    setAmount(initialAsset === "USDC" ? "500" : "1000");
  }, [initialAsset]);

  useEffect(() => {
    if (wallet.destination && wallet.destination.mode !== "embedded") {
      setDestination(wallet.destination.address);
    }
  }, [wallet.destination]);

  useEffect(() => {
    if (stage === "signing") {
      const t = setTimeout(() => setStage("broadcasting"), 1200);
      return () => clearTimeout(t);
    }
    if (stage === "broadcasting") {
      const t = setTimeout(() => {
        const id = generateTransferId();
        const hash = generateTxHash();
        const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;
        saveTransfer({
          id,
          asset,
          amount: numericAmount,
          destination: destination.trim(),
          memo: memo.trim() || undefined,
          txHash: hash,
          createdAt: new Date().toISOString(),
        });
        setTransferId(id);
        setTxHash(hash);
        setStage("done");
      }, 1600);
      return () => clearTimeout(t);
    }
  }, [stage, asset, amount, destination, memo]);

  const numericAmount = Number(amount.replace(/[^\d.]/g, "")) || 0;
  const walletBalance = WALLET_BALANCES[asset];
  const insufficient = numericAmount > walletBalance;
  const invalidAddress = destination.length > 0 && !isValidStellarAddress(destination);
  const canSubmit =
    numericAmount > 0 && !insufficient && isValidStellarAddress(destination);

  const inProgress = stage === "signing" || stage === "broadcasting";
  const dismissible = !inProgress;

  const closeSheet = () => {
    if (inProgress) return;
    setStage("idle");
  };

  const sheetTitle =
    stage === "done" ? "Transfer sent" : inProgress ? "Sending" : "Review transfer";

  const selectAsset = (next: TransferAsset) => {
    setAsset(next);
    navigate({ search: { asset: next }, replace: true });
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
        <h1 className="mt-4 font-serif text-3xl tracking-tight">Transfer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send crypto to any Stellar wallet on mainnet.
        </p>
      </div>

      <div className="mt-6 px-5">
        <div className="relative grid grid-cols-2 rounded-full bg-surface-muted p-1 ring-1 ring-black/5">
          {(["USDC", "XLM"] as const).map((a) => {
            const active = asset === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => selectAsset(a)}
                className="relative z-10 rounded-full py-2 text-sm font-medium transition-colors"
              >
                {active && (
                  <span className="absolute inset-0 -z-10 rounded-full bg-surface shadow-quiet ring-1 ring-black/5" />
                )}
                <span
                  className={`inline-flex items-center justify-center gap-1.5 ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {a === "USDC" ? (
                    <UsdcIcon className="size-3.5" />
                  ) : (
                    <StellarIcon className="size-3.5 text-foreground" />
                  )}
                  {a}
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
              You send
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
              aria-label="Transfer amount"
            />
            <span className="text-sm font-medium text-muted-foreground">{asset}</span>
          </div>
          {insufficient && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Insufficient balance for this transfer.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_AMOUNTS[asset].map((q) => (
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
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
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
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">
          Stellar wallet address
        </h2>
        <div className="rounded-3xl bg-surface p-4 shadow-quiet ring-1 ring-black/5">
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="G…"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-muted-foreground/50"
            aria-label="Destination Stellar address"
            aria-invalid={invalidAddress}
          />
          {invalidAddress && (
            <p className="mt-2 text-xs font-medium text-destructive">
              Enter a valid Stellar address (starts with G, 56 characters).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={wallet.isConnecting}
              onClick={() => void wallet.connectExternalWallet()}
              className="text-xs font-medium text-foreground ring-1 ring-black/10 rounded-full px-3 py-1.5 disabled:opacity-60"
            >
              {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
            <button
              type="button"
              onClick={() => setDestination(DEMO_DESTINATION)}
              className="text-xs font-medium text-accent"
            >
              Paste demo address
            </button>
          </div>
          {wallet.error ? (
            <p className="mt-2 text-xs text-destructive">{wallet.error}</p>
          ) : null}
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">
          Memo <span className="font-normal">(optional)</span>
        </h2>
        <div className="rounded-3xl bg-surface px-4 py-3.5 shadow-quiet ring-1 ring-black/5">
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, 28))}
            placeholder="Payment reference"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            aria-label="Transfer memo"
          />
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/60 px-4 py-3 ring-1 ring-accent/10">
          <StellarIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
          <p className="text-xs leading-relaxed text-foreground/80">
            Transfers settle directly on Stellar mainnet. Double-check the destination address —
            on-chain sends cannot be reversed.
          </p>
        </div>
      </section>

      <section className="mt-8 px-5 pb-6">
        <button
          type="button"
          onClick={() => startTransition(() => setStage("review"))}
          disabled={!canSubmit}
          className="w-full rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Review transfer
        </button>
      </section>

      <Sheet
        open={stage !== "idle"}
        onClose={closeSheet}
        dismissible={dismissible}
        title={sheetTitle}
      >
        {stage === "review" && (
          <ReviewTransferContent
            asset={asset}
            amount={amount}
            destination={destination.trim()}
            memo={memo.trim()}
            onConfirm={() => setStage("signing")}
          />
        )}

        {inProgress && (
          <div className="space-y-5 py-3">
            <TransferStep label="Signing with wallet" done={stage === "broadcasting"} active={stage === "signing"} />
            <TransferStep label="Broadcasting on Stellar" done={false} active={stage === "broadcasting"} />
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Keep the app open until the transaction confirms.
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
              {amount} {asset} sent to {shortenAddress(destination.trim(), 6)}.
            </p>
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Transfer ID</p>
              <p className="mt-0.5 font-mono text-sm">{transferId}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Tx hash</p>
              <p className="mt-0.5 break-all font-mono text-xs">{txHash}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(txHash).catch(() => {});
                  show("Tx hash copied");
                }}
                className="flex-1 rounded-full bg-surface py-3 text-sm font-medium ring-1 ring-black/10"
              >
                Copy hash
              </button>
              <Link
                to="/history"
                replace
                className="flex flex-1 items-center justify-center rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
              >
                View history
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

const ReviewTransferContent = memo(function ReviewTransferContent({
  asset,
  amount,
  destination,
  memo,
  onConfirm,
}: {
  asset: TransferAsset;
  amount: string;
  destination: string;
  memo: string;
  onConfirm: () => void;
}) {
  const destShort = useMemo(() => shortenAddress(destination, 6), [destination]);

  return (
    <div className="space-y-4">
      <Row label="You send" value={`${amount} ${asset}`} />
      <Row label="To" value={destShort} />
      <Row label="Full address" value={<span className="font-mono text-xs">{destination}</span>} />
      {memo ? <Row label="Memo" value={memo} /> : null}
      <Row label="Network" value="Stellar mainnet" />
      <Row label="Network fee" value="0.00001 XLM" />
      <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
        Confirm only if you trust this address. Stellar transfers are final once submitted.
      </div>
      <button
        type="button"
        onClick={onConfirm}
        className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Confirm & send
      </button>
    </div>
  );
});

function TransferStep({
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
