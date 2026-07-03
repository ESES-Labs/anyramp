export type CurrencyCode = "IDR" | "USD" | "EUR" | "BRL" | "GBP";

/** Demo fiat rates vs 1 USDC */
export const CURRENCY_RATES: Record<CurrencyCode, number> = {
  IDR: 15850,
  USD: 1,
  EUR: 0.92,
  BRL: 4.99,
  GBP: 0.79,
};

export const CURRENCY_OPTIONS: CurrencyCode[] = ["IDR", "USD", "EUR", "BRL", "GBP"];

export function formatFiat(amount: number, currency: CurrencyCode) {
  if (currency === "IDR") {
    return `Rp${amount.toLocaleString("id-ID")}`;
  }
  if (currency === "EUR") return `€${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (currency === "BRL") return `R$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (currency === "GBP") return `£${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function usdcFromFiat(amount: number, currency: CurrencyCode) {
  const rate = CURRENCY_RATES[currency];
  return ((amount / rate) * 0.998).toFixed(2);
}

export function rateLabel(currency: CurrencyCode) {
  const rate = CURRENCY_RATES[currency];
  if (currency === "IDR") return `1 USDC = ${formatFiat(rate, "IDR")}`;
  if (currency === "USD") return "1 USDC = 1.00 USD";
  if (currency === "EUR") return `1 USDC = €${rate.toFixed(2)}`;
  if (currency === "BRL") return `1 USDC = R$${rate.toFixed(2)}`;
  return `1 USDC = £${rate.toFixed(2)}`;
}
