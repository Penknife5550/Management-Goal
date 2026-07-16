import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Setzt voraus: DB laeuft, migriert und geseedet; DATABASE_URL ist gesetzt.
// Der Webserver (npm run start) erbt die Env des Playwright-Prozesses.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  // Meldet sich EINMAL an und legt die Session als storageState ab (AP6).
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Standard: alle Tests laufen angemeldet (via global-setup). Tests, die den
    // unangemeldeten Zustand brauchen, ueberschreiben das mit KEINE_SESSION.
    storageState: path.join(__dirname, "tests/e2e/.auth/state.json"),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
