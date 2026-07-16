// ============================================================
// GET /api/q2-blocks/ics
// Liefert die Q2-Schutz-Bloecke des Nutzers als ICS-Datei (woechentliche
// Wiederholung) zum Import in einen beliebigen Kalender.
// ============================================================
import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getAktuellerNutzer, NichtAngemeldetError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { baueICS } from "@/lib/q2";

export async function GET() {
  try {
    const nutzer = await getAktuellerNutzer();
    const bloecke = await prisma.q2Block.findMany({
      where: { ownerId: nutzer.id },
      include: { goal: { select: { titel: true } } },
      orderBy: [{ wochentag: "asc" }, { startMinute: "asc" }],
    });

    const ics = baueICS(
      bloecke.map((b) => ({
        id: b.id,
        titel: b.titel,
        wochentag: b.wochentag,
        startMinute: b.startMinute,
        dauerMin: b.dauerMin,
        goalTitel: b.goal?.titel ?? null,
      })),
      new Date(),
    );

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="credo-fokuszeit.ics"',
      },
    });
  } catch (fehler) {
    if (fehler instanceof NichtAngemeldetError) return jsonError("Nicht angemeldet.", 401);
    console.error("GET /api/q2-blocks/ics fehlgeschlagen:", fehler);
    return new NextResponse("ICS-Export fehlgeschlagen.", { status: 500 });
  }
}
