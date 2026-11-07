import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    proxy: {
      // CBOE's CDN does not send CORS headers; proxy it during browser dev.
      "/cboe": {
        target: "https://cdn-api.cboe.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cboe/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
