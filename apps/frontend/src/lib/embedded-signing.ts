import { STELLAR_NETWORK } from "@/lib/stellar-address";

export const STELLAR_NETWORK_PASSPHRASE =
  STELLAR_NETWORK === "testnet"
    ? "Test SDF Network ; September 2015"
    : "Public Global Stellar Network ; September 2015";

export async function signStellarXdrWithSecret(unsignedXdr: string, secret: string) {
  const { Keypair, TransactionBuilder } = await import("@stellar/stellar-sdk");
  const keypair = Keypair.fromSecret(secret);
  const tx = TransactionBuilder.fromXDR(unsignedXdr, STELLAR_NETWORK_PASSPHRASE);
  tx.sign(keypair);
  return tx.toXDR();
}

export async function signStellarXdrWithPrivy(
  unsignedXdr: string,
  address: string,
  signRawHash: (input: {
    address: string;
    chainType: "stellar";
    hash: `0x${string}`;
  }) => Promise<{ signature: `0x${string}` }>,
) {
  const { TransactionBuilder } = await import("@stellar/stellar-sdk");
  const tx = TransactionBuilder.fromXDR(unsignedXdr, STELLAR_NETWORK_PASSPHRASE);
  const hashHex = `0x${tx.hash().toString("hex")}` as `0x${string}`;
  const { signature } = await signRawHash({
    address,
    chainType: "stellar",
    hash: hashHex,
  });
  const hex = signature.slice(2);
  let binary = "";
  for (let i = 0; i < hex.length; i += 2) {
    binary += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  tx.addSignature(address, btoa(binary));
  return tx.toXDR();
}
