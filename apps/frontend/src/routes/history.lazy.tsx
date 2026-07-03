import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UsdcIcon } from "@/components/usdc-icon";
import { ProofSheet } from "@/components/proof-viewer";
import { api, type BackendOrder } from "@/lib/api";

export const Route = createLazyFileRoute("/history")({
  component: HistoryPage,
});

const STATUS: Record<string, { label: string; cls: string }> = {
  fulfilled: { label: "ZK verified", cls: "text-accent" },
  proving: { label: "Verifying", cls: "text-foreground" },
  proved: { label: "Verifying", cls: "text-foreground" },
  paid_detected: { label: "Paid", cls: "text-foreground" },
  created: { label: "Awaiting payment", cls: "text-muted-foreground" },
  expired: { label: "Expired", cls: "text-muted-foreground" },
};

function HistoryPage() {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [proofOrderId, setProofOrderId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listOrders()
      .then(setOrders)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="px-5 pt-2">
        <h1 className="font-serif text-3xl tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every settlement is verified on Stellar by a zero-knowledge proof. Tap a settled order
          to inspect its proof.
        </p>
      </div>

      <div className="mt-5 space-y-3 px-4">
        {loading && (
          <p className="px-1 pt-4 text-center text-sm text-muted-foreground">Loading…</p>
        )}
        {err && (
          <p className="px-1 pt-4 text-center text-sm text-red-600">
            Backend offline — start the API on :4000.
          </p>
        )}
        {!loading && !err && orders.length === 0 && (
          <p className="px-1 pt-4 text-center text-sm text-muted-foreground">
            No orders yet. Buy some USDC to see it here.
          </p>
        )}

        {orders.length > 0 && (
          <ul className="overflow-hidden rounded-3xl bg-surface ring-1 ring-black/5">
            {orders.map((o, i) => {
              const st = STATUS[o.status] ?? STATUS.created!;
              const when = new Date(o.createdAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const settled = o.status === "fulfilled";
              const row = (
                <div className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft">
                      <UsdcIcon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">Onramp · USDC</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Rp{o.amountIdr.toLocaleString("id-ID")} · QRIS
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        +{(Number(o.usdcAmount) / 1e7).toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        <span className={`font-medium ${st.cls}`}>{st.label}</span> · {when}
                      </p>
                    </div>
                    {settled && (
                      <svg className="size-4 shrink-0 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
                      </svg>
                    )}
                  </div>
                </div>
              );
              return (
                <li key={o.orderId} className={i > 0 ? "border-t border-border" : ""}>
                  {settled ? (
                    <button
                      type="button"
                      onClick={() => setProofOrderId(o.orderId)}
                      className="block w-full transition-colors active:bg-surface-muted"
                    >
                      {row}
                    </button>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <ProofSheet
        orderId={proofOrderId}
        open={Boolean(proofOrderId)}
        onClose={() => setProofOrderId(null)}
      />
    </>
  );
}
