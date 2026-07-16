// ============================================================
// src/lib/ai-eisenhower.ts
// Reine Funktionen fuer den KI-Eisenhower (Schritt 5): Prompt-Bau, Idempotenz-Key
// und Validierung der KI-Antwort. Frei von DB/Framework -> isoliert unit-testbar.
//
// Ablauf: Cockpit feuert n8n-Webhook -> n8n ruft ein LOKALES Ollama-Modell
// (NIE :cloud, PII!) mit format:json -> n8n postet das Ergebnis an /api/ai/callback.
// Die KI liefert important/urgent (die App-Wahrheit); der Quadrant wird daraus
// deterministisch abgeleitet (berechneQuadrant = Single-Source), nie umgekehrt.
// ============================================================
import { createHash } from "crypto";
import { berechneQuadrant, type Quadrant } from "./eisenhower";

// Von der KI erwartetes, validiertes Ergebnis (Content-Teil des Callbacks).
export interface KiKlassifizierung {
  quadrant: Quadrant; // abgeleitet aus important/urgent
  important: boolean;
  urgent: boolean;
  confidence: number; // 0..1
  reasoning: string; // kurze Begruendung (deutsch), fuer den Tooltip
}

const REASONING_MAX = 500;

/**
 * Deutscher Klassifizierungs-Prompt. Fordert strikt JSON (n8n setzt Ollama
 * format:"json"). Bewusst nur important/urgent statt Quadrant-Nummer — das
 * Mapping macht die App (robuster als eine Modell-Zahl).
 */
export function baueKlassifizierungsPrompt(titel: string): string {
  return [
    "Du bist ein Assistent fuer Zeitmanagement nach der Eisenhower-Matrix.",
    "Klassifiziere die folgende Aufgabe nach zwei Kriterien:",
    "- wichtig (important): traegt sie spuerbar zu einem uebergeordneten Ziel bei?",
    "- dringend (urgent): draengt die Zeit (harte Frist, blockiert andere)?",
    "",
    `Aufgabe: "${titel}"`,
    "",
    "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau diesem Format:",
    '{"important": true, "urgent": false, "confidence": 0.0, "reasoning": "kurze Begruendung auf Deutsch"}',
    "confidence ist eine Zahl zwischen 0 und 1. reasoning ist ein kurzer deutscher Satz.",
  ].join("\n");
}

/**
 * Deterministischer Idempotenz-Key aus taskId + Titel (Content-Hash).
 * Gleiche Aufgabe + gleicher Titel -> gleicher Key -> doppelte Callbacks werden
 * dedupliziert. Aendert sich der Titel, entsteht bewusst ein neuer Key.
 */
export function jobKey(taskId: string, titel: string): string {
  return createHash("sha256").update(`${taskId}::${titel}`).digest("hex");
}

/**
 * Validiert die rohe KI-Antwort (unknown vom Callback) und normalisiert sie.
 * Wirft bei Unsinn (fehlende/falsche Felder, confidence ausserhalb 0..1).
 * Der Quadrant wird aus important/urgent abgeleitet, nie vom Modell uebernommen.
 */
export function parseKiAntwort(input: unknown): KiKlassifizierung {
  if (typeof input !== "object" || input === null) {
    throw new Error("KI-Antwort ist kein Objekt.");
  }
  const o = input as Record<string, unknown>;

  if (typeof o.important !== "boolean" || typeof o.urgent !== "boolean") {
    throw new Error("KI-Antwort: important/urgent muessen booleans sein.");
  }
  if (
    typeof o.confidence !== "number" ||
    !Number.isFinite(o.confidence) ||
    o.confidence < 0 ||
    o.confidence > 1
  ) {
    throw new Error("KI-Antwort: confidence muss eine Zahl zwischen 0 und 1 sein.");
  }
  if (typeof o.reasoning !== "string" || o.reasoning.trim().length === 0) {
    throw new Error("KI-Antwort: reasoning fehlt.");
  }

  return {
    important: o.important,
    urgent: o.urgent,
    quadrant: berechneQuadrant(o.important, o.urgent),
    confidence: o.confidence,
    reasoning: o.reasoning.trim().slice(0, REASONING_MAX),
  };
}
