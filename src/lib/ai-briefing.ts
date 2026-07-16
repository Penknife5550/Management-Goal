// ============================================================
// src/lib/ai-briefing.ts
// KI-Veredelung des Montags-Briefings (optionaler Layer auf AP3): die KI
// FORMULIERT die schon berechneten Findings zu einem warmen Wochenkommentar aus
// - sie erfindet NICHTS (keine neuen Zahlen/Ziele). Faellt Ollama/n8n aus, geht
// das deterministische Briefing (Cut 1) unveraendert raus.
//
// Ablauf wie beim KI-Eisenhower, aber SYNCHRON: Cockpit ruft den n8n-Webhook und
// bekommt den Text direkt in der HTTP-Antwort (kein Callback - der Cron-Batch ist
// nicht latenzkritisch). n8n reicht den Prompt nur an ein LOKALES Ollama-Modell
// durch (NIE :cloud - Ziel-Titel sind interne Daten).
// ============================================================
import { bewerteTag } from "./heute";
import type { Ampel } from "./goals";
import type { Insight } from "./insights";

// Harte Grenzen fuer den KI-Text (der spaeter HTML-escaped in die Mail geht).
const KOMMENTAR_MAX = 800;
// Hartes Timeout des KI-Aufrufs: ein haengendes Ollama darf den Cron nicht blockieren.
const KI_TIMEOUT_MS = 30_000;

export interface KiBriefingEingabe {
  fokusAmpeln: Ampel[];
  insights: Insight[];
  maxInsights?: number;
}

/**
 * Nur LOKALE Modelle: Cloud-Modelle wuerden Ziel-Titel an ollama.com routen (PII).
 * Case-insensitiv und auf den ganzen "cloud"-Marker geprueft - Ollama-Cloud-Modelle
 * tragen ihn als Tag-Suffix ("gpt-oss:120b-cloud"), nicht nur als ":cloud".
 * Fail-safe: ein lokales Modell mit "cloud" im Namen wird lieber abgelehnt
 * (KI-Veredelung entfaellt) als eines durchzulassen.
 */
export function istLokalesModell(model: string): boolean {
  const m = model.toLowerCase();
  return m.length > 0 && !m.includes("cloud");
}

/**
 * Deutscher Prompt: die KI soll die vorhandenen Findings NUR umformulieren.
 * Strikte Leitplanke gegen Halluzination (keine neuen Fakten/Zahlen/Ziele).
 */
export function baueBriefingPrompt(e: KiBriefingEingabe): string {
  const urteil = bewerteTag({ fokusAmpeln: e.fokusAmpeln, insights: e.insights });
  const top = e.insights.slice(0, e.maxInsights ?? 4);
  const findingsBlock =
    top.length === 0
      ? "- (keine besonderen Auffaelligkeiten diese Woche)"
      : top.map((i) => `- ${i.titel}: ${i.detail}`).join("\n");

  return [
    "Du bist ein knapper, wertschaetzender Assistent fuer eine Fuehrungskraft.",
    "Formuliere aus den folgenden bereits ausgewerteten Findings einen kurzen,",
    "warmen Wochenkommentar auf Deutsch (2 bis 3 Saetze, per Du, ehrlich aber motivierend).",
    "",
    "STRENGE REGELN:",
    "- Erfinde KEINE Fakten, Zahlen, Ziele oder Namen, die unten nicht vorkommen.",
    "- Fasse nur zusammen und ordne ein, mehr nicht.",
    "- Antworte NUR mit dem Kommentar-Text, ohne Anrede, ohne Ueberschrift, ohne Aufzaehlung.",
    "",
    `Gesamturteil: ${urteil.titel} - ${urteil.text}`,
    "Findings:",
    findingsBlock,
  ].join("\n");
}

/**
 * Validiert + saeubert den rohen KI-Text. Gibt null zurueck (-> Fallback auf den
 * deterministischen Text), wenn die Antwort unbrauchbar ist. Entfernt defensiv
 * jegliches HTML/Markup (der Text wird ohnehin escaped, aber sauberer Klartext
 * ist besser) und kappt die Laenge.
 */
export function bereinigeKiKommentar(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const ohneTags = input.replace(/<[^>]*>/g, " ");
  const text = ohneTags.replace(/\s+/g, " ").trim();
  if (text.length === 0) return null;
  return text.slice(0, KOMMENTAR_MAX);
}

/**
 * Holt den KI-Wochenkommentar via n8n/Ollama. Wirft NIE - liefert bei fehlender
 * Konfiguration, Cloud-Modell, Timeout oder jedem Fehler null (-> deterministischer
 * Fallback). Der Aufrufer rendert dann einfach ohne Kommentar.
 */
export async function holeKiKommentar(e: KiBriefingEingabe): Promise<string | null> {
  const webhookUrl = process.env.N8N_BRIEFING_WEBHOOK_URL;
  if (!webhookUrl) return null; // KI-Veredelung nicht konfiguriert -> Fallback
  const model = process.env.AI_MODEL ?? "qwen2.5:7b";
  if (!istLokalesModell(model)) {
    console.error("[KI-Briefing] Cloud-Modell verweigert (PII):", model);
    return null;
  }

  try {
    const antwort = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: baueBriefingPrompt(e) }),
      signal: AbortSignal.timeout(KI_TIMEOUT_MS),
    });
    if (!antwort.ok) {
      console.error("[KI-Briefing] n8n-Webhook antwortete", antwort.status);
      return null;
    }
    const daten = (await antwort.json().catch(() => null)) as { text?: unknown } | null;
    return bereinigeKiKommentar(daten?.text);
  } catch (fehler) {
    console.error(
      "[KI-Briefing] Aufruf fehlgeschlagen:",
      fehler instanceof Error ? fehler.message : fehler,
    );
    return null;
  }
}
