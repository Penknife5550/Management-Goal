// ============================================================
// src/app/api/goals/route.ts
// GET  /api/goals        - alle nicht-archivierten Ziele des Nutzers
// POST /api/goals        - Quick-Add (legt ein BACKLOG-Ziel an)
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { goalQuickAddSchema } from "@/lib/validation/goal";

export async function GET() {
  try {
    const nutzer = getAktuellerNutzer();
    const goals = await prisma.goal.findMany({
      where: { ownerId: nutzer.id, status: { not: "ARCHIVIERT" } },
      include: { leadMeasures: { orderBy: { beschreibung: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk(goals);
  } catch (fehler) {
    console.error("GET /api/goals fehlgeschlagen:", fehler);
    return jsonError("Ziele konnten nicht geladen werden.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const nutzer = getAktuellerNutzer();
    const body = await request.json().catch(() => null);
    const parsed = goalQuickAddSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    const goal = await prisma.goal.create({
      data: {
        titel: parsed.data.titel,
        ownerId: nutzer.id,
        rechtseinheitId: nutzer.rechtseinheitId,
      },
      include: { leadMeasures: true },
    });
    return jsonOk(goal, 201);
  } catch (fehler) {
    console.error("POST /api/goals fehlgeschlagen:", fehler);
    return jsonError("Ziel konnte nicht angelegt werden.", 500);
  }
}
