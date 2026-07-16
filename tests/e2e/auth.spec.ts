// ============================================================
// tests/e2e/auth.spec.ts
// Auth-Flows (AP6): Redirect-Schutz unangemeldet, Login ueber die UI,
// Logout inkl. erneutem Schutz danach.
// ============================================================
import { expect, test } from "@playwright/test";
import { E2E_EMAIL, E2E_PASSWORT, KEINE_SESSION } from "./helpers";

// Diese beiden Tests brauchen den UNANGEMELDETEN Zustand -> storageState leeren.
test.describe("ohne Session", () => {
  test.use({ storageState: KEINE_SESSION });

  test("unangemeldet leitet /ziele auf /login um", async ({ page }) => {
    await page.goto("/ziele");
    await expect(page).toHaveURL(/\/login/);
  });

  test("Login ueber die UI fuehrt zu /heute", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-Mail", { exact: true }).fill(E2E_EMAIL);
    await page.getByLabel("Passwort", { exact: true }).fill(E2E_PASSWORT);
    await page.getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page).toHaveURL(/\/heute$/);
  });
});

// Erbt die angemeldete Session aus dem global-setup (storageState).
test("Logout loescht die Session und schuetzt Seiten wieder", async ({ page }) => {
  await page.goto("/heute");

  // "Abmelden" kann als Button oder Link gerendert sein -> beides abdecken.
  await page
    .getByRole("button", { name: "Abmelden" })
    .or(page.getByRole("link", { name: "Abmelden" }))
    .click();
  await expect(page).toHaveURL(/\/login/);

  // Session ist wirklich weg: geschuetzte Seite leitet erneut auf /login.
  await page.goto("/ziele");
  await expect(page).toHaveURL(/\/login/);
});
