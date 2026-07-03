import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  asset: z.enum(["USDC", "XLM"]).default("USDC").catch("USDC"),
});

export const Route = createFileRoute("/transfer")({
  loader: () => undefined,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Transfer — Anyramp" },
      {
        name: "description",
        content: "Send USDC or XLM to any Stellar wallet address on mainnet.",
      },
    ],
  }),
});
