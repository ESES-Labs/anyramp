import { shortenAddress } from "./stellar-address";

/** Stellar testnet address used for demo / preview UI when no wallet is connected. */
export const DEMO_WALLET_ADDRESS =
  "GDQPBP5V24XERJ527XHUX2Z5KFVC2P3HHYFLMHEXKPNE2E5GBSTGOB";

export const DEMO_WALLET_SHORT = shortenAddress(DEMO_WALLET_ADDRESS);

/** Believable balance for the landing-page phone mock only. */
export const PREVIEW_USDC_BALANCE = 248.5;

export function getConnectedWalletAddress(wallet: {
  embeddedAddress: string | null;
  destination: { address: string; mode: string } | null;
}) {
  if (wallet.embeddedAddress) return wallet.embeddedAddress;
  if (wallet.destination && wallet.destination.mode !== "manual") {
    return wallet.destination.address;
  }
  return null;
}
