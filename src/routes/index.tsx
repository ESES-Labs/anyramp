import { useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Zap, ArrowRight, Lock, Globe2 } from "lucide-react";
import { DotPattern } from "@/components/dot-pattern";
import { AnyrampLogo } from "@/components/anyramp-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Anyramp — Trustless onramp & offramp on Stellar" },
      {
        name: "description",
        content:
          "A mobile-first peer-to-peer onramp and offramp on Stellar. Every settlement is verified end-to-end with a zero-knowledge proof.",
      },
      { property: "og:title", content: "Anyramp — Trustless ZK onramp on Stellar" },
      {
        property: "og:description",
        content:
          "Convert between fiat and Stellar assets P2P, verified by zero-knowledge proofs.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Lenis smooth scroll (client-only, scoped to this page lifetime)
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let lenisInstance: { raf: (t: number) => void; destroy: () => void } | null =
      null;

    (async () => {
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      const lenis = new Lenis({
        duration: 1.15,
        smoothWheel: true,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
      lenisInstance = lenis;
      const loop = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenisInstance?.destroy();
    };
  }, []);

  // GSAP scroll-reveal for [data-reveal] elements
  useEffect(() => {
    let ctx: { revert: () => void } | null = null;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 40,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-reveal-stagger] > *").forEach((el, i) => {
          gsap.from(el, {
            opacity: 0,
            y: 28,
            duration: 0.7,
            delay: i * 0.08,
            ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }, rootRef);
    })();
    return () => ctx?.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      {/* Top nav */}
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-black/[0.04] bg-background/70 px-5 py-3.5 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-foreground">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-background" />
          </span>
          <span className="font-serif text-lg tracking-tight">Anyramp</span>
        </Link>
        <a
          href="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-transform active:scale-95"
        >
          Open app
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </a>
      </header>

      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-center px-5 pt-20">
        {/* Dot pattern background with radial fade */}
        <div className="absolute inset-0 -z-10 text-foreground/12">
          <DotPattern />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 40%, transparent 0%, var(--color-background) 80%)",
            }}
          />
        </div>

        <div className="flex flex-col items-center text-center">
          <AnyrampLogo size={156} />

          <span
            data-reveal
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground ring-1 ring-black/5"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            Trustless · Peer-to-peer · Stellar
          </span>

          <h1
            data-reveal
            className="mt-6 max-w-[18ch] font-serif text-[clamp(2.6rem,9vw,4.5rem)] leading-[1.02] tracking-tight"
          >
            On & off the chain,
            <br />
            <em className="italic text-muted-foreground">without the trust.</em>
          </h1>

          <p
            data-reveal
            className="mt-5 max-w-md text-balance text-sm leading-relaxed text-muted-foreground sm:text-base"
          >
            Anyramp matches you with a verified peer and proves every payment
            with a zero-knowledge proof — settled directly on Stellar.
          </p>

          <div data-reveal className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/app"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background shadow-lift transition-transform active:scale-[0.98]"
            >
              <span aria-hidden className="border-beam rounded-full" />
              <span className="relative">Open app</span>
              <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-5 py-3.5 text-sm font-medium ring-1 ring-black/5 transition-colors hover:bg-surface-muted"
            >
              How it works
            </a>
          </div>

          <div
            data-reveal
            className="mt-10 flex items-center gap-5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span>zk-SNARK</span>
            <span className="h-3 w-px bg-border" />
            <span>Non-custodial</span>
            <span className="h-3 w-px bg-border" />
            <span>Mobile-first</span>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Scroll
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative px-5 py-28">
        <div className="mx-auto max-w-5xl">
          <div data-reveal className="mb-14 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Why Anyramp
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Three primitives.
              <br />
              <em className="italic text-muted-foreground">One quiet experience.</em>
            </h2>
          </div>

          <div data-reveal-stagger className="grid gap-4 sm:grid-cols-3">
            <FeatureCard
              Icon={ShieldCheck}
              title="ZK-verified payments"
              body="Every fiat transfer is proven with a Groth16 zk-SNARK on your device. Your bank stays private."
            />
            <FeatureCard
              Icon={Zap}
              title="Sub-second matching"
              body="A peer-to-peer order book finds counterparties in 1.2s on average — no liquidity middlemen."
            />
            <FeatureCard
              Icon={Globe2}
              title="Settled on Stellar"
              body="Final settlement happens on Stellar mainnet. You hold the keys, always."
            />
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="relative bg-surface/60 px-5 py-28">
        <div className="absolute inset-0 -z-10 text-foreground/8">
          <DotPattern size={28} radius={0.9} />
        </div>

        <div className="mx-auto max-w-5xl">
          <div data-reveal className="mb-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              How it works
            </p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              From fiat to Stellar
              <br />
              <em className="italic text-muted-foreground">in three quiet steps.</em>
            </h2>
          </div>

          <ol data-reveal-stagger className="space-y-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="group flex items-start gap-5 rounded-3xl bg-background p-6 ring-1 ring-black/5 transition-shadow hover:shadow-quiet sm:p-8"
              >
                <span className="font-serif text-3xl italic text-muted-foreground/70 sm:text-4xl">
                  0{i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-medium tracking-tight sm:text-xl">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 max-w-prose text-sm text-muted-foreground sm:text-base">
                    {s.body}
                  </p>
                </div>
                <s.Icon className="hidden size-5 text-muted-foreground transition-colors group-hover:text-foreground sm:block" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative px-5 py-24">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          <Stat data-reveal kpi="0" label="Custodians in the loop" />
          <Stat data-reveal kpi="<2s" label="Average peer match" />
          <Stat data-reveal kpi="100%" label="Proofs verified on-chain" />
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-5 pb-32 pt-12">
        <div
          data-reveal
          className="relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden rounded-[36px] bg-foreground px-6 py-16 text-center text-background sm:py-24"
        >
          <div className="absolute inset-0 -z-10 opacity-[0.12] text-background">
            <DotPattern size={20} radius={1} />
          </div>
          <Sparkles className="size-5 text-background/70" />
          <h3 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            Ready when you are.
          </h3>
          <p className="mt-3 max-w-md text-sm text-background/70 sm:text-base">
            Open Anyramp in a new tab and start a trustless onramp in under a minute.
          </p>
          <a
            href="/app"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-8 inline-flex items-center gap-2 overflow-hidden rounded-full bg-background px-7 py-3.5 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
          >
            <span aria-hidden className="border-beam rounded-full" />
            <span className="relative">Open app</span>
            <ArrowRight className="relative size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/[0.05] px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-foreground">
              <span className="size-2 rotate-45 rounded-[2px] bg-background" />
            </span>
            <span className="font-serif tracking-tight">Anyramp</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built on Stellar · Secured by zero-knowledge proofs
          </p>
          <a
            href="/app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Lock className="size-3" />
            Launch wallet
          </a>
        </div>
      </footer>
    </div>
  );
}

const steps = [
  {
    title: "Pick a side & an amount",
    body: "Choose onramp or offramp, set how much, and we match you with a verified peer in seconds.",
    Icon: Zap,
  },
  {
    title: "Pay your peer privately",
    body: "Send fiat by SEPA, card, or Pix. Anyramp generates a zk-SNARK proof of the payment on your device.",
    Icon: ShieldCheck,
  },
  {
    title: "Settlement on Stellar",
    body: "The proof unlocks the on-chain escrow automatically. Funds arrive in your wallet — no trust required.",
    Icon: Globe2,
  },
];

function FeatureCard({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-3xl bg-surface p-6 ring-1 ring-black/5 transition-all hover:-translate-y-1 hover:shadow-quiet">
      <div className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 60%)",
          }}
        />
      </div>
      <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent ring-1 ring-accent/15">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-5 font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function Stat({ kpi, label }: { kpi: string; label: string; "data-reveal"?: boolean }) {
  return (
    <div
      data-reveal
      className="rounded-3xl bg-surface p-7 ring-1 ring-black/5"
    >
      <p className="font-serif text-5xl tracking-tight">{kpi}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
