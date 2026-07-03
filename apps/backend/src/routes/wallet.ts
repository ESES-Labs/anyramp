// Wallet helpers for delivering USDC to a buyer's own Stellar account: build the one-time
// trustline they must sign, submit that classic tx, and read their real on-chain balance.
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { Asset, Horizon, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { publicKeyOf } from '@anyramp/sdk';
import { env } from '../config/env.ts';

export const wallet = new Hono();

const USDC_CODE = 'USDC';
// The escrow's USDC is a classic asset issued by the submitter account, wrapped in a SAC.
const usdcIssuer = () => publicKeyOf(env.SUBMITTER_SECRET);
const HORIZON_URL = env.NETWORK_PASSPHRASE.includes('Test')
  ? 'https://horizon-testnet.stellar.org'
  : 'https://horizon.stellar.org';

const horizon = () => new Horizon.Server(HORIZON_URL);

function usdcBalance(account: Horizon.AccountResponse) {
  const line = account.balances.find(
    (b) => 'asset_code' in b && b.asset_code === USDC_CODE && b.asset_issuer === usdcIssuer(),
  );
  return line && 'balance' in line ? line.balance : null;
}

// Build a changeTrust XDR the buyer signs once so their account can hold USDC.
wallet.post('/trustline', zValidator('json', z.object({ address: z.string().min(1) })), async (c) => {
  const { address } = c.req.valid('json');
  const account = await horizon().loadAccount(address);
  if (usdcBalance(account) !== null) {
    return c.json({ xdr: null, alreadyTrusted: true });
  }
  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: env.NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset(USDC_CODE, usdcIssuer()) }))
    .setTimeout(300)
    .build();
  return c.json({ xdr: tx.toXDR(), alreadyTrusted: false, networkPassphrase: env.NETWORK_PASSPHRASE });
});

// Relay a signed classic tx (the trustline) via Horizon.
wallet.post('/submit-classic', zValidator('json', z.object({ signedXdr: z.string().min(1) })), async (c) => {
  const tx = TransactionBuilder.fromXDR(c.req.valid('json').signedXdr, env.NETWORK_PASSPHRASE);
  const res = await horizon().submitTransaction(tx);
  return c.json({ hash: res.hash });
});

// Real on-chain USDC balance for an address (0 if unfunded / no trustline).
wallet.get('/:address/usdc', async (c) => {
  try {
    const account = await horizon().loadAccount(c.req.param('address'));
    const balance = usdcBalance(account);
    return c.json({ balance: balance ?? '0', trustline: balance !== null });
  } catch {
    return c.json({ balance: '0', trustline: false });
  }
});
