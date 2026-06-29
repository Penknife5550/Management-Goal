// ============================================================
// src/lib/check-in.ts
// Reine Domaenenlogik des Wochen-Check-ins (keine DB, client- und serverseitig
// nutzbar): Faelligkeit/"stale" je WIG anhand des letzten Check-ins.
// ============================================================
import { CHECKIN_FAELLIG_TAGE } from "@/lib/constants";

const TAG_MS = 24 * 60 * 60 * 1000;

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
