import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { useToast } from "@/components/toast";
import { api, EXPLORER_TX, provenFacts, type BackendOrder } from "@/lib/api";

/**
 * Client-facing transparency: shows the raw zkTLS proof behind a settlement — what it
 * asserts, who signed it (the attestor witness), and the on-chain tx where the escrow
 * verified it. Fetches the order fresh so the full proof is present.
 */
export function ProofSheet({
  orderId,
  open,
  onClose,
}: {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<BackendOrder | null>(null);
  const { show } = useToast();

  useEffect(() => {
    if (!open || !orderId) return;
    setOrder(null);
    api
      .getOrder(orderId)
      .then(setOrder)
      .catch(() => {});
  }, [open, orderId]);

  const proof = order?.proof;
  const copy = (label: string, value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    show(`${label} copied`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Zero-knowledge proof">
      {!proof ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {order && order.status !== "fulfilled"
            ? "No proof yet — this order hasn't settled."
            : "Loading proof…"}
        </p>
      ) : (
        <ProofBody order={order!} onCopy={copy} />
      )}
    </Sheet>
  );
}

function ProofBody({
  order,
  onCopy,
}: {
  order: BackendOrder;
  onCopy: (label: string, value: string) => void;
}) {
  const f = provenFacts(order.proof!);
  const host = safeHost(f.url);
  const isProd = f.extracted.is_sandbox === "false";

  return (
    <div className="space-y-5 pb-2">
      {/* On-chain verification */}
      <div className="rounded-2xl bg-accent-soft/60 p-4 ring-1 ring-accent/10">
        <div className="flex items-center gap-2">
          <span className="grid size-5 place-items-center rounded-full bg-accent text-background">
            <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <p className="text-sm font-medium">Verified on Stellar</p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-foreground/70">
          The escrow re-computed this proof&apos;s digest on-chain, checked the attestor
          signature, then released the USDC. No one has to trust Anyramp.
        </p>
        {order.txHash ? (
          <a
            href={`${EXPLORER_TX}${order.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 break-all font-mono text-xs text-accent underline underline-offset-2"
          >
            {order.txHash.slice(0, 18)}… ↗
          </a>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Settlement tx not recorded.</p>
        )}
      </div>

      {/* What the proof asserts */}
      <section>
        <h3 className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What the proof asserts
        </h3>
        <dl className="space-y-1 rounded-2xl bg-surface p-4 ring-1 ring-black/5">
          <Fact label="Payment status" value={f.extracted.status ?? "—"} highlight />
          <Fact
            label="Amount paid"
            value={f.extracted.amount ? `Rp${Number(f.extracted.amount).toLocaleString("id-ID")}` : "—"}
          />
          <Fact label="Order ID" value={f.extracted.order_id ?? order.orderId} mono />
          <Fact label="Merchant" value={f.extracted.project ?? "—"} />
          <Fact label="Environment" value={isProd ? "Production" : "Sandbox"} />
        </dl>
        <p className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          These values are cryptographically bound to {host || "the payment provider"}&apos;s real
          TLS response — not asserted by our backend.
        </p>
      </section>

      {/* Attestor / signature */}
      <section>
        <h3 className="px-1 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Signed by attestor
        </h3>
        <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-black/5">
          <CopyRow label="Witness address" value={f.witness} onCopy={onCopy} />
          <CopyRow label="Signature" value={f.signature} onCopy={onCopy} />
          <CopyRow label="Claim identifier" value={f.identifier} onCopy={onCopy} />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Proven endpoint</span>
            <span className="max-w-[62%] truncate font-mono text-foreground/80">{host || "—"}</span>
          </div>
        </div>
        <p className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
          The API key is redacted inside the proof — the attestor proves the response without
          leaking the secret.
        </p>
      </section>

      {/* Raw proof */}
      <details className="rounded-2xl bg-surface-muted/50 ring-1 ring-black/5">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
          Raw proof (JSON)
        </summary>
        <div className="space-y-2 px-4 pb-4">
          <button
            type="button"
            onClick={() => onCopy("Proof JSON", JSON.stringify(order.proof, null, 2))}
            className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium ring-1 ring-black/10"
          >
            Copy JSON
          </button>
          <pre className="max-h-64 overflow-auto rounded-xl bg-background p-3 text-[10px] leading-relaxed ring-1 ring-black/5">
            {JSON.stringify(order.proof, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}

function Fact({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`max-w-[62%] truncate text-sm font-medium ${mono ? "font-mono text-xs" : ""} ${
          highlight ? "text-accent" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(label, value)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-foreground/80">
        {value ? `${value.slice(0, 20)}…` : "—"}
      </span>
    </button>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
