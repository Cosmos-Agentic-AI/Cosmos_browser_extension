import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Cosmos build config.
// Manifest V3 requires separate, non-hashed entry bundles for the
// background service worker, content script, popup, and onboarding UI —
// so we configure Rollup with explicit multi-entry input rather than
// relying on Vite's default single-page-app bundling.
//
// NOTE: modulePreload is disabled because MV3 extension pages emit
// `<link rel="modulepreload">` for shared chunks under `chunks/`, which
// Chrome flags as "cross-world extension resource mismatch" warnings.
// The chunks still load fine via dynamic import() from each entry; only
// the speculative preload hint is suppressed.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@modules": resolve(__dirname, "src/modules"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/index.ts"),
        content: resolve(__dirname, "src/content/index.ts"),
        popup: resolve(__dirname, "popup/index.html"),
        onboarding: resolve(__dirname, "onboarding/index.html"),
      },
      output: {
        entryFileNames: "[name]/index.js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
