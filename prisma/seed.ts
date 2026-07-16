// ============================================================
// prisma/seed.ts
// Zweck: Rechtseinheit + Admin-Nutzer anlegen bzw. aktualisieren (idempotent).
//        Der historische Test-Nutzer (TEST_USER_ID) wird zum echten Admin-Konto
//        aufgewertet — so bleiben alle bestehenden Ziele/Aufgaben sichtbar.
//        BEWUSST keine Ziele -> der Empty State ist beim Erststart sichtbar.
//
// Initial-Passwort: ADMIN_INITIAL_PASSWORD (Env) — in Produktion zwingend
// setzen und nach dem ersten Login aendern. Dev-Fallback siehe unten.
// ============================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { TEST_RECHTSEINHEIT_ID, TEST_USER_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "dimitri.riesen@fes-minden.de";
const ADMIN_NAME = "Dimitri Riesen";
// Dev-Fallback; in Produktion via Env ueberschreiben (Seed warnt sonst).
const ADMIN_PASSWORT = process.env.ADMIN_INITIAL_PASSWORD ?? "Cockpit2026!Start";

async function main(): Promise<void> {
  await prisma.rechtseinheit.upsert({
    where: { id: TEST_RECHTSEINHEIT_ID },
    update: {},
    create: {
      id: TEST_RECHTSEINHEIT_ID,
      name: "Verwaltung",
      kuerzel: "VW",
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORT, 12);

  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    // Bestehenden Nutzer zum Admin-Konto aufwerten (Owner der Bestandsdaten).
    update: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      isActive: true,
      passwordHash,
      rechtseinheitId: TEST_RECHTSEINHEIT_ID,
    },
    create: {
      id: TEST_USER_ID,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: "ADMIN",
      isActive: true,
      passwordHash,
      rechtseinheitId: TEST_RECHTSEINHEIT_ID,
    },
  });

  if (!process.env.ADMIN_INITIAL_PASSWORD) {
    console.warn(
      "WARNUNG: ADMIN_INITIAL_PASSWORD nicht gesetzt - Dev-Fallback-Passwort aktiv. In Produktion zwingend setzen!",
    );
  }

  // ---- DEMO: Fuehrungskraefte + WIGs fuer den Fuehrungs-Ueberblick (AP5) ----
  // Nur mit SEED_DEMO=1 (Default AUS -> prod-sicher): die Demo-Konten sind
  // login-faehige NUTZER mit einem im Repo stehenden Passwort und duerfen nicht
  // versehentlich in Produktion landen. `SEED_DEMO=1 npx prisma db seed` befuellt
  // das GF-Aggregat zum Ausprobieren; zum Entfernen die Nutzer id-Praefix
  // "demo-fk-" (+ Ziele "demo-wig-") loeschen.
  if (process.env.SEED_DEMO !== "1") {
    console.log("Seed abgeschlossen: Rechtseinheit + Admin (SEED_DEMO nicht gesetzt).");
    return;
  }
  const demoHash = await bcrypt.hash("Demo2026!Start", 12);
  const demoNutzer: { id: string; email: string; name: string }[] = [
    { id: "demo-fk-anna", email: "anna.demo@fes-minden.de", name: "Anna Beispiel" },
    { id: "demo-fk-ben", email: "ben.demo@fes-minden.de", name: "Ben Muster" },
  ];
  for (const d of demoNutzer) {
    await prisma.user.upsert({
      where: { id: d.id },
      update: { email: d.email, name: d.name, rechtseinheitId: TEST_RECHTSEINHEIT_ID },
      create: {
        id: d.id,
        email: d.email,
        name: d.name,
        role: "NUTZER",
        isActive: true,
        passwordHash: demoHash,
        rechtseinheitId: TEST_RECHTSEINHEIT_ID,
      },
    });
  }
  const demoWigs: {
    id: string;
    titel: string;
    ownerId: string;
    ampel: "GRUEN" | "GELB" | "ROT";
    fortschritt: number;
  }[] = [
    {
      id: "demo-wig-anna-1",
      titel: "Onboarding-Standard etablieren",
      ownerId: "demo-fk-anna",
      ampel: "GRUEN",
      fortschritt: 70,
    },
    {
      id: "demo-wig-anna-2",
      titel: "Elterngespraeche digitalisieren",
      ownerId: "demo-fk-anna",
      ampel: "GELB",
      fortschritt: 40,
    },
    {
      id: "demo-wig-ben-1",
      titel: "Vertretungsplan-Prozess stabilisieren",
      ownerId: "demo-fk-ben",
      ampel: "ROT",
      fortschritt: 20,
    },
  ];
  for (const w of demoWigs) {
    await prisma.goal.upsert({
      where: { id: w.id },
      update: { titel: w.titel, ampel: w.ampel, fortschritt: w.fortschritt, status: "FOKUS" },
      create: {
        id: w.id,
        titel: w.titel,
        outcome: "Demo-Outcome",
        status: "FOKUS",
        ampel: w.ampel,
        fortschritt: w.fortschritt,
        ownerId: w.ownerId,
        rechtseinheitId: TEST_RECHTSEINHEIT_ID,
      },
    });
  }

  console.log(
    `Seed abgeschlossen: Rechtseinheit + Admin (${ADMIN_EMAIL}) + ${demoNutzer.length} Demo-Fuehrungskraefte (SEED_DEMO).`,
  );
}

main()
  .catch((fehler) => {
    console.error("Seed fehlgeschlagen:", fehler);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
