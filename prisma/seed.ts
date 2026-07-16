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
  console.log(`Seed abgeschlossen: Rechtseinheit + Admin (${ADMIN_EMAIL}) vorhanden.`);
}

main()
  .catch((fehler) => {
    console.error("Seed fehlgeschlagen:", fehler);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
