// ============================================================
// POST /api/tasks/:id/ai-suggestion/reject
// Verwirft den KI-Vorschlag: loescht die ai*-Staging-Felder und markiert
// lastModifiedBy=USER (Entscheidung getroffen -> classify wieder moeglich).
// important/urgent bleiben unveraendert. Owner-scoped.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeTaskFuerNutzer, TASK_INCLUDE, toTaskDTO } from "@/lib/task-service";

type Kontext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const task = await findeTaskFuerNutzer(id, nutzer.id);
    if (!task) return jsonError("Aufgabe nicht gefunden.", 404);

    const aktualisiert = await prisma.task.update({
      where: { id },
      data: {
        lastModifiedBy: "USER",
        aiQuadrantSuggestion: null,
        aiConfidence: null,
        aiReasoning: null,
      },
      include: TASK_INCLUDE,
    });
    return jsonOk(toTaskDTO(aktualisiert));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("POST /api/tasks/[id]/ai-suggestion/reject fehlgeschlagen:", fehler);
    return jsonError("KI-Vorschlag konnte nicht verworfen werden.", 500);
  }
}
