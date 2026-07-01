// ============================================================
// POST /api/tasks/:id/ai-suggestion/accept
// Uebernimmt den KI-Vorschlag: setzt important/urgent passend zum
// vorgeschlagenen Quadranten, markiert lastModifiedBy=USER (der Nutzer
// entscheidet) und loescht die ai*-Staging-Felder. Owner-scoped.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { type Quadrant, quadrantMeta } from "@/lib/eisenhower";
import { findeTaskFuerNutzer, toTaskDTO } from "@/lib/task-service";

type Kontext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

    const task = await findeTaskFuerNutzer(id, nutzer.id);
    if (!task) return jsonError("Aufgabe nicht gefunden.", 404);

    const vorschlag = task.aiQuadrantSuggestion;
    if (vorschlag == null || vorschlag < 1 || vorschlag > 4) {
      return jsonError("Kein gueltiger KI-Vorschlag vorhanden.", 400);
    }
    const meta = quadrantMeta(vorschlag as Quadrant);

    const aktualisiert = await prisma.task.update({
      where: { id },
      data: {
        important: meta.important,
        urgent: meta.urgent,
        lastModifiedBy: "USER",
        aiQuadrantSuggestion: null,
        aiConfidence: null,
        aiReasoning: null,
      },
      include: { goal: { select: { titel: true } } },
    });
    return jsonOk(toTaskDTO(aktualisiert));
  } catch (fehler) {
    console.error("POST /api/tasks/[id]/ai-suggestion/accept fehlgeschlagen:", fehler);
    return jsonError("KI-Vorschlag konnte nicht uebernommen werden.", 500);
  }
}
