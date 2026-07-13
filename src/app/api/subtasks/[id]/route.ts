// ============================================================
// PATCH  /api/subtasks/:id  - Unteraufgabe abhaken/umbenennen/umsortieren
// DELETE /api/subtasks/:id  - Unteraufgabe loeschen
// Beide geben die aktualisierte Eltern-Aufgabe (volles DTO) zurueck.
// Owner-Scope zentral via task-service (findeSubtaskFuerNutzer -> Eltern-Task).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeSubtaskFuerNutzer, ladeTaskDTO } from "@/lib/task-service";
import { subtaskUpdateSchema } from "@/lib/validation/task";

type Kontext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();
    const vorhanden = await findeSubtaskFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Unteraufgabe nicht gefunden.", 404);

    const p = await parseBody(request, subtaskUpdateSchema);
    if (!p.ok) return p.response;

    await prisma.subtask.update({ where: { id }, data: p.data });
    return jsonOk(await ladeTaskDTO(vorhanden.taskId));
  } catch (fehler) {
    console.error("PATCH /api/subtasks/[id] fehlgeschlagen:", fehler);
    return jsonError("Unteraufgabe konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();
    const vorhanden = await findeSubtaskFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Unteraufgabe nicht gefunden.", 404);

    await prisma.subtask.delete({ where: { id } });
    return jsonOk(await ladeTaskDTO(vorhanden.taskId));
  } catch (fehler) {
    console.error("DELETE /api/subtasks/[id] fehlgeschlagen:", fehler);
    return jsonError("Unteraufgabe konnte nicht geloescht werden.", 500);
  }
}
