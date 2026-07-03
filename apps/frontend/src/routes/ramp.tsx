import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  side: z.enum(["buy", "sell"]).default("buy").catch("buy"),
});

export const Route = createFileRoute("/ramp")({
  loader: () => undefined,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "New order — Anyramp" },
      {
        name: "description",
        content:
          "Start a peer-to-peer onramp or offramp. Settlement is verified end-to-end by a zero-knowledge proof on Stellar.",
      },
    ],
  }),
});
