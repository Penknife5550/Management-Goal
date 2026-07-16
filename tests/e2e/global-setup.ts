// ============================================================
// tests/e2e/global-setup.ts
// Meldet sich EINMAL vor der ganzen Suite an und speichert die Session als
// storageState (tests/e2e/.auth/state.json). Alle Tests erben diese Session
// (playwright.config: use.storageState) statt pro Test neu einzuloggen -> die
// Login-Rate-Limits (5/60s pro IP) bleiben unberuehrt.
// Retry auf 429: falls das IP-Fenster gerade voll ist (z.B. durch manuelles
// Testen), wird bis zu ~90s abgewartet statt hart zu scheitern.
// ============================================================
import { mkdirSync } from "node:fs";
import path from "node:path";
import { request } from "@playwright/test";
import { AUTH_STATE_PFAD, E2E_EMAIL, E2E_PASSWORT } from "./helpers";

const BASE_URL = "http://localhost:3000";

async function globalSetup(): Promise<void> {
  mkdirSync(path.dirname(AUTH_STATE_PFAD), { recursive: true });
  const ctx = await request.newContext({ baseURL: BASE_URL });

  const MAX_VERSUCHE = 10;
  for (let versuch = 1; versuch <= MAX_VERSUCHE; versuch++) {
    const antwort = await ctx.post("/api/auth/login", {
      data: { email: E2E_EMAIL, password: E2E_PASSWORT },
    });
    if (antwort.ok()) {
      await ctx.storageState({ path: AUTH_STATE_PFAD });
      await ctx.dispose();
      return;
    }
    if (antwort.status() === 429 && versuch < MAX_VERSUCHE) {
      // IP-Fenster (60s) abwarten und erneut versuchen.
      await new Promise((r) => setTimeout(r, 10_000));
      continue;
    }
    await ctx.dispose();
    throw new Error(`E2E-Login im global-setup fehlgeschlagen: HTTP ${antwort.status()}`);
  }
}

export default globalSetup;
