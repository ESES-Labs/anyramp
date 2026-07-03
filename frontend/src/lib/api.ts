// Typed client for the AnyRamp backend (Hono, :4000). Swagger docs live at its root.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(body.message ?? body.error ?? `${res.status} ${path}`));
  }
  return body as T;
}

export type BackendOrderStatus =
  | "created"
  | "paid_detected"
  | "proving"
  | "proved"
  | "fulfilled"
  | "expired";

export type BackendOrder = {
  orderId: string;
  amountIdr: number;
  usdcAmount: string; // i128 stroops
  sellerAddress: string;
  buyerAddress: string | null;
  qrString: string | null;
  totalPayment: number | null;
  expiredAt: string | null;
  status: BackendOrderStatus;
  txHash: string | null;
  createdAt: string;
};

export const api = {
  createOrder: (o: {
    orderId: string;
    amountIdr: number;
    usdcAmount: string;
    sellerAddress: string;
    buyerAddress?: string;
  }) => req<BackendOrder>("/orders", { method: "POST", body: JSON.stringify(o) }),

  getOrder: (id: string) => req<BackendOrder>(`/orders/${id}`),
  listOrders: () => req<BackendOrder[]>("/orders"),

  /** Demo: the seller/LP locks the USDC into the on-chain escrow for this order. */
  lock: (id: string) => req<{ hash: string }>(`/orders/${id}/lock`, { method: "POST" }),

  /** Sandbox helper: flips the Pakasir transaction to completed + fires the webhook. */
  simulatePayment: (id: string) => req<unknown>(`/orders/${id}/simulate`, { method: "POST" }),

  /** Kicks off zkTLS proving in the background (202); poll getOrder until 'proved'. */
  prove: (id: string) => req<unknown>(`/orders/${id}/prove`, { method: "POST" }),

  /** Trustless path: unsigned fulfill tx XDR for the buyer to sign in their wallet. */
  settle: (id: string, buyerAddress: string) =>
    req<{ xdr: string; networkPassphrase: string }>(`/orders/${id}/settle`, {
      method: "POST",
      body: JSON.stringify({ buyerAddress }),
    }),

  /** Relay the wallet-signed XDR. */
  submit: (id: string, signedXdr: string) =>
    req<{ hash: string; order: BackendOrder }>(`/orders/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ signedXdr }),
    }),

  /** Demo path: server signs & submits as the buyer. */
  settleAuto: (id: string) =>
    req<{ hash: string; buyer: string; order: BackendOrder }>(`/orders/${id}/settle/auto`, {
      method: "POST",
    }),

  /** Settle a real proof on-chain (records the tx against forOrderId for history). */
  demoSettle: (forOrderId?: string) =>
    req<{ orderId: string; hash: string; escrow: string }>("/demo/settle", {
      method: "POST",
      body: JSON.stringify({ forOrderId }),
    }),
};

export const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx/";
