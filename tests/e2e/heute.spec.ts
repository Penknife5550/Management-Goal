// ============================================================
// tests/e2e/heute.spec.ts
// Smoke-Test der Startseite: Root-Redirect + die vier Sektionen rendern.
// Faengt Contract-Drift der drei APIs (goals/tasks/insights) und
// Hydration-Blocker (z.B. CSP-Nonce vs. statisches Prerender) ab.
// ============================================================
import { expect, test } from "@playwright/test";

test("Root leitet auf /heute und rendert alle vier Sektionen", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/heute$/);

  // Alle vier Regionen sichtbar -> die drei Fetches sind durch, Skeleton weg.
  await expect(page.getByRole("region", { name: "Tagesurteil" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Fokus-Ziele" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Wichtige Aufgaben heute" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Wichtigste Insights" })).toBeVisible();

  // Das Tagesurteil traegt immer eine Ueberschrift (einer der vier Toene).
  await expect(
    page.getByRole("region", { name: "Tagesurteil" }).getByRole("heading"),
  ).toBeVisible();
});

test("Navigation: von /heute zu Aufgaben und zurueck zur Startseite", async ({ page }) => {
  await page.goto("/heute");
  await page.getByRole("link", { name: "Aufgaben" }).click();
  await expect(page).toHaveURL(/\/aufgaben$/);

  // Rueckweg existiert (Review-Finding: Startseite darf keine Sackgasse sein).
  await page.getByRole("link", { name: "Zurueck zur Startseite" }).click();
  await expect(page).toHaveURL(/\/heute$/);
});
