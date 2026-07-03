import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  pool: z.enum(["onramp", "topup"]).default("onramp").catch("onramp"),
});

export const Route = createFileRoute("/earn/add-liquidity")({
  loader: () => undefined,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Add liquidity — Anyramp" },
      {
        name: "description",
        content: "Add liquidity to onramp or crypto top-up pools on Stellar.",
      },
    ],
  }),
});
