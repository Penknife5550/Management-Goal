// ============================================================
// prisma/seed.ts
// Zweck: Test-Nutzer + Test-Rechtseinheit anlegen (idempotent),
//        damit der Owner-/Rechtseinheit-Scope echte FKs hat.
//        BEWUSST keine Ziele -> der Empty State ist beim Erststart sichtbar.
// ============================================================
import { PrismaClient } from "@prisma/client";
import { TEST_RECHTSEINHEIT_ID, TEST_USER_ID } from "../src/lib/constants";

const prisma = new PrismaClient();

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

  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: "test.fuehrungskraft@credo-gruppe.de",
      name: "Test Fuehrungskraft",
    },
  });

  console.log("Seed abgeschlossen: Test-Rechtseinheit + Test-Nutzer vorhanden.");
}

main()
  .catch((fehler) => {
    console.error("Seed fehlgeschlagen:", fehler);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
