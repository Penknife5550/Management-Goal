// ============================================================
// POST /api/tasks/:id/subtasks
// Legt eine Unteraufgabe (Checklisten-Punkt) an und gibt die aktualisierte
// Eltern-Aufgabe als volles DTO zurueck. Owner-Scope ueber die Aufgabe.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeTaskFuerNutzer, ladeTaskDTO } from "@/lib/task-service";
import { subtaskCreateSchema } from "@/lib/validation/task";

type Kontext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();
    if (!(await findeTaskFuerNutzer(id, nutzer.id))) {
      return jsonError("Aufgabe nicht gefunden.", 404);
    }

    const p = await parseBody(request, subtaskCreateSchema);
    if (!p.ok) return p.response;

    // Ans Ende haengen (Position = aktuelle Anzahl).
    const anzahl = await prisma.subtask.count({ where: { taskId: id } });
    await prisma.subtask.create({ data: { taskId: id, titel: p.data.titel, position: anzahl } });

    return jsonOk(await ladeTaskDTO(id), 201);
  } catch (fehler) {
    console.error("POST /api/tasks/[id]/subtasks fehlgeschlagen:", fehler);
    return jsonError("Unteraufgabe konnte nicht angelegt werden.", 500);
  }
}
