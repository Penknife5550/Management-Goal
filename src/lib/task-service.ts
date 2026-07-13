// ============================================================
// src/lib/task-service.ts
// DB-naher Service der Aufgaben-Ebene: Owner-Scope + DTO-Mapping.
// Entkoppelt das Wire-Format (DTO) vom Prisma-Modell (kein Feld-Leak).
// ============================================================
import type { Prisma, Subtask } from "@prisma/client";
import { prisma } from "./db";
import { berechneQuadrant, istKiVorschlagOffen, type TaskStatus } from "./eisenhower";
import type { SubtaskDTO, TaskDTO } from "./types";

// Gemeinsame Includes fuer das volle Task-DTO (WIG-Titel + Unteraufgaben).
// Eine Quelle -> alle Routen liefern konsistent dasselbe DTO.
export const TASK_INCLUDE = {
  goal: { select: { titel: true } },
  subtasks: { orderBy: { position: "asc" } },
} satisfies Prisma.TaskInclude;

export type TaskMitRelationen = Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>;

// Laedt eine Aufgabe nur, wenn sie dem Nutzer gehoert (Scope-Durchsetzung).
export function findeTaskFuerNutzer(id: string, ownerId: string) {
  return prisma.task.findFirst({ where: { id, ownerId } });
}

// Owner-Scope einer Unteraufgabe ueber die Eltern-Aufgabe.
export function findeSubtaskFuerNutzer(id: string, ownerId: string) {
  return prisma.subtask.findFirst({ where: { id, task: { ownerId } } });
}

export function toSubtaskDTO(s: Subtask): SubtaskDTO {
  return { id: s.id, titel: s.titel, erledigt: s.erledigt, position: s.position };
}

export function toTaskDTO(t: TaskMitRelationen): TaskDTO {
  return {
    id: t.id,
    titel: t.titel,
    beschreibung: t.beschreibung,
    status: t.status as TaskStatus,
    position: t.position,
    important: t.important,
    urgent: t.urgent,
    quadrant: berechneQuadrant(t.important, t.urgent),
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    zeitGeplantMin: t.zeitGeplantMin,
    zeitIstMin: t.zeitIstMin,
    goalId: t.goalId,
    goalTitel: t.goal?.titel ?? null,
    subtasks: t.subtasks.map(toSubtaskDTO),
    // KI-Vorschlag (Phase 2, Schritt 5): gestaged, ueberschreibt nie manuell.
    aiQuadrantSuggestion: t.aiQuadrantSuggestion,
    aiConfidence: t.aiConfidence,
    aiReasoning: t.aiReasoning,
    kiVorschlagOffen: istKiVorschlagOffen({
      aiQuadrantSuggestion: t.aiQuadrantSuggestion,
      important: t.important,
      urgent: t.urgent,
    }),
    createdAt: t.createdAt.toISOString(),
  };
}

// Laedt eine Aufgabe als volles DTO — nach Subtask-Aenderungen zurueckgeben,
// damit der Client die Eltern-Aufgabe in einem Zug aktualisieren kann.
export async function ladeTaskDTO(id: string): Promise<TaskDTO | null> {
  const t = await prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE });
  return t ? toTaskDTO(t) : null;
}
