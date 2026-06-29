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
import { prisma } from "@/lib/db";
import { type GoalMitLeads, toZielDTO } from "@/lib/goal-service";
import { checkInSchema } from "@/lib/validation/goal";

export async function POST(request: NextRequest) {
  try {
    const nutzer = getAktuellerNutzer();
    const body = await request.json().catch(() => null);
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    // Scope: nur eigene WIGs im FOKUS sind eincheckbar. Erlaubte Goal-/Lead-IDs laden.
    const fokus = await prisma.goal.findMany({
      where: { ownerId: nutzer.id, status: "FOKUS" },
      include: { leadMeasures: { select: { id: true } } },
    });
    const erlaubteLeads = new Map(fokus.map((g) => [g.id, new Set(g.leadMeasures.map((l) => l.id))]));

    for (const item of parsed.data.items) {
      const leads = erlaubteLeads.get(item.goalId);
      if (!leads) return jsonError("Ungueltige oder nicht aktive WIG.", 400);
      if (item.leads.some((l) => !leads.has(l.id))) {
        return jsonError("Lead Measure gehoert nicht zur WIG.", 400);
      }
    }

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

    return jsonOk({ sessionId, ziele: aktualisiert.map(toZielDTO) });
  } catch (fehler) {
    console.error("POST /api/check-in fehlgeschlagen:", fehler);
    return jsonError("Check-in konnte nicht gespeichert werden.", 500);
  }
}
