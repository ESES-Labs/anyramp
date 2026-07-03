import type { PrivyWalletApi } from "@/components/wallet/privy-wallet-bridge";

export async function waitForPrivyApi(
  getApi: () => PrivyWalletApi | null,
  timeoutMs = 15_000,
): Promise<PrivyWalletApi> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const api = getApi();
    if (api?.ready) return api;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Privy is still loading. Refresh and try again.");
}
