// ============================================================
// tests/e2e/helpers.ts
// Gemeinsame E2E-Konstanten. Die Anmeldung passiert EINMAL im global-setup
// (storageState) - die Tests erben die Session, statt pro Test einzuloggen
// (schont die Login-Rate-Limits).
// ============================================================
import path from "node:path";

export const E2E_EMAIL = "dimitri.riesen@fes-minden.de";
export const E2E_PASSWORT = process.env.E2E_PASSWORT ?? "Cockpit2026!Start";

// Ablageort der vorab angemeldeten Session (von global-setup geschrieben).
export const AUTH_STATE_PFAD = path.join(__dirname, ".auth", "state.json");

// Leerer Storage-State fuer Tests, die den UNANGEMELDETEN Zustand brauchen.
export const KEINE_SESSION = { cookies: [], origins: [] };
