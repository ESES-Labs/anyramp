import { Sheet } from "./sheet";
import { useToast } from "./toast";
import type { Order } from "@/lib/orders";

export function OrderSheet({
  open,
  onClose,
  order,
}: {
  open: boolean;
  onClose: () => void;
  order: Order | null;
}) {
  const { show } = useToast();
  if (!order) return null;

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      show(`${label} copied`);
    } catch {
      show("Couldn't copy");
    }
  };

  const statusLabel =
    order.status === "settled"
      ? "ZK verified · settled on Stellar"
      : order.status === "verifying"
        ? "Generating zero-knowledge proof"
        : "Matched with peer";

  return (
    <Sheet open={open} onClose={onClose} title={`Order ${order.id}`}>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            order.status === "settled"
              ? "bg-accent"
              : order.status === "verifying"
                ? "bg-foreground animate-pulse"
                : "bg-muted-foreground"
          }`}
        />
        <span className="text-xs font-medium text-muted-foreground">{statusLabel}</span>
      </div>

      <div className="mt-5 rounded-2xl bg-surface p-5 ring-1 ring-black/5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              {order.kind === "onramp" ? "Bought" : "Sold"}
            </p>
            <p className="font-serif text-2xl tracking-tight">
              {order.amount.replace(/^[+−-]/, "")} {order.asset}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">via {order.method}</p>
            <p className="text-sm font-medium">{order.fiat.split(" · ")[0]}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
          <Stat label="Rate" value={order.rate} />
          <Stat label="Peer" value={order.peer} />
        </div>
      </div>

      <h3 className="mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Zero-knowledge proof
      </h3>
      <div className="mt-3 space-y-2">
        <CopyRow
          label="Proof ID"
          value={order.proofId}
          onCopy={() => copy("Proof ID", order.proofId)}
        />
        <CopyRow
          label="Stellar tx hash"
          value={order.txHash}
          onCopy={() => copy("Tx hash", order.txHash)}
        />
        <CopyRow
          label="Order ID"
          value={order.id}
          onCopy={() => copy("Order ID", order.id)}
        />
      </div>

      <h3 className="mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Proof metadata
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Circuit" value={order.circuit.split("/")[0]} />
        <Metric label="Size" value={`${order.proofSizeKb} KB`} />
        <Metric label="Gen" value={`${(order.proofTimeMs / 1000).toFixed(2)}s`} />
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-accent-soft/60 p-4 ring-1 ring-accent/10">
        <svg className="mt-0.5 size-4 shrink-0 text-accent" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M8 1.2c-1.6.9-3.3 1.4-5 1.5v5.4c0 3 2 5.4 5 6.7 3-1.3 5-3.7 5-6.7V2.7c-1.7-.1-3.4-.6-5-1.5Z" />
        </svg>
        <p className="text-xs leading-relaxed text-foreground/80">
          Anyramp proved the fiat transfer happened — without revealing bank details to your peer
          or the chain. The proof unlocks the on-chain escrow on Stellar automatically.
        </p>
      </div>

      <button
        onClick={() => copy("Tx hash", order.txHash)}
        className="mt-5 w-full rounded-full bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-transform active:scale-[0.98]"
      >
        Copy Stellar tx hash
      </button>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 ring-1 ring-black/5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
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
  onCopy: () => void;
}) {
  return (
    <button
      onClick={onCopy}
      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-black/5 transition-colors hover:ring-black/10 active:bg-surface-muted"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-foreground">{value}</p>
      </div>
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-muted-foreground ring-1 ring-black/5">
        <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M5 2.75A1.75 1.75 0 0 1 6.75 1h4.5A1.75 1.75 0 0 1 13 2.75v7.5A1.75 1.75 0 0 1 11.25 12H10v1.25A1.75 1.75 0 0 1 8.25 15h-4.5A1.75 1.75 0 0 1 2 13.25v-7.5A1.75 1.75 0 0 1 3.75 4H5V2.75Zm1.5 0v.25H5v6.5h5V2.75a.25.25 0 0 0-.25-.25H6.75a.25.25 0 0 0-.25.25Z" />
        </svg>
      </span>
    </button>
  );
}
