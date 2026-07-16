// ============================================================
// src/lib/ueberblick-data.ts
// Rechtseinheit-scoped Ladelogik fuer das GF-Aggregat (AP5). Aggregiert je
// Nutzer der Rechtseinheit Tagesurteil (bewerteTag) + WIGs. Scope-Schluessel
// ist rechtseinheitId - der erste Multi-User-Zugriff der App (bisher alles
// strikt ownerId). Nur ueber die ADMIN-Route erreichbar (withAdmin).
//
// Query-Kosten: 1 + 3N (N = aktive Nutzer), via Promise.all parallel. Fuer die
// reale Fuehrungskraefte-Groesse einer Rechtseinheit unkritisch; bei sehr
// grossen Einheiten spaeter batchen (ein goal.findMany ueber alle ownerIds).
// ============================================================
import { prisma } from "./db";
import type { Ampel } from "./goals";
import { bewerteTag } from "./heute";
import { ladeInsightsFuerNutzer } from "./insight-data";
import { fasseZusammen, type NutzerUeberblick, type UeberblickDTO } from "./ueberblick";

export async function ladeUeberblick(rechtseinheitId: string, jetzt: Date): Promise<UeberblickDTO> {
  const users = await prisma.user.findMany({
    where: { rechtseinheitId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const nutzer: NutzerUeberblick[] = await Promise.all(
    users.map(async (u): Promise<NutzerUeberblick> => {
      const { insights, fokusAmpeln } = await ladeInsightsFuerNutzer(u.id, jetzt);
      const wigs = await prisma.goal.findMany({
        where: { ownerId: u.id, status: "FOKUS" },
        select: { id: true, titel: true, ampel: true, fortschritt: true },
        orderBy: { createdAt: "asc" },
      });
      const urteil = bewerteTag({ fokusAmpeln, insights });
      return {
        id: u.id,
        name: u.name,
        urteilTon: urteil.ton,
        urteilTitel: urteil.titel,
        wigs: wigs.map((g) => ({
          id: g.id,
          titel: g.titel,
          ampel: g.ampel as Ampel,
          fortschritt: g.fortschritt,
        })),
        anzahlWarnungen: insights.filter((i) => i.schwere === "warnung").length,
      };
    }),
  );

  return { rollup: fasseZusammen(nutzer), nutzer };
}
