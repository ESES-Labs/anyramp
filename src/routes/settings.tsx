import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Anyramp" },
      { name: "description", content: "Preferences for your Anyramp wallet, network, and notifications." },
    ],
  }),
  component: SettingsPage,
});

type Choice = { label: string; options: string[]; key: string };

function SettingsPage() {
  const { show } = useToast();
  const [state, setState] = useState({
    name: "anya.xlm",
    currency: "USD",
    region: "EU",
    network: "Mainnet",
    rpc: "Horizon · default",
    notifyOrders: true,
    notifyProofs: true,
    notifyPromos: false,
  });
  const [picker, setPicker] = useState<Choice | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(state.name);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const update = (k: keyof typeof state, v: string | boolean) => {
    setState((s) => ({ ...s, [k]: v }));
    show("Saved");
  };

  return (
    <AppShell>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune Anyramp to your workflow.</p>
      </div>

      <div className="mt-6 space-y-8 px-4 pb-6">
        <Group label="Account">
          <PickRow
            label="Display name"
            value={state.name}
            onClick={() => {
              setDraftName(state.name);
              setNameOpen(true);
            }}
          />
          <PickRow
            label="Default currency"
            value={state.currency}
            onClick={() =>
              setPicker({ label: "Default currency", key: "currency", options: ["USD", "EUR", "BRL", "GBP"] })
            }
          />
          <PickRow
            label="Region"
            value={state.region}
            onClick={() =>
              setPicker({ label: "Region", key: "region", options: ["EU", "US", "LATAM", "APAC"] })
            }
          />
        </Group>

        <Group label="Network">
          <PickRow
            label="Stellar network"
            value={state.network}
            onClick={() =>
              setPicker({ label: "Stellar network", key: "network", options: ["Mainnet", "Testnet", "Futurenet"] })
            }
          />
          <PickRow
            label="RPC endpoint"
            value={state.rpc}
            onClick={() =>
              setPicker({
                label: "RPC endpoint",
                key: "rpc",
                options: ["Horizon · default", "Soroban RPC", "Custom"],
              })
            }
          />
        </Group>

        <Group label="Notifications">
          <ToggleRow
            label="Order updates"
            on={state.notifyOrders}
            onChange={(v) => update("notifyOrders", v)}
          />
          <ToggleRow
            label="ZK proof receipts"
            on={state.notifyProofs}
            onChange={(v) => update("notifyProofs", v)}
          />
          <ToggleRow
            label="Promotions"
            on={state.notifyPromos}
            onChange={(v) => update("notifyPromos", v)}
          />
        </Group>

        <Group label="About">
          <LinkRow
            label="Help & support"
            onClick={() => show("Help center coming soon")}
          />
          <LinkRow
            label="Terms of service"
            onClick={() => show("Opening terms…")}
          />
          <LinkRow
            label="Privacy policy"
            onClick={() => show("Opening privacy policy…")}
          />
        </Group>

        <button
          onClick={() => setSignOutOpen(true)}
          className="w-full rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium text-destructive ring-1 ring-black/5 transition-colors active:bg-surface-muted"
        >
          Sign out
        </button>

        <p className="px-1 pt-2 text-center text-[11px] text-muted-foreground">
          Anyramp v0.1 · Stellar {state.network.toLowerCase()}
        </p>
      </div>

      <Sheet
        open={!!picker}
        onClose={() => setPicker(null)}
        title={picker?.label}
      >
        <ul className="space-y-2">
          {picker?.options.map((opt) => {
            const current = (state as Record<string, unknown>)[picker.key] === opt;
            return (
              <li key={opt}>
                <button
                  onClick={() => {
                    update(picker.key as keyof typeof state, opt);
                    setPicker(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left ring-1 transition-colors ${
                    current ? "bg-surface ring-foreground" : "bg-surface ring-black/5"
                  }`}
                >
                  <span className="text-sm">{opt}</span>
                  {current && (
                    <svg className="size-4 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>

      <Sheet open={nameOpen} onClose={() => setNameOpen(false)} title="Display name">
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          className="w-full rounded-2xl bg-surface px-4 py-3.5 text-base outline-none ring-1 ring-black/10 focus:ring-foreground"
          placeholder="your.handle"
        />
        <button
          onClick={() => {
            update("name", draftName || state.name);
            setNameOpen(false);
          }}
          className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          Save
        </button>
      </Sheet>

      <Sheet open={signOutOpen} onClose={() => setSignOutOpen(false)} title="Sign out?">
        <p className="text-sm text-muted-foreground">
          You can sign back in any time with your recovery phrase. Your funds stay on Stellar.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setSignOutOpen(false)}
            className="flex-1 rounded-full bg-surface py-3 text-sm font-medium ring-1 ring-black/10"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setSignOutOpen(false);
              show("Signed out (demo)");
            }}
            className="flex-1 rounded-full bg-destructive py-3 text-sm font-medium text-background"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </AppShell>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-surface ring-1 ring-black/5">
        {children}
      </ul>
    </section>
  );
}

function PickRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-opacity active:opacity-60"
      >
        <span className="text-sm">{label}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {value}
          <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </button>
    </li>
  );
}

function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-opacity active:opacity-60"
      >
        <span className="text-sm">{label}</span>
        <svg className="size-3.5 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </li>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!on)}
        role="switch"
        aria-checked={on}
        className={`relative h-6 w-10 rounded-full transition-colors ${
          on ? "bg-foreground" : "bg-surface-muted ring-1 ring-black/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-quiet transition-transform ${
            on ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </li>
  );
}
