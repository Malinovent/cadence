/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { APP_NAME } from "./src/appName";

const PAPER = "#f4ede1";
// a manifest and the page's meta tags hold one text: French first, both languages (S1.9, audit item 4)
const DESCRIPTION =
  "Équilibrez la semaine avant qu'elle vous déséquilibre. Balance the week before the week balances you.";

// Where the app is served (JP, 2026-11-18): /cadence/ on the old GitHub Pages address (and in dev),
// /app/ on rebalanceweek.com, built by the site repo with VITE_BASE=/app/. Everything else follows it:
// the manifest's start and scope, the service worker's scope, the sign-in redirect (BASE_URL).
const baseFor = (mode: string): string => {
  const b = loadEnv(mode, ".", "VITE_").VITE_BASE?.trim() || "/cadence/";
  return `/${b.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
};

export default defineConfig(({ mode }) => {
  const base = baseFor(mode);
  return {
    base,
    plugins: [
      react(),
      {
        name: "app-name-in-html",
        transformIndexHtml: (html) =>
          html.replaceAll("%APP_NAME%", APP_NAME).replaceAll("%APP_DESCRIPTION%", DESCRIPTION),
      },
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        // Icons and the manifest are already precached (glob below / added by the plugin).
        includeManifestIcons: false,
        devOptions: { enabled: false },
        manifest: {
          name: APP_NAME,
          short_name: APP_NAME,
          description: DESCRIPTION,
          display: "standalone",
          start_url: base,
          scope: base,
          background_color: PAPER,
          theme_color: PAPER,
          orientation: "any",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // manifest.webmanifest is always added by the plugin, so it is not globbed (avoids a duplicate entry).
          globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
          // Only the latin font subsets are precached; other subsets stay online-only.
          globIgnores: ["**/node_modules/**/*", "**/*-latin-ext-*.woff2", "**/*-vietnamese-*.woff2"],
          // Relative to the service worker, i.e. <base>index.html.
          navigateFallback: "index.html",
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: "node",
    },
  };
});
