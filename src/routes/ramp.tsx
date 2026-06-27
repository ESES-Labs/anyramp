import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";

const searchSchema = z.object({
  side: z.enum(["buy", "sell"]).default("buy").catch("buy"),
});

export const Route = createFileRoute("/ramp")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "New order — Anyramp" },
      {
        name: "description",
        content:
          "Start a peer-to-peer onramp or offramp. Settlement is verified end-to-end by a zero-knowledge proof on Stellar.",
      },
    ],
  }),
  component: RampPage,
});

const methods = [
  { id: "sepa", label: "SEPA", sub: "EU bank transfer · 5 min" },
  { id: "card", label: "Card", sub: "Visa / Mastercard · instant" },
  { id: "pix", label: "Pix", sub: "Brazil · instant" },
];

type Stage = "idle" | "review" | "matching" | "proving" | "done";

function RampPage() {
  const { side } = Route.useSearch();
  const navigate = Route.useNavigate();
  const goto = useNavigate();
  const { show } = useToast();
  const [amount, setAmount] = useState("250");
  const [method, setMethod] = useState("sepa");
  const [stage, setStage] = useState<Stage>("idle");

  const usdc = useMemo(() => {
    const n = Number(amount.replace(/[^\d.]/g, "")) || 0;
    return (n * 0.998).toFixed(2);
  }, [amount]);

  const isBuy = side === "buy";

  useEffect(() => {
    if (stage === "matching") {
      const t = setTimeout(() => setStage("proving"), 1400);
      return () => clearTimeout(t);
    }
    if (stage === "proving") {
      const t = setTimeout(() => setStage("done"), 2200);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const closeSheet = () => {
    setStage("idle");
  };

  return (
    <AppShell>
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
            return (
              <button
                key={s}
                onClick={() => navigate({ search: { side: s } })}
                className="relative z-10 rounded-full py-2 text-sm font-medium transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="ramp-switch-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-surface shadow-quiet ring-1 ring-black/5"
                  />
                )}
                <span className={active ? "text-foreground" : "text-muted-foreground"}>
                  {s === "buy" ? "Onramp" : "Offramp"}
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
              {isBuy ? "$" : ""}
            </span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-4xl font-medium tracking-tight outline-none"
              aria-label="Amount"
            />
            <span className="text-sm font-medium text-muted-foreground">
              {isBuy ? "USD" : "USDC"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {["100", "250", "500", "1000"].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/5 transition-colors active:text-foreground"
              >
                {isBuy ? `$${q}` : `${q} USDC`}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">You receive</span>
            <span className="text-sm font-medium">
              {isBuy ? `${usdc} USDC` : `$${usdc} USD`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rate</span>
            <span className="text-xs font-medium">1 USDC = 1.00 USD</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Network fee</span>
            <span className="text-xs font-medium">0.00001 XLM</span>
          </div>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 pb-3 text-sm font-medium text-muted-foreground">Payment method</h2>
        <div className="space-y-2">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-left ring-1 transition-all ${
                  active ? "ring-foreground" : "ring-black/5 hover:ring-black/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-surface-muted text-xs font-semibold">
                    {m.label.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.sub}</p>
                  </div>
                </div>
                <span
                  className={`grid size-5 place-items-center rounded-full ring-1 ${
                    active ? "bg-foreground ring-foreground" : "bg-background ring-black/10"
                  }`}
                >
                  {active && <span className="size-1.5 rounded-full bg-background" />}
                </span>
              </button>
            );
          })}
        </div>
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
          disabled={!amount || Number(amount) <= 0}
          className="w-full rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          Review order
        </button>
      </section>

      <Sheet
        open={stage !== "idle"}
        onClose={closeSheet}
        title={stage === "done" ? "Order created" : "Review order"}
      >
        {stage === "review" && (
          <div className="space-y-4">
            <Row label={isBuy ? "You pay" : "You sell"} value={`${amount} ${isBuy ? "USD" : "USDC"}`} />
            <Row label="You receive" value={`${usdc} ${isBuy ? "USDC" : "USD"}`} />
            <Row label="Payment method" value={methods.find((m) => m.id === method)!.label} />
            <Row label="Network" value="Stellar mainnet" />
            <Row label="Network fee" value="0.00001 XLM" />
            <div className="rounded-2xl bg-accent-soft/60 p-4 text-xs leading-relaxed text-foreground/80 ring-1 ring-accent/10">
              By confirming you'll be matched with a verified peer and Anyramp will generate a
              zero-knowledge proof of payment on your device.
            </div>
            <button
              onClick={() => setStage("matching")}
              className="w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
            >
              Confirm & match peer
            </button>
          </div>
        )}

        {(stage === "matching" || stage === "proving") && (
          <div className="space-y-5 py-3">
            <ProvingStep
              label="Matching peer"
              done={stage === "proving"}
              active={stage === "matching"}
            />
            <ProvingStep
              label="Generating ZK proof"
              done={false}
              active={stage === "proving"}
            />
            <ProvingStep label="Settling on Stellar" done={false} active={false} />
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Keep the app open. Proof generation happens on-device.
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
              Your order is open. We'll notify you when the ZK proof verifies on Stellar.
            </p>
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-black/5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Order ID</p>
              <p className="mt-0.5 font-mono text-sm">8842-ZK</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText("8842-ZK").catch(() => {});
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
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
