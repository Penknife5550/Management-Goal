// ============================================================
// src/lib/goal-service.ts
// DB-naher Service: Owner-Scope-Durchsetzung + DTO-Mapping.
// Haelt die API-Routen schlank und entkoppelt das Wire-Format (DTO)
// vom Prisma-Persistenzmodell (kein Leak interner Felder).
// ============================================================
import type { Goal, LeadMeasure } from "@prisma/client";
import { prisma } from "./db";
import type { Ampel, GoalStatus } from "./goals";
import type { LeadMeasureDTO, ZielDTO } from "./types";

export type GoalMitLeads = Goal & { leadMeasures: LeadMeasure[] };

// Laedt ein Ziel nur, wenn es dem Nutzer gehoert (Scope-Durchsetzung).
export function findeZielFuerNutzer(id: string, ownerId: string) {
  return prisma.goal.findFirst({
    where: { id, ownerId },
    include: { leadMeasures: { orderBy: { beschreibung: "asc" } }, learningLog: true },
  });
}

// Laedt eine Lead Measure nur, wenn ihr Ziel dem Nutzer gehoert (Scope zentral).
export function findeLeadMeasureFuerNutzer(leadMeasureId: string, ownerId: string) {
  return prisma.leadMeasure.findFirst({
    where: { id: leadMeasureId, goal: { ownerId } },
  });
}

// --- DTO-Mapping: nur freigegebene Felder, Datumsfelder als ISO-String ---

export function toLeadMeasureDTO(lm: LeadMeasure): LeadMeasureDTO {
  return {
    id: lm.id,
    beschreibung: lm.beschreibung,
    zielwert: lm.zielwert,
    istwert: lm.istwert,
  };
}

export function toZielDTO(goal: GoalMitLeads): ZielDTO {
  return {
    id: goal.id,
    titel: goal.titel,
    outcome: goal.outcome,
    status: goal.status as GoalStatus,
    ampel: goal.ampel as Ampel,
    fortschritt: goal.fortschritt,
    dueDate: goal.dueDate ? goal.dueDate.toISOString() : null,
    abhaengig: goal.abhaengig,
    leadMeasures: goal.leadMeasures.map(toLeadMeasureDTO),
    createdAt: goal.createdAt.toISOString(),
  };
}
