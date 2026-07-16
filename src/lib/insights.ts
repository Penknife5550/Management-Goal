// ============================================================
// src/lib/insights.ts
// Insight-Motor (AP 1): verdichtet vorhandene Ziel-/Aufgaben-Daten zu
// Fuehrungs-Einsichten. Bewusst DETERMINISTISCH und Prisma-frei -> isoliert
// unit-testbar. Die KI (AP 3) formuliert diese Findings spaeter nur aus,
// erfindet sie nicht -> kein Halluzinations-Risiko in der Berechnung.
// ============================================================
import {
  FOKUSLECK_Q3_WARN,
  WATERMELON_FORTSCHRITT_MIN,
  WATERMELON_LEAD_MAX,
  ZOMBIE_TAGE,
} from "./constants";
import { berechneQuadrant } from "./eisenhower";
import type { Ampel, GoalStatus } from "./goals";

// ---- Eingabe-Formen (schlanker Ausschnitt der Prisma-Rows) ----
export interface InsightLeadMeasure {
  zielwert: number;
  istwert: number;
}
export interface InsightCheckIn {
  ampel: Ampel;
  fortschritt: number;
  createdAt: Date;
}
export interface InsightGoal {
  id: string;
  titel: string;
  status: GoalStatus;
  ampel: Ampel;
  fortschritt: number; // selbstberichtet 0..100 (Lag)
  outcome: string | null;
  updatedAt: Date;
  leadMeasures: InsightLeadMeasure[];
  checkIns: InsightCheckIn[];
}
export interface InsightTask {
  important: boolean;
  urgent: boolean;
  zeitIstMin: number | null;
}

export interface InsightEingabe {
  goals: InsightGoal[];
  tasks: InsightTask[];
  jetzt: Date;
}

// ---- Ausgabe: ein einheitliches Finding, generisch renderbar ----
export type InsightTyp = "watermelon" | "fokusleck" | "zombie" | "trend" | "beitrag";
export type InsightSchwere = "warnung" | "hinweis" | "info";

export interface Insight {
  typ: InsightTyp;
  schwere: InsightSchwere;
  titel: string; // kurze Ueberschrift
  detail: string; // erklaerender Satz (deutsch); die KI verfeinert spaeter
  goalId?: string; // Bezug, falls zielbezogen
  kennzahl?: number; // optionaler Messwert (z.B. Q3-Anteil in %)
}

// ---- kleine, deterministische Helfer ----

/** Tagesdifferenz (jetzt - datum) in ganzen Tagen, zeitzonenunabhaengig via UTC. */
export function tageSeit(datum: Date, jetzt: Date): number {
  const msProTag = 1000 * 60 * 60 * 24;
  const a = Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), jetzt.getUTCDate());
  const b = Date.UTC(datum.getUTCFullYear(), datum.getUTCMonth(), datum.getUTCDate());
  return Math.round((a - b) / msProTag);
}

/**
 * Erfuellungsgrad der Lead Measures (0..1): Summe ist / Summe soll, jeder
 * Einzelwert bei 100% gedeckelt (Ueber-Erfuellung soll ein Defizit anderswo
 * nicht kaschieren). null, wenn es keine bewertbaren Lead Measures gibt.
 */
export function leadErfuellung(lms: InsightLeadMeasure[]): number | null {
  const gueltig = lms.filter((l) => l.zielwert > 0);
  if (gueltig.length === 0) return null;
  const soll = gueltig.reduce((s, l) => s + l.zielwert, 0);
  const ist = gueltig.reduce((s, l) => s + Math.min(Math.max(l.istwert, 0), l.zielwert), 0);
  return ist / soll;
}

const AMPEL_RANG: Record<Ampel, number> = { ROT: 0, GELB: 1, GRUEN: 2 };

// Aktivitaets-Verben: heuristischer Kandidat fuer den Beitrags-Check (Drucker).
// Bewusst konservativ (Schwere "hinweis"); die KI (AP 3) urteilt praezise.
const AKTIVITAETS_VERBEN = [
  "erstellen",
  "durchfuehren",
  "durchführen",
  "reduzieren",
  "optimieren",
  "einfuehren",
  "einführen",
  "umsetzen",
  "machen",
  "organisieren",
  "planen",
  "abstimmen",
  "pruefen",
  "prüfen",
  "bearbeiten",
  "erledigen",
  "verbessern",
];

// ---- die fuenf Insight-Regeln ----

/**
 * Watermelon: aussen gruen, innen rot. FOKUS-Ziel wirkt gut (Ampel gruen oder
 * hoher selbstberichteter Fortschritt), aber die steuerbaren Lead Measures
 * hinken hinterher. Ohne Lead Measures kein Urteil (null).
 */
export function erkenneWatermelon(goal: InsightGoal): Insight | null {
  if (goal.status !== "FOKUS") return null;
  const erf = leadErfuellung(goal.leadMeasures);
  if (erf === null) return null;
  const wirktGut = goal.ampel === "GRUEN" || goal.fortschritt >= WATERMELON_FORTSCHRITT_MIN;
  if (!wirktGut || erf >= WATERMELON_LEAD_MAX) return null;
  const proz = Math.round(erf * 100);
  return {
    typ: "watermelon",
    schwere: "warnung",
    goalId: goal.id,
    titel: `Watermelon-Warnung: ${goal.titel}`,
    detail: `Aussen gruen (Fortschritt ${goal.fortschritt}%), aber die steuerbaren Lead Measures sind erst zu ${proz}% erfuellt. Pruefe, ob der Fortschritt real ist.`,
    kennzahl: proz,
  };
}

export interface QuadrantVerteilung {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  basis: "zeit" | "anzahl";
  gesamt: number;
}

/**
 * Verteilung der Aufgaben ueber die vier Eisenhower-Quadranten. Bevorzugt die
 * tatsaechlich erfasste Zeit (zeitIstMin); ist noch keine Zeit erfasst, wird
 * hilfsweise nach Anzahl gezaehlt (Zeit-Tracking-UI folgt spaeter).
 */
export function verteileQuadranten(tasks: InsightTask[]): QuadrantVerteilung {
  const mitZeit = tasks.filter((t) => (t.zeitIstMin ?? 0) > 0);
  const basis: "zeit" | "anzahl" = mitZeit.length > 0 ? "zeit" : "anzahl";
  const quelle = basis === "zeit" ? mitZeit : tasks;
  const acc: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const t of quelle) {
    const q = berechneQuadrant(t.important, t.urgent);
    acc[q] += basis === "zeit" ? (t.zeitIstMin ?? 0) : 1;
  }
  return {
    q1: acc[1],
    q2: acc[2],
    q3: acc[3],
    q4: acc[4],
    basis,
    gesamt: acc[1] + acc[2] + acc[3] + acc[4],
  };
}

/**
 * Fokus-Leck: zu viel Anteil in Q3 (dringend, aber nicht wichtig) -> klassischer
 * Delegier-Kandidat (Drucker/Eisenhower). null, wenn keine Datenbasis.
 */
export function berechneFokusLeck(tasks: InsightTask[]): Insight | null {
  const v = verteileQuadranten(tasks);
  if (v.gesamt === 0) return null;
  const anteil = v.q3 / v.gesamt;
  if (anteil < FOKUSLECK_Q3_WARN) return null;
  const proz = Math.round(anteil * 100);
  const einheit = v.basis === "zeit" ? "deiner erfassten Aufgabenzeit" : "deiner Aufgaben";
  return {
    typ: "fokusleck",
    schwere: "warnung",
    titel: `Fokus-Leck: ${proz}% in Q3 (dringend, nicht wichtig)`,
    detail: `${proz}% ${einheit} liegen in "dringend, aber nicht wichtig". Das ist der klassische Kandidat zum Delegieren.`,
    kennzahl: proz,
  };
}

/**
 * Zombie-Radar (Drucker, Systematic Abandonment): Backlog-Ziele, die seit
 * ZOMBIE_TAGE unveraendert liegen -> "Wuerdest du das heute neu anfangen?".
 */
export function findeZombies(goals: InsightGoal[], jetzt: Date): Insight[] {
  return goals
    .filter((g) => g.status === "BACKLOG" && tageSeit(g.updatedAt, jetzt) >= ZOMBIE_TAGE)
    .map((g) => {
      const tage = tageSeit(g.updatedAt, jetzt);
      return {
        typ: "zombie" as const,
        schwere: "hinweis" as const,
        goalId: g.id,
        titel: `Zombie-Ziel: ${g.titel}`,
        detail: `Seit ${tage} Tagen unveraendert im Backlog. Wuerdest du es heute neu anfangen? Wenn nein: bewusst streichen.`,
        kennzahl: tage,
      };
    });
}

/**
 * Ampel-Trend: vergleicht die letzten beiden Check-ins eines FOKUS-Ziels und
 * meldet eine Verschlechterung (Ampel gefallen oder Fortschritt gesunken).
 * Weniger als zwei Check-ins -> kein Trend (null).
 */
export function ampelTrend(goal: InsightGoal): Insight | null {
  if (goal.status !== "FOKUS") return null;
  const chrono = [...goal.checkIns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const letzte = chrono.at(-1);
  const vor = chrono.at(-2);
  if (!letzte || !vor) return null;
  const ampelDelta = AMPEL_RANG[letzte.ampel] - AMPEL_RANG[vor.ampel];
  const fortDelta = letzte.fortschritt - vor.fortschritt;
  if (ampelDelta >= 0 && fortDelta >= 0) return null;
  const teile: string[] = [];
  if (ampelDelta < 0) teile.push(`Ampel von ${vor.ampel} auf ${letzte.ampel} gefallen`);
  if (fortDelta < 0)
    teile.push(`Fortschritt ${vor.fortschritt}% auf ${letzte.fortschritt}% gesunken`);
  return {
    typ: "trend",
    schwere: "warnung",
    goalId: goal.id,
    titel: `Negativer Trend: ${goal.titel}`,
    detail: `${teile.join(", ")} seit dem letzten Check-in.`,
    kennzahl: fortDelta,
  };
}

/**
 * Beitrags-Check (Drucker: Beitrag statt Aktivitaet). Heuristik ueber das
 * Outcome eines FOKUS-Ziels: fehlt es oder beginnt es mit einer reinen Taetigkeit,
 * wird es als Kandidat markiert (die KI reformuliert in AP 3 praezise).
 */
export function pruefeBeitrag(goal: InsightGoal): Insight | null {
  if (goal.status !== "FOKUS") return null;
  const o = (goal.outcome ?? "").trim();
  if (o.length === 0) {
    return {
      typ: "beitrag",
      schwere: "hinweis",
      goalId: goal.id,
      titel: `Kein Outcome: ${goal.titel}`,
      detail:
        "Diesem Fokus-Ziel fehlt der angestrebte Beitrag (Outcome). Was soll sich dadurch messbar veraendern?",
    };
  }
  const erstesWort = o.toLowerCase().split(/\s+/)[0] ?? "";
  if (AKTIVITAETS_VERBEN.includes(erstesWort)) {
    return {
      typ: "beitrag",
      schwere: "hinweis",
      goalId: goal.id,
      titel: `Aktivitaet statt Beitrag? ${goal.titel}`,
      detail: `Das Outcome beginnt mit einer Taetigkeit ("${erstesWort}…"). Drucker: nenne den angestrebten Beitrag/das Ergebnis, nicht die Aktivitaet.`,
    };
  }
  return null;
}

const SCHWERE_RANG: Record<InsightSchwere, number> = { warnung: 0, hinweis: 1, info: 2 };

/**
 * Fuehrt alle Regeln zusammen und sortiert nach Schwere (warnung zuerst).
 * Einziger Einstiegspunkt fuer die API/den spaeteren KI-Briefing-Prompt.
 */
export function berechneInsights(e: InsightEingabe): Insight[] {
  const out: Insight[] = [];
  for (const g of e.goals) {
    const w = erkenneWatermelon(g);
    if (w) out.push(w);
    const t = ampelTrend(g);
    if (t) out.push(t);
    const b = pruefeBeitrag(g);
    if (b) out.push(b);
  }
  out.push(...findeZombies(e.goals, e.jetzt));
  const fl = berechneFokusLeck(e.tasks);
  if (fl) out.push(fl);
  return out.sort((a, b) => SCHWERE_RANG[a.schwere] - SCHWERE_RANG[b.schwere]);
}
