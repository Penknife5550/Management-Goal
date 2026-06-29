// ============================================================
// src/app/api/goals/[id]/route.ts
// GET    /api/goals/:id  - einzelnes Ziel (inkl. Lead Measures, Lern-Log)
// PATCH  /api/goals/:id  - Felder/Status aendern (Regeln in EINER Transaktion)
// DELETE /api/goals/:id  - archivieren (Soft-Delete -> ARCHIVIERT)
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer, type GoalMitLeads, toZielDTO } from "@/lib/goal-service";
import {
  type AenderungsErgebnis,
  entscheideZielAenderung,
  istStatusUebergangErlaubt,
} from "@/lib/goals";
import { goalUpdateSchema } from "@/lib/validation/goal";

type Kontext = { params: Promise<{ id: string }> };

// Ergebnis der PATCH-Transaktion: entweder Regelverstoss oder das aktualisierte Ziel.
type PatchErgebnis = { ok: false; fehler: AenderungsErgebnis } | { ok: true; goal: GoalMitLeads };

export async function GET(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();
    const goal = await findeZielFuerNutzer(id, nutzer.id);
    if (!goal) return jsonError("Ziel nicht gefunden.", 404);
    return jsonOk(toZielDTO(goal));
  } catch (fehler) {
    console.error("GET /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht geladen werden.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

    const body = await request.json().catch(() => null);
    const parsed = goalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    const vorhanden = await findeZielFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Ziel nicht gefunden.", 404);

    const { erwartet, ...felder } = parsed.data;
    const zielStatus = felder.status ?? vorhanden.status;
    const neuesOutcome = felder.outcome !== undefined ? felder.outcome : vorhanden.outcome;
    const hebtAufFokus = zielStatus === "FOKUS" && vorhanden.status !== "FOKUS";

    // Regelpruefung + Update in EINER Serializable-Transaktion -> WIG-Limit
    // ist race-sicher (paralleler Doppel-Klick kann kein 4. FOKUS erzeugen).
    const ergebnis = await prisma.$transaction(
      async (tx): Promise<PatchErgebnis> => {
        const aktiveWigs = hebtAufFokus
          ? await tx.goal.count({
              where: { ownerId: nutzer.id, status: "FOKUS", id: { not: id } },
            })
          : 0;

        const regel = entscheideZielAenderung(
          vorhanden.status,
          zielStatus,
          neuesOutcome,
          aktiveWigs,
        );
        if (!regel.ok) return { ok: false, fehler: regel };

        const goal = await tx.goal.update({
          where: { id },
          data: felder,
          include: { leadMeasures: { orderBy: { beschreibung: "asc" } }, learningLog: true },
        });
        if (erwartet && zielStatus === "FOKUS") {
          await tx.learningLog.upsert({
            where: { goalId: id },
            update: { erwartet },
            create: { goalId: id, erwartet },
          });
        }
        return { ok: true, goal };
      },
      { isolationLevel: "Serializable" },
    );

    if (!ergebnis.ok) {
      return jsonError(
        ergebnis.fehler.grund ?? "Aenderung nicht erlaubt.",
        ergebnis.fehler.status ?? 409,
      );
    }
    return jsonOk(toZielDTO(ergebnis.goal));
  } catch (fehler) {
    console.error("PATCH /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

    const vorhanden = await findeZielFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Ziel nicht gefunden.", 404);
    if (!istStatusUebergangErlaubt(vorhanden.status, "ARCHIVIERT")) {
      return jsonError("Ziel ist bereits archiviert.", 409);
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: { status: "ARCHIVIERT" },
      include: { leadMeasures: true },
    });
    return jsonOk(toZielDTO(goal));
  } catch (fehler) {
    console.error("DELETE /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht archiviert werden.", 500);
  }
}
