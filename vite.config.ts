import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The client lives in client/ and builds into dist/, which the server hands out in production.
// In development Vite serves it on 127.0.0.1:5173 (Spotify accepts loopback IPs, not "localhost",
// in redirect URIs) and forwards /api to `npm run dev:server` on :4000.
export default defineConfig({
  root: "client",
  plugins: [react()],
  build: { outDir: "../dist", emptyOutDir: true },
  server: { host: "127.0.0.1", port: 5173, proxy: { "/api": "http://127.0.0.1:4000" } },
});
