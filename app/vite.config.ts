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
    // Cargo locks files under src-tauri/target; watching it crashes Vite on Windows.
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      // CBOE's CDN does not send CORS headers; proxy it during browser dev.
      "/cboe": {
        target: "https://cdn-api.cboe.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cboe/, ""),
      },
      // Nasdaq's calendar API also lacks CORS headers in browser dev.
      "/nasdaq": {
        target: "https://api.nasdaq.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nasdaq/, ""),
        headers: {
          origin: "https://www.nasdaq.com",
          referer: "https://www.nasdaq.com/",
        },
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
