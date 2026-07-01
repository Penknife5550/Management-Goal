// ============================================================
// src/lib/task-service.ts
// DB-naher Service der Aufgaben-Ebene: Owner-Scope + DTO-Mapping.
// Entkoppelt das Wire-Format (DTO) vom Prisma-Modell (kein Feld-Leak).
// ============================================================
import type { Task } from "@prisma/client";
import { prisma } from "./db";
import { berechneQuadrant, istKiVorschlagOffen, type TaskStatus } from "./eisenhower";
import type { TaskDTO } from "./types";

export type TaskMitGoal = Task & { goal: { titel: string } | null };

// Laedt eine Aufgabe nur, wenn sie dem Nutzer gehoert (Scope-Durchsetzung).
export function findeTaskFuerNutzer(id: string, ownerId: string) {
  return prisma.task.findFirst({ where: { id, ownerId } });
}

export function toTaskDTO(t: TaskMitGoal): TaskDTO {
  return {
    id: t.id,
    titel: t.titel,
    status: t.status as TaskStatus,
    position: t.position,
    important: t.important,
    urgent: t.urgent,
    quadrant: berechneQuadrant(t.important, t.urgent),
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    goalId: t.goalId,
    goalTitel: t.goal?.titel ?? null,
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
