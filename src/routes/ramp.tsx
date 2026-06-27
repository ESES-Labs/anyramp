import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";

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

type Side = "buy" | "sell";

const methods = [
  { id: "sepa", label: "SEPA", sub: "EU bank transfer · 5 min" },
  { id: "card", label: "Card", sub: "Visa / Mastercard · instant" },
  { id: "pix", label: "Pix", sub: "Brazil · instant" },
];

function RampPage() {
  const { side } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [amount, setAmount] = useState("250");
  const [method, setMethod] = useState("sepa");

  const usdc = useMemo(() => {
    const n = Number(amount.replace(/[^\d.]/g, "")) || 0;
    return (n * 0.998).toFixed(2);
  }, [amount]);

  const isBuy = side === "buy";

  return (
    <AppShell>
      <div className="px-5 pt-2">
        <Link
          to="/"
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

      {/* Side toggle */}
      <div className="mt-6 px-5">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1 ring-1 ring-black/5">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => navigate({ search: { side: s } })}
              className={`rounded-full py-2 text-sm font-medium transition-colors ${
                side === s
                  ? "bg-surface text-foreground shadow-quiet"
                  : "text-muted-foreground"
              }`}
            >
              {s === "buy" ? "Onramp" : "Offramp"}
            </button>
          ))}
        </div>
      </div>

      {/* Amount card */}
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

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              {isBuy ? "You receive" : "You receive"}
            </span>
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

      {/* Method */}
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
                  active
                    ? "ring-foreground"
                    : "ring-black/5 hover:ring-black/10"
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

      {/* Trust note */}
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

      {/* CTA */}
      <section className="mt-8 px-5">
        <button className="w-full rounded-full bg-primary py-4 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]">
          Review order
        </button>
      </section>
    </AppShell>
  );
}
