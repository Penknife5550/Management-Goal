// ============================================================
// POST /api/tasks/:id/ai-suggestion/reject
// Verwirft den KI-Vorschlag: loescht die ai*-Staging-Felder und markiert
// lastModifiedBy=USER (Entscheidung getroffen -> classify wieder moeglich).
// important/urgent bleiben unveraendert. Owner-scoped.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeTaskFuerNutzer, toTaskDTO } from "@/lib/task-service";

type Kontext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

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
      include: { goal: { select: { titel: true } } },
    });
    return jsonOk(toTaskDTO(aktualisiert));
  } catch (fehler) {
    console.error("POST /api/tasks/[id]/ai-suggestion/reject fehlgeschlagen:", fehler);
    return jsonError("KI-Vorschlag konnte nicht verworfen werden.", 500);
  }
}
