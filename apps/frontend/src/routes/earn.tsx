import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const earnSearchSchema = z.object({
  highlight: z.string().optional(),
});

export const Route = createFileRoute("/earn")({
  loader: () => undefined,
  validateSearch: earnSearchSchema,
  head: () => ({
    meta: [
      { title: "Earn — Anyramp" },
      {
        name: "description",
        content:
          "Provide liquidity for onramp and crypto top-up on Stellar. Earn yield from verified peer-to-peer flows.",
      },
    ],
  }),
});
