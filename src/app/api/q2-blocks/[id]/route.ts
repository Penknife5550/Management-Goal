// ============================================================
// /api/q2-blocks/:id
// PATCH  - Block aendern
// DELETE - Block loeschen
// Owner-Scope erzwungen.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk, parseBody } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findeZielFuerNutzer } from "@/lib/goal-service";
import { toQ2BlockDTO } from "@/lib/q2-service";
import { q2BlockSchema } from "@/lib/validation/q2";

type Kontext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const vorhanden = await prisma.q2Block.findFirst({ where: { id, ownerId: nutzer.id } });
    if (!vorhanden) return jsonError("Block nicht gefunden.", 404);

    const p = await parseBody(request, q2BlockSchema);
    if (!p.ok) return p.response;
    const d = p.data;

    if (d.goalId && !(await findeZielFuerNutzer(d.goalId, nutzer.id))) {
      return jsonError("Verknuepfte WIG nicht gefunden.", 400);
    }

    const block = await prisma.q2Block.update({
      where: { id },
      data: {
        titel: d.titel,
        wochentag: d.wochentag,
        startMinute: d.startMinute,
        dauerMin: d.dauerMin,
        goalId: d.goalId ?? null,
      },
      include: { goal: { select: { titel: true } } },
    });
    return jsonOk(toQ2BlockDTO(block));
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("PATCH /api/q2-blocks/[id] fehlgeschlagen:", fehler);
    return jsonError("Block konnte nicht aktualisiert werden.", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = await getAktuellerNutzer();

    const vorhanden = await prisma.q2Block.findFirst({ where: { id, ownerId: nutzer.id } });
    if (!vorhanden) return jsonError("Block nicht gefunden.", 404);

    await prisma.q2Block.delete({ where: { id } });
    return jsonOk({ geloescht: true });
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("DELETE /api/q2-blocks/[id] fehlgeschlagen:", fehler);
    return jsonError("Block konnte nicht geloescht werden.", 500);
  }
}
