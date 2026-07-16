// ============================================================
// src/app/api/lead-measures/[id]/route.ts
// PATCH  /api/lead-measures/:id  - Fortschritt/Beschreibung aktualisieren
// DELETE /api/lead-measures/:id  - Lead Measure loeschen
// Owner-Scope zentral via goal-service (findeLeadMeasureFuerNutzer).
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeLeadMeasureFuerNutzer, toLeadMeasureDTO } from "@/lib/goal-service";
import { leadMeasureUpdateSchema } from "@/lib/validation/goal";

type Kontext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();
    if (!(await findeLeadMeasureFuerNutzer(id, nutzer.id))) {
      return jsonError("Lead Measure nicht gefunden.", 404);
    }

    const body = await request.json().catch(() => null);
    const parsed = leadMeasureUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }

    const leadMeasure = await prisma.leadMeasure.update({
      where: { id },
      data: parsed.data,
    });
    return jsonOk(toLeadMeasureDTO(leadMeasure));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("PATCH lead-measure fehlgeschlagen:", fehler);
    return jsonError("Lead Measure konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();
    if (!(await findeLeadMeasureFuerNutzer(id, nutzer.id))) {
      return jsonError("Lead Measure nicht gefunden.", 404);
    }

    await prisma.leadMeasure.delete({ where: { id } });
    return jsonOk({ geloescht: true });
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("DELETE lead-measure fehlgeschlagen:", fehler);
    return jsonError("Lead Measure konnte nicht geloescht werden.", 500);
  }
}
