// Pakasir adapter — real API shapes per https://pakasir.com/p/docs (22 Jun 2026).
// Works against the real API or src/mock-pakasir.ts (same contract), switched by base URL.
import { config } from './config.ts';

export interface PakasirPayment {
  project: string;
  order_id: string;
  amount: number;
  fee: number;
  total_payment: number;
  payment_method: string;
  payment_number: string; // QR string for qris
  expired_at: string;
}

export interface PakasirTransaction {
  amount: number;
  order_id: string;
  project: string;
  status: 'pending' | 'completed' | 'canceled';
  payment_method: string | null;
  completed_at: string | null;
}

async function post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${config.pakasirBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`pakasir ${path} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

const creds = () => ({ project: config.pakasirProject, api_key: config.pakasirApiKey });

export async function createTransaction(orderId: string, amount: number, method = 'qris') {
  const { payment } = await post<{ payment: PakasirPayment }>(
    `/api/transactioncreate/${method}`,
    { ...creds(), order_id: orderId, amount },
  );
  return payment;
}

/** Sandbox only: flips the transaction to completed and fires the webhook. */
export async function simulatePayment(orderId: string, amount: number) {
  return post<object>('/api/paymentsimulation', { ...creds(), order_id: orderId, amount });
}

export async function cancelTransaction(orderId: string, amount: number) {
  return post<object>('/api/transactioncancel', { ...creds(), order_id: orderId, amount });
}

/** This exact GET is also the zkFetch target (with api_key templated out — see zkprover.ts). */
export function transactionDetailUrl(orderId: string, amount: number, apiKey = config.pakasirApiKey) {
  const q = new URLSearchParams({
    project: config.pakasirProject,
    amount: String(amount),
    order_id: orderId,
    api_key: apiKey,
  });
  return `${config.pakasirBaseUrl}/api/transactiondetail?${q}`;
}

export async function transactionDetail(orderId: string, amount: number): Promise<PakasirTransaction> {
  const res = await fetch(transactionDetailUrl(orderId, amount));
  if (!res.ok) throw new Error(`pakasir transactiondetail -> ${res.status}: ${await res.text()}`);
  const { transaction } = (await res.json()) as { transaction: PakasirTransaction };
  return transaction;
}
