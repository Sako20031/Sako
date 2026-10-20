import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: { proxy: { "/api": "http://127.0.0.1:8000" }, fs: { allow: [".."] } },
  preview: { proxy: { "/api": "http://127.0.0.1:8000" } },
  build: { target: "safari14", cssCodeSplit: true, sourcemap: false, modulePreload: { polyfill: false } },
  worker: { format: "es" },
  test: { environment: "jsdom", include: ["tests/**/*.test.ts?(x)"], setupFiles: ["tests/setup.ts"] },
});
