import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/security")({
  loader: () => undefined,
  head: () => ({
    meta: [
      { title: "Security — Anyramp" },
      {
        name: "description",
        content:
          "Manage the zero-knowledge keys and recovery options that protect your Anyramp wallet on Stellar.",
      },
    ],
  }),
});
