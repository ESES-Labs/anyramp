import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  loader: () => undefined,
  head: () => ({
    meta: [
      { title: "History — Anyramp" },
      { name: "description", content: "All your Anyramp onramps and offramps, ZK-verified on Stellar." },
    ],
  }),
});
