import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Anyramp" },
      {
        name: "description",
        content:
          "Manage the zero-knowledge keys and recovery options that protect your Anyramp wallet on Stellar.",
      },
    ],
  }),
  component: SecurityPage,
});

type RowKey = "key" | "account" | "recovery" | "biometric";

function SecurityPage() {
  const [biometric, setBiometric] = useState(true);
  const [open, setOpen] = useState<RowKey | null>(null);
  const { show } = useToast();

  const close = () => setOpen(null);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      show(`${label} copied`);
    } catch {
      show("Couldn't copy");
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anyramp never custodies your funds. Keys, proofs, and signatures stay on your device.
        </p>
      </div>

      <section className="mt-6 px-4">
        <div className="rounded-3xl bg-surface p-5 shadow-quiet ring-1 ring-black/5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <svg className="size-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 1.2c-1.6.9-3.3 1.4-5 1.5v5.4c0 3 2 5.4 5 6.7 3-1.3 5-3.7 5-6.7V2.7c-1.7-.1-3.4-.6-5-1.5Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium">Trustless mode</p>
              <p className="text-xs text-muted-foreground">All checks passing</p>
            </div>
          </div>

          <ul className="mt-5 divide-y divide-border">
            <SecRow label="ZK proving key" value="Active · device-bound" onClick={() => setOpen("key")} />
            <SecRow label="Stellar account" value="GAYR…XQK7" onClick={() => setOpen("account")} />
            <SecRow label="Recovery phrase" value="Backed up" onClick={() => setOpen("recovery")} />
            <li className="flex items-center justify-between py-3">
              <span className="text-sm text-foreground">Biometric unlock</span>
              <Toggle
                on={biometric}
                onChange={(v) => {
                  setBiometric(v);
                  show(v ? "Biometric unlock on" : "Biometric unlock off");
                }}
              />
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-6 px-4">
        <button
          onClick={() => {
            show("Proving key rotated");
          }}
          className="w-full rounded-2xl bg-surface px-4 py-3.5 text-left text-sm font-medium ring-1 ring-black/5 transition-colors active:bg-surface-muted"
        >
          Rotate ZK proving key
          <p className="mt-0.5 text-xs font-normal text-muted-foreground">
            Generates a new device-bound key. Existing proofs stay valid.
          </p>
        </button>
      </section>

      <section className="mt-6 px-5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Anyramp uses zk-SNARKs to prove that a fiat payment occurred without revealing your bank
          details to your peer or the network. The same proof releases funds from the on-chain
          escrow on Stellar — automatically and trustlessly.
        </p>
      </section>

      <Sheet open={open === "key"} onClose={close} title="ZK proving key">
        <p className="text-sm text-muted-foreground">
          Your proving key is generated and stored inside this device's secure enclave. It never
          leaves your phone.
        </p>
        <Info label="Fingerprint" value="pk_zk_8f29…b41c" mono />
        <Info label="Created" value="Jun 14, 2026" />
        <Info label="Algorithm" value="Groth16 · BN254" />
        <button
          onClick={() => copy("Key fingerprint", "pk_zk_8f29b41c5d8e2a47f1c93b6d8e2a47f1c")}
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          Copy fingerprint
        </button>
      </Sheet>

      <Sheet open={open === "account"} onClose={close} title="Stellar account">
        <p className="text-sm text-muted-foreground">
          Your non-custodial Stellar wallet. All settlements arrive here directly.
        </p>
        <Info
          label="Public address"
          value="GAYRX2NQK7L8M3VP4ZD5C9T1B6E2W8J0F4H6K8N2P5R7T9V1XQK7"
          mono
        />
        <Info label="Network" value="Stellar mainnet" />
        <button
          onClick={() =>
            copy("Address", "GAYRX2NQK7L8M3VP4ZD5C9T1B6E2W8J0F4H6K8N2P5R7T9V1XQK7")
          }
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          Copy address
        </button>
      </Sheet>

      <Sheet open={open === "recovery"} onClose={close} title="Recovery phrase">
        <p className="text-sm text-muted-foreground">
          12 words that restore your wallet on any device. Never share them. Anyone with these
          words controls your funds.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface-muted p-3 ring-1 ring-black/5">
          {"quiet harbor lemon orbit pencil silver river table cobalt window meadow garnet"
            .split(" ")
            .map((w, i) => (
              <span
                key={i}
                className="rounded-lg bg-surface px-2 py-2 text-xs ring-1 ring-black/5"
              >
                <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                {w}
              </span>
            ))}
        </div>
        <button
          onClick={() => show("Recovery phrase hidden")}
          className="mt-5 w-full rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground"
        >
          I've written it down
        </button>
      </Sheet>
    </AppShell>
  );
}

function SecRow({
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
        className="flex w-full items-center justify-between py-3 text-left transition-opacity active:opacity-60"
      >
        <span className="text-sm text-foreground">{label}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {value}
          <span className="size-1.5 rounded-full bg-accent" />
          <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 1 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </span>
      </button>
    </li>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
        on ? "bg-foreground" : "bg-surface-muted ring-1 ring-inset ring-black/10"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-quiet ring-1 ring-black/5 transition-transform duration-200 ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}


function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="mt-3 rounded-2xl bg-surface p-4 ring-1 ring-black/5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm ${mono ? "break-all font-mono" : "font-medium"}`}>{value}</p>
    </div>
  );
}
