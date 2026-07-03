export type PaymentGatewayId =
  | "gopay-merchant"
  | "dana-bisnis"
  | "midtrans"
  | "xendit"
  | "mayar"
  | "pakasir";

export type PaymentGateway = {
  id: PaymentGatewayId;
  label: string;
  sub: string;
  logo: string;
  website: string;
  credentialLabel: string;
  credentialPlaceholder: string;
};

export const PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: "gopay-merchant",
    label: "GoPay Merchant",
    sub: "GoPay for Business · e-wallet QR",
    logo: "/payment-gateways/GoPay%20Logo%20Vertical_Primary.png",
    website: "gopay.co.id",
    credentialLabel: "Merchant API key",
    credentialPlaceholder: "Paste GoPay Merchant server key",
  },
  {
    id: "dana-bisnis",
    label: "DANA Bisnis",
    sub: "DANA for Business · merchant QRIS",
    logo: "/payment-gateways/dana-icon.jpg",
    website: "dana.id",
    credentialLabel: "Merchant credential",
    credentialPlaceholder: "Paste DANA Bisnis API credential",
  },
  {
    id: "midtrans",
    label: "Midtrans",
    sub: "Payment gateway · QRIS & VA",
    logo: "/payment-gateways/midtrans.svg",
    website: "midtrans.com",
    credentialLabel: "Server key",
    credentialPlaceholder: "Paste Midtrans server key",
  },
  {
    id: "xendit",
    label: "Xendit",
    sub: "Payments API · QRIS & e-wallets",
    logo: "/payment-gateways/xendit.svg",
    website: "xendit.co",
    credentialLabel: "Secret API key",
    credentialPlaceholder: "Paste Xendit secret key",
  },
  {
    id: "mayar",
    label: "mayar.id",
    sub: "Payment links · QRIS checkout",
    logo: "/payment-gateways/mayarid.png",
    website: "mayar.id",
    credentialLabel: "API key",
    credentialPlaceholder: "Paste mayar.id API key",
  },
  {
    id: "pakasir",
    label: "Pakasir",
    sub: "QRIS aggregator · instant settlement",
    logo: "/payment-gateways/pakasir.svg",
    website: "pakasir.com",
    credentialLabel: "API key",
    credentialPlaceholder: "Paste Pakasir API key",
  },
];

const gatewayById = new Map(PAYMENT_GATEWAYS.map((g) => [g.id, g]));

export function getPaymentGateway(id: PaymentGatewayId): PaymentGateway {
  const gateway = gatewayById.get(id);
  if (!gateway) throw new Error(`Unknown payment gateway: ${id}`);
  return gateway;
}

export function formatPaymentGatewayLabels(ids: PaymentGatewayId[]): string {
  if (!ids.length) return "None selected";
  return ids.map((id) => getPaymentGateway(id).label).join(", ");
}

export const DEFAULT_ONRAMP_GATEWAYS: PaymentGatewayId[] = ["pakasir"];
