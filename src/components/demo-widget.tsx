import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowLeft, ShieldCheck, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { StellarIcon } from "@/components/stellar-icon";

type Side = "onramp" | "offramp";
type Asset = "USDC" | "XLM";

const RATES: Record<Asset, number> = {
  USDC: 1.0,
  XLM: 0.115,
};

const PRESETS = [50, 100, 250, 500];

export function DemoWidget() {
  const [side, setSide] = useState<Side>("onramp");
  const [asset, setAsset] = useState<Asset>("USDC");
  const [amount, setAmount] = useState<number>(100);
  const [stage, setStage] = useState<number>(-1); // -1 idle

  const out = useMemo(() => amount / RATES[asset], [amount, asset]);

  const steps =
    side === "onramp"
      ? ["Match peer", "Lock escrow", "Send fiat", "Generate zk-proof", "Settle on Stellar"]
      : ["Lock assets", "Match peer", "Receive fiat", "Generate zk-proof", "Release to peer"];

  const run = () => {
    setStage(0);
    let i = 0;
    const tick = () => {
      i += 1;
      if (i >= steps.length) {
        setStage(steps.length);
        return;
      }
      setStage(i);
      setTimeout(tick, 850);
    };
    setTimeout(tick, 850);
  };

  const reset = () => setStage(-1);
  const running = stage >= 0 && stage < steps.length;
  const done = stage === steps.length;

  return (
    <section className="relative px-5 py-28">
      <div className="mx-auto max-w-5xl">
        <div data-reveal className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Try a demo
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            See it move,
            <br />
            <em className="italic text-muted-foreground">step by step.</em>
          </h2>
          <p className="mt-4 max-w-prose text-sm text-muted-foreground sm:text-base">
            A simulated order — no real funds. Pick a side, an asset, and an amount, then
            watch the on-chain steps unfold.
          </p>
        </div>

        <div
          data-reveal
          className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        >
          {/* Form */}
          <div className="rounded-[28px] bg-surface p-6 ring-1 ring-black/5 sm:p-8">
            {/* Side switch */}
            <div className="inline-flex rounded-full bg-background p-1 ring-1 ring-black/5">
              <SideTab active={side === "onramp"} onClick={() => { setSide("onramp"); reset(); }}>
                <ArrowRight className="size-3.5" /> Buy
              </SideTab>
              <SideTab active={side === "offramp"} onClick={() => { setSide("offramp"); reset(); }}>
                <ArrowLeft className="size-3.5" /> Sell
              </SideTab>
            </div>

            <div className="mt-6">
              <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {side === "onramp" ? "You pay (EUR)" : "You sell"}
              </label>
              <div className="mt-2 flex items-end gap-3">
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => { setAmount(Math.max(0, Number(e.target.value) || 0)); reset(); }}
                  className="w-full bg-transparent font-serif text-5xl tracking-tight outline-none placeholder:text-muted-foreground"
                  inputMode="decimal"
                />
                <span className="pb-2 text-sm text-muted-foreground">
                  {side === "onramp" ? "EUR" : asset}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setAmount(p); reset(); }}
                    className={`rounded-full px-3 py-1 text-xs ring-1 transition-colors ${
                      amount === p
                        ? "bg-foreground text-background ring-foreground"
                        : "bg-background text-muted-foreground ring-black/5 hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="my-5 flex items-center gap-3 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <ArrowDown className="size-4" />
              <div className="h-px flex-1 bg-border" />
            </div>

            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {side === "onramp" ? "You receive" : "You receive (EUR)"}
              </label>
              <div className="mt-2 flex items-end gap-3">
                <div className="flex-1 font-serif text-5xl tracking-tight">
                  {(side === "onramp" ? out : amount * RATES[asset]).toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </div>
                {side === "onramp" ? (
                  <select
                    value={asset}
                    onChange={(e) => { setAsset(e.target.value as Asset); reset(); }}
                    className="rounded-full bg-background px-3 py-1.5 text-sm ring-1 ring-black/5"
                  >
                    <option value="USDC">USDC</option>
                    <option value="XLM">XLM</option>
                  </select>
                ) : (
                  <span className="pb-2 text-sm text-muted-foreground">EUR</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Rate · 1 {asset} = €{RATES[asset].toFixed(asset === "XLM" ? 3 : 2)}
              </p>
            </div>

            <button
              type="button"
              onClick={running ? undefined : run}
              disabled={running || amount <= 0}
              className="group relative mt-7 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-foreground px-5 py-3.5 text-sm font-medium text-background shadow-lift transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Running simulation…
                </>
              ) : done ? (
                <>Run again</>
              ) : (
                <>
                  Simulate {side === "onramp" ? "onramp" : "offramp"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3 text-accent" />
              Demo only · no funds move · no signatures required
            </p>
          </div>

          {/* Steps */}
          <div className="rounded-[28px] bg-foreground p-6 text-background sm:p-8">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-background/60">
                On-chain steps
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-background/80">
                <StellarIcon className="size-3" /> Stellar testnet
              </span>
            </div>

            <ol className="mt-5 space-y-2">
              {steps.map((label, i) => {
                const state =
                  stage === -1
                    ? "idle"
                    : i < stage
                    ? "done"
                    : i === stage
                    ? "active"
                    : "pending";
                return (
                  <li
                    key={label}
                    className={`flex items-center gap-3 rounded-2xl px-3.5 py-3 ring-1 transition-colors ${
                      state === "active"
                        ? "bg-background/10 ring-background/20"
                        : state === "done"
                        ? "ring-background/10"
                        : "ring-background/5"
                    }`}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-medium ${
                        state === "done"
                          ? "bg-accent text-accent-foreground"
                          : state === "active"
                          ? "bg-background text-foreground"
                          : "bg-background/10 text-background/60"
                      }`}
                    >
                      {state === "done" ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : state === "active" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        state === "pending" ? "text-background/50" : "text-background"
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>

            {done && (
              <div className="mt-5 rounded-2xl bg-background/10 p-4 text-[12px] ring-1 ring-background/15">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="size-4 text-accent" /> Order settled
                </div>
                <p className="mt-1 text-background/70">
                  Proof verified on Stellar · order ID{" "}
                  <span className="font-mono">ANY-{Math.floor(Math.random() * 9e5 + 1e5)}</span>
                </p>
                <a
                  href="/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  Open the real flow <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SideTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
