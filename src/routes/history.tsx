import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { OrderSheet } from "@/components/order-sheet";
import { orders, type Order } from "@/lib/orders";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Anyramp" },
      { name: "description", content: "All your Anyramp onramps and offramps, ZK-verified on Stellar." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [selected, setSelected] = useState<Order | null>(null);
  const [filter, setFilter] = useState<"all" | "onramp" | "offramp">("all");

  const filtered = orders.filter((o) => (filter === "all" ? true : o.kind === filter));
  const grouped = ["Today", "Yesterday"].map((day) => ({
    label: day,
    entries: filtered.filter((o) => o.day === day),
  }));

  return (
    <AppShell>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every settlement is verified on Stellar by a zero-knowledge proof.
        </p>
      </div>

      <div className="mt-5 px-4">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-muted p-1 ring-1 ring-black/5">
          {(["all", "onramp", "offramp"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full py-2 text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-surface text-foreground shadow-quiet"
                  : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-8 px-4">
        {grouped.map((day) =>
          day.entries.length === 0 ? null : (
            <section key={day.label}>
              <h2 className="px-1 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {day.label}
              </h2>
              <ul className="overflow-hidden rounded-3xl bg-surface ring-1 ring-black/5">
                {day.entries.map((e, i) => (
                  <li key={e.id} className={i > 0 ? "border-t border-border" : ""}>
                    <button
                      onClick={() => setSelected(e)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors active:bg-surface-muted"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                            e.kind === "onramp"
                              ? "bg-accent-soft text-accent"
                              : "bg-surface-muted text-foreground"
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
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
        {filtered.length === 0 && (
          <p className="px-1 pt-4 text-center text-sm text-muted-foreground">
            No {filter} orders yet.
          </p>
        )}
      </div>

      <OrderSheet open={!!selected} onClose={() => setSelected(null)} order={selected} />
    </AppShell>
  );
}

function StatusPill({ status }: { status: Order["status"] }) {
  const map = {
    settled: { label: "ZK verified", cls: "text-accent" },
    verifying: { label: "Verifying", cls: "text-foreground" },
    matched: { label: "Matched", cls: "text-muted-foreground" },
  } as const;
  const s = map[status];
  return <span className={`font-medium ${s.cls}`}>{s.label}</span>;
}
