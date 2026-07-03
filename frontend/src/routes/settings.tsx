import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  loader: () => undefined,
  head: () => ({
    meta: [
      { title: "Settings — Anyramp" },
      { name: "description", content: "Preferences for your Anyramp wallet, network, and notifications." },
    ],
  }),
});
