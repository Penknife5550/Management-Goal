// ============================================================
// GET /api/insights
// Fuehrungs-Insights (AP 1): verdichtet die Ziele + Aufgaben des Nutzers zu
// deterministischen Findings (Watermelon, Fokus-Leck, Zombie, Trend, Beitrag).
// Owner-scoped wie /api/goals. Rein lesend, keine KI (die formuliert erst AP 3).
// ============================================================
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { berechneInsights } from "@/lib/insights";

export async function GET() {
  try {
    const nutzer = getAktuellerNutzer();

    const goals = await prisma.goal.findMany({
      where: { ownerId: nutzer.id, status: { not: "ARCHIVIERT" } },
      include: {
        leadMeasures: { select: { zielwert: true, istwert: true } },
        checkIns: { select: { ampel: true, fortschritt: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    });
    const tasks = await prisma.task.findMany({
      where: { ownerId: nutzer.id },
      select: { important: true, urgent: true, zeitIstMin: true },
    });

    const insights = berechneInsights({
      goals: goals.map((g) => ({
        id: g.id,
        titel: g.titel,
        status: g.status,
        ampel: g.ampel,
        fortschritt: g.fortschritt,
        outcome: g.outcome,
        updatedAt: g.updatedAt,
        leadMeasures: g.leadMeasures,
        checkIns: g.checkIns,
      })),
      tasks,
      jetzt: new Date(),
    });

    return jsonOk(insights);
  } catch (fehler) {
    console.error("GET /api/insights fehlgeschlagen:", fehler);
    return jsonError("Insights konnten nicht berechnet werden.", 500);
  }
}
