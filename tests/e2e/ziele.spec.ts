// ============================================================
// tests/e2e/ziele.spec.ts
// Kern-Userflow: Ziel anlegen -> auf FOKUS heben -> im Scoreboard sehen.
// ============================================================
import { expect, test } from "@playwright/test";

// Session kommt aus dem global-setup (storageState) - kein Login pro Test.

test("Ziel anlegen, auf Fokus heben und im Scoreboard sehen", async ({ page }) => {
  const titel = `E2E-Ziel ${Date.now()}`;

  await page.goto("/ziele");

  // 1) Quick-Add -> Ziel landet im Backlog
  await page.getByLabel("Neues Ziel anlegen").fill(titel);
  await page.getByRole("button", { name: "Anlegen" }).click();

  const backlogEintrag = page.getByRole("listitem").filter({ hasText: titel });
  await expect(backlogEintrag).toBeVisible();

  // 2) Ins Fokus heben -> Modal mit Outcome-Pflicht
  await backlogEintrag.getByRole("button", { name: "In Fokus" }).click();
  await page.getByLabel(/Outcome/).fill("Standortleitungen wenden den Standard sicher an");
  await page.getByRole("button", { name: "Ins Fokus heben" }).click();

  // 3) Ziel erscheint als WIG-Karte im Scoreboard ("Im Fokus")
  const scoreboard = page.getByRole("region", { name: "Im Fokus" });
  await expect(scoreboard.getByRole("heading", { name: titel })).toBeVisible();

  // Aufraeumen -> haelt den Test idempotent (gibt den WIG-Slot wieder frei)
  const karte = scoreboard.locator("article").filter({ hasText: titel });
  await karte.getByRole("button", { name: "Als erreicht abschließen" }).click();
  await expect(scoreboard.getByRole("heading", { name: titel })).toBeHidden();
});

test("Outcome-Pflicht blockiert das Heben ohne Outcome", async ({ page }) => {
  const titel = `E2E-Pflicht ${Date.now()}`;

  await page.goto("/ziele");
  await page.getByLabel("Neues Ziel anlegen").fill(titel);
  await page.getByRole("button", { name: "Anlegen" }).click();

  const backlogEintrag = page.getByRole("listitem").filter({ hasText: titel });
  await backlogEintrag.getByRole("button", { name: "In Fokus" }).click();

  // Ohne Outcome absenden -> konkrete Fehlermeldung, Modal bleibt offen
  await page.getByRole("button", { name: "Ins Fokus heben" }).click();
  await expect(page.getByText(/Bitte formuliere den angestrebten Outcome/)).toBeVisible();
});
