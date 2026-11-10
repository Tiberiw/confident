/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  // Lazy-loaded libraries. Pre-bundling them at dev-server start avoids Vite discovering them
  // on first use and reloading the page, which swallowed the first PDF/3D click.
  optimizeDeps: {
    include: [
      "jspdf",
      "html2canvas",
      "@tensorflow/tfjs",
      "three",
      "three/examples/jsm/controls/OrbitControls.js",
      "three/examples/jsm/loaders/STLLoader.js",
    ],
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
