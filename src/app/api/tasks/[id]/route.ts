// ============================================================
// /api/tasks/:id
// PATCH  - Aufgabe aendern (Titel, Status, Quadrant, Position, WIG, Frist)
// DELETE - Aufgabe loeschen
// Owner-Scope erzwungen. Aendert der Nutzer den Quadranten (important/urgent),
// wird lastModifiedBy=USER gesetzt (Source-Flag fuer den KI-Loop-Schutz, Schritt 5).
// ============================================================
import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer } from "@/lib/goal-service";
import { findeTaskFuerNutzer, TASK_INCLUDE, toTaskDTO } from "@/lib/task-service";
import { taskUpdateSchema } from "@/lib/validation/task";

type Kontext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const vorhanden = await findeTaskFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Aufgabe nicht gefunden.", 404);

    const p = await parseBody(request, taskUpdateSchema);
    if (!p.ok) return p.response;
    const d = p.data;

    if (d.goalId && !(await findeZielFuerNutzer(d.goalId, nutzer.id))) {
      return jsonError("Verknuepfte WIG nicht gefunden.", 400);
    }

    const data: Prisma.TaskUpdateInput = {};
    if (d.titel !== undefined) data.titel = d.titel;
    if (d.beschreibung !== undefined) data.beschreibung = d.beschreibung;
    if (d.status !== undefined) data.status = d.status;
    if (d.important !== undefined) data.important = d.important;
    if (d.urgent !== undefined) data.urgent = d.urgent;
    if (d.position !== undefined) data.position = d.position;
    if (d.dueDate !== undefined) data.dueDate = d.dueDate;
    if (d.zeitGeplantMin !== undefined) data.zeitGeplantMin = d.zeitGeplantMin;
    if (d.zeitIstMin !== undefined) data.zeitIstMin = d.zeitIstMin;
    if (d.goalId !== undefined) {
      data.goal = d.goalId ? { connect: { id: d.goalId } } : { disconnect: true };
    }
    // Manuelle Quadranten-Aenderung => Nutzer ist die Quelle (Loop-Schutz Schicht 1).
    if (d.important !== undefined || d.urgent !== undefined) {
      data.lastModifiedBy = "USER";
    }

    const task = await prisma.task.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    });
    return jsonOk(toTaskDTO(task));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("PATCH /api/tasks/[id] fehlgeschlagen:", fehler);
    return jsonError("Aufgabe konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const vorhanden = await findeTaskFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Aufgabe nicht gefunden.", 404);

    await prisma.task.delete({ where: { id } });
    return jsonOk({ geloescht: true });
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("DELETE /api/tasks/[id] fehlgeschlagen:", fehler);
    return jsonError("Aufgabe konnte nicht geloescht werden.", 500);
  }
}
