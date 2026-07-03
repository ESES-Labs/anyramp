export function isValidStellarAddress(address: string) {
  return /^G[A-Z2-7]{55}$/.test(address.trim());
}

export function shortenAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars + 1)}…${address.slice(-chars)}`;
}

export const STELLAR_NETWORK =
  import.meta.env.VITE_STELLAR_NETWORK === "testnet" ? "testnet" : "mainnet";
