// ============================================================
// src/lib/eisenhower.ts
// Reine Domaenenlogik der Aufgaben-Ebene (Eisenhower-Matrix), ohne DB/Framework.
// Frei von Prisma-Importen, damit Unit-Tests isoliert laufen.
// Die String-Unions spiegeln die Prisma-Enums (gleiche Werte) wider.
// ============================================================

// App-seitige Single-Source der Task-Status (spiegelt das Prisma-Enum TaskStatus).
// Typ UND Zod-Validierung (validation/task.ts) leiten sich hieraus ab.
export const TASK_STATUS_WERTE = ["TODO", "DOING", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUS_WERTE)[number];

// Quadranten der Eisenhower-Matrix. wert = 1..4 (entspricht Task.aiQuadrantSuggestion).
//   Q1 wichtig + dringend     -> Tun (sofort selbst)
//   Q2 wichtig + nicht dringend -> Planen (die strategische Zone; Covey/Drucker)
//   Q3 nicht wichtig + dringend -> Delegieren
//   Q4 weder                    -> Eliminieren
export type Quadrant = 1 | 2 | 3 | 4;

export interface QuadrantMeta {
  wert: Quadrant;
  important: boolean;
  urgent: boolean;
  titel: string; // Eckpunkt-Label (wichtig/dringend)
  aktion: string; // empfohlene Handlung
  beschreibung: string;
  // Tailwind-Klasse fuer den Akzent (Punkt/Rahmen) aus dem CREDO-Theme.
  akzentBg: string;
  akzentText: string;
}

// Einzige Quelle fuer Quadrant-Metadaten (UI + Server). Farben aus dem CREDO-Theme.
export const EISENHOWER_QUADRANTEN: readonly QuadrantMeta[] = [
  {
    wert: 1,
    important: true,
    urgent: true,
    titel: "Wichtig & dringend",
    aktion: "Tun",
    beschreibung: "Sofort selbst erledigen – Krisen, harte Fristen.",
    akzentBg: "bg-credo-rot",
    akzentText: "text-credo-rot",
  },
  {
    wert: 2,
    important: true,
    urgent: false,
    titel: "Wichtig, nicht dringend",
    aktion: "Planen",
    beschreibung: "Die strategische Zone – feste Zeit blocken (Q2).",
    akzentBg: "bg-credo-gruen",
    akzentText: "text-credo-gruen",
  },
  {
    wert: 3,
    important: false,
    urgent: true,
    titel: "Dringend, nicht wichtig",
    aktion: "Delegieren",
    beschreibung: "Wenn moeglich abgeben – frisst sonst die wichtige Zeit.",
    akzentBg: "bg-credo-gelb",
    akzentText: "text-credo-gelb",
  },
  {
    wert: 4,
    important: false,
    urgent: false,
    titel: "Weder noch",
    aktion: "Eliminieren",
    beschreibung: "Streichen oder bewusst zurueckstellen.",
    akzentBg: "bg-muted-foreground",
    akzentText: "text-muted-foreground",
  },
] as const;

/**
 * Leitet den Eisenhower-Quadranten (1..4) aus den beiden Flags ab.
 * Einzige Quelle der Zuordnung – UI und Server nutzen sie.
 */
export function berechneQuadrant(important: boolean, urgent: boolean): Quadrant {
  if (important && urgent) return 1;
  if (important && !urgent) return 2;
  if (!important && urgent) return 3;
  return 4;
}

/** Metadaten zu einem Quadranten-Wert (1..4). */
export function quadrantMeta(wert: Quadrant): QuadrantMeta {
  const meta = EISENHOWER_QUADRANTEN.find((q) => q.wert === wert);
  if (!meta) throw new Error(`Unbekannter Quadrant: ${wert}`);
  return meta;
}

/**
 * Ist gerade ein KI-Vorschlag offen? Offen = es gibt einen Vorschlag, der vom
 * aktuellen manuellen Quadranten abweicht (sonst nichts zu entscheiden).
 * Reine Funktion fuer UI (Badge anzeigen) und Server.
 */
export function istKiVorschlagOffen(args: {
  aiQuadrantSuggestion: number | null | undefined;
  important: boolean;
  urgent: boolean;
}): boolean {
  const { aiQuadrantSuggestion, important, urgent } = args;
  if (aiQuadrantSuggestion == null) return false;
  if (aiQuadrantSuggestion < 1 || aiQuadrantSuggestion > 4) return false;
  return aiQuadrantSuggestion !== berechneQuadrant(important, urgent);
}
