// ============================================================
// tests/e2e/ziele.spec.ts
// Kern-Userflow: Ziel anlegen -> auf FOKUS heben (mit Erwartung) -> abschliessen
// mit Feedback-Analyse (erwartet vs. tatsaechlich, AP4) -> im Lern-Rueckblick sehen.
// ============================================================
import { expect, test } from "@playwright/test";

// Session kommt aus dem global-setup (storageState) - kein Login pro Test.

test("Ziel anlegen, auf Fokus heben, abschliessen mit Feedback-Analyse", async ({ page }) => {
  const titel = `E2E-Ziel ${Date.now()}`;

  await page.goto("/ziele");

  // 1) Quick-Add -> Ziel landet im Backlog
  await page.getByLabel("Neues Ziel anlegen").fill(titel);
  await page.getByRole("button", { name: "Anlegen" }).click();

  const backlogEintrag = page.getByRole("listitem").filter({ hasText: titel });
  await expect(backlogEintrag).toBeVisible();

  // 2) Ins Fokus heben -> Outcome-Pflicht + Erwartung (fuers Lern-Log)
  await backlogEintrag.getByRole("button", { name: "In Fokus" }).click();
  await page.getByLabel(/Outcome/).fill("Standortleitungen wenden den Standard sicher an");
  await page.getByLabel(/Erwartetes Ergebnis/).fill("In 6 Monaten laeuft es rund");
  await page.getByRole("button", { name: "Ins Fokus heben" }).click();

  // 3) Ziel erscheint als WIG-Karte im Scoreboard ("Im Fokus")
  const scoreboard = page.getByRole("region", { name: "Im Fokus" });
  await expect(scoreboard.getByRole("heading", { name: titel })).toBeVisible();

  // 4) Abschluss oeffnet das Feedback-Modal (erwartet vs. tatsaechlich)
  const karte = scoreboard.locator("article").filter({ hasText: titel });
  await karte.getByRole("button", { name: "Als erreicht abschließen" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("In 6 Monaten laeuft es rund")).toBeVisible(); // erwartet angezeigt
  await page.getByLabel(/tatsächlich eingetreten/).fill("Lief besser als gedacht");
  await dialog.getByRole("button", { name: "Abschließen" }).click();

  // 5) Weg aus dem Fokus, dafuer im Lern-Rueckblick mit dem Tatsaechlichen.
  // Auf das Listenelement dieses (eindeutigen) Ziels scopen - fruehere Laeufe
  // hinterlassen weitere Rueckblick-Eintraege.
  await expect(scoreboard.getByRole("heading", { name: titel })).toBeHidden();
  const rueckblickItem = page
    .getByRole("region", { name: "Lern-Rückblick" })
    .getByRole("listitem")
    .filter({ hasText: titel });
  await expect(rueckblickItem).toBeVisible();
  await expect(rueckblickItem.getByText("Lief besser als gedacht")).toBeVisible();
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
