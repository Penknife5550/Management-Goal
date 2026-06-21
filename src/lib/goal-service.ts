// ============================================================
// src/lib/goal-service.ts
// DB-naher Service: Owner-Scope + Geschaeftsregeln gebuendelt,
// damit die API-Routen schlank und lesbar bleiben.
// ============================================================
import { prisma } from "./db";
import {
  type GoalStatus,
  istStatusUebergangErlaubt,
  outcomePflichtErfuellt,
  pruefeFokusHebung,
} from "./goals";

// Laedt ein Ziel nur, wenn es dem Nutzer gehoert (Scope-Durchsetzung).
export function findeZielFuerNutzer(id: string, ownerId: string) {
  return prisma.goal.findFirst({
    where: { id, ownerId },
    include: { leadMeasures: { orderBy: { beschreibung: "asc" } }, learningLog: true },
  });
}

export function zaehleAktiveWigs(ownerId: string, ausserId?: string) {
  return prisma.goal.count({
    where: {
      ownerId,
      status: "FOKUS",
      ...(ausserId ? { id: { not: ausserId } } : {}),
    },
  });
}

export interface RegelErgebnis {
  ok: boolean;
  status?: number;
  grund?: string;
}

/**
 * Prueft die Geschaeftsregeln einer Ziel-Aenderung:
 * - erlaubter Status-Uebergang
 * - harte WIG-Grenze beim Heben auf FOKUS
 * - Outcome-Pflicht bei FOKUS (auch wenn Outcome geleert wuerde)
 */
export async function pruefeZielAenderung(args: {
  id: string;
  ownerId: string;
  aktuellerStatus: GoalStatus;
  zielStatus: GoalStatus;
  neuesOutcome: string | null | undefined;
}): Promise<RegelErgebnis> {
  const { id, ownerId, aktuellerStatus, zielStatus, neuesOutcome } = args;

  if (!istStatusUebergangErlaubt(aktuellerStatus, zielStatus)) {
    return {
      ok: false,
      status: 409,
      grund: `Status-Wechsel von ${aktuellerStatus} zu ${zielStatus} ist nicht erlaubt.`,
    };
  }

  if (zielStatus === "FOKUS") {
    if (aktuellerStatus !== "FOKUS") {
      const anzahl = await zaehleAktiveWigs(ownerId, id);
      const pruef = pruefeFokusHebung(anzahl, neuesOutcome);
      if (!pruef.erlaubt) {
        return { ok: false, status: 409, grund: pruef.grund };
      }
    } else if (!outcomePflichtErfuellt("FOKUS", neuesOutcome)) {
      return {
        ok: false,
        status: 400,
        grund: "Ein Fokus-Ziel braucht ein Outcome (den angestrebten Beitrag).",
      };
    }
  }

  return { ok: true };
}
