import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  loader: () => undefined,
  head: () => ({
    meta: [
      { title: "Anyramp — Trustless onramp & offramp on Stellar" },
      {
        name: "description",
        content:
          "Convert between fiat and Stellar assets peer-to-peer. Every settlement is verified on-chain with a zero-knowledge proof.",
      },
    ],
  }),
});
