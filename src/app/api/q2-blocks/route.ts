// ============================================================
// /api/q2-blocks
// GET  - alle Q2-Schutz-Bloecke des Nutzers (sortiert nach Wochentag/Zeit)
// POST - neuen Block anlegen
// Owner-Scope via getAktuellerNutzer (kein Admin-Token: Nutzerinhalt wie Ziele).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer } from "@/lib/goal-service";
import { toQ2BlockDTO } from "@/lib/q2-service";
import { q2BlockSchema } from "@/lib/validation/q2";

export async function GET() {
  try {
    const nutzer = await getAktuellerNutzer();
    const bloecke = await prisma.q2Block.findMany({
      where: { ownerId: nutzer.id },
      include: { goal: { select: { titel: true } } },
      orderBy: [{ wochentag: "asc" }, { startMinute: "asc" }],
    });
    return jsonOk(bloecke.map(toQ2BlockDTO));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("GET /api/q2-blocks fehlgeschlagen:", fehler);
    return jsonError("Fokuszeit konnte nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const nutzer = await getAktuellerNutzer();
    const p = await parseBody(request, q2BlockSchema);
    if (!p.ok) return p.response;
    const d = p.data;

    // Verknuepfte WIG muss dem Nutzer gehoeren.
    if (d.goalId && !(await findeZielFuerNutzer(d.goalId, nutzer.id))) {
      return jsonError("Verknuepfte WIG nicht gefunden.", 400);
    }

    const block = await prisma.q2Block.create({
      data: {
        ownerId: nutzer.id,
        titel: d.titel,
        wochentag: d.wochentag,
        startMinute: d.startMinute,
        dauerMin: d.dauerMin,
        goalId: d.goalId ?? null,
      },
      include: { goal: { select: { titel: true } } },
    });
    return jsonOk(toQ2BlockDTO(block), 201);
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("POST /api/q2-blocks fehlgeschlagen:", fehler);
    return jsonError("Block konnte nicht angelegt werden.", 500);
  }
}
