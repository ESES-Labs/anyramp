import { useState } from "react";
import { createLazyFileRoute } from "@tanstack/react-router";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { useWallet } from "@/components/wallet/wallet-provider";
import { isPasskeySupported } from "@/lib/local-wallet";
import { CURRENCY_OPTIONS, type CurrencyCode } from "@/lib/currencies";
import { STELLAR_NETWORK } from "@/lib/stellar-address";

const NETWORK_LABEL = STELLAR_NETWORK === "testnet" ? "Testnet" : "Mainnet";

export const Route = createLazyFileRoute("/settings")({
  component: SettingsPage,
});

type Choice = { label: string; options: string[]; key: string };

function SettingsPage() {
  const { show } = useToast();
  const wallet = useWallet();
  const [emailDraft, setEmailDraft] = useState(wallet.embeddedEmail ?? "");
  const connectedAddr = wallet.embeddedAddress ?? wallet.destination?.address ?? null;
  const [state, setState] = useState({
    name: wallet.embeddedEmail ?? (connectedAddr ? wallet.shorten(connectedAddr) : "Not connected"),
    currency: "IDR" as CurrencyCode,
    region: "APAC",
    network: NETWORK_LABEL,
    rpc: "Soroban · testnet",
    notifyOrders: true,
    notifyProofs: true,
    notifyPromos: false,
  });
  const [picker, setPicker] = useState<Choice | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [draftName, setDraftName] = useState(state.name);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const connected = Boolean(connectedAddr);

  const update = (k: keyof typeof state, v: string | boolean) => {
    setState((s) => ({ ...s, [k]: v }));
    show("Saved");
  };

  return (
    <>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune Anyramp to your workflow.</p>
      </div>

      <div className="mt-6 space-y-8 px-4 pb-6">
        <Group label="Wallet">
          {wallet.embeddedAddress || wallet.destination?.address ? (
            <li className="px-4 py-3.5">
              <p className="text-xs text-muted-foreground">Active address</p>
              <p className="mt-1 break-all font-mono text-sm">
                {wallet.embeddedAddress ?? wallet.destination?.address}
              </p>
              {wallet.embeddedEmail ? (
                <p className="mt-1 text-xs text-muted-foreground">{wallet.embeddedEmail}</p>
              ) : null}
            </li>
          ) : (
            <li className="px-4 py-3.5 text-sm text-muted-foreground">
              No wallet linked — paste a destination address when buying USDC.
            </li>
          )}
          {wallet.privyEnabled ? (
            <>
              <li>
                <button
                  type="button"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.signupWithTouchId()}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-opacity active:opacity-60 disabled:opacity-60"
                >
                  <span className="text-sm">Create wallet with passkey</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.openPrivyLogin()}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-opacity active:opacity-60 disabled:opacity-60"
                >
                  <span className="text-sm">Sign in with email</span>
                  <span className="text-xs text-muted-foreground">Privy</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  disabled={wallet.isConnecting}
                  onClick={() => void wallet.signInWithTouchId()}
                  className="flex w-full px-4 pb-3.5 text-left text-xs text-muted-foreground underline disabled:opacity-60"
                >
                  Already have a passkey? Sign in
                </button>
              </li>
            </>
          ) : (
            <>
              <li className="px-4 py-3.5">
                <input
                  autoComplete="email"
                  className="w-full rounded-2xl bg-background px-3 py-2.5 text-sm outline-none ring-1 ring-black/10"
                  onChange={(event) => setEmailDraft(event.target.value)}
                  placeholder="you@email.com"
                  type="email"
                  value={emailDraft}
                />
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={wallet.isConnecting || !emailDraft.trim()}
                    onClick={() => void wallet.createEmbeddedWithEmail(emailDraft)}
                    className="rounded-full bg-surface py-2 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
                  >
                    Create with email
                  </button>
                  {isPasskeySupported() ? (
                    <button
                      type="button"
                      disabled={wallet.isConnecting || !emailDraft.trim()}
                      onClick={() => void wallet.createEmbeddedWithPasskey(emailDraft)}
                      className="rounded-full bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      Create with passkey
                    </button>
                  ) : null}
                </div>
              </li>
            </>
          )}
          <li>
            <button
              type="button"
              disabled={wallet.isConnecting}
              onClick={() => void wallet.connectExternalWallet()}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-opacity active:opacity-60 disabled:opacity-60"
            >
              <span className="text-sm">Connect external wallet</span>
              <span className="text-xs text-muted-foreground">Freighter, xBull…</span>
            </button>
          </li>
          {wallet.error ? (
            <li className="px-4 pb-3 text-xs text-destructive">{wallet.error}</li>
          ) : null}
        </Group>

        <Group label="Account">
          <PickRow
            label="Display name"
            value={connected ? state.name : "Connect wallet"}
            onClick={() => {
              if (!connected) {
                setConnectOpen(true);
                return;
              }
              setDraftName(state.name);
              setNameOpen(true);
            }}
          />
          <PickRow
            label="Default currency"
            value={state.currency}
            onClick={() =>
              setPicker({
                label: "Default currency",
                key: "currency",
                options: [...CURRENCY_OPTIONS],
              })
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
          <InfoRow label="Stellar network" value={state.network} />
          <InfoRow label="RPC endpoint" value="soroban-testnet.stellar.org" />
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
        <ul className="space-y-2 pb-2">
          {picker?.options.map((opt) => {
            const current = (state as Record<string, unknown>)[picker.key] === opt;
            return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => {
                    update(picker.key as keyof typeof state, opt);
                    setPicker(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-full px-4 py-3.5 text-left ring-1 transition-colors active:scale-[0.99] ${
                    current
                      ? "bg-surface font-medium text-foreground ring-foreground"
                      : "bg-background text-foreground ring-border hover:bg-surface-muted"
                  }`}
                >
                  <span className="text-sm">{opt}</span>
                  {current && (
                    <svg className="size-4 shrink-0 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
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

      <Sheet open={connectOpen} onClose={() => setConnectOpen(false)} title="Connect a wallet">
        <p className="mb-4 text-sm text-muted-foreground">
          Connect a Stellar wallet first to set a display name and receive USDC.
        </p>
        <div className="space-y-2">
          {wallet.privyEnabled && (
            <button
              type="button"
              disabled={wallet.isConnecting}
              onClick={async () => {
                await wallet.openPrivyLogin();
                setConnectOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium ring-1 ring-black/10 disabled:opacity-60"
            >
              <span>Sign in with email or passkey</span>
              <span className="text-xs text-muted-foreground">Privy</span>
            </button>
          )}
          <button
            type="button"
            disabled={wallet.isConnecting}
            onClick={async () => {
              await wallet.connectExternalWallet();
              setConnectOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <span>Connect external wallet</span>
            <span className="text-xs text-primary-foreground/70">Freighter, xBull…</span>
          </button>
          {wallet.error && <p className="pt-1 text-xs text-destructive">{wallet.error}</p>}
        </div>
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
            onClick={async () => {
              setSignOutOpen(false);
              await wallet.disconnectAll();
              show("Signed out");
            }}
            className="flex-1 rounded-full bg-destructive py-3 text-sm font-medium text-background"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    </>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm">{label}</span>
      <span className="max-w-[60%] truncate text-xs text-muted-foreground">{value}</span>
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
        type="button"
        onClick={() => onChange(!on)}
        role="switch"
        aria-checked={on}
        aria-label={label}
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
    </li>
  );
}

