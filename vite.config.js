import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Plain SPA: no SSR, no Cloudflare worker, no platform plugins.
// The app runs entirely in the browser; keys live in the encrypted vault.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // The mock provider used by the e2e test lives on :8787.
    proxy: {
      "/mock-api": { target: "http://localhost:8787", changeOrigin: true, rewrite: (p) => p.replace(/^\/mock-api/, "") },
    },
  },
});
