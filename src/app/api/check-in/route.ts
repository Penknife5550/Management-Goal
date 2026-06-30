// ============================================================
// POST /api/check-in
// Schliesst einen Wochen-Check-in ab: je aktiver WIG Ampel/Fortschritt setzen,
// Lead-Istwerte aktualisieren, lastCheckinAt schreiben und einen History-Snapshot
// (CheckIn, gruppiert per sessionId) anlegen — alles in EINER Transaktion.
// Owner-/FOKUS-Scope wird serverseitig erzwungen.
// ============================================================
import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { berechneWin, pruefeCheckinScope } from "@/lib/check-in";
import { prisma } from "@/lib/db";
import { type GoalMitLeads, toZielDTO } from "@/lib/goal-service";
import type { Ampel } from "@/lib/goals";
import { checkInSchema } from "@/lib/validation/goal";

export async function POST(request: NextRequest) {
  try {
    const nutzer = getAktuellerNutzer();
    const body = await request.json().catch(() => null);
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    // Vollen aktuellen Stand der eigenen FOKUS-WIGs laden — fuer Scope-Pruefung UND
    // fuer die Win-Berechnung (Delta gespeicherter Stand -> Check-in-Eingabe).
    const fokus = await prisma.goal.findMany({
      where: { ownerId: nutzer.id, status: "FOKUS" },
      include: { leadMeasures: true },
    });
    const perGoal = new Map(fokus.map((g) => [g.id, g]));

    // Owner-/FOKUS-Scope serverseitig erzwingen (reine, getestete Logik).
    const scope = pruefeCheckinScope(
      parsed.data.items,
      fokus.map((g) => ({ id: g.id, leadIds: g.leadMeasures.map((l) => l.id) })),
    );
    if (!scope.ok) return jsonError(scope.fehler, 400);

    // Small-Wins VOR dem Update berechnen (alter Stand vs. Eingabe).
    const wins = parsed.data.items.map((item) => {
      const goal = perGoal.get(item.goalId)!;
      const leadAlt = new Map(goal.leadMeasures.map((l) => [l.id, l]));
      const leads = item.leads.map((l) => {
        const alt = leadAlt.get(l.id)!;
        return {
          beschreibung: alt.beschreibung,
          zielwert: alt.zielwert,
          istwertAlt: alt.istwert,
          istwertNeu: l.istwert,
        };
      });
      return {
        titel: goal.titel,
        ...berechneWin({
          ampelAlt: goal.ampel as Ampel,
          ampelNeu: item.ampel,
          fortschrittAlt: goal.fortschritt,
          fortschrittNeu: item.fortschritt,
          leads,
        }),
      };
    });

    const sessionId = randomUUID();
    const aktualisiert = await prisma.$transaction(async (tx) => {
      const ergebnis: GoalMitLeads[] = [];
      for (const item of parsed.data.items) {
        for (const lead of item.leads) {
          await tx.leadMeasure.update({ where: { id: lead.id }, data: { istwert: lead.istwert } });
        }
        const goal = await tx.goal.update({
          where: { id: item.goalId },
          data: { ampel: item.ampel, fortschritt: item.fortschritt, lastCheckinAt: new Date() },
          include: { leadMeasures: { orderBy: { beschreibung: "asc" } } },
        });
        await tx.checkIn.create({
          data: {
            sessionId,
            ownerId: nutzer.id,
            goalId: item.goalId,
            ampel: item.ampel,
            fortschritt: item.fortschritt,
          },
        });
        ergebnis.push(goal);
      }
      return ergebnis;
    });

    return jsonOk({ sessionId, ziele: aktualisiert.map(toZielDTO), wins });
  } catch (fehler) {
    console.error("POST /api/check-in fehlgeschlagen:", fehler);
    return jsonError("Check-in konnte nicht gespeichert werden.", 500);
  }
}
