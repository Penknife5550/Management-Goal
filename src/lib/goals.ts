// ============================================================
// src/lib/goals.ts
// Reine Domaenenlogik der strategischen Ebene (ohne DB/Framework).
// Bewusst frei von Prisma-Importen, damit Unit-Tests isoliert laufen.
// Die String-Unions spiegeln die Prisma-Enums (gleiche Werte) wider.
// ============================================================
import { COUNTDOWN_WARN_TAGE, WIG_LIMIT } from "./constants";

// App-seitige Single-Source der Enum-Werte (spiegeln die Prisma-Enums). Typ UND
// Zod-Validierung (validation/goal.ts) leiten sich hieraus ab — keine Dreifachpflege.
export const GOAL_STATUS_WERTE = ["BACKLOG", "FOKUS", "ERREICHT", "ARCHIVIERT"] as const;
export const AMPEL_WERTE = ["GRUEN", "GELB", "ROT"] as const;
export type GoalStatus = (typeof GOAL_STATUS_WERTE)[number];
export type Ampel = (typeof AMPEL_WERTE)[number];

// Einzige Quelle fuer Ampel-Label + aktive Button-Klasse (UI). Gruen nutzt das
// dunklere --color-status-gruen-text fuer ausreichenden Kontrast zu Weiss (WCAG AA).
export const AMPEL_META: { wert: Ampel; label: string; klasse: string }[] = [
  { wert: "GRUEN", label: "Auf Kurs", klasse: "bg-status-gruen-text text-white" },
  { wert: "GELB", label: "Wackelig", klasse: "bg-status-gelb text-foreground" },
  { wert: "ROT", label: "Kritisch", klasse: "bg-status-rot text-white" },
];

// Erlaubte Status-Uebergaenge. ARCHIVIERT ist in diesem Slice terminal.
const ERLAUBTE_UEBERGAENGE: Record<GoalStatus, readonly GoalStatus[]> = {
  BACKLOG: ["FOKUS", "ARCHIVIERT"],
  FOKUS: ["BACKLOG", "ERREICHT", "ARCHIVIERT"],
  ERREICHT: ["ARCHIVIERT"],
  ARCHIVIERT: [],
};

/**
 * Prueft, ob ein Status-Wechsel erlaubt ist.
 * Gleicher Status gilt als erlaubt (idempotentes Update anderer Felder).
 */
export function istStatusUebergangErlaubt(von: GoalStatus, nach: GoalStatus): boolean {
  if (von === nach) return true;
  return ERLAUBTE_UEBERGAENGE[von].includes(nach);
}

/**
 * Outcome-Pflicht (Drucker: Beitrag statt Aktivitaet).
 * Nur FOKUS-Ziele brauchen zwingend ein nicht-leeres Outcome.
 */
export function outcomePflichtErfuellt(
  status: GoalStatus,
  outcome: string | null | undefined,
): boolean {
  if (status !== "FOKUS") return true;
  return typeof outcome === "string" && outcome.trim().length > 0;
}

export interface FokusPruefung {
  erlaubt: boolean;
  grund?: string;
}

/**
 * Prueft, ob ein Ziel ins FOKUS gehoben werden darf:
 * 1) harte WIG-Grenze (max. WIG_LIMIT aktive Ziele)
 * 2) Outcome-Pflicht erfuellt
 *
 * @param aktiveWigAnzahl Anzahl bereits aktiver FOKUS-Ziele (OHNE das zu hebende)
 * @param outcome         vorgesehenes Outcome des Ziels
 */
export function pruefeFokusHebung(
  aktiveWigAnzahl: number,
  outcome: string | null | undefined,
): FokusPruefung {
  if (aktiveWigAnzahl >= WIG_LIMIT) {
    return {
      erlaubt: false,
      grund: `Maximal ${WIG_LIMIT} Ziele duerfen gleichzeitig im Fokus sein. Schliesse zuerst ein aktives Ziel ab oder stelle es zurueck.`,
    };
  }
  if (!outcomePflichtErfuellt("FOKUS", outcome)) {
    return {
      erlaubt: false,
      grund:
        "Ein Fokus-Ziel braucht ein Outcome (den angestrebten Beitrag), keine reine Aktivitaet.",
    };
  }
  return { erlaubt: true };
}

export interface AenderungsErgebnis {
  ok: boolean;
  status?: number;
  grund?: string;
}

/**
 * Reine Entscheidung ueber eine Ziel-Aenderung (ohne DB) - macht die
 * HTTP-Semantik (409 vs. 400) unit-testbar:
 * - unerlaubter Status-Uebergang -> 409
 * - Heben auf FOKUS am WIG-Limit oder ohne Outcome -> 409
 * - bereits FOKUS und Outcome wuerde geleert -> 400
 *
 * @param aktiveWigAnzahl Anzahl bereits aktiver FOKUS-Ziele OHNE das zu aendernde
 */
export function entscheideZielAenderung(
  aktuellerStatus: GoalStatus,
  zielStatus: GoalStatus,
  neuesOutcome: string | null | undefined,
  aktiveWigAnzahl: number,
): AenderungsErgebnis {
  if (!istStatusUebergangErlaubt(aktuellerStatus, zielStatus)) {
    return {
      ok: false,
      status: 409,
      grund: `Status-Wechsel von ${aktuellerStatus} zu ${zielStatus} ist nicht erlaubt.`,
    };
  }

  if (zielStatus === "FOKUS") {
    if (aktuellerStatus !== "FOKUS") {
      const pruef = pruefeFokusHebung(aktiveWigAnzahl, neuesOutcome);
      if (!pruef.erlaubt) return { ok: false, status: 409, grund: pruef.grund };
    } else if (!outcomePflichtErfuellt("FOKUS", neuesOutcome)) {
      return {
        ok: false,
        status: 400,
        grund: "Ein Fokus-Ziel braucht ein Outcome (den angestrebten Beitrag).",
      };
    }
  }

  return { ok: true };
}

export type CountdownTon = "neutral" | "warnung" | "ueberfaellig" | "ohne";

export interface CountdownInfo {
  tageVerbleibend: number | null;
  ton: CountdownTon;
  text: string;
}

/**
 * Berechnet den Countdown als sanftes Pacing (RECHERCHE Abschnitt 4):
 * neutral bis zur Warnschwelle, dann dezente Warnung, ueberfaellig erst nach Frist.
 * Bewusst KEINE rote Drohuhr ueber die gesamte Laufzeit.
 */
export function berechneCountdown(dueDate: Date | null | undefined, jetzt: Date): CountdownInfo {
  if (!dueDate) {
    return { tageVerbleibend: null, ton: "ohne", text: "Keine Frist" };
  }

  // UTC-Getter fuer beide Daten -> deterministische Tagesdifferenz, unabhaengig
  // von der Zeitzone der ausfuehrenden Maschine.
  const msProTag = 1000 * 60 * 60 * 24;
  const startTag = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate());
  const zielTag = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const tage = Math.round((zielTag - startTag) / msProTag);

  if (tage < 0) {
    const ueberfaellig = Math.abs(tage);
    return {
      tageVerbleibend: tage,
      ton: "ueberfaellig",
      text: `${ueberfaellig} ${ueberfaellig === 1 ? "Tag" : "Tage"} ueberfaellig`,
    };
  }
  if (tage === 0) {
    return { tageVerbleibend: 0, ton: "warnung", text: "Heute faellig" };
  }
  return {
    tageVerbleibend: tage,
    ton: tage <= COUNTDOWN_WARN_TAGE ? "warnung" : "neutral",
    text: `Noch ${tage} ${tage === 1 ? "Tag" : "Tage"}`,
  };
}
