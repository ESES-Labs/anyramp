import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// TanStack Start (official setup). Nitro is the deploy abstraction — it auto-detects the
// host at build time (Vercel on Vercel; a Node server → .output/server/index.mjs elsewhere,
// which is what the Docker image runs). A custom server entry at src/server.ts is picked up
// automatically. Path aliases come from tsconfig via resolve.tsconfigPaths.
export default defineConfig({
  server: {
    port: 8080,
    allowedHosts: [".trycloudflare.com"],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    nitro(),
    // React's plugin must come after TanStack Start's.
    viteReact(),
  ],
});
