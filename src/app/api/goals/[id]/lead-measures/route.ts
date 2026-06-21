// ============================================================
// src/app/api/goals/[id]/lead-measures/route.ts
// GET  /api/goals/:id/lead-measures  - Lead Measures eines Ziels
// POST /api/goals/:id/lead-measures  - neue Lead Measure anlegen
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer } from "@/lib/goal-service";
import { leadMeasureCreateSchema } from "@/lib/validation/goal";

type Kontext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();
    const goal = await findeZielFuerNutzer(id, nutzer.id);
    if (!goal) return jsonError("Ziel nicht gefunden.", 404);
    return jsonOk(goal.leadMeasures);
  } catch (fehler) {
    console.error("GET lead-measures fehlgeschlagen:", fehler);
    return jsonError("Lead Measures konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

    const goal = await findeZielFuerNutzer(id, nutzer.id);
    if (!goal) return jsonError("Ziel nicht gefunden.", 404);

    const body = await request.json().catch(() => null);
    const parsed = leadMeasureCreateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    const leadMeasure = await prisma.leadMeasure.create({
      data: { goalId: id, ...parsed.data },
    });
    return jsonOk(leadMeasure, 201);
  } catch (fehler) {
    console.error("POST lead-measures fehlgeschlagen:", fehler);
    return jsonError("Lead Measure konnte nicht angelegt werden.", 500);
  }
}
