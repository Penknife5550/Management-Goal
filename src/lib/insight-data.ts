// ============================================================
// src/lib/insight-data.ts
// DB-Ladelogik fuer den Insight-Motor (AP1): die owner-scoped Queries, die
// vorher inline in /api/insights lagen. Von /api/insights UND vom Montags-
// Briefing (AP3) genutzt (Single Source, kein Copy-Paste).
// ============================================================
import { berechneInsights, type Insight } from "@/lib/insights";
import type { Ampel } from "./goals";
import { prisma } from "./db";

export interface NutzerInsights {
  insights: Insight[]; // nach Schwere sortiert (berechneInsights)
  fokusAmpeln: Ampel[]; // Ampeln der aktiven FOKUS-Ziele (fuers Tagesurteil)
}

/** Laedt Ziele + Aufgaben eines Nutzers und berechnet daraus die Insights. */
export async function ladeInsightsFuerNutzer(
  ownerId: string,
  jetzt: Date,
): Promise<NutzerInsights> {
  const goals = await prisma.goal.findMany({
    where: { ownerId, status: { not: "ARCHIVIERT" } },
    include: {
      leadMeasures: { select: { zielwert: true, istwert: true } },
      checkIns: {
        select: { ampel: true, fortschritt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const tasks = await prisma.task.findMany({
    where: { ownerId },
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
    jetzt,
  });

  const fokusAmpeln = goals.filter((g) => g.status === "FOKUS").map((g) => g.ampel as Ampel);
  return { insights, fokusAmpeln };
}
