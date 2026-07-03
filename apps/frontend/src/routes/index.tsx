import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: () => undefined,
  head: () => ({
    meta: [
      { title: "Anyramp — Trustless onramp & offramp on Stellar" },
      {
        name: "description",
        content:
          "A mobile-first peer-to-peer onramp and offramp on Stellar. Every settlement is verified end-to-end with a zero-knowledge proof.",
      },
      { property: "og:title", content: "Anyramp — Trustless ZK onramp on Stellar" },
      {
        property: "og:description",
        content:
          "Convert between fiat and Stellar assets P2P, verified by zero-knowledge proofs.",
      },
    ],
  }),
});
