import { useState, useSyncExternalStore } from "react";
import {
  getGatewayCredential,
  getGatewayCredentials,
  maskGatewayCredential,
  revokeGatewayCredential,
  saveGatewayCredential,
  subscribeGatewayCredentials,
} from "@/lib/payment-gateway-credentials";
import {
  PAYMENT_GATEWAYS,
  type PaymentGateway,
  type PaymentGatewayId,
} from "@/lib/payment-gateways";

type PaymentGatewayPickerProps = {
  selected: PaymentGatewayId[];
  onChange: (next: PaymentGatewayId[]) => void;
};

export function PaymentGatewayPicker({ selected, onChange }: PaymentGatewayPickerProps) {
  const credentials = useSyncExternalStore(
    subscribeGatewayCredentials,
    getGatewayCredentials,
    () => [],
  );

  const toggle = (id: PaymentGatewayId) => {
    onChange(
      selected.includes(id) ? selected.filter((g) => g !== id) : [...selected, id],
    );
  };

  return (
    <ul className="space-y-2">
      {PAYMENT_GATEWAYS.map((gateway) => {
        const active = selected.includes(gateway.id);
        const credential = credentials.find((c) => c.gatewayId === gateway.id);
        return (
          <GatewayOption
            key={gateway.id}
            gateway={gateway}
            active={active}
            credential={credential}
            onToggle={() => toggle(gateway.id)}
          />
        );
      })}
    </ul>
  );
}

function GatewayOption({
  gateway,
  active,
  credential,
  onToggle,
}: {
  gateway: PaymentGateway;
  active: boolean;
  credential?: { secret: string; connectedAt: string };
  onToggle: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    setError(null);
    try {
      saveGatewayCredential(gateway.id, draft);
      setDraft("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const revoke = () => {
    revokeGatewayCredential(gateway.id);
    setDraft("");
    setError(null);
  };

  return (
    <li className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 ring-1 transition-colors ${
          active ? "ring-foreground" : "ring-black/5"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white px-1 ring-1 ring-black/5">
            <img
              src={gateway.logo}
              alt=""
              className="max-h-7 max-w-[72px] object-contain"
              loading="lazy"
            />
          </span>
          <div className="text-left">
            <p className="text-sm font-medium">{gateway.label}</p>
            <p className="text-xs text-muted-foreground">{gateway.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {credential && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent ring-1 ring-accent/15">
              Connected
            </span>
          )}
          <span
            className={`grid size-5 place-items-center rounded-full ring-1 transition-colors ${
              active
                ? "bg-foreground ring-foreground"
                : "bg-background ring-black/10"
            }`}
          >
            {active && <span className="size-1.5 rounded-full bg-background" />}
          </span>
        </div>
      </button>

      {active && (
        <div className="rounded-2xl bg-surface-muted/70 px-4 py-3 ring-1 ring-black/5">
          {credential ? (
            <ConnectedCredential
              gateway={gateway}
              masked={maskGatewayCredential(credential.secret)}
              connectedAt={credential.connectedAt}
              onRevoke={revoke}
            />
          ) : (
            <CredentialForm
              gateway={gateway}
              draft={draft}
              error={error}
              onDraftChange={setDraft}
              onConnect={connect}
            />
          )}
        </div>
      )}
    </li>
  );
}

function CredentialForm({
  gateway,
  draft,
  error,
  onDraftChange,
  onConnect,
}: {
  gateway: PaymentGateway;
  draft: string;
  error: string | null;
  onDraftChange: (value: string) => void;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
        {gateway.credentialLabel}
      </label>
      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder={gateway.credentialPlaceholder}
        rows={2}
        spellCheck={false}
        autoComplete="off"
        className="w-full resize-none rounded-xl bg-surface px-3 py-2 font-mono text-xs outline-none ring-1 ring-black/10 placeholder:text-muted-foreground/60 focus:ring-foreground/30"
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Stored locally for settlement only. After saving it becomes read-only — revoke to
        replace.
      </p>
      <button
        type="button"
        onClick={onConnect}
        disabled={!draft.trim()}
        className="w-full rounded-full bg-foreground py-2 text-xs font-medium text-background disabled:opacity-40"
      >
        Save credential
      </button>
    </div>
  );
}

function ConnectedCredential({
  gateway,
  masked,
  connectedAt,
  onRevoke,
}: {
  gateway: PaymentGateway;
  masked: string;
  connectedAt: string;
  onRevoke: () => void;
}) {
  const connectedLabel = new Date(connectedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          {gateway.credentialLabel}
        </label>
        <span className="text-[10px] text-muted-foreground">Connected {connectedLabel}</span>
      </div>
      <input
        readOnly
        value={masked}
        aria-label={`${gateway.label} credential (read-only)`}
        className="w-full cursor-default rounded-xl bg-surface px-3 py-2 font-mono text-xs text-muted-foreground outline-none ring-1 ring-black/10"
      />
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Read-only. Revoke anytime to disconnect this merchant account.
      </p>
      <button
        type="button"
        onClick={onRevoke}
        className="w-full rounded-full bg-surface py-2 text-xs font-medium text-destructive ring-1 ring-destructive/20 transition-colors active:bg-destructive/5"
      >
        Revoke credential
      </button>
    </div>
  );
}

export function PaymentGatewayBadges({ ids }: { ids: PaymentGatewayId[] }) {
  if (!ids.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const gateway = PAYMENT_GATEWAYS.find((g) => g.id === id);
        if (!gateway) return null;
        return (
          <span
            key={id}
            title={gateway.label}
            className="grid size-6 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-black/5"
          >
            <img src={gateway.logo} alt={gateway.label} className="size-4 object-contain" />
          </span>
        );
      })}
    </div>
  );
}

export function PaymentGatewayReviewRow({ ids }: { ids: PaymentGatewayId[] }) {
  if (!ids.length) {
    return <span className="text-sm font-medium text-muted-foreground">None selected</span>;
  }

  return (
    <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">
      {ids.map((id) => {
        const gateway = PAYMENT_GATEWAYS.find((g) => g.id === id);
        if (!gateway) return null;
        const connected = Boolean(getGatewayCredential(id));
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted py-0.5 pl-0.5 pr-2 ring-1 ring-black/5"
          >
            <span className="grid size-5 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/5">
              <img src={gateway.logo} alt="" className="size-3.5 object-contain" />
            </span>
            <span className="text-[11px] font-medium">{gateway.label}</span>
            {connected && (
              <span className="size-1.5 rounded-full bg-accent" title="Credential connected" />
            )}
          </span>
        );
      })}
    </div>
  );
}

export function gatewaysMissingCredentials(ids: PaymentGatewayId[]): PaymentGatewayId[] {
  return ids.filter((id) => !getGatewayCredential(id));
}
