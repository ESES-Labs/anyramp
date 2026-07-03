import type { PaymentGatewayId } from "@/lib/payment-gateways";

export type GatewayCredential = {
  gatewayId: PaymentGatewayId;
  secret: string;
  connectedAt: string;
};

const STORAGE_KEY = "anyramp-payment-gateway-credentials";

let cached: GatewayCredential[] | undefined;
let cachedRaw: string | null | undefined;

function load(): GatewayCredential[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw && cached) return cached;

  cachedRaw = raw;
  if (!raw) {
    cached = [];
    return cached;
  }

  try {
    cached = JSON.parse(raw) as GatewayCredential[];
  } catch {
    cached = [];
  }
  return cached;
}

function persist(next: GatewayCredential[]) {
  const serialized = JSON.stringify(next);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cached = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("anyramp-gateway-credentials-updated"));
  }
}

export function subscribeGatewayCredentials(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = undefined;
      onChange();
    }
  };
  const onUpdated = () => onChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener("anyramp-gateway-credentials-updated", onUpdated);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("anyramp-gateway-credentials-updated", onUpdated);
  };
}

export function getGatewayCredentials(): GatewayCredential[] {
  return load();
}

export function getGatewayCredential(
  gatewayId: PaymentGatewayId,
): GatewayCredential | undefined {
  return load().find((c) => c.gatewayId === gatewayId);
}

export function hasGatewayCredential(gatewayId: PaymentGatewayId): boolean {
  return Boolean(getGatewayCredential(gatewayId));
}

export function saveGatewayCredential(
  gatewayId: PaymentGatewayId,
  secret: string,
): GatewayCredential {
  const trimmed = secret.trim();
  if (!trimmed) throw new Error("Credential cannot be empty");

  const credential: GatewayCredential = {
    gatewayId,
    secret: trimmed,
    connectedAt: new Date().toISOString(),
  };

  const existing = load().filter((c) => c.gatewayId !== gatewayId);
  persist([...existing, credential]);
  return credential;
}

export function revokeGatewayCredential(gatewayId: PaymentGatewayId) {
  persist(load().filter((c) => c.gatewayId !== gatewayId));
}

export function maskGatewayCredential(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}${"•".repeat(Math.min(trimmed.length - 8, 12))}${trimmed.slice(-4)}`;
}
