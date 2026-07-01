// ============================================================
// POST /api/tasks/:id/classify
// Stoesst die KI-Klassifizierung an: feuert den n8n-Webhook mit
// { taskId, titel, model, callbackUrl, jobKey } und antwortet SOFORT 202
// (respond-immediately, Loop-Schutz Schicht 3). KEIN Warten auf Ollama.
// Schicht 1: nur ausloesen, wenn der Nutzer die letzte Quelle war
// (lastModifiedBy=USER) — verhindert Re-Trigger auf einen KI-Write.
// ============================================================
import type { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { baueKlassifizierungsPrompt, jobKey } from "@/lib/ai-eisenhower";
import { getAktuellerNutzer } from "@/lib/auth";
import { findeTaskFuerNutzer } from "@/lib/task-service";

type Kontext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Kontext) {
  try {
    const { id } = await params;
    const nutzer = getAktuellerNutzer();

    const task = await findeTaskFuerNutzer(id, nutzer.id);
    if (!task) return jsonError("Aufgabe nicht gefunden.", 404);

    // Schicht 1: liegt schon ein KI-Vorschlag vor, nicht erneut anstossen.
    if (task.lastModifiedBy !== "USER") {
      return jsonError("Es liegt bereits ein KI-Vorschlag vor. Bitte erst uebernehmen oder verwerfen.", 409);
    }

    const webhookUrl = process.env.N8N_EISENHOWER_WEBHOOK_URL;
    if (!webhookUrl) return jsonError("KI-Anbindung ist nicht konfiguriert.", 500);

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const payload = {
      taskId: task.id,
      titel: task.titel,
      model: process.env.AI_MODEL ?? "qwen2.5:7b",
      // Fertiger Prompt aus dem Cockpit (Single-Source). n8n reicht ihn nur an
      // Ollama durch (format:"json"), baut ihn NICHT selbst -> keine Drift.
      prompt: baueKlassifizierungsPrompt(task.titel),
      callbackUrl: `${appUrl}/api/ai/callback`,
      callbackSecret: process.env.AI_CALLBACK_SECRET ?? "",
      jobKey: jobKey(task.id, task.titel),
    };

    // Nur den n8n-Trigger anstossen (schnell). Ollama laeuft danach async in n8n.
    const antwort = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!antwort.ok) {
      console.error("classify: n8n-Webhook antwortete", antwort.status);
      return jsonError("KI-Dienst nicht erreichbar.", 502);
    }

    return jsonOk({ angestossen: true }, 202);
  } catch (fehler) {
    console.error("POST /api/tasks/[id]/classify fehlgeschlagen:", fehler);
    return jsonError("KI-Klassifizierung konnte nicht angestossen werden.", 500);
  }
}
