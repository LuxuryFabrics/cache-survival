import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["data/library-seed.json", "data/manifest.json", "data/world-110m.geojson", "data/lakes.geojson", "data/places.json", "icons/**/*", "fonts/**/*.pbf"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,wasm}"],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
          },
        ],
      },
      manifest: {
        name: "CACHE — Offline Survival AI",
        short_name: "CACHE",
        description: "Fully offline survival companion. No cloud after install.",
        theme_color: "#f4f4f2",
        background_color: "#f4f4f2",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@cache/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
