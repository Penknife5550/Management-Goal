// ============================================================
// POST /api/ai/callback
// Eingang fuer das n8n/Ollama-Ergebnis der KI-Klassifizierung (Schritt 5).
// Nicht owner-scoped (n8n hat keine Session) -> per Secret geschuetzt.
//
// Loop-Schutz Schicht 2: idempotent ueber WebhookIdempotency (jobKey). Ein
// zweiter Callback mit gleichem jobKey ist ein No-op (200).
// Schreibt NUR die Staging-Felder aiQuadrantSuggestion/aiConfidence/aiReasoning
// + lastModifiedBy=AI_OLLAMA — important/urgent bleiben unangetastet (nie Auto-Write).
// ============================================================
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { pruefeSecret } from "@/lib/admin-guard";
import { parseKiAntwort } from "@/lib/ai-eisenhower";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/db";
import { aiCallbackSchema } from "@/lib/validation/task";

export async function POST(request: NextRequest) {
  try {
    const verweigert = pruefeSecret(
      "AI_CALLBACK_SECRET",
      request.headers.get("x-ai-callback-secret") ?? "",
    );
    if (verweigert) return verweigert;

    const body = await request.json().catch(() => null);
    const envelope = aiCallbackSchema.safeParse(body);
    if (!envelope.success) {
      return jsonError(envelope.error.issues[0]?.message ?? "Ungueltige Eingabe.", 400);
    }
    const { jobKey, taskId } = envelope.data;

    let ki;
    try {
      ki = parseKiAntwort(body);
    } catch (e) {
      return jsonError((e as Error).message, 400);
    }

    // Reservieren (Schicht 2). Zweiter Callback mit gleichem jobKey -> No-op.
    try {
      await prisma.webhookIdempotency.create({ data: { jobKey } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonOk({ bereitsVerarbeitet: true });
      }
      throw e;
    }

    // Ab hier: bei Fehler die Reservierung wieder freigeben (Retry moeglich).
    try {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        await prisma.webhookIdempotency.delete({ where: { jobKey } }).catch(() => {});
        return jsonError("Aufgabe nicht gefunden.", 404);
      }
      await prisma.task.update({
        where: { id: taskId },
        data: {
          aiQuadrantSuggestion: ki.quadrant,
          aiConfidence: ki.confidence,
          aiReasoning: ki.reasoning,
          lastModifiedBy: "AI_OLLAMA",
        },
      });
    } catch (e) {
      await prisma.webhookIdempotency.delete({ where: { jobKey } }).catch(() => {});
      throw e;
    }

    return jsonOk({ gespeichert: true });
  } catch (fehler) {
    console.error("POST /api/ai/callback fehlgeschlagen:", fehler);
    return jsonError("Interner Serverfehler.", 500);
  }
}
