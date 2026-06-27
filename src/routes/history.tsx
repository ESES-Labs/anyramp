import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Anyramp" },
      { name: "description", content: "All your Anyramp onramps and offramps, ZK-verified on Stellar." },
    ],
  }),
  component: HistoryPage,
});

type Entry = {
  id: string;
  kind: "onramp" | "offramp";
  asset: string;
  amount: string;
  fiat: string;
  status: "settled" | "verifying" | "matched";
  when: string;
};

const days: { label: string; entries: Entry[] }[] = [
  {
    label: "Today",
    entries: [
      {
        id: "8841-ZK",
        kind: "onramp",
        asset: "USDC",
        amount: "+850.00",
        fiat: "€850.00 · SEPA",
        status: "verifying",
        when: "14:02",
      },
      {
        id: "8839-ZK",
        kind: "offramp",
        asset: "USDC",
        amount: "−210.00",
        fiat: "€209.62 · SEPA",
        status: "settled",
        when: "09:18",
      },
    ],
  },
  {
    label: "Yesterday",
    entries: [
      {
        id: "8821-ZK",
        kind: "onramp",
        asset: "XLM",
        amount: "+1,200.00",
        fiat: "$134.80 · Card",
        status: "settled",
        when: "20:44",
      },
      {
        id: "8815-ZK",
        kind: "offramp",
        asset: "USDC",
        amount: "−500.00",
        fiat: "R$2,498.10 · Pix",
        status: "settled",
        when: "11:02",
      },
    ],
  },
];

function HistoryPage() {
  return (
    <AppShell>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every settlement is verified on Stellar by a zero-knowledge proof.
        </p>
      </div>

      <div className="mt-6 space-y-8 px-4">
        {days.map((day) => (
          <section key={day.label}>
            <h2 className="px-1 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {day.label}
            </h2>
            <ul className="overflow-hidden rounded-3xl bg-surface ring-1 ring-black/5">
              {day.entries.map((e, i) => (
                <li
                  key={e.id}
                  className={`flex items-center justify-between gap-3 px-4 py-4 ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        e.kind === "onramp" ? "bg-accent-soft text-accent" : "bg-surface-muted text-foreground"
                      }`}
                    >
                      <svg
                        className={`size-4 ${e.kind === "offramp" ? "rotate-180" : ""}`}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M8 2.5a.75.75 0 0 1 .75.75v7.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.25A.75.75 0 0 1 8 2.5Z" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">
                        {e.kind} · {e.asset}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{e.fiat}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{e.amount}</p>
                    <p className="text-[11px] text-muted-foreground">
                      <StatusPill status={e.status} /> · {e.when}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function StatusPill({ status }: { status: Entry["status"] }) {
  const map = {
    settled: { label: "ZK verified", cls: "text-accent" },
    verifying: { label: "Verifying", cls: "text-foreground" },
    matched: { label: "Matched", cls: "text-muted-foreground" },
  } as const;
  const s = map[status];
  return <span className={`font-medium ${s.cls}`}>{s.label}</span>;
}
