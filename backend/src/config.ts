import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),

  // Pakasir — point PAKASIR_BASE_URL at the mock server until real creds arrive.
  pakasirBaseUrl: process.env.PAKASIR_BASE_URL ?? 'https://app.pakasir.com',
  pakasirProject: process.env.PAKASIR_PROJECT ?? '',
  pakasirApiKey: process.env.PAKASIR_API_KEY ?? '',

  // Reclaim zkFetch (dev.reclaimprotocol.org)
  reclaimAppId: process.env.RECLAIM_APP_ID ?? '',
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET ?? '',

  // Stellar
  escrowContractId: process.env.ESCROW_CONTRACT_ID ?? '',
  sorobanRpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org',
};
