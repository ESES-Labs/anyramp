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

/** The Reclaim zkTLS proof stored against a settled order. */
export type StoredProof = {
  claimData: {
    provider: string;
    parameters: string; // JSON string: { method, url (api_key redacted), responseMatches, ... }
    context: string; // JSON string: { extractedParameters: {...}, providerHash }
    owner: string;
    timestampS: number;
    epoch: number;
    identifier: string;
  };
  signatures: string[];
  witnesses?: { id: string; url: string }[];
};

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
  proof?: StoredProof | null;
  createdAt: string;
};

/** Pull the human-readable proven facts out of a stored proof. */
export function provenFacts(proof: StoredProof) {
  let extracted: Record<string, string> = {};
  let url = "";
  try {
    extracted = JSON.parse(proof.claimData.context)?.extractedParameters ?? {};
  } catch {
    /* ignore */
  }
  try {
    url = JSON.parse(proof.claimData.parameters)?.url ?? "";
  } catch {
    /* ignore */
  }
  return {
    extracted,
    url, // api_key is already redacted to a template placeholder in the signed claim
    witness: proof.witnesses?.[0]?.id ?? proof.claimData.owner,
    attestorUrl: proof.witnesses?.[0]?.url ?? "",
    signature: proof.signatures?.[0] ?? "",
    identifier: proof.claimData.identifier,
    epoch: proof.claimData.epoch,
    timestampS: proof.claimData.timestampS,
  };
}

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

  /**
   * Real flow: poll while showing the QR. Confirms the Pakasir payment and, once paid,
   * runs the zkTLS prove → on-chain settle pipeline. Returns the current order — drive the
   * UI off `status`: created (waiting) → proving (verifying) → fulfilled (done + txHash).
   */
  settleReal: (id: string) =>
    req<BackendOrder>(`/orders/${id}/settle-real`, { method: "POST" }),

  /** Build the one-time USDC trustline the buyer signs so their wallet can hold USDC. */
  trustline: (address: string) =>
    req<{ xdr: string | null; alreadyTrusted: boolean; networkPassphrase?: string }>(
      "/wallet/trustline",
      { method: "POST", body: JSON.stringify({ address }) },
    ),

  /** Relay a signed classic tx (the trustline). */
  submitClassic: (signedXdr: string) =>
    req<{ hash: string }>("/wallet/submit-classic", {
      method: "POST",
      body: JSON.stringify({ signedXdr }),
    }),

  /** Real on-chain USDC balance for an address. */
  usdcBalance: (address: string) =>
    req<{ balance: string; trustline: boolean }>(`/wallet/${address}/usdc`),
};

export const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx/";
