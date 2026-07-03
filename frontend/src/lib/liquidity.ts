import { CURRENCY_RATES, formatFiat, type CurrencyCode } from "@/lib/currencies";

export type PoolType = "onramp" | "topup";
export type LiquidityAsset = "USDC" | "XLM";

export type LiquidityPosition = {
  id: string;
  pool: PoolType;
  asset: LiquidityAsset;
  deposited: number;
  rateMarkupBps: number;
  maxOrderFiat: number;
  paymentMethod: string;
  apy: number;
  earnedFiat: number;
  createdAt: string;
};

const STORAGE_KEY = "anyramp-liquidity-positions";
const FIAT: CurrencyCode = "IDR";

const DEMO_POSITIONS: LiquidityPosition[] = [
  {
    id: "LP-4200-USDC",
    pool: "onramp",
    asset: "USDC",
    deposited: 4200,
    rateMarkupBps: 25,
    maxOrderFiat: 1_000_000,
    paymentMethod: "QRIS",
    apy: 8.2,
    earnedFiat: 128_400,
    createdAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "LP-12500-XLM",
    pool: "topup",
    asset: "XLM",
    deposited: 12_500,
    rateMarkupBps: 0,
    maxOrderFiat: 500_000,
    paymentMethod: "Crypto transfer",
    apy: 6.4,
    earnedFiat: 42_100,
    createdAt: "2026-06-10T14:30:00.000Z",
  },
];

export const WALLET_BALANCES: Record<LiquidityAsset, number> = {
  USDC: 8420,
  XLM: 28500,
};

export const ONRAMP_APY = 8.2;
export const TOPUP_APY = 6.4;
export const XLM_USD = 0.112;

export const RATE_MARKUP_OPTIONS = [
  { label: "Market", bps: 0 },
  { label: "+0.25%", bps: 25 },
  { label: "+0.5%", bps: 50 },
  { label: "+1%", bps: 100 },
] as const;

export const VOLUME_CAP_OPTIONS = [500_000, 1_000_000, 2_500_000, 5_000_000] as const;

let cachedSnapshot: LiquidityPosition[] = DEMO_POSITIONS;
let cachedStorageRaw: string | null | undefined;

function loadSnapshot(): LiquidityPosition[] {
  if (typeof window === "undefined") return DEMO_POSITIONS;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedStorageRaw) return cachedSnapshot;

  cachedStorageRaw = raw;
  if (!raw) {
    cachedSnapshot = DEMO_POSITIONS;
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as LiquidityPosition[];
    cachedSnapshot = parsed.length ? parsed : DEMO_POSITIONS;
  } catch {
    cachedSnapshot = DEMO_POSITIONS;
  }
  return cachedSnapshot;
}

function readStore(): LiquidityPosition[] {
  return loadSnapshot();
}

function writeStore(positions: LiquidityPosition[]) {
  const serialized = JSON.stringify(positions);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedStorageRaw = serialized;
  cachedSnapshot = positions;
}

export function subscribeLiquidityPositions(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedStorageRaw = undefined;
      onStoreChange();
    }
  };
  const onUpdated = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener("anyramp-liquidity-updated", onUpdated);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("anyramp-liquidity-updated", onUpdated);
  };
}

export function getLiquidityPositions(): LiquidityPosition[] {
  return loadSnapshot();
}

export function getLiquidityPositionsServerSnapshot(): LiquidityPosition[] {
  return DEMO_POSITIONS;
}

export function addLiquidityPosition(
  input: Omit<LiquidityPosition, "id" | "createdAt" | "earnedFiat">,
): LiquidityPosition {
  const position: LiquidityPosition = {
    ...input,
    id: generatePositionId(input.asset),
    earnedFiat: 0,
    createdAt: new Date().toISOString(),
  };
  const existing = readStore();
  writeStore([position, ...existing]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("anyramp-liquidity-updated"));
  }
  return position;
}

export function generatePositionId(asset: LiquidityAsset): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LP-${Date.now().toString(36).slice(-4).toUpperCase()}-${asset}-${suffix}`;
}

export function poolLabel(pool: PoolType) {
  return pool === "onramp" ? "Onramp · USDC" : "Topup · XLM";
}

export function formatDeposited(amount: number, asset: LiquidityAsset) {
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset}`;
}

export function formatEarned(fiat: number) {
  return `+${formatFiat(fiat, FIAT)}`;
}

export function supportedFiatVolume(
  amount: number,
  asset: LiquidityAsset,
  markupBps: number,
) {
  const base =
    asset === "USDC"
      ? amount * CURRENCY_RATES.IDR
      : amount * XLM_USD * CURRENCY_RATES.IDR;
  return base * (1 + markupBps / 10_000);
}

export function effectiveRateLabel(asset: LiquidityAsset, markupBps: number) {
  const idr = CURRENCY_RATES.IDR;
  if (asset === "USDC") {
    const rate = idr * (1 + markupBps / 10_000);
    return `1 USDC = ${formatFiat(rate, FIAT)}`;
  }
  const rate = idr * XLM_USD * (1 + markupBps / 10_000);
  return `1 XLM = ${formatFiat(rate, FIAT)}`;
}

export function estimatedMonthlyYield(deposited: number, asset: LiquidityAsset, apy: number) {
  const fiat =
    asset === "USDC"
      ? deposited * CURRENCY_RATES.IDR
      : deposited * XLM_USD * CURRENCY_RATES.IDR;
  return (fiat * apy) / 100 / 12;
}

export function totalStats(positions: LiquidityPosition[]) {
  const earnedFiat = positions.reduce((s, p) => s + p.earnedFiat, 0);
  const activeLiquidity = positions.reduce((s, p) => {
    const fiat =
      p.asset === "USDC"
        ? p.deposited * CURRENCY_RATES.IDR
        : p.deposited * XLM_USD * CURRENCY_RATES.IDR;
    return s + fiat;
  }, 0);
  const avgApy =
    positions.length === 0
      ? 0
      : positions.reduce((s, p) => s + p.apy, 0) / positions.length;
  return { earnedFiat, activeLiquidity, avgApy, count: positions.length };
}
