import { defineConfig } from "vitest/config";

export default defineConfig({
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
