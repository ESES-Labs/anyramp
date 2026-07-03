export type OrderStatus = "settled" | "verifying" | "matched";
export type OrderKind = "onramp" | "offramp";

export type Order = {
  id: string;
  kind: OrderKind;
  asset: "USDC" | "XLM";
  amount: string; // signed amount
  fiat: string;
  method: "QRIS";
  rate: string;
  status: OrderStatus;
  when: string;
  day: "Today" | "Yesterday";
  // ZK / Stellar details
  proofId: string;
  txHash: string;
  peer: string;
  stellarAccount: string;
  proofSizeKb: number;
  proofTimeMs: number;
  circuit: string;
};

export const orders: Order[] = [
  {
    id: "8841-ZK",
    kind: "onramp",
    asset: "USDC",
    amount: "+850.00",
    fiat: "Rp850.000 · QRIS",
    method: "QRIS",
    rate: "1 USDC = Rp15.850",
    status: "verifying",
    when: "14:02",
    day: "Today",
    proofId: "zkp_8841_0xae21f3d49b6c7c5d18a07c45fbd9e2c8",
    txHash: "stellar:7a1f9c43d2e58b6f4c0a2e91d8b5a7e2c4f6d8a0b1c3e5f7a9b1c3d5e7f9a1b3",
    peer: "GA2C…N8KQ",
    stellarAccount: "GAYR…XQK7",
    proofSizeKb: 14,
    proofTimeMs: 1840,
    circuit: "groth16/qris_payment_v1",
  },
  {
    id: "8839-ZK",
    kind: "offramp",
    asset: "USDC",
    amount: "−210.00",
    fiat: "Rp209.620 · QRIS",
    method: "QRIS",
    rate: "1 USDC = 0.998 USD",
    status: "settled",
    when: "09:18",
    day: "Today",
    proofId: "zkp_8839_0x4f1a2b8c6d9e3a7b1c5d8e2f4a6b9c1d",
    txHash: "stellar:3b7c1e9f5d2a8e4b6c0d1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a",
    peer: "GBR3…L9WM",
    stellarAccount: "GAYR…XQK7",
    proofSizeKb: 13,
    proofTimeMs: 1610,
    circuit: "groth16/qris_payment_v1",
  },
  {
    id: "8821-ZK",
    kind: "onramp",
    asset: "XLM",
    amount: "+1,200.00",
    fiat: "Rp134.800 · QRIS",
    method: "QRIS",
    rate: "1 XLM = 0.112 USD",
    status: "settled",
    when: "20:44",
    day: "Yesterday",
    proofId: "zkp_8821_0xb2e7f1d4a8c6b3e9f2a5c8d1b4e7f0a3",
    txHash: "stellar:9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f",
    peer: "GCA7…M2HZ",
    stellarAccount: "GAYR…XQK7",
    proofSizeKb: 12,
    proofTimeMs: 1502,
    circuit: "groth16/qris_payment_v1",
  },
  {
    id: "8815-ZK",
    kind: "offramp",
    asset: "USDC",
    amount: "−500.00",
    fiat: "Rp2.498.100 · QRIS",
    method: "QRIS",
    rate: "1 USDC = 4.996 BRL",
    status: "settled",
    when: "11:02",
    day: "Yesterday",
    proofId: "zkp_8815_0x71a3c5e7f9b1d3a5c7e9f1b3d5a7c9e1",
    txHash: "stellar:5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c9e1f3a5b7c",
    peer: "GDX1…P4VN",
    stellarAccount: "GAYR…XQK7",
    proofSizeKb: 15,
    proofTimeMs: 1735,
    circuit: "groth16/qris_payment_v1",
  },
];

export function getOrder(id: string) {
  return orders.find((o) => o.id === id);
}

export function activeOrder() {
  return orders.find((o) => o.status === "verifying") ?? orders[0];
}
