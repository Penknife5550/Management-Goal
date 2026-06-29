import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Path-Alias @/ -> ./src (konsistent mit tsconfig), damit Tests Module
  // importieren koennen, die intern @/-Imports nutzen.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Leere PostCSS-Plugin-Liste: verhindert, dass Vitest die Tailwind-PostCSS-Config laedt
  // (Unit-Tests betreffen reine Domaenenlogik, kein CSS).
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
