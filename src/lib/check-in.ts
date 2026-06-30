// ============================================================
// src/lib/check-in.ts
// Reine Domaenenlogik des Wochen-Check-ins (keine DB, client- und serverseitig
// nutzbar): Faelligkeit/"stale" je WIG anhand des letzten Check-ins.
// ============================================================
import { CHECKIN_FAELLIG_TAGE } from "@/lib/constants";
import type { Ampel } from "@/lib/goals";

const TAG_MS = 24 * 60 * 60 * 1000;

// --- Small-Wins / Progress-Feedback (Amabile) ---
// Konkreter Fortschritt, den EIN Check-in gebracht hat (Delta gespeicherter Stand
// -> Check-in-Eingabe). Bewusst ehrlich: kein Fortschritt -> hatFortschritt=false.
const AMPEL_RANG: Record<Ampel, number> = { ROT: 0, GELB: 1, GRUEN: 2 };

export interface WinEingabe {
  ampelAlt: Ampel;
  ampelNeu: Ampel;
  fortschrittAlt: number;
  fortschrittNeu: number;
  leads: { beschreibung: string; zielwert: number; istwertAlt: number; istwertNeu: number }[];
}

export interface Win {
  fortschrittDelta: number; // nur positiver Zuwachs, sonst 0
  ampelVerbessert: boolean;
  leadsErfuellt: string[]; // in diesem Check-in neu erfuellte Lead Measures
  hatFortschritt: boolean;
}

export function berechneWin(e: WinEingabe): Win {
  const fortschrittDelta = Math.max(0, e.fortschrittNeu - e.fortschrittAlt);
  const ampelVerbessert = AMPEL_RANG[e.ampelNeu] > AMPEL_RANG[e.ampelAlt];
  const leadsErfuellt = e.leads
    .filter((l) => l.istwertNeu >= l.zielwert && l.istwertAlt < l.zielwert)
    .map((l) => l.beschreibung);
  return {
    fortschrittDelta,
    ampelVerbessert,
    leadsErfuellt,
    hatFortschritt: fortschrittDelta > 0 || ampelVerbessert || leadsErfuellt.length > 0,
  };
}

// Ganze Tage seit dem letzten Check-in (ersatzweise seit Anlage des Ziels).
export function tageSeitCheckin(
  lastCheckinAt: string | null,
  createdAt: string,
  jetzt: Date = new Date(),
): number {
  const bezug = new Date(lastCheckinAt ?? createdAt).getTime();
  return Math.floor((jetzt.getTime() - bezug) / TAG_MS);
}

// Ist die WIG faellig fuer einen Check-in (Schwelle aus constants)?
export function istCheckinFaellig(
  lastCheckinAt: string | null,
  createdAt: string,
  jetzt: Date = new Date(),
): boolean {
  return tageSeitCheckin(lastCheckinAt, createdAt, jetzt) >= CHECKIN_FAELLIG_TAGE;
}
