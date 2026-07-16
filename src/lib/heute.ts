// ============================================================
// src/lib/heute.ts
// Reine Domaenenlogik der Startseite /heute (AP 2): verdichtet die schon
// vorhandenen Daten (WIG-Ampeln + Insight-Motor) zu EINEM ehrlichen
// "Gewinne ich?"-Tagesurteil. Bewusst frei von Prisma/Framework, damit die
// Regel isoliert unit-testbar bleibt (wie goals.ts / eisenhower.ts).
// ============================================================
import type { Ampel } from "./goals";
import type { Insight } from "./insights";

export type TagesTon = "gruen" | "gelb" | "rot" | "leer";

export interface TagesUrteil {
  ton: TagesTon;
  titel: string;
  text: string;
}

// Minimal-Formen: die Bewertung braucht nur die Ampel bzw. die Schwere.
export interface UrteilEingabe {
  fokusAmpeln: Ampel[]; // Ampeln der aktiven FOKUS-Ziele (WIGs)
  insights: Insight[]; // Findings aus dem Insight-Motor (AP 1)
}

/**
 * Deterministisches Tagesurteil ("Gewinne ich?"):
 * - leer:  keine WIGs -> nichts zu gewinnen, sanfter Anstoss.
 * - rot:   mindestens ein WIG kritisch (ROT) ODER eine Insight-Warnung.
 * - gelb:  nicht rot, aber ein WIG wackelt (GELB) ODER ein Insight-Hinweis.
 * - gruen: alle WIGs auf Kurs und keine Warnung/kein Hinweis.
 *
 * Rein aus bereits berechneten Daten abgeleitet - kein neuer Messweg, keine KI.
 */
export function bewerteTag({ fokusAmpeln, insights }: UrteilEingabe): TagesUrteil {
  if (fokusAmpeln.length === 0) {
    return {
      ton: "leer",
      titel: "Noch kein Fokus",
      text: "Du hast noch keine Fokus-Ziele (WIGs). Leg 1–3 wirklich wichtige Ziele fest, dann zeigt dir diese Seite jeden Tag, ob du gewinnst.",
    };
  }

  const hatKritisch = fokusAmpeln.includes("ROT") || insights.some((i) => i.schwere === "warnung");
  if (hatKritisch) {
    return {
      ton: "rot",
      titel: "Achtung",
      text: "Mindestens ein Ziel ist kritisch oder es gibt eine Warnung. Genau hier heute gegensteuern.",
    };
  }

  const hatWackelig = fokusAmpeln.includes("GELB") || insights.some((i) => i.schwere === "hinweis");
  if (hatWackelig) {
    return {
      ton: "gelb",
      titel: "Wackelig",
      text: "Ein paar Ziele wackeln oder es gibt Hinweise. Ein kurzer Blick lohnt sich, bevor es kritisch wird.",
    };
  }

  return {
    ton: "gruen",
    titel: "Auf Kurs",
    text: "Deine Fokus-Ziele sind auf Kurs und es gibt keine Warnungen. Weiter so – schütze heute deine Q2-Zeit.",
  };
}
