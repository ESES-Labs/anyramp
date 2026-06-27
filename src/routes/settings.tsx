import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Anyramp" },
      { name: "description", content: "Preferences for your Anyramp wallet, network, and notifications." },
    ],
  }),
  component: SettingsPage,
});

const groups: { label: string; items: { label: string; value?: string }[] }[] = [
  {
    label: "Account",
    items: [
      { label: "Display name", value: "anya.xlm" },
      { label: "Default currency", value: "USD" },
      { label: "Region", value: "EU" },
    ],
  },
  {
    label: "Network",
    items: [
      { label: "Stellar network", value: "Mainnet" },
      { label: "RPC endpoint", value: "Horizon · default" },
    ],
  },
  {
    label: "Notifications",
    items: [
      { label: "Order updates", value: "On" },
      { label: "ZK proof receipts", value: "On" },
      { label: "Promotions", value: "Off" },
    ],
  },
];

function SettingsPage() {
  return (
    <AppShell>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune Anyramp to your workflow.</p>
      </div>

      <div className="mt-6 space-y-8 px-4 pb-6">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="px-1 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </h2>
            <ul className="overflow-hidden rounded-3xl bg-surface ring-1 ring-black/5">
              {g.items.map((it, i) => (
                <li
                  key={it.label}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <span className="text-sm">{it.label}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {it.value}
                    <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="px-1 pt-2 text-center text-[11px] text-muted-foreground">
          Anyramp v0.1 · Stellar mainnet
        </p>
      </div>
    </AppShell>
  );
}
