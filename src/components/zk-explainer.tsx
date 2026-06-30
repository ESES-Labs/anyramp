import { useState } from "react";
import { ArrowRight, ArrowLeft, ShieldCheck, Wallet, Receipt, Lock, Cpu, CheckCircle2, HelpCircle } from "lucide-react";

type Side = "onramp" | "offramp";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tip: string;
};

const ONRAMP: Step[] = [
  {
    icon: Wallet,
    title: "Lock peer collateral",
    body: "A peer with Stellar assets locks them in a non-custodial escrow.",
    tip: "Escrow is a Soroban contract — only a valid zk-proof or timeout can release it.",
  },
  {
    icon: Receipt,
    title: "Send fiat privately",
    body: "Pay your peer with SEPA, card, or Pix from your bank app.",
    tip: "Anyramp never sees your bank login. The payment leaves your device, not your data.",
  },
  {
    icon: Cpu,
    title: "Generate zk-SNARK",
    body: "Your phone proves the receipt is valid — without revealing the amount or IBAN.",
    tip: "A Groth16 circuit attests payment integrity. Only the proof (≈200 bytes) is published.",
  },
  {
    icon: CheckCircle2,
    title: "Settle on Stellar",
    body: "Escrow verifies the proof on-chain and releases assets to your wallet.",
    tip: "Verification is a single contract call. Final settlement is ~5 seconds.",
  },
];

const OFFRAMP: Step[] = [
  {
    icon: Lock,
    title: "Lock your assets",
    body: "Your Stellar assets enter a Soroban escrow contract.",
    tip: "Self-custodied. You can reclaim if the peer never pays — no human dispute needed.",
  },
  {
    icon: Receipt,
    title: "Peer pays you fiat",
    body: "A matched peer sends fiat to your bank with a unique reference.",
    tip: "The reference is bound to your order so proofs cannot be reused.",
  },
  {
    icon: Cpu,
    title: "Prove the receipt",
    body: "You confirm receipt — your device generates a zk-proof of the bank notification.",
    tip: "The proof attests the inbound transfer without exposing balances or counterparty.",
  },
  {
    icon: CheckCircle2,
    title: "Peer gets the asset",
    body: "Escrow releases your assets to the peer. Order closes — fully on-chain.",
    tip: "All four steps are auditable on Stellar. Nothing private leaks.",
  },
];

export function ZkExplainer() {
  const [side, setSide] = useState<Side>("onramp");
  const steps = side === "onramp" ? ONRAMP : OFFRAMP;

  return (
    <section id="zk" className="relative px-5 py-28">
      <div className="mx-auto max-w-5xl">
        <div data-reveal className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            How zero-knowledge fits in
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            A proof, not a promise.
          </h2>
          <p className="mt-4 max-w-prose text-sm text-muted-foreground sm:text-base">
            Every Anyramp order is settled by a tiny mathematical proof — generated on your
            device, verified on Stellar. Hover any step for a plain-language note.
          </p>
        </div>

        <div data-reveal className="mb-6 inline-flex rounded-full bg-surface p-1 ring-1 ring-black/5">
          <SideTab active={side === "onramp"} onClick={() => setSide("onramp")}>
            <ArrowRight className="size-3.5" /> Onramp
          </SideTab>
          <SideTab active={side === "offramp"} onClick={() => setSide("offramp")}>
            <ArrowLeft className="size-3.5" /> Offramp
          </SideTab>
        </div>

        <ol data-reveal-stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="group relative rounded-3xl bg-surface p-5 ring-1 ring-black/5 transition-shadow hover:shadow-quiet"
              style={{ willChange: "transform" }}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/15">
                  <s.icon className="size-4" />
                </span>
                <span className="font-serif text-2xl italic text-muted-foreground/60">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-medium tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>

              <Tooltip text={s.tip} />

              {i < steps.length - 1 && (
                <span className="pointer-events-none absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground/40 lg:block">
                  <ArrowRight className="size-4" />
                </span>
              )}
            </li>
          ))}
        </ol>

        <div data-reveal className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-accent" />
          No bank credentials, balances, or counterparty data ever leave your phone.
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
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        <HelpCircle className="size-3" /> What this means
      </button>
      {open && (
        <div
          role="tooltip"
          className="mt-2 rounded-2xl bg-foreground p-3 text-[11px] leading-relaxed text-background/90 shadow-lift"
        >
          {text}
        </div>
      )}
    </div>
  );
}
