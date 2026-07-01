// ============================================================
// /api/tasks
// GET  - alle Aufgaben des Nutzers (Eisenhower-Matrix)
// POST - neue Aufgabe anlegen
// Owner-Scope via getAktuellerNutzer (Nutzerinhalt wie Ziele, kein Admin-Token).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer } from "@/lib/goal-service";
import { toTaskDTO } from "@/lib/task-service";
import { taskCreateSchema } from "@/lib/validation/task";

export async function GET() {
  try {
    const nutzer = getAktuellerNutzer();
    const tasks = await prisma.task.findMany({
      where: { ownerId: nutzer.id },
      include: { goal: { select: { titel: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return jsonOk(tasks.map(toTaskDTO));
  } catch (fehler) {
    console.error("GET /api/tasks fehlgeschlagen:", fehler);
    return jsonError("Aufgaben konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const nutzer = getAktuellerNutzer();
    const p = await parseBody(request, taskCreateSchema);
    if (!p.ok) return p.response;
    const d = p.data;

    // Verknuepfte WIG muss dem Nutzer gehoeren.
    if (d.goalId && !(await findeZielFuerNutzer(d.goalId, nutzer.id))) {
      return jsonError("Verknuepfte WIG nicht gefunden.", 400);
    }

    const task = await prisma.task.create({
      data: {
        ownerId: nutzer.id,
        titel: d.titel,
        important: d.important ?? false,
        urgent: d.urgent ?? false,
        goalId: d.goalId ?? null,
        dueDate: d.dueDate ?? null,
      },
      include: { goal: { select: { titel: true } } },
    });
    return jsonOk(toTaskDTO(task), 201);
  } catch (fehler) {
    console.error("POST /api/tasks fehlgeschlagen:", fehler);
    return jsonError("Aufgabe konnte nicht angelegt werden.", 500);
  }
}
