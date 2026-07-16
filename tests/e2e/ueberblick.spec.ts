// ============================================================
// tests/e2e/ueberblick.spec.ts
// GF-Aggregat (AP5): Admin sieht den Fuehrungs-Ueberblick mit den Demo-
// Fuehrungskraeften; der Ueberblick-Link ist im Heute-Header sichtbar.
// (Session = Admin via global-setup/storageState.)
// ============================================================
import { expect, test } from "@playwright/test";

test("Admin sieht den Fuehrungs-Ueberblick mit den Personen der Rechtseinheit", async ({
  page,
}) => {
  await page.goto("/ueberblick");
  await expect(page.getByRole("heading", { name: "Führungs-Überblick" })).toBeVisible();

  // Roll-up-Kennzahlen sind da (Personen/Fokus-Ziele/Kritisch/Auf Kurs).
  await expect(page.getByRole("region", { name: "Zusammenfassung Rechtseinheit" })).toBeVisible();

  // Der angemeldete Admin taucht selbst als Person auf (seed-unabhaengig; die
  // Demo-Fuehrungskraefte erscheinen zusaetzlich nur mit SEED_DEMO=1).
  await expect(page.getByRole("heading", { name: "Dimitri Riesen" })).toBeVisible();
});

test("Ueberblick-Link ist im Heute-Header (Admin)", async ({ page }) => {
  await page.goto("/heute");
  await expect(page.getByRole("link", { name: "Führungs-Überblick" })).toBeVisible();
});
