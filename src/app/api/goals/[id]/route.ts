// ============================================================
// src/app/api/goals/[id]/route.ts
// GET    /api/goals/:id  - einzelnes Ziel (inkl. Lead Measures, Lern-Log)
// PATCH  /api/goals/:id  - Felder/Status aendern (Regeln in EINER Transaktion)
// DELETE /api/goals/:id  - archivieren (Soft-Delete -> ARCHIVIERT)
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
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
    const nutzer = await getAktuellerNutzer();
    const goal = await findeZielFuerNutzer(id, nutzer.id);
    if (!goal) return jsonError("Ziel nicht gefunden.", 404);
    return jsonOk(toZielDTO(goal));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("GET /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht geladen werden.", 500);
  }
}

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const body = await request.json().catch(() => null);
    const parsed = goalUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    const vorhanden = await findeZielFuerNutzer(id, nutzer.id);
    if (!vorhanden) return jsonError("Ziel nicht gefunden.", 404);

    const { erwartet, tatsaechlich, ...felder } = parsed.data;
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

        await tx.goal.update({ where: { id }, data: felder });
        if (erwartet && zielStatus === "FOKUS") {
          await tx.learningLog.upsert({
            where: { goalId: id },
            update: { erwartet },
            create: { goalId: id, erwartet },
          });
        }
        // Feedback-Analyse (Drucker): beim Abschluss das tatsaechliche Ergebnis
        // festhalten. Existiert kein Lern-Log (kein erwartet erfasst), wird eins
        // mit leerem erwartet angelegt - das Tatsaechliche zaehlt trotzdem.
        if (tatsaechlich && zielStatus === "ERREICHT") {
          const reviewAm = new Date();
          await tx.learningLog.upsert({
            where: { goalId: id },
            update: { tatsaechlich, reviewAm },
            create: { goalId: id, erwartet: "", tatsaechlich, reviewAm },
          });
        }
        // Das Ziel nach dem Log-Upsert erneut mit frischem learningLog laden,
        // damit die Antwort den gerade gespeicherten Wert enthaelt.
        const goalMitLog = await tx.goal.findUniqueOrThrow({
          where: { id },
          include: { leadMeasures: { orderBy: { beschreibung: "asc" } }, learningLog: true },
        });
        return { ok: true, goal: goalMitLog };
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
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("PATCH /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

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
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("DELETE /api/goals/[id] fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht archiviert werden.", 500);
  }
}
