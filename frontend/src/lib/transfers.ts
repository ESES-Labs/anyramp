export type TransferAsset = "USDC" | "XLM";

export type TransferRecord = {
  id: string;
  asset: TransferAsset;
  amount: number;
  destination: string;
  memo?: string;
  txHash: string;
  createdAt: string;
};

export const WALLET_BALANCES: Record<TransferAsset, number> = {
  USDC: 12_000.4,
  XLM: 4_290,
};

export const QUICK_AMOUNTS: Record<TransferAsset, string[]> = {
  USDC: ["100", "500", "1000", "2500"],
  XLM: ["500", "1000", "2500", "5000"],
};

const STORAGE_KEY = "anyramp-transfers";

export { isValidStellarAddress, shortenAddress } from "./stellar-address";

export function generateTransferId() {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TX-${Date.now().toString(36).slice(-4).toUpperCase()}-${suffix}`;
}

export function generateTxHash() {
  const hex = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("");
  return `stellar:${hex}${hex}${hex}${hex}`.slice(0, 72);
}

export function saveTransfer(record: TransferRecord) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as TransferRecord[]) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing]));
    window.dispatchEvent(new Event("anyramp-transfer-updated"));
  } catch {
    // ignore storage errors in demo
  }
}

export function getRecentTransfers(): TransferRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TransferRecord[]) : [];
  } catch {
    return [];
  }
}
